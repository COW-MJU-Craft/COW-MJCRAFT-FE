import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearOrderDraft,
  loadOrderDraft,
  saveOrderDraft,
  type PersistableOrderDraft,
} from './orderDraft';

const sampleItem = {
  itemId: '1',
  projectId: 'p1',
  name: '스티커 세트',
  price: 5000,
  thumbnailUrl: null,
  quantity: 2,
};

function draftWithSensitiveFields(): PersistableOrderDraft & Record<string, unknown> {
  return {
    source: 'cart',
    step: 2,
    items: [sampleItem],
    // 아래 필드들은 PersistableOrderDraft에 존재하지 않는다.
    // 실수로 넘어오더라도 저장 결과에 포함되면 안 된다는 것을 검증한다.
    buyer: {
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'test@example.com',
      refundAccount: '110-123-456789',
    },
    lookup: {
      password: 'secret-password',
      passwordConfirm: 'secret-password',
    },
  };
}

describe('orderDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('민감 필드가 포함된 draft를 저장해도 storage dump에 민감 필드가 없다', () => {
    saveOrderDraft(draftWithSensitiveFields());

    const raw = sessionStorage.getItem('cow_order_draft_v3');
    expect(raw).not.toBeNull();
    expect(raw).not.toMatch(/password/i);
    expect(raw).not.toMatch(/refundAccount/i);
    expect(raw).not.toMatch(/010-1234-5678/);
    expect(raw).not.toMatch(/test@example\.com/);
    expect(raw).not.toMatch(/홍길동/);
  });

  it('localStorage에는 아무것도 남기지 않는다', () => {
    saveOrderDraft(draftWithSensitiveFields());
    expect(localStorage.length).toBe(0);
  });

  it('저장한 뒤 불러오면 step/items/source만 복원된다', () => {
    saveOrderDraft(draftWithSensitiveFields());
    const loaded = loadOrderDraft();
    expect(loaded).toEqual({
      source: 'cart',
      step: 2,
      items: [{ ...sampleItem, mergedByDuplicateAdd: false }],
    });
  });

  it('schemaVersion이 다르면 무효화되고 storage에서 제거된다', () => {
    sessionStorage.setItem(
      'cow_order_draft_v3',
      JSON.stringify({ schemaVersion: 1, source: 'cart', step: 1, items: [] }),
    );
    expect(loadOrderDraft()).toBeNull();
    expect(sessionStorage.getItem('cow_order_draft_v3')).toBeNull();
  });

  it('만료된(expiresAt이 과거인) draft는 무효화되고 제거된다', () => {
    sessionStorage.setItem(
      'cow_order_draft_v3',
      JSON.stringify({
        schemaVersion: 3,
        expiresAt: Date.now() - 1000,
        source: 'cart',
        step: 1,
        items: [],
      }),
    );
    expect(loadOrderDraft()).toBeNull();
    expect(sessionStorage.getItem('cow_order_draft_v3')).toBeNull();
  });

  it('clearOrderDraft 호출 시 storage에서 제거된다', () => {
    saveOrderDraft(draftWithSensitiveFields());
    clearOrderDraft();
    expect(loadOrderDraft()).toBeNull();
  });

  it('구버전 localStorage(cow_order_draft_v2) 키는 모듈 로드 시 제거된다', async () => {
    localStorage.setItem(
      'cow_order_draft_v2',
      JSON.stringify({ lookup: { password: 'old-secret' } }),
    );
    // 모듈 캐시를 비워 migration 로직(모듈 최상위 부수효과)이
    // 다시 실행되도록 강제한다.
    vi.resetModules();
    await import('./orderDraft');
    expect(localStorage.getItem('cow_order_draft_v2')).toBeNull();
  });
});
