import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ordersApi, type OrderDetailResponse } from '../../../api/site/orders';
import OrderDetailCard from '../../../components/order/OrderDetailCard';
import Reveal from '../../../components/ui/Reveal';
import {
  getOrderLookupErrorState,
  type OrderLookupErrorState,
} from '../../../features/order/lookupError';

const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-100';

export default function OrderLookupPage() {
  const [lookupId, setLookupId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [lookupError, setLookupError] =
    useState<OrderLookupErrorState | null>(null);

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setOrder(null);
    if (!lookupId.trim() || !password.trim()) {
      setLookupError({
        title: '입력 정보를 확인해주세요',
        description: '조회 아이디와 비밀번호를 모두 입력해주세요.',
        fieldRelated: true,
        retryable: false,
      });
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
      setLookupError(getOrderLookupErrorState(error));
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
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              조회 아이디
              <input
                value={lookupId}
                disabled={loading}
                autoComplete="username"
                aria-invalid={lookupError?.fieldRelated || undefined}
                aria-describedby={lookupError ? 'order-lookup-error' : undefined}
                onChange={(event) => {
                  setLookupId(event.target.value);
                  if (order) setOrder(null);
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
                disabled={loading}
                autoComplete="current-password"
                aria-invalid={lookupError?.fieldRelated || undefined}
                aria-describedby={lookupError ? 'order-lookup-error' : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (order) setOrder(null);
                  if (lookupError) setLookupError(null);
                }}
                className={INPUT_CLASS}
                placeholder="비밀번호 입력"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="submit"
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
            <div
              id="order-lookup-error"
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{lookupError.title}</p>
                <p className="mt-1 text-sm leading-relaxed">
                  {lookupError.description}
                </p>
                {lookupError.retryable && (
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={loading}
                    className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-3 text-xs font-semibold hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    다시 시도
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </Reveal>

      {order && (
        <Reveal className="mt-6 lg:mx-auto lg:max-w-4xl">
          <OrderDetailCard order={order} />
        </Reveal>
      )}
    </div>
  );
}
