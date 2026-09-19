import { api, withApiBase } from '../core/client';

export type CustomerCredentials = {
  email: string;
  password: string;
};

export type CustomerEnrollRequest = CustomerCredentials & {
  code: string;
};

export const customersApi = {
  sendEmailCode(email: string) {
    return api<void>(withApiBase('/customers/email-code'), {
      method: 'POST',
      body: { email },
    });
  },

  /** 코드로 이메일 소유를 증명하고 비밀번호를 저장한다. 기존 고객이면 비밀번호가 재설정된다. */
  enroll(payload: CustomerEnrollRequest) {
    return api<unknown>(withApiBase('/customers/enroll'), {
      method: 'POST',
      body: payload,
    });
  },

  /** 이미 등록한 고객의 이메일·비밀번호 확인. 성공(200)이면 자격증명이 일치한다. */
  verifyCredentials(payload: CustomerCredentials) {
    return api<unknown>(withApiBase('/customers/prefill'), {
      method: 'POST',
      body: payload,
    });
  },
};
