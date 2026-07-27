import { api, withApiBase } from './client';

export type AdminLoginBody = {
  userId: string;
  password: string;
};

export type AdminLoginResponse = {
  loginId: string;
  email: string;
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresInSeconds: number;
};

export type UpdateAccountBody = {
  currentUserId: string;
  currentPassword: string;
  newUserId: string;
  newPassword: string;
};

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const adminApi = {
  async login(body: AdminLoginBody) {
    try {
      return await api<AdminLoginResponse>(withApiBase('/admin/login'), {
        method: 'POST',
        body,
      });
    } catch (err) {
      if (DEMO_MODE) return;
      throw err;
    }
  },

  logout() {
    return api<void>(withApiBase('/admin/logout'), { method: 'POST' });
  },

  updateAccount(body: UpdateAccountBody) {
    return api<void>(withApiBase('/admin/account'), {
      method: 'PATCH',
      body,
    }).catch((err) => {
      if (DEMO_MODE) return undefined as void;
      throw err;
    });
  },
};
