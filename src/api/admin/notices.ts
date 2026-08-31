import { api, withApiBase } from '../core/client';

export type AdminNoticeResponse = {
  id: number;
  title: string;
  content: string;
  imageKeys?: string[] | null;
  imageUrls?: string[] | null;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
};

export type AdminNoticeUpsertRequest = {
  title: string;
  content: string;
  imageKeys?: string[];
};

export type NoticePresignRequest = {
  fileName: string;
  contentType: string;
};

export type NoticePresignResponse = {
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export const adminNoticesApi = {
  list() {
    return api<AdminNoticeResponse[]>(
      withApiBase('/admin/notices')
    );
  },

  getById(noticeId: string) {
    return api<AdminNoticeResponse>(
      withApiBase(`/admin/notices/${noticeId}`)
    );
  },

  create(body: AdminNoticeUpsertRequest) {
    return api<AdminNoticeResponse>(
      withApiBase('/admin/notices'),
      {
        method: 'POST',
        body,
      }
    );
  },

  update(noticeId: string, body: AdminNoticeUpsertRequest) {
    return api<AdminNoticeResponse>(
      withApiBase(`/admin/notices/${noticeId}`),
      {
        method: 'PUT',
        body,
      }
    );
  },

  delete(noticeId: string) {
    return api<void>(withApiBase(`/admin/notices/${noticeId}`), {
      method: 'DELETE',
    });
  },

  presignImage(body: NoticePresignRequest) {
    return api<NoticePresignResponse>(
      withApiBase('/admin/notices/presign-put/images'),
      {
        method: 'POST',
        body,
      }
    );
  },
};
