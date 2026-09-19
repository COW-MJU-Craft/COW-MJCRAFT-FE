import { ApiError } from '../../api/core/client';

export function normalizeVerifiedEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * 인증에 성공한 이메일과 현재 입력값이 같을 때만 인증 완료로 본다.
 * 값은 컴포넌트 상태로만 들고 있으며 storage/order draft에는 저장하지 않는다.
 */
export function isEmailVerified(
  verifiedEmail: string | null,
  currentEmail: string,
) {
  const current = normalizeVerifiedEmail(currentEmail);
  return (
    verifiedEmail !== null &&
    current !== '' &&
    normalizeVerifiedEmail(verifiedEmail) === current
  );
}

export function getEmailVerificationError(
  error: unknown,
  mode: 'code' | 'password',
) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return mode === 'code'
        ? '인증 코드가 올바르지 않거나 만료됐어요. 코드를 다시 확인하거나 재발송해주세요.'
        : '이메일 또는 비밀번호가 일치하지 않아요.';
    }
    if (error.status === 422) {
      return '비밀번호가 너무 약해요. 더 복잡한 비밀번호를 입력해주세요.';
    }
    if (error.status === 400) {
      return '이메일 형식을 확인해주세요.';
    }
  }
  return error instanceof Error && error.message
    ? error.message
    : '이메일 인증에 실패했어요. 잠시 후 다시 시도해주세요.';
}
