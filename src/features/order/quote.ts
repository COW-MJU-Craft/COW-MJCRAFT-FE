import type {
  OrderQuoteRequest,
  OrderQuoteResponse,
} from '../../api/site/orders';
import type { CartItem } from '../../utils/cart/cart';
import { buildOrderItemsPayload } from './payload';
import type { FulfillmentMethod } from './types';

export function buildOrderQuotePayload(
  cartItems: CartItem[],
  fulfillmentMethod: FulfillmentMethod,
): OrderQuoteRequest | null {
  const items = buildOrderItemsPayload(cartItems);
  if (items.length === 0) return null;
  return {
    items,
    fulfillmentMethod,
  };
}

export function isSameOrderQuote(
  previous: OrderQuoteResponse | null,
  next: OrderQuoteResponse,
) {
  if (!previous) return false;
  if (
    previous.totalAmount !== next.totalAmount ||
    previous.shippingFee !== next.shippingFee ||
    previous.finalAmount !== next.finalAmount ||
    previous.items.length !== next.items.length
  ) {
    return false;
  }

  const getQuoteItemKey = (item: OrderQuoteResponse['items'][number]) =>
    `${item.projectItemId}:${[...(item.optionNames ?? [])].sort().join(',')}`;

  const previousItems = new Map(
    previous.items.map((item) => [getQuoteItemKey(item), item]),
  );
  return next.items.every((item) => {
    const before = previousItems.get(getQuoteItemKey(item));
    return (
      before?.quantity === item.quantity &&
      before.unitPrice === item.unitPrice &&
      before.lineAmount === item.lineAmount
    );
  });
}
