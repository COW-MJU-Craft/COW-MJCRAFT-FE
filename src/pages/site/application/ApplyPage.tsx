import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Reveal from '../../../components/ui/Reveal';
import { AlertCircle } from 'lucide-react';
import AutoResizeTextarea from '../../../components/ui/AutoResizeTextarea';
import {
  applicationsApi,
  type ApplicationFormResponse,
  type ApplicationNotice,
  type ApplicationQuestion,
} from '../../../api/site/applications';
import { uploadToPresignedUrl } from '../../../api/admin/projects';
import { DEPARTMENT_OPTIONS } from '../../../types/recruit';
import type { DepartmentType } from '../../../types/recruit';

type AnswerValue = string | string[] | null;
type QuestionGroupKey = 'basic' | 'common' | 'first' | 'second' | 'other';
type SectionRailItem = {
  key: QuestionGroupKey;
  step: string;
  title: string;
  active: boolean;
  filled: boolean;
};

type FileState = {
  key?: string | null;
  fileName?: string;
  fileSize?: number;
  uploading?: boolean;
  error?: string | null;
};

function parseOptions(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      // ignore
    }
  }
  return trimmed
    .split(/\r?\n|,/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function formatDisplayLineBreaks(text: string) {
  return text.replace(/\\n/g, '\n');
}

function getSectionId(key: QuestionGroupKey) {
  return `apply-section-${key}`;
}

// 보안 정책: 지원서 자동저장 기능은 완전히 제거됐다 (학번/답변/업로드 key 등
// 민감정보를 브라우저 저장소에 남기지 않기 위함). 화면을 벗어나면 작성 중이던
// 내용은 사라진다. 아래는 과거 버전이 남긴 구버전 draft를 1회성으로 정리한다.
const LEGACY_APPLY_DRAFT_KEY_PREFIX = 'mju-craft:apply-draft:';

function clearLegacyApplyDrafts() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(LEGACY_APPLY_DRAFT_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage 접근 불가 환경은 무시한다.
  }
}

function normalizeAnswerValue(value: AnswerValue) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const filtered = value.map((v) => v.trim()).filter(Boolean);
    return filtered.length ? filtered.join(',') : null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getAnswerType(raw?: string | null) {
  return (raw ?? '').toUpperCase();
}

function normalizeDepartment(value: string): DepartmentType | '' {
  const hit = DEPARTMENT_OPTIONS.find((opt) => opt.value === value);
  return hit ? hit.value : '';
}

function isBasicSection(sectionType?: string | null) {
  return (sectionType ?? '').toUpperCase().includes('BASIC');
}

function isCommonSection(sectionType?: string | null) {
  return (sectionType ?? '').toUpperCase().includes('COMMON');
}

function isDepartmentSection(sectionType?: string | null) {
  return (sectionType ?? '').toUpperCase().includes('DEPARTMENT');
}

function normalizeDeptType(value?: string | null): DepartmentType | '' {
  const upper = (value ?? '').toUpperCase();
  return normalizeDepartment(upper);
}

function shouldShowByDepartment(
  sectionType: string | null | undefined,
  departmentType: string | null | undefined,
  selected: Set<DepartmentType>,
) {
  if (isBasicSection(sectionType)) return true;
  if (isCommonSection(sectionType)) return true;
  if (isDepartmentSection(sectionType)) {
    const dept = normalizeDeptType(departmentType);
    return dept ? selected.has(dept) : false;
  }
  return true;
}

function getDepartmentLabelByValue(value: DepartmentType | '') {
  if (!value) return '';
  return DEPARTMENT_OPTIONS.find((x) => x.value === value)?.label ?? value;
}

