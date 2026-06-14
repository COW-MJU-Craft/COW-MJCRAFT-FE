import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Reveal from '../../components/Reveal';
import { applicationsApi } from '../../api/applications';

const ACTIONS = [
  { to: '/apply/new', title: '지원하기', hint: '모집 중인 지원서 양식 작성' },
  { to: '/apply/manage', title: '지원서 조회/수정', hint: '학번 · 비밀번호 필요' },
  { to: '/apply/result', title: '결과 조회', hint: '학번 · 비밀번호 필요' },
];

export default function ApplyEntryPage() {
  const { data: activeForm } = useQuery({
    queryKey: ['applicationForm'],
    queryFn: () => applicationsApi.getForm(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-heading text-3xl text-primary hover:opacity-90"
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
          지원하기
        </Link>
      </Reveal>

      <Reveal delayMs={60} className="mt-8">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-7 py-5">
          {activeForm ? (
            <>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                모집중
              </span>
              <p className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">
                {activeForm.title ?? '지원서 양식'}
              </p>
            </>
          ) : (
            <>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                모집 없음
              </span>
              <p className="text-sm text-slate-500">
                현재 모집 중인 지원서가 없어요.
              </p>
            </>
          )}
        </div>
      </Reveal>

      <Reveal delayMs={120} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-7 py-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60"
            >
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {action.title}
                </p>
                <p className="mt-1 text-sm text-slate-400">{action.hint}</p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <ArrowRight className="h-[18px] w-[18px]" />
              </span>
            </Link>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
