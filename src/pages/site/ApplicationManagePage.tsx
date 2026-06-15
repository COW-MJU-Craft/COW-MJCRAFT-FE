import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Reveal from '../../components/Reveal';
import ApplicationCheckForm from '../../components/ApplicationCredentialForm';
import {
  applicationsApi,
  type ApplicationAnswer,
  type ApplicationFormResponse,
  type ApplicationQuestion,
  type ApplicationReadResponse,
} from '../../api/applications';
import { uploadToPresignedUrl } from '../../api/adminProjects';
import { DEPARTMENT_OPTIONS } from '../../types/recruit';
import type { DepartmentType } from '../../types/recruit';

type AnswerValue = string | string[] | null;
type FileState = {
  key?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  uploading?: boolean;
  error?: string | null;
};

type Snapshot = {
  firstDepartment: DepartmentType | '';
  secondDepartment: DepartmentType | '';
  answers: Record<number, AnswerValue>;
  files: Record<number, FileState>;
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
      // noop
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

function collectAnswers(data?: ApplicationReadResponse | null) {
  const list: ApplicationAnswer[] = [];
  const push = (arr?: ApplicationAnswer[] | null) => {
    if (!arr) return;
    arr.forEach((a) => list.push(a));
  };
  push(data?.basicAnswers);
  push(data?.commonAnswers);
  push(data?.firstDepartmentAnswers);
  push(data?.secondDepartmentAnswers);
  return list;
}

function normalizeDepartment(value: string): DepartmentType | '' {
  const hit = DEPARTMENT_OPTIONS.find((opt) => opt.value === value);
  return hit ? hit.value : '';
}

function parseFormIdParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getUploadedFileLabel(value: AnswerValue, file?: FileState) {
  if (file?.fileName) return file.fileName;
  if (typeof value !== 'string' || !value.trim()) return '';

  const basename = value.split('/').filter(Boolean).pop() ?? value;
  return basename.replace(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/,
    '',
  );
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

export default function ApplicationManagePage() {
  const [searchParams] = useSearchParams();
  const formId = parseFormIdParam(searchParams.get('formId'));
  const [openForm, setOpenForm] = useState<ApplicationFormResponse | null>(
    null,
  );

  const [readData, setReadData] = useState<ApplicationReadResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
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
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const checkOpenForm = useCallback(async () => {
    try {
      const form = await applicationsApi.getForm();
      setOpenForm(form ?? null);
    } catch {
      setOpenForm(null);
    }
  }, []);

  useEffect(() => {
    void checkOpenForm();
  }, [checkOpenForm]);

  const selectedDepartments = useMemo(() => {
    const set = new Set<DepartmentType>();
    if (firstDepartment) set.add(firstDepartment);
    if (secondDepartment) set.add(secondDepartment);
    return set;
  }, [firstDepartment, secondDepartment]);

  const questionSource = useMemo(() => {
    const list = (readData?.questions ?? openForm?.questions ?? []).slice().sort((a, b) => {
      const ao = a.questionOrder ?? 0;
      const bo = b.questionOrder ?? 0;
      return ao - bo;
    });
    return list;
  }, [readData?.questions, openForm?.questions]);

  const questions = useMemo(() => {
    return questionSource.filter((q) =>
      shouldShowByDepartment(
        q.sectionType,
        q.departmentType,
        selectedDepartments,
      ),
    );
  }, [questionSource, selectedDepartments]);

  const handleAnswerChange = (id: number, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleLookup = async () => {
    setLookupError(null);
    setValidationError(null);

    if (!studentId.trim() || !password.trim()) {
      setLookupError('학번과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await applicationsApi.read({
        formId,
        studentId: studentId.trim(),
        password: password.trim(),
      });

      if (!res) {
        setLookupError(
          '조회된 지원서가 없습니다. 학번 또는 비밀번호를 확인해주세요.',
        );
        return;
      }

      setReadData(res);

      const next: Record<number, AnswerValue> = {};
      const nextFiles: Record<number, FileState> = {};
      collectAnswers(res).forEach((a) => {
        const persistedValue = a.fileKey ?? a.value ?? null;
        next[a.formQuestionId] = persistedValue;
        if (a.fileKey || a.fileUrl || a.fileName) {
          nextFiles[a.formQuestionId] = {
            key: a.fileKey ?? a.value ?? null,
            fileName: a.fileName ?? null,
            fileUrl: a.fileUrl ?? null,
            uploading: false,
            error: null,
          };
        }
      });
      setAnswers(next);
      setFiles(nextFiles);

      const first = normalizeDepartment(String(res.firstDepartment ?? ''));
      const second = normalizeDepartment(String(res.secondDepartment ?? ''));
      setFirstDepartment(first);
      setSecondDepartment(second);

      setSnapshot({
        firstDepartment: first,
        secondDepartment: second,
        answers: next,
        files: nextFiles,
      });
    } catch {
      setLookupError(
        '조회된 지원서가 없습니다. 학번 또는 비밀번호를 확인해주세요.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (q: ApplicationQuestion, file: File) => {
    const qid = q.formQuestionId;
    setFiles((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], uploading: true, error: null },
    }));
    try {
      const res = await applicationsApi.presignFiles([
        {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        },
      ]);
      const target = res.items?.[0];
      if (!target) throw new Error('업로드 URL이 없습니다.');

      await uploadToPresignedUrl(
        target.uploadUrl,
        file,
        file.type || 'application/octet-stream',
      );

      setFiles((prev) => ({
        ...prev,
        [qid]: {
          key: target.key,
          fileName: target.fileName ?? file.name,
          fileUrl: null,
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
    }
  };

  const handleReset = () => {
    if (!snapshot) return;
    setFirstDepartment(snapshot.firstDepartment);
    setSecondDepartment(snapshot.secondDepartment);
    setAnswers(snapshot.answers);
    setFiles(snapshot.files);
    setValidationError(null);
  };

  const handleSubmit = async () => {
    setValidationError(null);

    if (readData?.editable === false) {
      setValidationError('모집이 종료되어 지원서를 수정할 수 없습니다.');
      return;
    }

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

    for (const q of questions) {
      const type = getAnswerType(q.answerType);
      const val = normalizeAnswerValue(answers[q.formQuestionId] ?? null);

      if (type.includes('FILE')) {
        const f = files[q.formQuestionId];
        const existing = typeof answers[q.formQuestionId] === 'string';
        if (q.required && !existing && !f?.key) {
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

    const payloadAnswers = questionSource.map((q) => {
      const value = normalizeAnswerValue(answers[q.formQuestionId] ?? null);
      return { formQuestionId: q.formQuestionId, value: value ?? null };
    });

    setSubmitLoading(true);
    try {
      await applicationsApi.update({
        formId,
        studentId: studentId.trim(),
        password: password.trim(),
        firstDepartment,
        secondDepartment,
        answers: payloadAnswers,
      });

      setSnapshot({
        firstDepartment,
        secondDepartment,
        answers: { ...answers },
        files: { ...files },
      });
      alert('지원서가 저장되었습니다.');
    } catch {
      alert('지원서 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <h1 className="font-heading text-3xl text-primary">지원서 조회/수정</h1>
        <p className="mt-2 text-sm text-slate-600">
          학번/비밀번호로 불러온 뒤 내용을 수정하고 저장할 수 있어요.
        </p>
      </Reveal>

      {!readData && (
        <Reveal delayMs={100} className="mt-8">
          <ApplicationCheckForm
            title="지원서 조회/수정"
            description="학번/비밀번호를 입력해 기존 지원서를 불러오세요."
            studentId={studentId}
            password={password}
            loading={loading}
            error={lookupError}
            buttonLabel="지원서 조회/수정"
            onChangeStudentId={setStudentId}
            onChangePassword={setPassword}
            onSubmit={handleLookup}
          />
        </Reveal>
      )}

      {readData && (
        <>
          {validationError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
              {validationError}
            </div>
          )}
          {readData.editable === false && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              모집이 종료되어 조회만 가능합니다.
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
                    if (next && secondDepartment === next)
                      setSecondDepartment('');
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
            delayMs={170}
            className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-bold text-slate-900">질문</h2>
            <div className="mt-4 space-y-5">
              {questions.map((q, idx) => {
                const type = getAnswerType(q.answerType);
                const value = answers[q.formQuestionId] ?? '';
                const options = parseOptions(q.selectOptions);
                const file = files[q.formQuestionId];
                const fileLabel = getUploadedFileLabel(value, file);
                const displayNumber =
                  typeof q.questionOrder === 'number' && q.questionOrder > 0
                    ? q.questionOrder
                    : idx + 1;

                return (
                  <div key={q.formQuestionId} className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      {displayNumber}. {q.content}
                      {q.required && (
                        <span className="ml-1 text-rose-500">*</span>
                      )}
                    </label>
                    {q.description && (
                      <p className="text-xs text-slate-400">{q.description}</p>
                    )}

                    {type.includes('FILE') ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleFileUpload(q, file);
                          }}
                          className="text-sm"
                        />
                        {typeof value === 'string' && value && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="truncate text-xs font-semibold text-slate-600">
                              기존 파일: {fileLabel || '첨부 파일'}
                            </p>
                            {file?.fileUrl && (
                              <a
                                href={file.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                파일 열기
                              </a>
                            )}
                          </div>
                        )}
                        {files[q.formQuestionId]?.uploading && (
                          <span className="text-xs text-slate-500">
                            업로드 중...
                          </span>
                        )}
                        {files[q.formQuestionId]?.error && (
                          <span className="text-xs text-rose-600">
                            {files[q.formQuestionId]?.error}
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
                      <input
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

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                되돌리기
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitLoading || readData.editable === false}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
              >
                {submitLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
