import { describe, expect, it } from 'vitest';
import {
  addDays,
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
} from './analytics';

describe('channelName', () => {
  it('알려진 출처는 한글 이름으로, 검색 유입은 "검색"을 붙인다', () => {
    expect(channelName({ source: 'everytime.kr', medium: 'referral' })).toBe(
      '에브리타임',
    );
    expect(channelName({ source: 'google', medium: 'organic' })).toBe(
      '구글 검색',
    );
  });

  it('직접 방문과 분류 안 된 방문을 구분한다', () => {
    expect(channelName({ source: '(direct)', medium: '(none)' })).toBe(
      '직접 방문',
    );
    expect(channelName({ source: '(not set)', medium: '(not set)' })).toBe(
      '분류 안 됨',
    );
  });

  it('모르는 출처는 원래 값을 그대로 보여준다', () => {
    expect(channelName({ source: 'example.org', medium: 'referral' })).toBe(
      'example.org',
    );
  });
});

describe('hasCampaign', () => {
  it('GA 기본값은 캠페인이 아니고 UTM으로 지은 이름만 캠페인이다', () => {
    expect(hasCampaign('(referral)')).toBe(false);
    expect(hasCampaign('(direct)')).toBe(false);
    expect(hasCampaign('(not set)')).toBe(false);
    expect(hasCampaign('')).toBe(false);
    expect(hasCampaign('autumn-launch')).toBe(true);
  });
});

describe('conversionRate', () => {
  it('사용자 수가 0이면 0으로 처리해 NaN이 나오지 않는다', () => {
    expect(conversionRate(3, 0)).toBe(0);
  });

  it('주문/사용자 비율을 퍼센트로 계산하고 소수 첫째 자리까지 표시한다', () => {
    expect(conversionRate(7, 149)).toBeCloseTo(4.698, 2);
    expect(formatRate(conversionRate(7, 149))).toBe('4.7%');
  });
});

describe('totals', () => {
  it('채널별 값을 항목별로 합산한다', () => {
    const base = {
      source: 'a',
      medium: 'b',
      campaign: 'c',
      sessions: 10,
      users: 8,
      viewItem: 5,
      addToCart: 3,
      beginCheckout: 2,
      orders: 1,
    };
    expect(totals([base, { ...base, sessions: 5, orders: 2 }])).toEqual({
      sessions: 15,
      users: 16,
      viewItem: 10,
      addToCart: 6,
      beginCheckout: 4,
      orders: 3,
    });
    expect(totals([]).sessions).toBe(0);
  });
});

describe('날짜 계산', () => {
  it('한국 시간 기준 날짜를 돌려준다 (UTC 15시 이후는 다음 날)', () => {
    expect(todayInKst(new Date('2026-11-25T14:59:00Z'))).toBe('2026-11-25');
    expect(todayInKst(new Date('2026-11-25T15:00:00Z'))).toBe('2026-11-26');
  });

  it('월과 연도 경계를 넘어 날짜를 더하고 뺀다', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('최근 N일은 오늘을 포함해 N일이다', () => {
    expect(recentRange(7, '2026-11-26')).toEqual({
      from: '2026-11-20',
      to: '2026-11-26',
    });
    expect(recentRange(1, '2026-11-26')).toEqual({
      from: '2026-11-26',
      to: '2026-11-26',
    });
  });

  it('조회 기간 검증: 형식, 순서, 366일 한도', () => {
    expect(isValidRange('2026-11-01', '2026-11-26')).toBe(true);
    expect(isValidRange('2026-11-26', '2026-11-01')).toBe(false);
    expect(isValidRange('2026-11-1', '2026-11-26')).toBe(false);
    expect(isValidRange('', '2026-11-26')).toBe(false);
    expect(isValidRange('2025-11-26', '2026-11-26')).toBe(true);
    expect(isValidRange('2025-11-25', '2026-11-26')).toBe(false);
  });
});

describe('차트 보조', () => {
  it('niceMax는 최댓값을 눈금 단위로 올림한다', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(265)).toBe(300);
    expect(niceMax(110)).toBe(150);
    expect(niceMax(7)).toBe(7);
  });

  it('peakDay는 세션이 가장 많은 날을 고르고 빈 배열이면 null이다', () => {
    expect(peakDay([])).toBeNull();
    expect(
      peakDay([
        { date: '2026-11-24', sessions: 110, users: 95 },
        { date: '2026-11-25', sessions: 265, users: 220 },
      ])?.date,
    ).toBe('2026-11-25');
  });
});

describe('fillDaily', () => {
  it('데이터가 없는 날을 0으로 채우고 날짜 순서를 유지한다', () => {
    const filled = fillDaily(
      [
        { date: '2026-11-22', sessions: 17, users: 11 },
        { date: '2026-11-25', sessions: 265, users: 220 },
      ],
      '2026-11-21',
      '2026-11-26',
    );

    expect(filled.map((day) => day.date)).toEqual([
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
    ]);
    expect(filled.map((day) => day.sessions)).toEqual([0, 17, 0, 0, 265, 0]);
  });

  it('응답이 비어 있어도 기간 전체를 0으로 돌려준다', () => {
    expect(fillDaily([], '2026-11-01', '2026-11-03')).toHaveLength(3);
  });
});
