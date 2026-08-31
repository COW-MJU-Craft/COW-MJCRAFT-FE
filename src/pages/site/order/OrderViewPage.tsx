import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ordersApi, type OrderDetailResponse } from '../../../api/orders';
import { ApiError } from '../../../api/client';
import OrderDetailCard from '../../../components/order/OrderDetailCard';
import Reveal from '../../../components/ui/Reveal';
import { useToast } from '../../../components/toast/useToast';

type OrderViewErrorState = {
  title: string;
  description: string;
};

function getOrderViewErrorState(error: unknown): OrderViewErrorState {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return {
        title: '링크 형식이 올바르지 않아요',
        description:
          '이메일에 포함된 주문 조회 토큰이 없거나 잘못되었어요. 메일의 링크를 다시 열거나 조회 아이디로 주문을 확인해주세요.',
      };
    }
    if (error.status === 404) {
      return {
        title: '유효하지 않은 주문 조회 링크예요',
        description:
          '해당 링크로 확인할 수 있는 주문 정보를 찾지 못했어요. 메일을 다시 확인하거나 조회 아이디로 주문을 조회해주세요.',
      };
    }
    if (error.status === 410) {
      return {
        title: '주문 조회 링크가 만료되었어요',
        description:
          '이메일 조회 링크의 사용 기간이 지났어요. 조회 아이디와 비밀번호로 다시 확인해주세요.',
      };
    }
  }

  return {
    title: '주문 정보를 불러오지 못했어요',
    description:
      '잠시 후 다시 시도하거나 조회 아이디와 비밀번호로 주문을 다시 확인해주세요.',
  };
}

export default function OrderViewPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [viewError, setViewError] = useState<OrderViewErrorState | null>(null);

  useEffect(() => {
    if (!token) {
      // 토큰 없는 잘못된 접근: 외부 상태(URL 쿼리)와 동기화하는 표준 패턴이라 예외 처리한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      setViewError(null);
      try {
        const result = await ordersApi.viewOrder(token);
        if (!active) return;
        setOrder(result);
      } catch (error) {
        if (!active) return;
        setOrder(null);
        const nextError = getOrderViewErrorState(error);
        setViewError(nextError);
        if (
          !(error instanceof ApiError) ||
          ![400, 404, 410].includes(error.status)
        ) {
          toast.error(
            error instanceof Error ? error.message : '주문 조회에 실패했어요.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [token, toast]);

  if (!token) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Reveal>
          <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="font-heading text-2xl text-slate-900">
              잘못된 주문 조회 링크예요
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              이메일 링크에 조회 토큰이 없어 주문 정보를 확인할 수 없어요.
              메일의 링크를 다시 열거나 조회 아이디로 다시 확인해주세요.
            </p>
            <Link
              to="/orders/lookup"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95"
            >
              주문 조회 페이지로 이동
            </Link>
          </section>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Reveal>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="font-heading text-3xl text-slate-900">주문 조회</h1>
          <p className="mt-2 text-sm text-slate-600">
            이메일 링크를 통해 주문 정보를 불러왔어요.
          </p>
          {loading && (
            <p className="mt-3 text-sm font-semibold text-primary">
              조회 중...
            </p>
          )}
        </section>
      </Reveal>

      {!loading && order && (
        <Reveal className="mt-6">
          <OrderDetailCard order={order} />
        </Reveal>
      )}

      {!loading && !order && (
        <Reveal className="mt-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              {viewError?.title ?? '주문 정보를 가져오지 못했어요'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {viewError?.description ??
                '잠시 후 다시 시도하거나 조회 아이디로 주문을 다시 확인해주세요.'}
            </p>
            <Link
              to="/orders/lookup"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              조회 아이디로 다시 조회
            </Link>
          </section>
        </Reveal>
      )}
    </div>
  );
}
