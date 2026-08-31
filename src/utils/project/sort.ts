import { parseDateLike } from '../common/date';

export type ProjectSortFields = {
  id: string | number;
  pinned?: boolean | null;
  pinnedOrder?: number | null;
  manualOrder?: number | null;
  deadlineDate?: string | number[] | null;
  updatedAt?: string | number[] | null;
};

function compareIdsDesc(a: string | number, b: string | number) {
  const aNum = typeof a === 'number' ? a : Number(a);
  const bNum = typeof b === 'number' ? b : Number(b);
  const aNumValid = !Number.isNaN(aNum);
  const bNumValid = !Number.isNaN(bNum);
  if (aNumValid && bNumValid) return bNum - aNum;
  return String(b).localeCompare(String(a));
}

export function sortProjects<T extends ProjectSortFields>(projects: T[]): T[] {
  const indexed = projects.map((project, index) => ({ project, index }));

  indexed.sort((a, b) => {
    const aPinned = Boolean(a.project.pinned);
    const bPinned = Boolean(b.project.pinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    if (aPinned) {
      const aOrder = a.project.pinnedOrder ?? Number.POSITIVE_INFINITY;
      const bOrder = b.project.pinnedOrder ?? Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aUpdated = parseDateLike(a.project.updatedAt)?.getTime();
      const bUpdated = parseDateLike(b.project.updatedAt)?.getTime();
      const aUpdatedValue = aUpdated ?? Number.NEGATIVE_INFINITY;
      const bUpdatedValue = bUpdated ?? Number.NEGATIVE_INFINITY;
      if (aUpdatedValue !== bUpdatedValue) return bUpdatedValue - aUpdatedValue;

      const idCompare = compareIdsDesc(a.project.id, b.project.id);
      if (idCompare !== 0) return idCompare;
    } else {
      const aOrder = a.project.manualOrder ?? Number.POSITIVE_INFINITY;
      const bOrder = b.project.manualOrder ?? Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aDeadline = parseDateLike(a.project.deadlineDate)?.getTime();
      const bDeadline = parseDateLike(b.project.deadlineDate)?.getTime();
      const aDeadlineValue = aDeadline ?? Number.POSITIVE_INFINITY;
      const bDeadlineValue = bDeadline ?? Number.POSITIVE_INFINITY;
      if (aDeadlineValue !== bDeadlineValue) return aDeadlineValue - bDeadlineValue;

      const idCompare = compareIdsDesc(a.project.id, b.project.id);
      if (idCompare !== 0) return idCompare;
    }

    return a.index - b.index;
  });

  return indexed.map(({ project }) => project);
}