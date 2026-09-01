import type { OrderStep } from '../types';

type OrderStepActionsProps = {
  step: OrderStep;
  isSubmitting: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export default function OrderStepActions({
  step,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
}: OrderStepActionsProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={step === 0}
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        이전
      </button>

      {step < 4 ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95"
        >
          다음
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? '제출 중...' : '구매 제출'}
        </button>
      )}
    </div>
  );
}
