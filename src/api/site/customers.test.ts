import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { customersApi } from './customers';

vi.mock('../core/client', () => ({
  api: vi.fn(),
  withApiBase: (path: string) => path,
}));

describe('customersApi', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends credentials in the request body when loading customer orders', async () => {
    vi.mocked(api).mockResolvedValue([]);

    await customersApi.getOrders({
      email: 'craft@mju.ac.kr',
      password: 'password',
    });

    expect(api).toHaveBeenCalledWith('/customers/orders', {
      method: 'POST',
      body: { email: 'craft@mju.ac.kr', password: 'password' },
    });
  });

  it('uses the order-specific customer endpoint for detail lookup', async () => {
    vi.mocked(api).mockResolvedValue({
      orderId: 12,
      orderNo: 'P1-1',
      items: [],
    });

    const result = await customersApi.getOrderDetail(12, {
      email: 'craft@mju.ac.kr',
      password: 'password',
    });

    expect(api).toHaveBeenCalledWith('/customers/orders/12', {
      method: 'POST',
      body: { email: 'craft@mju.ac.kr', password: 'password' },
    });
    expect(result.orderNo).toBe('P1-1');
  });

  it('requests an email code and enrolls with the verified code', async () => {
    vi.mocked(api).mockResolvedValue(undefined);

    await customersApi.sendEmailCode('craft@mju.ac.kr');
    await customersApi.enroll({
      email: 'craft@mju.ac.kr',
      code: '123456',
      password: 'new-password',
    });

    expect(api).toHaveBeenNthCalledWith(1, '/customers/email-code', {
      method: 'POST',
      body: { email: 'craft@mju.ac.kr' },
    });
    expect(api).toHaveBeenNthCalledWith(2, '/customers/enroll', {
      method: 'POST',
      body: {
        email: 'craft@mju.ac.kr',
        code: '123456',
        password: 'new-password',
      },
    });
  });
});
