import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Reveal from '../../components/Reveal';
import PayoutReportCard from '../../components/PayoutReportCard';
import { ApiError } from '../../api/client';
import {
  payoutsApi,
} from '../../api/payouts';
import type { PayoutReport } from '../../types/payouts';

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-full border border-slate-200 px-4 py-2 text-sm font-bold transition-colors',
        active
          ? 'bg-primary text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function PayoutsPage() {
  const [searchParams] = useSearchParams();
  const projectId = (searchParams.get('projectId') ?? '').trim();
  const isProjectMode = projectId.length > 0;

  const [reports, setReports] = useState<PayoutReport[]>([]);
  const [projectReport, setProjectReport] = useState<PayoutReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState<'all' | string>('all');

  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isProjectMode) {
        const detail = await payoutsApi.getByProjectId(projectId);
        if (!mountedRef.current) return;
        setProjectReport(detail);
        setReports([]);
      } else {
        const data = await payoutsApi.list();
        if (!mountedRef.current) return;
        setReports(data);
        setProjectReport(null);
      }
    } catch (e) {
      if (!mountedRef.current) return;

      if (e instanceof ApiError && isProjectMode) {
        if (e.status === 404) {
          setError('등록된 정산 내역이 없습니다.');
        } else if (e.status === 403) {
          setError('마감된 프로젝트만 정산을 확인할 수 있습니다.');
        } else {
          setError(e.message || '정산 내역을 불러오지 못했습니다.');
        }
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isProjectMode, projectId]);

  useEffect(() => {
    mountedRef.current = true;
    // 정산 내역 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [projectId]);

  const terms = useMemo(() => {
    const set = new Set(reports.map((r) => r.term));
    return Array.from(set).sort().reverse();
  }, [reports]);

  const filtered = useMemo(() => {
    if (term === 'all') return reports;
    return reports.filter((r) => r.term === term);
  }, [reports, term]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-primary">정산</h1>
            <p className="mt-2 text-slate-600">
              {isProjectMode
                ? '프로젝트 정산 내역입니다.'
                : '학기별 정산 내역을 확인할 수 있어요.'}
            </p>
          </div>

          {isProjectMode && (
            <Link
              to={projectId ? `/projects/${projectId}` : '/projects'}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              프로젝트로 돌아가기
            </Link>
          )}
        </div>
      </Reveal>

      {!isProjectMode && (
        <Reveal delayMs={60} className="mt-6 flex flex-wrap gap-2">
          <TabButton active={term === 'all'} onClick={() => setTerm('all')}>
            전체
          </TabButton>
          {terms.map((t) => (
            <TabButton key={t} active={term === t} onClick={() => setTerm(t)}>
              {t}
            </TabButton>
          ))}
        </Reveal>
      )}

      {loading && (
        <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          정산 내역 불러오는 중...
        </Reveal>
      )}

      {!loading && error && (
        <Reveal className="mt-6 rounded-3xl border border-rose-200 bg-white p-8">
          <div className="text-sm font-bold text-rose-700">{error}</div>
          <button
            onClick={() => void load()}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            다시 시도
          </button>
        </Reveal>
      )}

      {!loading && !error && isProjectMode && !projectReport && (
        <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          연결된 정산 내역이 없습니다.
        </Reveal>
      )}

      {!loading && !error && isProjectMode && projectReport && (
        <Reveal delayMs={90} className="mt-8">
          <PayoutReportCard report={projectReport} simplified />
        </Reveal>
      )}

      {!loading && !error && !isProjectMode && filtered.length === 0 && (
        <Reveal className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
          등록된 정산 내역이 없어요.
        </Reveal>
      )}

      {!loading && !error && !isProjectMode && filtered.length > 0 && (
        <div className="mt-8 space-y-4">
          {filtered.map((report) => (
            <Reveal key={report.id} delayMs={90}>
              <PayoutReportCard report={report} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
