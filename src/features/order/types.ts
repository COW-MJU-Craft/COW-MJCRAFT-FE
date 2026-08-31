import type { CartItem } from '../../utils/cart';

export type OrderLocationState = {
  source?: 'cart' | 'direct';
  items?: CartItem[];
};

export type BuyerType = 'STUDENT' | 'STAFF' | 'EXTERNAL';
export type CampusType = 'SEOUL' | 'YONGIN';
export type FulfillmentMethod = 'PICKUP' | 'DELIVERY';
export type OrderStep = 0 | 1 | 2 | 3 | 4;

export type AgreementState = {
  privacy: boolean;
  noRefund: boolean;
  cancelRisk: boolean;
};

export type BuyerForm = {
  buyerType: BuyerType;
  campus: CampusType;
  name: string;
  departmentOrMajor: string;
  studentNo: string;
  phone: string;
  refundBank: string;
  refundAccount: string;
  referralSource: string;
  email: string;
};

export type LookupForm = {
  lookupId: string;
  password: string;
  passwordConfirm: string;
};

export type PaymentForm = {
  depositorName: string;
};

export type FulfillmentForm = {
  method: FulfillmentMethod;
  receiverName: string;
  receiverPhone: string;
  infoConfirmed: boolean;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  deliveryMemo: string;
};

export type OrderDraft = {
  source: 'cart' | 'direct';
  items: CartItem[];
  step: OrderStep;
  agreements: AgreementState;
  buyer: BuyerForm;
  lookup: LookupForm;
  payment: PaymentForm;
  fulfillment: FulfillmentForm;
};

export type LookupCheckState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'error';
