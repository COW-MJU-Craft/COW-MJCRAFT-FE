import type { OrderDraft } from './types';

function isBlank(value: string) {
  return value.trim().length === 0;
}

export function validateBuyerStep(draft: OrderDraft): string | null {
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

export function validateFulfillmentStep(draft: OrderDraft): string | null {
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

export function validateFinalStep(draft: OrderDraft): string | null {
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
