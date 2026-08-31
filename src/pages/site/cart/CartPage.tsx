import CartView from '../../../features/cart/CartView';
import { useCart } from '../../../features/cart/useCart';

export default function CartPage() {
  const cart = useCart();
  return <CartView {...cart} />;
}
