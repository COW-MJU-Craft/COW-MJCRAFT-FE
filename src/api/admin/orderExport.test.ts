import { describe, expect, it, vi } from 'vitest';

const { download } = vi.hoisted(() => ({ download: vi.fn() }));

vi.mock('../core/client', () => ({
  download,
  withApiBase: (path: string) => `https://api.example.com/api${path}`,
}));

import { adminOrderExportApi, exportQuery } from './orderExport';

describe('exportQuery', () => {
  it('프로젝트별 다운로드는 날짜 없이도 필터를 만든다', () => {
    expect(exportQuery({ status: 'PAID', fulfillmentMethod: 'PICKUP' }, false))
      .toBe('status=PAID&fulfillmentMethod=PICKUP');
  });

  it('전체 주문 다운로드는 시작일과 종료일을 모두 요구한다', () => {
    expect(() => exportQuery({}, true))
      .toThrow('시작일과 종료일을 모두 입력해주세요.');
  });

  it.each([
    [{ startDate: '2026-09-01' }, '모두 입력하거나'],
    [{ startDate: '2026-02-30', endDate: '2026-03-01' }, '날짜 형식'],
    [{ startDate: '2026-09-02', endDate: '2026-09-01' }, '종료일'],
  ])('유효하지 않은 날짜 조건을 거부한다', (filters, message) => {
    expect(() => exportQuery(filters, false)).toThrow(message);
  });
});

describe('adminOrderExportApi', () => {
  it('프로젝트 및 전체 주문 API에 올바른 경로와 필터를 전달한다', () => {
    adminOrderExportApi.project(12, {
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      fulfillmentMethod: 'DELIVERY',
    });
    adminOrderExportApi.all({
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      status: 'PAID',
    });

    expect(download).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/api/admin/projects/12/orders/export?startDate=2026-09-01&endDate=2026-09-07&fulfillmentMethod=DELIVERY',
      expect.stringMatching(/^project-12-orders-\d{4}-\d{2}-\d{2}\.xlsx$/),
    );
    expect(download).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/api/admin/orders/export?startDate=2026-09-01&endDate=2026-09-07&status=PAID',
      expect.stringMatching(/^orders-\d{4}-\d{2}-\d{2}\.xlsx$/),
    );
  });
});
