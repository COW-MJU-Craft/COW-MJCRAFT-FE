import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Reveal from '../../../components/ui/Reveal';
import { canAdvanceTogether, nextOrderStatus } from '../../../features/order/advanceStatus';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { useToast } from '../../../components/toast/useToast';
import { ApiError } from '../../../api/core/client';
import {
  adminOrdersApi,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type AdminOrderStatus,
} from '../../../api/admin/orders';

const STATUS_FILTERS: Array<{ key: 'ALL' | AdminOrderStatus; label: string }> =
  [
    { key: 'ALL', label: '전체' },
    { key: 'PENDING_DEPOSIT', label: '입금 확인 필요' },
    { key: 'PAID', label: '입금 확인 완료' },
    { key: 'IN_PRODUCTION', label: '제작 중' },
    { key: 'READY_TO_SHIP', label: '배송 준비 완료' },
    { key: 'DELIVERED', label: '배송 완료' },
    { key: 'CANCELED', label: '취소' },
    { key: 'REFUND_REQUESTED', label: '환불 요청' },
    { key: 'REFUNDED', label: '환불 완료' },
  ];

const STATUS_LABELS: Record<string, string> = {
  PENDING_DEPOSIT: '입금 확인 필요',
  PAID: '입금 확인 완료',
  IN_PRODUCTION: '제작 중',
  READY_TO_SHIP: '배송 준비 완료',
  DELIVERED: '배송 완료',
  CANCELED: '취소',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
};

const BUYER_TYPE_LABELS: Record<string, string> = {
  STUDENT: '재학생',
  STAFF: '교직원',
  EXTERNAL: '외부인',
  OUTSIDER: '외부인',
};

const CAMPUS_LABELS: Record<string, string> = {
  SEOUL: '인문캠(서울)',
  YONGIN: '자연캠(용인)',
};

const METHOD_LABELS: Record<string, string> = {
  PICKUP: '현장 수령',
  DELIVERY: '택배 배송',
};

const ORDERS_PER_PAGE = 5;

type DetailInfoRow = {
  label: string;
  value: string | number | boolean;
  breakClassName?: string;
};

function getStatusLabel(status?: string) {
  if (!status) return '-';
  return STATUS_LABELS[status] ?? status;
}

function getStatusBadgeClass(status?: string) {
  switch (status) {
    case 'PENDING_DEPOSIT':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'REFUND_REQUESTED':
      return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200';
    case 'REFUNDED':
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
    case 'CANCELED':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  }
}

function formatMoney(value?: number) {
  if (typeof value !== 'number') return '-';
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function infoRows(
  rows: Array<{ label: string; value?: string | number | boolean }>,
) {
  return rows.filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== '',
  );
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function toAdminActionErrorMessage(
  error: unknown,
  action: 'confirm-paid' | 'cancel' | 'confirm-refund',
): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return '관리자 권한이 없어 요청을 처리할 수 없어요. 다시 로그인해주세요.';
    }
    if (error.status === 404) {
      return '주문을 찾을 수 없어요. 목록을 새로고침 후 다시 시도해주세요.';
    }
    if (error.status === 409) {
      return '현재 주문 상태에서는 해당 처리를 할 수 없어요. 최신 상태를 확인해주세요.';
    }
    if (error.status === 500 && action === 'cancel') {
      return '서버 내부 오류가 발생했어요. 메일 발송 또는 상태 변경 중 오류일 수 있어요.';
    }
  }

  const fallback =
    action === 'confirm-paid'
      ? '입금 확인 처리에 실패했어요.'
      : action === 'confirm-refund'
        ? '환불 완료 처리에 실패했어요.'
        : '처리에 실패했어요.';
  return toErrorMessage(error, fallback);
}

