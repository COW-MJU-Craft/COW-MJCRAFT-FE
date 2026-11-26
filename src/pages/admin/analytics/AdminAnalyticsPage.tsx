import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import {
  adminAnalyticsApi,
  type AdminAnalyticsChannel,
  type AdminAnalyticsDaily,
} from '../../../api/admin/analytics';
import { ApiError } from '../../../api/core/client';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  channelName,
  conversionRate,
  fillDaily,
  formatRate,
  hasCampaign,
  isValidRange,
  niceMax,
  peakDay,
  recentRange,
  todayInKst,
  totals,
} from '../../../utils/admin/analytics';

const PRESETS = [7, 14, 30, 90] as const;
const DEFAULT_DAYS = 30;

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return '관리자 로그인을 확인해주세요.';
    }
    if (error.status === 400) {
      return '조회 기간을 확인해주세요. 최대 366일까지 조회할 수 있어요.';
    }
    if (error.status === 503) {
      return '분석 연동이 아직 설정되지 않았어요. 서버 설정(GA 속성 ID, 서비스 계정 키)을 확인해주세요.';
    }
    if (error.status === 502) {
      return 'Google Analytics에서 데이터를 가져오지 못했어요. 잠시 후 다시 시도해주세요.';
    }
  }
  return '분석 데이터를 불러오지 못했어요. 다시 시도해주세요.';
}

