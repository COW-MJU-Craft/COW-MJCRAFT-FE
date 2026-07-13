import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ordersApi } from '../../api/orders';
import Reveal from '../../components/Reveal';
import { useToast } from '../../components/toast/useToast';
import {
  clearCartItems,
  getCartCount,
  getCartTotal,
  loadCartItems,
  removeCartItem,
  type CartItem,
} from '../../utils/cart';
import {
  clearOrderDraft,
  loadOrderDraft,
  saveOrderDraft,
} from '../../utils/orderDraft';

type OrderLocationState = {
  source?: 'cart' | 'direct';
  items?: CartItem[];
};

type DaumPostcodeResult = {
  zonecode: string;
  roadAddress?: string;
  jibunAddress?: string;
};

type DaumPostcode = {
  new (options: { oncomplete: (data: DaumPostcodeResult) => void }): {
    open: (options?: { left?: number; top?: number }) => void;
  };
};

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcode;
    };
  }
}

type BuyerType = 'STUDENT' | 'STAFF' | 'EXTERNAL';
type CampusType = 'SEOUL' | 'YONGIN';
type FulfillmentMethod = 'PICKUP' | 'DELIVERY';
type OrderStep = 0 | 1 | 2 | 3 | 4;

type AgreementState = {
  privacy: boolean;
  noRefund: boolean;
  cancelRisk: boolean;
};

