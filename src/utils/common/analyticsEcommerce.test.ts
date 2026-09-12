import { describe, expect, it } from 'vitest';
import {
  getGA4EcommerceValue,
  toGA4EcommerceItem,
  toGA4ItemsFromQuote,
} from './analyticsEcommerce';

describe('toGA4EcommerceItem', () => {
  it('GA4 권장 items 형식으로 상품을 정규화한다', () => {
    expect(
      toGA4EcommerceItem({
        itemId: 12,
        itemName: '명지 키링',
        price: 3000,
        projectId: 4,
        quantity: 2,
      }),
    ).toEqual({
      item_id: '12',
      item_name: '명지 키링',
      price: 3000,
      project_id: '4',
      quantity: 2,
    });
  });

  it('유효하지 않은 가격과 수량을 안전한 값으로 보정한다', () => {
    expect(
      toGA4EcommerceItem({
        itemId: '12',
        itemName: '명지 키링',
        price: Number.NaN,
        quantity: 0,
      }),
    ).toMatchObject({ price: 0, quantity: 1 });
  });
});

describe('toGA4ItemsFromQuote', () => {
  it('서버 quote의 단가와 수량으로 주문 제출 상품을 만든다', () => {
    const items = toGA4ItemsFromQuote({
      items: [
        {
          projectItemId: 12,
          projectId: 4,
          itemName: '명지 키링',
          quantity: 2,
          unitPrice: 3000,
          lineAmount: 6000,
        },
      ],
      totalAmount: 6000,
      shippingFee: 3500,
      finalAmount: 9500,
    });

    expect(items).toHaveLength(1);
    expect(getGA4EcommerceValue(items)).toBe(6000);
  });
});
