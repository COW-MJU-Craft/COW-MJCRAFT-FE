import { describe, expect, it } from 'vitest';
import { validateBuyerStep, validateFinalStep, validateFulfillmentStep } from './validation';
import type { OrderDraft } from './types';

function createDraft(patch: Partial<OrderDraft> = {}): OrderDraft {
  return {
    source: 'cart',
    step: 4,
    items: [],
    agreements: {
      privacy: true,
      noRefund: true,
      cancelRisk: true,
    },
    buyer: {
      buyerType: 'STUDENT',
      campus: 'SEOUL',
      name: '홍길동',
      departmentOrMajor: '컴퓨터공학과',
      studentNo: '60240000',
      phone: '010-1234-5678',
      refundBank: '신한은행',
      refundAccount: '110-123-456789',
      referralSource: '에브리타임',
      email: 'test@example.com',
    },
    lookup: {
      lookupId: 'guest-001',
      password: 'secret',
      passwordConfirm: 'secret',
    },
    payment: {
      depositorName: '홍길동',
    },
    fulfillment: {
      method: 'PICKUP',
      receiverName: '홍길동',
      receiverPhone: '010-1234-5678',
      infoConfirmed: true,
      postalCode: '',
      addressLine1: '',
      addressLine2: '',
      deliveryMemo: '',
    },
    ...patch,
  };
}

describe('order validation', () => {
  it('구매자 정보가 모두 있으면 구매자 단계 검증을 통과한다', () => {
    expect(validateBuyerStep(createDraft())).toBeNull();
  });

  it('학생 주문에서 학번이 비어 있으면 메시지를 반환한다', () => {
    expect(
      validateBuyerStep(
        createDraft({
          buyer: {
            ...createDraft().buyer,
            studentNo: ' ',
          },
        }),
      ),
    ).toBe('학번을 입력해주세요.');
  });

  it('배송 주문에서 기본 주소가 비어 있으면 메시지를 반환한다', () => {
    expect(
      validateFulfillmentStep(
        createDraft({
          fulfillment: {
            ...createDraft().fulfillment,
            method: 'DELIVERY',
            postalCode: '12345',
            addressLine1: '',
          },
        }),
      ),
    ).toBe('기본 주소를 입력해주세요.');
  });

  it('조회 비밀번호와 확인 값이 다르면 메시지를 반환한다', () => {
    expect(
      validateFinalStep(
        createDraft({
          lookup: {
            ...createDraft().lookup,
            passwordConfirm: 'different',
          },
        }),
      ),
    ).toBe('조회 비밀번호와 비밀번호 확인이 일치하지 않아요.');
  });
});
