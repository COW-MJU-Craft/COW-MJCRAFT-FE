import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, type OrderDetailResponse } from '../../../api/site/orders';
import { ApiError } from '../../../api/core/client';
import OrderDetailCard from '../../../components/order/OrderDetailCard';
import Reveal from '../../../components/ui/Reveal';
import { useToast } from '../../../components/toast/useToast';

const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

export default function OrderLookupPage() {
  const toast = useToast();
  const [lookupId, setLookupId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!lookupId.trim() || !password.trim()) {
      toast.error('조회 아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setLookupError(null);
    try {
      const result = await ordersApi.lookupOrder({
        lookupId: lookupId.trim(),
        password,
      });
      setOrder(result);
    } catch (error) {
      setOrder(null);
      if (error instanceof ApiError && error.status === 401) {
        setLookupError(
          '조회 아이디 또는 비밀번호가 일치하지 않아요. 입력한 정보를 다시 확인해주세요.',
        );
      } else {
        const message =
          error instanceof Error ? error.message : '주문 조회에 실패했어요.';
        setLookupError(
          '주문 정보를 불러오지 못했어요. 잠시 후 다시 시도하거나 조회 아이디와 비밀번호를 다시 확인해주세요.',
        );
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap gap-4 lg:flex-col lg:items-start">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-heading text-3xl text-primary hover:opacity-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            비회원 주문 조회
          </Link>
          <p className="mt-2 text-sm text-slate-600 lg:mt-0">
            주문 시 설정한 조회 아이디와 비밀번호로 주문 상태를 확인하세요.
          </p>
        </div>
      </Reveal>

      <Reveal delayMs={100} className="mx-auto mt-6 max-w-4xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              조회 아이디
              <input
                value={lookupId}
                onChange={(event) => {
                  setLookupId(event.target.value);
                  if (lookupError) setLookupError(null);
                }}
                className={INPUT_CLASS}
                placeholder="예) guest-mju-001"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (lookupError) setLookupError(null);
                }}
                className={INPUT_CLASS}
                placeholder="비밀번호 입력"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {loading ? '조회 중...' : '주문 조회'}
            </button>
            <Link
              to="/order"
              state={{ source: 'cart' }}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              주문하러 가기
            </Link>
          </div>

          {lookupError && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700">
              {lookupError}
            </div>
          )}
        </section>
      </Reveal>

      {order && (
        <Reveal className="mt-6 lg:mx-auto lg:max-w-4xl">
          <OrderDetailCard order={order} />
        </Reveal>
      )}
    </div>
  );
}
