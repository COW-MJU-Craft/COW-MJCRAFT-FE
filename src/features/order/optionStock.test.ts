import { describe, expect, it } from 'vitest';
import { getPurchaseStock } from './optionStock';

describe('getPurchaseStock', () => {
  it('옵션 상품은 상품 공통 재고 대신 선택한 옵션 재고로 주문 한도를 정한다', () => {
    expect(
      getPurchaseStock({
        saleType: 'NORMAL',
        availableStock: 0,
        hasOptionGroups: true,
        selectedOptionStockQtys: [12],
      }),
    ).toEqual({
      optionStockLimit: 12,
      maxQuantity: 12,
      isItemLevelSoldOut: false,
    });
  });

  it('여러 옵션을 고르면 가장 적은 옵션 재고를 한도로 사용한다', () => {
    expect(
      getPurchaseStock({
        saleType: 'NORMAL',
        availableStock: 100,
        hasOptionGroups: true,
        selectedOptionStockQtys: [8, 3, null],
      }),
    ).toMatchObject({ optionStockLimit: 3, maxQuantity: 3 });
  });

  it('옵션이 없는 일반 상품은 기존 상품 재고를 사용한다', () => {
    expect(
      getPurchaseStock({
        saleType: 'NORMAL',
        availableStock: 0,
        hasOptionGroups: false,
        selectedOptionStockQtys: [],
      }),
    ).toMatchObject({ maxQuantity: 0, isItemLevelSoldOut: true });
  });
});
