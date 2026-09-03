import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, Search, X } from 'lucide-react';
import Reveal from '../../../components/ui/Reveal';
import BackArrowIcon from '../../../components/ui/BackArrowIcon';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import {
  adminApplicationsApi,
  type AdminApplicationDetail,
  type AdminApplicationListItem,
  type AdminApplicationResultStatus,
} from '../../../api/admin/applications';
import {
  adminFormsApi,
  type AdminFormListItem,
  type AdminFormQuestion,
} from '../../../api/admin/forms';
import { formatYmd, parseDateLike } from '../../../utils/common/date';
import { getDepartmentLabel } from '../../../types/recruit';
import AdminApplicationPrintDocument from './AdminApplicationPrintDocument';

const RESULT_OPTIONS: Array<{
  value: AdminApplicationResultStatus | 'all';
  label: string;
}> = [
  { value: 'all', label: '전체' },
  { value: 'NOT_PUBLISHED', label: '미발표' },
  { value: 'PASS', label: '합격' },
  { value: 'FAIL', label: '불합격' },
];

type SortOrder = 'desc' | 'asc';

const RESULT_LABELS = RESULT_OPTIONS.reduce<
  Partial<Record<AdminApplicationResultStatus, string>>
>((acc, option) => {
  if (option.value !== 'all') acc[option.value] = option.label;
  return acc;
}, {});

function getFormStatusLabel(open: boolean) {
  return open ? '현재 모집 중' : '비공개';
}

function getResultStatusLabel(status: AdminApplicationResultStatus) {
  return RESULT_LABELS[status] ?? status;
}

