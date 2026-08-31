import { useMemo } from 'react';
import Reveal from '../../components/ui/Reveal';
import type { AddressForm, ProfileForm } from './Types';
import MyPageProfileSection from './MyPageProfileSection';
import MyPageAddressSection from './MyPageAddressSection';

type Props = {
  form: ProfileForm;
  loading?: boolean;
  profileSavedAt?: string | null;
  addressSavedAt?: string | null;
  profileDirty?: boolean;
  addressDirty?: boolean;
  addressExists?: boolean;
  profileError?: boolean;
  addressError?: boolean;
  onSaveProfile?: () => void;
  onSaveAddress?: () => void;
  onDeleteAddress?: () => void;
  updateField: (key: keyof ProfileForm, value: string) => void;
  updateAddress: (key: keyof AddressForm, value: string | boolean) => void;
};

export default function MyPageForm({
  form,
  loading,
  profileSavedAt,
  addressSavedAt,
  profileDirty,
  addressDirty,
  addressExists,
  profileError,
  addressError,
  onSaveProfile,
  onSaveAddress,
  onDeleteAddress,
  updateField,
  updateAddress,
}: Props) {
  const headerText = useMemo(
    () => ({
      title: 'MY PAGE',
      desc: '기본 정보와 배송지 정보를 관리할 수 있어요.',
    }),
    []
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-6 sm:py-14">
      <Reveal>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              aria-label="메인 화면으로 이동"
              className="inline-flex items-center text-primary transition hover:-translate-x-0.5 hover:text-primary/80"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="font-heading text-2xl text-primary sm:text-3xl">
              {headerText.title}
            </h1>
          </div>
          <p className="text-sm text-slate-600 sm:text-base">
            {headerText.desc}
          </p>
        </div>
      </Reveal>

      <form className="mt-8 space-y-8">
        <Reveal delayMs={80}>
          <MyPageProfileSection
            form={form}
            loading={loading}
            profileSavedAt={profileSavedAt}
            profileDirty={profileDirty}
            profileError={profileError}
            onSaveProfile={onSaveProfile}
            updateField={updateField}
          />
        </Reveal>

        <Reveal delayMs={120}>
          <MyPageAddressSection
            form={form}
            loading={loading}
            addressSavedAt={addressSavedAt}
            addressDirty={addressDirty}
            addressExists={addressExists}
            addressError={addressError}
            onSaveAddress={onSaveAddress}
            onDeleteAddress={onDeleteAddress}
            updateAddress={updateAddress}
          />
        </Reveal>
      </form>
    </div>
  );
}
