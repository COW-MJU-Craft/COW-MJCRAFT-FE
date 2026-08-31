import MyPageForm from '../../../features/mypage/MyPageForm';
import useMyPage from '../../../features/mypage/useMyPage';

export default function MyPage() {
  const {
    form,
    loading,
    profileSavedAt,
    addressSavedAt,
    profileDirty,
    addressDirty,
    addressExists,
    profileError,
    addressError,
    updateField,
    updateAddress,
    saveProfile,
    saveAddress,
    deleteAddress,
  } = useMyPage();

  return (
    <MyPageForm
      form={form}
      loading={loading}
      profileSavedAt={profileSavedAt}
      addressSavedAt={addressSavedAt}
      profileDirty={profileDirty}
      addressDirty={addressDirty}
      addressExists={addressExists}
      profileError={profileError}
      addressError={addressError}
      updateField={updateField}
      updateAddress={updateAddress}
      onSaveProfile={saveProfile}
      onSaveAddress={saveAddress}
      onDeleteAddress={deleteAddress}
    />
  );
}
