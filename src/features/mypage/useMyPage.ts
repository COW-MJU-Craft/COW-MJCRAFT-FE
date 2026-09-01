import { useCallback, useEffect, useMemo, useState } from 'react';
import { mypageApi } from '../../api/site/mypage';
import type { MyPageProfile } from '../../api/site/mypage';
import { ApiError } from '../../api/core/client';
import { getAccessToken, setAuth } from '../../utils/auth/auth';
import type { ProfileForm } from './Types';
import { DEFAULT_FORM } from './Types';

type UseMyPageState = {
  form: ProfileForm;
  loading: boolean;
  profileSavedAt: string | null;
  addressSavedAt: string | null;
  profileDirty: boolean;
  addressDirty: boolean;
  addressExists: boolean;
  profileError: boolean;
  addressError: boolean;
};

const mapProfileToForm = (
  prev: ProfileForm,
  profile: MyPageProfile
): ProfileForm => ({
  ...prev,
  name: profile.userName ?? '',
  email: profile.email ?? '',
  phoneNumber: profile.phoneNumber ?? '',
  studentId: profile.studentId ?? '',
  campus: (profile.campus ?? '') as ProfileForm['campus'],
  major: profile.major ?? '',
  birthDate: profile.birthDate ?? '',
  gender: (profile.gender ?? '') as ProfileForm['gender'],
  academicStatus: (profile.academicStatus ??
    '') as ProfileForm['academicStatus'],
  grade: profile.grade ?? '',
  socialProvider: profile.socialProvider ?? '',
  address: {
    ...prev.address,
    recipientName: profile.address?.recipientName ?? '',
    phoneNumber: profile.address?.phoneNumber ?? '',
    postCode: profile.address?.postCode ?? '',
    address1: profile.address?.address ?? '',
    address2: '',
    isDefault: true,
  },
});

const isEmpty = (v: string | undefined | null) => !v || v.trim() === '';

const validateProfile = (form: ProfileForm) => {
  if (isEmpty(form.name)) return false;
  if (isEmpty(form.phoneNumber)) return false;
  if (isEmpty(form.academicStatus)) return false;

  if (form.academicStatus !== 'STAFF' && form.academicStatus !== 'EXTERNAL') {
    if (isEmpty(form.studentId)) return false;
    if (isEmpty(form.major)) return false;
  }

  if (form.academicStatus !== 'EXTERNAL' && isEmpty(form.campus)) return false;

  if (form.academicStatus === 'ENROLLED' && isEmpty(form.grade)) return false;
  if (isEmpty(form.email)) return false;

  return true;
};

const validateAddress = (form: ProfileForm) => {
  const a = form.address;
  if (isEmpty(a.recipientName)) return false;
  if (isEmpty(a.phoneNumber)) return false;
  if (isEmpty(a.postCode)) return false;
  if (isEmpty(a.address1)) return false;
  if (isEmpty(a.address2)) return false;
  return true;
};

export default function useMyPage() {
  const [state, setState] = useState<UseMyPageState>({
    form: DEFAULT_FORM,
    loading: false,
    profileSavedAt: null,
    addressSavedAt: null,
    profileDirty: false,
    addressDirty: false,
    addressExists: false,
    profileError: false,
    addressError: false,
  });

  const updateField = useCallback((key: keyof ProfileForm, value: string) => {
    setState((prev) => ({
      ...prev,
      form: { ...prev.form, [key]: value },
      profileDirty: true,
      profileError: false,
    }));
  }, []);

  const updateAddress = useCallback(
    (key: keyof ProfileForm['address'], value: string | boolean) => {
      setState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          address: { ...prev.form.address, [key]: value },
        },
        addressDirty: true,
        addressError: false,
      }));
    },
    []
  );

  const fetchProfile = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const { data: profile } = await mypageApi.getProfile();
      if (!profile) return;

      setState((prev) => ({
        ...prev,
        form: mapProfileToForm(prev.form, profile),
        profileDirty: false,
        addressDirty: false,
        addressExists: Boolean(profile.address),
        profileError: false,
        addressError: false,
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const PROFILE_UPDATE_ENABLED = false;

  const saveProfile = useCallback(async () => {
    if (!validateProfile(state.form)) {
      setState((prev) => ({ ...prev, profileError: true }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      if (PROFILE_UPDATE_ENABLED) {
        await mypageApi.updateProfile({
          userName: state.form.name,
          email: state.form.email,
          phoneNumber: state.form.phoneNumber || undefined,
          studentId: state.form.studentId || undefined,
          campus: state.form.campus || undefined,
          major: state.form.major || undefined,
          birthDate: state.form.birthDate || undefined,
          gender: state.form.gender || undefined,
          academicStatus: state.form.academicStatus || undefined,
          grade: state.form.grade || undefined,
        });
      }

      setAuth({
        accessToken: getAccessToken() ?? '',
        userName: state.form.name,
      });

      setState((prev) => ({
        ...prev,
        profileSavedAt: new Date().toLocaleString(),
        profileDirty: false,
        profileError: false,
      }));
    } catch (e) {
      if (e instanceof ApiError) {
        setState((prev) => ({ ...prev, profileError: true }));
      }
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.form, PROFILE_UPDATE_ENABLED]);

  const saveAddress = useCallback(async () => {
    if (!validateAddress(state.form)) {
      setState((prev) => ({ ...prev, addressError: true }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));
    try {
      const payload = {
        recipientName: state.form.address.recipientName,
        phoneNumber: state.form.address.phoneNumber,
        postCode: state.form.address.postCode,
        address: state.form.address.address1,
      };

      if (state.addressExists) {
        await mypageApi.updateAddress(payload);
      } else {
        await mypageApi.createAddress(payload);
      }

      setState((prev) => ({
        ...prev,
        addressSavedAt: new Date().toLocaleString(),
        addressDirty: false,
        addressError: false,
      }));
    } catch (e) {
      if (e instanceof ApiError) {
        setState((prev) => ({ ...prev, addressError: true }));
      }
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.form, state.addressExists]);

  const deleteAddress = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await mypageApi.deleteAddress();

      setState((prev) => ({
        ...prev,
        form: {
          ...prev.form,
          address: {
            recipientName: '',
            phoneNumber: '',
            postCode: '',
            address1: '',
            address2: '',
            isDefault: true,
          },
        },
        addressExists: false,
        addressSavedAt: new Date().toLocaleString(),
        addressDirty: false,
        addressError: false,
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      updateField,
      updateAddress,
      fetchProfile,
      saveProfile,
      saveAddress,
      deleteAddress,
    }),
    [
      state,
      updateField,
      updateAddress,
      fetchProfile,
      saveProfile,
      saveAddress,
      deleteAddress,
    ]
  );

  useEffect(() => {
    // 마이페이지 진입 시 프로필 로드: 외부 데이터(서버)와 동기화하는 표준 패턴이라 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  return value;
}
