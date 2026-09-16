import { describe, expect, it } from 'vitest';
import { buildOrderCreatePayload } from './payload';
import type { OrderDraft } from './types';

function createDraft(patch: Partial<OrderDraft> = {}): OrderDraft {
  return {
    source: 'cart',
    step: 4,
    items: [
      {
        cartItemId: '10',
        itemId: '10',
        projectId: '1',
        name: '스티커',
        price: 3000,
        thumbnailUrl: null,
        selectedOptions: [],
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
            cartItemId: '10',
            itemId: '10',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            selectedOptions: [],
            quantity: 2,
          },
          {
            cartItemId: '10',
            itemId: '10',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            selectedOptions: [],
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
            cartItemId: 'not-number',
            itemId: 'not-number',
            projectId: '1',
            name: '스티커',
            price: 3000,
            thumbnailUrl: null,
            selectedOptions: [],
            quantity: 1,
          },
        ],
      }),
    );

    expect(payload).toBeNull();
  });

  it('같은 상품이라도 선택 옵션 조합이 다르면 주문 항목을 분리한다', () => {
    const payload = buildOrderCreatePayload(
      createDraft({
        items: [
          {
            cartItemId: '10::101',
            itemId: '10',
            projectId: '1',
            name: '티셔츠',
            price: 10_000,
            thumbnailUrl: null,
            selectedOptions: [
              {
                groupId: '1',
                groupName: '색상',
                valueId: '101',
                valueName: '네이비',
                additionalPrice: 0,
              },
            ],
            quantity: 2,
          },
          {
            cartItemId: '10::102',
            itemId: '10',
            projectId: '1',
            name: '티셔츠',
            price: 11_000,
            thumbnailUrl: null,
            selectedOptions: [
              {
                groupId: '1',
                groupName: '색상',
                valueId: '102',
                valueName: '화이트',
                additionalPrice: 1_000,
              },
            ],
            quantity: 1,
          },
        ],
      }),
    );

    expect(payload?.items).toEqual([
      { projectItemId: 10, quantity: 2, optionValueIds: [101] },
      { projectItemId: 10, quantity: 1, optionValueIds: [102] },
    ]);
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
