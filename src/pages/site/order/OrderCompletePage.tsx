import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Copy } from 'lucide-react';
import type {
  OrderCompletePageContent,
  OrderCompletePaymentInfo,
} from '../../../types/order';
import {
  isOrderCompletePageNotFoundError,
  orderCompletePageApi,
} from '../../../api/orderCompletePage';
import Reveal from '../../../components/ui/Reveal';
import { useToast } from '../../../components/toast/useToast';

type OrderCompleteState = {
  orderNo?: string;
  status?: string;
  lookupId?: string;
  depositDeadline?: string;
  viewToken?: string;
  createdAt?: string;
  totalAmount?: number;
  shippingFee?: number;
  finalAmount?: number;
  messageTitle?: string;
  messageDescription?: string;
  paymentInformation?: string;
  paymentTitle?: string;
  paymentDescription?: string;
  paymentInfo?: OrderCompletePaymentInfo | null;
};

type DisplayOrder = {
  orderNo?: string;
  status?: string;
  lookupId?: string;
  depositDeadline?: string;
  createdAt?: string;
  totalAmount?: number;
  shippingFee?: number;
  finalAmount?: number;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_DEPOSIT: '입금 대기',
  PAID: '입금 완료',
  CANCELED: '주문 취소',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
};

const EMPTY_CONTENT: OrderCompletePageContent = {};
const EMPTY_ITEMS: readonly [] = [];

function getStatusTextClass(status?: string) {
  switch (status) {
    case 'PENDING_DEPOSIT':
      return 'font-bold text-amber-700';
    case 'PAID':
      return 'font-bold text-emerald-700';
    case 'CANCELED':
      return 'font-bold text-rose-700';
    case 'REFUND_REQUESTED':
      return 'font-bold text-indigo-700';
    case 'REFUNDED':
      return 'font-bold text-slate-700';
    default:
      return 'font-semibold text-slate-900';
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return `${value.toLocaleString('ko-KR')}원`;
}

function resolveDepositDeadlineText(
  raw: string | undefined,
  orderNo: string | undefined,
) {
  if (raw && raw.trim().length > 0) return formatDateTime(raw);

  const fromOrderNo = parseOrderNoDate(orderNo);
  const base = fromOrderNo ?? new Date();
  const deadline = new Date(base);
  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(23, 59, 0, 0);
  return formatDateTime(deadline.toISOString());
}

function parseOrderNoDate(orderNo: string | undefined) {
  if (!orderNo) return null;
  const match = orderNo.match(/(\d{14})/);
  if (!match) return null;
  const value = match[1];
  const yyyy = Number(value.slice(0, 4));
  const mm = Number(value.slice(4, 6));
  const dd = Number(value.slice(6, 8));
  const hh = Number(value.slice(8, 10));
  const mi = Number(value.slice(10, 12));
  const ss = Number(value.slice(12, 14));
  if (
    !Number.isFinite(yyyy) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(dd) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mi) ||
    !Number.isFinite(ss)
  ) {
    return null;
  }
  return new Date(yyyy, mm - 1, dd, hh, mi, ss);
}

function hasPaymentInfo(
  paymentInfo: OrderCompletePaymentInfo | null | undefined,
) {
  if (!paymentInfo) return false;
  return Boolean(
    paymentInfo.bankName ||
    paymentInfo.accountNumber ||
    paymentInfo.accountHolder ||
    paymentInfo.amountLabel ||
    paymentInfo.notice ||
    paymentInfo.amount !== undefined,
  );
}

