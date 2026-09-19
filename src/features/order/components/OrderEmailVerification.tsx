import { useState } from 'react';
import { customersApi } from '../../../api/site/customers';
import { getEmailVerificationError } from '../emailVerification';

type Mode = 'code' | 'password';

type OrderEmailVerificationProps = {
  email: string;
  verified: boolean;
  onVerified: (email: string) => void;
};

const FIELD_CLASS =
  'mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50';

/**
 * 인증 코드·비밀번호는 이 컴포넌트의 메모리 상태로만 다룬다.
 * 부모는 이메일이 바뀔 때 key를 바꿔 입력값을 함께 폐기한다.
 */
export default function OrderEmailVerification({
  email,
  verified,
  onVerified,
}: OrderEmailVerificationProps) {
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim();
  const canStart = normalizedEmail.length > 0 && !busy;

  const changeMode = (next: Mode) => {
    setMode(next);
    setCode('');
    setPassword('');
    setMessage(null);
  };

  const finish = () => {
    setCode('');
    setPassword('');
    setMessage(null);
    onVerified(normalizedEmail);
  };

  const sendCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await customersApi.sendEmailCode(normalizedEmail);
      setCodeSent(true);
      setMessage('인증 코드를 요청했어요. 메일함을 확인해주세요.');
    } catch (error) {
      setMessage(getEmailVerificationError(error, 'code'));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim() || !password) {
      setMessage('인증 코드와 설정할 비밀번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await customersApi.enroll({
        email: normalizedEmail,
        code: code.trim(),
        password,
      });
      finish();
    } catch (error) {
      setMessage(getEmailVerificationError(error, 'code'));
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!password) {
      setMessage('비밀번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await customersApi.verifyCredentials({
        email: normalizedEmail,
        password,
      });
      finish();
    } catch (error) {
      setMessage(getEmailVerificationError(error, 'password'));
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
      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
        {(
          [
            ['code', '처음이에요 / 비밀번호를 잊었어요'],
            ['password', '이미 비밀번호를 설정했어요'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => changeMode(value)}
            className={[
              'rounded-lg px-3 py-1.5 transition',
              mode === value
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-white',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'code' ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-slate-500">
            이메일로 받은 6자리 코드와 앞으로 사용할 비밀번호를 입력해주세요.
            이미 등록된 이메일이면 비밀번호가 새로 설정돼요.
          </p>
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={!canStart}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {codeSent ? '인증 코드 재발송' : '인증 코드 받기'}
          </button>
          {codeSent && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                인증 코드
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  disabled={busy}
                  onChange={(event) => setCode(event.target.value)}
                  className={FIELD_CLASS}
                  placeholder="6자리 코드"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                비밀번호
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                  className={FIELD_CLASS}
                  placeholder="설정할 비밀번호"
                />
              </label>
              <button
                type="button"
                onClick={() => void submitCode()}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? '확인 중...' : '인증 완료'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              className={FIELD_CLASS}
              placeholder="설정해 둔 비밀번호"
            />
          </label>
          <button
            type="button"
            onClick={() => void submitPassword()}
            disabled={!canStart}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? '확인 중...' : '인증하기'}
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
