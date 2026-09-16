import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { adminOrdersApi } from './orders';

vi.mock('../core/client', () => ({
  api: vi.fn(),
  withApiBase: (path: string) => path,
}));

describe('adminOrdersApi.updateBuyerEmail', () => {
  beforeEach(() => vi.resetAllMocks());

  it('sends a trimmed email to the dedicated buyer correction endpoint', async () => {
    vi.mocked(api).mockResolvedValue(undefined);

    await expect(
      adminOrdersApi.updateBuyerEmail(12, ' customer@mju.ac.kr '),
    ).resolves.toBe('customer@mju.ac.kr');

    expect(api).toHaveBeenCalledWith('/admin/orders/12/buyer-email', {
      method: 'PATCH',
      body: { email: 'customer@mju.ac.kr' },
    });
  });

  it('rejects a blank email before making a request', async () => {
    await expect(adminOrdersApi.updateBuyerEmail(12, '  ')).rejects.toThrow(
      '주문자 이메일을 입력해주세요.',
    );
    expect(api).not.toHaveBeenCalled();
  });
});
