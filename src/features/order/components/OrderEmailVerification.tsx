import { useState } from 'react';
import { customersApi } from '../../../api/site/customers';
import {
  createThrowawayPassword,
  getEmailVerificationError,
} from '../emailVerification';

type OrderEmailVerificationProps = {
  email: string;
  verified: boolean;
  onVerified: (email: string) => void;
};

/**
 * 인증 코드는 이 컴포넌트의 메모리 상태로만 다룬다.
 * 부모는 이메일이 바뀔 때 key를 바꿔 입력값을 함께 폐기한다.
 */
export default function OrderEmailVerification({
  email,
  verified,
  onVerified,
}: OrderEmailVerificationProps) {
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim();

  const sendCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await customersApi.sendEmailCode(normalizedEmail);
      setCodeSent(true);
      setMessage('인증 코드를 요청했어요. 메일함을 확인해주세요.');
    } catch (error) {
      setMessage(getEmailVerificationError(error));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) {
      setMessage('인증 코드를 입력해주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await customersApi.enroll({
        email: normalizedEmail,
        code: code.trim(),
        password: createThrowawayPassword(),
      });
      setCode('');
      onVerified(normalizedEmail);
    } catch (error) {
      setMessage(getEmailVerificationError(error));
    } finally {
      setBusy(false);
    }
  };

  if (verified) {
    return (
      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700">
        이메일 인증이 완료됐어요.
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-rose-600">
        주문하려면 이메일 인증이 필요해요.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        입력한 이메일로 6자리 인증 코드를 보내드려요.
      </p>
      <button
        type="button"
        onClick={() => void sendCode()}
        disabled={busy || normalizedEmail.length === 0}
        className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {codeSent ? '인증 코드 재발송' : '인증 코드 받기'}
      </button>

      {codeSent && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="block min-w-[160px] flex-1 text-sm font-semibold text-slate-700">
            인증 코드
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              disabled={busy}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50"
              placeholder="6자리 코드"
            />
          </label>
          <button
            type="button"
            onClick={() => void submitCode()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? '확인 중...' : '인증 완료'}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-3 text-xs font-semibold text-slate-600" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
