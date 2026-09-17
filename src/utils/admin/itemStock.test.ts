import { describe, expect, it } from "vitest";
import { getNormalSaleStockQty } from "./itemStock";

describe("getNormalSaleStockQty", () => {
  it.each([0, 1, 37])(
    "일반 판매 재고 %i는 저장 payload에 유지한다",
    (stockQty) => {
      expect(getNormalSaleStockQty(stockQty)).toBe(stockQty);
    },
  );

  it.each([undefined, null, -1, 1.5, Number.NaN])(
    "유효하지 않은 재고는 null을 반환한다",
    (stockQty) => {
      expect(getNormalSaleStockQty(stockQty)).toBeNull();
    },
  );
});
