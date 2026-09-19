import { api, withApiBase } from '../core/client';

export type CustomerEnrollRequest = {
  email: string;
  code: string;
  password: string;
};

export const customersApi = {
  sendEmailCode(email: string) {
    return api<void>(withApiBase('/customers/email-code'), {
      method: 'POST',
      body: { email },
    });
  },

  /**
   * 코드로 이메일 소유를 증명한다. 서버가 password를 필수로 받으므로 호출부에서
   * 임의 비밀번호를 만들어 넘기고 즉시 폐기한다(기존 고객이면 비밀번호가 재설정된다).
   */
  enroll(payload: CustomerEnrollRequest) {
    return api<unknown>(withApiBase('/customers/enroll'), {
      method: 'POST',
      body: payload,
    });
  },
};
