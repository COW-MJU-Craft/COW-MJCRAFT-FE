import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { adminProjectsApi, type AdminProjectStatus } from '../../../api/admin/projects';
import { adminOrdersApi, type AdminOrderStatus } from '../../../api/admin/orders';
import AdminOrderExportForm from '../../../components/order/AdminOrderExportForm';
import AdminOrdersPage from './AdminOrdersPage';

export default function AdminProjectOrdersPage() {
  const [status, setStatus] = useState<AdminProjectStatus | 'ALL'>('OPEN');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [allOrders, setAllOrders] = useState(false);
  const [orderStatus, setOrderStatus] = useState<AdminOrderStatus | undefined>();
  const queryClient = useQueryClient();
  const projects = useQuery({
    queryKey: ['admin-order-projects', status],
    queryFn: () => adminProjectsApi.list(status === 'ALL' ? undefined : status),
  });
  const project = projects.data?.find((item) => item.id === projectId);
  const statistics = useQuery({
    queryKey: ['admin-project-order-statistics', projectId],
    queryFn: () => adminOrdersApi.statistics(projectId!),
    enabled: Boolean(project) && !allOrders,
  });

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-8">
        <h1 className="text-2xl font-bold text-primary">프로젝트별 주문 관리</h1>
        <div className="mt-5 flex flex-wrap items-end gap-3 border-b border-slate-200 pb-5">
          <label className="grid gap-2 text-sm font-semibold">
            프로젝트 상태
            <select className="h-11 rounded-lg border border-slate-300 bg-white px-3" value={status}
              onChange={(e) => { setStatus(e.target.value as typeof status); setProjectId(null); setAllOrders(false); setOrderStatus(undefined); }}>
              <option value="OPEN">진행 중</option><option value="PREPARING">준비 중</option>
              <option value="CLOSED">마감</option><option value="ALL">전체</option>
            </select>
          </label>
          <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">
            프로젝트
            <select className="h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3"
              disabled={projects.isPending || projects.isError} value={allOrders ? '' : projectId ?? ''}
              onChange={(e) => { setProjectId(e.target.value ? Number(e.target.value) : null); setAllOrders(false); setOrderStatus(undefined); }}>
              <option value="">프로젝트 선택</option>
              {projects.data?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <button type="button" title="프로젝트 새로고침" aria-label="프로젝트 새로고침"
            disabled={projects.isFetching} onClick={() => void projects.refetch()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 disabled:opacity-50"><RefreshCw size={18} /></button>
          <button type="button" onClick={() => { setAllOrders(true); setProjectId(null); setOrderStatus(undefined); }}
            className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold">전체 주문</button>
        </div>
        {projects.isPending && <p className="py-5 text-sm text-slate-500">프로젝트를 불러오는 중...</p>}
        {projects.isError && <p role="alert" className="py-5 text-sm text-rose-700">프로젝트를 불러오지 못했습니다. 새로고침해주세요.</p>}
        {projects.isSuccess && projects.data.length === 0 && <p className="py-5 text-sm text-slate-500">해당 상태의 프로젝트가 없습니다.</p>}
        {project && !allOrders && <div className="border-b border-slate-200 py-5">
          <h2 className="break-words text-lg font-bold">{project.title}</h2>
          {statistics.isPending ? <p className="mt-3 text-sm">통계를 불러오는 중...</p> : statistics.isError ?
            <div role="alert" className="mt-3 text-sm text-rose-700">통계를 불러오지 못했습니다.
              <button type="button" className="ml-3 underline" onClick={() => void statistics.refetch()}>다시 시도</button></div> :
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">집계 대상 주문 수</dt><dd className="mt-1 text-xl font-bold">{statistics.data?.orderCount.toLocaleString('ko-KR')}건</dd></div>
              <div><dt className="text-sm text-slate-500">프로젝트 상품 주문금액 · 배송비 제외</dt><dd className="mt-1 text-xl font-bold">{statistics.data?.totalOrderAmount.toLocaleString('ko-KR')}원</dd></div>
            </dl>}
          <p className="mt-3 text-xs text-slate-500">통계는 상태 필터와 무관합니다. 입금 대기·취소·환불 완료는 제외되며 환불 요청은 포함됩니다.</p>
        </div>}
        {(allOrders || project) && (
          <AdminOrderExportForm
            projectId={allOrders ? undefined : projectId!}
            status={orderStatus}
          />
        )}
      </section>
      {(allOrders || project) && <AdminOrdersPage key={allOrders ? 'all' : projectId}
        projectId={allOrders ? undefined : projectId!}
        onFilterChanged={setOrderStatus}
        onOrdersChanged={() => { void queryClient.invalidateQueries({ queryKey: ['admin-project-order-statistics'] }); }} />}
    </>
  );
}
