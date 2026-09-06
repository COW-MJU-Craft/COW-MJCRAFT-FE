import { api, withApiBase } from '../core/client';
import type { DateTimeArray } from '../../types/order';

export type AdminOrderStatus =
  | 'PENDING_DEPOSIT'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'DELIVERED'
  | 'CANCELED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';

export type AdminOrderListItem = {
  orderId: number;
  orderNo?: string;
  status: AdminOrderStatus;
  finalAmount?: number;
  depositorName?: string;
  buyerName?: string;
  buyerPhone?: string;
  createdAt?: string;
  depositDeadline?: string;
};

export type AdminOrderDetail = {
  order?: {
    orderId?: number;
    orderNo?: string;
    status?: AdminOrderStatus | string;
    totalAmount?: number;
    shippingFee?: number;
    finalAmount?: number;
    depositDeadline?: string;
    createdAt?: string;
    canceledAt?: string;
    cancelReason?: string;
    refundRequestedAt?: string;
    refundedAt?: string;
    paidAt?: string;
    depositorName?: string;
  };
  buyer?: {
    name?: string;
    phone?: string;
    email?: string;
    buyerType?: string;
    campus?: string;
    departmentOrMajor?: string;
    studentNo?: string;
    refundBank?: string;
    refundAccount?: string;
    referralSource?: string;
  };
  fulfillment?: {
    method?: string;
    receiverName?: string;
    receiverPhone?: string;
    infoConfirmed?: boolean;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    deliveryMemo?: string;
  };
  items: Array<{
    projectItemId?: number;
    itemName?: string;
    quantity?: number;
    unitPrice?: number;
    lineAmount?: number;
  }>;
  raw: unknown;
};

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown>;
}

function normalizeDateValue(input: unknown): string | undefined {
  if (typeof input === 'string') return input;
  if (!Array.isArray(input)) return undefined;
  if (input.length < 3) return undefined;

  const [year, month, day, hour = 0, minute = 0, second = 0] =
    input as DateTimeArray;
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return undefined;
  }

  const yyyy = String(Math.trunc(year)).padStart(4, '0');
  const mm = String(Math.trunc(month)).padStart(2, '0');
  const dd = String(Math.trunc(day)).padStart(2, '0');
  const hh = String(Math.trunc(hour)).padStart(2, '0');
  const mi = String(Math.trunc(minute)).padStart(2, '0');
  const ss = String(Math.trunc(second)).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function pickString(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

function pickDateTime(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const normalized = normalizeDateValue(record[key]);
    if (normalized) return normalized;
  }
  return undefined;
}

function pickNumber(
  record: Record<string, unknown> | null,
  ...keys: string[]
): number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function pickBoolean(
  record: Record<string, unknown> | null,
  ...keys: string[]
): boolean | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

function toListItem(raw: unknown): AdminOrderListItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const orderId = pickNumber(record, 'orderId', 'order_id', 'id');
  const status = pickString(record, 'status');
  if (!orderId || !status) return null;

  return {
    orderId,
    orderNo: pickString(record, 'orderNo', 'order_no'),
    status: status as AdminOrderStatus,
    finalAmount: pickNumber(record, 'finalAmount', 'final_amount'),
    depositorName: pickString(record, 'depositorName', 'depositor_name'),
    buyerName: pickString(record, 'buyerName', 'buyer_name'),
    buyerPhone: pickString(record, 'buyerPhone', 'buyer_phone'),
    createdAt: pickDateTime(record, 'createdAt', 'created_at'),
    depositDeadline: pickDateTime(
      record,
      'depositDeadline',
      'deposit_deadline',
    ),
  };
}

