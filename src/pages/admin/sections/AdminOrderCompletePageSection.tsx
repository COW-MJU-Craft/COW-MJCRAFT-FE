import { useEffect, useMemo, useState } from 'react';
import Reveal from '../../../components/ui/Reveal';
import { ApiError } from '../../../api/core/client';
import {
  adminOrderCompletePageApi,
  type AdminOrderCompletePageUpdateInput,
} from '../../../api/site/orderCompletePage';
import type { OrderCompletePageResponse } from '../../../types/order';

type Props = {
  registerSave: (handler: () => Promise<string | null>) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: () => void;
  saving: boolean;
  isDirty: boolean;
  saveMessage: string | null;
  saveMessageTone: 'success' | 'error' | null;
};

const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-primary/60 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm';

const TEXTAREA_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-primary/60 resize-none sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm';

const EMPTY_FORM: AdminOrderCompletePageUpdateInput = {
  messageTitle: '',
  messageDescription: '',
  paymentInformation: '',
};

function toFormState(
  response: OrderCompletePageResponse,
): AdminOrderCompletePageUpdateInput {
  return {
    messageTitle: response.content.messageTitle ?? '',
    messageDescription: response.content.messageDescription ?? '',
    paymentInformation:
      (response.content.paymentInformation ??
        [
          response.content.paymentInfo?.bankName,
          response.content.paymentInfo?.accountNumber,
        ]
          .filter(Boolean)
          .join(' ')) ||
      '',
  };
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function AdminOrderCompletePageSection({
  registerSave,
  onDirtyChange,
  onSave,
  saving,
  isDirty,
  saveMessage,
  saveMessageTone,
}: Props) {
  const [form, setForm] =
    useState<AdminOrderCompletePageUpdateInput>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    useState<AdminOrderCompletePageUpdateInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminOrderCompletePageApi
      .get()
      .then((response) => {
        if (!active) return;
        const next = toFormState(response);
        setForm(next);
        setInitialForm(next);
      })
      .catch((nextError) => {
        if (!active) return;
        if (nextError instanceof ApiError && nextError.status === 500) {
          setForm(EMPTY_FORM);
          setInitialForm(EMPTY_FORM);
          setWarning('서버에서 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
          return;
        }
        setError(
          toErrorMessage(
            nextError,
            '주문 완료 페이지 설정을 불러오지 못했어요.',
          ),
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    registerSave(async () => {
      if (loading) {
        throw new Error('주문 완료 페이지 설정을 아직 불러오는 중입니다.');
      }
      const saved = await adminOrderCompletePageApi.update(form);
      const next = toFormState(saved);
      setForm(next);
      setInitialForm(next);
      return '주문 완료 페이지 설정을 저장했어요.';
    });
  }, [form, loading, registerSave]);

  const updateField = <K extends keyof AdminOrderCompletePageUpdateInput>(
    key: K,
    value: AdminOrderCompletePageUpdateInput[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div id="order-complete-page">
      <Reveal delayMs={80}>
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl leading-none text-primary sm:text-3xl">
              주문 완료 페이지 설정
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-normal">
              주문 완료 후 안내 문구와 결제 정보 내용(예: 계좌번호 등)을
              수정합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading || !isDirty}
            className={[
              'shrink-0 rounded-2xl px-4 py-2 text-[14px] font-bold text-white shadow-lg transition sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm',
              saving || loading || !isDirty
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-primary hover:opacity-95',
            ].join(' ')}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </Reveal>

      {isDirty && !saveMessage && (
        <p className="mt-4 text-[13px] font-semibold text-slate-500 sm:text-xs">
          변경사항이 있습니다. 저장 버튼을 눌러주세요.
        </p>
      )}

      {saveMessage && (
        <p
          className={[
            'mt-4 text-[14px] font-semibold sm:text-sm',
            saveMessageTone === 'success'
              ? 'text-emerald-600'
              : 'text-rose-600',
          ].join(' ')}
        >
          {saveMessage}
        </p>
      )}

      {loading && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[15px] text-slate-600 sm:mt-6 sm:text-sm">
          설정 정보를 불러오는 중...
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[15px] leading-6 text-rose-700 sm:mt-6 sm:text-sm sm:leading-normal">
          {error}
        </div>
      )}

      {warning && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] leading-6 text-amber-800 sm:mt-6 sm:text-sm sm:leading-normal">
          {warning}
        </div>
      )}

      <Reveal
        delayMs={120}
        className="mt-6 rounded-[28px] bg-white p-5 sm:rounded-3xl sm:p-8"
      >
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:rounded-2xl sm:p-5">
            <h3 className="text-base font-bold text-slate-900 sm:text-sm">
              안내 문구
            </h3>
            <label className="mt-3 block text-[15px] font-semibold text-slate-700 sm:mt-4 sm:text-sm">
              메시지 제목
              <input
                value={form.messageTitle}
                onChange={(event) =>
                  updateField('messageTitle', event.target.value)
                }
                className={INPUT_CLASS}
                placeholder="예) 주문이 접수되었어요!"
              />
            </label>
            <label className="mt-4 block text-[15px] font-semibold text-slate-700 sm:text-sm">
              메시지 설명
              <textarea
                value={form.messageDescription}
                onChange={(event) =>
                  updateField('messageDescription', event.target.value)
                }
                className={`${TEXTAREA_CLASS} h-36 sm:h-44`}
                rows={4}
                placeholder="예) 주문이 접수되었어요. 입금 확인 후 주문이 확정됩니다."
              />
            </label>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:rounded-2xl sm:p-5">
            <h3 className="text-base font-bold text-slate-900 sm:text-sm">
              결제 정보(계좌번호 등)
            </h3>
            <label className="mt-3 block text-[15px] font-semibold text-slate-700 sm:mt-4 sm:text-sm">
              <textarea
                value={form.paymentInformation}
                onChange={(event) =>
                  updateField('paymentInformation', event.target.value)
                }
                className={`${TEXTAREA_CLASS} h-40 sm:h-48`}
                rows={5}
                placeholder="예) 국민은행 123456-78-901234 / 예금주: 홍길동"
              />
            </label>
          </section>
        </div>
      </Reveal>
    </div>
  );
}