function looksLikeDepartmentQuestion(q: ApplicationQuestion) {
  const text = `${q.content ?? ''} ${q.description ?? ''}`.toLowerCase();
  const keywordMatched =
    text.includes('희망부서') ||
    text.includes('희망 부서') ||
    text.includes('1지망') ||
    text.includes('2지망') ||
    text.includes('first department') ||
    text.includes('second department');

  if (keywordMatched) return true;

  const type = getAnswerType(q.answerType);
  if (!type.includes('SELECT')) return false;

  const options = parseOptions(q.selectOptions);
  if (options.length === 0) return false;

  const normalized = new Set(options.map((x) => x.trim().toUpperCase()));
  const deptValues = DEPARTMENT_OPTIONS.map((x) => x.value.toUpperCase());
  const deptLabels = DEPARTMENT_OPTIONS.map((x) => x.label.toUpperCase());

  const hasAnyDeptValue = deptValues.some((x) => normalized.has(x));
  const hasAnyDeptLabel = deptLabels.some((x) => normalized.has(x));
  return hasAnyDeptValue || hasAnyDeptLabel;
}

function inferDepartmentAnswerForQuestion(
  q: ApplicationQuestion,
  firstDepartment: DepartmentType | '',
  secondDepartment: DepartmentType | '',
) {
  if (!looksLikeDepartmentQuestion(q)) return null;
  const text = `${q.content ?? ''} ${q.description ?? ''}`.toLowerCase();
  if (text.includes('2지망') || text.includes('second')) return secondDepartment;
  if (text.includes('1지망') || text.includes('first')) return firstDepartment;
  return firstDepartment || secondDepartment || null;
}

function getQuestionGroupKey(
  q: ApplicationQuestion,
  firstDepartment: DepartmentType | '',
  secondDepartment: DepartmentType | '',
): QuestionGroupKey {
  if (isBasicSection(q.sectionType)) return 'basic';
  if (isCommonSection(q.sectionType)) return 'common';
  if (isDepartmentSection(q.sectionType)) {
    const dept = normalizeDeptType(q.departmentType);
    if (dept && dept === firstDepartment) return 'first';
    if (dept && dept === secondDepartment) return 'second';
  }
  return 'other';
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getUploadedFileLabel(file?: FileState) {
  if (!file) return '';
  if (file.fileName) return file.fileName;
  if (!file.key) return '';

  const basename = file.key.split('/').pop() ?? file.key;
  return basename.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    '',
  );
}

