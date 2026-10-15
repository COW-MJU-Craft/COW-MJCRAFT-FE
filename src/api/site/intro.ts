import { api, withApiBase, ApiError } from '../core/client';
import { normalizeBrandCopy } from '../../utils/common/brandCopy';

export type IntroduceHeroLogo = {
  key?: string;
  imageUrl?: string;
};

export type IntroduceMainSummary = {
  title?: string;
  subtitle?: string;
  summary?: string;
  heroLogos?: IntroduceHeroLogo[];
};

export type IntroduceDetailPayload = {
  brand?: {
    title?: string;
    subtitle?: string;
  };
  intro?: {
    title?: string;
    slogan?: string;
    body?: string;
  };
  purpose?: {
    title?: string;
    description?: string;
  };
  currentLogo?: {
    title?: string;
    imageKey?: string;
    imageUrl?: string;
    description?: string;
  };
  logoHistories?: Array<{
    year?: string;
    imageKey?: string;
    imageUrl?: string;
    description?: string;
  }>;
};

function safeGet<T>(promise: Promise<T>) {
  return promise.catch((err) => {
    if (err instanceof ApiError && err.status === 404) {
      return null as T;
    }
    throw err;
  });
}

function normalizeMainCopy(
  data: IntroduceMainSummary | null,
): IntroduceMainSummary | null {
  if (!data) return null;
  return {
    ...data,
    title: normalizeBrandCopy(data.title),
    subtitle: normalizeBrandCopy(data.subtitle),
    summary: normalizeBrandCopy(data.summary),
  };
}

function normalizeDetailCopy(
  data: IntroduceDetailPayload | null,
): IntroduceDetailPayload | null {
  if (!data) return null;
  return {
    ...data,
    brand: data.brand
      ? {
          ...data.brand,
          title: normalizeBrandCopy(data.brand.title),
          subtitle: normalizeBrandCopy(data.brand.subtitle),
        }
      : undefined,
    intro: data.intro
      ? {
          ...data.intro,
          title: normalizeBrandCopy(data.intro.title),
          slogan: normalizeBrandCopy(data.intro.slogan),
          body: normalizeBrandCopy(data.intro.body),
        }
      : undefined,
    purpose: data.purpose
      ? {
          ...data.purpose,
          title: normalizeBrandCopy(data.purpose.title),
          description: normalizeBrandCopy(data.purpose.description),
        }
      : undefined,
    currentLogo: data.currentLogo
      ? {
          ...data.currentLogo,
          title: normalizeBrandCopy(data.currentLogo.title),
          description: normalizeBrandCopy(data.currentLogo.description),
        }
      : undefined,
    logoHistories: data.logoHistories?.map((history) => ({
      ...history,
      description: normalizeBrandCopy(history.description),
    })),
  };
}

export const introApi = {
  getDetail(): Promise<IntroduceDetailPayload | null> {
    return safeGet(
      api<IntroduceDetailPayload>(withApiBase('/introduce')).then(
        (res) => normalizeDetailCopy(res ?? null),
      ),
    );
  },

  getMain(): Promise<IntroduceMainSummary | null> {
    return safeGet(
      api<IntroduceMainSummary>(withApiBase('/introduce/main')).then(
        (res) => normalizeMainCopy(res ?? null),
      ),
    );
  },
};
