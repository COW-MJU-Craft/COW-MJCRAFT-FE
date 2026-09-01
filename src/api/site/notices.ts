import { api, withApiBase } from '../core/client';

export type NoticeResponse = {
  id: number;
  title: string;
  content?: string | null;
  imageKeys?: string[] | null;
  imageUrls?: string[] | null;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
};

export const noticesApi = {
  list() {
    return api<NoticeResponse[]>(
      withApiBase('/notices')
    );
  },

  async getById(noticeId: string): Promise<NoticeResponse | undefined> {
    try {
      const item = await api<NoticeResponse>(
        withApiBase(`/notices/${noticeId}`)
      );
      return item ?? undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  },
};
