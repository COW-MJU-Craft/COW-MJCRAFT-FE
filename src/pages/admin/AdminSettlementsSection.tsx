import type { Dispatch, SetStateAction } from 'react';
import Reveal from '../../components/Reveal';
import { ACCOUNTING_CATEGORIES } from '../../constants/accounting';
import {
  createSettlementReport,
  saveAdminSettlements,
} from '../../utils/adminSettlements';
import type { SettlementReport, MoneyItem } from '../../types/settlements';

const TERM_OPTIONS = ['2025-1', '2025-2', '2026-1'];
const DIRECT_INPUT = 'custom';

type Props = {
  settlements: SettlementReport[];
  setSettlements: Dispatch<SetStateAction<SettlementReport[]>>;
  settlementsDirty: boolean;
  setSettlementsDirty: Dispatch<SetStateAction<boolean>>;
  projectOptionsByTerm: Record<string, string[]>;
};

function getSelectValue(options: string[], value: string) {
  if (options.includes(value)) return value;
  return value ? DIRECT_INPUT : '';
}

function getSubjectOptions(categoryTitle: string) {
  const found = ACCOUNTING_CATEGORIES.find(
    (category) => category.title === categoryTitle
  );
  return found ? found.subjects : ['직접 입력'];
}

function getMoneyNumbers(item: MoneyItem) {
  const unitPrice = item.unitPrice ?? item.amount ?? 0;
  const quantity = item.quantity ?? 1;
  const total = unitPrice * quantity;
  return { unitPrice, quantity, total };
}

function formatMoney(value: number) {
  return value.toLocaleString();
}

