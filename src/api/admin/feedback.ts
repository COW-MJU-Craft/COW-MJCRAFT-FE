import { api, withApiBase } from '../core/client';

export type AdminFeedbackStatus = 'RECEIVED' | 'ANSWERED' | string;

export type AdminFeedbackResponse = {
  id: number;
  title: string;
  content: string;
  answer?: string | null;
  status?: AdminFeedbackStatus | null;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
};

export type AdminFeedbackUpdateRequest = {
  answer: string;
  status: AdminFeedbackStatus;
};

export const adminFeedbackApi = {
  list() {
    return api<AdminFeedbackResponse[]>(withApiBase('/admin/feedback')).then(
      (res) => {
        return Array.isArray(res) ? res : [];
      },
    );
  },

  update(id: string | number, body: AdminFeedbackUpdateRequest) {
    return api<void>(withApiBase(`/admin/feedback/${id}`), {
      method: 'PUT',
      body,
    });
  },

  remove(id: string | number) {
    return api<void>(withApiBase(`/admin/feedback/${id}`), {
      method: 'DELETE',
    });
  },
};
