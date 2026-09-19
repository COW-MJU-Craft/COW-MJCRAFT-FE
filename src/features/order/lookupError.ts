import { ApiError } from '../../api/core/client';

export type OrderLookupErrorState = {
  title: string;
  description: string;
  fieldRelated: boolean;
  retryable: boolean;
};

export function getOrderLookupErrorState(
  error: unknown,
): OrderLookupErrorState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: '주문 정보를 확인할 수 없어요',
        description:
          '조회 아이디 또는 비밀번호가 일치하지 않아요. 입력한 정보를 다시 확인해주세요.',
        fieldRelated: true,
        retryable: false,
      };
    }

    if (error.status === 400 || error.status === 422) {
      return {
        title: '입력 정보를 확인해주세요',
        description:
          '조회 아이디와 비밀번호 형식이 올바르지 않아요. 입력한 정보를 다시 확인해주세요.',
        fieldRelated: true,
        retryable: false,
      };
    }

    if (error.status === 429) {
      return {
        title: '조회 요청이 너무 많아요',
        description: '잠시 기다린 후 다시 시도해주세요.',
        fieldRelated: false,
        retryable: true,
      };
    }

    if (error.status >= 500) {
      return {
        title: '주문 조회 서비스를 이용할 수 없어요',
        description: '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.',
        fieldRelated: false,
        retryable: true,
      };
    }

    return {
      title: '주문 정보를 불러오지 못했어요',
      description: '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.',
      fieldRelated: false,
      retryable: true,
    };
  }

  return {
    title: '주문 정보를 불러오지 못했어요',
    description: '네트워크 연결을 확인한 후 다시 시도해주세요.',
    fieldRelated: false,
    retryable: true,
  };
}