export default function AdminAnalyticsPage() {
  const [today] = useState(() => todayInKst());
  const [days, setDays] = useState<number | null>(DEFAULT_DAYS);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(() => {
    if (days !== null) return recentRange(days, today);
    return { from: customFrom, to: customTo };
  }, [days, today, customFrom, customTo]);
  const rangeValid = isValidRange(range.from, range.to);

  const report = useQuery({
    queryKey: ['admin-analytics-channels', range.from, range.to],
    queryFn: () => adminAnalyticsApi.channels(range.from, range.to),
    enabled: rangeValid,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const data = report.data;
  const sum = useMemo(() => totals(data?.channels ?? []), [data]);
  const daily = useMemo(
    () => (data ? fillDaily(data.daily, data.from, data.to) : []),
    [data],
  );
  const peak = useMemo(() => peakDay(daily), [daily]);
  const totalSessions = useMemo(
    () => daily.reduce((acc, day) => acc + day.sessions, 0),
    [daily],
  );

  const selectPreset = (value: number) => {
    setDays(value);
  };

  const startCustom = () => {
    if (days !== null) {
      setCustomFrom(range.from);
      setCustomTo(range.to);
    }
    setDays(null);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary">유입 분석</h1>
          <p className="mt-1 text-sm text-slate-600">
            어떤 경로로 들어온 방문이 주문까지 이어졌는지 확인해요.
          </p>
        </div>
        <button
          type="button"
          title="새로고침"
          aria-label="새로고침"
          disabled={!rangeValid || report.isFetching}
          onClick={() => void report.refetch()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"
        >
          <RefreshCw
            size={18}
            className={report.isFetching ? 'animate-spin' : undefined}
          />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-slate-200 pb-5">
        <div
          role="group"
          aria-label="조회 기간"
          className="flex flex-wrap gap-2"
        >
          {PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              onClick={() => selectPreset(value)}
              className={[
                'h-11 rounded-lg border px-4 text-sm font-semibold',
                days === value
                  ? 'border-primary bg-primary text-white'
                  : 'border-slate-300 bg-white text-slate-700',
              ].join(' ')}
            >
              최근 {value}일
            </button>
          ))}
          <button
            type="button"
            aria-pressed={days === null}
            onClick={startCustom}
            className={[
              'h-11 rounded-lg border px-4 text-sm font-semibold',
              days === null
                ? 'border-primary bg-primary text-white'
                : 'border-slate-300 bg-white text-slate-700',
            ].join(' ')}
          >
            직접 지정
          </button>
        </div>

        {days === null && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm font-semibold">
              시작일
              <input
                type="date"
                value={customFrom}
                max={customTo || today}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              종료일
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={today}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3"
              />
            </label>
          </div>
        )}

        <p className="ml-auto text-sm text-slate-500">
          {rangeValid ? `${range.from} ~ ${range.to}` : '기간을 선택해주세요.'}
        </p>
      </div>

      {days === null && !rangeValid && (
        <p className="py-5 text-sm text-slate-600">
          시작일과 종료일을 모두 고르면 조회돼요. 최대 366일까지 볼 수 있어요.
        </p>
      )}

      {rangeValid && report.isPending && (
        <AnalyticsSkeleton />
      )}

      {report.isError && (
        <div role="alert" className="py-5 text-sm text-rose-700">
          {errorMessage(report.error)}
        </div>
      )}

      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 py-5 lg:grid-cols-4">
            <Metric label="방문 (세션)" value={sum.sessions.toLocaleString('ko-KR')} />
            <Metric
              label="상품 조회 사용자"
              value={sum.viewItem.toLocaleString('ko-KR')}
              hint="채널 합계"
            />
            <Metric
              label="주문 사용자"
              value={sum.orders.toLocaleString('ko-KR')}
              hint="채널 합계"
            />
            <Metric
              label="전환율"
              value={formatRate(conversionRate(sum.orders, sum.users))}
              hint="주문 사용자 ÷ 방문 사용자"
            />
          </dl>

          <div className="border-b border-slate-200 pb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">일별 방문</h2>
              {peak && (
                <p className="text-sm text-slate-600">
                  가장 많았던 날 {peak.date} · {peak.sessions.toLocaleString('ko-KR')}회
                </p>
              )}
            </div>
            <DailyChart daily={daily} total={totalSessions} />
          </div>

          <div className="py-6">
            <h2 className="text-lg font-bold">채널별 방문 → 주문</h2>
            <p className="mt-1 text-sm text-slate-600">
              각 단계는 해당 채널로 들어온 사용자 중 그 행동을 한 사람 수예요. 단계끼리
              더하면 중복돼요.
            </p>
            <ChannelTable channels={data.channels} />
          </div>

          <ul className="space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <li>
              Google Analytics 집계라서 최근 몇 시간은 숫자가 덜 잡힐 수 있고, 같은
              기간은 15분 동안 같은 결과를 보여줘요.
            </li>
            <li>
              UTM 링크로 들어온 방문은 캠페인 이름이 함께 표시돼요. UTM이 없으면
              유입 출처만 나뉘어요.
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const CHART_W = 720;
const CHART_H = 220;
const PAD = { left: 44, right: 8, top: 16, bottom: 28 };

function DailyChart({
  daily,
  total,
}: {
  daily: AdminAnalyticsDaily[];
  total: number;
}) {
  if (daily.length === 0) {
    return (
      <p className="py-6 text-sm text-slate-500">
        이 기간에는 집계된 방문이 없어요.
      </p>
    );
  }

  const max = niceMax(Math.max(...daily.map((day) => day.sessions)));
  const plotW = CHART_W - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const slot = plotW / daily.length;
  const barW = Math.max(2, slot * 0.7);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio);
  // 날짜 라벨은 겹치지 않게 일정 간격으로만 표시한다.
  const labelEvery = Math.max(1, Math.ceil(daily.length / 8));

  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label={`일별 방문 막대 그래프. 기간 합계 ${total.toLocaleString('ko-KR')}회`}
        className="h-auto w-full"
      >
        {ticks.map((tick) => {
          const y = PAD.top + plotH - (tick / max) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={CHART_W - PAD.right}
                y1={y}
                y2={y}
                className="stroke-slate-200"
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px]"
              >
                {Math.round(tick).toLocaleString('ko-KR')}
              </text>
            </g>
          );
        })}
        {daily.map((day, index) => {
          const height = (day.sessions / max) * plotH;
          const x = PAD.left + index * slot + (slot - barW) / 2;
          const y = PAD.top + plotH - height;
          return (
            <g key={day.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={height}
                rx={2}
                className="fill-primary"
              >
                <title>{`${day.date} · 세션 ${day.sessions.toLocaleString('ko-KR')} · 사용자 ${day.users.toLocaleString('ko-KR')}`}</title>
              </rect>
              {index % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={CHART_H - 8}
                  textAnchor="middle"
                  className="fill-slate-500 text-[11px]"
                >
                  {day.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        {daily
          .map((day) => `${day.date} ${day.sessions}회`)
          .join(', ')}
      </figcaption>
    </figure>
  );
}

function ChannelTable({ channels }: { channels: AdminAnalyticsChannel[] }) {
  if (channels.length === 0) {
    return (
      <p className="py-6 text-sm text-slate-500">
        이 기간에는 집계된 유입이 없어요.
      </p>
    );
  }

  const maxSessions = Math.max(...channels.map((channel) => channel.sessions), 1);

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-sm tabular-nums">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-600">
            <th scope="col" className="px-3 py-2.5 font-semibold">
              유입 채널
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              세션
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              사용자
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              상품 조회
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              장바구니
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              결제 시작
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              주문
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              전환율
            </th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => {
            const rate = conversionRate(channel.orders, channel.users);
            return (
              <tr
                key={`${channel.source}|${channel.medium}|${channel.campaign}`}
                className="border-b border-slate-100 last:border-0"
              >
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                  <span className="block break-words">
                    {channelName(channel)}
                  </span>
                  <span className="block text-xs font-normal text-slate-500">
                    {channel.source} / {channel.medium}
                    {hasCampaign(channel.campaign) && (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                        {channel.campaign}
                      </span>
                    )}
                  </span>
                </th>
                <td className="relative px-3 py-2.5 text-right">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-3 left-2 rounded-sm bg-slate-200"
                    style={{
                      width: `${(channel.sessions / maxSessions) * 35}%`,
                    }}
                  />
                  <span className="relative">
                    {channel.sessions.toLocaleString('ko-KR')}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {channel.users.toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {channel.viewItem.toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {channel.addToCart.toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {channel.beginCheckout.toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">
                  {channel.orders.toLocaleString('ko-KR')}
                </td>
                <td
                  className={[
                    'px-3 py-2.5 text-right',
                    rate >= 1
                      ? 'font-semibold text-emerald-700'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  {formatRate(rate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 실제 화면과 같은 배치(요약 카드, 막대 그래프, 표)로 자리를 잡아 두어
// 데이터가 들어와도 화면이 출렁이지 않게 한다.
const SKELETON_BAR_HEIGHTS = [28, 45, 22, 60, 38, 75, 50, 34, 66, 42, 55, 30];

function AnalyticsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="motion-reduce:[&_*]:animate-none">
      <span className="sr-only">분석 데이터를 불러오는 중이에요.</span>

      <div aria-hidden="true">
        <div className="grid grid-cols-2 gap-3 py-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="mt-3 h-7 w-24" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <div className="mt-4 flex h-[220px] items-end gap-2 rounded-lg border border-slate-100 bg-white px-4 pb-6 pt-4">
            {SKELETON_BAR_HEIGHTS.map((height, index) => (
              <div
                key={index}
                className="flex h-full flex-1 items-end"
              >
                <Skeleton
                  className="w-full rounded-t-md rounded-b-none bg-slate-200/80"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 80}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex gap-4 border-b border-slate-200 px-3 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="ml-auto h-3 w-12" />
              <Skeleton className="hidden h-3 w-12 sm:block" />
              <Skeleton className="hidden h-3 w-12 md:block" />
              <Skeleton className="h-3 w-12" />
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 border-b border-slate-100 px-3 py-3 last:border-0"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="ml-auto h-3.5 w-10" />
                <Skeleton className="hidden h-3.5 w-10 sm:block" />
                <Skeleton className="hidden h-3.5 w-10 md:block" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Google Analytics에서 데이터를 가져오는 중이에요. 처음에는 몇 초 걸릴 수 있어요.
        </p>
      </div>
    </div>
  );
}
