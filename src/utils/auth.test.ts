import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AUTH_CHANGED_EVENT,
  clearAuth,
  getAccessToken,
  getUserName,
  isLoggedIn,
  setAuth,
} from './auth';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('auth', () => {
  it('setAuth는 sessionStorage에 저장하고 localStorage에는 남기지 않는다', () => {
    setAuth({ accessToken: 'tok123', userName: '홍길동' });

    expect(sessionStorage.getItem('accessToken')).toBe('tok123');
    expect(sessionStorage.getItem('userName')).toBe('홍길동');
    expect(localStorage.length).toBe(0);
  });

  it('getAccessToken / getUserName / isLoggedIn이 setAuth 이후 값을 반영한다', () => {
    expect(isLoggedIn()).toBe(false);

    setAuth({ accessToken: 'tok123', userName: '홍길동' });

    expect(getAccessToken()).toBe('tok123');
    expect(getUserName()).toBe('홍길동');
    expect(isLoggedIn()).toBe(true);
  });

  it('clearAuth는 토큰과 사용자명을 모두 지운다', () => {
    setAuth({ accessToken: 'tok123', userName: '홍길동' });
    clearAuth();

    expect(getAccessToken()).toBeNull();
    expect(getUserName()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('setAuth / clearAuth는 AUTH_CHANGED_EVENT를 발생시킨다', () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_CHANGED_EVENT, listener);

    setAuth({ accessToken: 'tok123' });
    clearAuth();

    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
  });

  it('userName 없이 setAuth를 호출하면 기존 userName을 지운다', () => {
    setAuth({ accessToken: 'tok123', userName: '홍길동' });
    setAuth({ accessToken: 'tok456' });

    expect(getAccessToken()).toBe('tok456');
    expect(getUserName()).toBeNull();
  });
});