export default function ApplyPage() {
  const [form, setForm] = useState<ApplicationFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [firstDepartment, setFirstDepartment] = useState<DepartmentType | ''>(
    '',
  );
  const [secondDepartment, setSecondDepartment] = useState<DepartmentType | ''>(
    '',
  );

  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [files, setFiles] = useState<Record<number, FileState>>({});
  const [dragOverByQuestion, setDragOverByQuestion] = useState<
    Record<number, boolean>
  >({});
  const [activeSectionKey, setActiveSectionKey] =
    useState<QuestionGroupKey>('basic');
  const activeSectionRef = useRef<QuestionGroupKey>('basic');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await applicationsApi.getForm();
      setForm(res ?? null);
    } catch {
      setError('현재 모집 중인 지원서가 없습니다. 다음 모집에서 만나요!');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 지원서 양식 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // 자동저장을 완전히 제거했으므로 여기서는 과거 버전이 남긴 구버전
  // draft(학번·답변·업로드 key 포함)만 1회성으로 정리한다.
  useEffect(() => {
    clearLegacyApplyDrafts();
  }, []);

  const selectedDepartments = useMemo(() => {
    const set = new Set<DepartmentType>();
    if (firstDepartment) set.add(firstDepartment);
    if (secondDepartment) set.add(secondDepartment);
    return set;
  }, [firstDepartment, secondDepartment]);

  const allQuestions = useMemo(() => {
    const list = (form?.questions ?? []).slice().sort((a, b) => {
      const ao = a.questionOrder ?? 0;
      const bo = b.questionOrder ?? 0;
      return ao - bo;
    });

    return list.filter((q) =>
      shouldShowByDepartment(
        q.sectionType,
        q.departmentType,
        selectedDepartments,
      ),
    );
  }, [form?.questions, selectedDepartments]);

  const notices = useMemo(() => {
    const list = (form?.notices ?? []) as ApplicationNotice[];
    return list.filter((n) =>
      shouldShowByDepartment(
        n.sectionType,
        n.departmentType,
        selectedDepartments,
      ),
    );
  }, [form?.notices, selectedDepartments]);

  const visibleQuestions = useMemo(
    () => allQuestions.filter((q) => !looksLikeDepartmentQuestion(q)),
    [allQuestions],
  );

  const groupedQuestions = useMemo(() => {
    const groups: Record<QuestionGroupKey, ApplicationQuestion[]> = {
      basic: [],
      common: [],
      first: [],
      second: [],
      other: [],
    };

    visibleQuestions.forEach((q) => {
      const key = getQuestionGroupKey(q, firstDepartment, secondDepartment);
      groups[key].push(q);
    });

    return groups;
  }, [visibleQuestions, firstDepartment, secondDepartment]);

  const groupedNotices = useMemo(() => {
    const groups = {
      basic: [] as ApplicationNotice[],
      common: [] as ApplicationNotice[],
      first: [] as ApplicationNotice[],
      second: [] as ApplicationNotice[],
    };

    notices.forEach((n) => {
      if (isBasicSection(n.sectionType)) {
        groups.basic.push(n);
        return;
      }

      if (isCommonSection(n.sectionType)) {
        groups.common.push(n);
        return;
      }

      if (isDepartmentSection(n.sectionType)) {
        const dept = normalizeDeptType(n.departmentType);
        if (dept && dept === firstDepartment) groups.first.push(n);
        else if (dept && dept === secondDepartment) groups.second.push(n);
      }
    });

    return groups;
  }, [notices, firstDepartment, secondDepartment]);

  const handleAnswerChange = (id: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileUpload = async (q: ApplicationQuestion, file: File) => {
    const qid = q.formQuestionId;
    setFiles((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        fileName: file.name,
        fileSize: file.size,
        uploading: true,
        error: null,
      },
    }));

    try {
      const res = await applicationsApi.presignFiles([
        {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        },
      ]);

      const target = res.items?.[0];
      if (!target) throw new Error('업로드 URL이 없어요.');

      await uploadToPresignedUrl(
        target.uploadUrl,
        file,
        file.type || 'application/octet-stream',
      );

      setFiles((prev) => ({
        ...prev,
        [qid]: {
          ...prev[qid],
          key: target.key,
          uploading: false,
          error: null,
        },
      }));

      handleAnswerChange(qid, target.key);
    } catch {
      setFiles((prev) => ({
        ...prev,
        [qid]: {
          ...prev[qid],
          uploading: false,
          error: '파일 업로드에 실패했어요.',
        },
      }));
      handleAnswerChange(qid, null);
    }
  };

  const handleRemoveQuestionFile = (qid: number) => {
    setFiles((prev) => ({
      ...prev,
      [qid]: {
        key: null,
        fileName: undefined,
        fileSize: undefined,
        uploading: false,
        error: null,
      },
    }));
    handleAnswerChange(qid, null);
  };

  const handleSubmit = async () => {
    setValidationError(null);

    if (!studentId.trim() || !password.trim()) {
      setValidationError('학번과 비밀번호를 입력해 주세요.');
      return;
    }
    if (!firstDepartment || !secondDepartment) {
      setValidationError('1지망과 2지망을 모두 선택해 주세요.');
      return;
    }
    if (firstDepartment === secondDepartment) {
      setValidationError('1지망과 2지망은 서로 달라야 해요.');
      return;
    }

    for (const q of allQuestions) {
      const type = getAnswerType(q.answerType);
      const autoValue = inferDepartmentAnswerForQuestion(
        q,
        firstDepartment,
        secondDepartment,
      );
      const val = normalizeAnswerValue(
        autoValue ?? answers[q.formQuestionId] ?? null,
      );

      if (type.includes('FILE')) {
        const fileKey = files[q.formQuestionId]?.key ?? null;
        if (q.required && !fileKey) {
          setValidationError(
            `필수 파일을 업로드해 주세요: ${q.content ?? ''}`.trim(),
          );
          return;
        }
        continue;
      }

      if (q.required && !val) {
        setValidationError(
          `필수 질문에 답해 주세요: ${q.content ?? ''}`.trim(),
        );
        return;
      }
    }

    const payloadAnswers = allQuestions
      .map((q) => {
        const type = getAnswerType(q.answerType);
        const autoValue = inferDepartmentAnswerForQuestion(
          q,
          firstDepartment,
          secondDepartment,
        );

        if (type.includes('FILE')) {
          const fileKey = files[q.formQuestionId]?.key ?? null;
          if (!fileKey) return null;
          return { formQuestionId: q.formQuestionId, value: fileKey };
        }

        const value = normalizeAnswerValue(
          autoValue ?? answers[q.formQuestionId] ?? null,
        );
        return value
          ? { formQuestionId: q.formQuestionId, value }
          : q.required
            ? { formQuestionId: q.formQuestionId, value: '' }
            : null;
      })
      .filter(Boolean) as Array<{
      formQuestionId: number;
      value: string | null;
    }>;

    setSubmitLoading(true);
    try {
      await applicationsApi.create({
        studentId: studentId.trim(),
        password: password.trim(),
        firstDepartment,
        secondDepartment,
        answers: payloadAnswers,
      });
      alert('지원서가 제출됐어요.');
    } catch {
      alert('지원서 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderNoticeList = (items: ApplicationNotice[], label: string) => {
    if (items.length === 0) return null;

    return (
      <div className="border-l-4 border-primary bg-slate-50 px-4 py-3">
        <p className="text-sm font-bold text-primary">{label}</p>
        <div className="mt-3 space-y-3">
          {items.map((notice) => (
            <div key={String(notice.noticeId)}>
              {notice.title && (
                <p className="text-sm font-semibold text-slate-900">
                  {notice.title}
                </p>
              )}
              {notice.content && (
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {formatDisplayLineBreaks(notice.content)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionField = (q: ApplicationQuestion) => {
    const type = getAnswerType(q.answerType);
    const value = answers[q.formQuestionId] ?? '';
    const options = parseOptions(q.selectOptions);
    const file = files[q.formQuestionId];

    return (
      <div key={q.formQuestionId} className="space-y-2">
        <label className="text-sm font-bold text-slate-700">
          {q.content ?? '질문'}
          {q.required && <span className="ml-1 text-rose-500">*</span>}
        </label>

        {q.description && (
          <p className="whitespace-pre-line text-xs leading-5 text-slate-400">
            {formatDisplayLineBreaks(q.description)}
          </p>
        )}

        {type.includes('FILE') ? (
          <div className="space-y-2">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverByQuestion((prev) => ({
                  ...prev,
                  [q.formQuestionId]: true,
                }));
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOverByQuestion((prev) => ({
                  ...prev,
                  [q.formQuestionId]: false,
                }));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverByQuestion((prev) => ({
                  ...prev,
                  [q.formQuestionId]: false,
                }));
                const dropped = e.dataTransfer.files?.[0] ?? null;
                if (dropped) void handleFileUpload(q, dropped);
              }}
              className={[
                'flex min-h-[104px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition',
                dragOverByQuestion[q.formQuestionId]
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-300 bg-slate-50/60 hover:border-primary/60',
              ].join(' ')}
            >
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (selected) void handleFileUpload(q, selected);
                }}
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {file?.fileName
                    ? file.fileName
                    : '파일을 끌어오거나 클릭해서 업로드해 주세요.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file?.fileSize
                    ? formatBytes(file.fileSize)
                    : '자유 형식으로 업로드할 수 있어요.'}
                </p>
              </div>
            </label>

            {file?.uploading && (
              <span className="text-xs text-slate-500">업로드 중...</span>
            )}
            {file?.key && !file?.uploading && (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="truncate text-xs font-semibold text-slate-600">
                  {getUploadedFileLabel(file)}
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestionFile(q.formQuestionId)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    삭제하기
                  </button>
                </div>
              </div>
            )}
            {file?.error && (
              <span className="text-xs text-rose-600">{file.error}</span>
            )}
          </div>
        ) : type.includes('TEXTAREA') ? (
          <AutoResizeTextarea
            value={String(value ?? '')}
            onChange={(e) => handleAnswerChange(q.formQuestionId, e.target.value)}
            className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />
        ) : type.includes('SELECT') || type.includes('RADIO') ? (
          <select
            value={String(value ?? '')}
            onChange={(e) => handleAnswerChange(q.formQuestionId, e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          >
            <option value="">선택해 주세요</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : type.includes('CHECK') || type.includes('MULTI') ? (
          <div className="flex flex-wrap gap-2">
            {options.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(arr);
                      if (e.target.checked) next.add(opt);
                      else next.delete(opt);
                      handleAnswerChange(q.formQuestionId, Array.from(next));
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        ) : (
          <AutoResizeTextarea
            value={String(value ?? '')}
            onChange={(e) => handleAnswerChange(q.formQuestionId, e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
          />
        )}
      </div>
    );
  };

  const renderFormSection = ({
    sectionKey,
    step,
    title,
    description,
    notices: sectionNotices,
    noticeLabel,
    questions,
    children,
  }: {
    sectionKey: QuestionGroupKey;
    step: string;
    title: string;
    description?: string;
    notices?: ApplicationNotice[];
    noticeLabel?: string;
    questions?: ApplicationQuestion[];
    children?: ReactNode;
  }) => (
    <Reveal
      id={getSectionId(sectionKey)}
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div>
        <p className="text-xs font-black text-primary">
          {step}
        </p>
        <h2 className="mt-2 font-heading text-2xl text-slate-950">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {sectionNotices &&
          noticeLabel &&
          renderNoticeList(sectionNotices, noticeLabel)}
        {children}
        {questions?.map((q) => renderQuestionField(q))}
      </div>
    </Reveal>
  );

  const firstDepartmentLabel = getDepartmentLabelByValue(firstDepartment);
  const secondDepartmentLabel = getDepartmentLabelByValue(secondDepartment);
  const basicSectionActive =
    Boolean(studentId.trim()) ||
    Boolean(password.trim()) ||
    Boolean(firstDepartment) ||
    Boolean(secondDepartment);
  const commonSectionActive = groupedQuestions.common.some(
    (q) => normalizeAnswerValue(answers[q.formQuestionId] ?? null) !== null,
  );
  const firstSectionActive = groupedQuestions.first.some(
    (q) => normalizeAnswerValue(answers[q.formQuestionId] ?? null) !== null,
  );
  const secondSectionActive = groupedQuestions.second.some(
    (q) => normalizeAnswerValue(answers[q.formQuestionId] ?? null) !== null,
  );
  const otherSectionActive = groupedQuestions.other.some(
    (q) => normalizeAnswerValue(answers[q.formQuestionId] ?? null) !== null,
  );

  const sectionRail = useMemo<SectionRailItem[]>(
    () =>
      [
        {
          key: 'basic' as QuestionGroupKey,
          step: '01',
          title: '기본 정보',
          active: true,
          filled: basicSectionActive,
        },
        {
          key: 'common' as QuestionGroupKey,
          step: '02',
          title: '공통 질문',
          active:
            groupedQuestions.common.length > 0 ||
            groupedNotices.common.length > 0,
          filled: commonSectionActive,
        },
        {
          key: 'first' as QuestionGroupKey,
          step: '03',
          title: firstDepartmentLabel || '1지망 질문',
          active:
            Boolean(firstDepartment) &&
            (groupedQuestions.first.length > 0 ||
              groupedNotices.first.length > 0),
          filled: firstSectionActive,
        },
        {
          key: 'second' as QuestionGroupKey,
          step: '04',
          title: secondDepartmentLabel || '2지망 질문',
          active:
            Boolean(secondDepartment) &&
            (groupedQuestions.second.length > 0 ||
              groupedNotices.second.length > 0),
          filled: secondSectionActive,
        },
        {
          key: 'other' as QuestionGroupKey,
          step: '05',
          title: '추가 질문',
          active: groupedQuestions.other.length > 0,
          filled: otherSectionActive,
        },
      ].filter((section) => section.active),
    [
      basicSectionActive,
      commonSectionActive,
      firstDepartment,
      firstDepartmentLabel,
      firstSectionActive,
      groupedNotices.common.length,
      groupedNotices.first.length,
      groupedNotices.second.length,
      groupedQuestions.common.length,
      groupedQuestions.first.length,
      groupedQuestions.other.length,
      groupedQuestions.second.length,
      otherSectionActive,
      secondDepartment,
      secondDepartmentLabel,
      secondSectionActive,
    ],
  );

  const sectionKeys = useMemo(
    () => sectionRail.map((section) => section.key).join(','),
    [sectionRail],
  );

  useEffect(() => {
    const keys = sectionKeys.split(',').filter(Boolean) as QuestionGroupKey[];
    const firstSection = keys[0] ?? 'basic';
    if (!sectionRail.some((section) => section.key === activeSectionRef.current)) {
      activeSectionRef.current = firstSection;
      setActiveSectionKey(firstSection);
    }
  }, [sectionKeys, sectionRail]);

  useEffect(() => {
    const updateActiveSection = () => {
      const sections = sectionRail
        .map((section) => ({
          key: section.key,
          element: document.getElementById(getSectionId(section.key)),
        }))
        .filter(
          (
            section,
          ): section is { key: QuestionGroupKey; element: HTMLElement } =>
            Boolean(section.element),
        );

      if (sections.length === 0) return;

      const anchorY = 150;
      const passedSections = sections.filter(
        ({ element }) => element.getBoundingClientRect().top <= anchorY,
      );
      const next =
        passedSections[passedSections.length - 1]?.key ?? sections[0].key;

      if (activeSectionRef.current !== next) {
        activeSectionRef.current = next;
        setActiveSectionKey(next);
      }
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, [sectionKeys, sectionRail]);

  const scrollToSection = (key: QuestionGroupKey) => {
    const target = document.getElementById(getSectionId(key));
    if (!target) return;
    activeSectionRef.current = key;
    setActiveSectionKey(key);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-slate-500">
        불러오는 중...
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-16rem)] max-w-6xl items-center justify-center px-4 py-12">
        <Reveal className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-heading text-3xl text-slate-900">
            지원하기
          </h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-rose-600">
            {error ?? '지원서를 불러오지 못했어요.'}
          </p>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 md:py-12">
      <Reveal>
        <div className="mx-auto max-w-[920px]">
          <div>
            <p className="text-sm font-bold text-slate-400">지원하기</p>
            <h1 className="mt-2 font-heading text-3xl leading-tight text-primary md:text-4xl">
              {form.title ?? '지원서 작성'}
            </h1>
            <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-slate-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              자동저장을 지원하지 않아요. 새로고침하거나 창을 닫으면 작성 중인
              내용이 사라지니 한 번에 작성해주세요.
            </p>
          </div>
        </div>
      </Reveal>

      {validationError && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {validationError}
        </div>
      )}

      <div className="relative mt-8 lg:min-h-screen">
        <aside className="hidden lg:fixed lg:left-[max(1rem,calc((100vw-920px)/2-220px))] lg:top-24 lg:z-10 lg:block lg:w-[180px]">
          <div className="space-y-3">
            <div className="space-y-2 border-l border-slate-200 pl-4">
              {sectionRail.map((section) => {
                const isCurrent = section.key === activeSectionKey;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => scrollToSection(section.key)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-100"
                  >
                    <span
                      className={[
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black',
                        isCurrent
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {section.step}
                    </span>
                    <span
                      className={[
                        'truncate text-sm font-bold',
                        isCurrent ? 'text-primary' : 'text-slate-500',
                      ].join(' ')}
                    >
                      {section.title}
                    </span>
                    {section.filled && !isCurrent && (
                      <span className="ml-auto text-xs font-black text-primary">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="mx-auto min-w-0 max-w-[920px] space-y-6">
          <div className="sticky top-16 z-20 -mx-4 overflow-x-auto bg-[#f5f7fb]/95 px-4 py-2 backdrop-blur lg:hidden">
            <div className="flex min-w-max gap-2">
              {sectionRail.map((section) => {
                const isCurrent = section.key === activeSectionKey;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => scrollToSection(section.key)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition',
                      isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}
                  >
                    {section.step} {section.title}
                    {section.filled && !isCurrent && (
                      <span className="text-primary">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {renderFormSection({
            sectionKey: 'basic',
            step: '01',
            title: '기본 정보',
            description: '지원서 조회와 결과 확인에 필요한 정보예요.',
            notices: groupedNotices.basic,
            noticeLabel: '모집 안내',
            questions: groupedQuestions.basic,
            children: (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    학번
                  </label>
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    1지망
                  </label>
                  <select
                    value={firstDepartment}
                    onChange={(e) => {
                      const next = normalizeDepartment(e.target.value);
                      setFirstDepartment(next);
                      if (next && secondDepartment === next) {
                        setSecondDepartment('');
                      }
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">선택해 주세요</option>
                    {DEPARTMENT_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    2지망
                  </label>
                  <select
                    value={secondDepartment}
                    onChange={(e) =>
                      setSecondDepartment(normalizeDepartment(e.target.value))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">선택해 주세요</option>
                    {DEPARTMENT_OPTIONS.map(({ value, label }) => (
                      <option
                        key={value}
                        value={value}
                        disabled={value === firstDepartment}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ),
          })}

          {(groupedQuestions.common.length > 0 ||
            groupedNotices.common.length > 0) &&
            renderFormSection({
              sectionKey: 'common',
              step: '02',
              title: '공통 질문',
              description: '모든 지원자가 답해야 하는 질문이에요.',
              notices: groupedNotices.common,
              noticeLabel: '공통 안내',
              questions: groupedQuestions.common,
            })}

          {firstDepartment &&
            (groupedQuestions.first.length > 0 ||
              groupedNotices.first.length > 0) &&
            renderFormSection({
              sectionKey: 'first',
              step: '03',
              title: `${firstDepartmentLabel} 질문`,
              description: `1지망으로 선택한 ${firstDepartmentLabel} 부서 질문이에요.`,
              notices: groupedNotices.first,
              noticeLabel: `${firstDepartmentLabel} 안내`,
              questions: groupedQuestions.first,
            })}

          {secondDepartment &&
            (groupedQuestions.second.length > 0 ||
              groupedNotices.second.length > 0) &&
            renderFormSection({
              sectionKey: 'second',
              step: '04',
              title: `${secondDepartmentLabel} 질문`,
              description: `2지망으로 선택한 ${secondDepartmentLabel} 부서 질문이에요.`,
              notices: groupedNotices.second,
              noticeLabel: `${secondDepartmentLabel} 안내`,
              questions: groupedQuestions.second,
            })}

          {groupedQuestions.other.length > 0 &&
            renderFormSection({
              sectionKey: 'other',
              step: '05',
              title: '추가 질문',
              questions: groupedQuestions.other,
            })}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitLoading}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60 md:w-auto"
            >
              {submitLoading ? '제출 중...' : '제출하기'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
