import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import {
  customersApi,
  type CustomerCredentials,
  type CustomerOrderSummary,
} from '../../../api/site/customers';
import type { OrderDetailResponse } from '../../../api/site/orders';
import OrderDetailCard from '../../../components/order/OrderDetailCard';
import Reveal from '../../../components/ui/Reveal';
import {
  getOrderLookupErrorState,
  type OrderLookupErrorState,
} from '../../../features/order/lookupError';

const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-rose-400 aria-[invalid=true]:focus:ring-rose-100';

const STATUS_LABELS: Record<string, string> = {
  PENDING_DEPOSIT: '입금 대기',
  PAID: '입금 완료',
  CANCELED: '주문 취소',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
};

function formatMoney(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

export default function OrderLookupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<CustomerOrderSummary[] | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [lookupError, setLookupError] =
    useState<OrderLookupErrorState | null>(null);

  const credentials = (): CustomerCredentials => ({
    email: email.trim(),
    password,
  });

  const clearResults = () => {
    setOrders(null);
    setSelectedOrderId(null);
    setOrder(null);
    setLookupError(null);
  };

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLookupError({
        title: '입력 정보를 확인해주세요',
        description: '이메일과 비밀번호를 모두 입력해주세요.',
        fieldRelated: true,
        retryable: false,
      });
      return;
    }

    setLoading(true);
    setLookupError(null);
    setOrder(null);
    setSelectedOrderId(null);
    try {
      setOrders(await customersApi.getOrders(credentials()));
    } catch (error) {
      setOrders(null);
      setLookupError(getOrderLookupErrorState(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (orderId: number) => {
    setLoading(true);
    setLookupError(null);
    setSelectedOrderId(orderId);
    try {
      setOrder(await customersApi.getOrderDetail(orderId, credentials()));
    } catch (error) {
      setOrder(null);
      setSelectedOrderId(null);
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
            주문 조회
          </Link>
          <p className="mt-2 text-sm text-slate-600 lg:mt-0">
            주문에 사용한 이메일과 등록한 비밀번호로 주문 내역을 확인하세요.
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
              이메일
              <input
                type="email"
                value={email}
                disabled={loading}
                autoComplete="email"
                aria-invalid={lookupError?.fieldRelated || undefined}
                aria-describedby={lookupError ? 'order-lookup-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearResults();
                }}
                className={INPUT_CLASS}
                placeholder="주문에 사용한 이메일"
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
                  clearResults();
                }}
                className={INPUT_CLASS}
                placeholder="등록한 비밀번호"
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
            <Link
              to="/orders/enroll"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none"
            >
              비밀번호 등록/재설정
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

      {orders && (
        <Reveal className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">내 주문</h2>
          {orders.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              이 이메일로 확인할 수 있는 주문이 없어요.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {orders.map((summary) => (
                <li key={summary.orderId}>
                  <button
                    type="button"
                    onClick={() => void handleSelectOrder(summary.orderId)}
                    disabled={loading}
                    className="grid w-full grid-cols-1 gap-1 rounded-2xl border border-slate-200 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {summary.itemSummary}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {summary.orderNo} · {formatDateTime(summary.createdAt)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-slate-700 sm:text-right">
                      {STATUS_LABELS[summary.status] ?? summary.status} ·{' '}
                      {formatMoney(summary.finalAmount)}
                    </span>
                    {selectedOrderId === summary.orderId && loading && (
                      <span className="text-xs font-semibold text-primary sm:col-span-2">
                        주문 상세를 불러오는 중...
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      )}

      {order && (
        <Reveal className="mt-6 lg:mx-auto lg:max-w-4xl">
          <OrderDetailCard order={order} />
        </Reveal>
      )}
    </div>
  );
}
