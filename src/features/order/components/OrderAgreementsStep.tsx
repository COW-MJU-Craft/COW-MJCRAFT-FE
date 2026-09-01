import { AGREEMENT_ITEMS } from '../constants';
import type { AgreementState } from '../types';

type OrderAgreementsStepProps = {
  agreements: AgreementState;
  allRequiredAgreed: boolean;
  onAgreementChange: (key: keyof AgreementState, checked: boolean) => void;
};

export default function OrderAgreementsStep({
  agreements,
  allRequiredAgreed,
  onAgreementChange,
}: OrderAgreementsStepProps) {
  return (
    <>
      <h2 className="font-heading text-xl text-slate-900">구매 전 필수 동의</h2>
      <p className="mt-1 text-sm text-slate-600">
        아래 항목은 모두 필수 동의입니다.
      </p>

      <div className="mt-5 space-y-3">
        {AGREEMENT_ITEMS.map((agreement) => (
          <label
            key={agreement.key}
            className="block rounded-2xl border-2 border-slate-200 p-4 hover:bg-slate-50"
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreements[agreement.key]}
                onChange={(event) =>
                  onAgreementChange(agreement.key, event.target.checked)
                }
                className="mt-1 h-5 w-5 rounded-sm border-2 border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
              />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {agreement.title}{' '}
                  <span className="text-slate-700">[필수]</span>{' '}
                  <span className="text-rose-600">*</span>
                </p>
                <p className="mt-3 text-xs font-bold text-slate-800">
                  {agreement.noticeTitle}
                </p>
                {agreement.paragraphs.map((paragraph, idx) => (
                  <p
                    key={`${agreement.key}-p-${idx}`}
                    className="mt-2 text-xs leading-relaxed text-slate-600"
                  >
                    {paragraph}
                  </p>
                ))}
                <p className="mt-3 text-xs font-semibold text-rose-600">
                  {agreement.question}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {!allRequiredAgreed && (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          필수 동의 항목에 체크하지 않으면 구매를 진행할 수 없어요.
        </p>
      )}
    </>
  );
}
