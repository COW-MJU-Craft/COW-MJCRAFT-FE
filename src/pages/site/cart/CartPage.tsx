import { useEffect, useRef } from 'react';
import CartView from '../../../features/cart/CartView';
import { useCart } from '../../../features/cart/useCart';
import { trackGA4EcommerceEvent } from '../../../utils/common/analytics';
import {
  getGA4EcommerceValue,
  toGA4ItemsFromCart,
} from '../../../utils/common/analyticsEcommerce';

export default function CartPage() {
  const cart = useCart();
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (hasTrackedViewRef.current || cart.items.length === 0) return;

    hasTrackedViewRef.current = true;
    const items = toGA4ItemsFromCart(cart.items);
    trackGA4EcommerceEvent('view_cart', {
      items,
      value: getGA4EcommerceValue(items),
    });
  }, [cart.items]);

  return <CartView {...cart} />;
}
