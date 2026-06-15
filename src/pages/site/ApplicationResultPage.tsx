import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Reveal from '../../components/Reveal';
import ApplicationCheckForm from '../../components/ApplicationCredentialForm';
import { applicationsApi } from '../../api/applications';

type ResultTone = 'neutral' | 'success' | 'danger';

function normalizeResult(raw?: string | null) {
  const status = (raw ?? '').toUpperCase();
  if (!status || status.includes('NOT') || status.includes('PUBLISH')) {
    return { label: '미발표', tone: 'neutral' as ResultTone };
  }
  if (
    status.includes('PASS') ||
    status.includes('ACCEPT') ||
    status.includes('SUCCESS')
  ) {
    return { label: '합격', tone: 'success' as ResultTone };
  }
  if (status.includes('FAIL') || status.includes('REJECT')) {
    return { label: '불합격', tone: 'danger' as ResultTone };
  }
  return { label: raw ?? '미발표', tone: 'neutral' as ResultTone };
}

function parseFormIdParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default function ApplicationResultPage() {
  const [searchParams] = useSearchParams();
  const formId = parseFormIdParam(searchParams.get('formId'));
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const resultCardRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(
    () => normalizeResult(resultStatus),
    [resultStatus],
  );

  const toneStyle = useMemo(() => {
    if (normalized.tone === 'success') {
      return {
        card: 'border-emerald-300 bg-emerald-50/70',
        badge: 'bg-emerald-600 text-white',
        title: 'text-emerald-800',
        stripe: 'bg-emerald-600',
      };
    }
    if (normalized.tone === 'danger') {
      return {
        card: 'border-rose-300 bg-rose-50/70',
        badge: 'bg-rose-600 text-white',
        title: 'text-rose-800',
        stripe: 'bg-rose-600',
      };
    }
    return {
      card: 'border-amber-400 bg-amber-50',
      badge: 'bg-amber-600 text-white',
      title: 'text-amber-900',
      stripe: 'bg-amber-600',
    };
  }, [normalized.tone]);

  const statusHint = useMemo(() => {
    if (normalized.tone === 'success') {
      return '축하드립니다! 최종 합격이 확인되었습니다. 이후 일정과 추가적인 안내는 공지사항 및 개별 안내를 꼭 확인해주세요.';
    }
    if (normalized.tone === 'danger') {
      return '이번 모집에서는 아쉽게도 함께하지 못하게 되었습니다. 지원해주셔서 감사드리며, 다음 모집에서 다시 만나길 기대하겠습니다.';
    }
    return '현재 결과가 아직 발표되지 않았습니다. 내부 검토 및 집계가 완료되는 대로 순차적으로 공개될 예정이니, 잠시 후 다시 조회해주세요.';
  }, [normalized.tone]);

  useEffect(() => {
    if (!resultStatus) return;
    requestAnimationFrame(() => {
      const el = resultCardRef.current;
      if (!el) return;
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({
        top: Math.max(0, y),
        behavior: 'smooth',
      });
    });
  }, [resultStatus]);

  const handleLookup = async () => {
    setError(null);
    setResultStatus(null);
    setMessage(null);

    if (!studentId.trim() || !password.trim()) {
      setError('학번과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await applicationsApi.getResult({
        formId,
        studentId: studentId.trim(),
        password: password.trim(),
      });
      setResultStatus(res?.resultStatus ?? 'NOT_PUBLISHED');
      setMessage(res?.message ?? null);
    } catch {
      setError('조회된 결과가 없습니다. 학번 또는 비밀번호를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Reveal>
        <h1 className="font-heading text-3xl text-primary">결과 조회</h1>
        <p className="mt-2 text-sm text-slate-600">
          학번/비밀번호로 지원 결과를 확인할 수 있어요.
        </p>
      </Reveal>

      <Reveal delayMs={100} className="mt-8">
        <ApplicationCheckForm
          title="결과 조회"
          description="학번과 비밀번호를 입력해 합격 여부를 확인하세요."
          studentId={studentId}
          password={password}
          loading={loading}
          error={error}
          buttonLabel="결과 조회"
          onChangeStudentId={setStudentId}
          onChangePassword={setPassword}
          onSubmit={handleLookup}
        />
      </Reveal>

      {resultStatus && (
        <div ref={resultCardRef}>
          <Reveal
            delayMs={160}
            className={[
              'mt-6 relative overflow-hidden rounded-3xl border p-8 shadow-sm',
              toneStyle.card,
            ].join(' ')}
          >
            <div
              className={[
                'absolute left-0 top-0 h-full w-2',
                toneStyle.stripe,
              ].join(' ')}
            />
            <p className="text-sm font-semibold text-slate-500">조회 결과</p>
            <div className="mt-4 flex items-center gap-3">
              <span
                className={[
                  'inline-flex rounded-full px-4 py-1.5 text-sm font-bold',
                  toneStyle.badge,
                ].join(' ')}
              >
                RESULT
              </span>
              <span
                className={[
                  'text-3xl font-extrabold tracking-tight',
                  toneStyle.title,
                ].join(' ')}
              >
                {normalized.label}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {statusHint}
            </p>
            {message && (
              <p className="mt-5 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap">
                {message}
              </p>
            )}
          </Reveal>
        </div>
      )}
    </div>
  );
}
