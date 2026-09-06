import {
  calcReport,
  getItemTotal,
  sumItems,
} from '../../../api/site/payouts';
import type { ReactNode } from 'react';
import type { ExpenseGroup, MoneyItem, PayoutReport } from '../../../types/payouts';

type AdminPayoutPrintDocumentProps = {
  report: PayoutReport;
  index?: number;
  total?: number;
};

function money(value: number) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Number.isFinite(value) ? value : 0);
  return `${sign}${abs.toLocaleString()}원`;
}

function itemKey(item: MoneyItem, index: number) {
  return String(item.id ?? `${item.label}-${index}`);
}

function Section({
  title,
  total,
  tone,
  children,
}: {
  title: string;
  total: number;
  tone: 'sales' | 'expense';
  children: ReactNode;
}) {
  return (
    <section className={`payout-print-section payout-print-section-${tone}`}>
      <div className="payout-print-section-head">
        <h2>{title}</h2>
        <span className={`payout-print-total payout-print-total-${tone}`}>
          {money(total)}
        </span>
      </div>
      {children}
    </section>
  );
}

function MoneyRows({
  items,
  emptyText,
}: {
  items: MoneyItem[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="payout-print-empty">{emptyText}</p>;
  }

  return (
    <div className="payout-print-rows">
      {items.map((item, index) => (
        <div key={itemKey(item, index)} className="payout-print-row">
          <span>{item.label?.trim() || '항목명 없음'}</span>
          <strong>{money(getItemTotal(item))}</strong>
        </div>
      ))}
    </div>
  );
}

function ExpenseGroupBlock({
  group,
  index,
}: {
  group: ExpenseGroup;
  index: number;
}) {
  const groupTotal = sumItems(group.items);

  return (
    <div className="payout-print-group">
      <div className="payout-print-group-head">
        <h3>{group.title?.trim() || `지출 그룹 ${index + 1}`}</h3>
        <strong>{money(groupTotal)}</strong>
      </div>
      <MoneyRows items={group.items} emptyText="등록된 지출 항목이 없습니다." />
    </div>
  );
}

export default function AdminPayoutPrintDocument({
  report,
  index,
  total,
}: AdminPayoutPrintDocumentProps) {
  const summary = calcReport(report);
  const positionLabel =
    typeof index === 'number' && typeof total === 'number'
      ? `${index + 1} / ${total}`
      : null;

  return (
    <article className="payout-print-doc">
      <header className="payout-print-header">
        <div>
          <p className="payout-print-eyebrow">정산서</p>
          <h1>{report.projectTitle?.trim() || '정산명 없음'}</h1>
          <p>{report.term?.trim() || '학기 미입력'}</p>
        </div>
        {positionLabel && <div className="payout-print-count">{positionLabel}</div>}
      </header>

      <dl className="payout-print-summary">
        <div>
          <dt>매출</dt>
          <dd className="payout-print-sales">{money(summary.salesTotal)}</dd>
        </div>
        <div>
          <dt>지출</dt>
          <dd className="payout-print-expense">{money(summary.expenseTotal)}</dd>
        </div>
        <div>
          <dt>잔액</dt>
          <dd className={summary.profit < 0 ? 'payout-print-expense' : 'payout-print-sales'}>
            {money(summary.profit)}
          </dd>
        </div>
        <div>
          <dt>수익률</dt>
          <dd>{summary.profitRate.toFixed(1)}%</dd>
        </div>
      </dl>

      <Section title="매출 항목" total={summary.salesTotal} tone="sales">
        <MoneyRows items={report.sales} emptyText="등록된 매출 항목이 없습니다." />
      </Section>

      <Section title="지출 그룹" total={summary.expenseTotal} tone="expense">
        {report.expenseGroups.length === 0 ? (
          <p className="payout-print-empty">등록된 지출 그룹이 없습니다.</p>
        ) : (
          <div className="payout-print-groups">
            {report.expenseGroups.map((group, groupIndex) => (
              <ExpenseGroupBlock
                key={`${group.title}-${groupIndex}`}
                group={group}
                index={groupIndex}
              />
            ))}
          </div>
        )}
      </Section>

      {report.footerNote?.trim() && (
        <p className="payout-print-note">* {report.footerNote.trim()}</p>
      )}
    </article>
  );
}
