// src/api/admin.ts
import { api } from './client';

// export type AdminMe = {
//   userId: number;
//   username: string;
//   role: string; // e.g. "ADMIN"
// };

export type AdminLoginBody = {
  userId: string;
  password: string;
};

const ADMIN_BASE = import.meta.env.VITE_API_BASE_URL ?? '/remote';

function joinBase(path: string) {
  const base = ADMIN_BASE.endsWith('/') ? ADMIN_BASE.slice(0, -1) : ADMIN_BASE;
  return `${base}${path}`;
}

export const adminApi = {
  login(body: AdminLoginBody) {
    return api<void>(joinBase('/api/admin/login'), {
      method: 'POST',
      body,
    });
  },

  // me() {
  //   return api<AdminMe>(joinBase('/api/admin/me'));
  // },

  logout() {
    return api<void>(joinBase('/api/admin/logout'), { method: 'POST' });
  },
};
