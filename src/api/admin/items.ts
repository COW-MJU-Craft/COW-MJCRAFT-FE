import { api, withApiBase } from '../core/client';
import type { ProjectLifecycleStatus } from '../../types/status';

export type AdminItemSaleType = 'NORMAL' | 'GROUPBUY';
export type AdminItemStatus = ProjectLifecycleStatus;
export type AdminItemType = 'PHYSICAL' | 'DIGITAL_JOURNAL';

export type AdminItemOptionValue = {
  id: number;
  optionGroupId: number;
  name: string;
  additionalPrice: number;
  stockQty?: number | null;
  sortOrder: number;
};

export type AdminItemOptionGroup = {
  id: number;
  itemId: number;
  name: string;
  required: boolean;
  sortOrder: number;
  values: AdminItemOptionValue[];
};

export type AdminItemOptionGroupInput = {
  name: string;
  required: boolean;
  sortOrder: number;
};

export type AdminItemOptionValueInput = {
  name: string;
  additionalPrice: number;
  stockQty: number | null;
  sortOrder: number;
};

export type AdminItemImage = {
  id: number | string;
  imageKey?: string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
  createdAt?: string | number[] | null;
};

export type AdminItemResponse = {
  id: number;
  projectId?: number | null;
  itemType?: AdminItemType | null;
  name: string;
  summary?: string | null;
  description: string;
  price: number;
  saleType: AdminItemSaleType;
  status: AdminItemStatus;
  thumbnailKey?: string | null;
  thumbnailUrl?: string | null;
  targetQty?: number | null;
  fundedQty?: number | null;
  stockQty?: number | null;
  journalFileKey?: string | null;
  achievementRate?: number | null;
  remainingQty?: number | null;
  createdAt?: string | number[] | null;
  updatedAt?: string | number[] | null;
  images?: AdminItemImage[] | null;
};

export type AdminItemUpsertRequest = {
  itemType?: AdminItemType;
  name: string;
  summary?: string | null;
  description: string;
  price: number;
  saleType: AdminItemSaleType;
  status: AdminItemStatus;
  journalFileKey?: string | null;
  thumbnailKey?: string;
  targetQty?: number | null;
  fundedQty?: number | null;
  stockQty?: number | null;
};

export type PresignPutRequest = {
  files: Array<{ fileName: string; contentType: string }>;
};

export type PresignPutItem = {
  fileName: string;
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
  imageId?: number | string | null;
  imageUrl?: string | null;
  sortOrder?: number | null;
};

export type PresignPutResponse = {
  items: PresignPutItem[];
};

export type AdminItemImageOrderRequest = {
  imageIds: Array<number | string>;
};

export type JournalPresignGetResponse = {
  downloadUrl: string;
  expiresInSeconds?: number;
};

export const adminItemsApi = {
  listByProject(projectId: string) {
    return api<AdminItemResponse[]>(
      withApiBase(`/admin/projects/${projectId}/items`),
    );
  },

  getById(itemId: string) {
    return api<AdminItemResponse>(
      withApiBase(`/admin/items/${itemId}`),
    );
  },

  createItem(projectId: string, body: AdminItemUpsertRequest) {
    return api<AdminItemResponse>(
      withApiBase(`/admin/projects/${projectId}/items`),
      {
        method: 'POST',
        body,
      },
    );
  },

  updateItem(itemId: string, body: AdminItemUpsertRequest) {
    return api<AdminItemResponse>(
      withApiBase(`/admin/items/${itemId}`),
      {
        method: 'PUT',
        body,
      },
    );
  },

  deleteItem(itemId: string) {
    return api<void>(withApiBase(`/admin/items/${itemId}`), {
      method: 'DELETE',
    });
  },

  presignThumbnail(itemId: string, body: PresignPutRequest) {
    return api<PresignPutResponse>(
      withApiBase(`/admin/items/${itemId}/thumbnail/presign-put`),
      {
        method: 'POST',
        body,
      },
    );
  },

  deleteThumbnail(itemId: string) {
    return api<void>(withApiBase(`/admin/items/${itemId}/thumbnail`), {
      method: 'DELETE',
    });
  },

  presignImages(itemId: string, body: PresignPutRequest) {
    return api<PresignPutResponse>(
      withApiBase(`/admin/items/${itemId}/images/presign-put`),
      {
        method: 'POST',
        body,
      },
    );
  },

  addImages(
    itemId: string,
    body: { images: Array<{ imageKey: string; sortOrder: number }> },
  ) {
    return api<AdminItemImage[]>(
      withApiBase(`/admin/items/${itemId}/images`),
      {
        method: 'POST',
        body,
      },
    );
  },

  updateImagesOrder(itemId: string, body: AdminItemImageOrderRequest) {
    return api<void>(withApiBase(`/admin/items/${itemId}/images/order`), {
      method: 'PATCH',
      body,
    });
  },

  deleteImage(itemId: string, imageId: number | string) {
    return api<void>(withApiBase(`/admin/items/${itemId}/images/${imageId}`), {
      method: 'DELETE',
    });
  },

  getJournalDownloadUrl(itemId: string) {
    return api<JournalPresignGetResponse>(
      withApiBase(`/admin/items/${itemId}/journal/presign-get`),
    );
  },

  deleteJournal(itemId: string) {
    return api<void>(withApiBase(`/admin/items/${itemId}/journal`), {
      method: 'DELETE',
    });
  },

  getOptionGroups(itemId: string) {
    return api<AdminItemOptionGroup[]>(
      withApiBase(`/admin/items/${itemId}/option-groups`),
    );
  },

  createOptionGroup(itemId: string, body: AdminItemOptionGroupInput) {
    return api<AdminItemOptionGroup>(
      withApiBase(`/admin/items/${itemId}/option-groups`),
      { method: 'POST', body },
    );
  },

  updateOptionGroup(
    itemId: string,
    groupId: number,
    body: AdminItemOptionGroupInput,
  ) {
    return api<AdminItemOptionGroup>(
      withApiBase(`/admin/items/${itemId}/option-groups/${groupId}`),
      { method: 'PUT', body },
    );
  },

  deleteOptionGroup(itemId: string, groupId: number) {
    return api<void>(
      withApiBase(`/admin/items/${itemId}/option-groups/${groupId}`),
      { method: 'DELETE' },
    );
  },

  createOptionValue(
    itemId: string,
    groupId: number,
    body: AdminItemOptionValueInput,
  ) {
    return api<AdminItemOptionValue>(
      withApiBase(`/admin/items/${itemId}/option-groups/${groupId}/values`),
      { method: 'POST', body },
    );
  },

  updateOptionValue(
    itemId: string,
    groupId: number,
    valueId: number,
    body: AdminItemOptionValueInput,
  ) {
    return api<AdminItemOptionValue>(
      withApiBase(
        `/admin/items/${itemId}/option-groups/${groupId}/values/${valueId}`,
      ),
      { method: 'PUT', body },
    );
  },

  deleteOptionValue(itemId: string, groupId: number, valueId: number) {
    return api<void>(
      withApiBase(
        `/admin/items/${itemId}/option-groups/${groupId}/values/${valueId}`,
      ),
      { method: 'DELETE' },
    );
  },
};
