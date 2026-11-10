import { describe, expect, it } from 'vitest';
import { shouldOfferLaunchNotice } from './launchNotice';

describe('shouldOfferLaunchNotice', () => {
  it('신규 프로젝트를 OPEN으로 생성하면 출시 공지를 제안한다', () => {
    expect(
      shouldOfferLaunchNotice({ savedStatus: null, nextStatus: 'OPEN' }),
    ).toBe(true);
  });

  it('PREPARING에서 OPEN으로 전환하면 출시 공지를 제안한다', () => {
    expect(
      shouldOfferLaunchNotice({ savedStatus: 'PREPARING', nextStatus: 'OPEN' }),
    ).toBe(true);
  });

  it('이미 OPEN인 프로젝트를 수정할 때는 제안하지 않는다', () => {
    expect(
      shouldOfferLaunchNotice({ savedStatus: 'OPEN', nextStatus: 'OPEN' }),
    ).toBe(false);
  });

  it('OPEN이 아닌 상태로 저장하면 제안하지 않는다', () => {
    expect(
      shouldOfferLaunchNotice({ savedStatus: null, nextStatus: 'PREPARING' }),
    ).toBe(false);
    expect(
      shouldOfferLaunchNotice({ savedStatus: 'OPEN', nextStatus: 'CLOSED' }),
    ).toBe(false);
  });

  it('마감 후 재오픈이어도 이미 출시 공지가 있으면 제안하지 않는다', () => {
    expect(
      shouldOfferLaunchNotice({
        savedStatus: 'CLOSED',
        nextStatus: 'OPEN',
        launchNoticeId: 12,
      }),
    ).toBe(false);
  });

  it('마감 후 재오픈이고 출시 공지가 없으면 제안한다', () => {
    expect(
      shouldOfferLaunchNotice({
        savedStatus: 'CLOSED',
        nextStatus: 'OPEN',
        launchNoticeId: null,
      }),
    ).toBe(true);
  });
});
