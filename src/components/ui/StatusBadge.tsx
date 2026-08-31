import type { ProjectStatus } from '../../api/projects';

const LABEL: Record<ProjectStatus, string> = {
  PREPARING: '준비중',
  OPEN: '진행중',
  CLOSED: '마감',
};

export default function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const cls =
    status === 'OPEN'
      ? 'bg-emerald-50 text-emerald-600'
      : status === 'PREPARING'
      ? 'bg-slate-100 text-slate-600'
      : 'bg-rose-50 text-rose-600';

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${cls} ${
        className ?? ''
      }`}
    >
      {LABEL[status]}
    </span>
  );
}
