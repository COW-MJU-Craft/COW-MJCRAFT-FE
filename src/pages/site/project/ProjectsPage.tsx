import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Reveal from '../../../components/ui/Reveal';
import ProjectCard from '../../../components/project/ProjectCard';
import PayoutReportCard from '../../../components/payout/PayoutReportCard';
import { SkeletonProjectCard } from '../../../components/ui/Skeleton';
import { projectsApi } from '../../../api/projects';
import { payoutsApi } from '../../../api/payouts';
import type { PayoutReport } from '../../../types/payouts';
import type { Project } from '../../../api/projects';
import { sortProjects } from '../../../utils/projectSort';

type TabValue = 'all' | 'OPEN' | 'PREPARING' | 'CLOSED' | 'PAYOUT';

const TABS: { label: string; value: TabValue }[] = [
  { label: '전체', value: 'all' },
  { label: '진행 중', value: 'OPEN' },
  { label: '준비중', value: 'PREPARING' },
  { label: '마감', value: 'CLOSED' },
  { label: '정산', value: 'PAYOUT' },
];

function isTabValue(v: string): v is TabValue {
  return (
    v === 'all' ||
    v === 'OPEN' ||
    v === 'PREPARING' ||
    v === 'CLOSED' ||
    v === 'PAYOUT'
  );
}

function getYearFromProject(project: Project): string | null {
  const raw = project.deadlineDate ?? project.endAt;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? String(raw[0]) : null;
  if (typeof raw === 'string' && raw.length >= 4) return raw.slice(0, 4);
  return null;
}

function sortPinned(items: Project[]) {
  const base = sortProjects(items);
  const index = new Map(base.map((p, i) => [p.id, i]));
  return [...items].sort((a, b) => {
    const ao = a.pinnedOrder ?? Number.POSITIVE_INFINITY;
    const bo = b.pinnedOrder ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0);
  });
}

function formatTermLabel(term: string) {
  const matched = term.match(/(\d{4})\D*(\d{1,2})?/);
  if (!matched) return term;
  const year = matched[1];
  const semester = matched[2];
  if (!semester) return `${year}년도`;
  return `${year}년도 ${Number(semester)}학기`;
}