function extractAccountNumberFromPaymentInformation(
  paymentInformation: string | undefined | null,
) {
  const text = paymentInformation?.trim();
  if (!text) return '';

  const beforeSlash = text.split('/')[0]?.trim() ?? '';
  if (!beforeSlash) return '';

  const parts = beforeSlash.split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function PaymentInfoCard({
  content,
  finalAmount,
  depositDeadlineText,
  showDepositDeadlineNotice,
  paymentAccountNumberToCopy,
  onCopyPaymentAccountNumber,
}: {
  content: OrderCompletePageContent;
  finalAmount?: number;
  depositDeadlineText: string;
  showDepositDeadlineNotice: boolean;
  paymentAccountNumberToCopy: string;
  onCopyPaymentAccountNumber: () => void;
}) {
  const paymentInfo = content.paymentInfo;
  const paymentInformationText = content.paymentInformation?.trim() ?? '';
  const amountText =
    paymentInfo?.amountLabel ??
    formatMoney(paymentInfo?.amount) ??
    formatMoney(finalAmount) ??
    null;
  const hasStructuredPaymentInfo =
    hasPaymentInfo(paymentInfo) || Boolean(amountText);

  if (
    !paymentInformationText &&
    !hasStructuredPaymentInfo &&
    !content.paymentDescription
  ) {
    return null;
  }

  return (
    <Reveal className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">
            {content.paymentTitle?.trim() || '입금 계좌 안내'}
          </h2>
          {content.paymentDescription && (
            <p className="mt-2 text-sm leading-6 text-slate-600 sm:leading-relaxed">
              {content.paymentDescription}
            </p>
          )}
        </div>
        {paymentAccountNumberToCopy && (
          <button
            type="button"
            onClick={onCopyPaymentAccountNumber}
            aria-label="계좌번호 복사"
            title="계좌번호 복사"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:hidden"
          >
            <Copy size={12} aria-hidden="true" />
          </button>
        )}
      </div>

      {paymentInformationText && (
        <div className="relative mt-4 rounded-2xl border border-red-200 bg-linear-to-br from-red-50 to-rose-50 px-4 py-3 text-center text-[0.82rem] font-bold leading-5 text-red-700 shadow-sm wrap-break-word break-keep sm:px-16 sm:py-4 sm:text-base sm:leading-relaxed">
          <p>{paymentInformationText}</p>
          {paymentAccountNumberToCopy && (
            <button
              type="button"
              onClick={onCopyPaymentAccountNumber}
              aria-label="계좌번호 복사"
              title="계좌번호 복사"
              className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              <Copy size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {hasStructuredPaymentInfo && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {paymentInfo?.bankName && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              은행명: {paymentInfo.bankName}
            </div>
          )}
          {paymentInfo?.accountNumber && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              계좌번호: {paymentInfo.accountNumber}
            </div>
          )}
          {paymentInfo?.accountHolder && (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
              예금주: {paymentInfo.accountHolder}
            </div>
          )}
          {amountText && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-center sm:col-span-2 sm:py-3">
              <p className="text-xs font-semibold tracking-wide text-sky-700">
                입금 금액
              </p>
              <p className="mt-1 text-[1.45rem] font-extrabold text-sky-700 sm:text-xl">
                {amountText}
              </p>
            </div>
          )}
        </div>
      )}

      {showDepositDeadlineNotice && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            입금 마감
          </p>
          <p className="mt-1 text-lg font-extrabold text-amber-900">
            {depositDeadlineText}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            마감 전까지 입금을 완료해야 관리자의 입금 확인 후, 주문이 확정돼요.
          </p>
        </div>
      )}

      {paymentInfo?.notice && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          {paymentInfo.notice}
        </div>
      )}
    </Reveal>
  );
}

