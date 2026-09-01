import { api, ApiError, withApiBase } from '../core/client';

export type SnsLink = {
  type?: string;
  url?: string;
  title?: string;
};

export type SnsAdminUpsertBody = {
  url: string;
};

function safeGetNullable<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((err) => {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  });
}

export const snsApi = {
  getInstagram(): Promise<SnsLink | null> {
    return safeGetNullable(api<SnsLink>(withApiBase('/sns/instagram')));
  },

  getKakao(): Promise<SnsLink | null> {
    return safeGetNullable(api<SnsLink>(withApiBase('/sns/kakao')));
  },
};

export const snsAdminApi = {
  async upsertInstagram(body: SnsAdminUpsertBody) {
    await api<void>(withApiBase('/admin/sns/instagram'), {
      method: 'PUT',
      body,
    });
  },

  async upsertKakao(body: SnsAdminUpsertBody) {
    await api<void>(withApiBase('/admin/sns/kakao'), {
      method: 'PUT',
      body,
    });
  },
};