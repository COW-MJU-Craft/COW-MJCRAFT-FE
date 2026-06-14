import { useCallback, useEffect, useMemo, useState } from 'react';
import Reveal from '../../components/Reveal';
import { AlertCircle } from 'lucide-react';
import AutoResizeTextarea from '../../components/AutoResizeTextarea';
import {
  applicationsApi,
  type ApplicationFormResponse,
  type ApplicationNotice,
  type ApplicationQuestion,
} from '../../api/applications';
import { uploadToPresignedUrl } from '../../api/adminProjects';
import { DEPARTMENT_OPTIONS } from '../../types/recruit';
import type { DepartmentType } from '../../types/recruit';

type AnswerValue = string | string[] | null;

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
) {
  if (isCommonSection(q.sectionType)) return 'common' as const;
  if (isDepartmentSection(q.sectionType)) {
    const dept = normalizeDeptType(q.departmentType);
    if (dept && dept === firstDepartment) return 'first' as const;
    if (dept && dept === secondDepartment) return 'second' as const;
  }
  return 'other' as const;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
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
    void load();
  }, [load]);

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
    const groups = {
      common: [] as ApplicationQuestion[],
      first: [] as ApplicationQuestion[],
      second: [] as ApplicationQuestion[],
      other: [] as ApplicationQuestion[],
    };

    visibleQuestions.forEach((q) => {
      const key = getQuestionGroupKey(q, firstDepartment, secondDepartment);
      groups[key].push(q);
    });

    return groups;
  }, [visibleQuestions, firstDepartment, secondDepartment]);

  const groupedNotices = useMemo(() => {
    const groups = {
      common: [] as ApplicationNotice[],
      first: [] as ApplicationNotice[],
      second: [] as ApplicationNotice[],
    };

    notices.forEach((n) => {
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
      setValidationError('학번과 비밀번호를 입력해주세요.');
      return;
    }
    if (!firstDepartment || !secondDepartment) {
      setValidationError('1지망/2지망을 모두 선택해주세요.');
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
            `필수 파일을 업로드해주세요: ${q.content ?? ''}`.trim(),
          );
          return;
        }
        continue;
      }

      if (q.required && !val) {
        setValidationError(
          `필수 질문을 입력해주세요: ${q.content ?? ''}`.trim(),
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
      alert('지원서가 제출되었습니다.');
    } catch {
      alert('지원서 제출에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitLoading(false);
    }
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
          <h1 className="mt-4 font-heading text-3xl text-slate-900">지원하기</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-rose-600">
            {error ?? '폼을 불러오지 못했어요.'}
          </p>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <h1 className="font-heading text-3xl text-primary">지원서 작성</h1>
        <p className="mt-2 text-sm text-slate-600">
          모집 폼에 맞춰 지원서를 작성해 주세요.
        </p>
      </Reveal>

      {validationError && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {validationError}
        </div>
      )}

      <Reveal
        delayMs={120}
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">학번</label>
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">1지망</label>
            <select
              value={firstDepartment}
              onChange={(e) => {
                const next = normalizeDepartment(e.target.value);
                setFirstDepartment(next);
                if (next && secondDepartment === next) setSecondDepartment('');
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
            >
              <option value="">선택하세요</option>
              {DEPARTMENT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700">2지망</label>
            <select
              value={secondDepartment}
              onChange={(e) =>
                setSecondDepartment(normalizeDepartment(e.target.value))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
            >
              <option value="">선택하세요</option>
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
      </Reveal>

      <Reveal
        delayMs={180}
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-slate-900">질문</h2>

        <div className="mt-4 space-y-6">
          {groupedNotices.common.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">공통 안내</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-700">
                {groupedNotices.common.map((n) => (
                  <li
                    key={String(n.noticeId)}
                    className="rounded-xl border border-amber-100 border-l-4 border-l-amber-400 bg-white px-4 py-3 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {n.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{n.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {groupedQuestions.common.map((q) => {
            const type = getAnswerType(q.answerType);
            const value = answers[q.formQuestionId] ?? '';
            const options = parseOptions(q.selectOptions);
            const file = files[q.formQuestionId];

            return (
              <div key={q.formQuestionId} className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  {q.content}
                  {q.required && <span className="ml-1 text-rose-500">*</span>}
                </label>

                {q.description && (
                  <p className="text-xs text-slate-400">{q.description}</p>
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
                        'flex min-h-[100px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition',
                        dragOverByQuestion[q.formQuestionId]
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-300 bg-slate-50/50 hover:border-primary/60',
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
                            : '드래그 & 드롭하거나 클릭해서 파일을 업로드하세요.'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {file?.fileSize
                            ? formatBytes(file.fileSize)
                            : '파일 형식 제한 없음'}
                        </p>
                      </div>
                    </label>

                    {file?.uploading && (
                      <span className="text-xs text-slate-500">
                        업로드 중...
                      </span>
                    )}
                    {file?.key && !file?.uploading && (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="truncate text-xs text-slate-500">
                          {file.key}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveQuestionFile(q.formQuestionId)
                            }
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            파일 제거
                          </button>
                        </div>
                      </div>
                    )}
                    {file?.error && (
                      <span className="text-xs text-rose-600">
                        {file.error}
                      </span>
                    )}
                  </div>
                ) : type.includes('TEXTAREA') ? (
                  <textarea
                    value={String(value ?? '')}
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                ) : type.includes('SELECT') || type.includes('RADIO') ? (
                  <select
                    value={String(value ?? '')}
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">선택</option>
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
                              handleAnswerChange(
                                q.formQuestionId,
                                Array.from(next),
                              );
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
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                )}
              </div>
            );
          })}

          {firstDepartment && (
            <div className="space-y-5">
              {groupedNotices.first.length > 0 && (
                <div className="rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 to-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">
                    {getDepartmentLabelByValue(firstDepartment)} 안내
                  </p>
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {groupedNotices.first.map((n) => (
                      <li
                        key={String(n.noticeId)}
                        className="rounded-xl border border-sky-100 border-l-4 border-l-sky-400 bg-white px-4 py-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {n.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {groupedQuestions.first.map((q) => {
                const type = getAnswerType(q.answerType);
                const value = answers[q.formQuestionId] ?? '';
                const options = parseOptions(q.selectOptions);
                const file = files[q.formQuestionId];

                return (
                  <div key={q.formQuestionId} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      {q.content}
                      {q.required && (
                        <span className="ml-1 text-rose-500">*</span>
                      )}
                    </label>

                    {q.description && (
                      <p className="text-xs text-slate-400">{q.description}</p>
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
                            'flex min-h-[100px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition',
                            dragOverByQuestion[q.formQuestionId]
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-300 bg-slate-50/50 hover:border-primary/60',
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
                                : '드래그 & 드롭하거나 클릭해서 파일을 업로드하세요.'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {file?.fileSize
                                ? formatBytes(file.fileSize)
                                : '파일 형식 제한 없음'}
                            </p>
                          </div>
                        </label>

                        {file?.uploading && (
                          <span className="text-xs text-slate-500">
                            업로드 중...
                          </span>
                        )}
                        {file?.key && !file?.uploading && (
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="truncate text-xs text-slate-500">
                              {file.key}
                            </p>
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveQuestionFile(q.formQuestionId)
                                }
                                className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                파일 제거
                              </button>
                            </div>
                          </div>
                        )}
                        {file?.error && (
                          <span className="text-xs text-rose-600">
                            {file.error}
                          </span>
                        )}
                      </div>
                    ) : type.includes('TEXTAREA') ? (
                      <textarea
                        value={String(value ?? '')}
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      />
                    ) : type.includes('SELECT') || type.includes('RADIO') ? (
                      <select
                        value={String(value ?? '')}
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      >
                        <option value="">선택</option>
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
                                  handleAnswerChange(
                                    q.formQuestionId,
                                    Array.from(next),
                                  );
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
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {secondDepartment && (
            <div className="space-y-5">
              {groupedNotices.second.length > 0 && (
                <div className="rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 to-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-900">
                    {getDepartmentLabelByValue(secondDepartment)} 안내
                  </p>
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {groupedNotices.second.map((n) => (
                      <li
                        key={String(n.noticeId)}
                        className="rounded-xl border border-violet-100 border-l-4 border-l-violet-400 bg-white px-4 py-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {n.content}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {groupedQuestions.second.map((q) => {
                const type = getAnswerType(q.answerType);
                const value = answers[q.formQuestionId] ?? '';
                const options = parseOptions(q.selectOptions);
                const file = files[q.formQuestionId];

                return (
                  <div key={q.formQuestionId} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      {q.content}
                      {q.required && (
                        <span className="ml-1 text-rose-500">*</span>
                      )}
                    </label>

                    {q.description && (
                      <p className="text-xs text-slate-400">{q.description}</p>
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
                            'flex min-h-[100px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition',
                            dragOverByQuestion[q.formQuestionId]
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-300 bg-slate-50/50 hover:border-primary/60',
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
                                : '드래그 & 드롭하거나 클릭해서 파일을 업로드하세요.'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {file?.fileSize
                                ? formatBytes(file.fileSize)
                                : '파일 형식 제한 없음'}
                            </p>
                          </div>
                        </label>

                        {file?.uploading && (
                          <span className="text-xs text-slate-500">
                            업로드 중...
                          </span>
                        )}
                        {file?.key && !file?.uploading && (
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <p className="truncate text-xs text-slate-500">
                              {file.key}
                            </p>
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveQuestionFile(q.formQuestionId)
                                }
                                className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                파일 제거
                              </button>
                            </div>
                          </div>
                        )}
                        {file?.error && (
                          <span className="text-xs text-rose-600">
                            {file.error}
                          </span>
                        )}
                      </div>
                    ) : type.includes('TEXTAREA') ? (
                      <textarea
                        value={String(value ?? '')}
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      />
                    ) : type.includes('SELECT') || type.includes('RADIO') ? (
                      <select
                        value={String(value ?? '')}
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      >
                        <option value="">선택</option>
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
                                  handleAnswerChange(
                                    q.formQuestionId,
                                    Array.from(next),
                                  );
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
                        onChange={(e) =>
                          handleAnswerChange(q.formQuestionId, e.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {groupedQuestions.other.map((q) => {
            const type = getAnswerType(q.answerType);
            const value = answers[q.formQuestionId] ?? '';
            const options = parseOptions(q.selectOptions);
            const file = files[q.formQuestionId];

            return (
              <div key={q.formQuestionId} className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  {q.content}
                  {q.required && <span className="ml-1 text-rose-500">*</span>}
                </label>

                {q.description && (
                  <p className="text-xs text-slate-400">{q.description}</p>
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
                        'flex min-h-[100px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition',
                        dragOverByQuestion[q.formQuestionId]
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-300 bg-slate-50/50 hover:border-primary/60',
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
                            : '드래그 & 드롭하거나 클릭해서 파일을 업로드하세요.'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {file?.fileSize
                            ? formatBytes(file.fileSize)
                            : '파일 형식 제한 없음'}
                        </p>
                      </div>
                    </label>

                    {file?.uploading && (
                      <span className="text-xs text-slate-500">업로드 중...</span>
                    )}
                    {file?.key && !file?.uploading && (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <p className="truncate text-xs text-slate-500">
                          {file.key}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveQuestionFile(q.formQuestionId)
                            }
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            파일 제거
                          </button>
                        </div>
                      </div>
                    )}
                    {file?.error && (
                      <span className="text-xs text-rose-600">
                        {file.error}
                      </span>
                    )}
                  </div>
                ) : type.includes('TEXTAREA') ? (
                  <textarea
                    value={String(value ?? '')}
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                ) : type.includes('SELECT') || type.includes('RADIO') ? (
                  <select
                    value={String(value ?? '')}
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">선택</option>
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
                              handleAnswerChange(
                                q.formQuestionId,
                                Array.from(next),
                              );
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
                    onChange={(e) =>
                      handleAnswerChange(q.formQuestionId, e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitLoading}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
          >
            {submitLoading ? '제출 중...' : '지원서 제출'}
          </button>
        </div>
      </Reveal>
    </div>
  );
}
