const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY ?? 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_NAME_KEY = 'userName';

// 토큰 get/set/clear는 반드시 이 모듈을 통해서만 접근한다.
// - 탭을 닫으면 사라지도록 localStorage 대신 sessionStorage를 쓴다
//   (관리자 토큰이 브라우저를 껐다 켜도 남아있지 않게 하기 위함).
// - 다른 파일에서 직접 localStorage/sessionStorage로 토큰을 읽거나 쓰면
//   키 이름이 어긋나거나(과거 실제 버그였음) 로그아웃이 반쪽으로 처리될 수 있다.
export const AUTH_CHANGED_EVENT = 'auth-changed';

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// 액세스 토큰이 만료됐을 때 재발급에 사용한다. 액세스 토큰과 같은 sessionStorage
// 정책을 따르므로 탭을 닫으면 함께 사라진다.
export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUserName(): string | null {
  try {
    const v = sessionStorage.getItem(USER_NAME_KEY);
    return v && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  const token = getAccessToken();
  return Boolean(token && token.trim().length > 0);
}

export function setAuth(payload: {
  accessToken: string;
  refreshToken?: string | null;
  userName?: string | null;
}) {
  try {
    sessionStorage.setItem(TOKEN_KEY, payload.accessToken);

    if (payload.refreshToken && payload.refreshToken.trim()) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken.trim());
    }

    if (payload.userName && payload.userName.trim()) {
      sessionStorage.setItem(USER_NAME_KEY, payload.userName.trim());
    } else {
      sessionStorage.removeItem(USER_NAME_KEY);
    }
  } finally {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

// 토큰 재발급으로 액세스/리프레시 토큰만 교체한다.
// userName은 건드리지 않는다 — 재발급은 사용자 정보와 무관하다.
export function updateTokens(payload: {
  accessToken: string;
  refreshToken?: string | null;
}) {
  try {
    sessionStorage.setItem(TOKEN_KEY, payload.accessToken);
    if (payload.refreshToken && payload.refreshToken.trim()) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken.trim());
    }
  } catch {
    // sessionStorage 접근 불가 환경에서는 재발급 결과를 보관하지 않는다
  }
}

export function clearAuth() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_NAME_KEY);
  } finally {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function getDisplayUserName(): string {
  return getUserName() ?? 'USER';
}
