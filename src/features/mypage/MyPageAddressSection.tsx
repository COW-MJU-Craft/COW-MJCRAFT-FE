import { useMemo } from 'react';
import type { AddressForm, ProfileForm } from './Types';
import { loadDaumPostcodeScript } from '../../utils/daumPostcode';

const REQUIRED = 'text-rose-500 ml-1';

const formatPhoneWithCursor = (value: string, cursor: number) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const build = () => {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const formatted = build();
  const beforeCursor = value.slice(0, cursor).replace(/\D/g, '').length;
  if (beforeCursor === 0) return { formatted, nextCursor: 0 };

  let digitsSeen = 0;
  let nextCursor = formatted.length;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) digitsSeen += 1;
    if (digitsSeen === beforeCursor) {
      nextCursor = i + 1;
      break;
    }
  }

  return { formatted, nextCursor };
};

type Props = {
  form: ProfileForm;
  loading?: boolean;
  addressSavedAt?: string | null;
  addressDirty?: boolean;
  addressExists?: boolean;
  addressError?: boolean;
  onSaveAddress?: () => void;
  onDeleteAddress?: () => void;
  updateAddress: (key: keyof AddressForm, value: string | boolean) => void;
};

export default function MyPageAddressSection({
  form,
  loading,
  addressSavedAt,
  addressDirty,
  addressExists,
  addressError,
  onSaveAddress,
  onDeleteAddress,
  updateAddress,
}: Props) {
  const headerText = useMemo(
    () => ({
      title: '배송지 정보',
      desc: '배송을 위해 정확한 주소를 입력해 주세요.',
    }),
    []
  );

  const openPostcode = async () => {
    try {
      await loadDaumPostcodeScript();
    } catch {
      return;
    }
    if (!window.daum) return;

    const width = 500;
    const height = 600;
    const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
    const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

    new window.daum.Postcode({
      oncomplete: (data) => {
        updateAddress('postCode', data.zonecode);
        updateAddress('address1', data.roadAddress || data.jibunAddress || '');
      },
    }).open({ left, top });
  };

  return (
    <section className="animate-fade-in rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg text-slate-900 sm:text-xl">
            {headerText.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{headerText.desc}</p>
          <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={form.address.isDefault}
              onChange={(e) => updateAddress('isDefault', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            기본 배송지
          </label>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveAddress}
              disabled={loading || !addressDirty}
              className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
            {addressExists && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      '등록된 배송지를 삭제할까요? 이 작업은 되돌릴 수 없습니다.'
                    )
                  ) {
                    onDeleteAddress?.();
                  }
                }}
                className="rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                배송지 삭제
              </button>
            )}
          </div>
          {addressError && (
            <span className="text-xs font-semibold text-rose-600">
              필수 항목을 입력해주세요.
            </span>
          )}
          {addressSavedAt && (
            <span className="text-xs text-emerald-600">
              임시 저장됨: {addressSavedAt}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-800">
            수령인 이름 <span className={REQUIRED}>*</span>
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
            value={form.address.recipientName}
            onChange={(e) => updateAddress('recipientName', e.target.value)}
            placeholder="김명지"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800">
            연락처 <span className={REQUIRED}>*</span>
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
            value={form.address.phoneNumber}
            onChange={(e) => {
              const input = e.currentTarget;
              const cursor = input.selectionStart ?? input.value.length;
              const { formatted, nextCursor } = formatPhoneWithCursor(
                input.value,
                cursor
              );
              updateAddress('phoneNumber', formatted);
              requestAnimationFrame(() => {
                input.setSelectionRange(nextCursor, nextCursor);
              });
            }}
            placeholder="010-0000-0000"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800">
            우편번호 <span className={REQUIRED}>*</span>
          </label>
          <div className="mt-2 flex gap-2">
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
              value={form.address.postCode}
              placeholder="검색 버튼 눌러 선택"
              readOnly
              required
            />
            <button
              type="button"
              aria-label="우편번호 찾기"
              onClick={openPostcode}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M20 20L17 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-800">
            주소 <span className={REQUIRED}>*</span>
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
            value={form.address.address1}
            onChange={(e) => updateAddress('address1', e.target.value)}
            placeholder="검색 결과 자동 입력"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm font-medium text-slate-800">
            상세 주소 <span className={REQUIRED}>*</span>
          </label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-[13px] outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 sm:text-sm"
            value={form.address.address2}
            onChange={(e) => updateAddress('address2', e.target.value)}
            placeholder="101동 1001호"
            required
          />
        </div>
      </div>
    </section>
  );
}
