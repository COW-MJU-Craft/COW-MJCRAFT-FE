import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Reveal from '../../components/Reveal';
import BackArrowIcon from '../../components/BackArrowIcon';
import { useConfirm } from '../../components/confirm/useConfirm';
import { useToast } from '../../components/toast/useToast';
import { ApiError } from '../../api/client';
import {
  adminFormsApi,
  type AdminFormDetail,
  type AdminFormListItem,
  type AdminFormQuestion,
  type AdminFormNoticeItem,
  type AdminFormQuestionCreateRequest,
  type AdminFormNoticeCreateRequest,
} from '../../api/adminForms';
import { DEPARTMENT_OPTIONS, getDepartmentLabel } from '../../types/recruit';

const ANSWER_TYPES = ['TEXT', 'SELECT', 'FILE'] as const;
const ANSWER_TYPE_LABELS: Record<string, string> = {
  TEXT: '주관식 답변',
  SELECT: '선택형 답변',
  FILE: '파일 업로드',
};
const SECTION_LABELS: Record<string, string> = {
  BASIC: '기본 정보',
  COMMON: '공통 질문',
  DEPARTMENT: '부서별 질문',
};
const SYSTEM_BASIC_FIELDS = ['학번', '비밀번호', '1지망', '2지망'] as const;

type AdminQuestionSection = {
  key: string;
  sectionType: string;
  departmentType: string | null;
  step: string;
  title: string;
  description: string;
  questions: AdminFormQuestion[];
  notices: AdminFormNoticeItem[];
};

const defaultQuestionPayload = (
  order: number,
): AdminFormQuestionCreateRequest => ({
  label: '',
  description: '',
  questionOrder: order,
  required: false,
  answerType: 'TEXT',
  selectOptions: null,
  sectionType: 'COMMON',
  departmentType: null,
});

const defaultNoticePayload: AdminFormNoticeCreateRequest = {
  sectionType: 'COMMON',
  departmentType: null,
  title: '',
  content: '',
};

function isDepartmentSection(sectionType?: string | null) {
  return (sectionType ?? '').toUpperCase() === 'DEPARTMENT';
}

function getSectionLabel(sectionType?: string | null) {
  return SECTION_LABELS[(sectionType ?? '').toUpperCase()] ?? '추가 질문';
}

function getAnswerTypeLabel(answerType?: string | null) {
  return ANSWER_TYPE_LABELS[(answerType ?? '').toUpperCase()] ?? '답변';
}

function normalizeSectionPayload<
  T extends { sectionType: string; departmentType: string | null },
>(payload: T): T {
  return {
    ...payload,
    departmentType: isDepartmentSection(payload.sectionType)
      ? payload.departmentType
      : null,
  };
}

function makeSectionKey(sectionType: string, departmentType?: string | null) {
  return isDepartmentSection(sectionType)
    ? `${sectionType}:${departmentType ?? 'NONE'}`
    : sectionType;
}

function buildAdminQuestionSections(
  questions: AdminFormQuestion[],
  notices: AdminFormNoticeItem[],
): AdminQuestionSection[] {
  const baseSections: AdminQuestionSection[] = [
    {
      key: 'BASIC',
      sectionType: 'BASIC',
      departmentType: null,
      step: '01',
      title: '기본 정보',
      description: '지원서 작성에 필요한 기본 항목을 확인합니다.',
      questions: [],
      notices: [],
    },
    {
      key: 'COMMON',
      sectionType: 'COMMON',
      departmentType: null,
      step: '02',
      title: '공통 질문',
      description: '모든 지원자에게 공통으로 노출되는 질문입니다.',
      questions: [],
      notices: [],
    },
    ...DEPARTMENT_OPTIONS.map((department, index) => ({
      key: makeSectionKey('DEPARTMENT', department.value),
      sectionType: 'DEPARTMENT',
      departmentType: department.value,
      step: String(index + 3).padStart(2, '0'),
      title: `${department.label} 질문`,
      description: `${department.label} 부서를 선택한 지원자에게 노출되는 질문입니다.`,
      questions: [] as AdminFormQuestion[],
      notices: [] as AdminFormNoticeItem[],
    })),
  ];

  const sectionMap = new Map(baseSections.map((section) => [section.key, section]));

  questions
    .slice()
    .sort((a, b) => a.questionOrder - b.questionOrder)
    .forEach((question) => {
      const key = makeSectionKey(question.sectionType, question.departmentType);
      const section = sectionMap.get(key);
      if (section) section.questions.push(question);
    });

  notices.forEach((notice) => {
    const key = makeSectionKey(notice.sectionType, notice.departmentType);
    const section = sectionMap.get(key);
    if (section) section.notices.push(notice);
  });

  return baseSections;
}

