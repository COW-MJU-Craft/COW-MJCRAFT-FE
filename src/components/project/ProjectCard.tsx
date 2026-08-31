import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Pin, Receipt } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import type { Project } from '../../api/projects';

type ProjectCardProps = {
  project: Project;
  showApplyAction?: boolean;
  size?: 'default' | 'large' | 'main';
};

export default function ProjectCard({
  project,
  showApplyAction = true,
  size = 'default',
}: ProjectCardProps) {
  const navigate = useNavigate();
  const canApply = project.status === 'OPEN';
  const deadlineText = project.deadlineDate || project.endAt || '';
  const isLarge = size === 'large';
  const isMain = size === 'main';
  const isClosed = project.status === 'CLOSED';
  const [imgLoaded, setImgLoaded] = useState(false);

  const imageHeightClass = isMain
    ? 'h-52 sm:h-56'
    : isLarge
      ? 'h-44 sm:h-48'
      : 'h-36 sm:h-40';

  const goPayout = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/payouts?projectId=${project.id}`);
  };

  return (
    <div
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 ease-out hover:border-primary/25 hover:shadow-lg hover:shadow-slate-200/60 sm:rounded-3xl"
      role="article"
      aria-label={project.title}
    >
      <Link
        to={`/projects/${project.id}`}
        className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div className={`relative overflow-hidden bg-slate-100 ${imageHeightClass}`}>
          {project.thumbnailUrl ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-slate-200" />
              )}
              <img
                src={project.thumbnailUrl}
                alt={project.title}
                loading="lazy"
                decoding="async"
                onLoad={() => setImgLoaded(true)}
                className={[
                  'h-full w-full object-cover transition-all duration-300 ease-out group-hover:scale-105',
                  imgLoaded ? 'opacity-100' : 'opacity-0',
                ].join(' ')}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
              대표 이미지 없음
            </div>
          )}
          {project.pinned && (
            <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm sm:text-xs">
              <Pin className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" />
              고정
            </div>
          )}

          {isClosed && (
            <button
              type="button"
              onClick={goPayout}
              aria-label="정산 내역 보기"
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-sky-700 shadow-sm backdrop-blur-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:text-sm"
            >
              <Receipt className="h-4 w-4" />
              정산
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={project.status} />
            {project.status === 'CLOSED' ? (
              <span className="inline-flex items-center gap-1 text-xs leading-none text-slate-600 sm:text-sm">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700">마감됨</span>
              </span>
            ) : deadlineText ? (
              <span className="inline-flex items-center gap-1 text-xs leading-none text-slate-600 sm:text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                마감:{' '}
                <span className="font-medium text-slate-700">{deadlineText}</span>
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-1 flex-col">
            <div className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-primary sm:text-lg">
              {project.title}
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-slate-600 sm:text-sm">
              {project.summary}
            </p>
            <div className="h-3" />
          </div>
        </div>
      </Link>

      <div className="flex gap-2 px-4 pb-4 pt-0 sm:px-5">
        <Link
          to={`/projects/${project.id}`}
          className="flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 text-center text-sm font-bold text-slate-800 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          상품 보러 가기
        </Link>
        {showApplyAction &&
          (canApply ? (
            <Link
              to={`/projects/${project.id}#apply`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all hover:opacity-95 hover:shadow-md active:scale-[0.98]"
            >
              신청하기
            </Link>
          ) : (
            <button
              disabled
              className="flex min-h-10 items-center justify-center rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-500"
            >
              {project.status === 'CLOSED' ? '마감' : '준비중'}
            </button>
          ))}
      </div>
    </div>
  );
}
