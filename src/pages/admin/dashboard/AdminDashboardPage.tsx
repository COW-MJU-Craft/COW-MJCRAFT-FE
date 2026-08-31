import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Reveal from '../../../components/ui/Reveal';
import {
  loadAdminContent,
  saveAdminContent,
  type AdminContent,
} from '../../../utils/admin/content';
import AdminFeedbackFormSection from '../sections/AdminFeedbackFormSection';
import AdminFeedbackListSection from '../sections/AdminFeedbackListSection';
import AdminLinksSection from '../sections/AdminLinksSection';
import { saveLinksToApi } from '../sections/linksSave';
import AdminPayoutsSection from '../sections/AdminPayoutsSection';
import AdminEditSection from '../sections/AdminEditSection';
import AdminIntroduceEditorPage from '../sections/AdminIntroduceEditorPage';
import AdminProjectsSection from '../sections/AdminProjectsSection';
import AdminOrderCompletePageSection from '../sections/AdminOrderCompletePageSection';
import {
  adminFeedbackApi,
  type AdminFeedbackResponse,
} from '../../../api/admin/feedback';

type SaveHandler = () => Promise<string | null>;

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const rawHash = location.hash.replace('#', '');
  const [hashPath, hashQuery = ''] = rawHash.split('?');
  const section = hashPath || 'edit';
  const isOrderCompleteSection = section === 'order-complete-page';

  const tabParam = new URLSearchParams(hashQuery).get('tab');
  const aboutTab = tabParam === 'detail' ? 'detail' : 'main';

  const [content, setContent] = useState<AdminContent>(() =>
    loadAdminContent(),
  );

  const [entries, setEntries] = useState<AdminFeedbackResponse[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveMsgTone, setSaveMsgTone] = useState<'success' | 'error' | null>(
    null,
  );

  const [projectSaveHandler, setProjectSaveHandler] =
    useState<SaveHandler | null>(null);
  const [projectsDirty, setProjectsDirty] = useState(false);
  const [orderCompleteSaveHandler, setOrderCompleteSaveHandler] =
    useState<SaveHandler | null>(null);
  const [orderCompleteDirty, setOrderCompleteDirty] = useState(false);

  useEffect(() => {
    // 섹션 전환 시 이전 저장 메시지 초기화: 외부 상태(선택된 섹션)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveMsg(null);
    setSaveMsgTone(null);
  }, [section]);

  const updateContent = (next: AdminContent) => {
    setContent(next);
    setSaveMsg(null);
    setSaveMsgTone(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    setSaveMsgTone(null);

    try {
      if (section === 'projects' && projectSaveHandler) {
        const msg = await projectSaveHandler();
        if (msg) {
          setSaveMsg(msg);
          setSaveMsgTone('success');
        }
        setProjectsDirty(false);
        return;
      }

      if (
        section === 'order-complete-page' &&
        orderCompleteSaveHandler
      ) {
        const msg = await orderCompleteSaveHandler();
        if (msg) {
          setSaveMsg(msg);
          setSaveMsgTone('success');
        }
        setOrderCompleteDirty(false);
        return;
      }

      saveAdminContent(content);

      if (section === 'links') {
        const result = await saveLinksToApi(content);
        setSaveMsg(result.message);
      } else {
        setSaveMsg('저장했어요.');
      }

      setSaveMsgTone('success');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSaveMsg(message || '저장에 실패했어요.');
      setSaveMsgTone('error');
    } finally {
      setSaving(false);
    }
  };

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    setFeedbackError(null);

    try {
      const list = await adminFeedbackApi.list();
      setEntries(list ?? []);
    } catch (err) {
      console.error(err);
      setFeedbackError(
        '피드백을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === 'feedback') {
      // 피드백 섹션 진입 시 목록 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadFeedback();
    }
  }, [section, loadFeedback]);

  useEffect(() => {
    if (section === 'about-main') {
      navigate('/admin#about?tab=main', { replace: true });
      return;
    }

    if (section === 'about-detail') {
      navigate('/admin#about?tab=detail', { replace: true });
      return;
    }

    if (section === 'about' && !tabParam) {
      navigate('/admin#about?tab=main', { replace: true });
    }
  }, [navigate, section, tabParam]);

  const handleAboutTabChange = (tab: 'main' | 'detail') => {
    navigate(`/admin#about?tab=${tab}`, { replace: true });
  };

  const registerProjectSave = useCallback((handler: SaveHandler) => {
    setProjectSaveHandler(() => handler);
  }, []);

  const handleProjectsDirtyChange = useCallback((dirty: boolean) => {
    setProjectsDirty(dirty);
  }, []);

  const registerOrderCompleteSave = useCallback((handler: SaveHandler) => {
    setOrderCompleteSaveHandler(() => handler);
  }, []);

  const handleOrderCompleteDirtyChange = useCallback((dirty: boolean) => {
    setOrderCompleteDirty(dirty);
  }, []);

  return (
    <div
      className={[
        'mx-auto max-w-6xl px-4',
        isOrderCompleteSection ? 'py-3 sm:py-6' : 'py-6 sm:py-12',
      ].join(' ')}
    >
      {!isOrderCompleteSection && (
        <>
          <Reveal>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div>
                <h1 className="font-heading text-2xl text-primary sm:text-3xl">
                  관리자 대시보드
                </h1>
                <p className="mt-2 text-[15px] text-slate-600 sm:text-sm">
                  관리자 권한
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className={[
                    'w-full rounded-2xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-lg transition sm:w-auto sm:rounded-xl sm:py-2.5 sm:text-sm',
                    saving ? 'opacity-60' : 'hover:opacity-95',
                  ].join(' ')}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </Reveal>

          {saveMsg && (
            <p
              className={[
                'mt-4 text-[15px] font-semibold sm:text-sm',
                saveMsgTone === 'success'
                  ? 'text-emerald-600'
                  : 'text-rose-600',
              ].join(' ')}
            >
              {saveMsg}
            </p>
          )}
        </>
      )}

      {section === 'edit' && <AdminEditSection />}

      {section === 'about' && (
        <AdminIntroduceEditorPage
          activeTab={aboutTab}
          onTabChange={handleAboutTabChange}
        />
      )}

      {section === 'links' && (
        <AdminLinksSection content={content} updateContent={updateContent} />
      )}

      {section === 'projects' && (
        <AdminProjectsSection
          registerSave={registerProjectSave}
          onDirtyChange={handleProjectsDirtyChange}
        />
      )}

      {section === 'order-complete-page' && (
        <AdminOrderCompletePageSection
          registerSave={registerOrderCompleteSave}
          onDirtyChange={handleOrderCompleteDirtyChange}
          onSave={() => void handleSave()}
          saving={saving}
          isDirty={orderCompleteDirty}
          saveMessage={saveMsg}
          saveMessageTone={saveMsgTone}
        />
      )}

      {section === 'payouts' && <AdminPayoutsSection />}

      {section === 'form' && (
        <AdminFeedbackFormSection
          content={content}
          updateContent={updateContent}
        />
      )}

      {section === 'feedback' && (
        <AdminFeedbackListSection
          entries={entries}
          loading={feedbackLoading}
          error={feedbackError}
          onRefresh={loadFeedback}
        />
      )}

      {section === 'projects' && projectsDirty && (
        <p className="mt-4 text-[13px] font-semibold text-slate-500 sm:text-xs">
          변경사항이 있습니다. 저장 버튼을 눌러주세요.
        </p>
      )}

    </div>
  );
}
