import { api, withApiBase } from '../core/client';
import type { ProjectLifecycleStatus } from '../../types/status';
export type ProjectStatus = ProjectLifecycleStatus;

export type Project = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  startAt: string; // YYYY-MM-DD (UI placeholder)
  endAt: string; // YYYY-MM-DD (deadlineDate)
  deadlineDate?: string;
  dDay?: number;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  description?: string;
  imageUrls?: string[];
  imageKeys?: string[];
  pinned?: boolean;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
  updatedAt?: string | DateArray | null;
};

type DateArray = [number, number, number];

type ProjectListItemResponseDto = {
  id: number;
  title: string;
  summary: string;
  thumbnailUrl?: string | null;
  status: ProjectStatus;
  deadlineDate?: string | DateArray | null;
  dDay?: number | null;
  pinned?: boolean | null;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
  updatedAt?: string | DateArray | null;
};

type ProjectDetailResponseDto = {
  id: number;
  title: string;
  summary: string;
  description?: string | null;
  thumbnailUrl?: string | null;

  thumbnailKey?: string | null;
  imageKeys?: string[] | null;

  imageUrls?: string[] | null;
  status: ProjectStatus;
  deadlineDate?: string | DateArray | null;
  dDay?: number | null;
  createdAt?: string | DateArray | null;
  updatedAt?: string | DateArray | null;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
  pinned?: boolean | null;
};

function formatDateArray(input?: DateArray | null): string | undefined {
  if (!input) return undefined;
  const [year, month, day] = input;
  if (!year || !month || !day) return undefined;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function normalizeDateValue(
  value?: string | DateArray | null,
): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return formatDateArray(value);
  return value;
}

function toProject(
  item: ProjectListItemResponseDto | ProjectDetailResponseDto,
): Project {
  const deadlineDate = normalizeDateValue(item.deadlineDate);
  return {
    id: String(item.id),
    title: item.title,
    summary: item.summary,
    status: item.status,
    startAt: '',
    endAt: deadlineDate ?? '',
    deadlineDate,
    dDay: item.dDay ?? undefined,
    thumbnailUrl: item.thumbnailUrl ?? undefined,

    thumbnailKey:
      'thumbnailKey' in item ? item.thumbnailKey ?? undefined : undefined,
    imageKeys: 'imageKeys' in item ? item.imageKeys ?? undefined : undefined,

    description: 'description' in item ? item.description ?? undefined : undefined,
    imageUrls: 'imageUrls' in item ? item.imageUrls ?? undefined : undefined,
    pinned: 'pinned' in item ? item.pinned ?? undefined : undefined,
    pinnedOrder:
      'pinnedOrder' in item ? item.pinnedOrder ?? undefined : undefined,
    manualOrder:
      'manualOrder' in item ? item.manualOrder ?? undefined : undefined,
    updatedAt:
      'updatedAt' in item ? normalizeDateValue(item.updatedAt) : undefined,
  };
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    const items = await api<ProjectListItemResponseDto[]>(
      withApiBase('/projects'),
    );
    return Array.isArray(items) ? items.map(toProject) : [];
  },

  async getById(id: string): Promise<Project | undefined> {
    try {
      const item = await api<ProjectDetailResponseDto>(
        withApiBase(`/projects/${id}`),
      );
      return item ? toProject(item) : undefined;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  },
};
