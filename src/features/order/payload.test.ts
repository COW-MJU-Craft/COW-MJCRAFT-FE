import { describe, expect, it } from 'vitest';
import { buildOrderCreatePayload } from './payload';
import type { OrderDraft } from './types';

function createDraft(patch: Partial<OrderDraft> = {}): OrderDraft {
  return {
    source: 'cart',
    step: 4,
    items: [
      {
        itemId: '10',
        projectId: '1',
        name: '스티커',
        price: 3000,
        thumbnailUrl: null,
        quantity: 2,
      },
    ],
    agreements: {
      privacy: true,
      noRefund: true,
      cancelRisk: true,
    },
    buyer: {
      buyerType: 'STUDENT',
      campus: 'SEOUL',
      name: ' 홍길동 ',
      departmentOrMajor: ' 컴퓨터공학과 ',
      studentNo: ' 60240000 ',
      phone: ' 010-1234-5678 ',
      refundBank: ' 신한은행 ',
      refundAccount: ' 110-123-456789 ',
      referralSource: ' 에브리타임 ',
      email: ' test@example.com ',
    },
    lookup: {
      lookupId: ' guest-001 ',
      password: 'secret',
      passwordConfirm: 'secret',
    },
    payment: {
      depositorName: ' 홍길동 ',
    },
    fulfillment: {
      method: 'PICKUP',
      receiverName: ' 홍길동 ',
      receiverPhone: ' 010-1234-5678 ',
      infoConfirmed: true,
      postalCode: '',
      addressLine1: '',
      addressLine2: '',
      deliveryMemo: '',
    },
    ...patch,
  };
}

describe('buildOrderCreatePayload', () => {
  it('주문 생성 요청에 필요한 값을 trim하고 항목 수량을 합산한다', () => {
    const payload = buildOrderCreatePayload(
      createDraft({
        items: [
          {
            itemId: '10',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            quantity: 2,
          },
          {
            itemId: '10',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            quantity: 3,
          },
        ],
      }),
    );

    expect(payload).toMatchObject({
      lookupId: 'guest-001',
      depositorName: '홍길동',
      items: [{ projectItemId: 10, quantity: 5 }],
      buyer: {
        buyerType: 'STUDENT',
        campus: 'SEOUL',
        name: '홍길동',
        departmentOrMajor: '컴퓨터공학과',
        studentNo: '60240000',
      },
      fulfillment: {
        method: 'PICKUP',
        receiverName: '홍길동',
        receiverPhone: '010-1234-5678',
      },
    });
  });

  it('유효한 숫자 itemId가 없으면 null을 반환한다', () => {
    const payload = buildOrderCreatePayload(
      createDraft({
        items: [
          {
            itemId: 'not-number',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            quantity: 1,
          },
        ],
      }),
    );

    expect(payload).toBeNull();
  });

  it('외부인 주문에는 campus, departmentOrMajor, studentNo를 포함하지 않는다', () => {
    const payload = buildOrderCreatePayload(
      createDraft({
        buyer: {
          ...createDraft().buyer,
          buyerType: 'EXTERNAL',
        },
      }),
    );

    expect(payload?.buyer).not.toHaveProperty('campus');
    expect(payload?.buyer).not.toHaveProperty('departmentOrMajor');
    expect(payload?.buyer).not.toHaveProperty('studentNo');
  });

  it('배송 주문에는 주소 정보를 포함한다', () => {
    const payload = buildOrderCreatePayload(
      createDraft({
        fulfillment: {
          ...createDraft().fulfillment,
          method: 'DELIVERY',
          postalCode: ' 12345 ',
          addressLine1: ' 서울시 중구 ',
          addressLine2: ' 101호 ',
          deliveryMemo: ' 문 앞 ',
        },
      }),
    );

    expect(payload?.fulfillment).toMatchObject({
      method: 'DELIVERY',
      postalCode: '12345',
      addressLine1: '서울시 중구',
      addressLine2: '101호',
      deliveryMemo: '문 앞',
    });
  });
});
