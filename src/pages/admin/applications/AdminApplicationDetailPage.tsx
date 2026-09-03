import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import Reveal from '../../../components/ui/Reveal';
import BackArrowIcon from '../../../components/ui/BackArrowIcon';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import {
  adminApplicationsApi,
  type AdminApplicationDetail,
  type AdminApplicationResultStatus,
  type AdminApplicationAnswerItem,
} from '../../../api/admin/applications';
import { adminFormsApi, type AdminFormQuestion } from '../../../api/admin/forms';
import { formatYmd, parseDateLike } from '../../../utils/common/date';
import { getDepartmentLabel } from '../../../types/recruit';
import AdminApplicationPrintDocument from './AdminApplicationPrintDocument';

const RESULT_OPTIONS: Array<{
  value: AdminApplicationResultStatus;
  label: string;
}> = [
  { value: 'NOT_PUBLISHED', label: '미발표' },
  { value: 'PASS', label: '합격' },
  { value: 'FAIL', label: '불합격' },
];

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isLikelyFileKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isLikelyUrl(trimmed)) return false;
  if (/\s/.test(trimmed)) return false;
  return (
    /^uploads\/recruit\/answers\/.+/i.test(trimmed) ||
    /\.(pdf|docx?|pptx?|xlsx?|zip|hwp|png|jpe?g|webp)$/i.test(trimmed)
  );
}

function getDisplayFileName(answer: AdminApplicationAnswerItem) {
  const fromServer = answer.fileName?.trim();
  if (fromServer) return fromServer;

  const value = answer.value?.trim() ?? '';
  if (!value) return '첨부 파일';
  if (isLikelyUrl(value)) return value;

  const lastSegment = value.split('/').filter(Boolean).pop() ?? value;
  return lastSegment.replace(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/,
    '',
  );
}

function getQuestionLabel(
  questionMap: Record<number, AdminFormQuestion>,
  formQuestionId: number,
) {
  const q = questionMap[formQuestionId];
  if (!q) return '질문';
  return q.label?.trim() || '질문';
}

function getQuestionAnswerType(
  questionMap: Record<number, AdminFormQuestion>,
  formQuestionId: number,
) {
  return (questionMap[formQuestionId]?.answerType ?? '').toUpperCase();
}

function AnswerCard({
  answer,
  questionMap,
}: {
  answer: AdminApplicationAnswerItem;
  questionMap: Record<number, AdminFormQuestion>;
}) {
  const toast = useToast();
  const value = answer.value?.trim() ?? '';
  const answerType = getQuestionAnswerType(questionMap, answer.formQuestionId);

  const fileLike =
    answerType.includes('FILE') || isLikelyUrl(value) || isLikelyFileKey(value);

  const previewUrl = (answer.previewUrl ?? answer.fileUrl ?? '').trim();
  const downloadUrl = (answer.downloadUrl ?? answer.fileUrl ?? '').trim();
  const hasPreviewUrl = /^https?:\/\//i.test(previewUrl);
  const hasDownloadUrl = /^https?:\/\//i.test(downloadUrl);
  const displayFileName = getDisplayFileName(answer);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('파일 키를 복사했습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-semibold text-slate-500">
        {getQuestionLabel(questionMap, answer.formQuestionId)}
      </p>

      {!value ? (
        <p className="mt-2 text-sm text-slate-500">응답 없음</p>
      ) : fileLike ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
          <p className="truncate text-sm font-semibold text-slate-700">
            {displayFileName}
          </p>

          <div className="print-hidden mt-2 flex flex-wrap gap-2">
            {hasPreviewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                미리보기
              </a>
            )}
            {hasDownloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
              >
                다운로드
              </a>
            )}
            {!hasPreviewUrl && !hasDownloadUrl && isLikelyUrl(value) && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                파일 열기
              </a>
            )}
            {!hasPreviewUrl && !hasDownloadUrl && !isLikelyUrl(value) && (
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                파일 키 복사
              </button>
            )}
          </div>

          {!hasPreviewUrl && !hasDownloadUrl && !isLikelyUrl(value) && (
            <p className="print-hidden mt-2 text-[11px] text-amber-600">
              파일 링크가 없어 파일 키만 복사할 수 있어요.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
          {value}
        </p>
      )}
    </div>
  );
}

