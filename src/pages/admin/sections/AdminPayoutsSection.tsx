import { useEffect, useMemo, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import { payoutsAdminApi, type PayoutReport } from '../../../api/site/payouts';
import type { ExpenseGroup, MoneyItem } from '../../../types/payouts';
import {
  adminProjectsApi,
  type AdminProjectResponse,
} from '../../../api/admin/projects';

type SectionKey = 'sales' | 'expense';
type InputMode = 'select' | 'manual';

function createId() {
  return `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function reportKey(id: string | number | undefined) {
  return String(id ?? '');
}

function createEmptyReport(
  defaultProject?: AdminProjectResponse,
): PayoutReport {
  return {
    id: createId(),
    term: '',
    projectTitle: defaultProject?.title ?? '',
    projectId: defaultProject ? String(defaultProject.id) : '',
    sales: [],
    expenseGroups: [],
  };
}

function createEmptyItem(): MoneyItem {
  return {
    id: createId(),
    label: '',
    amount: 0,
  };
}

function createEmptyGroup(): ExpenseGroup {
  return {
    title: '',
    items: [],
  };
}

function toDigitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function toSafeNonNegativeInt(value: string) {
  const digits = toDigitsOnly(value);
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWithComma(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString();
}

function withComputedAmount(item: MoneyItem): MoneyItem {
  const rawAmount = item.amount ?? 0;
  const amount = Math.max(0, Number.isFinite(rawAmount) ? rawAmount : 0);

  return {
    ...item,
    amount,
  };
}

function money(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString();
}

type AmountFieldProps = {
  value: number;
  onChange: (next: number) => void;
  placeholder?: string;
};

function AmountField({
  value,
  onChange,
  placeholder = '총액',
}: AmountFieldProps) {
  const [focused, setFocused] = useState(false);

  const displayValue = focused
    ? value === 0
      ? ''
      : String(value)
    : formatWithComma(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(toSafeNonNegativeInt(e.target.value))}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60"
    />
  );
}

function hasItemInput(item: MoneyItem) {
  return (item.label ?? '').trim().length > 0 || (item.amount ?? 0) > 0;
}

export default function AdminPayoutsSection() {
  const [reports, setReports] = useState<PayoutReport[]>([]);
  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<
    Record<string, { sales: boolean; expense: boolean }>
  >({});
  const [inputModes, setInputModes] = useState<Record<string, InputMode>>({});
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [closedProjects, setClosedProjects] = useState<AdminProjectResponse[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const projectMap = useMemo(() => {
    const map = new Map<string, AdminProjectResponse>();
    closedProjects.forEach((p) => map.set(String(p.id), p));
    return map;
  }, [closedProjects]);

  const ensureSectionState = (key: string) => {
    setOpenSections((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: { sales: true, expense: true } };
    });
  };

  const ensureInputMode = (key: string, mode: InputMode) => {
    setInputModes((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: mode };
    });
  };

  const isSectionOpen = (key: string, section: SectionKey) =>
    openSections[key]?.[section] ?? true;

  const getMode = (key: string): InputMode => inputModes[key] ?? 'select';

  const toggleSection = (key: string, section: SectionKey) => {
    setOpenSections((prev) => {
      const current = prev[key] ?? { sales: true, expense: true };
      return {
        ...prev,
        [key]: { ...current, [section]: !current[section] },
      };
    });
  };

  const setMode = (key: string, mode: InputMode) => {
    setInputModes((prev) => ({ ...prev, [key]: mode }));
  };

  useEffect(() => {
    let active = true;

    (async () => {
      setProjectsLoading(true);
      setProjectsError(null);

      try {
        const list = await adminProjectsApi.list();
        if (!active) return;
        const closed = (list ?? []).filter((p) => p.status === 'CLOSED');
        setClosedProjects(closed);
      } catch (e) {
        if (!active) return;
        setProjectsError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setProjectsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const list = await payoutsAdminApi.list();
        if (!active) return;

        setReports(list);

        list.forEach((r) => {
          const key = reportKey(r.id);
          ensureSectionState(key);

          const pid = String(r.projectId ?? '');
          const selected = projectMap.get(pid);
          const mode: InputMode =
            selected && r.projectTitle && r.projectTitle !== selected.title
              ? 'manual'
              : 'select';
          ensureInputMode(key, mode);
        });
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [projectMap]);

  const updateReport = (key: string, patch: Partial<PayoutReport>) => {
    setReports((prev) =>
      prev.map((r) => (reportKey(r.id) === key ? { ...r, ...patch } : r)),
    );
  };

  const addReport = () => {
    const defaultProject = closedProjects[0];
    const next = createEmptyReport(defaultProject);
    const key = reportKey(next.id);

    setReports((prev) => [...prev, next]);
    setOpenReportId(key);
    ensureSectionState(key);
    ensureInputMode(key, 'select');
  };

  const removeReport = async (key: string) => {
    setMsg(null);
    setError(null);

    const isTmp = key.startsWith('tmp_');
    if (isTmp) {
      setReports((prev) => prev.filter((r) => reportKey(r.id) !== key));
      if (openReportId === key) setOpenReportId(null);
      return;
    }

    try {
      await payoutsAdminApi.remove(key);
      setReports((prev) => prev.filter((r) => reportKey(r.id) !== key));
      if (openReportId === key) setOpenReportId(null);
      setMsg('정산서를 삭제했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const saveOne = async (report: PayoutReport) => {
    try {
      setMsg(null);
      setError(null);

      if (!report.projectId) {
        setError('정산 저장 전 마감 프로젝트를 선택해 주세요.');
        return;
      }

      const saved = await payoutsAdminApi.save(report);
      const oldKey = reportKey(report.id);
      const newKey = reportKey(saved.id);

      setReports((prev) =>
        prev.map((r) => (reportKey(r.id) === oldKey ? saved : r)),
      );
      if (openReportId === oldKey) setOpenReportId(newKey);
      ensureSectionState(newKey);
      ensureInputMode(newKey, getMode(oldKey));
      setMsg('저장했습니다.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const patchSale = (
    key: string,
    itemId: string | number,
    patch: Partial<MoneyItem>,
  ) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        const sales = r.sales.map((it) =>
          String(it.id) === String(itemId)
            ? withComputedAmount({ ...it, ...patch })
            : it,
        );
        return { ...r, sales };
      }),
    );
  };

  const addSale = (key: string) => {
    setReports((prev) =>
      prev.map((r) =>
        reportKey(r.id) === key
          ? { ...r, sales: [...r.sales, createEmptyItem()] }
          : r,
      ),
    );
  };

  const removeSale = (key: string, itemId: string | number) => {
    setReports((prev) =>
      prev.map((r) =>
        reportKey(r.id) === key
          ? {
              ...r,
              sales: r.sales.filter((it) => String(it.id) !== String(itemId)),
            }
          : r,
      ),
    );
  };

  const addExpenseGroup = (key: string) => {
    setReports((prev) =>
      prev.map((r) =>
        reportKey(r.id) === key
          ? { ...r, expenseGroups: [...r.expenseGroups, createEmptyGroup()] }
          : r,
      ),
    );
  };

  const patchGroup = (
    key: string,
    groupIdx: number,
    patch: Partial<ExpenseGroup>,
  ) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        const expenseGroups = r.expenseGroups.map((g, idx) =>
          idx === groupIdx ? { ...g, ...patch } : g,
        );
        return { ...r, expenseGroups };
      }),
    );
  };

  const removeExpenseGroup = (key: string, groupIdx: number) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        return {
          ...r,
          expenseGroups: r.expenseGroups.filter((_, idx) => idx !== groupIdx),
        };
      }),
    );
  };

  const addExpenseItem = (key: string, groupIdx: number) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        const expenseGroups = r.expenseGroups.map((g, idx) =>
          idx === groupIdx
            ? { ...g, items: [...g.items, createEmptyItem()] }
            : g,
        );
        return { ...r, expenseGroups };
      }),
    );
  };

  const patchExpenseItem = (
    key: string,
    groupIdx: number,
    itemId: string | number,
    patch: Partial<MoneyItem>,
  ) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        const expenseGroups = r.expenseGroups.map((g, idx) => {
          if (idx !== groupIdx) return g;
          const items = g.items.map((it) =>
            String(it.id) === String(itemId)
              ? withComputedAmount({ ...it, ...patch })
              : it,
          );
          return { ...g, items };
        });
        return { ...r, expenseGroups };
      }),
    );
  };

  const removeExpenseItem = (
    key: string,
    groupIdx: number,
    itemId: string | number,
  ) => {
    setReports((prev) =>
      prev.map((r) => {
        if (reportKey(r.id) !== key) return r;
        const expenseGroups = r.expenseGroups.map((g, idx) =>
          idx === groupIdx
            ? {
                ...g,
                items: g.items.filter((it) => String(it.id) !== String(itemId)),
              }
            : g,
        );
        return { ...r, expenseGroups };
      }),
    );
  };

  const summary = useMemo(() => {
    return reports.map((r) => {
      const income = r.sales.reduce((acc, it) => acc + (it.amount ?? 0), 0);
      const expense = r.expenseGroups.reduce(
        (acc, g) =>
          acc + g.items.reduce((sum, it) => sum + (it.amount ?? 0), 0),
        0,
      );
      const profit = income - expense;

      const hasSalesInput = r.sales.some(hasItemInput);
      const hasExpenseInput = r.expenseGroups.some((g) =>
        g.items.some(hasItemInput),
      );
      const hasAnyInput = hasSalesInput || hasExpenseInput;

      return {
        id: reportKey(r.id),
        income,
        expense,
        profit,
        hasSalesInput,
        hasExpenseInput,
        hasAnyInput,
      };
    });
  }, [reports]);

  return (
    <Reveal id="payouts" delayMs={120} className="mt-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:rounded-3xl md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl text-slate-900">정산 관리</h2>
          <button
            type="button"
            onClick={addReport}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            정산서 추가
          </button>
        </div>

        {projectsLoading && (
          <p className="mt-3 text-xs text-slate-500">
            마감 프로젝트 목록 로딩 중...
          </p>
        )}
        {projectsError && (
          <p className="mt-3 text-xs font-semibold text-rose-600">
            {projectsError}
          </p>
        )}
        {!projectsLoading && !projectsError && closedProjects.length === 0 && (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            마감(CLOSED) 프로젝트가 없어 정산서 생성/저장이 어렵습니다.
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>
        )}
        {msg && (
          <p className="mt-4 text-sm font-semibold text-emerald-600">{msg}</p>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">
            정산 목록을 불러오는 중...
          </p>
        ) : reports.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">등록된 정산이 없습니다.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {reports.map((report) => {
              const key = reportKey(report.id);
              const sum = summary.find((s) => s.id === key);
              const isOpen = openReportId === key;
              const isSalesOpen = isSectionOpen(key, 'sales');
              const isExpenseOpen = isSectionOpen(key, 'expense');
              const mode = getMode(key);
              const selectedProject = projectMap.get(
                String(report.projectId ?? ''),
              );

              const salesTotal = report.sales.reduce(
                (acc, it) => acc + (it.amount ?? 0),
                0,
              );
              const expenseTotal = report.expenseGroups.reduce(
                (acc, group) =>
                  acc +
                  group.items.reduce(
                    (groupAcc, it) => groupAcc + (it.amount ?? 0),
                    0,
                  ),
                0,
              );

              return (
                <div key={key} className="rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setOpenReportId(isOpen ? null : key)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-slate-50 md:rounded-2xl md:px-4"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {report.projectTitle?.trim() || '새 정산서'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {report.term?.trim() || '학기 미입력'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      {sum?.hasAnyInput ? (
                        <div className="hidden rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 md:block">
                          입력 완료
                        </div>
                      ) : (
                        <div className="hidden rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 md:block">
                          입력 전
                        </div>
                      )}
                      <span className="text-slate-400">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 p-3 md:p-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:p-4">
                        <div className="text-xs font-semibold text-slate-500">
                          프로젝트 연결 방식
                        </div>
                        <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setMode(key, 'select')}
                            className={[
                              'h-10 rounded-lg px-4 text-sm font-bold transition',
                              mode === 'select'
                                ? 'bg-primary text-white'
                                : 'text-slate-600 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            선택
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode(key, 'manual')}
                            className={[
                              'h-10 rounded-lg px-4 text-sm font-bold transition',
                              mode === 'manual'
                                ? 'bg-primary text-white'
                                : 'text-slate-600 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            직접 입력
                          </button>
                        </div>

                        <div className="mt-3 grid gap-2 lg:grid-cols-[150px_minmax(280px,1fr)_minmax(320px,1.2fr)_auto_auto]">
                          {mode === 'select' ? (
                            <>
                              <input
                                value={report.term}
                                onChange={(e) =>
                                  updateReport(key, { term: e.target.value })
                                }
                                placeholder="학기 (예: 2026-1)"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary/60"
                              />
                              <select
                                value={report.projectId ?? ''}
                                onChange={(e) => {
                                  const nextId = e.target.value;
                                  const selected = projectMap.get(nextId);
                                  updateReport(key, {
                                    projectId: nextId,
                                    projectTitle: selected?.title ?? '',
                                  });
                                }}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary/60"
                              >
                                <option value="">마감 프로젝트 선택</option>
                                {closedProjects.map((p) => (
                                  <option key={p.id} value={String(p.id)}>
                                    {p.title}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={report.projectTitle}
                                onChange={(e) =>
                                  updateReport(key, {
                                    projectTitle: e.target.value,
                                  })
                                }
                                placeholder="정산명(프로젝트명) 수정"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary/60"
                              />
                            </>
                          ) : (
                            <>
                              <input
                                value={report.term}
                                onChange={(e) =>
                                  updateReport(key, { term: e.target.value })
                                }
                                placeholder="학기 (예: 2026-1)"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary/60"
                              />
                              <input
                                value={report.projectTitle}
                                onChange={(e) =>
                                  updateReport(key, {
                                    projectTitle: e.target.value,
                                  })
                                }
                                placeholder="프로젝트명 입력"
                                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary/60"
                              />
                              <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500">
                                연결 프로젝트: {selectedProject?.title ?? '-'}
                                {report.projectId
                                  ? ` (ID: ${report.projectId})`
                                  : ''}
                              </div>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => void saveOne(report)}
                            className="h-10 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:opacity-95"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeReport(key)}
                            className="h-10 whitespace-nowrap rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            삭제
                          </button>
                        </div>

                        {mode === 'manual' && (
                          <p className="mt-2 text-[11px] text-slate-500">
                            직접 입력 모드에서도 연결 projectId는 유지됩니다.
                            변경은 선택 모드에서 가능합니다.
                          </p>
                        )}
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => toggleSection(key, 'sales')}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <h4 className="text-sm font-bold text-slate-800">
                            매출 항목
                          </h4>
                          <span className="text-slate-400">
                            {isSalesOpen ? '▾' : '▸'}
                          </span>
                        </button>

                        {isSalesOpen && (
                          <div className="border-t border-slate-200 p-3 md:p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <p className="text-xs text-slate-500">
                                  {report.sales.length === 0
                                    ? '매출 항목을 추가해 정산을 시작하세요.'
                                    : `총 ${report.sales.length}개 항목`}
                                </p>
                                {sum?.hasSalesInput && (
                                  <div className="text-sm font-bold text-emerald-700">
                                    {money(salesTotal)}원
                                  </div>
                                )}
                              </div>

                              {report.sales.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => addSale(key)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  항목 추가
                                </button>
                              )}
                            </div>

                            {report.sales.length === 0 ? (
                              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center md:p-7">
                                <p className="text-sm text-slate-500">
                                  아직 매출 항목이 없습니다.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addSale(key)}
                                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  첫 항목 추가
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {report.sales.map((item) => (
                                  <div
                                    key={String(item.id)}
                                    className="grid grid-cols-[minmax(0,1fr)_55px] gap-2 sm:grid-cols-[1fr_180px_auto] md:grid-cols-[1fr_220px_auto]"
                                  >
                                    <input
                                      value={item.label}
                                      onChange={(e) =>
                                        patchSale(key, item.id ?? '', {
                                          label: e.target.value,
                                        })
                                      }
                                      placeholder="항목명"
                                      className="col-span-2 h-10 rounded-xl border border-slate-200 px-3 text-sm sm:col-span-1"
                                    />

                                    <AmountField
                                      value={item.amount ?? 0}
                                      onChange={(next) =>
                                        patchSale(key, item.id ?? '', {
                                          amount: next,
                                        })
                                      }
                                      placeholder="총액"
                                    />

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeSale(key, item.id ?? '')
                                      }
                                      className="h-10 rounded-xl border border-rose-200 px-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 md:px-3 md:text-xs"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => toggleSection(key, 'expense')}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <h4 className="text-sm font-bold text-slate-800">
                            지출 그룹
                          </h4>
                          <span className="text-slate-400">
                            {isExpenseOpen ? '▾' : '▸'}
                          </span>
                        </button>

                        {isExpenseOpen && (
                          <div className="border-t border-slate-200 p-3 md:p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                <p className="text-xs text-slate-500">
                                  {report.expenseGroups.length === 0
                                    ? '지출 그룹을 추가해 항목을 분류하세요.'
                                    : `총 ${report.expenseGroups.length}개 그룹`}
                                </p>
                                {sum?.hasExpenseInput && (
                                  <div className="text-sm font-extrabold text-rose-800">
                                    {money(expenseTotal)}원
                                  </div>
                                )}
                              </div>

                              {report.expenseGroups.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => addExpenseGroup(key)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  그룹 추가
                                </button>
                              )}
                            </div>

                            {report.expenseGroups.length === 0 ? (
                              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center md:p-7">
                                <p className="text-sm text-slate-500">
                                  아직 지출 그룹이 없습니다.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addExpenseGroup(key)}
                                  className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  첫 그룹 추가
                                </button>
                              </div>
                            ) : (
                              <div className="mt-3 space-y-4">
                                {report.expenseGroups.map((group, groupIdx) => {
                                  const hasItems = group.items.length > 0;
                                  const groupHasInput =
                                    group.items.some(hasItemInput);
                                  const groupTotal = group.items.reduce(
                                    (acc, it) => acc + (it.amount ?? 0),
                                    0,
                                  );

                                  return (
                                    <div
                                      key={`${key}-${groupIdx}`}
                                      className="rounded-xl border border-slate-200 p-3 md:p-4"
                                    >
                                      <div className="grid grid-cols-[minmax(0,1fr)_55px] gap-2">
                                        <input
                                          value={group.title}
                                          onChange={(e) =>
                                            patchGroup(key, groupIdx, {
                                              title: e.target.value,
                                            })
                                          }
                                          placeholder="지출 그룹명 (예: 제작비, 운영비)"
                                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeExpenseGroup(key, groupIdx)
                                          }
                                          className="min-w-[55px] rounded-xl border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                          그룹
                                          <br />
                                          삭제
                                        </button>
                                      </div>

                                      <div
                                        className={[
                                          'mt-3 space-y-2',
                                          hasItems
                                            ? 'ml-2 border-l border-slate-200 pl-3 md:ml-6 md:pl-4'
                                            : '',
                                        ].join(' ')}
                                      >
                                        {group.items.map((item) => (
                                          <div
                                            key={String(item.id)}
                                            className="grid grid-cols-[minmax(0,1fr)_55px] gap-2 sm:grid-cols-[1fr_180px_auto] md:grid-cols-[1fr_220px_auto]"
                                          >
                                            <input
                                              value={item.label}
                                              onChange={(e) =>
                                                patchExpenseItem(
                                                  key,
                                                  groupIdx,
                                                  item.id ?? '',
                                                  { label: e.target.value },
                                                )
                                              }
                                              placeholder="항목명"
                                              className="col-span-2 h-10 rounded-xl border border-slate-200 px-3 text-sm sm:col-span-1"
                                            />

                                            <AmountField
                                              value={item.amount ?? 0}
                                              onChange={(next) =>
                                                patchExpenseItem(
                                                  key,
                                                  groupIdx,
                                                  item.id ?? '',
                                                  { amount: next },
                                                )
                                              }
                                              placeholder="총액"
                                            />

                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeExpenseItem(
                                                  key,
                                                  groupIdx,
                                                  item.id ?? '',
                                                )
                                              }
                                              className="h-10 rounded-xl border border-rose-200 px-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 md:px-3 md:text-xs"
                                            >
                                              삭제
                                            </button>
                                          </div>
                                        ))}
                                      </div>

                                      <div
                                        className={
                                          hasItems
                                            ? 'mt-3 ml-2 pl-3 md:ml-6 md:pl-4'
                                            : 'mt-3'
                                        }
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              addExpenseItem(key, groupIdx)
                                            }
                                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                          >
                                            항목 추가
                                          </button>

                                          {groupHasInput && (
                                            <div className="px-1 py-1 text-sm font-bold text-rose-700">
                                              {money(groupTotal)}원
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Reveal>
  );
}
