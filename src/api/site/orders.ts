import { api, withApiBase } from '../core/client';
import type { DateTimeArray, OrderCompletePaymentInfo } from '../../types/order';

export type LookupIdAvailabilityResponse = {
  lookupId: string;
  available: boolean;
  message?: string;
};

export type OrderCreateRequest = {
  lookupId: string;
  password: string;
  depositorName: string;
  privacyAgreed: boolean;
  refundAgreed: boolean;
  cancelRiskAgreed: boolean;
  items: Array<{
    projectItemId: number;
    quantity: number;
  }>;
  buyer: {
    buyerType: 'STUDENT' | 'STAFF' | 'EXTERNAL';
    campus?: 'SEOUL' | 'YONGIN';
    name: string;
    departmentOrMajor?: string;
    studentNo?: string;
    phone: string;
    refundBank: string;
    refundAccount: string;
    referralSource: string;
    email: string;
  };
  fulfillment: {
    method: 'PICKUP' | 'DELIVERY';
    receiverName: string;
    receiverPhone: string;
    infoConfirmed: boolean;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    deliveryMemo?: string;
  };
};

export type OrderCreateResponse = {
  orderId?: number;
  orderNo?: string;
  status?: string;
  totalAmount?: number;
  shippingFee?: number;
  finalAmount?: number;
  depositDeadline?: string;
  createdAt?: string;
  lookupId?: string;
  viewToken?: string;
  messageTitle?: string;
  messageDescription?: string;
  paymentInformation?: string;
  paymentTitle?: string;
  paymentDescription?: string;
  paymentInfo?: OrderCompletePaymentInfo | null;
  raw: unknown;
};

export type OrderLookupRequest = {
  lookupId: string;
  password: string;
};

export type OrderDetailItem = {
  projectItemId?: number;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
};

