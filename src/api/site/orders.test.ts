import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/client', () => ({
  api: vi.fn(),
  withApiBase: (path: string) => path,
}));

import { api } from '../core/client';
import { ordersApi } from './orders';

describe('ordersApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회 아이디 중복 확인 API를 호출하고 응답을 반환한다', async () => {
    vi.mocked(api).mockResolvedValue({
      lookupId: 'guest-mju-001',
      available: true,
    });

    await expect(
      ordersApi.checkLookupIdAvailability(' guest-mju-001 '),
    ).resolves.toEqual({
      lookupId: 'guest-mju-001',
      available: true,
    });
    expect(api).toHaveBeenCalledWith(
      '/orders/lookup-id/availability?lookupId=guest-mju-001',
    );
  });

  it('조회 아이디와 비밀번호로 기존 주문 조회 API를 호출한다', async () => {
    vi.mocked(api).mockResolvedValue({ orderNo: 'P1-1', items: [] });

    await ordersApi.lookupOrder({
      lookupId: 'guest-mju-001',
      password: 'password123!',
    });

    expect(api).toHaveBeenCalledWith('/orders/lookup', {
      method: 'POST',
      body: {
        lookupId: 'guest-mju-001',
        password: 'password123!',
      },
    });
  });
});
