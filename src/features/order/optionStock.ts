type PurchaseStockInput = {
  saleType: 'NORMAL' | 'GROUPBUY';
  availableStock: number | null;
  hasOptionGroups: boolean;
  selectedOptionStockQtys: Array<number | null | undefined>;
};

type OptionStockGroup = {
  required: boolean;
  values: Array<{ stockQty?: number | null }>;
};

function getSelectedOptionStockLimit(
  stockQtys: Array<number | null | undefined>,
) {
  const limits = stockQtys.filter(
    (stockQty): stockQty is number =>
      typeof stockQty === 'number' && Number.isFinite(stockQty),
  );

  return limits.length > 0 ? Math.min(...limits) : undefined;
}

/**
 * 필수 옵션 중 하나라도 선택 가능한 값이 없으면 상품 전체를 품절로 본다.
 * 선택 옵션은 구매자가 고르지 않고 주문할 수 있으므로 전체 품절 판정에서 제외한다.
 */
export function isOptionItemSoldOut(optionGroups: OptionStockGroup[]) {
  return optionGroups
    .filter((group) => group.required)
    .some((group) =>
      group.values.every(
        (value) =>
          typeof value.stockQty === 'number' && value.stockQty <= 0,
      ),
    );
}

/**
 * 옵션을 쓰는 일반 판매 상품은 백엔드에서 옵션값 재고만으로 주문 가능 수량을
 * 검증한다. 상품 공통 재고는 옵션 미사용 상품에만 적용한다.
 */
export function getPurchaseStock({
  saleType,
  availableStock,
  hasOptionGroups,
  selectedOptionStockQtys,
}: PurchaseStockInput) {
  const optionStockLimit = getSelectedOptionStockLimit(selectedOptionStockQtys);
  const usesOptionStock = saleType === 'NORMAL' && hasOptionGroups;

  return {
    optionStockLimit,
    maxQuantity:
      saleType !== 'NORMAL'
        ? undefined
        : usesOptionStock
          ? optionStockLimit
          : availableStock ?? undefined,
    isItemLevelSoldOut:
      saleType === 'NORMAL' &&
      !usesOptionStock &&
      availableStock !== null &&
      availableStock <= 0,
  };
}
