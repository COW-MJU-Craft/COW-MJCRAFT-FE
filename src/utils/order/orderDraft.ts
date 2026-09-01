import type { CartItem } from '../cart/cart';

/**
 * 주문 draft 영속화 계층.
 *
 * 보안 원칙: 이름/전화/이메일/주소/환불계좌/조회 비밀번호 등 민감 필드는
 * 이 모듈을 거치지 않는다 — 화면 컴포넌트의 React state에만 존재하고
 * 저장 대상 타입(PersistableOrderDraft)에는 애초에 필드로 존재하지 않는다.
 * 여기서 영속화하는 것은 "진행 단계"와 "선택한 상품"뿐이다.
 */

export type OrderDraftSource = 'cart' | 'direct';
export type OrderDraftStep = 0 | 1 | 2 | 3 | 4;

export type PersistableOrderDraft = {
  source: OrderDraftSource;
  step: OrderDraftStep;
  items: CartItem[];
};

type StoredOrderDraft = PersistableOrderDraft & {
  schemaVersion: 3;
  expiresAt: number;
};

const STORAGE_KEY = 'cow_order_draft_v3';
const LEGACY_STORAGE_KEY = 'cow_order_draft_v2';
const TTL_MS = 30 * 60 * 1000; // 30분
const SCHEMA_VERSION = 3;

// 1회성 migration: 구버전 localStorage draft에는 비밀번호/계좌/연락처 등
// 민감정보가 평문으로 들어있었다. 내용은 절대 읽지 않고 키만 즉시 제거한다.
try {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
} catch {
  // storage 접근 불가 환경(프라이빗 모드 등)은 무시한다.
}

function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<CartItem[]>((acc, entry) => {
    if (!entry || typeof entry !== 'object') return acc;
    const item = entry as Partial<CartItem>;
    if (!item.itemId || !item.projectId || !item.name) return acc;
    if (typeof item.price !== 'number' || !Number.isFinite(item.price))
      return acc;
    const quantity =
      typeof item.quantity === 'number' && Number.isFinite(item.quantity)
        ? Math.max(1, Math.trunc(item.quantity))
        : 1;

    acc.push({
      itemId: String(item.itemId),
      projectId: String(item.projectId),
      name: String(item.name),
      price: item.price,
      thumbnailUrl: item.thumbnailUrl ?? null,
      status: item.status,
      saleType: item.saleType,
      quantity,
      mergedByDuplicateAdd: Boolean(item.mergedByDuplicateAdd),
    });
    return acc;
  }, []);
}

/**
 * storage에 실제 저장할 값을 draft 전체 객체에서 비민감 필드만 뽑아 만든다.
 * 인자로 buyer/lookup/payment/fulfillment가 포함된 더 큰 객체가 와도
 * 여기서 참조하지 않으므로 저장되지 않는다.
 */
export function saveOrderDraft(draft: PersistableOrderDraft): void {
  try {
    const stored: StoredOrderDraft = {
      schemaVersion: SCHEMA_VERSION,
      expiresAt: Date.now() + TTL_MS,
      source: draft.source,
      step: draft.step,
      items: draft.items,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // storage 접근 불가 환경은 무시한다 (자동저장 실패는 치명적이지 않음).
  }
}

export function loadOrderDraft(): PersistableOrderDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOrderDraft>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    const source: OrderDraftSource = parsed.source === 'direct' ? 'direct' : 'cart';
    const stepCandidate = Number(parsed.step ?? 0);
    const step: OrderDraftStep = ([0, 1, 2, 3, 4] as number[]).includes(
      stepCandidate,
    )
      ? (stepCandidate as OrderDraftStep)
      : 0;
    const items = sanitizeCartItems(parsed.items);

    return { source, step, items };
  } catch {
    return null;
  }
}

export function clearOrderDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
