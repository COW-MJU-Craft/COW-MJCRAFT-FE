export function getNormalSaleStockQty(
  stockQty: number | null | undefined,
): number | null {
  if (
    typeof stockQty !== "number" ||
    !Number.isInteger(stockQty) ||
    stockQty < 0
  ) {
    return null;
  }

  return stockQty;
}