export default function AdminFormDetailPage() {
  const { formId: rawFormId } = useParams<{ formId: string }>();
  const formId = rawFormId ?? '';
  const isNew = formId === 'new';

  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();

  const [formList, setFormList] = useState<AdminFormListItem[]>([]);
  const [detail, setDetail] = useState<AdminFormDetail | null>(null);
  const [questions, setQuestions] = useState<AdminFormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form (new only)
  const [createTitle, setCreateTitle] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Copy questions
  const [copySourceId, setCopySourceId] = useState('');
  const [copying, setCopying] = useState(false);

  // Add question
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [addQuestionPayload, setAddQuestionPayload] = useState(() =>
    defaultQuestionPayload(1),
  );
  const [addingQuestion, setAddingQuestion] = useState(false);

  // Edit question (formQuestionId)
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(
    null,
  );
  const [editQuestionPayload, setEditQuestionPayload] =
    useState<AdminFormQuestionCreateRequest | null>(null);
  const [updatingQuestion, setUpdatingQuestion] = useState(false);

  // Add notice
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [addNoticePayload, setAddNoticePayload] =
    useState(defaultNoticePayload);
  const [addingNotice, setAddingNotice] = useState(false);

  // Edit notice
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [editNoticePayload, setEditNoticePayload] =
    useState<AdminFormNoticeCreateRequest | null>(null);
  const [updatingNotice, setUpdatingNotice] = useState(false);

  const loadFormList = useCallback(async () => {
    try {
      const data = await adminFormsApi.list();
      setFormList(Array.isArray(data) ? data : []);
    } catch {
      // ignore for list
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!formId || isNew) return;
    setLoading(true);
    setError(null);
    try {
      const [formData, questionsData] = await Promise.all([
        adminFormsApi.getById(formId),
        adminFormsApi.getQuestions(formId),
      ]);
      setDetail(formData ?? null);
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
    } catch {
      setError('지원서 양식 정보를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [formId, isNew]);

  useEffect(() => {
    void loadFormList();
  }, [loadFormList]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setError(null);
      setDetail(null);
      setQuestions([]);
      return;
    }
    void loadDetail();
  }, [isNew, loadDetail]);

  const handleCreate = useCallback(async () => {
    const title = createTitle.trim();
    if (!title) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    setCreating(true);
    try {
      const created = await adminFormsApi.create({ title, open: createOpen });
      const id = created?.formId;
      if (id != null) {
        toast.success('지원서 양식을 만들었어요.');
        navigate(`/admin/forms/${id}`, { replace: true });
      }
    } catch {
      toast.error('생성에 실패했어요.');
    } finally {
      setCreating(false);
    }
  }, [createTitle, createOpen, navigate, toast]);

  const handleOpenClose = useCallback(
    async (open: boolean) => {
      if (!formId || isNew) return;
      try {
        if (open) await adminFormsApi.open(formId);
        else await adminFormsApi.close(formId);
        toast.success(open ? '모집을 시작했어요.' : '모집을 종료했어요.');
        void loadDetail();
        void loadFormList();
      } catch {
        toast.error('상태 변경에 실패했어요.');
      }
    },
    [formId, isNew, loadDetail, loadFormList, toast],
  );

  const handleDeleteForm = useCallback(async () => {
    if (!formId || isNew) return;

    const ok = await confirm.open({
      title: '지원서 삭제',
      description:
        '이 지원서를 삭제할까요?\n모집 중이거나 제출된 지원서가 있으면 삭제되지 않을 수 있어요.',
      danger: true,
      confirmText: '삭제',
    });
    if (!ok) return;

    try {
      await adminFormsApi.deleteForm(formId);
      toast.success('지원서를 삭제했어요.');
      navigate('/admin/forms', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 403)) {
        toast.error('제출된 지원서가 있으면 삭제할 수 없어요.');
      } else {
        toast.error(
          e instanceof Error
            ? e.message
            : '지원서를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
        );
      }
    }
  }, [confirm, formId, isNew, navigate, toast]);

  const handleCopyQuestions = useCallback(async () => {
    const sourceId = copySourceId.trim();
    if (!sourceId || !formId || isNew) {
      toast.error('불러올 지원서를 선택해 주세요.');
      return;
    }
    const sourceNum = Number(sourceId);
    if (Number.isNaN(sourceNum) || sourceNum <= 0) {
      toast.error('올바른 지원서를 선택해 주세요.');
      return;
    }
    if (String(sourceNum) === formId) {
      toast.error('같은 지원서에서는 불러올 수 없어요.');
      return;
    }
    const ok = await confirm.open({
      title: '질문 불러오기',
      description:
        '선택한 지원서의 질문으로 덮어쓸까요? 현재 등록된 질문은 모두 삭제된 뒤 다시 불러와져요.',
      danger: true,
      confirmText: '불러오기',
    });
    if (!ok) return;
    setCopying(true);
    try {
      await adminFormsApi.copyQuestions(formId, { sourceFormId: sourceNum });
      toast.success('질문을 불러왔어요.');
      void loadDetail();
    } catch {
      toast.error('질문을 불러오지 못했어요.');
    } finally {
      setCopying(false);
    }
  }, [confirm, copySourceId, formId, isNew, loadDetail, toast]);

  const handleAddQuestion = useCallback(async () => {
    if (!formId || isNew) return;
    const label = addQuestionPayload.label.trim();
    if (!label) {
      toast.error('질문 제목을 입력해 주세요.');
      return;
    }
    if (
      isDepartmentSection(addQuestionPayload.sectionType) &&
      !addQuestionPayload.departmentType
    ) {
      toast.error('부서별 질문은 부서를 선택해 주세요.');
      return;
    }
    const payload = normalizeSectionPayload({
      ...addQuestionPayload,
      selectOptions:
        addQuestionPayload.answerType === 'SELECT'
          ? addQuestionPayload.selectOptions
          : null,
    });
    setAddingQuestion(true);
    try {
      await adminFormsApi.addQuestion(formId, payload);
      toast.success('질문을 추가했어요.');
      setShowAddQuestion(false);
      setAddQuestionPayload(defaultQuestionPayload(questions.length + 1));
      void loadDetail();
    } catch {
      toast.error('질문을 추가하지 못했어요.');
    } finally {
      setAddingQuestion(false);
    }
  }, [formId, isNew, addQuestionPayload, questions.length, loadDetail, toast]);

  const handleUpdateQuestion = useCallback(
    async (formQuestionId: number) => {
      if (!formId || isNew || !editQuestionPayload) return;
      if (
        isDepartmentSection(editQuestionPayload.sectionType) &&
        !editQuestionPayload.departmentType
      ) {
        toast.error('부서별 질문은 부서를 선택해 주세요.');
        return;
      }
      const payload = normalizeSectionPayload({
        ...editQuestionPayload,
        selectOptions:
          editQuestionPayload.answerType === 'SELECT'
            ? editQuestionPayload.selectOptions
            : null,
      });
      setUpdatingQuestion(true);
      try {
        await adminFormsApi.updateQuestion(
          formId,
          String(formQuestionId),
          payload,
        );
        toast.success('질문을 수정했어요.');
        setEditingQuestionId(null);
        setEditQuestionPayload(null);
        void loadDetail();
      } catch {
        toast.error('질문을 수정하지 못했어요.');
      } finally {
        setUpdatingQuestion(false);
      }
    },
    [formId, isNew, editQuestionPayload, loadDetail, toast],
  );

  const handleDeleteQuestion = useCallback(
    async (formQuestionId: number) => {
      if (!formId || isNew) return;
      const ok = await confirm.open({
        title: '질문 삭제',
        description: '이 질문을 삭제할까요?',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;
      try {
        await adminFormsApi.deleteQuestion(formId, String(formQuestionId));
        toast.success('질문을 삭제했어요.');
        void loadDetail();
      } catch {
        toast.error('질문을 삭제하지 못했어요.');
      }
    },
    [confirm, formId, isNew, loadDetail, toast],
  );

  const handleAddNotice = useCallback(async () => {
    if (!formId || isNew) return;
    const title = addNoticePayload.title.trim();
    if (!title) {
      toast.error('안내문 제목을 입력해 주세요.');
      return;
    }
    if (
      isDepartmentSection(addNoticePayload.sectionType) &&
      !addNoticePayload.departmentType
    ) {
      toast.error('부서별 안내문은 부서를 선택해 주세요.');
      return;
    }
    const payload = normalizeSectionPayload(addNoticePayload);
    setAddingNotice(true);
    try {
      await adminFormsApi.addNotice(formId, payload);
      toast.success('안내문을 추가했어요.');
      setShowAddNotice(false);
      setAddNoticePayload(defaultNoticePayload);
      void loadDetail();
    } catch {
      toast.error('안내문을 추가하지 못했어요.');
    } finally {
      setAddingNotice(false);
    }
  }, [formId, isNew, addNoticePayload, loadDetail, toast]);

  const handleUpdateNotice = useCallback(
    async (noticeId: number) => {
      if (!formId || isNew || !editNoticePayload) return;
      if (
        isDepartmentSection(editNoticePayload.sectionType) &&
        !editNoticePayload.departmentType
      ) {
        toast.error('부서별 안내문은 부서를 선택해 주세요.');
        return;
      }
      const payload = normalizeSectionPayload(editNoticePayload);
      setUpdatingNotice(true);
      try {
        await adminFormsApi.updateNotice(formId, String(noticeId), payload);
        toast.success('안내문을 수정했어요.');
        setEditingNoticeId(null);
        setEditNoticePayload(null);
        void loadDetail();
      } catch {
        toast.error('안내문을 수정하지 못했어요.');
      } finally {
        setUpdatingNotice(false);
      }
    },
    [formId, isNew, editNoticePayload, loadDetail, toast],
  );

  const handleDeleteNotice = useCallback(
    async (noticeId: number) => {
      if (!formId || isNew) return;
      const ok = await confirm.open({
        title: '안내문 삭제',
        description: '이 안내문을 삭제할까요?',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;
      try {
        await adminFormsApi.deleteNotice(formId, String(noticeId));
        toast.success('안내문을 삭제했어요.');
        void loadDetail();
      } catch {
        toast.error('안내문을 삭제하지 못했어요.');
      }
    },
    [confirm, formId, isNew, loadDetail, toast],
  );

  const notices = useMemo(() => detail?.notices ?? [], [detail?.notices]);
  const questionSections = useMemo(
    () => buildAdminQuestionSections(questions, notices),
    [notices, questions],
  );

  // ----- New form create UI -----
  if (isNew) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Reveal>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/forms"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              지원서 관리
            </Link>
            <h1 className="font-heading text-3xl text-primary">
              새 지원서 양식 만들기
            </h1>
          </div>
        </Reveal>
        <Reveal
          delayMs={120}
          className="mx-auto mt-6 max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                지원서 이름
              </label>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="예: 명지공방 5기 지원서"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-open"
                  checked={createOpen}
                  onChange={(e) => setCreateOpen(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label
                  htmlFor="create-open"
                className="text-sm font-semibold text-slate-700"
              >
                이 지원서로 모집 시작하기
              </label>
            </div>
            <p className="mt-2 pl-6 text-xs leading-5 text-slate-500">
                선택하면 지원자가 이 지원서를 작성할 수 있어요. 이미 모집 중인 지원서는 비공개로 전환돼요.
            </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/admin/forms')}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {creating ? '만드는 중...' : '만들기'}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  // ----- Loading / Error -----
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-center text-sm text-slate-500">불러오는 중...</p>
      </div>
    );
  }
  if (error || !detail) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/forms"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
          >
            <BackArrowIcon className="h-5 w-5" />
            지원서 관리
          </Link>
        </div>
        <p className="mt-4 text-sm font-semibold text-rose-600">
          {error ?? '지원서 양식을 찾을 수 없어요.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/forms"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              <BackArrowIcon className="h-5 w-5" />
              지원서 관리
            </Link>
            <h1 className="font-heading text-2xl text-primary md:text-3xl">
              {detail.title}
            </h1>
            <span
              className={[
                'rounded-full px-2 py-1 text-xs font-semibold',
                detail.open
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700',
              ].join(' ')}
            >
              {detail.open ? '현재 모집 중' : '비공개'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {detail.open ? (
              <button
                type="button"
                onClick={() => void handleOpenClose(false)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
              >
                모집 종료
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleOpenClose(true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-95"
              >
                이 지원서로 모집 시작
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleDeleteForm()}
              className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
            >
              지원서 삭제
            </button>
          </div>
        </div>
      </Reveal>

      {/* Copy questions */}
      <Reveal delayMs={80} className="mt-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800">
            질문 불러오기
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            다른 지원서의 질문을 가져옵니다. 현재 등록된 질문은 삭제된 뒤
            다시 불러와져요.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={copySourceId}
              onChange={(e) => setCopySourceId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <option value="">불러올 지원서 선택</option>
              {formList
                .filter((f) => String(f.formId) !== formId)
                .map((f) => (
                  <option key={f.formId} value={f.formId}>
                    {f.title}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => void handleCopyQuestions()}
              disabled={copying || !copySourceId}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {copying ? '불러오는 중...' : '불러오기'}
            </button>
          </div>
        </div>
      </Reveal>

      {/* Sections */}
      <Reveal delayMs={120} className="mt-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Application Sections
            </p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">
              지원서 섹션 구성
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              사용자 지원서 화면과 같은 기준으로 질문과 안내문을 섹션별로
              관리합니다.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {questionSections.map((section) => {
              const sectionKey = makeSectionKey(
                section.sectionType,
                section.departmentType,
              );
              const addingQuestionHere =
                showAddQuestion &&
                makeSectionKey(
                  addQuestionPayload.sectionType,
                  addQuestionPayload.departmentType,
                ) === sectionKey;
              const addingNoticeHere =
                showAddNotice &&
                makeSectionKey(
                  addNoticePayload.sectionType,
                  addNoticePayload.departmentType,
                ) === sectionKey;

              return (
                <section
                  key={section.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-primary">
                        {section.step}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-slate-950">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {section.description}
                      </p>
                      {section.sectionType === 'BASIC' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {SYSTEM_BASIC_FIELDS.map((field) => (
                            <span
                              key={field}
                              className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-bold text-primary"
                            >
                              {field}
                            </span>
                          ))}
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                            사용자 화면에서 자동 제공
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextPayload = {
                            ...defaultQuestionPayload(questions.length + 1),
                            sectionType: section.sectionType,
                            departmentType: section.departmentType,
                          };
                          const nextKey = makeSectionKey(
                            nextPayload.sectionType,
                            nextPayload.departmentType,
                          );
                          setShowAddNotice(false);
                          setShowAddQuestion(
                            !(showAddQuestion && nextKey === sectionKey),
                          );
                          setAddQuestionPayload(nextPayload);
                        }}
                        className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
                      >
                        {addingQuestionHere ? '추가 취소' : '질문 추가'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPayload = {
                            ...defaultNoticePayload,
                            sectionType: section.sectionType,
                            departmentType: section.departmentType,
                          };
                          const nextKey = makeSectionKey(
                            nextPayload.sectionType,
                            nextPayload.departmentType,
                          );
                          setShowAddQuestion(false);
                          setShowAddNotice(
                            !(showAddNotice && nextKey === sectionKey),
                          );
                          setAddNoticePayload(nextPayload);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        {addingNoticeHere ? '추가 취소' : '안내문 추가'}
                      </button>
                    </div>
                  </div>

                  {addingQuestionHere && (
                    <QuestionForm
                      payload={addQuestionPayload}
                      setPayload={setAddQuestionPayload}
                      onSubmit={() => void handleAddQuestion()}
                      submitting={addingQuestion}
                      submitLabel="추가"
                    />
                  )}

                  {addingNoticeHere && (
                    <NoticeForm
                      payload={addNoticePayload}
                      setPayload={setAddNoticePayload}
                      onSubmit={() => void handleAddNotice()}
                      submitting={addingNotice}
                      submitLabel="추가"
                    />
                  )}

                  {section.notices.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-bold text-slate-400">안내문</p>
                      {section.notices.map((n) => (
                        <NoticeRow
                          key={n.noticeId}
                          notice={n}
                          editing={editingNoticeId === n.noticeId}
                          editPayload={editNoticePayload}
                          setEditPayload={setEditNoticePayload}
                          onStartEdit={() => {
                            setEditingNoticeId(n.noticeId);
                            setShowAddQuestion(false);
                            setShowAddNotice(false);
                            setEditNoticePayload({
                              sectionType: n.sectionType,
                              departmentType: n.departmentType ?? null,
                              title: n.title,
                              content: n.content,
                            });
                          }}
                          onSave={() => void handleUpdateNotice(n.noticeId)}
                          onCancel={() => {
                            setEditingNoticeId(null);
                            setEditNoticePayload(null);
                          }}
                          onDelete={() => void handleDeleteNotice(n.noticeId)}
                          updating={updatingNotice}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {section.questions.length === 0 &&
                      section.notices.length === 0 &&
                      section.sectionType !== 'BASIC' && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-500">
                        아직 등록된 질문이나 안내문이 없어요.
                      </p>
                    )}
                    {section.questions.length === 0 &&
                      section.sectionType === 'BASIC' && (
                        <p className="rounded-xl border border-dashed border-primary/20 bg-white px-4 py-4 text-sm leading-6 text-slate-500">
                          학번, 비밀번호, 지원 부서는 기본 항목으로 자동
                          제공돼요. 별도로 받고 싶은 정보가 있을 때만 질문을
                          추가해 주세요.
                        </p>
                      )}
                    {section.questions.map((q) => (
                      <div
                        key={q.formQuestionId}
                        className="rounded-xl border border-slate-100 bg-white p-4"
                      >
                        {editingQuestionId === q.formQuestionId &&
                        editQuestionPayload ? (
                          <QuestionForm
                            payload={editQuestionPayload}
                            setPayload={setEditQuestionPayload}
                            onSubmit={() =>
                              void handleUpdateQuestion(q.formQuestionId)
                            }
                            onCancel={() => {
                              setEditingQuestionId(null);
                              setEditQuestionPayload(null);
                            }}
                            submitting={updatingQuestion}
                            submitLabel="저장"
                          />
                        ) : (
                          <>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-slate-500">
                                  #{q.questionOrder}
                                </span>
                                <p className="font-semibold text-slate-900">
                                  {q.label}
                                </p>
                                {q.description && (
                                  <p className="mt-1 text-sm text-slate-600">
                                    {q.description}
                                  </p>
                                )}
                                <p className="mt-1 text-xs text-slate-500">
                                  {getAnswerTypeLabel(q.answerType)} ·{' '}
                                  {q.required ? '필수' : '선택'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingQuestionId(q.formQuestionId);
                                    setShowAddQuestion(false);
                                    setShowAddNotice(false);
                                    setEditQuestionPayload({
                                      label: q.label,
                                      description: q.description,
                                      questionOrder: q.questionOrder,
                                      required: q.required,
                                      answerType: q.answerType,
                                      selectOptions: q.selectOptions || null,
                                      sectionType: q.sectionType,
                                      departmentType: q.departmentType,
                                    });
                                  }}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleDeleteQuestion(q.formQuestionId)
                                  }
                                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function QuestionForm({
  payload,
  setPayload,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  payload: AdminFormQuestionCreateRequest;
  setPayload: (p: AdminFormQuestionCreateRequest) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600">
            질문 제목
          </label>
          <input
            value={payload.label}
            onChange={(e) => setPayload({ ...payload, label: e.target.value })}
            placeholder="예: 명지공방에 지원하게 된 이유를 알려주세요."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600">
            표시 순서
          </label>
          <input
            type="number"
            min={1}
            value={payload.questionOrder}
            onChange={(e) =>
              setPayload({
                ...payload,
                questionOrder: Number(e.target.value) || 1,
              })
            }
              placeholder="예: 1"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">
          질문 설명
        </label>
        <input
          value={payload.description}
          onChange={(e) =>
            setPayload({ ...payload, description: e.target.value })
          }
          placeholder="예: 해보고 싶은 활동이나 기대하는 경험을 함께 적어주세요."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={payload.required}
            onChange={(e) =>
              setPayload({ ...payload, required: e.target.checked })
            }
            className="h-4 w-4 rounded border-slate-300 text-primary"
          />
          <span className="text-sm font-semibold text-slate-700">필수</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            답변 방식
          </span>
          <select
            value={payload.answerType}
            onChange={(e) =>
              setPayload({
                ...payload,
                answerType: e.target.value,
                selectOptions:
                  e.target.value === 'SELECT' ? payload.selectOptions : null,
              })
            }
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
          >
            {ANSWER_TYPES.map((t) => (
              <option key={t} value={t}>
                {getAnswerTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        {payload.answerType === 'SELECT' && (
          <div className="flex-1">
            <input
              value={payload.selectOptions ?? ''}
              onChange={(e) =>
                setPayload({
                  ...payload,
                  selectOptions: e.target.value || null,
                })
              }
              placeholder="예: 카드뉴스, 포스터, 굿즈, 영상"
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
        >
          {submitting ? '처리 중...' : submitLabel}
        </button>
      </div>
    </div>
  );
}

function NoticeForm({
  payload,
  setPayload,
  onSubmit,
  submitting,
  submitLabel,
}: {
  payload: AdminFormNoticeCreateRequest;
  setPayload: (p: AdminFormNoticeCreateRequest) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600">
          안내 제목
        </label>
        <input
          value={payload.title}
          onChange={(e) => setPayload({ ...payload, title: e.target.value })}
          placeholder="예: 포트폴리오 제출 안내"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600">
          안내 내용
        </label>
        <textarea
          value={payload.content}
          onChange={(e) => setPayload({ ...payload, content: e.target.value })}
          rows={3}
          placeholder="예: 디자인 지원자는 포트폴리오 파일이나 링크를 함께 제출해 주세요."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-white hover:opacity-95 disabled:opacity-60"
      >
        {submitting ? '처리 중...' : submitLabel}
      </button>
    </div>
  );
}

function NoticeRow({
  notice,
  editing,
  editPayload,
  setEditPayload,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  updating,
}: {
  notice: AdminFormNoticeItem;
  editing: boolean;
  editPayload: AdminFormNoticeCreateRequest | null;
  setEditPayload: (p: AdminFormNoticeCreateRequest | null) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  updating: boolean;
}) {
  if (editing && editPayload) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <NoticeForm
          payload={editPayload}
          setPayload={(p) => setEditPayload(p)}
          onSubmit={onSave}
          submitting={updating}
          submitLabel="저장"
        />
        <button
          type="button"
          onClick={onCancel}
          className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          취소
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div>
        <p className="font-semibold text-slate-900">{notice.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          {getSectionLabel(notice.sectionType)}
          {notice.departmentType
            ? ` · ${getDepartmentLabel(notice.departmentType)}`
            : ''}
        </p>
        <p className="mt-2 text-sm text-slate-600">{notice.content}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onStartEdit}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
        >
          수정
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
