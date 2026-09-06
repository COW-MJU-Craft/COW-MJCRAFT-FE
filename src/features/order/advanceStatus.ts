import type { AdminOrderStatus } from '../../api/admin/orders';

const NEXT_STATUS: Partial<Record<AdminOrderStatus, AdminOrderStatus>> = {
  PENDING_DEPOSIT: 'PAID',
  PAID: 'IN_PRODUCTION',
  IN_PRODUCTION: 'READY_TO_SHIP',
  READY_TO_SHIP: 'DELIVERED',
};

export function nextOrderStatus(status: string | undefined) {
  return NEXT_STATUS[status as AdminOrderStatus];
}

export function canAdvanceTogether(statuses: string[]) {
  return statuses.length > 0 && statuses.length <= 200 &&
    Boolean(nextOrderStatus(statuses[0])) && statuses.every((status) => status === statuses[0]);
}
