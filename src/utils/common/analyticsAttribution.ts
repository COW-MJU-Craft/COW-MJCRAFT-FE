export type AcquisitionChannel = 'ai' | 'campaign' | 'direct' | 'referral' | 'search';

export type AiSource =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'none'
  | 'perplexity'
  | 'other';

export type AnalyticsAttribution = {
  acquisition_channel: AcquisitionChannel;
  ai_source: AiSource;
  geo_experiment_version: 'v1';
  landing_path: string;
};

const STORAGE_KEY = 'mju-craft.analytics-attribution.v1';

const AI_SOURCE_PATTERNS: Array<[AiSource, RegExp]> = [
  ['chatgpt', /(^|\.)chatgpt\.com$|(^|\.)openai\.com$/i],
  ['gemini', /(^|\.)gemini\.google\.com$/i],
  ['claude', /(^|\.)claude\.ai$/i],
  ['perplexity', /(^|\.)perplexity\.ai$/i],
];

const SEARCH_HOST_PATTERN = /(^|\.)(google\.[a-z.]+|naver\.com|daum\.net|bing\.com|yahoo\.[a-z.]+|duckduckgo\.com|baidu\.com)$/i;

const AI_SOURCE_NAMES: Array<[AiSource, RegExp]> = [
  ['chatgpt', /chatgpt|openai/i],
  ['gemini', /gemini/i],
  ['claude', /claude/i],
  ['perplexity', /perplexity/i],
];

const getAiSourceFromHost = (host: string): AiSource | null =>
  AI_SOURCE_PATTERNS.find(([, pattern]) => pattern.test(host))?.[0] ?? null;

const getAiSourceFromCampaign = (source: string): AiSource | null =>
  AI_SOURCE_NAMES.find(([, pattern]) => pattern.test(source))?.[0] ?? null;

const getSafeSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const normalizeAnalyticsPath = (pathname: string): string => {
  const normalizedPath = pathname.split('?')[0]?.split('#')[0] || '/';

  if (/^\/projects\/[^/]+\/items\/[^/]+\/?$/.test(normalizedPath)) {
    return '/projects/:projectId/items/:itemId';
  }

  if (/^\/projects\/[^/]+\/?$/.test(normalizedPath)) {
    return '/projects/:projectId';
  }

  if (/^\/notices\/[^/]+\/?$/.test(normalizedPath)) {
    return '/notices/:noticeId';
  }

  return normalizedPath;
};

export const isPublicAnalyticsPath = (pathname: string) =>
  !pathname.startsWith('/admin');

export const classifyAcquisition = ({
  referrer,
  utmSource,
}: {
  referrer: string;
  utmSource: string | null;
}): Pick<AnalyticsAttribution, 'acquisition_channel' | 'ai_source'> => {
  const campaignSource = utmSource?.trim() ?? '';
  if (campaignSource) {
    const aiSource = getAiSourceFromCampaign(campaignSource);
    return {
      acquisition_channel: aiSource ? 'ai' : 'campaign',
      ai_source: aiSource ?? 'none',
    };
  }

  if (!referrer) {
    return { acquisition_channel: 'direct', ai_source: 'none' };
  }

  try {
    const referrerHost = new URL(referrer).hostname;
    const aiSource = getAiSourceFromHost(referrerHost);
    if (aiSource) return { acquisition_channel: 'ai', ai_source: aiSource };

    if (SEARCH_HOST_PATTERN.test(referrerHost)) {
      return { acquisition_channel: 'search', ai_source: 'none' };
    }

    return { acquisition_channel: 'referral', ai_source: 'none' };
  } catch {
    return { acquisition_channel: 'direct', ai_source: 'none' };
  }
};

export const getSessionAttribution = ({
  pathname,
  referrer,
  search,
}: {
  pathname: string;
  referrer: string;
  search: string;
}): AnalyticsAttribution => {
  const storage = typeof window === 'undefined' ? null : getSafeSessionStorage();
  const saved = storage?.getItem(STORAGE_KEY);

  if (saved) {
    try {
      return JSON.parse(saved) as AnalyticsAttribution;
    } catch {
      storage?.removeItem(STORAGE_KEY);
    }
  }

  const attribution: AnalyticsAttribution = {
    ...classifyAcquisition({
      referrer,
      utmSource: new URLSearchParams(search).get('utm_source'),
    }),
    geo_experiment_version: 'v1',
    landing_path: normalizeAnalyticsPath(pathname),
  };

  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Analytics attribution must never affect a user's navigation flow.
  }

  return attribution;
};

export const getCurrentSessionAttribution = (): AnalyticsAttribution =>
  getSessionAttribution({
    pathname: window.location.pathname,
    referrer: document.referrer,
    search: window.location.search,
  });
