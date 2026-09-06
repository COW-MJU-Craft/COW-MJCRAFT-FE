import { api, withApiBase } from '../core/client';
import type { ProjectLifecycleStatus } from '../../types/status';

export type AdminProjectStatus = ProjectLifecycleStatus;
export type AdminProjectCategory = 'GOODS' | 'JOURNAL';

export type AdminProjectResponse = {
  id: number;
  title: string;
  summary: string;
  description: string;
  status: AdminProjectStatus;
  category?: AdminProjectCategory | null;
  deadlineDate: string | number[];
  thumbnailKey?: string | null;
  imageKeys?: string[] | null;
  thumbnailUrl?: string | null;
  imageUrls?: string[] | null;
  pinned?: boolean | null;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
  updatedAt?: string | number[] | null;
};

export type AdminProjectOrderItem = {
  projectId: number;
  pinned: boolean;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
};

export type AdminProjectOrderRequest = {
  items: AdminProjectOrderItem[];
};

export type AdminProjectUpsertRequest = {
  title: string;
  summary: string;
  description: string;
  status: AdminProjectStatus;
  category: AdminProjectCategory;
  deadlineDate: string;
  thumbnailKey: string;
  imageKeys?: string[];
};

export type PresignPutRequest = {
  files: Array<{ fileName: string; contentType: string }>;
};

export type PresignPutItem = {
  fileName: string;
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export type PresignPutResponse = {
  items: PresignPutItem[];
};

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File | Blob,
  contentType: string,
  options?: { key?: string },
) {
  void options;
  const safeType =
    (contentType && contentType.trim()) ||
    (file instanceof File ? file.type?.trim() : '') ||
    'application/octet-stream';
  const body = file;

  if (!(body instanceof Blob)) {
    throw new Error('업로드 본문이 Blob/File 형식이 아니에요.');
  }
  if (body.size <= 0) {
    throw new Error('선택한 파일이 비어있어요(0바이트). 파일을 다시 선택해 주세요.');
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': safeType },
    body,
    credentials: 'omit',
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(
      message.trim().length
        ? `파일 업로드 실패: ${message}`
        : '파일 업로드에 실패했습니다.',
    );
  }
}

export const adminProjectsApi = {
  list(status?: AdminProjectStatus) {
    return api<AdminProjectResponse[]>(
      withApiBase(`/admin/projects${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    );
  },

  getById(projectId: string) {
    return api<AdminProjectResponse>(
      withApiBase(`/admin/projects/${projectId}`),
    );
  },

  createProject(body: AdminProjectUpsertRequest) {
    return api<AdminProjectResponse>(
      withApiBase('/admin/projects'),
      {
        method: 'POST',
        body,
      },
    );
  },

  updateProject(projectId: string, body: AdminProjectUpsertRequest) {
    return api<AdminProjectResponse>(
      withApiBase(`/admin/projects/${projectId}`),
      {
        method: 'PUT',
        body,
      },
    );
  },

  deleteProject(projectId: string) {
    return api<void>(withApiBase(`/admin/projects/${projectId}`), {
      method: 'DELETE',
    });
  },

  presignThumbnail(body: PresignPutRequest) {
    return api<PresignPutResponse>(
      withApiBase('/admin/projects/thumbnail/presign-put'),
      {
        method: 'POST',
        body,
      },
    );
  },

  presignImages(body: PresignPutRequest) {
    return api<PresignPutResponse>(
      withApiBase('/admin/projects/images/presign-put'),
      {
        method: 'POST',
        body,
      },
    );
  },

  presignJournal(projectId: string, body: PresignPutRequest) {
    return api<PresignPutResponse>(
      withApiBase(`/admin/projects/${projectId}/journals/presign-put`),
      {
        method: 'POST',
        body,
      },
    );
  },

  updateOrder(body: AdminProjectOrderRequest) {
    return api<void>(withApiBase('/admin/projects/order'), {
      method: 'PATCH',
      body,
    });
  },
};