function toDetail(raw: unknown): AdminOrderDetail {
  const record = asRecord(raw);
  const orderRecord = asRecord(record?.order) ?? record;
  const buyerRecord = asRecord(record?.buyer);
  const fulfillmentRecord = asRecord(record?.fulfillment);
  const rawItems = record?.items ?? record?.orderItems;
  const items = Array.isArray(rawItems)
    ? rawItems.flatMap((item) => {
        const itemRecord = asRecord(item);
        if (!itemRecord) return [];
        return [
          {
            projectItemId: pickNumber(
              itemRecord,
              'projectItemId',
              'project_item_id',
              'itemId',
            ),
            itemName: pickString(
              itemRecord,
              'itemName',
              'item_name',
              'itemNameSnapshot',
              'item_name_snapshot',
              'name',
            ),
            quantity: pickNumber(itemRecord, 'quantity'),
            unitPrice: pickNumber(itemRecord, 'unitPrice', 'unit_price'),
            lineAmount: pickNumber(itemRecord, 'lineAmount', 'line_amount'),
          },
        ];
      })
    : [];

  return {
    order: orderRecord
      ? {
          orderId: pickNumber(orderRecord, 'orderId', 'order_id', 'id'),
          orderNo: pickString(orderRecord, 'orderNo', 'order_no'),
          status: pickString(orderRecord, 'status'),
          totalAmount: pickNumber(orderRecord, 'totalAmount', 'total_amount'),
          shippingFee: pickNumber(orderRecord, 'shippingFee', 'shipping_fee'),
          finalAmount: pickNumber(orderRecord, 'finalAmount', 'final_amount'),
          depositDeadline: pickDateTime(
            orderRecord,
            'depositDeadline',
            'deposit_deadline',
          ),
          createdAt: pickDateTime(orderRecord, 'createdAt', 'created_at'),
          canceledAt: pickDateTime(orderRecord, 'canceledAt', 'canceled_at'),
          cancelReason: pickString(
            orderRecord,
            'cancelReason',
            'cancel_reason',
          ),
          refundRequestedAt: pickDateTime(
            orderRecord,
            'refundRequestedAt',
            'refund_requested_at',
          ),
          refundedAt: pickDateTime(orderRecord, 'refundedAt', 'refunded_at'),
          paidAt: pickDateTime(orderRecord, 'paidAt', 'paid_at'),
          depositorName: pickString(
            orderRecord,
            'depositorName',
            'depositor_name',
          ),
        }
      : undefined,
    buyer: buyerRecord
      ? {
          name: pickString(buyerRecord, 'name'),
          phone: pickString(buyerRecord, 'phone'),
          email: pickString(buyerRecord, 'email'),
          buyerType: pickString(buyerRecord, 'buyerType', 'buyer_type'),
          campus: pickString(buyerRecord, 'campus'),
          departmentOrMajor: pickString(
            buyerRecord,
            'departmentOrMajor',
            'department_or_major',
          ),
          studentNo: pickString(buyerRecord, 'studentNo', 'student_no'),
          refundBank: pickString(buyerRecord, 'refundBank', 'refund_bank'),
          refundAccount: pickString(
            buyerRecord,
            'refundAccount',
            'refund_account',
          ),
          referralSource: pickString(
            buyerRecord,
            'referralSource',
            'referral_source',
          ),
        }
      : undefined,
    fulfillment: fulfillmentRecord
      ? {
          method: pickString(fulfillmentRecord, 'method'),
          receiverName: pickString(
            fulfillmentRecord,
            'receiverName',
            'receiver_name',
          ),
          receiverPhone: pickString(
            fulfillmentRecord,
            'receiverPhone',
            'receiver_phone',
          ),
          infoConfirmed: pickBoolean(
            fulfillmentRecord,
            'infoConfirmed',
            'info_confirmed',
          ),
          postalCode: pickString(
            fulfillmentRecord,
            'postalCode',
            'postal_code',
          ),
          addressLine1: pickString(
            fulfillmentRecord,
            'addressLine1',
            'address_line1',
          ),
          addressLine2: pickString(
            fulfillmentRecord,
            'addressLine2',
            'address_line2',
          ),
          deliveryMemo: pickString(
            fulfillmentRecord,
            'deliveryMemo',
            'delivery_memo',
          ),
        }
      : undefined,
    items,
    raw,
  };
}

export const adminOrdersApi = {
  advanceStatus(projectId: number, orderId: number) {
    return api<{ orderId: number; status: AdminOrderStatus }>(
      withApiBase(`/admin/projects/${projectId}/orders/${orderId}/advance-status`),
      { method: 'POST' },
    );
  },

  advanceStatuses(projectId: number, orderIds: number[]) {
    return api<{ previousStatus: AdminOrderStatus; newStatus: AdminOrderStatus; updatedOrderIds: number[] }>(
      withApiBase(`/admin/projects/${projectId}/orders/advance-status`),
      { method: 'POST', body: { orderIds } },
    );
  },

  async listByProject(projectId: number, status?: AdminOrderStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api<unknown>(withApiBase(`/admin/projects/${projectId}/orders${query}`));
    if (!Array.isArray(data)) throw new Error('주문 목록 응답 형식을 확인해주세요.');
    return data.map(toListItem).filter((item): item is AdminOrderListItem => item !== null);
  },

  statistics(projectId: number) {
    return api<{ orderCount: number; totalOrderAmount: number }>(
      withApiBase(`/admin/projects/${projectId}/orders/statistics`),
    );
  },

  async list(status?: AdminOrderStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const parsed = await api<unknown>(
      withApiBase(`/admin/orders${query}`),
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => toListItem(item))
      .filter((item): item is AdminOrderListItem => item !== null);
  },

  async getById(orderId: number) {
    const data = await api<unknown>(
      withApiBase(`/admin/orders/${orderId}`),
    );
    return toDetail(data);
  },

  async cancelOrRequestRefund(orderId: number, reason?: string) {
    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    const body =
      normalizedReason.length > 0
        ? { reason: normalizedReason.slice(0, 500) }
        : undefined;

    await api<unknown>(
      withApiBase(`/admin/orders/${orderId}/cancel`),
      body ? { method: 'POST', body } : { method: 'POST' },
    );
  },

  async confirmPaid(orderId: number) {
    await api<unknown>(
      withApiBase(`/admin/orders/${orderId}/confirm-paid`),
      {
        method: 'POST',
      },
    );
  },

  async confirmRefund(orderId: number) {
    await api<unknown>(
      withApiBase(`/admin/orders/${orderId}/confirm-refund`),
      {
        method: 'POST',
      },
    );
  },
};
