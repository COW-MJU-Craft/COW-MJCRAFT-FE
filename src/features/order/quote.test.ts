import { describe, expect, it } from 'vitest';
import type { OrderQuoteResponse } from '../../api/site/orders';
import { isSameOrderQuote } from './quote';

const quote: OrderQuoteResponse = {
  items: [
    {
      projectItemId: 1,
      projectId: 10,
      itemName: '키링',
      quantity: 2,
      unitPrice: 3_000,
      lineAmount: 6_000,
    },
  ],
  totalAmount: 6_000,
  shippingFee: 3_500,
  finalAmount: 9_500,
};

describe('isSameOrderQuote', () => {
  it('금액과 품목 스냅샷이 같으면 true를 반환한다', () => {
    expect(isSameOrderQuote(quote, structuredClone(quote))).toBe(true);
  });

  it('서버 가격이 바뀌면 false를 반환한다', () => {
    const changed = structuredClone(quote);
    changed.items[0].unitPrice = 4_000;
    changed.items[0].lineAmount = 8_000;
    changed.totalAmount = 8_000;
    changed.finalAmount = 11_500;

    expect(isSameOrderQuote(quote, changed)).toBe(false);
  });

  it('이전 견적이 없으면 확인을 요구한다', () => {
    expect(isSameOrderQuote(null, quote)).toBe(false);
  });
});
