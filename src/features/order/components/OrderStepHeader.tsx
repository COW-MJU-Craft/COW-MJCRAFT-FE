import Reveal from '../../../components/ui/Reveal';
import { STEP_ITEMS } from '../constants';
import { formatMoney } from '../format';
import type { OrderStep } from '../types';

type OrderStepHeaderProps = {
  currentStep: OrderStep;
  totalCount: number;
  totalPrice: number;
  onStepClick: (step: OrderStep) => void;
};

export default function OrderStepHeader({
  currentStep,
  totalCount,
  totalPrice,
  onStepClick,
}: OrderStepHeaderProps) {
  return (
    <Reveal>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-heading text-3xl text-slate-900">주문서</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEP_ITEMS.map((item) => (
            <span
              key={`step-${item.step}`}
              onClick={() => onStepClick(item.step)}
              className={[
                'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-primary/30 hover:text-primary',
                item.step === currentStep
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-400',
              ].join(' ')}
            >
              {item.step}. {item.title}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          총 {totalCount}개 상품, 합계 {formatMoney(totalPrice)}원
        </p>
      </section>
    </Reveal>
  );
}
