export type DateTimeArray = [
  number,
  number,
  number,
  number?,
  number?,
  number?,
  number?,
];

export type OrderCompletePaymentInfo = {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
  amount?: number | null;
  amountLabel?: string | null;
  notice?: string | null;
};

export type OrderCompletePageContent = {
  messageTitle?: string | null;
  messageDescription?: string | null;
  paymentInformation?: string | null;
  paymentTitle?: string | null;
  paymentDescription?: string | null;
  paymentInfo?: OrderCompletePaymentInfo | null;
};

export type OrderCompleteOrderSummary = {
  orderId?: number;
  orderNo?: string;
  status?: string;
  totalAmount?: number;
  shippingFee?: number;
  finalAmount?: number;
  depositDeadline?: string;
  createdAt?: string;
  viewToken?: string;
  depositorName?: string;
};

export type OrderCompleteItem = {
  projectItemId?: number;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
  options?: Array<{
    groupName: string;
    valueName: string;
    additionalPrice: number;
  }>;
};

export type OrderCompletePageResponse = {
  order?: OrderCompleteOrderSummary;
  items: OrderCompleteItem[];
  content: OrderCompletePageContent;
  raw: unknown;
};
