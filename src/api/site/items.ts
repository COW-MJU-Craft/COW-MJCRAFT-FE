import { api, withApiBase } from '../core/client';
import type { ProjectLifecycleStatus } from '../../types/status';

export type ItemSaleType = 'NORMAL' | 'GROUPBUY';
export type ItemStatus = ProjectLifecycleStatus;
export type ItemType = 'PHYSICAL' | 'DIGITAL_JOURNAL';

export type ItemResponse = {
  id: number | string;
  projectId?: number | string | null;
  itemType?: ItemType | null;
  name: string;
  summary?: string | null;
  description?: string | null;
  price: number;
  saleType: ItemSaleType;
  status: ItemStatus;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  targetQty?: number | null;
  fundedQty?: number | null;
  stockQty?: number | null;
  remainingQty?: number | null;
  achievementRate?: number | null;
};

export type ItemJournalDownloadResponse = {
  downloadUrl: string;
  expiresInSeconds?: number;
};

export const itemsApi = {
  listByProject(projectId: string) {
    return api<ItemResponse[]>(
      withApiBase(`/projects/${projectId}/items`),
    );
  },

  async getById(projectId: string, itemId: string) {
    try {
      return await api<ItemResponse>(
        withApiBase(`/items/${itemId}`),
      );
    } catch {
      return api<ItemResponse>(
        withApiBase(`/projects/${projectId}/items/${itemId}`),
      );
    }
  },

  getJournalDownloadUrl(itemId: string) {
    return api<ItemJournalDownloadResponse>(withApiBase(`/items/${itemId}/journal/presign-get`), {
      method: 'POST',
    });
  },
};
