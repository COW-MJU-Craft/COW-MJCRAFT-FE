import type {
  AdminItemOptionGroupInput,
  AdminItemOptionValueInput,
} from '../../api/admin/items';

export type OptionValueDraft = {
  key: string;
  name: string;
  additionalPrice: string;
  stockQty: string;
};

export type OptionGroupDraft = {
  key: string;
  name: string;
  required: boolean;
  values: OptionValueDraft[];
};

export type OptionSaveApi = {
  createOptionGroup: (
    itemId: string,
    body: AdminItemOptionGroupInput,
  ) => Promise<{ id: number }>;
  createOptionValue: (
    itemId: string,
    groupId: number,
    body: AdminItemOptionValueInput,
  ) => Promise<unknown>;
};

export type OptionSaveResult =
  | { ok: true }
  | { ok: false; message: string };

let draftKeySeed = 0;

function nextKey() {
  draftKeySeed += 1;
  return `option-draft-${draftKeySeed}`;
}

export function createEmptyOptionValueDraft(): OptionValueDraft {
  return { key: nextKey(), name: '', additionalPrice: '0', stockQty: '' };
}

export function createEmptyOptionGroupDraft(): OptionGroupDraft {
  return {
    key: nextKey(),
    name: '',
    required: true,
    values: [createEmptyOptionValueDraft()],
  };
}

function isBlankValue(value: OptionValueDraft) {
  return (
    !value.name.trim() &&
    (value.additionalPrice.trim() === '' || value.additionalPrice === '0') &&
    value.stockQty.trim() === ''
  );
}

/** 이름·값이 모두 비어 있는 그룹/값은 입력하지 않은 것으로 보고 제외한다. */
export function pruneOptionDrafts(groups: OptionGroupDraft[]) {
  return groups
    .map((group) => ({
      ...group,
      values: group.values.filter((value) => !isBlankValue(value)),
    }))
    .filter((group) => group.name.trim() || group.values.length > 0);
}

function parseNonNegativeInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return NaN;
  return Math.trunc(parsed);
}

export function validateOptionDrafts(groups: OptionGroupDraft[]): string | null {
  for (const group of pruneOptionDrafts(groups)) {
    const label = group.name.trim() || '이름 없는 옵션 그룹';
    if (!group.name.trim()) return '옵션 그룹명을 입력해주세요.';
    if (group.values.length === 0) {
      return `"${label}" 그룹에 옵션값을 하나 이상 입력해주세요.`;
    }
    for (const value of group.values) {
      if (!value.name.trim()) {
        return `"${label}" 그룹의 옵션값 이름을 입력해주세요.`;
      }
      const price = parseNonNegativeInt(value.additionalPrice);
      const stock = parseNonNegativeInt(value.stockQty);
      if (Number.isNaN(price) || Number.isNaN(stock)) {
        return `"${label}" 그룹의 추가 금액과 재고는 0 이상의 숫자로 입력해주세요.`;
      }
    }
  }
  return null;
}

export function toOptionValueInput(
  value: OptionValueDraft,
  sortOrder: number,
): AdminItemOptionValueInput {
  return {
    name: value.name.trim(),
    additionalPrice: parseNonNegativeInt(value.additionalPrice) ?? 0,
    stockQty: parseNonNegativeInt(value.stockQty),
    sortOrder,
  };
}

/**
 * 생성된 상품에 옵션 그룹과 옵션값을 순서대로 저장한다.
 * 실패하면 즉시 중단하고 어디서 실패했는지 메시지로 돌려준다(재시도는 옵션 관리 화면에서).
 */
export async function saveOptionDrafts(
  api: OptionSaveApi,
  itemId: string,
  drafts: OptionGroupDraft[],
): Promise<OptionSaveResult> {
  const groups = pruneOptionDrafts(drafts);
  for (const [groupIndex, group] of groups.entries()) {
    const groupName = group.name.trim();
    let groupId: number;
    try {
      const created = await api.createOptionGroup(itemId, {
        name: groupName,
        required: group.required,
        sortOrder: groupIndex,
      });
      groupId = created.id;
    } catch (err) {
      return { ok: false, message: failureMessage(`"${groupName}" 그룹`, err) };
    }

    for (const [valueIndex, value] of group.values.entries()) {
      try {
        await api.createOptionValue(
          itemId,
          groupId,
          toOptionValueInput(value, valueIndex),
        );
      } catch (err) {
        return {
          ok: false,
          message: failureMessage(
            `"${groupName}" 그룹의 "${value.name.trim()}" 옵션값`,
            err,
          ),
        };
      }
    }
  }
  return { ok: true };
}

function failureMessage(target: string, err: unknown) {
  const reason = err instanceof Error && err.message ? ` (${err.message})` : '';
  return `${target} 저장에 실패했어요${reason}`;
}
