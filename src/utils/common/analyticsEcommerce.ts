import type { ItemResponse } from '../../api/site/items';
import type { OrderQuoteResponse } from '../../api/site/orders';
import type { CartItem } from '../cart/cart';

export type GA4EcommerceItem = {
  item_id: string;
  item_name: string;
  price: number;
  project_id?: string;
  quantity: number;
};

export type GA4EcommerceItemInput = {
  itemId: string | number;
  itemName: string;
  price: number;
  projectId?: string | number | null;
  quantity: number;
};

const normalizePrice = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const normalizeQuantity = (value: number) =>
  Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;

export const toGA4EcommerceItem = ({
  itemId,
  itemName,
  price,
  projectId,
  quantity,
}: GA4EcommerceItemInput): GA4EcommerceItem => ({
  item_id: String(itemId),
  item_name: itemName,
  price: normalizePrice(price),
  ...(projectId === null || projectId === undefined
    ? {}
    : { project_id: String(projectId) }),
  quantity: normalizeQuantity(quantity),
});

export const toGA4ItemFromItem = (
  item: ItemResponse,
  projectId: string | number | null | undefined,
  quantity = 1,
) =>
  toGA4EcommerceItem({
    itemId: item.id,
    itemName: item.name,
    price: item.price,
    projectId: projectId ?? item.projectId,
    quantity,
  });

export const toGA4ItemsFromCart = (items: CartItem[]) =>
  items.map((item) =>
    toGA4EcommerceItem({
      itemId: item.itemId,
      itemName: item.name,
      price: item.price,
      projectId: item.projectId,
      quantity: item.quantity,
    }),
  );

export const toGA4ItemsFromQuote = (quote: OrderQuoteResponse) =>
  quote.items.map((item) =>
    toGA4EcommerceItem({
      itemId: item.projectItemId,
      itemName: item.itemName,
      price: item.unitPrice,
      projectId: item.projectId,
      quantity: item.quantity,
    }),
  );

export const getGA4EcommerceValue = (items: GA4EcommerceItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);