type BuyerForm = {
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

type LookupForm = {
  lookupId: string;
  password: string;
  passwordConfirm: string;
};

type PaymentForm = {
  depositorName: string;
};

type FulfillmentForm = {
  method: FulfillmentMethod;
  receiverName: string;
  receiverPhone: string;
  infoConfirmed: boolean;
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  deliveryMemo: string;
};

type OrderDraft = {
  source: 'cart' | 'direct';
  items: CartItem[];
  step: OrderStep;
  agreements: AgreementState;
  buyer: BuyerForm;
  lookup: LookupForm;
  payment: PaymentForm;
  fulfillment: FulfillmentForm;
};

type LookupCheckState = 'idle' | 'checking' | 'available' | 'taken' | 'error';


const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm';

const SELECT_CLASS =
  'h-12 w-full appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 pr-11 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

const TEXTAREA_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm';

const DEFAULT_AGREEMENTS: AgreementState = {
  privacy: false,
  noRefund: false,
  cancelRisk: false,
};

const DEFAULT_BUYER: BuyerForm = {
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

const DEFAULT_LOOKUP: LookupForm = {
  lookupId: '',
  password: '',
  passwordConfirm: '',
};

const DEFAULT_PAYMENT: PaymentForm = {
  depositorName: '',
};

const DEFAULT_FULFILLMENT: FulfillmentForm = {
  method: 'PICKUP',
  receiverName: '',
  receiverPhone: '',
  infoConfirmed: false,
  postalCode: '',
  addressLine1: '',
  addressLine2: '',
  deliveryMemo: '',
};

const STEP_ITEMS: Array<{ step: OrderStep; title: string }> = [
  { step: 0, title: '주문 요약' },
  { step: 1, title: '필수 동의' },
  { step: 2, title: '구매자 정보' },
  { step: 3, title: '수령 방식' },
  { step: 4, title: '최종 확인' },
];

const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  STUDENT: '재학생',
  STAFF: '교직원',
  EXTERNAL: '외부인',
};

const CAMPUS_LABELS: Record<CampusType, string> = {
  SEOUL: '인문캠(서울)',
  YONGIN: '자연캠(용인)',
};

const FULFILLMENT_METHOD_LABELS: Record<FulfillmentMethod, string> = {
  PICKUP: '현장 수령',
  DELIVERY: '택배 배송',
};

const AGREEMENT_ITEMS: Array<{
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

function formatMoney(value: number) {
  return value.toLocaleString();
}




function isBlank(value: string) {
  return value.trim().length === 0;
}

function validateBuyerStep(draft: OrderDraft): string | null {
  const { buyer, payment } = draft;
  const isStudent = buyer.buyerType === 'STUDENT';
  const isStaff = buyer.buyerType === 'STAFF';

  if (isBlank(buyer.name)) return '이름을 입력해주세요.';
  if (isStudent && isBlank(buyer.departmentOrMajor))
    return '소속 학과를 입력해주세요.';
  if (isStaff && isBlank(buyer.departmentOrMajor))
    return '소속 부서를 입력해주세요.';
  if (isStudent && isBlank(buyer.studentNo)) return '학번을 입력해주세요.';
  if (isBlank(buyer.phone)) return '휴대폰 번호를 입력해주세요.';
  if (isBlank(buyer.refundBank)) return '환불 은행을 입력해주세요.';
  if (isBlank(buyer.refundAccount)) return '환불 계좌를 입력해주세요.';
  if (isBlank(buyer.referralSource)) return '알게 된 경로를 입력해주세요.';
  if (isBlank(payment.depositorName)) return '입금자명을 입력해주세요.';

  return null;
}

function validateFulfillmentStep(draft: OrderDraft): string | null {
  const { fulfillment } = draft;

  if (isBlank(fulfillment.receiverName)) return '수령자 성함을 입력해주세요.';
  if (isBlank(fulfillment.receiverPhone))
    return '수령자 휴대폰 번호를 입력해주세요.';
  if (fulfillment.method === 'DELIVERY') {
    if (isBlank(fulfillment.postalCode)) return '우편번호를 입력해주세요.';
    if (isBlank(fulfillment.addressLine1)) return '기본 주소를 입력해주세요.';
  }
  if (!fulfillment.infoConfirmed) {
    return '수령 정보 정확성 재확인에 동의해야 다음 단계로 진행할 수 있어요.';
  }

  return null;
}

function validateFinalStep(draft: OrderDraft): string | null {
  const { lookup, buyer } = draft;
  if (isBlank(lookup.lookupId)) return '조회 아이디를 입력해주세요.';
  if (isBlank(lookup.password)) return '조회 비밀번호를 입력해주세요.';
  if (isBlank(lookup.passwordConfirm))
    return '조회 비밀번호 확인을 입력해주세요.';
  if (lookup.password !== lookup.passwordConfirm) {
    return '조회 비밀번호와 비밀번호 확인이 일치하지 않아요.';
  }
  if (isBlank(buyer.email)) return '이메일을 입력해주세요.';
  return null;
}

export default function OrderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const state = (location.state ?? {}) as OrderLocationState;

  const [draft, setDraft] = useState<OrderDraft>(() => {
    // 보안 정책: 이름/전화/이메일/주소/환불계좌/비밀번호 등은 저장하지 않으므로
    // 여기서 복원되는 것은 진행 단계(step)와 선택 상품(items)뿐이다.
    // buyer/lookup/payment/fulfillment는 새로고침 시 항상 빈 값으로 시작한다.
    const saved = loadOrderDraft();
    const base: OrderDraft = {
      source: saved?.source ?? 'cart',
      items: saved?.items ?? loadCartItems(),
      step: saved?.step ?? 0,
      agreements: DEFAULT_AGREEMENTS,
      buyer: DEFAULT_BUYER,
      lookup: DEFAULT_LOOKUP,
      payment: DEFAULT_PAYMENT,
      fulfillment: DEFAULT_FULFILLMENT,
    };

    if (state.source === 'direct' && Array.isArray(state.items)) {
      return {
        ...base,
        source: 'direct',
        step: 0,
        items: state.items,
      };
    }
    if (state.source === 'cart') {
      return {
        ...base,
        source: 'cart',
        step: 0,
        items: loadCartItems(),
      };
    }
    return base;
  });
  const [lookupCheckState, setLookupCheckState] =
    useState<LookupCheckState>('idle');
  const [lookupCheckMessage, setLookupCheckMessage] = useState('');
  const [lookupCheckedId, setLookupCheckedId] = useState('');
  const [showLookupPassword, setShowLookupPassword] = useState(false);
  const [showLookupPasswordConfirm, setShowLookupPasswordConfirm] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    saveOrderDraft(draft);
  }, [draft]);

  const items = draft.items;
  const totalCount = getCartCount(items);
  const totalPrice = getCartTotal(items);
  const allRequiredAgreed =
    draft.agreements.privacy &&
    draft.agreements.noRefund &&
    draft.agreements.cancelRisk;

  const handleRemoveItem = (itemId: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.itemId !== itemId),
    }));
    if (draft.source === 'cart') {
      removeCartItem(itemId);
    }
  };

  const setStep = (step: OrderStep) => {
    setDraft((prev) => ({ ...prev, step }));
  };

  const goPrevStep = () => setStep(Math.max(0, draft.step - 1) as OrderStep);

  const validateStepTransition = (step: OrderStep): string | null => {
    if (step === 0) {
      if (items.length === 0) return '주문할 상품이 없어요.';
      return null;
    }
    if (step === 1) {
      if (!allRequiredAgreed) return '필수 동의 항목에 모두 체크해주세요.';
      return null;
    }
    if (step === 2) return validateBuyerStep(draft);
    if (step === 3) return validateFulfillmentStep(draft);
    return null;
  };

  const moveToStep = (targetStep: OrderStep) => {
    if (targetStep === draft.step) return;
    if (targetStep < draft.step) {
      setStep(targetStep);
      return;
    }

    for (let step = draft.step; step < targetStep; step += 1) {
      const message = validateStepTransition(step as OrderStep);
      if (message) {
        toast.error(message);
        return;
      }
    }

    setStep(targetStep);
  };

  const goNextStep = () => {
    if (draft.step === 0) {
      if (items.length === 0) {
        toast.info('주문할 상품이 없어요.');
        return;
      }
      setStep(1);
      return;
    }

    if (draft.step === 1) {
      if (!allRequiredAgreed) {
        toast.error('필수 동의 항목에 모두 체크해주세요.');
        return;
      }
      setStep(2);
      return;
    }

    if (draft.step === 2) {
      const message = validateBuyerStep(draft);
      if (message) {
        toast.error(message);
        return;
      }
      setStep(3);
      return;
    }

    if (draft.step === 3) {
      const message = validateFulfillmentStep(draft);
      if (message) {
        toast.error(message);
        return;
      }
      setStep(4);
    }
  };

  const updateAgreement = (key: keyof AgreementState, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      agreements: {
        ...prev.agreements,
        [key]: checked,
      },
    }));
  };

  const updateBuyer = <K extends keyof BuyerForm>(
    key: K,
    value: BuyerForm[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        [key]: value,
      },
    }));
  };

  const updateLookup = <K extends keyof LookupForm>(
    key: K,
    value: LookupForm[K],
  ) => {
    const isLookupId = key === 'lookupId';
    const nextLookupId = isLookupId ? String(value) : draft.lookup.lookupId;
    const trimmedNextLookupId = nextLookupId.trim();
    const shouldResetLookupCheck =
      isLookupId && trimmedNextLookupId !== lookupCheckedId;

    setDraft((prev) => ({
      ...prev,
      lookup: {
        ...prev.lookup,
        [key]: value,
      },
    }));

    if (shouldResetLookupCheck) {
      setLookupCheckState('idle');
      setLookupCheckMessage('');
      setLookupCheckedId('');
    }
  };

  const updatePayment = <K extends keyof PaymentForm>(
    key: K,
    value: PaymentForm[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        [key]: value,
      },
    }));
  };

  const updateFulfillment = <K extends keyof FulfillmentForm>(
    key: K,
    value: FulfillmentForm[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      fulfillment: {
        ...prev.fulfillment,
        [key]: value,
      },
    }));
  };

  const handleLookupIdCheck = async () => {
    const lookupId = draft.lookup.lookupId.trim();
    if (lookupId.length === 0) {
      toast.error('조회 아이디를 먼저 입력해주세요.');
      return;
    }

    setLookupCheckState('checking');
    setLookupCheckMessage('조회 아이디 사용 가능 여부를 확인하고 있어요.');

    try {
      const result = await ordersApi.checkLookupIdAvailability(lookupId);
      if (result.available) {
        setLookupCheckState('available');
        setLookupCheckedId(lookupId);
        setLookupCheckMessage(
          result.message ?? '사용 가능한 조회 아이디입니다.',
        );
      } else {
        setLookupCheckState('taken');
        setLookupCheckedId('');
        setLookupCheckMessage(
          result.message ??
            '이미 사용 중인 조회 아이디예요. 다른 아이디를 입력해주세요.',
        );
      }
    } catch (error) {
      setLookupCheckState('error');
      setLookupCheckedId('');
      setLookupCheckMessage(
        error instanceof Error
          ? error.message
          : '조회 아이디 확인 중 오류가 발생했어요.',
      );
    }
  };

  const openDeliveryPostcode = () => {
    if (!window.daum) {
      toast.error(
        '주소 검색 스크립트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
      );
      return;
    }

    const width = 500;
    const height = 600;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

    new window.daum.Postcode({
      oncomplete: (data) => {
        updateFulfillment('postalCode', data.zonecode);
        updateFulfillment(
          'addressLine1',
          data.roadAddress || data.jibunAddress || '',
        );
      },
    }).open({ left, top });
  };

  const handleSubmit = async () => {
    const validationMessage = validateFinalStep(draft);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const trimmedLookupId = draft.lookup.lookupId.trim();
    if (
      lookupCheckState !== 'available' ||
      lookupCheckedId !== trimmedLookupId
    ) {
      toast.error('조회 아이디 중복 확인을 완료해주세요.');
      return;
    }

    const aggregatedItems = draft.items.reduce<Record<number, number>>(
      (acc, item) => {
        const projectItemId = Number(item.itemId);
        if (!Number.isFinite(projectItemId)) return acc;
        const quantity = Number.isFinite(item.quantity)
          ? Math.max(1, item.quantity)
          : 1;
        acc[projectItemId] = (acc[projectItemId] ?? 0) + quantity;
        return acc;
      },
      {},
    );

    const itemsPayload = Object.entries(aggregatedItems).map(
      ([projectItemId, quantity]) => ({
        projectItemId: Number(projectItemId),
        quantity,
      }),
    );

    if (itemsPayload.length === 0) {
      toast.error('주문 상품 정보가 올바르지 않아 제출할 수 없어요.');
      return;
    }

    const payload = {
      lookupId: trimmedLookupId,
      password: draft.lookup.password,
      depositorName: draft.payment.depositorName.trim(),
      privacyAgreed: draft.agreements.privacy,
      refundAgreed: draft.agreements.noRefund,
      cancelRiskAgreed: draft.agreements.cancelRisk,
      items: itemsPayload,
      buyer: {
        buyerType: draft.buyer.buyerType,
        ...(draft.buyer.buyerType !== 'EXTERNAL'
          ? { campus: draft.buyer.campus }
          : {}),
        name: draft.buyer.name.trim(),
        ...(draft.buyer.buyerType !== 'EXTERNAL'
          ? { departmentOrMajor: draft.buyer.departmentOrMajor.trim() }
          : {}),
        ...(draft.buyer.buyerType === 'STUDENT'
          ? { studentNo: draft.buyer.studentNo.trim() }
          : {}),
        phone: draft.buyer.phone.trim(),
        refundBank: draft.buyer.refundBank.trim(),
        refundAccount: draft.buyer.refundAccount.trim(),
        referralSource: draft.buyer.referralSource.trim(),
        email: draft.buyer.email.trim(),
      },
      fulfillment: {
        method: draft.fulfillment.method,
        receiverName: draft.fulfillment.receiverName.trim(),
        receiverPhone: draft.fulfillment.receiverPhone.trim(),
        infoConfirmed: draft.fulfillment.infoConfirmed,
        ...(draft.fulfillment.method === 'DELIVERY'
          ? {
              postalCode: draft.fulfillment.postalCode.trim(),
              addressLine1: draft.fulfillment.addressLine1.trim(),
              addressLine2: draft.fulfillment.addressLine2.trim(),
              deliveryMemo: draft.fulfillment.deliveryMemo.trim(),
            }
          : {}),
      },
    } as const;

    setIsSubmitting(true);
    try {
      const result = await ordersApi.createOrder(payload);
      clearOrderDraft();
      if (draft.source === 'cart') {
        clearCartItems();
      }
      toast.success('주문이 접수되었어요. 입금 확인을 기다려주세요.');
      const nextPath = result.viewToken?.trim()
        ? `/order/complete?token=${encodeURIComponent(result.viewToken.trim())}`
        : '/order/complete';
      navigate(nextPath, {
        replace: true,
        state: {
          orderNo: result.orderNo,
          status: result.status,
          lookupId: result.lookupId ?? payload.lookupId,
          depositDeadline: result.depositDeadline,
          viewToken: result.viewToken,
          createdAt: result.createdAt,
          totalAmount: result.totalAmount,
          shippingFee: result.shippingFee,
          finalAmount: result.finalAmount,
          messageTitle: result.messageTitle,
          messageDescription: result.messageDescription,
          paymentInformation: result.paymentInformation,
          paymentTitle: result.paymentTitle,
          paymentDescription: result.paymentDescription,
          paymentInfo: result.paymentInfo,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '주문 제출 중 오류가 발생했어요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStudent = draft.buyer.buyerType === 'STUDENT';
  const isStaff = draft.buyer.buyerType === 'STAFF';
  const isDelivery = draft.fulfillment.method === 'DELIVERY';
  const hasLookupPassword = draft.lookup.password.trim().length > 0;
  const hasLookupPasswordConfirm =
    draft.lookup.passwordConfirm.trim().length > 0;
  const isLookupPasswordMatched =
    hasLookupPassword &&
    hasLookupPasswordConfirm &&
    draft.lookup.password === draft.lookup.passwordConfirm;
  const campusLabel =
    draft.buyer.campus === 'SEOUL'
      ? '인문캠(서울)'
      : draft.buyer.campus === 'YONGIN'
        ? '자연캠(용인)'
        : '미선택';

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Reveal>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="font-heading text-3xl text-slate-900">주문서</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {STEP_ITEMS.map((item) => (
              <span
                key={`step-${item.step}`}
                onClick={() => moveToStep(item.step)}
                className={[
                  'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-primary/30 hover:text-primary',
                  item.step === draft.step
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-slate-200 text-slate-400',
                ].join(' ')}
              >
                {item.step}. {item.title}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            총 {totalCount}개 상품, 합계 {formatMoney(totalPrice)}원
          </p>
        </section>
      </Reveal>

      <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {draft.step === 0 && (
          <>
            {items.length === 0 ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500">
                  주문할 상품이 없어요.
                </p>
                <Link
                  to="/projects"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95"
                >
                  상품 보러 가기
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={`${item.projectId}-${item.itemId}`}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.itemId)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {item.quantity}개 ·{' '}
                        {formatMoney(item.price * item.quantity)}원
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">
                    총 결제 예상 금액
                  </p>
                  <p className="text-base font-bold text-slate-900">
                    {formatMoney(totalPrice)}원
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {draft.step === 1 && (
          <>
            <h2 className="font-heading text-xl text-slate-900">
              구매 전 필수 동의
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              아래 항목은 모두 필수 동의입니다.
            </p>

            <div className="mt-5 space-y-3">
              {AGREEMENT_ITEMS.map((agreement) => (
                <label
                  key={agreement.key}
                  className="block rounded-2xl border-2 border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={draft.agreements[agreement.key]}
                      onChange={(event) =>
                        updateAgreement(agreement.key, event.target.checked)
                      }
                      className="mt-1 h-5 w-5 rounded-sm border-2 border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {agreement.title}{' '}
                        <span className="text-slate-700">[필수]</span>{' '}
                        <span className="text-rose-600">*</span>
                      </p>
                      <p className="mt-3 text-xs font-bold text-slate-800">
                        {agreement.noticeTitle}
                      </p>
                      {agreement.paragraphs.map((paragraph, idx) => (
                        <p
                          key={`${agreement.key}-p-${idx}`}
                          className="mt-2 text-xs leading-relaxed text-slate-600"
                        >
                          {paragraph}
                        </p>
                      ))}
                      <p className="mt-3 text-xs font-semibold text-rose-600">
                        {agreement.question}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {!allRequiredAgreed && (
              <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                필수 동의 항목에 체크하지 않으면 구매를 진행할 수 없어요.
              </p>
            )}
          </>
        )}

        {draft.step === 2 && (
          <>
            <h2 className="font-heading text-xl text-slate-900">
              구매자 신분 및 정보 입력
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              신분에 따라 필요한 입력 항목이 달라집니다.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Buyer Type
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    value: 'STUDENT',
                    label: '재학생',
                    description: '학과/학번 정보까지 입력',
                  },
                  {
                    value: 'STAFF',
                    label: '교직원',
                    description: '소속 부서 정보를 입력',
                  },
                  {
                    value: 'EXTERNAL',
                    label: '외부인',
                    description: '기본 인적 사항 입력',
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      updateBuyer('buyerType', item.value as BuyerType)
                    }
                    className={[
                      'rounded-2xl border-2 bg-white px-4 py-3 text-left shadow-sm transition',
                      draft.buyer.buyerType === item.value
                        ? 'border-primary/40 ring-2 ring-primary/15'
                        : 'border-slate-200 hover:border-slate-300',
                    ].join(' ')}
                  >
                    <p className="text-sm font-bold text-slate-900">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(isStudent || isStaff) && (
                <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700">
                      소속 캠퍼스 <span className="text-rose-500">*</span>
                    </p>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {campusLabel}
                    </span>
                  </div>

                  <div className="relative mt-2">
                    <select
                      value={draft.buyer.campus}
                      onChange={(event) =>
                        updateBuyer(
                          'campus',
                          event.target.value as BuyerForm['campus'],
                        )
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="SEOUL">인문캠(서울)</option>
                      <option value="YONGIN">자연캠(용인)</option>
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    소속 기준 캠퍼스를 한 곳 선택해주세요.
                  </p>
                </div>
              )}

              <label className="text-sm font-semibold text-slate-700">
                이름 <span className="text-rose-500">*</span>
                <input
                  value={draft.buyer.name}
                  onChange={(event) => updateBuyer('name', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="이름 입력"
                />
              </label>

              {(isStudent || isStaff) && (
                <label className="text-sm font-semibold text-slate-700">
                  {isStudent ? '소속 학과' : '소속 부서'}{' '}
                  <span className="text-rose-500">*</span>
                  <input
                    value={draft.buyer.departmentOrMajor}
                    onChange={(event) =>
                      updateBuyer('departmentOrMajor', event.target.value)
                    }
                    className={INPUT_CLASS}
                    placeholder={
                      isStudent ? '예) 컴퓨터공학과' : '예) 학생지원팀'
                    }
                  />
                </label>
              )}

              {isStudent && (
                <label className="text-sm font-semibold text-slate-700">
                  학번 <span className="text-rose-500">*</span>
                  <input
                    value={draft.buyer.studentNo}
                    onChange={(event) =>
                      updateBuyer('studentNo', event.target.value)
                    }
                    className={INPUT_CLASS}
                    placeholder="예) 60123456"
                  />
                </label>
              )}

              <label className="text-sm font-semibold text-slate-700">
                휴대폰 번호 <span className="text-rose-500">*</span>
                <input
                  value={draft.buyer.phone}
                  onChange={(event) => updateBuyer('phone', event.target.value)}
                  className={INPUT_CLASS}
                  placeholder="예) 010-1234-5678"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                환불 은행 <span className="text-rose-500">*</span>
                <input
                  value={draft.buyer.refundBank}
                  onChange={(event) =>
                    updateBuyer('refundBank', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="예) 국민은행"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                환불 계좌 <span className="text-rose-500">*</span>
                <input
                  value={draft.buyer.refundAccount}
                  onChange={(event) =>
                    updateBuyer('refundAccount', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="예) 123456-78-901234"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                알게 된 경로 <span className="text-rose-500">*</span>
                <input
                  value={draft.buyer.referralSource}
                  onChange={(event) =>
                    updateBuyer('referralSource', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="예) instagram"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                입금자명 <span className="text-rose-500">*</span>
                <input
                  value={draft.payment.depositorName}
                  onChange={(event) =>
                    updatePayment('depositorName', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="예) 홍길동"
                />
              </label>
            </div>
          </>
        )}

        {draft.step === 3 && (
          <>
            <h2 className="font-heading text-xl text-slate-900">
              수령 방식 선택
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              현장 수령 또는 택배 배송을 선택해주세요.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                {
                  value: 'PICKUP',
                  label: '현장 수령',
                  description: '캠퍼스 지정 장소에서 직접 수령',
                },
                {
                  value: 'DELIVERY',
                  label: '택배 배송',
                  description: '입력한 주소로 택배 배송',
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    updateFulfillment('method', item.value as FulfillmentMethod)
                  }
                  className={[
                    'rounded-2xl border-2 px-4 py-3 text-left transition',
                    draft.fulfillment.method === item.value
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <p className="text-sm font-bold text-slate-900">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                수령자 성함 <span className="text-rose-500">*</span>
                <input
                  value={draft.fulfillment.receiverName}
                  onChange={(event) =>
                    updateFulfillment('receiverName', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="수령자 이름"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                수령자 휴대폰 번호 <span className="text-rose-500">*</span>
                <input
                  value={draft.fulfillment.receiverPhone}
                  onChange={(event) =>
                    updateFulfillment('receiverPhone', event.target.value)
                  }
                  className={INPUT_CLASS}
                  placeholder="예) 010-1234-5678"
                />
              </label>
            </div>

            {isDelivery && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  배송지 정보
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  주소 검색은 카카오맵 API 연동 단계에서 연결할 예정입니다.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    우편번호 <span className="text-rose-500">*</span>
                    <input
                      value={draft.fulfillment.postalCode}
                      onChange={(event) =>
                        updateFulfillment('postalCode', event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="예) 04524"
                    />
                  </label>
                  <div className="sm:pt-6">
                    <button
                      type="button"
                      onClick={openDeliveryPostcode}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-white"
                    >
                      주소 검색
                    </button>
                  </div>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    기본 주소 <span className="text-rose-500">*</span>
                    <input
                      value={draft.fulfillment.addressLine1}
                      onChange={(event) =>
                        updateFulfillment('addressLine1', event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="예) 서울시 중구 세종대로 110"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    상세 주소
                    <input
                      value={draft.fulfillment.addressLine2}
                      onChange={(event) =>
                        updateFulfillment('addressLine2', event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="예) 101동 1001호"
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                    배송 메모
                    <textarea
                      value={draft.fulfillment.deliveryMemo}
                      onChange={(event) =>
                        updateFulfillment('deliveryMemo', event.target.value)
                      }
                      className={TEXTAREA_CLASS}
                      rows={3}
                      placeholder="예) 부재 시 문 앞에 놓아주세요"
                    />
                  </label>
                </div>
              </div>
            )}

            <label className="mt-6 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={draft.fulfillment.infoConfirmed}
                onChange={(event) =>
                  updateFulfillment('infoConfirmed', event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary"
              />
              입력한 수령자/배송 정보가 정확함을 다시 확인했습니다.
            </label>
          </>
        )}

        {draft.step === 4 && (
          <>
            <h2 className="font-heading text-xl text-slate-900">
              최종 확인 및 제출
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              입력한 정보를 최종 확인한 뒤 구매 제출을 진행해주세요.
            </p>

            <div className="mt-6 space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">
                  주문 조회 계정 설정
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  주문 이후 상태 조회(입금 확인/배송 진행)를 위해 조회 아이디와
                  비밀번호를 설정해주세요.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
                  <label className="text-sm font-semibold text-slate-700">
                    조회 아이디 <span className="text-rose-500">*</span>
                    <input
                      value={draft.lookup.lookupId}
                      onChange={(event) =>
                        updateLookup('lookupId', event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="예) guest-mju-001"
                    />
                  </label>
                  <div className="sm:pt-8">
                    <button
                      type="button"
                      onClick={() => void handleLookupIdCheck()}
                      disabled={lookupCheckState === 'checking'}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {lookupCheckState === 'checking'
                        ? '확인 중...'
                        : '아이디 확인'}
                    </button>
                  </div>
                </div>

                {lookupCheckMessage && (
                  <p
                    className={[
                      'mt-2 rounded-xl px-3 py-2 text-xs font-semibold',
                      lookupCheckState === 'available'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : lookupCheckState === 'taken' ||
                            lookupCheckState === 'error'
                          ? 'border border-rose-200 bg-rose-50 text-rose-700'
                          : 'border border-slate-200 bg-white text-slate-600',
                    ].join(' ')}
                  >
                    {lookupCheckMessage}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    조회 비밀번호 <span className="text-rose-500">*</span>
                    <div className="relative">
                      <input
                        type={showLookupPassword ? 'text' : 'password'}
                        value={draft.lookup.password}
                        onChange={(event) =>
                          updateLookup('password', event.target.value)
                        }
                        className={INPUT_CLASS}
                        placeholder="비밀번호 입력"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLookupPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="조회 비밀번호 표시 전환"
                      >
                        {showLookupPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    비밀번호 확인 <span className="text-rose-500">*</span>
                    <div className="relative">
                      <input
                        type={showLookupPasswordConfirm ? 'text' : 'password'}
                        value={draft.lookup.passwordConfirm}
                        onChange={(event) =>
                          updateLookup('passwordConfirm', event.target.value)
                        }
                        className={INPUT_CLASS}
                        placeholder="비밀번호 다시 입력"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowLookupPasswordConfirm((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="조회 비밀번호 확인 표시 전환"
                      >
                        {showLookupPasswordConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {hasLookupPasswordConfirm && (
                      <p
                        className={[
                          'mt-1 text-xs font-semibold',
                          isLookupPasswordMatched
                            ? 'text-emerald-600'
                            : 'text-rose-600',
                        ].join(' ')}
                      >
                        {isLookupPasswordMatched
                          ? '비밀번호가 일치합니다.'
                          : '비밀번호가 일치하지 않습니다.'}
                      </p>
                    )}
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    이메일 <span className="text-rose-500">*</span>
                    <input
                      type="email"
                      value={draft.buyer.email}
                      onChange={(event) =>
                        updateBuyer('email', event.target.value)
                      }
                      className={INPUT_CLASS}
                      placeholder="주문 조회 링크를 받을 이메일"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-linear-to-b from-white to-slate-50/60 p-5">
                <h3 className="text-sm font-bold text-slate-900">주문 상품</h3>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.projectId}-${item.itemId}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatMoney(item.price * item.quantity)}원
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-right text-sm font-bold text-slate-900">
                  합계 {formatMoney(totalPrice)}원
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                <h3 className="text-sm font-bold text-slate-900">
                  구매자 정보
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    구매자 구분: {BUYER_TYPE_LABELS[draft.buyer.buyerType]}
                  </div>
                  {(isStudent || isStaff) && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      캠퍼스: {CAMPUS_LABELS[draft.buyer.campus]}
                    </div>
                  )}
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    이름: {draft.buyer.name || '-'}
                  </div>
                  {(isStudent || isStaff) && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      {isStudent ? '소속 학과' : '소속 부서'}:{' '}
                      {draft.buyer.departmentOrMajor || '-'}
                    </div>
                  )}
                  {isStudent && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      학번: {draft.buyer.studentNo || '-'}
                    </div>
                  )}
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    휴대폰 번호: {draft.buyer.phone || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    환불 은행: {draft.buyer.refundBank || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    환불 계좌: {draft.buyer.refundAccount || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    알게 된 경로: {draft.buyer.referralSource || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    이메일: {draft.buyer.email || '-'}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                <h3 className="text-sm font-bold text-slate-900">
                  조회 계정 정보
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    조회 아이디: {draft.lookup.lookupId || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    조회 비밀번호: {draft.lookup.password ? '입력 완료' : '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    아이디 확인 상태:{' '}
                    {lookupCheckState === 'available' ? '확인 완료' : '미확인'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    이메일: {draft.buyer.email || '-'}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                <h3 className="text-sm font-bold text-slate-900">입금 정보</h3>
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                  입금자명: {draft.payment.depositorName || '-'}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                <h3 className="text-sm font-bold text-slate-900">수령 정보</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    수령 방식:{' '}
                    {FULFILLMENT_METHOD_LABELS[draft.fulfillment.method]}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    수령자 성함: {draft.fulfillment.receiverName || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    수령자 휴대폰 번호: {draft.fulfillment.receiverPhone || '-'}
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    정보 정확성 확인:{' '}
                    {draft.fulfillment.infoConfirmed ? '확인 완료' : '미확인'}
                  </div>
                  {isDelivery && (
                    <>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        우편번호: {draft.fulfillment.postalCode || '-'}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        기본 주소: {draft.fulfillment.addressLine1 || '-'}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                        상세 주소: {draft.fulfillment.addressLine2 || '-'}
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                        배송 메모: {draft.fulfillment.deliveryMemo || '-'}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        <div className="mt-8 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrevStep}
            disabled={draft.step === 0}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            이전
          </button>

          {draft.step < 4 ? (
            <button
              type="button"
              onClick={goNextStep}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '제출 중...' : '구매 제출'}
            </button>
          )}
        </div>
      </Reveal>
    </div>
  );
}
