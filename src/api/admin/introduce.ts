import { ApiError, api, withApiBase } from '../core/client';

export type PresignPutResponse = {
  key: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

function safeGet<T>(promise: Promise<T>) {
  return promise.catch((err) => {
    if (err instanceof ApiError && err.status === 404) return null as T;
    throw err;
  });
}

export type AdminIntroduceHeroLogo = {
  key: string;
  imageUrl: string | null;
};

export type AdminIntroduceMainResponse = {
  title: string;
  subtitle: string;
  summary: string;
  heroLogos: AdminIntroduceHeroLogo[];
  updatedAt?: string;
};

export type AdminIntroduceMainUpdateRequest = {
  title: string;
  subtitle: string;
  summary: string;
  heroLogoKeys: string[];
};

export type AdminIntroduceIntro = {
  title: string;
  slogan: string;
  body: string | null;
};

export type AdminIntroducePurpose = {
  title: string;
  description: string | null;
};

export type AdminIntroduceCurrentLogo = {
  title: string;
  imageKey: string | null;
  imageUrl: string | null;
  description: string | null;
};

export type AdminIntroduceLogoHistory = {
  year: string;
  imageKey: string | null;
  imageUrl: string | null;
  description: string | null;
};

export type AdminIntroduceDetailResponse = {
  intro: AdminIntroduceIntro | null;
  purpose: AdminIntroducePurpose;
  currentLogo: AdminIntroduceCurrentLogo | null;
  logoHistories: AdminIntroduceLogoHistory[];
  updatedAt?: string;
};

export type AdminIntroduceDetailUpdateRequest = {
  intro: {
    title: string;
    slogan: string;
    body: string | null;
  } | null;
  purpose: {
    title: string;
    description: string | null;
  };
  currentLogo: {
    title: string;
    imageKey: string | null;
    description: string | null;
  } | null;
  logoHistories: Array<{
    year: string;
    imageKey: string | null;
    description: string | null;
  }>;
};

export const adminIntroduceApi = {
  getMain(): Promise<AdminIntroduceMainResponse | null> {
    return safeGet(
      api<AdminIntroduceMainResponse>(
        withApiBase('/admin/introduce/main'),
      ).then((raw) => raw ?? null),
    );
  },

  updateMain(body: AdminIntroduceMainUpdateRequest) {
    return api<void>(withApiBase('/admin/introduce/main'), {
      method: 'PUT',
      body,
    });
  },

  presignHeroLogos(body: { fileName: string; contentType: string }) {
    return api<PresignPutResponse>(
      withApiBase('/admin/introduce/presign-put/hero-logos'),
      {
        method: 'POST',
        body,
      },
    ).then((raw) => raw as PresignPutResponse | undefined);
  },

  getDetail(): Promise<AdminIntroduceDetailResponse | null> {
    return safeGet(
      api<AdminIntroduceDetailResponse>(
        withApiBase('/admin/introduce'),
      ).then((raw) => raw ?? null),
    );
  },

  updateDetail(body: AdminIntroduceDetailUpdateRequest) {
    return api<void>(withApiBase('/admin/introduce'), {
      method: 'PUT',
      body,
    });
  },

  presignSectionAssets(body: { fileName: string; contentType: string }) {
    return api<PresignPutResponse>(
      withApiBase('/admin/introduce/presign-put/sections'),
      {
        method: 'POST',
        body,
      },
    ).then((raw) => raw as PresignPutResponse | undefined);
  },
};