export default function AdminApplicationDetailPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { formId, applicationId } = useParams();

  const [detail, setDetail] = useState<AdminApplicationDetail | null>(null);
  const [questionMap, setQuestionMap] = useState<
    Record<number, AdminFormQuestion>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!formId || !applicationId) return;
    setLoading(true);
    try {
      const [detailData, questionData] = await Promise.all([
        adminApplicationsApi.getById(formId, applicationId),
        adminFormsApi.getQuestions(formId).catch(() => []),
      ]);

      setDetail(detailData ?? null);

      const map = (questionData ?? []).reduce<
        Record<number, AdminFormQuestion>
      >((acc, q) => {
        acc[q.formQuestionId] = q;
        return acc;
      }, {});
      setQuestionMap(map);
    } finally {
      setLoading(false);
    }
  }, [applicationId, formId]);

  useEffect(() => {
    // 지원서 상세 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const dateLabel = useMemo(() => {
    if (!detail) return '-';
    const date = parseDateLike(detail.createdAt ?? detail.updatedAt);
    return date ? formatYmd(date) : '-';
  }, [detail]);

  const handleResultUpdate = useCallback(
    async (status: AdminApplicationResultStatus) => {
      if (!detail) return;
      setSaving(true);
      try {
        await adminApplicationsApi.updateResult(String(detail.applicationId), {
          resultStatus: status,
        });
        toast.success('결과를 저장했습니다.');
        await load();
      } catch {
        toast.error('저장에 실패했습니다.');
      } finally {
        setSaving(false);
      }
    },
    [detail, load, toast],
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDelete = useCallback(async () => {
    if (!detail) return;

    const ok = await confirm.open({
      title: '지원서 삭제',
      description: '이 지원서를 삭제할까요?',
      danger: true,
      confirmText: '삭제',
    });

    if (!ok) return;

    try {
      await adminApplicationsApi.delete(String(detail.applicationId));
      toast.success('지원서를 삭제했어요.');
      navigate(`/admin/applications?formId=${formId}`);
    } catch {
      toast.error('지원서를 삭제하지 못했어요.');
    }
  }, [confirm, detail, formId, navigate, toast]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-500">
        불러오는 중...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm text-rose-600">지원서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <>
    <div className="print-screen-hidden mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate(`/admin/applications?formId=${formId}`)}
              className="print-hidden inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              지원서 목록
            </button>
            <h1 className="mt-2 font-heading text-3xl text-primary">
              지원서 상세
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              지원서 정보 확인 및 결과 입력
            </p>
          </div>

          <div className="print-hidden flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              PDF 출력
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              삭제
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal
        delayMs={120}
        className="application-print mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {detail.applicantName?.trim() || '이름 없음'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              학번 {detail.studentId} · 접수일 {dateLabel}
            </p>
          </div>

          <div className="print-hidden flex items-center gap-2">
            {RESULT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => void handleResultUpdate(opt.value)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-bold transition',
                  detail.resultStatus === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-600">
          1지망 {getDepartmentLabel(detail.firstDepartment)} / 2지망{' '}
          {getDepartmentLabel(detail.secondDepartment)}
        </div>
      </Reveal>

      <Reveal
        delayMs={180}
        className="application-print mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-bold text-slate-700">기본 정보</h2>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.basicAnswers ?? []).length === 0 ? (
                <p>추가 기본 정보가 없습니다.</p>
              ) : (
                (detail.basicAnswers ?? []).map((ans) => (
                  <AnswerCard
                    key={`basic-${ans.formQuestionId}`}
                    answer={ans}
                    questionMap={questionMap}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700">공통 질문</h2>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.commonAnswers ?? []).length === 0 ? (
                <p>응답이 없습니다.</p>
              ) : (
                (detail.commonAnswers ?? []).map((ans) => (
                  <AnswerCard
                    key={`common-${ans.formQuestionId}`}
                    answer={ans}
                    questionMap={questionMap}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700">1지망 질문</h2>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.firstDepartmentAnswers ?? []).length === 0 ? (
                <p>응답이 없습니다.</p>
              ) : (
                (detail.firstDepartmentAnswers ?? []).map((ans) => (
                  <AnswerCard
                    key={`first-${ans.formQuestionId}`}
                    answer={ans}
                    questionMap={questionMap}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700">2지망 질문</h2>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {(detail.secondDepartmentAnswers ?? []).length === 0 ? (
                <p>응답이 없습니다.</p>
              ) : (
                (detail.secondDepartmentAnswers ?? []).map((ans) => (
                  <AnswerCard
                    key={`second-${ans.formQuestionId}`}
                    answer={ans}
                    questionMap={questionMap}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </Reveal>
    </div>
    <div className="print-only">
      <AdminApplicationPrintDocument detail={detail} questionMap={questionMap} />
    </div>
    </>
  );
}
