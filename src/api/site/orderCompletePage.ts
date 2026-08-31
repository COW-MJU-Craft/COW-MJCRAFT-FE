import { ApiError, api, withApiBase } from '../core/client';
import type {
  DateTimeArray,
  OrderCompleteItem,
  OrderCompleteOrderSummary,
  OrderCompletePageContent,
  OrderCompletePageResponse,
  OrderCompletePaymentInfo,
} from '../../types/order';

const ADMIN_ORDER_COMPLETE_PAGE_ENDPOINTS = [
  '/admin/orders/complete-page',
  '/admin/order-complete-page',
];

export type AdminOrderCompletePageUpdateInput = {
  messageTitle: string;
  messageDescription: string;
  paymentInformation: string;
};

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  return input as Record<string, unknown>;
}

function normalizeDateValue(input: unknown): string | undefined {
  if (typeof input === 'string') return input;
  if (!Array.isArray(input) || input.length < 3) return undefined;

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

function pickFirstRecord(...values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    const record = asRecord(value);
    if (record) return record;
  }
  return null;
}

function toOrderSummary(raw: unknown): OrderCompleteOrderSummary | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const orderId = pickNumber(record, 'orderId', 'order_id', 'id');
  const orderNo = pickString(record, 'orderNo', 'order_no');
  const status = pickString(record, 'status', 'orderStatus', 'order_status');
  const depositDeadline = pickDateTime(
    record,
    'depositDeadline',
    'deposit_deadline',
    'deadline',
  );
  const lookupId = pickString(record, 'lookupId', 'lookup_id');
  const viewToken = pickString(record, 'viewToken', 'view_token');
  const totalAmount = pickNumber(record, 'totalAmount', 'total_amount');
  const shippingFee = pickNumber(record, 'shippingFee', 'shipping_fee');
  const finalAmount = pickNumber(record, 'finalAmount', 'final_amount');
  const depositorName = pickString(record, 'depositorName', 'depositor_name');
  const createdAt = pickDateTime(record, 'createdAt', 'created_at');

  if (
    orderId === undefined &&
    !orderNo &&
    !status &&
    totalAmount === undefined &&
    shippingFee === undefined &&
    finalAmount === undefined &&
    !depositDeadline &&
    !createdAt &&
    !lookupId &&
    !viewToken &&
    !depositorName
  ) {
    return undefined;
  }

  return {
    orderId,
    orderNo,
    status,
    totalAmount,
    shippingFee,
    finalAmount,
    depositDeadline,
    createdAt,
    lookupId,
    viewToken,
    depositorName,
  };
}

function toOrderCompleteItem(raw: unknown): OrderCompleteItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const projectItemId = pickNumber(
    record,
    'projectItemId',
    'project_item_id',
    'itemId',
  );
  const itemName = pickString(
    record,
    'itemNameSnapshot',
    'item_name_snapshot',
    'itemName',
    'item_name',
    'name',
  );
  const quantity = pickNumber(record, 'quantity');
  const unitPrice = pickNumber(record, 'unitPrice', 'unit_price');
  const lineAmount = pickNumber(record, 'lineAmount', 'line_amount');

  if (
    projectItemId === undefined &&
    !itemName &&
    quantity === undefined &&
    unitPrice === undefined &&
    lineAmount === undefined
  ) {
    return null;
  }

  return {
    projectItemId,
    itemName,
    quantity,
    unitPrice,
    lineAmount,
  };
}

function toPaymentInfo(raw: unknown): OrderCompletePaymentInfo | null {
  const record = asRecord(raw);
  if (!record) return null;

  const bankName = pickString(
    record,
    'bankName',
    'bank',
    'accountBank',
    'paymentBank',
  );
  const accountNumber = pickString(
    record,
    'accountNumber',
    'bankAccountNumber',
    'paymentAccountNumber',
    'accountNo',
  );
  const accountHolder = pickString(
    record,
    'accountHolder',
    'holder',
    'accountOwner',
    'depositor',
  );
  const amount = pickNumber(record, 'amount', 'depositAmount', 'paymentAmount');
  const amountLabel = pickString(record, 'amountLabel', 'formattedAmount');
  const notice = pickString(
    record,
    'notice',
    'paymentNotice',
    'paymentGuide',
    'guide',
    'memo',
    'description',
  );

  if (
    !bankName &&
    !accountNumber &&
    !accountHolder &&
    amount === undefined &&
    !amountLabel &&
    !notice
  ) {
    return null;
  }

  return {
    bankName,
    accountNumber,
    accountHolder,
    amount,
    amountLabel,
    notice,
  };
}

