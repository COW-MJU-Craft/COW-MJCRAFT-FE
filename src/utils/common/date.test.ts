import { describe, it, expect } from 'vitest';
import { parseDateLike, formatYmd } from './date';

describe('parseDateLike', () => {
  it('null/undefined는 null을 반환한다', () => {
    expect(parseDateLike(null)).toBeNull();
    expect(parseDateLike(undefined)).toBeNull();
  });

  it('숫자 배열 [y, m, d]을 Date로 변환한다 (월은 1-base)', () => {
    const d = parseDateLike([2026, 7, 12]);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(6);
    expect(d?.getDate()).toBe(12);
  });

  it('유효하지 않은 문자열은 null을 반환한다', () => {
    expect(parseDateLike('not-a-date')).toBeNull();
  });

  it('ISO 문자열을 파싱한다', () => {
    expect(parseDateLike('2026-07-12')?.getFullYear()).toBe(2026);
  });
});

describe('formatYmd', () => {
  it('배열을 zero-padding하여 YYYY-MM-DD로 만든다', () => {
    expect(formatYmd([2026, 7, 5])).toBe('2026-07-05');
  });

  it('빈 값은 "-"를 반환한다', () => {
    expect(formatYmd(null)).toBe('-');
    expect(formatYmd(undefined)).toBe('-');
  });

  it('파싱 불가 문자열은 trim해서 그대로 반환한다', () => {
    expect(formatYmd(' hello ')).toBe('hello');
  });
});
