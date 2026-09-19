import type {
  AgreementState,
  BuyerForm,
  BuyerType,
  CampusType,
  FulfillmentForm,
  FulfillmentMethod,
  LookupForm,
  OrderStep,
  PaymentForm,
} from './types';

export const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm';

export const SELECT_CLASS =
  'h-12 w-full appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 pr-11 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

export const TEXTAREA_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm';

export const DEFAULT_AGREEMENTS: AgreementState = {
  privacy: false,
  noRefund: false,
  cancelRisk: false,
};

export const DEFAULT_BUYER: BuyerForm = {
  buyerType: 'STUDENT',
  campus: 'SEOUL',
  name: '',
  departmentOrMajor: '',
  studentNo: '',
  phone: '',
  refundBank: '',
  refundAccount: '',
  referralSource: '',
  email: '',
};

export const DEFAULT_LOOKUP: LookupForm = {
  lookupId: '',
  password: '',
  passwordConfirm: '',
};

export const DEFAULT_PAYMENT: PaymentForm = {
  depositorName: '',
};

export const DEFAULT_FULFILLMENT: FulfillmentForm = {
  method: 'PICKUP',
  receiverName: '',
  receiverPhone: '',
  infoConfirmed: false,
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  deliveryMemo: '',
};

export const STEP_ITEMS: Array<{ step: OrderStep; title: string }> = [
  { step: 0, title: '주문 요약' },
  { step: 1, title: '필수 동의' },
  { step: 2, title: '구매자 정보' },
  { step: 3, title: '수령 방식' },
  { step: 4, title: '최종 확인' },
];

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  STUDENT: '재학생',
  STAFF: '교직원',
  EXTERNAL: '외부인',
};

export const CAMPUS_LABELS: Record<CampusType, string> = {
  SEOUL: '인문캠(서울)',
  YONGIN: '자연캠(용인)',
};

export const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  PICKUP: '현장 수령',
  DELIVERY: '택배 배송',
};

export const AGREEMENT_ITEMS: Array<{
  key: keyof AgreementState;
  title: string;
  noticeTitle: string;
  paragraphs: string[];
  question: string;
}> = [
  {
    key: 'privacy',
    title: '개인정보 수집 및 이용에 대한 안내 및 동의',
    noticeTitle: '[안내]',
    paragraphs: [
      '본 주문서는 굿즈 구매자 및 수령자 확인을 위하여 최소한의 개인정보(이름, 연락처 등)를 수집합니다. 수집된 개인정보는 물품 수령 기간이 종료된 이후, 문제 상황 발생에 대비하여 1개월간 안전하게 보관되며, 해당 기간 경과 후에는 즉시 폐기됩니다.',
      '본 프로젝트의 결과보고서를 명지대학교에 제출하는 과정에서 구매자의 이름 및 소속, 구매내역이 활용될 수 있습니다. 또한, 상품 배송 업무 진행을 위해 송장 등록 시 구매자의 개인정보가 우체국에 제공될 수 있음을 안내드립니다.',
      '동의를 거부하실 수 있으나 상품 구매가 불가능함을 알려드립니다.',
    ],
    question:
      '위와 같은 개인정보 수집 및 이용 방침을 확인하였으며, 이에 동의하십니까?',
  },
  {
    key: 'noRefund',
    title: '환불 불가에 대한 동의 및 안내',
    noticeTitle: '[안내]',
    paragraphs: [
      '전 물품은 사전에 명지공방(明智工房) 팀원의 1차 검수를 진행하였으며, 물품 수령 시 현장에서의 2차 검수를 통해 이상 유무를 확인할 예정입니다. 수령 이후 발생하는 제품의 흠집, 오염, 인쇄불량, 파손 등의 문제에 대해서는 환불 및 교환이 불가합니다.',
      '이러한 정책은 한정된 예산과 물품 수량, 저마진 구조 등 운영상의 제약으로 인함을 양해 부탁드립니다.',
    ],
    question:
      '위 환불 및 교환 불가 정책을 충분히 인지하였으며, 이에 동의하십니까?',
  },
  {
    key: 'cancelRisk',
    title: '프로젝트 무산 가능성 안내 및 동의',
    noticeTitle: '[안내]',
    paragraphs: [
      '프로젝트 운영 과정에서 최소 주문 수량 미달, 제작/공급 이슈 등으로 인해 프로젝트가 취소되거나 일정 및 내용이 변경될 수 있습니다.',
      '이 경우 별도 안내를 통해 환불 또는 대체 절차가 진행될 수 있으며, 처리 방식은 운영 정책에 따릅니다.',
    ],
    question: '프로젝트 무산 가능성 안내를 확인하였으며, 이에 동의하십니까?',
  },
];
