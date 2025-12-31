// src/pages/ProjectsPage.tsx
import { useSearchParams } from 'react-router-dom';
import Reveal from '../components/Reveal';
import ProjectCard from '../components/ProjectCard';
import { projects } from '../api/mock/projects';
import type { ProjectStatus } from '../api/mock/projects';

type TabValue = ProjectStatus | 'all';

const TABS: { label: string; value: TabValue }[] = [
  { label: '전체', value: 'all' },
  { label: '진행중', value: 'active' },
  { label: '준비중', value: 'upcoming' },
  { label: '마감', value: 'closed' },
];

function isProjectStatus(v: string): v is ProjectStatus {
  return v === 'active' || v === 'upcoming' || v === 'closed';
}

export default function ProjectsPage() {
  const [sp, setSp] = useSearchParams();

  const raw = sp.get('status');
  const status: TabValue = raw ? (isProjectStatus(raw) ? raw : 'all') : 'all';

  const filtered =
    status === 'all' ? projects : projects.filter((p) => p.status === status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <h1 className="font-heading text-3xl text-primary">프로젝트</h1>
        <p className="mt-2 text-slate-600">
          진행 상태에 따라 프로젝트를 확인할 수 있어요.
        </p>
      </Reveal>

      {/* Tabs */}
      <Reveal delayMs={80} className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = status === t.value;

          return (
            <button
              key={t.value}
              onClick={() => {
                if (t.value === 'all') setSp({});
                else setSp({ status: t.value });
              }}
              className={[
                'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                'border border-slate-200',
                active
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </Reveal>

      {/* List */}
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        {filtered.length === 0 ? (
          <Reveal className="md:col-span-3 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
            해당 상태의 프로젝트가 아직 없어요.
          </Reveal>
        ) : (
          filtered.map((p, i) => (
            <Reveal key={p.id} delayMs={i * 60}>
              <ProjectCard project={p} />
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}
