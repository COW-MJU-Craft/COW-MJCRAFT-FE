import type { ItemResponse } from '../../api/site/items';

export const CART_STORAGE_KEY = 'cow_cart_v1';
export const CART_CHANGED_EVENT = 'cart-changed';

export type CartItemOption = {
  groupId: string;
  groupName: string;
  valueId: string;
  valueName: string;
  additionalPrice: number;
  stockQty?: number | null;
};

export type CartItem = {
  cartItemId: string;
  itemId: string;
  projectId: string;
  name: string;
  price: number;
  thumbnailUrl: string | null;
  thumbnailKey?: string | null;
  status?: ItemResponse['status'];
  saleType?: ItemResponse['saleType'];
  selectedOptions: CartItemOption[];
  maxQuantity?: number;
  quantity: number;
  mergedByDuplicateAdd?: boolean;
};

type CartItemInput = Omit<
  CartItem,
  | 'cartItemId'
  | 'itemId'
  | 'projectId'
  | 'selectedOptions'
  | 'thumbnailUrl'
  | 'maxQuantity'
  | 'quantity'
  | 'mergedByDuplicateAdd'
> & {
  itemId: string | number;
  projectId: string | number;
  selectedOptions?: CartItemOption[];
  thumbnailUrl?: string | null;
  maxQuantity?: number | null;
  quantity?: number;
};

function normalizeMaxQuantity(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(99, Math.max(1, Math.trunc(value)));
}

function normalizeQuantity(value: number, maxQuantity?: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(maxQuantity ?? 99, Math.max(1, Math.trunc(value)));
}

function normalizeOptions(options?: CartItemOption[]) {
  if (!Array.isArray(options)) return [];

  return options.reduce<CartItemOption[]>((acc, option) => {
    if (!option || typeof option !== 'object') return acc;
    if (!option.groupId || !option.valueId || !option.groupName || !option.valueName)
      return acc;
    if (
      typeof option.additionalPrice !== 'number' ||
      !Number.isFinite(option.additionalPrice)
    ) {
      return acc;
    }

    acc.push({
      groupId: String(option.groupId),
      groupName: String(option.groupName),
      valueId: String(option.valueId),
      valueName: String(option.valueName),
      additionalPrice: option.additionalPrice,
      stockQty:
        typeof option.stockQty === 'number' && Number.isFinite(option.stockQty)
          ? Math.max(0, Math.trunc(option.stockQty))
          : option.stockQty === null
            ? null
            : undefined,
    });
    return acc;
  }, []);
}

export function getCartItemId(
  itemId: string | number,
  selectedOptions: CartItemOption[] = [],
) {
  const selectedValueIds = selectedOptions
    .map((option) => String(option.valueId))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  return selectedValueIds.length > 0
    ? `${String(itemId)}::${selectedValueIds.join('.')}`
    : String(itemId);
}

export function createCartItem(payload: CartItemInput): CartItem {
  const itemId = String(payload.itemId);
  const selectedOptions = normalizeOptions(payload.selectedOptions);
  const maxQuantity = normalizeMaxQuantity(payload.maxQuantity);

  return {
    cartItemId: getCartItemId(itemId, selectedOptions),
    itemId,
    projectId: String(payload.projectId),
    name: payload.name,
    price: payload.price,
    thumbnailUrl: payload.thumbnailUrl ?? null,
    thumbnailKey: payload.thumbnailKey ?? null,
    status: payload.status,
    saleType: payload.saleType,
    selectedOptions,
    maxQuantity,
    quantity: normalizeQuantity(payload.quantity ?? 1, maxQuantity),
    mergedByDuplicateAdd: false,
  };
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

      const normalized = createCartItem({
        itemId: item.itemId,
        projectId: item.projectId,
        name: String(item.name),
        price: item.price,
        thumbnailUrl: item.thumbnailUrl ?? null,
        thumbnailKey: item.thumbnailKey ?? null,
        status: item.status,
        saleType: item.saleType,
        selectedOptions: item.selectedOptions,
        maxQuantity: item.maxQuantity,
        quantity: item.quantity ?? 1,
      });

      acc.push({
        ...normalized,
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

export function addCartItem(payload: CartItemInput) {
  const nextItem = createCartItem(payload);
  const items = loadCartItems();
  const targetIndex = items.findIndex(
    (item) => item.cartItemId === nextItem.cartItemId,
  );

  if (targetIndex >= 0) {
    const current = items[targetIndex];
    const nextMaxQuantity = nextItem.maxQuantity ?? current.maxQuantity;
    items[targetIndex] = {
      ...current,
      thumbnailUrl: current.thumbnailUrl ?? nextItem.thumbnailUrl,
      thumbnailKey: current.thumbnailKey ?? nextItem.thumbnailKey,
      maxQuantity: nextMaxQuantity,
      quantity: normalizeQuantity(
        current.quantity + nextItem.quantity,
        nextMaxQuantity,
      ),
      mergedByDuplicateAdd: true,
    };
  } else {
    items.unshift(nextItem);
  }

  saveCartItems(items);
}

export function removeCartItem(cartItemId: string | number) {
  const target = String(cartItemId);
  saveCartItems(loadCartItems().filter((item) => item.cartItemId !== target));
}

export function setCartItemQuantity(cartItemId: string | number, quantity: number) {
  const target = String(cartItemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.cartItemId === target);
  if (index < 0) return;

  if (quantity <= 0) {
    items.splice(index, 1);
    saveCartItems(items);
    return;
  }

  items[index] = {
    ...items[index],
    quantity: normalizeQuantity(quantity, items[index].maxQuantity),
  };
  saveCartItems(items);
}

export function clearMergedNotice(cartItemId: string | number) {
  const target = String(cartItemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.cartItemId === target);
  if (index < 0 || !items[index].mergedByDuplicateAdd) return;
  items[index] = { ...items[index], mergedByDuplicateAdd: false };
  saveCartItems(items);
}

export function updateCartItemMedia(
  cartItemId: string | number,
  patch: { thumbnailUrl?: string | null; thumbnailKey?: string | null },
) {
  const target = String(cartItemId);
  const items = loadCartItems();
  const index = items.findIndex((item) => item.cartItemId === target);
  if (index < 0) return;

  items[index] = {
    ...items[index],
    thumbnailUrl:
      patch.thumbnailUrl !== undefined
        ? patch.thumbnailUrl
        : items[index].thumbnailUrl,
    thumbnailKey:
      patch.thumbnailKey !== undefined
        ? patch.thumbnailKey
        : items[index].thumbnailKey,
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
