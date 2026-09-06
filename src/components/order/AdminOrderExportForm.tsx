import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import type { AdminOrderStatus } from '../../api/admin/orders';
import {
  adminOrderExportApi,
  exportQuery,
  type FulfillmentMethod,
} from '../../api/admin/orderExport';
import { ApiError } from '../../api/core/client';

type Props = {
  projectId?: number;
  status?: AdminOrderStatus;
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return '관리자 로그인을 확인해주세요.';
    if (error.status === 404) return '프로젝트 또는 주문 데이터를 찾을 수 없습니다.';
    if (error.status === 400 || error.status === 422) return '다운로드 조건을 확인해주세요.';
  }
  return error instanceof Error ? error.message : '다운로드에 실패했습니다. 다시 시도해주세요.';
}

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function AdminOrderExportForm({ projectId, status }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod | ''>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const allOrders = projectId === undefined;

  const download = async () => {
    if (lock.current) return;
    const filters = {
      startDate,
      endDate,
      status,
      fulfillmentMethod: fulfillmentMethod || undefined,
    };
    try {
      exportQuery(filters, allOrders);
    } catch (err) {
      setError(errorMessage(err));
      return;
    }
    lock.current = true;
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = allOrders
        ? await adminOrderExportApi.all(filters)
        : await adminOrderExportApi.project(projectId, filters);
      saveFile(result.blob, result.fileName);
      setMessage('주문 파일 다운로드를 시작했습니다.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <section className="border-b border-slate-200 py-5">
      <h2 className="text-lg font-bold text-slate-900">주문 엑셀 다운로드</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">시작일
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">종료일
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">수령 방식
          <select value={fulfillmentMethod} onChange={(event) => setFulfillmentMethod(event.target.value as FulfillmentMethod | '')}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3">
            <option value="">전체</option>
            <option value="PICKUP">현장 수령</option>
            <option value="DELIVERY">택배 배송</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {allOrders
          ? '전체 주문 다운로드는 시작일과 종료일을 모두 입력해야 합니다.'
          : '프로젝트 주문은 날짜를 모두 비우거나 시작일과 종료일을 함께 입력할 수 있습니다.'}
        {status ? ' 현재 주문 상태 필터도 파일에 적용됩니다.' : ''}
      </p>
      <button type="button" onClick={() => void download()} disabled={pending}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40">
        <Download size={16} />{pending ? '파일 준비 중...' : 'XLSX 다운로드'}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    </section>
  );
}
