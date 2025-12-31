// src/components/StatusBadge.tsx
import type { ProjectStatus } from '../api/mock/projects';

const LABEL: Record<ProjectStatus, string> = {
  upcoming: '준비중',
  active: '진행중',
  closed: '마감',
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const cls =
    status === 'active'
      ? 'bg-primary/10 text-primary'
      : status === 'upcoming'
      ? 'bg-slate-100 text-slate-700'
      : 'bg-slate-100 text-slate-500';

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls}`}>
      {LABEL[status]}
    </span>
  );
}
