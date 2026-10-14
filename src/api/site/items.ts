import { api, withApiBase } from '../core/client';
import type { ProjectLifecycleStatus } from '../../types/status';
import { normalizeBrandCopy } from '../../utils/common/brandCopy';

export type ItemSaleType = 'NORMAL' | 'GROUPBUY';
export type ItemStatus = ProjectLifecycleStatus;
export type ItemType = 'PHYSICAL' | 'DIGITAL_JOURNAL';

export type ItemOptionValue = {
  id: number | string;
  name: string;
  additionalPrice: number;
  stockQty?: number | null;
};

export type ItemOptionGroup = {
  id: number | string;
  name: string;
  required: boolean;
  values: ItemOptionValue[];
};

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
  options?: ItemOptionGroup[] | null;
};

export type ItemJournalDownloadResponse = {
  downloadUrl: string;
  expiresInSeconds?: number;
};

function normalizeItemCopy(item: ItemResponse): ItemResponse {
  return {
    ...item,
    summary: item.summary ? normalizeBrandCopy(item.summary) : item.summary,
    description: item.description
      ? normalizeBrandCopy(item.description)
      : item.description,
  };
}

export const itemsApi = {
  listByProject(projectId: string) {
    return api<ItemResponse[]>(
      withApiBase(`/projects/${projectId}/items`),
    ).then((items) => items.map(normalizeItemCopy));
  },

  async getById(projectId: string, itemId: string) {
    try {
      const item = await api<ItemResponse>(
        withApiBase(`/items/${itemId}`),
      );
      return normalizeItemCopy(item);
    } catch {
      return api<ItemResponse>(
        withApiBase(`/projects/${projectId}/items/${itemId}`),
      ).then(normalizeItemCopy);
    }
  },

  getJournalDownloadUrl(itemId: string) {
    return api<ItemJournalDownloadResponse>(withApiBase(`/items/${itemId}/journal/presign-get`), {
      method: 'POST',
    });
  },
};
