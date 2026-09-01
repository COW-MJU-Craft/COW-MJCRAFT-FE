import { api, withApiBase, ApiError } from '../core/client';

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

export const introApi = {
  getDetail(): Promise<IntroduceDetailPayload | null> {
    return safeGet(
      api<IntroduceDetailPayload>(withApiBase('/introduce')).then(
        (res) => res ?? null,
      ),
    );
  },

  getMain(): Promise<IntroduceMainSummary | null> {
    return safeGet(
      api<IntroduceMainSummary>(withApiBase('/introduce/main')).then(
        (res) => res ?? null,
      ),
    );
  },
};
