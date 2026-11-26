import type {
  AdminAnalyticsChannel,
  AdminAnalyticsDaily,
} from '../../api/admin/analytics';

// GA가 UTM이 없는 방문에 자동으로 채우는 캠페인 값. 이 값들은 "캠페인"으로 보여주지 않는다.
const DEFAULT_CAMPAIGNS = new Set([
  '(referral)',
  '(direct)',
  '(organic)',
  '(not set)',
  '(cross-network)',
  '(data not available)',
]);

const SOURCE_LABELS: Record<string, string> = {
  'everytime.kr': '에브리타임',
  'linktr.ee': '링크트리',
  'l.instagram.com': '인스타그램',
  'instagram.com': '인스타그램',
  instagram: '인스타그램',
  'kakao.com': '카카오',
  kakao: '카카오',
  'naver.com': '네이버',
  'qr.naver.com': '네이버 QR',
  google: '구글',
  bing: '빙',
  'chatgpt.com': 'ChatGPT',
};

export function channelName(channel: {
  source: string;
  medium: string;
}): string {
  if (channel.source === '(direct)') return '직접 방문';
  if (channel.source === '(not set)') return '분류 안 됨';
  const label = SOURCE_LABELS[channel.source];
  if (label && channel.medium === 'organic') return `${label} 검색`;
  return label ?? channel.source;
}

export function hasCampaign(campaign: string): boolean {
  return !DEFAULT_CAMPAIGNS.has(campaign) && campaign.trim().length > 0;
}

export function conversionRate(orders: number, users: number): number {
  if (users <= 0) return 0;
  return (orders / users) * 100;
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export function totals(channels: AdminAnalyticsChannel[]) {
  return channels.reduce(
    (sum, channel) => ({
      sessions: sum.sessions + channel.sessions,
      users: sum.users + channel.users,
      viewItem: sum.viewItem + channel.viewItem,
      addToCart: sum.addToCart + channel.addToCart,
      beginCheckout: sum.beginCheckout + channel.beginCheckout,
      orders: sum.orders + channel.orders,
    }),
    {
      sessions: 0,
      users: 0,
      viewItem: 0,
      addToCart: 0,
      beginCheckout: 0,
      orders: 0,
    },
  );
}

/** 오늘 날짜를 한국 시간 기준 yyyy-MM-dd로 돌려준다. 브라우저 시간대와 무관하다. */
export function todayInKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
    now,
  );
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const moved = new Date(Date.UTC(y, m - 1, d + days));
  return moved.toISOString().slice(0, 10);
}

/** 오늘을 포함해 최근 `days`일 구간. */
export function recentRange(days: number, today: string) {
  return { from: addDays(today, -(days - 1)), to: today };
}

export function isValidRange(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return false;
  }
  if (from > to) return false;
  return to <= addDays(from, 365);
}

/** 막대 그래프 축 눈금용: 최댓값을 보기 좋은 단위로 올림한다. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

/** GA는 방문이 없는 날을 응답에서 빼므로, 그래프에서 날짜가 건너뛰지 않게 0으로 채운다. */
export function fillDaily(
  daily: AdminAnalyticsDaily[],
  from: string,
  to: string,
): AdminAnalyticsDaily[] {
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const result: AdminAnalyticsDaily[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    result.push(byDate.get(date) ?? { date, sessions: 0, users: 0 });
  }
  return result;
}

export function peakDay(daily: AdminAnalyticsDaily[]) {
  return daily.reduce<AdminAnalyticsDaily | null>(
    (best, day) => (!best || day.sessions > best.sessions ? day : best),
    null,
  );
}