export type OrderDetailResponse = {
  orderId?: number;
  orderNo?: string;
  status?: string;
  totalAmount?: number;
  shippingFee?: number;
  finalAmount?: number;
  depositDeadline?: string;
  createdAt?: string;
  lookupId?: string;
  viewToken?: string;
  depositorName?: string;
  paymentInformation?: string;
  paymentTitle?: string;
  paymentDescription?: string;
  paymentInfo?: OrderCompletePaymentInfo | null;
  paidAt?: string;
  canceledAt?: string;
  cancelReason?: string;
  refundRequestedAt?: string;
  refundedAt?: string;
  stockDeductedAt?: string;
  buyer?: {
    buyerType?: string;
    campus?: string;
    name?: string;
    departmentOrMajor?: string;
    studentNo?: string;
    phone?: string;
    refundBank?: string;
    refundAccount?: string;
    referralSource?: string;
    email?: string;
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
  items: OrderDetailItem[];
  raw: unknown;
};

function toLookupAvailability(
  lookupId: string,
  raw: unknown,
): LookupIdAvailabilityResponse {
  if (typeof raw === 'boolean') {
    return {
      lookupId,
      available: raw,
    };
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const availableCandidate =
      record.available ?? record.isAvailable ?? record.usable;
    const message =
      typeof record.message === 'string' ? record.message : undefined;

    if (typeof availableCandidate === 'boolean') {
      return {
        lookupId,
        available: availableCandidate,
        message,
      };
    }
  }

  return {
    lookupId,
    available: false,
    message: '조회 아이디 확인 응답을 해석할 수 없어요.',
  };
}

function toOrderCreateResponse(raw: unknown): OrderCreateResponse {
  if (!raw || typeof raw !== 'object') return { raw };

  const record = raw as Record<string, unknown>;
  const orderRecord = asRecord(record.order);
  const summaryRecord = asRecord(record.summary);
  const infoRecord = orderRecord ?? summaryRecord ?? record;
  const contentRecord = pickFirstRecord(
    record.orderCompletePage,
    record.completePage,
    record.page,
    record.content,
    record.settings,
  );
  const paymentRecord = pickFirstRecord(
    record.paymentInfo,
    record.payment,
    record.account,
    record.accountInfo,
    contentRecord?.paymentInfo,
    contentRecord?.payment,
    contentRecord?.account,
    contentRecord?.accountInfo,
  );

  return {
    orderId: pickNumberish(infoRecord, 'orderId', 'order_id', 'id'),
    orderNo: pickString(infoRecord, 'orderNo', 'order_no'),
    status: pickString(infoRecord, 'status', 'orderStatus', 'order_status'),
    totalAmount: pickNumberish(infoRecord, 'totalAmount', 'total_amount'),
    shippingFee: pickNumberish(infoRecord, 'shippingFee', 'shipping_fee'),
    finalAmount: pickNumberish(infoRecord, 'finalAmount', 'final_amount'),
    depositDeadline: pickDateTime(
      infoRecord,
      'depositDeadline',
      'deposit_deadline',
      'deadline',
    ),
    createdAt: pickDateTime(infoRecord, 'createdAt', 'created_at'),
    lookupId: pickString(infoRecord, 'lookupId', 'lookup_id'),
    viewToken: pickString(infoRecord, 'viewToken', 'view_token'),
    messageTitle: pickString(
      contentRecord ?? record,
      'messageTitle',
      'title',
      'message',
      'headline',
    ),
    messageDescription: pickString(
      contentRecord ?? record,
      'messageDescription',
      'messageDesc',
      'description',
      'messageBody',
      'body',
    ),
    paymentInformation: pickString(
      contentRecord ?? record,
      'paymentInformation',
      'payment_information',
      'paymentInfoText',
    ),
    paymentTitle: pickString(
      contentRecord ?? record,
      'paymentTitle',
      'accountTitle',
      'paymentHeadline',
    ),
    paymentDescription: pickString(
      contentRecord ?? record,
      'paymentDescription',
      'paymentGuide',
      'accountDescription',
      'paymentNoticeDescription',
    ),
    paymentInfo:
      toOrderPaymentInfo(paymentRecord) ??
      toOrderPaymentInfo({
        bankName: pickString(
          contentRecord ?? record,
          'bankName',
          'bank',
          'accountBank',
          'paymentBank',
        ),
        accountNumber: pickString(
          contentRecord ?? record,
          'accountNumber',
          'bankAccountNumber',
          'paymentAccountNumber',
          'accountNo',
        ),
        accountHolder: pickString(
          contentRecord ?? record,
          'accountHolder',
          'holder',
          'accountOwner',
          'depositor',
        ),
        amount: pickNumberish(
          contentRecord ?? record,
          'amount',
          'depositAmount',
          'paymentAmount',
        ),
        amountLabel: pickString(
          contentRecord ?? record,
          'amountLabel',
          'formattedAmount',
        ),
        notice: pickString(
          contentRecord ?? record,
          'paymentNotice',
          'notice',
          'paymentGuideNotice',
        ),
      }),
    raw,
  };
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as Record<string, unknown>;
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

function pickStringFromRecords(
  records: Array<Record<string, unknown> | null>,
  ...keys: string[]
): string | undefined {
  for (const record of records) {
    const value = pickString(record, ...keys);
    if (value !== undefined) return value;
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

function pickNumberish(
  record: Record<string, unknown> | null,
  ...keys: string[]
): number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function pickNumberishFromRecords(
  records: Array<Record<string, unknown> | null>,
  ...keys: string[]
): number | undefined {
  for (const record of records) {
    const value = pickNumberish(record, ...keys);
    if (value !== undefined) return value;
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

function toOrderDetailItem(raw: unknown): OrderDetailItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    projectItemId: pickNumber(
      record,
      'projectItemId',
      'project_item_id',
      'itemId',
    ),
    itemName: pickString(
      record,
      'itemName',
      'item_name',
      'itemNameSnapshot',
      'item_name_snapshot',
      'name',
    ),
    quantity: pickNumber(record, 'quantity'),
    unitPrice: pickNumber(record, 'unitPrice', 'unit_price'),
    lineAmount: pickNumber(record, 'lineAmount', 'line_amount', 'amount'),
  };
}

function toOrderPaymentInfo(raw: unknown): OrderCompletePaymentInfo | null {
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
  const amount = pickNumberish(
    record,
    'amount',
    'depositAmount',
    'paymentAmount',
  );
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

function toOrderDetailResponse(raw: unknown): OrderDetailResponse {
  const record = asRecord(raw);
  const orderRecord = asRecord(record?.order);
  const summaryRecord = asRecord(record?.summary);
  const infoRecord = orderRecord ?? summaryRecord ?? record;
  const contentRecord = pickFirstRecord(
    record?.orderCompletePage,
    record?.completePage,
    record?.page,
    record?.content,
    record?.settings,
  );
  const paymentRecord = pickFirstRecord(
    record?.paymentInfo,
    record?.payment,
    record?.account,
    record?.accountInfo,
    contentRecord?.paymentInfo,
    contentRecord?.payment,
    contentRecord?.account,
    contentRecord?.accountInfo,
  );
  const paymentTextSources = [record, contentRecord];
  const buyerRecord = asRecord(record?.buyer);
  const fulfillmentRecord = asRecord(
    record?.fulfillment ?? record?.delivery ?? record?.shipment,
  );
  const rawItems =
    record?.items ??
    record?.orderItems ??
    record?.lines ??
    orderRecord?.items ??
    orderRecord?.orderItems;
  const items = Array.isArray(rawItems)
    ? rawItems
        .map((item) => toOrderDetailItem(item))
        .filter((item): item is OrderDetailItem => item !== null)
    : [];

  return {
    orderId: pickNumberish(infoRecord, 'orderId', 'order_id', 'id'),
    orderNo: pickString(infoRecord, 'orderNo', 'order_no'),
    status: pickString(infoRecord, 'status', 'orderStatus', 'order_status'),
    totalAmount: pickNumberish(infoRecord, 'totalAmount', 'total_amount'),
    shippingFee: pickNumberish(infoRecord, 'shippingFee', 'shipping_fee'),
    finalAmount: pickNumberish(infoRecord, 'finalAmount', 'final_amount'),
    depositDeadline: pickDateTime(
      infoRecord,
      'depositDeadline',
      'deposit_deadline',
      'deadline',
    ),
    createdAt: pickDateTime(infoRecord, 'createdAt', 'created_at'),
    lookupId: pickString(infoRecord, 'lookupId', 'lookup_id'),
    viewToken: pickString(infoRecord, 'viewToken', 'view_token'),
    depositorName: pickString(infoRecord, 'depositorName', 'depositor_name'),
    paymentInformation: pickStringFromRecords(
      paymentTextSources,
      'paymentInformation',
      'payment_information',
      'paymentInfoText',
    ),
    paymentTitle: pickStringFromRecords(
      paymentTextSources,
      'paymentTitle',
      'accountTitle',
      'paymentHeadline',
    ),
    paymentDescription: pickStringFromRecords(
      paymentTextSources,
      'paymentDescription',
      'paymentGuide',
      'accountDescription',
      'paymentNoticeDescription',
    ),
    paymentInfo:
      toOrderPaymentInfo(paymentRecord) ??
      toOrderPaymentInfo({
        bankName: pickStringFromRecords(
          paymentTextSources,
          'bankName',
          'bank',
          'accountBank',
          'paymentBank',
        ),
        accountNumber: pickStringFromRecords(
          paymentTextSources,
          'accountNumber',
          'bankAccountNumber',
          'paymentAccountNumber',
          'accountNo',
        ),
        accountHolder: pickStringFromRecords(
          paymentTextSources,
          'accountHolder',
          'holder',
          'accountOwner',
          'depositor',
        ),
        amount: pickNumberishFromRecords(
          paymentTextSources,
          'amount',
          'depositAmount',
          'paymentAmount',
        ),
        amountLabel: pickStringFromRecords(
          paymentTextSources,
          'amountLabel',
          'formattedAmount',
        ),
        notice: pickStringFromRecords(
          paymentTextSources,
          'paymentNotice',
          'notice',
          'paymentGuideNotice',
        ),
      }),
    paidAt: pickDateTime(infoRecord, 'paidAt', 'paid_at'),
    canceledAt: pickDateTime(infoRecord, 'canceledAt', 'canceled_at'),
    cancelReason: pickString(infoRecord, 'cancelReason', 'cancel_reason'),
    refundRequestedAt: pickDateTime(
      infoRecord,
      'refundRequestedAt',
      'refund_requested_at',
    ),
    refundedAt: pickDateTime(infoRecord, 'refundedAt', 'refunded_at'),
    stockDeductedAt: pickDateTime(
      infoRecord,
      'stockDeductedAt',
      'stock_deducted_at',
    ),
    buyer: buyerRecord
      ? {
          buyerType: pickString(buyerRecord, 'buyerType', 'buyer_type'),
          campus: pickString(buyerRecord, 'campus'),
          name: pickString(buyerRecord, 'name'),
          departmentOrMajor: pickString(
            buyerRecord,
            'departmentOrMajor',
            'department_or_major',
          ),
          studentNo: pickString(buyerRecord, 'studentNo', 'student_no'),
          phone: pickString(buyerRecord, 'phone'),
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
          email: pickString(buyerRecord, 'email'),
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

export const ordersApi = {
  async checkLookupIdAvailability(lookupId: string) {
    const trimmed = lookupId.trim();
    const data = await api<unknown>(
      withApiBase(
        `/orders/lookup-id/availability?lookupId=${encodeURIComponent(trimmed)}`,
      ),
    );
    return toLookupAvailability(trimmed, data);
  },

  async createOrder(payload: OrderCreateRequest) {
    const data = await api<unknown>(
      withApiBase('/orders'),
      {
        method: 'POST',
        body: payload,
      },
    );
    return toOrderCreateResponse(data);
  },

  async lookupOrder(payload: OrderLookupRequest) {
    const data = await api<unknown>(
      withApiBase('/orders/lookup'),
      {
        method: 'POST',
        body: payload,
      },
    );
    return toOrderDetailResponse(data);
  },

  async viewOrder(token: string) {
    const trimmed = token.trim();
    const data = await api<unknown>(
      withApiBase(`/orders/view?token=${encodeURIComponent(trimmed)}`),
    );
    return toOrderDetailResponse(data);
  },
};