export default function OrderCompletePage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const state = useMemo(
    () => (location.state ?? {}) as OrderCompleteState,
    [location.state],
  );
  const queryToken = searchParams.get('token')?.trim() ?? '';
  const token = queryToken || state.viewToken?.trim() || '';

  const orderCompletePageQuery = useQuery({
    queryKey: ['order-complete-page', token],
    queryFn: () => orderCompletePageApi.getByToken(token),
    enabled: Boolean(token),
    retry: 1,
  });

  const stateContent = useMemo<OrderCompletePageContent>(() => {
    return {
      messageTitle: state.messageTitle,
      messageDescription: state.messageDescription,
      paymentInformation: state.paymentInformation,
      paymentTitle: state.paymentTitle,
      paymentDescription: state.paymentDescription,
      paymentInfo: state.paymentInfo ?? undefined,
    };
  }, [state]);
  const queriedContent = orderCompletePageQuery.data?.content ?? EMPTY_CONTENT;
  const pageContent = useMemo<OrderCompletePageContent>(() => {
    return {
      ...stateContent,
      ...queriedContent,
      paymentInfo: queriedContent.paymentInfo ?? stateContent.paymentInfo,
    };
  }, [queriedContent, stateContent]);
  const items = useMemo(
    () => orderCompletePageQuery.data?.items ?? EMPTY_ITEMS,
    [orderCompletePageQuery.data?.items],
  );
  const displayOrder = useMemo<DisplayOrder>(
    () => ({
      orderNo: orderCompletePageQuery.data?.order?.orderNo ?? state.orderNo,
      status: orderCompletePageQuery.data?.order?.status ?? state.status,
      lookupId: orderCompletePageQuery.data?.order?.lookupId ?? state.lookupId,
      depositDeadline:
        orderCompletePageQuery.data?.order?.depositDeadline ??
        state.depositDeadline,
      createdAt:
        orderCompletePageQuery.data?.order?.createdAt ?? state.createdAt,
      totalAmount:
        orderCompletePageQuery.data?.order?.totalAmount ?? state.totalAmount,
      shippingFee:
        orderCompletePageQuery.data?.order?.shippingFee ?? state.shippingFee,
      finalAmount:
        orderCompletePageQuery.data?.order?.finalAmount ?? state.finalAmount,
    }),
    [orderCompletePageQuery.data, state],
  );
  const loading = Boolean(token) && orderCompletePageQuery.isFetching;
  const errorMessage = useMemo(() => {
    const error = orderCompletePageQuery.error;
    if (!error) return null;
    return isOrderCompletePageNotFoundError(error)
      ? '주문 완료 페이지 정보를 찾지 못했어요. 발급받은 링크가 만료되었거나 유효하지 않을 수 있어요.'
      : error instanceof Error
        ? error.message
        : '주문 완료 페이지를 불러오지 못했어요.';
  }, [orderCompletePageQuery.error]);

  useEffect(() => {
    if (!state.orderNo && errorMessage) {
      toast.error(errorMessage);
    }
  }, [errorMessage, state.orderNo, toast]);

  const statusLabel = displayOrder.status
    ? (STATUS_LABELS[displayOrder.status] ?? displayOrder.status)
    : '-';
  const depositDeadlineText = resolveDepositDeadlineText(
    displayOrder.depositDeadline,
    displayOrder.orderNo,
  );
  const canCopyLookupId = Boolean(
    displayOrder.lookupId && displayOrder.lookupId.trim().length > 0,
  );
  const paymentAccountNumberToCopy = useMemo(
    () =>
      pageContent.paymentInfo?.accountNumber?.trim() ||
      extractAccountNumberFromPaymentInformation(
        pageContent.paymentInformation,
      ),
    [pageContent.paymentInfo?.accountNumber, pageContent.paymentInformation],
  );
  const shouldHighlightDepositDeadline =
    displayOrder.status === 'PENDING_DEPOSIT';
  const totalQuantity = useMemo(
    () =>
      items.reduce((sum, item) => {
        if (typeof item.quantity !== 'number') return sum;
        return sum + item.quantity;
      }, 0),
    [items],
  );
  const summaryRows = useMemo(
    () => [
      {
        key: 'orderNo',
        label: '주문번호',
        value: displayOrder.orderNo ?? '-',
        valueBreakClassName: 'break-all',
      },
      {
        key: 'status',
        label: '주문상태',
        value: statusLabel,
        rawStatus: displayOrder.status,
      },
      {
        key: 'lookupId',
        label: '조회 아이디',
        value: displayOrder.lookupId ?? '-',
        valueBreakClassName: 'break-all',
      },
      {
        key: 'depositDeadline',
        label: '입금 마감',
        value: shouldHighlightDepositDeadline ? undefined : depositDeadlineText,
      },
      {
        key: 'totalAmount',
        label: '총 상품금액',
        value: formatMoney(displayOrder.totalAmount) ?? '-',
      },
      {
        key: 'shippingFee',
        label: '배송비',
        value: formatMoney(displayOrder.shippingFee) ?? '-',
      },
      {
        key: 'finalAmount',
        label: '최종 결제금액',
        value: formatMoney(displayOrder.finalAmount) ?? '-',
      },
    ],
    [
      depositDeadlineText,
      displayOrder.finalAmount,
      displayOrder.lookupId,
      displayOrder.orderNo,
      displayOrder.shippingFee,
      displayOrder.status,
      displayOrder.totalAmount,
      shouldHighlightDepositDeadline,
      statusLabel,
    ],
  ).filter((row) => row.value && row.value !== '-');

  const copyLookupId = async () => {
    if (!canCopyLookupId) return;
    try {
      await navigator.clipboard.writeText(displayOrder.lookupId!.trim());
      toast.success('조회 아이디를 복사했어요.');
    } catch {
      toast.error('복사에 실패했어요. 직접 입력해주세요.');
    }
  };

  const copyPaymentAccountNumber = async () => {
    if (!paymentAccountNumberToCopy) return;
    try {
      await navigator.clipboard.writeText(paymentAccountNumberToCopy);
      toast.success('계좌번호를 복사했어요.');
    } catch {
      toast.error('복사에 실패했어요. 직접 입력해주세요.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-36 sm:py-12 sm:pb-12">
      <Reveal>
        <section className="rounded-[32px] border border-emerald-200 bg-linear-to-br from-emerald-50 to-white px-5 py-4 shadow-sm sm:rounded-3xl sm:p-6">
          <p className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
            ORDER RECEIVED
          </p>
          <h1 className="mt-3 font-heading text-[1.75rem] leading-[1.08] tracking-tight text-emerald-900 break-keep sm:mt-3 sm:text-3xl sm:leading-none">
            {pageContent.messageTitle?.trim() || '주문이 접수되었어요'}
          </h1>
          {pageContent.messageDescription ? (
            <p className="mt-3 text-[0.9rem] leading-7 text-emerald-800 sm:mt-2 sm:text-sm sm:leading-relaxed">
              {pageContent.messageDescription}
            </p>
          ) : (
            <p className="mt-3 text-[0.9rem] leading-7 text-emerald-800 sm:mt-2 sm:text-sm sm:leading-relaxed">
              아래 입금 마감 시간 전까지 입금을 완료하면 주문이 확정됩니다.
            </p>
          )}
          {loading && (
            <p className="mt-3 text-sm font-semibold text-emerald-900">
              주문 완료 페이지 정보를 불러오는 중...
            </p>
          )}
        </section>
      </Reveal>

      {errorMessage && (
        <Reveal className="mt-6 rounded-[28px] border border-rose-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <p className="text-sm leading-relaxed text-rose-700">
            {errorMessage}
          </p>
        </Reveal>
      )}

      <PaymentInfoCard
        content={pageContent}
        finalAmount={displayOrder.finalAmount}
        depositDeadlineText={depositDeadlineText}
        showDepositDeadlineNotice={shouldHighlightDepositDeadline}
        paymentAccountNumberToCopy={paymentAccountNumberToCopy}
        onCopyPaymentAccountNumber={() => void copyPaymentAccountNumber()}
      />

      <Reveal className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 sm:text-lg">
          주문 핵심 정보
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {summaryRows.map((row) => (
            <div key={row.key} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {row.label}
              </p>
              {row.key === 'lookupId' && canCopyLookupId ? (
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p
                    className={[
                      'text-base font-semibold text-slate-900',
                      row.valueBreakClassName ?? 'wrap-break-word',
                    ].join(' ')}
                  >
                    {row.value}
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyLookupId()}
                    aria-label="조회 아이디 복사"
                    title="조회 아이디 복사"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy size={12} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <p
                  className={[
                    'mt-1 text-base',
                    row.valueBreakClassName ?? 'wrap-break-word',
                    row.key === 'status'
                      ? getStatusTextClass(row.rawStatus)
                      : 'font-semibold text-slate-900',
                  ].join(' ')}
                >
                  {row.value}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:p-4">
          <p className="text-[0.95rem] font-bold text-amber-900 sm:text-sm">
            다음 단계 안내
          </p>
          <ol className="mt-2 space-y-1 text-[0.75rem] leading-5 text-amber-900/90 sm:mt-2 sm:space-y-1 sm:text-sm sm:leading-relaxed">
            <li>1. 입금 완료 후 주문 상태가 업데이트돼요.</li>
            <li>2. '조회 아이디+비밀번호'로 주문 조회가 가능해요.</li>
            <li>
              3. 이메일 링크 또는 주문 조회 페이지로 다시 확인할 수 있어요.
            </li>
          </ol>
        </div>

        {!token && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            조회 토큰이 없어 기본 주문 정보만 표시 중입니다. 이후에는 발급된
            링크 기준으로 주문 완료 페이지가 열립니다.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-2">
          <Link
            to="/orders/lookup"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-[15px] font-semibold text-white hover:opacity-95 sm:h-11 sm:text-sm"
          >
            주문 조회하러 가기
          </Link>
          <Link
            to="/projects"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 sm:h-11 sm:px-5 sm:text-sm"
          >
            상품 페이지로 이동
          </Link>
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 sm:h-11 sm:px-5 sm:text-sm"
          >
            홈으로 이동
          </Link>
        </div>
      </Reveal>

      {items.length > 0 && (
        <Reveal className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 sm:text-lg">
            주문 내역
          </h2>
          <div className="mt-4 space-y-3">
            {items.map((item, index) => (
              <div
                key={`${item.projectItemId ?? 'item'}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-slate-900 sm:text-sm">
                      {item.itemName ?? `상품 #${item.projectItemId ?? '-'}`}
                    </p>
                    <p className="mt-1 text-[15px] leading-6 text-slate-600 sm:text-sm sm:leading-normal">
                      수량 {item.quantity ?? '-'}개
                      {typeof item.unitPrice === 'number' &&
                        ` · 단가 ${formatMoney(item.unitPrice)}`}
                    </p>
                  </div>
                  <p className="text-right text-[1.4rem] font-bold text-slate-900 sm:text-sm">
                    {formatMoney(item.lineAmount) ?? '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-[15px] text-slate-700 sm:px-3 sm:py-2 sm:text-sm">
              총 수량: {totalQuantity}개
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 sm:px-3 sm:py-2 sm:text-sm">
              총 결제금액: {formatMoney(displayOrder.finalAmount) ?? '-'}
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}
