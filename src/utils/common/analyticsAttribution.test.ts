import { describe, expect, it } from 'vitest';
import {
  classifyAcquisition,
  getSessionAttribution,
  normalizeAnalyticsPath,
} from './analyticsAttribution';

describe('classifyAcquisition', () => {
  it('AI 서비스 유입을 AI 채널과 공급자로 분류한다', () => {
    expect(
      classifyAcquisition({
        referrer: 'https://chatgpt.com/c/example',
        utmSource: null,
      }),
    ).toEqual({ acquisition_channel: 'ai', ai_source: 'chatgpt' });
  });

  it('검색엔진 유입을 search 채널로 분류한다', () => {
    expect(
      classifyAcquisition({
        referrer: 'https://search.naver.com/search.naver?query=mju',
        utmSource: null,
      }),
    ).toEqual({ acquisition_channel: 'search', ai_source: 'none' });
  });

  it('AI UTM은 referrer보다 우선한다', () => {
    expect(
      classifyAcquisition({
        referrer: 'https://example.com/article',
        utmSource: 'perplexity',
      }),
    ).toEqual({ acquisition_channel: 'ai', ai_source: 'perplexity' });
  });
});

describe('normalizeAnalyticsPath', () => {
  it('상세 URL의 동적 식별자를 route template으로 정규화한다', () => {
    expect(normalizeAnalyticsPath('/projects/39/items/42?utm_source=chatgpt')).toBe(
      '/projects/:projectId/items/:itemId',
    );
    expect(normalizeAnalyticsPath('/projects/39')).toBe('/projects/:projectId');
  });
});

describe('getSessionAttribution', () => {
  it('세션의 첫 유입 정보를 이후 page view에서도 유지한다', () => {
    sessionStorage.clear();
    const first = getSessionAttribution({
      pathname: '/projects/39',
      referrer: 'https://gemini.google.com/app',
      search: '',
    });
    const later = getSessionAttribution({
      pathname: '/projects/39/items/42',
      referrer: '',
      search: '',
    });

    expect(first).toMatchObject({
      acquisition_channel: 'ai',
      ai_source: 'gemini',
      landing_path: '/projects/:projectId',
    });
    expect(later).toEqual(first);
  });
});
