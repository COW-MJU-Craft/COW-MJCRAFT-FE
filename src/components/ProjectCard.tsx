// src/components/ProjectCard.tsx
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import type { Project } from '../api/mock/projects';

function formatPrice(n?: number) {
  if (typeof n !== 'number') return null;
  return `${n.toLocaleString()}원`;
}

export default function ProjectCard({ project }: { project: Project }) {
  const canApply = project.status === 'active';

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="h-40 bg-slate-100" />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status} />
          <span className="text-xs text-slate-500">
            {project.startAt} ~ {project.endAt}
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="text-lg font-bold text-slate-900">
            {project.title}
          </div>
          {formatPrice(project.price) && (
            <div className="shrink-0 text-sm font-bold text-primary">
              {formatPrice(project.price)}
            </div>
          )}
        </div>

        <p className="mt-2 text-sm text-slate-600">{project.summary}</p>

        <div className="mt-4 flex gap-2">
          <Link
            to={`/projects/${project.id}`}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            상세 보기
          </Link>

          {canApply ? (
            <Link
              to={`/projects/${project.id}#apply`}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              신청하기
            </Link>
          ) : (
            <button
              disabled
              className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500"
            >
              {project.status === 'closed' ? '마감' : '준비중'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
