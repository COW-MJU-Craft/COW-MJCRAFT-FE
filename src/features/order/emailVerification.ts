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

/**
 * enroll API가 password를 필수로 받아 코드 인증용으로 임의 값을 만든다.
 * 사용자에게 보여주거나 저장하지 않고 요청 직후 버린다.
 */
export function createThrowawayPassword(length = 24) {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%^&*',
  ];
  const all = groups.join('');
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (n, i) =>
    i < groups.length
      ? groups[i][n % groups[i].length]
      : all[n % all.length],
  );
  // 앞쪽에 고정 배치된 문자군을 섞는다.
  const order = new Uint32Array(length);
  crypto.getRandomValues(order);
  return chars
    .map((char, i) => ({ char, key: order[i] }))
    .sort((a, b) => a.key - b.key)
    .map(({ char }) => char)
    .join('');
}

export function getEmailVerificationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return '인증 코드가 올바르지 않거나 만료됐어요. 코드를 다시 확인하거나 재발송해주세요.';
    }
    if (error.status === 400) return '이메일 형식을 확인해주세요.';
  }
  return error instanceof Error && error.message
    ? error.message
    : '이메일 인증에 실패했어요. 잠시 후 다시 시도해주세요.';
}