function CompactInfoList({
  rows,
  valueClassName = 'text-sm text-slate-800',
}: {
  rows: DetailInfoRow[];
  valueClassName?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={[
            'flex items-start justify-between gap-4 px-3 py-3',
            index > 0 ? 'border-t border-slate-200' : '',
          ].join(' ')}
        >
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {row.label}
          </p>
          <p
            className={[
              'min-w-0 flex-1 text-right',
              valueClassName,
              row.breakClassName ?? 'break-words',
            ].join(' ')}
          >
            {String(row.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function AdminOrdersPage({ projectId, onOrdersChanged }: {
  projectId?: number;
  onOrdersChanged?: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const ordersSectionRef = useRef<HTMLElement | null>(null);
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const [filter, setFilter] = useState<'ALL' | AdminOrderStatus>('ALL');
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const actionLock = useRef(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const loadOrders = useCallback(async () => {
    const request = ++listRequest.current;
    setCheckedIds([]);
    setLoading(true);
    setError(null);
    try {
      const status = filter === 'ALL' ? undefined : filter;
      const list = projectId === undefined
        ? await adminOrdersApi.list(status)
        : await adminOrdersApi.listByProject(projectId, status);
      if (request !== listRequest.current) return;
      setOrders(list);
      if (list.length === 0) {
        setSelectedOrderId(null);
        setDetail(null);
        return;
      }
      setSelectedOrderId((prev) => {
        if (prev && list.some((item) => item.orderId === prev)) return prev;
        return list[0].orderId;
      });
    } catch (err) {
      if (request !== listRequest.current) return;
      console.error(err);
      setError(toErrorMessage(err, '주문 목록을 불러오지 못했어요.'));
      setOrders([]);
      setSelectedOrderId(null);
      setDetail(null);
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }, [filter, projectId]);

  const loadDetail = useCallback(
    async (orderId: number) => {
      const request = ++detailRequest.current;
      setDetailLoading(true);
      try {
        const data = await adminOrdersApi.getById(orderId);
        if (request !== detailRequest.current) return;
        setDetail(data);
      } catch (err) {
        if (request !== detailRequest.current) return;
        console.error(err);
        toast.error(toErrorMessage(err, '주문 상세를 불러오지 못했어요.'));
        setDetail(null);
      } finally {
        if (request === detailRequest.current) setDetailLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    // 주문 목록 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
    // Invalidate all outstanding requests, including manual refreshes after this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { listRequest.current++; };
  }, [loadOrders]);

  useEffect(() => {
    if (!selectedOrderId) return;
    // 선택된 주문 상세 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetail(selectedOrderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { detailRequest.current++; };
  }, [selectedOrderId, loadDetail]);

  const selectedOrder = useMemo(
    () => orders.find((item) => item.orderId === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const selectedStatus = detail?.order?.status ?? selectedOrder?.status;
  const checkedOrders = orders.filter((order) => checkedIds.includes(order.orderId));
  const selectionAllowed = (item: AdminOrderListItem) => checkedIds.includes(item.orderId) ||
    canAdvanceTogether([...checkedOrders.map((order) => order.status), item.status]);
  const toggleChecked = (item: AdminOrderListItem) => {
    if (actionLoading || loading || !selectionAllowed(item)) return;
    setCheckedIds((ids) => ids.includes(item.orderId) ? ids.filter((id) => id !== item.orderId) : [...ids, item.orderId]);
  };

  const handleAdvance = async (bulk: boolean) => {
    if (projectId === undefined || actionLock.current || actionLoading || loading || detailLoading) return;
    const ids = bulk ? checkedIds : selectedOrderId ? [selectedOrderId] : [];
    const statuses = bulk ? checkedOrders.map((order) => order.status) : selectedStatus ? [selectedStatus] : [];
    if (!canAdvanceTogether(statuses) || ids.length !== statuses.length) return;
    actionLock.current = true;
    setActionLoading(true);
    try {
      const ok = await confirm.open({
        title: `${ids.length}건 주문 상태 진행`,
        description: `${getStatusLabel(statuses[0])} → ${getStatusLabel(nextOrderStatus(statuses[0]))}\n다른 프로젝트 상품이 포함된 경우 해당 주문 전체의 상태가 함께 변경됩니다. 일괄 처리는 한 건이라도 실패하면 전체 취소됩니다.`,
        confirmText: '상태 변경', cancelText: '닫기',
      });
      if (!ok) return;
      try {
        if (bulk) await adminOrdersApi.advanceStatuses(projectId, ids);
        else await adminOrdersApi.advanceStatus(projectId, ids[0]);
        toast.success(`${ids.length}건의 주문 상태를 변경했습니다.`);
      } catch (err) {
        toast.error(err instanceof ApiError && err.status === 409
          ? '주문 상태 충돌 또는 재고 부족으로 처리하지 못했습니다. 최신 상태를 확인해주세요.'
          : '처리 결과를 확인하지 못했습니다. 최신 주문 상태를 확인한 후 다시 시도해주세요.');
      }
      setCheckedIds([]);
      setDetail(null);
      setSelectedOrderId(null);
      detailRequest.current++;
      onOrdersChanged?.();
      await loadOrders();
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };
  const selectedOrderIndex = useMemo(
    () => orders.findIndex((item) => item.orderId === selectedOrderId),
    [orders, selectedOrderId],
  );
  const totalListPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const currentListPage =
    selectedOrderIndex >= 0
      ? Math.floor(selectedOrderIndex / ORDERS_PER_PAGE) + 1
      : 1;
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentListPage - 1) * ORDERS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [currentListPage, orders]);

  const handleConfirmPaid = async () => {
    if (!selectedOrderId) return;
    if (selectedStatus !== 'PENDING_DEPOSIT') {
      toast.error('입금 확인은 입금 확인 필요 상태에서만 처리할 수 있어요.');
      return;
    }

    const ok = await confirm.open({
      title: '입금 확인 처리',
      description: '이 주문을 입금 확인 완료 상태로 변경할까요?',
      confirmText: '확정',
      cancelText: '취소',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      await adminOrdersApi.confirmPaid(selectedOrderId);
      onOrdersChanged?.();
      toast.success('입금 확인 완료 처리했습니다.');
      await loadOrders();
      await loadDetail(selectedOrderId);
    } catch (err) {
      console.error(err);
      toast.error(toAdminActionErrorMessage(err, 'confirm-paid'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrRefundRequest = async () => {
    if (!selectedOrderId) return;
    if (selectedStatus !== 'PENDING_DEPOSIT' && selectedStatus !== 'PAID') {
      toast.error('현재 주문 상태에서는 취소/환불요청 처리가 불가능해요.');
      return;
    }

    const ok = await confirm.open({
      title: selectedStatus === 'PAID' ? '환불 요청 처리' : '주문 취소',
      description:
        selectedStatus === 'PAID'
          ? '이 주문을 환불 요청 상태로 변경할까요?'
          : '이 주문을 취소 상태로 변경할까요?',
      confirmText: '처리',
      cancelText: '닫기',
    });
    if (!ok) return;

    const reason = window.prompt('취소/환불 사유를 입력하세요. (선택)');

    setActionLoading(true);
    try {
      await adminOrdersApi.cancelOrRequestRefund(
        selectedOrderId,
        reason?.trim() || undefined,
      );
      onOrdersChanged?.();
      toast.success('요청을 처리했습니다.');
      await loadOrders();
      await loadDetail(selectedOrderId);
    } catch (err) {
      console.error(err);
      toast.error(toAdminActionErrorMessage(err, 'cancel'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedOrderId) return;
    if (selectedStatus !== 'REFUND_REQUESTED') {
      toast.error('환불 완료는 환불 요청 상태에서만 처리할 수 있어요.');
      return;
    }

    const ok = await confirm.open({
      title: '환불 완료 처리',
      description: '이 주문을 환불 완료 상태로 변경할까요?',
      confirmText: '확정',
      cancelText: '취소',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      await adminOrdersApi.confirmRefund(selectedOrderId);
      onOrdersChanged?.();
      toast.success('환불 완료 처리했습니다.');
      await loadOrders();
      await loadDetail(selectedOrderId);
    } catch (err) {
      console.error(err);
      toast.error(toAdminActionErrorMessage(err, 'confirm-refund'));
    } finally {
      setActionLoading(false);
    }
  };

  const buyerRows = useMemo(
    () =>
      infoRows([
        { label: '이름', value: detail?.buyer?.name },
        {
          label: '구매자 구분',
          value: detail?.buyer?.buyerType
            ? (BUYER_TYPE_LABELS[detail.buyer.buyerType] ??
              detail.buyer.buyerType)
            : undefined,
        },
        {
          label: '캠퍼스',
          value: detail?.buyer?.campus
            ? (CAMPUS_LABELS[detail.buyer.campus] ?? detail.buyer.campus)
            : undefined,
        },
        { label: '연락처', value: detail?.buyer?.phone },
        { label: '이메일', value: detail?.buyer?.email },
        { label: '학과/부서', value: detail?.buyer?.departmentOrMajor },
        { label: '학번', value: detail?.buyer?.studentNo },
        { label: '환불 은행', value: detail?.buyer?.refundBank },
        { label: '환불 계좌', value: detail?.buyer?.refundAccount },
        { label: '유입 경로', value: detail?.buyer?.referralSource },
      ]),
    [detail],
  );

  const fulfillmentRows = useMemo(
    () =>
      infoRows([
        {
          label: '수령 방식',
          value: detail?.fulfillment?.method
            ? (METHOD_LABELS[detail.fulfillment.method] ??
              detail.fulfillment.method)
            : undefined,
        },
        { label: '수령자', value: detail?.fulfillment?.receiverName },
        { label: '수령자 연락처', value: detail?.fulfillment?.receiverPhone },
        {
          label: '정보 확인',
          value:
            detail?.fulfillment?.infoConfirmed === undefined
              ? undefined
              : detail.fulfillment.infoConfirmed
                ? '확인 완료'
                : '미확인',
        },
        { label: '우편번호', value: detail?.fulfillment?.postalCode },
        { label: '기본 주소', value: detail?.fulfillment?.addressLine1 },
        { label: '상세 주소', value: detail?.fulfillment?.addressLine2 },
        { label: '배송 메모', value: detail?.fulfillment?.deliveryMemo },
      ]),
    [detail],
  );

  const statusHistoryRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];

    if (detail?.order?.canceledAt) {
      rows.push({
        label: '취소 시각',
        value: formatDateTime(detail.order.canceledAt),
      });
    }

    if (detail?.order?.refundRequestedAt) {
      rows.push({
        label: '환불 요청 시각',
        value: formatDateTime(detail.order.refundRequestedAt),
      });
    }

    if (detail?.order?.refundedAt) {
      rows.push({
        label: '환불 완료 시각',
        value: formatDateTime(detail.order.refundedAt),
      });
    }

    if (detail?.order?.cancelReason) {
      rows.push({
        label:
          selectedStatus === 'REFUND_REQUESTED' || selectedStatus === 'REFUNDED'
            ? '환불 사유'
            : '취소 사유',
        value: detail.order.cancelReason,
      });
    }

    return rows;
    // React Compiler가 optional chaining 경로별 의존성을 안정적으로 추적하지 못해
    // 메모이제이션을 보존할 수 없다는 경고가 발생한다. detail 객체 자체를 의존성으로 사용해
    // 컴파일러 추론과 일치시킨다.
  }, [detail, selectedStatus]);

  const summaryRows = useMemo<DetailInfoRow[]>(
    () => [
      {
        label: '주문번호',
        value: detail?.order?.orderNo ?? selectedOrder?.orderNo ?? '-',
        breakClassName: 'break-all',
      },
      {
        label: '상태',
        value: getStatusLabel(selectedStatus),
        breakClassName: 'break-words',
      },
      {
        label: '총액',
        value: formatMoney(detail?.order?.totalAmount),
        breakClassName: 'break-words',
      },
      {
        label: '배송비',
        value: formatMoney(detail?.order?.shippingFee),
        breakClassName: 'break-words',
      },
      {
        label: '최종 결제금액',
        value: formatMoney(detail?.order?.finalAmount),
        breakClassName: 'break-words',
      },
      {
        label: '입금 마감',
        value: formatDateTime(
          detail?.order?.depositDeadline ?? selectedOrder?.depositDeadline,
        ),
        breakClassName: 'break-words',
      },
      {
        label: '입금자명',
        value:
          detail?.order?.depositorName ?? selectedOrder?.depositorName ?? '-',
        breakClassName: 'break-words',
      },
      {
        label: '주문일',
        value: formatDateTime(
          detail?.order?.createdAt ?? selectedOrder?.createdAt,
        ),
        breakClassName: 'break-words',
      },
    ],
    [detail, selectedOrder, selectedStatus],
  );

  const scrollToElement = (ref: RefObject<HTMLElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleOrderSelect = (orderId: number) => {
    if (actionLoading) return;
    setDetail(null);
    setSelectedOrderId(orderId);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      scrollToElement(detailSectionRef);
    }
  };

  const handleListPageChange = (page: number) => {
    if (actionLoading) return;
    const nextPage = Math.min(Math.max(page, 1), totalListPages);
    const targetOrder = orders[(nextPage - 1) * ORDERS_PER_PAGE];
    if (!targetOrder) return;
    setSelectedOrderId(targetOrder.orderId);
    scrollToElement(ordersSectionRef);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:py-10">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl text-primary sm:text-3xl">
              주문 관리
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {projectId ? '금액은 다른 프로젝트 상품과 배송비를 포함한 주문 전체 기준입니다.' : '전체 프로젝트 주문'}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
            <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
            {STATUS_FILTERS.map((item) => {
              const active = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  disabled={actionLoading}
                  className={[
                    'shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm',
                    active
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <section
            ref={ordersSectionRef}
            className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
          >
            <h2 className="text-lg font-bold text-slate-900">주문 목록</h2>
            {projectId !== undefined && <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3 text-sm">
              <span>{checkedIds.length}/200건 선택</span>
              <button type="button" onClick={() => setCheckedIds([])} disabled={actionLoading || checkedIds.length === 0} className="underline disabled:opacity-40">선택 해제</button>
              <button type="button" onClick={() => void handleAdvance(true)}
                disabled={actionLoading || loading || detailLoading || !canAdvanceTogether(checkedOrders.map((order) => order.status))}
                className="rounded-lg bg-primary px-3 py-2 font-semibold text-white disabled:opacity-40">
                {actionLoading ? '처리 중...' : `선택 주문 ${getStatusLabel(nextOrderStatus(checkedOrders[0]?.status))} 처리`}
              </button>
            </div>}
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                목록을 불러오는 중...
              </p>
            ) : error ? (
              <p className="py-10 text-center text-sm font-semibold text-rose-600">
                {error}
              </p>
            ) : orders.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                주문이 없습니다.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {paginatedOrders.map((item) => {
                    const selected = selectedOrderId === item.orderId;
                    return (
                      <div key={item.orderId}>
                      {projectId !== undefined && <label className="mb-2 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={checkedIds.includes(item.orderId)} disabled={actionLoading || loading || !selectionAllowed(item)} onChange={() => toggleChecked(item)} />
                        {item.orderNo ?? `#${item.orderId}`} 선택
                      </label>}
                      <button
                        type="button"
                        onClick={() => handleOrderSelect(item.orderId)}
                        className={[
                          'w-full rounded-2xl border p-4 text-left transition',
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/10'
                            : 'border-slate-200 bg-white hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 break-all text-sm font-bold text-slate-900">
                            {item.orderNo ?? `#${item.orderId}`}
                          </p>
                          <span
                            className={[
                              'shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold',
                              getStatusBadgeClass(item.status),
                            ].join(' ')}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
                          <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              구매자
                            </dt>
                            <dd className="mt-1 break-words text-sm text-slate-800">
                              {item.buyerName ?? '-'}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              금액
                            </dt>
                            <dd className="mt-1 break-words text-sm text-slate-800">
                              {formatMoney(item.finalAmount)}
                            </dd>
                          </div>
                          <div className="col-span-2 min-w-0">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              주문일
                            </dt>
                            <dd className="mt-1 break-words text-sm text-slate-800">
                              {formatDateTime(item.createdAt)}
                            </dd>
                          </div>
                        </dl>
                      </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="min-w-[720px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500">
                        {projectId !== undefined && <th className="px-3 py-2">선택</th>}
                        <th className="px-3 py-2">주문번호</th>
                        <th className="px-3 py-2">상태</th>
                        <th className="px-3 py-2">구매자</th>
                        <th className="px-3 py-2">금액</th>
                        <th className="px-3 py-2">주문일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((item) => {
                        const selected = selectedOrderId === item.orderId;
                        return (
                          <tr
                            key={item.orderId}
                            onClick={() => handleOrderSelect(item.orderId)}
                            className={[
                              'cursor-pointer border-t border-slate-100 transition',
                              selected ? 'bg-primary/5' : 'hover:bg-slate-50',
                            ].join(' ')}
                          >
                            {projectId !== undefined && <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                              <input type="checkbox" aria-label={`${item.orderNo ?? item.orderId} 선택`} checked={checkedIds.includes(item.orderId)} disabled={actionLoading || loading || !selectionAllowed(item)} onChange={() => toggleChecked(item)} />
                            </td>}
                            <td className="px-3 py-3 font-semibold text-slate-800">
                              <span className="break-all">
                                {item.orderNo ?? `#${item.orderId}`}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {getStatusLabel(item.status)}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {item.buyerName ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-slate-700">
                              {formatMoney(item.finalAmount)}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {formatDateTime(item.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalListPages > 1 && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-right text-xs font-medium text-slate-500">
                      총 {orders.length}건 · {currentListPage}/{totalListPages} 페이지
                    </p>

                    <div className="mt-3 flex justify-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleListPageChange(currentListPage - 1)}
                        disabled={currentListPage === 1}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        이전
                      </button>

                      {Array.from({ length: totalListPages }, (_, index) => {
                        const page = index + 1;
                        const active = page === currentListPage;
                        return (
                          <button
                            key={page}
                            type="button"
                            onClick={() => handleListPageChange(page)}
                            className={[
                              'min-w-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                              active
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            {page}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => handleListPageChange(currentListPage + 1)}
                        disabled={currentListPage === totalListPages}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        다음
                      </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </Reveal>

        <Reveal>
          <section
            ref={detailSectionRef}
            className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:scroll-mt-28 sm:p-5"
          >
            <h2 className="text-lg font-bold text-slate-900">주문 상세</h2>
            {!selectedOrderId ? (
              <p className="mt-4 text-sm text-slate-500">
                목록에서 주문을 선택해주세요.
              </p>
            ) : detailLoading ? (
              <p className="mt-4 text-sm text-slate-500">
                상세를 불러오는 중...
              </p>
            ) : !detail ? (
              <p className="mt-4 text-sm text-rose-600">
                주문 상세를 불러오지 못했습니다.
              </p>
            ) : (
              <>
                <div className="mt-4 sm:hidden">
                  <CompactInfoList
                    rows={summaryRows}
                    valueClassName="text-sm font-semibold text-slate-900"
                  />
                </div>

                <div className="mt-4 hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2">
                  {summaryRows.map((row) => (
                    <div
                      key={row.label}
                      className="rounded-xl bg-slate-50 px-3 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {row.label}
                      </p>
                      <p
                        className={[
                          'mt-1 text-sm font-semibold text-slate-900',
                          row.breakClassName,
                        ].join(' ')}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>

                {statusHistoryRows.length > 0 && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {statusHistoryRows.map((row) => (
                      <p key={row.label} className="break-words">
                        {row.label}: {row.value}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {projectId !== undefined && selectedStatus !== 'PENDING_DEPOSIT' && nextOrderStatus(selectedStatus) && (
                    <button type="button" onClick={() => void handleAdvance(false)} disabled={actionLoading || loading || detailLoading}
                      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                      {getStatusLabel(nextOrderStatus(selectedStatus))} 처리
                    </button>
                  )}
                  {selectedStatus === 'PENDING_DEPOSIT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void (projectId === undefined ? handleConfirmPaid() : handleAdvance(false))}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 sm:w-auto"
                      >
                        입금 확인
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCancelOrRefundRequest()}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60 sm:w-auto"
                      >
                        주문 취소
                      </button>
                    </>
                  )}
                  {selectedStatus === 'PAID' && (
                    <button
                      type="button"
                      onClick={() => void handleCancelOrRefundRequest()}
                      disabled={actionLoading}
                      className="w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-60 sm:w-auto"
                    >
                      환불 요청 처리
                    </button>
                  )}
                  {selectedStatus === 'REFUND_REQUESTED' && (
                    <button
                      type="button"
                      onClick={() => void handleConfirmRefund()}
                      disabled={actionLoading}
                      className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 sm:w-auto"
                    >
                      환불 완료 확정
                    </button>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900">
                    주문 상품
                  </h3>
                  <div className="mt-2 space-y-2">
                    {detail.items.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        주문 상품이 없습니다.
                      </p>
                    ) : (
                      detail.items.map((item, index) => (
                        <div
                          key={`${item.projectItemId ?? 'item'}-${index}`}
                          className="rounded-xl bg-slate-50 px-3 py-3 text-sm"
                        >
                          <p className="break-words font-semibold text-slate-800">
                            {item.itemName ??
                              `상품 #${item.projectItemId ?? '-'}`}
                          </p>
                          <p className="mt-1 break-words text-slate-600">
                            수량 {item.quantity ?? '-'} / 단가{' '}
                            {formatMoney(item.unitPrice)} / 금액{' '}
                            {formatMoney(item.lineAmount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900">
                    구매자 정보
                  </h3>
                  {buyerRows.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      구매자 정보가 없습니다.
                    </p>
                  ) : (
                    <>
                      <div className="mt-2 sm:hidden">
                        <CompactInfoList
                          rows={buyerRows.map((row) => ({
                            label: row.label,
                            value: String(row.value),
                          }))}
                        />
                      </div>

                      <div className="mt-2 hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2">
                        {buyerRows.map((row) => (
                          <div
                            key={row.label}
                            className="rounded-xl bg-slate-50 px-3 py-3 text-sm"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {row.label}
                            </p>
                            <p className="mt-1 break-words text-sm text-slate-800">
                              {String(row.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-bold text-slate-900">
                    수령 정보
                  </h3>
                  {fulfillmentRows.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">
                      수령 정보가 없습니다.
                    </p>
                  ) : (
                    <>
                      <div className="mt-2 sm:hidden">
                        <CompactInfoList
                          rows={fulfillmentRows.map((row) => ({
                            label: row.label,
                            value: String(row.value),
                          }))}
                        />
                      </div>

                      <div className="mt-2 hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2">
                        {fulfillmentRows.map((row) => (
                          <div
                            key={row.label}
                            className="rounded-xl bg-slate-50 px-3 py-3 text-sm"
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {row.label}
                            </p>
                            <p className="mt-1 break-words text-sm text-slate-800">
                              {String(row.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
