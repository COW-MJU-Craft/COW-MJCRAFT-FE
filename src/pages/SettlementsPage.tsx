import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Reveal from '../components/Reveal';
import {
  calcReport,
  getItemTotal,
  settlementsApi,
  sumItems,
} from '../api/settlements';
import type { SettlementReport } from '../types/settlements';

function money(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}₩${abs.toLocaleString()}`;
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full px-4 py-2 text-sm font-bold transition-colors',
        'border border-slate-200',
        active
          ? 'bg-primary text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function SettlementsPage() {
  const [reports, setReports] = useState<SettlementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState<'all' | string>('all');
  const mountedRef = useRef(true);

  const load = useCallback((options?: { reset?: boolean }) => {
    const shouldReset = options?.reset ?? true;
    if (shouldReset) {
      setLoading(true);
      setError(null);
    }
    settlementsApi
      .list()
      .then((data) => {
        if (!mountedRef.current) return;
        setReports(data);
        setError(null);
      })
      .catch((e) => {
        if (!mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!mountedRef.current) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      load({ reset: false });
    }, 0);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerId);
    };
  }, [load]);

  const terms = useMemo(() => {
    const set = new Set(reports.map((r) => r.term));
    return Array.from(set).sort().reverse();
  }, [reports]);

  const filtered = useMemo(() => {
    if (term === 'all') return reports;
    return reports.filter((r) => r.term === term);
  }, [reports, term]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-primary">정산</h1>
            <p className="mt-2 text-slate-600">
              학기별 정산 내역을 확인할 수 있어요.
            </p>
          </div>

          <button
            onClick={() => load()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>
      </Reveal>

      <Reveal delayMs={60} className="mt-6 flex flex-wrap gap-2">
        <TabButton active={term === 'all'} onClick={() => setTerm('all')}>
          전체
        </TabButton>
        {terms.map((t) => (
          <TabButton key={t} active={term === t} onClick={() => setTerm(t)}>
            {t}
          </TabButton>
        ))}
      </Reveal>

      {loading && (
        <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          정산 내역 불러오는 중...
        </Reveal>
      )}

      {!loading && error && (
        <Reveal className="mt-6 rounded-3xl border border-rose-200 bg-white p-8">
          <div className="text-sm font-bold text-rose-700">
            정산 내역을 불러오지 못했습니다: {error}
          </div>
          <button
            onClick={() => load()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            다시 시도
          </button>
        </Reveal>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          등록된 정산 내역이 없어요.
        </Reveal>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Reveal
          delayMs={90}
          className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white"
        >
          <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-600">
            <div className="col-span-4">프로젝트명</div>
            <div className="col-span-2">학기</div>
            <div className="col-span-2 text-right">매출</div>
            <div className="col-span-2 text-right">지출</div>
            <div className="col-span-2 text-right">순이익</div>
          </div>

          {filtered.map((r) => {
            const c = calcReport(r);
            const profitCls = c.profit >= 0 ? 'text-primary' : 'text-rose-600';

            return (
              <details
                key={r.id}
                className="group border-b border-slate-200 last:border-b-0"
              >
                <summary className="grid cursor-pointer grid-cols-12 items-center px-5 py-4 text-sm">
                  <div className="col-span-4">
                    <div className="font-bold text-slate-900">
                      {r.projectTitle}
                    </div>
                    {r.instaHandle && (
                      <div className="mt-1 text-xs text-slate-500">
                        {r.instaHandle}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 text-slate-700">{r.term}</div>

                  <div className="col-span-2 text-right font-bold text-slate-800">
                    {money(c.salesTotal)}
                  </div>

                  <div className="col-span-2 text-right font-bold text-slate-800">
                    {money(c.expenseTotal)}
                  </div>

                  <div
                    className={`col-span-2 text-right font-bold ${profitCls}`}
                  >
                    {money(c.profit)}
                  </div>
                </summary>

                <div className="px-5 pb-6 text-sm text-slate-700">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-600">요약</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs text-slate-500">매출 합계</div>
                        <div className="mt-1 font-bold">
                          {money(c.salesTotal)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs text-slate-500">지출 합계</div>
                        <div className="mt-1 font-bold">
                          {money(c.expenseTotal)}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <div className="text-xs text-slate-500">수익률</div>
                        <div className={`mt-1 font-bold ${profitCls}`}>
                          {c.profitRate.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="font-heading text-lg text-slate-900">
                        매출
                      </div>
                      {r.sales.length === 0 ? (
                        <div className="mt-2 text-sm text-slate-500">
                          등록된 항목이 없어요.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {r.sales.map((it) => (
                            <div
                              key={it.label}
                              className="flex items-center justify-between"
                            >
                              <div className="text-slate-700">{it.label}</div>
                              <div className="font-bold text-slate-900">
                                {money(getItemTotal(it))}
                              </div>
                            </div>
                          ))}
                          <div className="mt-3 h-px bg-slate-200" />
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-slate-900">합계</div>
                            <div className="font-bold text-slate-900">
                              {money(sumItems(r.sales))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8">
                      <div className="font-heading text-lg text-slate-900">
                        지출
                      </div>

                      {r.expenseGroups.length === 0 ? (
                        <div className="mt-2 text-sm text-slate-500">
                          등록된 항목이 없어요.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-6">
                          {r.expenseGroups.map((g) => {
                            const gTotal = sumItems(g.items);
                            return (
                              <div
                                key={g.title}
                                className="rounded-xl bg-white p-4"
                              >
                                <div className="flex items-end justify-between">
                                  <div className="font-bold text-slate-900">
                                    {g.title}
                                  </div>
                                  <div className="font-bold text-slate-900">
                                    {money(gTotal)}
                                  </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {g.items.map((it) => (
                                    <div
                                      key={`${g.title}-${it.label}`}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="text-slate-700">
                                        {it.label}
                                      </div>
                                      <div className="font-bold text-slate-900">
                                        {money(getItemTotal(it))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {r.footerNote && (
                      <div className="mt-6 text-xs text-slate-500">
                        * {r.footerNote}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </Reveal>
      )}
    </div>
  );
}
