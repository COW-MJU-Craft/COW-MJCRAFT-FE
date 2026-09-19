import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { customersApi } from './customers';

vi.mock('../core/client', () => ({
  api: vi.fn(),
  withApiBase: (path: string) => path,
}));

describe('customersApi', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requests an email code with only the email', async () => {
    await customersApi.sendEmailCode('craft@mju.ac.kr');
    expect(api).toHaveBeenCalledWith('/customers/email-code', {
      method: 'POST',
      body: { email: 'craft@mju.ac.kr' },
    });
  });

  it('enrolls with email, code and password', async () => {
    await customersApi.enroll({
      email: 'craft@mju.ac.kr',
      code: '481902',
      password: 'Pa$$w0rd!',
    });
    expect(api).toHaveBeenCalledWith('/customers/enroll', {
      method: 'POST',
      body: { email: 'craft@mju.ac.kr', code: '481902', password: 'Pa$$w0rd!' },
    });
  });
});
