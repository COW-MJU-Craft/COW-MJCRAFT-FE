import { Link } from 'react-router-dom';
import type { CartItem } from '../../../utils/cart/cart';
import { formatMoney } from '../format';

type OrderItemsStepProps = {
  items: CartItem[];
  totalPrice: number;
  onRemoveItem: (itemId: string) => void;
};

export default function OrderItemsStep({
  items,
  totalPrice,
  onRemoveItem,
}: OrderItemsStepProps) {
  if (items.length === 0) {
    return (
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-500">
          주문할 상품이 없어요.
        </p>
        <Link
          to="/projects"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          상품 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={`${item.projectId}-${item.itemId}`}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                {item.name}
              </p>
              <button
                type="button"
                onClick={() => onRemoveItem(item.itemId)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                삭제
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {item.quantity}개 · {formatMoney(item.price * item.quantity)}원
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">
          총 결제 예상 금액
        </p>
        <p className="text-base font-bold text-slate-900">
          {formatMoney(totalPrice)}원
        </p>
      </div>
    </>
  );
}
