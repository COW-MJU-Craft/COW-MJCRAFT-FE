import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 401 시 clearAuth 호출 검증 + 토큰 조회를 auth 모듈에 위임하는지 확인하기 위해 mock
vi.mock('../utils/auth', () => ({
  clearAuth: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  updateTokens: vi.fn(),
}));

import { api, ApiError } from './client';
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from '../utils/auth';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAccessToken).mockReturnValue(null);
  vi.mocked(getRefreshToken).mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('withApiBase', () => {
  // API_BASE는 모듈 로드 시점에 import.meta.env로 확정되므로, 로컬 .env 값이
  // 새어들어오면 결과가 달라진다. env를 명시적으로 stub한 뒤 모듈을 다시 로드해
  // 실행 환경(.env 유무)과 무관하게 두 분기를 모두 검증한다.
  async function loadWithApiBase(baseUrl: string) {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', baseUrl);
    return (await import('./client')).withApiBase;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('VITE_API_BASE_URL이 없으면 경로를 그대로 반환한다', async () => {
    const withApiBase = await loadWithApiBase('');

    expect(withApiBase('/projects')).toBe('/projects');
  });

  it('VITE_API_BASE_URL이 있으면 앞에 붙이고 끝의 슬래시는 제거한다', async () => {
    const withApiBase = await loadWithApiBase('https://api.example.com/api/');

    expect(withApiBase('/projects')).toBe('https://api.example.com/api/projects');
  });
});

describe('api', () => {
  it('SUCCESS envelope에서 data만 꺼내 반환한다', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      resultType: 'SUCCESS',
      httpStatusCode: 200,
      message: 'ok',
      data: { id: 1 },
    }));

    await expect(api('/x')).resolves.toEqual({ id: 1 });
  });

  it('토큰이 있으면 Authorization 헤더를 붙인다', async () => {
    vi.mocked(getAccessToken).mockReturnValue('tok123');
    const f = mockFetch(200, { resultType: 'SUCCESS', httpStatusCode: 200, message: '', data: null });
    vi.stubGlobal('fetch', f);

    await api('/x');

    const headers = f.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok123');
  });

  it('HTTP 오류 시 ApiError(status, body)를 던진다', async () => {
    vi.stubGlobal('fetch', mockFetch(404, { message: '없음' }));

    const err = await api('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe('없음');
  });

  it('401이고 refresh token이 없으면 clearAuth를 호출한다', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { message: 'unauthorized' }));

    await expect(api('/x')).rejects.toBeInstanceOf(ApiError);
    expect(clearAuth).toHaveBeenCalledOnce();
  });

  it('resultType FAIL이면 200이어도 ApiError를 던진다', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      resultType: 'FAIL',
      httpStatusCode: 200,
      message: '실패 사유',
      data: null,
    }));

    const err = await api('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('실패 사유');
  });

  it('204는 undefined를 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api('/x')).resolves.toBeUndefined();
  });
});

describe('api 토큰 재발급', () => {
  function jsonResponse(status: number, body: unknown) {
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function envelope(data: unknown) {
    return { resultType: 'SUCCESS', httpStatusCode: 200, message: 'ok', data };
  }

  function loggedInWithRefreshToken() {
    vi.mocked(getAccessToken).mockReturnValue('expired-token');
    vi.mocked(getRefreshToken).mockReturnValue('ref123');
  }

  it('401이면 재발급 후 원래 요청을 재시도한다', async () => {
    loggedInWithRefreshToken();
    const f = vi
      .fn()
      // 1) 원요청 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      // 2) 재발급 성공
      .mockResolvedValueOnce(
        jsonResponse(200, envelope({ accessToken: 'new-tok', refreshToken: 'new-ref' })),
      )
      // 3) 재시도 성공
      .mockResolvedValueOnce(jsonResponse(200, envelope({ id: 1 })));
    vi.stubGlobal('fetch', f);

    await expect(api('/admin/orders')).resolves.toEqual({ id: 1 });

    expect(f).toHaveBeenCalledTimes(3);
    expect(updateTokens).toHaveBeenCalledWith({
      accessToken: 'new-tok',
      refreshToken: 'new-ref',
    });
    expect(clearAuth).not.toHaveBeenCalled();
  });

  it('재발급이 실패하면 clearAuth 후 원래 오류를 던진다', async () => {
    loggedInWithRefreshToken();
    const f = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      // 재발급도 401
      .mockResolvedValueOnce(jsonResponse(401, { message: 'invalid refresh token' }));
    vi.stubGlobal('fetch', f);

    const err = await api('/admin/orders').catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(clearAuth).toHaveBeenCalledOnce();
    expect(updateTokens).not.toHaveBeenCalled();
  });

  it('재시도도 401이면 더 재발급하지 않고 clearAuth한다', async () => {
    loggedInWithRefreshToken();
    const f = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { message: 'expired' }))
      .mockResolvedValueOnce(
        jsonResponse(200, envelope({ accessToken: 'new-tok', refreshToken: 'new-ref' })),
      )
      // 재시도마저 401 — 무한 루프로 가면 안 된다
      .mockResolvedValueOnce(jsonResponse(401, { message: 'still unauthorized' }));
    vi.stubGlobal('fetch', f);

    await expect(api('/admin/orders')).rejects.toBeInstanceOf(ApiError);

    expect(f).toHaveBeenCalledTimes(3);
    expect(clearAuth).toHaveBeenCalledOnce();
  });

  it('동시에 401을 받아도 재발급은 한 번만 호출한다', async () => {
    loggedInWithRefreshToken();
    const f = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.endsWith('/admin/refresh')) {
        return Promise.resolve(
          jsonResponse(200, envelope({ accessToken: 'new-tok', refreshToken: 'new-ref' })),
        );
      }
      // 첫 호출은 401, 재시도는 성공
      return Promise.resolve(
        f.mock.calls.filter((c) => !String(c[0]).endsWith('/admin/refresh')).length <= 3
          ? jsonResponse(401, { message: 'expired' })
          : jsonResponse(200, envelope({ ok: true })),
      );
    });
    vi.stubGlobal('fetch', f);

    await Promise.allSettled([api('/admin/a'), api('/admin/b'), api('/admin/c')]);

    const refreshCalls = f.mock.calls.filter((c) =>
      String(c[0]).endsWith('/admin/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('Authorization 헤더가 없던 요청의 401은 재발급하지 않는다', async () => {
    // 비회원 주문 조회의 비밀번호 불일치 — 재발급으로 해결되지 않는다
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(getRefreshToken).mockReturnValue('ref123');
    const f = vi.fn().mockResolvedValue(jsonResponse(401, { message: '비밀번호 불일치' }));
    vi.stubGlobal('fetch', f);

    await expect(api('/orders/lookup', { method: 'POST', body: {} })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(f).toHaveBeenCalledOnce();
    expect(updateTokens).not.toHaveBeenCalled();
  });
});
