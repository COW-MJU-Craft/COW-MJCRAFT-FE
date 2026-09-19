import {
  createEmptyOptionGroupDraft,
  createEmptyOptionValueDraft,
  type OptionGroupDraft,
  type OptionValueDraft,
} from '../../utils/admin/itemOptionDraft';

type Props = {
  groups: OptionGroupDraft[];
  onChange: (groups: OptionGroupDraft[]) => void;
  disabled?: boolean;
};

const CELL_INPUT =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-primary/60 disabled:opacity-60';

export default function ItemOptionDraftEditor({
  groups,
  onChange,
  disabled = false,
}: Props) {
  const updateGroup = (key: string, patch: Partial<OptionGroupDraft>) =>
    onChange(
      groups.map((group) => (group.key === key ? { ...group, ...patch } : group)),
    );

  const updateValue = (
    groupKey: string,
    valueKey: string,
    patch: Partial<OptionValueDraft>,
  ) =>
    onChange(
      groups.map((group) =>
        group.key !== groupKey
          ? group
          : {
              ...group,
              values: group.values.map((value) =>
                value.key === valueKey ? { ...value, ...patch } : value,
              ),
            },
      ),
    );

  return (
    <div className="mt-4 space-y-4">
      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
          옵션이 필요 없는 상품은 그대로 저장하세요.
        </p>
      )}

      {groups.map((group) => (
        <div
          key={group.key}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[180px] flex-1">
              <span className="text-xs font-semibold text-slate-600">
                옵션 그룹명
              </span>
              <input
                type="text"
                value={group.name}
                disabled={disabled}
                onChange={(event) =>
                  updateGroup(group.key, { name: event.target.value })
                }
                placeholder="예: 색상, 사이즈"
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={group.required}
                disabled={disabled}
                onChange={(event) =>
                  updateGroup(group.key, { required: event.target.checked })
                }
                className="h-4 w-4 accent-primary"
              />
              필수 선택
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(groups.filter((item) => item.key !== group.key))
              }
              className="h-10 rounded-xl border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              그룹 삭제
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">옵션값</th>
                  <th className="px-3 py-2.5">추가 금액</th>
                  <th className="px-3 py-2.5">옵션 재고</th>
                  <th className="w-20 px-3 py-2.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {group.values.map((value) => (
                  <tr key={value.key} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={value.name}
                        disabled={disabled}
                        onChange={(event) =>
                          updateValue(group.key, value.key, {
                            name: event.target.value,
                          })
                        }
                        placeholder="예: 블랙, M"
                        className={CELL_INPUT}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={value.additionalPrice}
                        disabled={disabled}
                        onChange={(event) =>
                          updateValue(group.key, value.key, {
                            additionalPrice: event.target.value,
                          })
                        }
                        className={`${CELL_INPUT} w-28`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={value.stockQty}
                        disabled={disabled}
                        onChange={(event) =>
                          updateValue(group.key, value.key, {
                            stockQty: event.target.value,
                          })
                        }
                        placeholder="무제한"
                        className={`${CELL_INPUT} w-28`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={disabled || group.values.length <= 1}
                        onClick={() =>
                          updateGroup(group.key, {
                            values: group.values.filter(
                              (item) => item.key !== value.key,
                            ),
                          })
                        }
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              updateGroup(group.key, {
                values: [...group.values, createEmptyOptionValueDraft()],
              })
            }
            className="mt-3 h-10 rounded-xl bg-slate-800 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            옵션값 추가
          </button>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...groups, createEmptyOptionGroupDraft()])}
        className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        옵션 그룹 추가
      </button>
    </div>
  );
}
