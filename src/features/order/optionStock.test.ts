import { describe, expect, it } from 'vitest';
import { getPurchaseStock, isOptionItemSoldOut } from './optionStock';

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

describe('isOptionItemSoldOut', () => {
  it('필수 옵션에 구매 가능한 값이 하나라도 있으면 전체 품절이 아니다', () => {
    expect(
      isOptionItemSoldOut([
        {
          required: true,
          values: [{ stockQty: 0 }, { stockQty: 3 }],
        },
      ]),
    ).toBe(false);
  });

  it('필수 옵션의 모든 값이 품절이면 상품 전체를 품절로 본다', () => {
    expect(
      isOptionItemSoldOut([
        {
          required: true,
          values: [{ stockQty: 0 }, { stockQty: 0 }],
        },
      ]),
    ).toBe(true);
  });

  it('필수 옵션값이 하나도 없으면 상품 전체를 품절로 본다', () => {
    expect(
      isOptionItemSoldOut([
        {
          required: true,
          values: [],
        },
      ]),
    ).toBe(true);
  });

  it('재고를 비워 둔 값은 무제한 재고로 취급한다', () => {
    expect(
      isOptionItemSoldOut([
        {
          required: true,
          values: [{ stockQty: 0 }, { stockQty: null }],
        },
      ]),
    ).toBe(false);
  });

  it('선택 옵션은 모든 값이 품절이어도 상품 전체 구매를 막지 않는다', () => {
    expect(
      isOptionItemSoldOut([
        {
          required: false,
          values: [{ stockQty: 0 }],
        },
      ]),
    ).toBe(false);
  });
});