export default function AdminSettlementsSection({
  settlements,
  setSettlements,
  settlementsDirty,
  setSettlementsDirty,
  projectOptionsByTerm,
}: Props) {
  const updateSettlements = (next: SettlementReport[]) => {
    setSettlements(next);
    setSettlementsDirty(true);
  };

  const updateSettlement = (id: string, patch: Partial<SettlementReport>) => {
    updateSettlements(
      settlements.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const getProjectsForTerm = (term: string) => projectOptionsByTerm[term] ?? [];

  const mergeMoneyItem = (item: MoneyItem, patch: Partial<MoneyItem>) => {
    const next: MoneyItem = { ...item, ...patch };
    if (next.unitPrice === undefined && next.quantity === undefined) return next;
    const unitPrice = next.unitPrice ?? item.unitPrice ?? item.amount ?? 0;
    const quantity = next.quantity ?? item.quantity ?? 1;
    return { ...next, unitPrice, quantity, amount: unitPrice * quantity };
  };

  const updateSaleItem = (
    reportId: string,
    index: number,
    patch: Partial<MoneyItem>
  ) => {
    updateSettlements(
      settlements.map((report) => {
        if (report.id !== reportId) return report;
        const sales = report.sales.map((item, idx) =>
          idx === index ? mergeMoneyItem(item, patch) : item
        );
        return { ...report, sales };
      })
    );
  };

  const updateExpenseGroup = (
    reportId: string,
    index: number,
    patch: { title?: string }
  ) => {
    updateSettlements(
      settlements.map((report) => {
        if (report.id !== reportId) return report;
        const expenseGroups = report.expenseGroups.map((group, idx) =>
          idx === index ? { ...group, ...patch } : group
        );
        return { ...report, expenseGroups };
      })
    );
  };

  const updateExpenseItem = (
    reportId: string,
    groupIndex: number,
    itemIndex: number,
    patch: Partial<MoneyItem>
  ) => {
    updateSettlements(
      settlements.map((report) => {
        if (report.id !== reportId) return report;
        const expenseGroups = report.expenseGroups.map((group, idx) => {
          if (idx !== groupIndex) return group;
          const items = group.items.map((item, i) =>
            i === itemIndex ? mergeMoneyItem(item, patch) : item
          );
          return { ...group, items };
        });
        return { ...report, expenseGroups };
      })
    );
  };

  const categoryTitles = ACCOUNTING_CATEGORIES.map((category) => category.title);

  return (
    <Reveal id="settlements" delayMs={240} className="mt-10 rounded-3xl bg-white p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl text-slate-900">정산 정보</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateSettlements([...settlements, createSettlementReport()])}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            정산 추가
          </button>
          <button
            type="button"
            onClick={() => {
              saveAdminSettlements(settlements);
              setSettlementsDirty(false);
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {settlementsDirty ? '정산 저장' : '저장됨'}
          </button>
        </div>
      </div>

      {settlements.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          등록된 정산 내역이 없어요. 새로 추가해 주세요.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {settlements.map((report) => {
            const projectOptions = getProjectsForTerm(report.term);
            const termSelectValue = getSelectValue(TERM_OPTIONS, report.term);
            const projectSelectValue = getSelectValue(
              projectOptions,
              report.projectTitle
            );

            return (
              <div
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-700">
                    연도-학기별 정산
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettlements(
                        settlements.filter((item) => item.id !== report.id)
                      )
                    }
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600">연도-학기</div>
                    <select
                      value={termSelectValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        updateSettlement(report.id, {
                          term: next === DIRECT_INPUT ? '' : next,
                        });
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <option value="">선택</option>
                      {TERM_OPTIONS.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                      <option value={DIRECT_INPUT}>직접 입력</option>
                    </select>
                    {termSelectValue === DIRECT_INPUT && (
                      <input
                        value={report.term}
                        onChange={(e) =>
                          updateSettlement(report.id, { term: e.target.value })
                        }
                        placeholder="연도-학기 직접 입력"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-600">프로젝트</div>
                    <select
                      value={projectSelectValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        updateSettlement(report.id, {
                          projectTitle: next === DIRECT_INPUT ? '' : next,
                        });
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <option value="">선택</option>
                      {projectOptions.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                      <option value={DIRECT_INPUT}>직접 입력</option>
                    </select>
                    {projectSelectValue === DIRECT_INPUT && (
                      <input
                        value={report.projectTitle}
                        onChange={(e) =>
                          updateSettlement(report.id, {
                            projectTitle: e.target.value,
                          })
                        }
                        placeholder="프로젝트명 직접 입력"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                      />
                    )}
                  </div>
                </div>

                <textarea
                  value={report.footerNote ?? ''}
                  onChange={(e) =>
                    updateSettlement(report.id, { footerNote: e.target.value })
                  }
                  rows={2}
                  placeholder="정산 하단 문구"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                />

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-700">매출 항목</div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettlement(report.id, {
                          sales: [
                            ...report.sales,
                            { label: '', amount: 0, unitPrice: 0, quantity: 1 },
                          ],
                        })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      항목 추가
                    </button>
                  </div>

                  {report.sales.length === 0 ? (
                    <div className="mt-2 text-sm text-slate-500">
                      매출 내역이 없습니다.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {report.sales.map((item, index) => {
                        const { unitPrice, quantity, total } =
                          getMoneyNumbers(item);
                        const saleSelectValue = getSelectValue(
                          projectOptions,
                          item.label
                        );

                        return (
                          <div
                            key={`${report.id}-sale-${index}`}
                            className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_160px_140px_auto]"
                          >
                            <div className="space-y-2">
                              <select
                                value={saleSelectValue}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  updateSaleItem(report.id, index, {
                                    label: next === DIRECT_INPUT ? '' : next,
                                  });
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                              >
                                <option value="">선택</option>
                                {projectOptions.map((title) => (
                                  <option key={title} value={title}>
                                    {title}
                                  </option>
                                ))}
                                <option value={DIRECT_INPUT}>직접 입력</option>
                              </select>
                              {saleSelectValue === DIRECT_INPUT && (
                                <input
                                  value={item.label}
                                  onChange={(e) =>
                                    updateSaleItem(report.id, index, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="매출 항목 직접 입력"
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                                />
                              )}
                            </div>
                            <input
                              type="number"
                              value={unitPrice}
                              onChange={(e) =>
                                updateSaleItem(report.id, index, {
                                  unitPrice: Number(e.target.value || 0),
                                })
                              }
                              placeholder="개당 가격"
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleItem(report.id, index, {
                                    quantity: Math.max(1, quantity - 1),
                                  })
                                }
                                className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-bold text-slate-600"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={quantity}
                                onChange={(e) =>
                                  updateSaleItem(report.id, index, {
                                    quantity: Math.max(
                                      1,
                                      Number(e.target.value || 1)
                                    ),
                                  })
                                }
                                className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateSaleItem(report.id, index, {
                                    quantity: quantity + 1,
                                  })
                                }
                                className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-bold text-slate-600"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-sm font-bold text-blue-600">
                              {formatMoney(total)}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateSettlement(report.id, {
                                  sales: report.sales.filter(
                                    (_, idx) => idx !== index
                                  ),
                                })
                              }
                              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                            >
                              삭제
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-700">지출 그룹</div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettlement(report.id, {
                          expenseGroups: [
                            ...report.expenseGroups,
                            { title: '', items: [] },
                          ],
                        })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      그룹 추가
                    </button>
                  </div>

                  {report.expenseGroups.length === 0 ? (
                    <div className="mt-2 text-sm text-slate-500">
                      지출 그룹이 없습니다.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-4">
                      {report.expenseGroups.map((group, groupIndex) => {
                        const categorySelectValue = getSelectValue(
                          categoryTitles,
                          group.title
                        );

                        return (
                          <div
                            key={`${report.id}-group-${groupIndex}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start gap-2">
                              <div className="flex-1 space-y-2">
                                <div className="text-xs font-bold text-slate-600">
                                  회계 과목
                                </div>
                                <select
                                  value={categorySelectValue}
                                  onChange={(e) => {
                                    const next = e.target.value;
                                    updateExpenseGroup(report.id, groupIndex, {
                                      title: next === DIRECT_INPUT ? '' : next,
                                    });
                                  }}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                                >
                                  <option value="">선택</option>
                                  {categoryTitles.map((title) => (
                                    <option key={title} value={title}>
                                      {title}
                                    </option>
                                  ))}
                                  <option value={DIRECT_INPUT}>직접 입력</option>
                                </select>
                                {categorySelectValue === DIRECT_INPUT && (
                                  <input
                                    value={group.title}
                                    onChange={(e) =>
                                      updateExpenseGroup(report.id, groupIndex, {
                                        title: e.target.value,
                                      })
                                    }
                                    placeholder="회계 과목 직접 입력"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSettlement(report.id, {
                                    expenseGroups: report.expenseGroups.filter(
                                      (_, idx) => idx !== groupIndex
                                    ),
                                  })
                                }
                                className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                              >
                                그룹 삭제
                              </button>
                            </div>

                            <div className="mt-3 space-y-3">
                              {group.items.length === 0 ? (
                                <div className="text-sm text-slate-500">
                                  지출 내역이 없습니다.
                                </div>
                              ) : (
                                group.items.map((item, itemIndex) => {
                                  const { unitPrice, quantity, total } =
                                    getMoneyNumbers(item);
                                  const subjectOptions = getSubjectOptions(
                                    group.title
                                  );
                                  const subjectSelectValue = getSelectValue(
                                    subjectOptions,
                                    item.label
                                  );

                                  return (
                                    <div
                                      key={`${report.id}-group-${groupIndex}-item-${itemIndex}`}
                                      className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_160px_140px_auto]"
                                    >
                                      <div className="space-y-2">
                                        <select
                                          value={subjectSelectValue}
                                          onChange={(e) => {
                                            const next = e.target.value;
                                            updateExpenseItem(
                                              report.id,
                                              groupIndex,
                                              itemIndex,
                                              {
                                                label:
                                                  next === DIRECT_INPUT
                                                    ? ''
                                                    : next,
                                              }
                                            );
                                          }}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                                        >
                                          <option value="">선택</option>
                                          {subjectOptions.map((subject) => (
                                            <option key={subject} value={subject}>
                                              {subject}
                                            </option>
                                          ))}
                                          <option value={DIRECT_INPUT}>직접 입력</option>
                                        </select>
                                        {subjectSelectValue === DIRECT_INPUT && (
                                          <input
                                            value={item.label}
                                            onChange={(e) =>
                                              updateExpenseItem(
                                                report.id,
                                                groupIndex,
                                                itemIndex,
                                                { label: e.target.value }
                                              )
                                            }
                                            placeholder="과목명 직접 입력"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
                                          />
                                        )}
                                      </div>
                                      <input
                                        type="number"
                                        value={unitPrice}
                                        onChange={(e) =>
                                          updateExpenseItem(
                                            report.id,
                                            groupIndex,
                                            itemIndex,
                                            { unitPrice: Number(e.target.value || 0) }
                                          )
                                        }
                                        placeholder="개당 가격"
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/60"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateExpenseItem(
                                              report.id,
                                              groupIndex,
                                              itemIndex,
                                              { quantity: Math.max(1, quantity - 1) }
                                            )
                                          }
                                          className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-bold text-slate-600"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          value={quantity}
                                          onChange={(e) =>
                                            updateExpenseItem(
                                              report.id,
                                              groupIndex,
                                              itemIndex,
                                              {
                                                quantity: Math.max(
                                                  1,
                                                  Number(e.target.value || 1)
                                                ),
                                              }
                                            )
                                          }
                                          className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateExpenseItem(
                                              report.id,
                                              groupIndex,
                                              itemIndex,
                                              { quantity: quantity + 1 }
                                            )
                                          }
                                          className="h-9 w-9 rounded-lg border border-slate-200 text-sm font-bold text-slate-600"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <div className="text-sm font-bold text-rose-600">
                                        {formatMoney(total)}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const items = group.items.filter(
                                            (_, idx) => idx !== itemIndex
                                          );
                                          updateSettlements(
                                            settlements.map((entry) => {
                                              if (entry.id !== report.id)
                                                return entry;
                                              const expenseGroups =
                                                entry.expenseGroups.map(
                                                  (g, gIdx) =>
                                                    gIdx === groupIndex
                                                      ? { ...g, items }
                                                      : g
                                                );
                                              return { ...entry, expenseGroups };
                                            })
                                          );
                                        }}
                                        className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const items = [
                                  ...group.items,
                                  { label: '', amount: 0, unitPrice: 0, quantity: 1 },
                                ];
                                updateSettlements(
                                  settlements.map((entry) => {
                                    if (entry.id !== report.id) return entry;
                                    const expenseGroups =
                                      entry.expenseGroups.map((g, gIdx) =>
                                        gIdx === groupIndex
                                          ? { ...g, items }
                                          : g
                                      );
                                    return { ...entry, expenseGroups };
                                  })
                                );
                              }}
                              className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              지출 항목 추가
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Reveal>
  );
}
