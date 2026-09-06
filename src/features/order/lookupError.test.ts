import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/core/client';
import { getOrderLookupErrorState } from './lookupError';

describe('getOrderLookupErrorState', () => {
  it('인증 정보가 일치하지 않으면 입력값 확인 상태를 반환한다', () => {
    expect(getOrderLookupErrorState(new ApiError(401, null))).toMatchObject({
      title: '주문 정보를 확인할 수 없어요',
      fieldRelated: true,
      retryable: false,
    });
  });

  it.each([400, 422])(
    '요청값 검증 오류 %i를 입력 오류로 처리한다',
    (status) => {
      expect(
        getOrderLookupErrorState(new ApiError(status, null)),
      ).toMatchObject({
        title: '입력 정보를 확인해주세요',
        fieldRelated: true,
        retryable: false,
      });
    },
  );

  it.each([429, 500, 503])(
    '%i 응답은 다시 시도할 수 있는 상태로 처리한다',
    (status) => {
      expect(
        getOrderLookupErrorState(new ApiError(status, null)).retryable,
      ).toBe(true);
    },
  );

  it('네트워크 오류는 다시 시도할 수 있는 상태로 처리한다', () => {
    expect(
      getOrderLookupErrorState(new TypeError('Failed to fetch')),
    ).toMatchObject({
      title: '주문 정보를 불러오지 못했어요',
      fieldRelated: false,
      retryable: true,
    });
  });
});
