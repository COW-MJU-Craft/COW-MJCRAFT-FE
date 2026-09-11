import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { adminOrderPolicyApi, parseShippingFee } from '../../../api/admin/orderPolicy';
import { ApiError } from '../../../api/core/client';
import { useConfirm } from '../../../components/confirm/useConfirm';

const POLICY_KEY = ['admin-order-policy'];

function errorMessage(error: unknown, saving: boolean) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return '관리자 로그인을 확인해주세요.';
    if (error.status === 404) return '주문 정책이 등록되지 않았습니다. 서버 설정을 확인해주세요.';
    if (error.status === 400 || error.status === 422) return '배송비 입력값을 확인해주세요.';
  }
  return saving
    ? '저장 결과를 확인하지 못했습니다. 현재 배송비를 새로고침한 후 다시 시도해주세요.'
    : '배송비 정책을 불러오지 못했습니다. 다시 시도해주세요.';
}

export default function AdminOrderPolicyPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const policy = useQuery({
    queryKey: POLICY_KEY,
    queryFn: adminOrderPolicyApi.get,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const input = draft ?? (policy.data ? String(policy.data.defaultShippingFee) : '');
  let amount: number | null = null;
  let validation = '';
  try {
    amount = parseShippingFee(input);
  } catch (err) {
    validation = err instanceof Error ? err.message : '배송비를 확인해주세요.';
  }

  const save = async () => {
    if (lock.current || policy.isFetching || !policy.data || amount === null || amount === policy.data.defaultShippingFee) return;
    const nextFee = amount;
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const ok = await confirm.open({
        title: '기본 배송비 변경',
        description: `${policy.data.defaultShippingFee.toLocaleString('ko-KR')}원 → ${nextFee.toLocaleString('ko-KR')}원으로 변경할까요?`,
        confirmText: '변경', cancelText: '닫기',
      });
      if (!ok) return;
      const saved = await adminOrderPolicyApi.update(nextFee);
      queryClient.setQueryData(POLICY_KEY, saved);
      setDraft(null);
      const refreshed = await policy.refetch();
      if (refreshed.isError) {
        setError('저장은 완료됐지만 최신 정책 재조회에 실패했습니다. 새로고침해주세요.');
      } else {
        setMessage('기본 배송비를 저장했습니다.');
      }
    } catch (err) {
      setError(errorMessage(err, true));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link to="/admin/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft size={16} />주문 관리</Link>
      <div className="mt-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-primary">배송비 설정</h1>
        <button type="button" title="배송비 새로고침" aria-label="배송비 새로고침"
          disabled={pending || policy.isFetching} onClick={() => { setError(''); setMessage(''); void policy.refetch(); }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white disabled:opacity-40"><RefreshCw size={18} /></button>
      </div>
      {policy.isPending && <p role="status" className="py-8 text-sm text-slate-600">배송비 정책을 불러오는 중...</p>}
      {policy.isError && <p role="alert" className="mt-5 text-sm text-rose-700">{errorMessage(policy.error, false)}</p>}
      {policy.data && (
        <form className="max-w-lg py-6" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <dl className="mb-6">
            <dt className="text-sm text-slate-600">현재 기본 배송비</dt>
            <dd className="mt-2 text-2xl font-bold text-slate-900">{policy.data.defaultShippingFee.toLocaleString('ko-KR')}원</dd>
          </dl>
          <label htmlFor="shipping-fee" className="text-sm font-semibold">변경할 기본 배송비</label>
          <div className="mt-2 flex items-center gap-3">
            <input id="shipping-fee" type="text" inputMode="numeric" value={input} disabled={pending}
              aria-invalid={draft !== null && Boolean(validation)} aria-describedby="shipping-fee-error"
              onChange={(event) => { setDraft(event.target.value); setError(''); setMessage(''); }}
              className="h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-right text-base focus:outline-primary disabled:opacity-50" />
            <span className="text-sm">원</span>
          </div>
          <p id="shipping-fee-error" className="mt-2 min-h-5 text-sm text-rose-700">{draft !== null ? validation : ''}</p>
          <button type="submit" disabled={pending || policy.isFetching || amount === null || amount === policy.data.defaultShippingFee}
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white disabled:opacity-40"><Save size={16} />{pending ? '저장 중...' : '저장'}</button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
