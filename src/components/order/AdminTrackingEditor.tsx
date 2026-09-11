import { useEffect, useId, useRef, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/core/client';
import { adminOrdersApi } from '../../api/admin/orders';
import { useConfirm } from '../confirm/useConfirm';

type Props = {
  projectId: number;
  orderId: number;
  initialValue: string | null;
  disabled?: boolean;
  onSaved: (value: string | null) => void;
};

export default function AdminTrackingEditor({ projectId, orderId, initialValue, disabled, onSaved }: Props) {
  const id = useId();
  const confirm = useConfirm();
  const normalizedInitialValue = initialValue?.trim() || null;
  const [value, setValue] = useState(normalizedInitialValue ?? '');
  const [savedValue, setSavedValue] = useState<string | null>(normalizedInitialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mounted = useRef(true);
  const lock = useRef(false);
  const request = useRef(0);
  const identity = `${projectId}:${orderId}`;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    request.current++;
    // The selected order is an external source of truth, so its saved value
    // intentionally replaces a draft from the previously selected order.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(normalizedInitialValue ?? '');
    setSavedValue(normalizedInitialValue);
    setError('');
    setSuccess('');
  }, [identity, normalizedInitialValue]);

  const save = async (remove = false) => {
    if (disabled || lock.current) return;
    const normalized = remove ? null : value.trim() || null;
    if (normalized && normalized.length > 500) {
      setError('운송장 정보는 500자 이내로 입력해주세요.');
      return;
    }

    if (normalized === savedValue) return;

    lock.current = true;
    const currentRequest = ++request.current;
    try {
      if (normalized === null && savedValue !== null) {
        const ok = await confirm.open({
          title: '운송장 삭제', description: '등록된 운송장 정보를 삭제할까요?',
          confirmText: '삭제', cancelText: '닫기', danger: true,
        });
        if (!ok || !mounted.current || currentRequest !== request.current) return;
      }

      if (!mounted.current || currentRequest !== request.current) return;
      setPending(true);
      setError('');
      setSuccess('');
      const result = await adminOrdersApi.updateTrackingInformation(projectId, orderId, normalized);
      if (!mounted.current || currentRequest !== request.current) return;
      if (result.orderId !== orderId) throw new Error('Unexpected order response');
      setValue(result.trackingInformation ?? '');
      setSavedValue(result.trackingInformation ?? null);
      onSaved(result.trackingInformation);
      setSuccess(result.trackingInformation ? '운송장 정보를 저장했습니다.' : '운송장 정보를 삭제했습니다.');
    } catch (err) {
      if (!mounted.current || currentRequest !== request.current) return;
      const status = err instanceof ApiError ? err.status : undefined;
      setError(status === 401 || status === 403 ? '관리자 로그인을 확인해주세요.'
        : status === 404 ? '주문 또는 수령 정보를 찾을 수 없습니다. 주문을 다시 조회해주세요.'
        : status === 400 || status === 422 ? '운송장 입력값을 확인해주세요. 최대 500자까지 저장할 수 있습니다.'
        : '저장 결과를 확인하지 못했습니다. 주문을 다시 조회한 후 재시도해주세요.');
    } finally {
      lock.current = false;
      if (mounted.current && currentRequest === request.current) setPending(false);
    }
  };

  const normalizedValue = value.trim() || null;

  return (
    <form className="mt-4 border-t border-slate-200 pt-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label htmlFor={id} className="text-sm font-bold text-slate-900">운송장 정보</label>
      <textarea id={id} value={value} maxLength={500} rows={3} disabled={pending || disabled}
        placeholder="택배사와 운송장 번호" aria-invalid={Boolean(error)} aria-describedby={`${id}-status`}
        onChange={(event) => { setValue(event.target.value); setError(''); setSuccess(''); }}
        className="mt-2 block w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm disabled:opacity-50" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{value.length}/500</span>
        <div className="flex gap-2">
          <button type="button" onClick={() => void save(true)} disabled={pending || disabled || savedValue === null}
            className="flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 disabled:opacity-40"><Trash2 size={16} />삭제</button>
          <button type="submit" disabled={pending || disabled || normalizedValue === savedValue}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-40"><Save size={16} />{pending ? '저장 중...' : '저장'}</button>
        </div>
      </div>
      <div id={`${id}-status`} className="mt-2 text-sm">
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        {success && <p role="status" className="text-emerald-700">{success}</p>}
      </div>
    </form>
  );
}
