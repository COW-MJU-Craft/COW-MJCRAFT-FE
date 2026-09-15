type PurchaseStockInput = {
  saleType: 'NORMAL' | 'GROUPBUY';
  availableStock: number | null;
  hasOptionGroups: boolean;
  selectedOptionStockQtys: Array<number | null | undefined>;
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
