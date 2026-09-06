import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, withApiBase } from '../core/client';
import { adminOrdersApi } from './orders';
import { adminProjectsApi } from './projects';

vi.mock('../core/client', () => ({ api: vi.fn(), withApiBase: (path: string) => path }));

describe('project order queries', () => {
  it('advances a single order without a target status or body', async () => {
    vi.mocked(api).mockResolvedValue({ orderId: 12, status: 'PAID' });
    await adminOrdersApi.advanceStatus(4, 12);
    expect(api).toHaveBeenCalledWith('/admin/projects/4/orders/12/advance-status', { method: 'POST' });
  });

  it('sends only order IDs for a bulk transition and propagates conflicts', async () => {
    const conflict = new Error('conflict');
    vi.mocked(api).mockRejectedValue(conflict);
    await expect(adminOrdersApi.advanceStatuses(4, [12, 13])).rejects.toBe(conflict);
    expect(api).toHaveBeenCalledWith('/admin/projects/4/orders/advance-status', { method: 'POST', body: { orderIds: [12, 13] } });
  });
  beforeEach(() => vi.resetAllMocks());

  it('keeps the existing unfiltered project request and supports OPEN', async () => {
    vi.mocked(api).mockResolvedValue([]);
    await adminProjectsApi.list();
    expect(api).toHaveBeenLastCalledWith(withApiBase('/admin/projects'));
    await adminProjectsApi.list('OPEN');
    expect(api).toHaveBeenLastCalledWith(withApiBase('/admin/projects?status=OPEN'));
  });

  it('loads only the requested project and new order status', async () => {
    vi.mocked(api).mockResolvedValue([{ orderId: 12, status: 'IN_PRODUCTION', finalAmount: 38500 }]);
    const orders = await adminOrdersApi.listByProject(4, 'IN_PRODUCTION');
    expect(api).toHaveBeenCalledWith('/admin/projects/4/orders?status=IN_PRODUCTION');
    expect(orders[0]).toMatchObject({ orderId: 12, status: 'IN_PRODUCTION', finalAmount: 38500 });
  });

  it('does not silently turn invalid responses into an empty list', async () => {
    vi.mocked(api).mockResolvedValue({ unexpected: true });
    await expect(adminOrdersApi.listByProject(4)).rejects.toThrow();
  });

  it('requests project statistics independently from list filters', async () => {
    vi.mocked(api).mockResolvedValue({ orderCount: 2, totalOrderAmount: 35000 });
    await expect(adminOrdersApi.statistics(4)).resolves.toEqual({ orderCount: 2, totalOrderAmount: 35000 });
    expect(api).toHaveBeenCalledWith('/admin/projects/4/orders/statistics');
  });
});
