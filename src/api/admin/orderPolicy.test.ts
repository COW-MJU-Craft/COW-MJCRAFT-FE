import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../core/client';
import { adminOrderPolicyApi, parseShippingFee } from './orderPolicy';

vi.mock('../core/client', () => ({ api: vi.fn(), withApiBase: (path: string) => path }));
beforeEach(() => vi.resetAllMocks());

it.each(['', ' ', '-1', '1.5', '1e3', 'NaN', '3,500', '2147483648'])('rejects invalid input %s', (input) => {
  expect(() => parseShippingFee(input)).toThrow();
});

it('accepts free shipping, integers and the int32 boundary', () => {
  expect(parseShippingFee('0')).toBe(0);
  expect(parseShippingFee(' 3500 ')).toBe(3500);
  expect(parseShippingFee('2147483647')).toBe(2147483647);
});

it('reads the server policy through the shared API client', async () => {
  vi.mocked(api).mockResolvedValue({ id: 1, defaultShippingFee: 3500 });
  await expect(adminOrderPolicyApi.get()).resolves.toEqual({ id: 1, defaultShippingFee: 3500 });
  expect(api).toHaveBeenCalledWith('/admin/orders/policy');
});

it('updates only the default shipping fee', async () => {
  await adminOrderPolicyApi.update(0);
  expect(api).toHaveBeenCalledWith('/admin/orders/policy', { method: 'PUT', body: { defaultShippingFee: 0 } });
});

it('blocks invalid API inputs before a network call', () => {
  expect(() => adminOrderPolicyApi.update(-1)).toThrow();
  expect(() => adminOrderPolicyApi.update(0.5)).toThrow();
  expect(api).not.toHaveBeenCalled();
});