function toContent(raw: unknown): OrderCompletePageContent {
  const record = asRecord(raw);
  if (!record) {
    return {};
  }

  const paymentRecord = pickFirstRecord(
    record.paymentInfo,
    record.payment,
    record.account,
    record.accountInfo,
    record.bankAccount,
  );

  return {
    messageTitle: pickString(
      record,
      'messageTitle',
      'title',
      'message',
      'headline',
    ),
    messageDescription: pickString(
      record,
      'messageDescription',
      'messageDesc',
      'description',
      'messageBody',
      'body',
    ),
    paymentInformation: pickString(
      record,
      'paymentInformation',
      'payment_information',
      'paymentInfoText',
    ),
    paymentTitle: pickString(
      record,
      'paymentTitle',
      'accountTitle',
      'paymentHeadline',
    ),
    paymentDescription: pickString(
      record,
      'paymentDescription',
      'paymentGuide',
      'accountDescription',
      'paymentNoticeDescription',
    ),
    paymentInfo:
      toPaymentInfo(paymentRecord) ??
      toPaymentInfo({
        bankName: pickString(
          record,
          'bankName',
          'bank',
          'accountBank',
          'paymentBank',
        ),
        accountNumber: pickString(
          record,
          'accountNumber',
          'bankAccountNumber',
          'paymentAccountNumber',
          'accountNo',
        ),
        accountHolder: pickString(
          record,
          'accountHolder',
          'holder',
          'accountOwner',
          'depositor',
        ),
        amount: pickNumber(record, 'amount', 'depositAmount', 'paymentAmount'),
        amountLabel: pickString(record, 'amountLabel', 'formattedAmount'),
        notice: pickString(
          record,
          'paymentNotice',
          'notice',
          'paymentGuideNotice',
        ),
      }),
  };
}

function buildOrderCompletePageResponse(raw: unknown): OrderCompletePageResponse {
  const record = asRecord(raw);
  const orderRecord = pickFirstRecord(
    record?.order,
    record?.orderSummary,
    record?.summary,
  );
  const contentRecord = pickFirstRecord(
    record?.orderCompletePage,
    record?.completePage,
    record?.page,
    record?.content,
    record?.settings,
  );
  const items = Array.isArray(record?.items)
    ? record.items
        .map((item) => toOrderCompleteItem(item))
        .filter((item): item is OrderCompleteItem => item !== null)
    : [];

  return {
    order: toOrderSummary(orderRecord ?? record),
    items,
    content: toContent(contentRecord ?? record),
    raw,
  };
}

async function requestAdminWithCandidates<T>(
  method: 'GET' | 'PUT',
  body?: unknown,
): Promise<T> {
  let lastError: unknown = null;

  for (const endpoint of ADMIN_ORDER_COMPLETE_PAGE_ENDPOINTS) {
    try {
      return await api<T>(withApiBase(endpoint), {
        method,
        ...(body !== undefined ? { body } : {}),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('주문 완료 페이지 관리 API를 찾지 못했어요.');
}

function emptyStringToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildAdminUpdateBody(input: AdminOrderCompletePageUpdateInput) {
  const messageTitle = input.messageTitle.trim();
  const messageDescription = emptyStringToNull(input.messageDescription);
  const paymentInformation = input.paymentInformation.trim();

  return {
    messageTitle,
    messageDescription,
    paymentInformation,
  };
}

export function isOrderCompletePageNotFoundError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  const record = asRecord(error.body);
  const code = pickString(record, 'code', 'errorCode');
  const message = pickString(record, 'message', 'error');
  return (
    code === 'ORDER_COMPLETE_PAGE_NOT_FOUND' ||
    message?.includes('ORDER_COMPLETE_PAGE_NOT_FOUND') === true
  );
}

export const orderCompletePageApi = {
  async getByToken(token: string) {
    const trimmed = token.trim();
    const data = await api<unknown>(
      withApiBase(
        `/orders/complete-page?token=${encodeURIComponent(trimmed)}`,
      ),
    );
    return buildOrderCompletePageResponse(data);
  },
};

export const adminOrderCompletePageApi = {
  async get() {
    try {
      const data = await requestAdminWithCandidates<unknown>('GET');
      return buildOrderCompletePageResponse(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return buildOrderCompletePageResponse(null);
      }
      throw error;
    }
  },

  async update(input: AdminOrderCompletePageUpdateInput) {
    const body = buildAdminUpdateBody(input);
    const data = await requestAdminWithCandidates<unknown>('PUT', body);
    return buildOrderCompletePageResponse(data);
  },
};
