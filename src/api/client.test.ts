import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 401 시 clearAuth 호출 검증을 위해 mock
vi.mock('../utils/auth', () => ({
  clearAuth: vi.fn(),
}));

import { api, ApiError, withApiBase } from './client';
import { clearAuth } from '../utils/auth';

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('withApiBase', () => {
  it('VITE_API_BASE_URL이 없으면 경로를 그대로 반환한다', () => {
    // vitest 환경에서는 env 미설정 → API_BASE = ""
    expect(withApiBase('/projects')).toBe('/projects');
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
    localStorage.setItem('accessToken', 'tok123');
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

  it('401이면 clearAuth를 호출한다', async () => {
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
