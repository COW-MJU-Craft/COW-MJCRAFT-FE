import { calcReport, getItemTotal, sumItems } from '../../api/site/payouts';
import type { PayoutReport } from '../../types/payouts';

function money(n: number) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString()}원`;
}

export default function PayoutReportCard({
  report,
  simplified = false,
  embedded = false,
  showHeader = true,
}: {
  report: PayoutReport;
  simplified?: boolean;
  embedded?: boolean;
  showHeader?: boolean;
}) {
  const c = calcReport(report);

  const content = (
    <>
      {showHeader && (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-lg font-bold text-slate-900">
            {report.projectTitle}
          </div>
          <div className="mt-1 text-sm text-slate-600">{report.term}</div>
        </div>
      )}

      <div
        className={[
          embedded ? 'px-0 pb-1 pt-1' : 'px-5 pb-6 pt-5',
          'text-sm text-slate-700',
        ].join(' ')}
      >
        <div
          className={
            simplified
              ? 'space-y-8 px-2 py-2 md:px-3 md:py-3'
              : 'rounded-2xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner'
          }
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700">요약</div>
            <div className="text-[11px] text-slate-400">단위: 원</div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[10px] text-slate-500">매출</div>
              <div className="text-sm font-bold text-emerald-600">
                {money(c.salesTotal)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-[10px] text-slate-500">지출</div>
              <div className="text-sm font-bold text-rose-600">
                {money(c.expenseTotal)}
              </div>
            </div>
          </div>

          <div className={simplified ? '' : 'mt-6'}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-slate-900">매출</div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                {money(sumItems(report.sales))}
              </span>
            </div>

            {report.sales.length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">
                등록된 항목이 없어요.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {report.sales.map((it, idx) => (
                  <div
                    key={String(it.id ?? `${it.label}-${idx}`)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="text-sm font-medium text-slate-700">
                      {it.label}
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {money(getItemTotal(it))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={simplified ? '' : 'mt-8'}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-slate-900">지출</div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                {money(c.expenseTotal)}
              </span>
            </div>

            {report.expenseGroups.length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">
                등록된 항목이 없어요.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {report.expenseGroups.map((g, groupIdx) => {
                  const gTotal = sumItems(g.items);
                  return (
                    <div
                      key={`${g.title}-${groupIdx}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-base font-bold text-slate-900">
                          {g.title}
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {money(gTotal)}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {g.items.map((it, itemIdx) => (
                          <div
                            key={`${g.title}-${String(it.id ?? `${it.label}-${itemIdx}`)}`}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 shadow-sm"
                          >
                            <div className="text-sm text-slate-700">
                              {it.label}
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
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

          {report.footerNote && (
            <div
              className={[simplified ? '' : 'mt-6', 'text-xs text-slate-500']
                .join(' ')
                .trim()}
            >
              * {report.footerNote}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {content}
    </div>
  );
}
