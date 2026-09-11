import { download, withApiBase } from '../core/client';
import type { AdminOrderStatus } from './orders';

export type FulfillmentMethod = 'PICKUP' | 'DELIVERY';

export type OrderExportFilters = {
  startDate?: string;
  endDate?: string;
  status?: AdminOrderStatus;
  fulfillmentMethod?: FulfillmentMethod;
};

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function exportQuery(
  filters: OrderExportFilters,
  requireDates: boolean,
) {
  const startDate = filters.startDate?.trim() ?? '';
  const endDate = filters.endDate?.trim() ?? '';
  if (requireDates && (!startDate || !endDate)) {
    throw new Error('전체 주문 다운로드는 시작일과 종료일을 모두 입력해주세요.');
  }
  if (Boolean(startDate) !== Boolean(endDate)) {
    throw new Error('시작일과 종료일을 모두 입력하거나 모두 비워주세요.');
  }
  if ((startDate && !validDate(startDate)) || (endDate && !validDate(endDate))) {
    throw new Error('날짜 형식을 확인해주세요.');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error('종료일은 시작일보다 빠를 수 없습니다.');
  }
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (filters.status) params.set('status', filters.status);
  if (filters.fulfillmentMethod) {
    params.set('fulfillmentMethod', filters.fulfillmentMethod);
  }
  return params.toString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const adminOrderExportApi = {
  project(projectId: number, filters: OrderExportFilters) {
    const query = exportQuery(filters, false);
    return download(
      withApiBase(
        `/admin/projects/${projectId}/orders/export${query ? `?${query}` : ''}`,
      ),
      `project-${projectId}-orders-${today()}.xlsx`,
    );
  },
  all(filters: OrderExportFilters) {
    const query = exportQuery(filters, true);
    return download(
      withApiBase(`/admin/orders/export?${query}`),
      `orders-${today()}.xlsx`,
    );
  },
};
