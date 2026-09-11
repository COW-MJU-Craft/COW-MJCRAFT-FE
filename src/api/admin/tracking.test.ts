import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { adminOrdersApi } from './orders';
vi.mock('../core/client', () => ({ api: vi.fn(), withApiBase: (path: string) => path }));
beforeEach(() => vi.resetAllMocks());

it('preserves tracking information in the detail adapter', async () => {
  vi.mocked(api).mockResolvedValue({ fulfillment: { method: 'DELIVERY', trackingInformation: 'CJ 123' } });
  expect((await adminOrdersApi.getById(12)).fulfillment?.trackingInformation).toBe('CJ 123');
});
it('preserves an unregistered tracking state', async () => {
  vi.mocked(api).mockResolvedValue({ fulfillment: { trackingInformation: null } });
  expect((await adminOrdersApi.getById(12)).fulfillment?.trackingInformation).toBeNull();
});
it('sends trimmed information without changing order status', async () => {
  await adminOrdersApi.updateTrackingInformation(4, 12, ' CJ 123 ');
  expect(api).toHaveBeenCalledWith('/admin/projects/4/orders/12/tracking-information', {
    method: 'PUT', body: { trackingInformation: 'CJ 123' },
  });
});
it.each([null, '   ', ''])('deletes with null for %s', async (value) => {
  await adminOrdersApi.updateTrackingInformation(4, 12, value);
  expect(api).toHaveBeenCalledWith(expect.any(String), { method: 'PUT', body: { trackingInformation: null } });
});
it('accepts 500 characters but rejects 501 before sending', async () => {
  await adminOrdersApi.updateTrackingInformation(4, 12, 'a'.repeat(500));
  expect(() => adminOrdersApi.updateTrackingInformation(4, 12, 'a'.repeat(501))).toThrow();
  expect(api).toHaveBeenCalledTimes(1);
});