export default function ProjectsPage() {
  const [sp, setSp] = useSearchParams();
  const [openPayoutIds, setOpenPayoutIds] = useState<Record<string, boolean>>(
    {},
  );

  const raw = sp.get('status');
  const status: TabValue = raw ? (isTabValue(raw) ? raw : 'all') : 'all';

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    placeholderData: (prev) => prev,
  });

  const projects = useMemo(() => data ?? [], [data]);
  const {
    data: payoutData,
    isLoading: payoutsLoading,
    isError: payoutsError,
  } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => payoutsApi.list(),
    enabled: status === 'PAYOUT',
    placeholderData: (prev) => prev,
  });

  const statusCounts = useMemo(() => {
    return projects.reduce(
      (acc, project) => {
        acc.all += 1;
        if (project.status === 'OPEN') acc.OPEN += 1;
        if (project.status === 'PREPARING') acc.PREPARING += 1;
        if (project.status === 'CLOSED') acc.CLOSED += 1;
        return acc;
      },
      { all: 0, OPEN: 0, PREPARING: 0, CLOSED: 0 },
    );
  }, [projects]);

  const filtered = useMemo(() => {
    if (status === 'all') return projects;
    if (status === 'OPEN') return projects.filter((p) => p.status === 'OPEN');
    if (status === 'PREPARING')
      return projects.filter((p) => p.status === 'PREPARING');
    if (status === 'CLOSED')
      return projects.filter((p) => p.status === 'CLOSED');
    return [];
  }, [projects, status]);

  const sortedPayouts = useMemo(() => {
    const list = (payoutData ?? []).slice();
    const parseTerm = (term: string) => {
      const matched = term.match(/(\d{4})\D*(\d{1,2})?/);
      if (!matched) return { year: 0, seq: 0 };
      return {
        year: Number(matched[1] ?? 0),
        seq: Number(matched[2] ?? 0),
      };
    };

    const toNumericId = (report: PayoutReport) => {
      const n = Number(report.id);
      return Number.isFinite(n) ? n : 0;
    };

    return list.sort((a, b) => {
      const ta = parseTerm(a.term);
      const tb = parseTerm(b.term);
      if (tb.year !== ta.year) return tb.year - ta.year;
      if (tb.seq !== ta.seq) return tb.seq - ta.seq;
      return toNumericId(b) - toNumericId(a);
    });
  }, [payoutData]);

  const togglePayout = (id: string) => {
    setOpenPayoutIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { pinnedProjects, yearSections } = useMemo(() => {
    const pinned = filtered.filter((p) => p.pinned);
    const unpinned = filtered.filter((p) => !p.pinned);
    const grouped = unpinned.reduce<Record<string, Project[]>>(
      (acc, project) => {
        const year = getYearFromProject(project) ?? '기타';
        if (!acc[year]) acc[year] = [];
        acc[year].push(project);
        return acc;
      },
      {},
    );

    const yearEntries = Object.entries(grouped).sort((a, b) => {
      if (a[0] === '기타') return 1;
      if (b[0] === '기타') return -1;
      return Number(b[0]) - Number(a[0]);
    });

    return {
      pinnedProjects: sortPinned(pinned),
      yearSections: yearEntries.map(
        ([year, items]) => [year, sortProjects(items)] as const,
      ),
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <Reveal>
          <section className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-sky-50/70 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-12 bottom-0 h-28 w-28 rounded-full bg-sky-200/45 blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-primary shadow-sm transition hover:bg-slate-50"
                  aria-label="홈으로 이동"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </Link>
                <div>
                  <h1 className="font-heading text-4xl leading-none text-primary sm:text-5xl">
                    컬렉션
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 sm:text-base">
                    진행 중인 프로젝트와 상품을 만나보세요
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur">
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                  {TABS.map((t) => {
                    const active = status === t.value;
                    const count =
                      t.value === 'all'
                        ? statusCounts.all
                        : t.value === 'OPEN'
                          ? statusCounts.OPEN
                          : t.value === 'PREPARING'
                            ? statusCounts.PREPARING
                            : t.value === 'CLOSED'
                              ? statusCounts.CLOSED
                              : undefined;

                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          if (t.value === 'all') setSp({});
                          else setSp({ status: t.value });
                        }}
                        className={[
                          'inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl px-4 text-sm font-bold transition-all',
                          active
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100',
                        ].join(' ')}
                      >
                        <span>{t.label}</span>
                        {typeof count === 'number' && (
                          <span
                            className={[
                              'rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                              active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isFetching && !isLoading && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-500">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  새로고치는 중
                </div>
              )}
            </div>
          </section>
        </Reveal>

        {status === 'PAYOUT' ? (
          payoutsLoading ? (
            <section className="mt-8">
              <Reveal className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">
                정산 내역 불러오는 중...
              </Reveal>
            </section>
          ) : payoutsError ? (
            <Reveal className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              정산 내역을 불러오지 못했어요
            </Reveal>
          ) : sortedPayouts.length === 0 ? (
            <Reveal className="mt-8 rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
              등록된 정산 내역이 없어요
            </Reveal>
          ) : (
            <section className="mt-8 space-y-3 md:mx-auto md:w-full md:max-w-4xl">
              {sortedPayouts.map((report, idx) => {
                const open = Boolean(openPayoutIds[report.id]);
                return (
                  <Reveal key={report.id} delayMs={idx * 40}>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => togglePayout(report.id)}
                        className="flex w-full items-center justify-between px-5 py-5 text-left transition hover:bg-slate-50 md:py-6"
                        aria-expanded={open}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-800">
                            {report.projectTitle?.trim() || '프로젝트명 미입력'}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {formatTermLabel(report.term)}
                          </p>
                        </div>

                        <span className="text-sm font-bold text-slate-500">
                          {open ? '닫기' : '보기'}
                        </span>
                      </button>

                      {open && (
                        <div className="border-t border-slate-200 p-4 sm:p-5">
                          <PayoutReportCard
                            report={report}
                            simplified
                            embedded
                            showHeader={false}
                          />
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </section>
          )
        ) : isLoading ? (
          <section className="mt-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <SkeletonProjectCard key={idx} />
              ))}
            </div>
          </section>
        ) : isError ? (
          <Reveal className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            프로젝트를 불러오지 못했어요
          </Reveal>
        ) : (
          <>
            {pinnedProjects.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-800">추천 프로젝트</h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {pinnedProjects.length}개
                  </span>
                </div>

                <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
                  {pinnedProjects.map((p, i) => (
                    <div
                      key={p.id}
                      className="min-w-[84%] snap-start sm:min-w-0"
                    >
                      <Reveal delayMs={i * 40}>
                        <ProjectCard
                          project={p}
                          size="large"
                          showApplyAction={false}
                        />
                      </Reveal>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {yearSections.map(([year, sectionItems], sectionIndex) => (
              <section key={year} className="mt-10 first:mt-8">
                <div className="mb-4 flex items-end justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-800">
                    {year === '기타' ? '기타' : `${year} 컬렉션`}
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {sectionItems.length}개
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {sectionItems.map((p, i) => (
                    <Reveal key={p.id} delayMs={(sectionIndex + i) * 30}>
                      <ProjectCard
                        project={p}
                        size="large"
                        showApplyAction={false}
                      />
                    </Reveal>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
