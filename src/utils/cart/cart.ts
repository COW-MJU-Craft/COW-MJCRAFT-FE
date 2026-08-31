import type { ItemResponse } from '../../api/site/items';

export const CART_STORAGE_KEY = 'cow_cart_v1';
export const CART_CHANGED_EVENT = 'cart-changed';

export type CartItem = {
  itemId: string;
  projectId: string;
  name: string;
  price: number;
  thumbnailUrl: string | null;
  thumbnailKey?: string | null;
  status?: ItemResponse['status'];
  saleType?: ItemResponse['saleType'];
  quantity: number;
  mergedByDuplicateAdd?: boolean;
};

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(value)));
}

function parseStored(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.reduce<CartItem[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const item = entry as Partial<CartItem>;
      if (!item.itemId || !item.projectId || !item.name) return acc;
      if (typeof item.price !== 'number' || !Number.isFinite(item.price))
        return acc;

      acc.push({
        itemId: String(item.itemId),
        projectId: String(item.projectId),
        name: String(item.name),
        price: item.price,
        thumbnailUrl: item.thumbnailUrl ?? null,
        thumbnailKey: item.thumbnailKey ?? null,
        status: item.status,
        saleType: item.saleType,
        quantity: normalizeQuantity(item.quantity ?? 1),
        mergedByDuplicateAdd: Boolean(item.mergedByDuplicateAdd),
      });
      return acc;
    }, []);
  } catch {
    return [];
  }
}

function emitCartChanged() {
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

function saveCartItems(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  emitCartChanged();
}

export function loadCartItems() {
  try {
    return parseStored(localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function addCartItem(payload: {
  itemId: string | number;
  projectId: string | number;
  name: string;
  price: number;
  thumbnailUrl?: string | null;
  thumbnailKey?: string | null;
  status?: ItemResponse['status'];
  saleType?: ItemResponse['saleType'];
  quantity?: number;
}) {
  const itemId = String(payload.itemId);
  const projectId = String(payload.projectId);
  const quantity = normalizeQuantity(payload.quantity ?? 1);
  const items = loadCartItems();
  const targetIndex = items.findIndex((item) => item.itemId === itemId);

  if (targetIndex >= 0) {
    const current = items[targetIndex];
    items[targetIndex] = {
      ...current,
      thumbnailUrl: current.thumbnailUrl ?? payload.thumbnailUrl ?? null,
      thumbnailKey: current.thumbnailKey ?? payload.thumbnailKey ?? null,
      quantity: normalizeQuantity(current.quantity + quantity),
      mergedByDuplicateAdd: true,
    };
  } else {
    items.unshift({
      itemId,
      projectId,
      name: payload.name,
      price: payload.price,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      thumbnailKey: payload.thumbnailKey ?? null,
      status: payload.status,
      saleType: payload.saleType,
      quantity,
      mergedByDuplicateAdd: false,
    });
  }

  saveCartItems(items);
}

export function removeCartItem(itemId: string | number) {
  const target = String(itemId);
  const next = loadCartItems().filter((item) => item.itemId !== target);
  saveCartItems(next);
}

export function setCartItemQuantity(itemId: string | number, quantity: number) {
  const target = String(itemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.itemId === target);
  if (index < 0) return;

  if (quantity <= 0) {
    items.splice(index, 1);
    saveCartItems(items);
    return;
  }

  items[index] = {
    ...items[index],
    quantity: normalizeQuantity(quantity),
  };
  saveCartItems(items);
}

export function clearMergedNotice(itemId: string | number) {
  const target = String(itemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.itemId === target);
  if (index < 0) return;
  if (!items[index].mergedByDuplicateAdd) return;
  items[index] = {
    ...items[index],
    mergedByDuplicateAdd: false,
  };
  saveCartItems(items);
}

export function updateCartItemMedia(
  itemId: string | number,
  patch: { thumbnailUrl?: string | null; thumbnailKey?: string | null },
) {
  const target = String(itemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.itemId === target);
  if (index < 0) return;

  items[index] = {
    ...items[index],
    thumbnailUrl:
      patch.thumbnailUrl !== undefined
        ? patch.thumbnailUrl
        : items[index].thumbnailUrl ?? null,
    thumbnailKey:
      patch.thumbnailKey !== undefined
        ? patch.thumbnailKey
        : items[index].thumbnailKey ?? null,
  };

  saveCartItems(items);
}

export function clearCartItems() {
  saveCartItems([]);
}

export function getCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