export default function AdminApplicationsListPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [formId, setFormId] = useState(params.get('formId') ?? '');
  const [forms, setForms] = useState<AdminFormListItem[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<AdminApplicationListItem[]>([]);

  const [query, setQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<
    'all' | AdminApplicationResultStatus
  >('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [printing, setPrinting] = useState(false);
  const [printRequested, setPrintRequested] = useState(false);
  const [printDetails, setPrintDetails] = useState<AdminApplicationDetail[]>(
    [],
  );
  const [printQuestionMap, setPrintQuestionMap] = useState<
    Record<number, AdminFormQuestion>
  >({});
  const selectedFormId = params.get('formId') ?? '';
  const selectedForm = forms.find(
    (form) => String(form.formId) === selectedFormId,
  );
  const selectedFormTitle = selectedForm?.title ?? '선택한 지원서';
  const hasActiveFilter = query.trim() !== '' || resultFilter !== 'all';

  const load = useCallback(async (targetFormId: string) => {
    if (!targetFormId.trim()) {
      setList([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminApplicationsApi.list(targetFormId.trim());
      setList(data ?? []);
    } catch (err) {
      console.error(err);
      setError('지원서 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await adminFormsApi.list();
        if (!active) return;
        setForms(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setForms([]);
      } finally {
        if (active) setFormsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const existing = params.get('formId') ?? '';
    // URL 쿼리스트링(외부 상태)과 폼 선택 상태를 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormId(existing);
    if (existing) void load(existing);
    else setList([]);
  }, [load, params]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const next = list.filter((item) => {
      if (resultFilter !== 'all' && item.resultStatus !== resultFilter)
        return false;
      if (!normalized) return true;
      return (
        item.studentId.toLowerCase().includes(normalized) ||
        (item.applicantName ?? '').toLowerCase().includes(normalized) ||
        String(item.applicationId).includes(normalized)
      );
    });

    return next.sort((a, b) => {
      const da = parseDateLike(a.updatedAt ?? a.createdAt);
      const db = parseDateLike(b.updatedAt ?? b.createdAt);
      const diff = (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [list, query, resultFilter, sortOrder]);

  const handleSearch = useCallback(() => {
    const next = formId.trim();
    setParams((prev) => {
      const copy = new URLSearchParams(prev);
      if (next) copy.set('formId', next);
      else copy.delete('formId');
      return copy;
    });
    void load(next);
  }, [formId, load, setParams]);

  useEffect(() => {
    if (!printRequested || printDetails.length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      window.print();
      setPrintRequested(false);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [printDetails.length, printRequested]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintDetails([]);
      setPrintQuestionMap({});
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrint = useCallback(async () => {
    if (!selectedFormId || filtered.length === 0 || printing) return;

    setPrinting(true);
    try {
      const [questionData, detailData] = await Promise.all([
        adminFormsApi.getQuestions(selectedFormId).catch(() => []),
        Promise.all(
          filtered.map((item) =>
            adminApplicationsApi.getById(
              selectedFormId,
              String(item.applicationId),
            ),
          ),
        ),
      ]);

      const map = (questionData ?? []).reduce<
        Record<number, AdminFormQuestion>
      >((acc, question) => {
        acc[question.formQuestionId] = question;
        return acc;
      }, {});

      setPrintQuestionMap(map);
      setPrintDetails(detailData.filter(Boolean));
      setPrintRequested(true);
    } catch (err) {
      console.error(err);
      toast.error('PDF 출력용 지원서 정보를 불러오지 못했어요.');
    } finally {
      setPrinting(false);
    }
  }, [filtered, printing, selectedFormId, toast]);

  const handleDelete = useCallback(
    async (item: AdminApplicationListItem) => {
      const ok = await confirm.open({
        title: '지원서 삭제',
        description: '이 지원서를 삭제할까요?',
        danger: true,
        confirmText: '삭제',
      });
      if (!ok) return;

      try {
        await adminApplicationsApi.delete(String(item.applicationId));
        toast.success('지원서를 삭제했어요.');
        const currentFormId = params.get('formId') ?? '';
        if (currentFormId) await load(currentFormId);
      } catch {
        toast.error('지원서를 삭제하지 못했어요.');
      }
    },
    [confirm, load, params, toast],
  );

  return (
    <>
      <div className="print-screen-hidden mx-auto max-w-6xl px-4 py-12">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="mb-4">
                <Link
                  to="/admin/forms"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  <BackArrowIcon className="h-5 w-5" />
                  지원서 관리
                </Link>
              </div>
              <h1 className="font-heading text-3xl text-primary">
                지원자 보기
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {selectedFormId
                  ? `${selectedFormTitle}에 제출한 지원자를 확인할 수 있어요`
                  : '지원서를 선택하면 지원자가 제출한 내용을 확인할 수 있어요'}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedFormId || filtered.length === 0 || printing}
              className="print-hidden inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {printing ? '불러오는 중...' : '전체 PDF 출력'}
            </button>
          </div>
        </Reveal>

        <Reveal
          delayMs={120}
          className="mt-6 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900">지원자 목록</p>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                {filtered.length > 0
                  ? `${filtered.length}명`
                  : hasActiveFilter
                    ? '검색 결과 없음'
                    : '지원자 없음'}
              </span>
              {list.length !== filtered.length && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  전체 {list.length}명
                </span>
              )}
            </div>

            <div className="print-hidden flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
              {!selectedFormId && (
                <>
                  {formsLoading ? (
                    <div className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-400 lg:w-72">
                      지원서 목록을 불러오는 중...
                    </div>
                  ) : forms.length > 0 ? (
                    <select
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 lg:w-72"
                    >
                      <option value="">지원서 선택</option>
                      {forms.map((form) => (
                        <option key={form.formId} value={String(form.formId)}>
                          [{getFormStatusLabel(form.open)}] {form.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="지원서 ID 입력"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 lg:w-64"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                  >
                    조회
                  </button>
                </>
              )}

              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름/학번 검색"
                  className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="검색어 지우기"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <select
                value={resultFilter}
                onChange={(e) =>
                  setResultFilter(
                    e.target.value as AdminApplicationResultStatus | 'all',
                  )
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                {RESULT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                <option value="desc">최신순</option>
                <option value="asc">오래된순</option>
              </select>
            </div>
          </div>
        </Reveal>

        <Reveal
          delayMs={180}
          className="application-print mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
          {error && (
            <p className="text-sm font-semibold text-rose-600">{error}</p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              조회된 지원서가 없습니다.
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const date = formatYmd(item.createdAt ?? item.updatedAt);
              const applicantName = item.applicantName?.trim() || '이름 없음';
              return (
                <div
                  key={item.applicationId}
                  className="flex items-center gap-4 py-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {applicantName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      학번 {item.studentId} · 접수일 {date}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      1지망 {getDepartmentLabel(item.firstDepartment)} / 2지망{' '}
                      {getDepartmentLabel(item.secondDepartment)}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {getResultStatusLabel(item.resultStatus)}
                  </span>
                  <div className="print-hidden flex gap-2">
                    <Link
                      to={`/admin/applications/${params.get('formId')}/${item.applicationId}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      상세
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
      <div className="print-only">
        {printDetails.map((detail, index) => (
          <AdminApplicationPrintDocument
            key={detail.applicationId}
            detail={detail}
            questionMap={printQuestionMap}
            formTitle={selectedFormTitle}
            index={index}
            total={printDetails.length}
          />
        ))}
      </div>
    </>
  );
}
