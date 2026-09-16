import { useState } from 'react';
import { customersApi } from '../../api/site/customers';

type CustomerEnrollmentCardProps = {
  initialEmail?: string;
};

export default function CustomerEnrollmentCard({
  initialEmail = '',
}: CustomerEnrollmentCardProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateEmail = (value: string) => {
    setEmail(value);
    setCode('');
    setCodeRequested(false);
    setIsComplete(false);
    setMessage(null);
  };

  const requestEmailCode = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage('주문에 사용한 이메일을 입력해주세요.');
      return;
    }

    setIsSendingCode(true);
    setMessage(null);
    try {
      await customersApi.sendEmailCode(normalizedEmail);
      setCodeRequested(true);
      setMessage('인증 코드를 이메일로 보냈어요. 메일함을 확인해주세요.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : '인증 코드 발송에 실패했어요. 잠시 후 다시 시도해주세요.',
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const enrollCustomer = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !code.trim()) {
      setMessage('이메일과 인증 코드를 입력해주세요.');
      return;
    }
    if (!password) {
      setMessage('비밀번호를 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setMessage('비밀번호 확인이 일치하지 않아요.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      await customersApi.enroll({
        email: normalizedEmail,
        code: code.trim(),
        password,
      });
      setIsComplete(true);
      setMessage(
        '저장했어요. 이제 이메일과 비밀번호로 주문 내역을 조회할 수 있어요.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : '주문 정보 저장에 실패했어요. 입력값을 확인해주세요.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isSendingCode || isSubmitting || isComplete;

  return (
    <section className="rounded-[28px] border border-primary/20 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6">
      <h2 className="text-lg font-bold text-slate-900 sm:text-lg">
        주문 정보 저장
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        이메일 인증 후 비밀번호를 등록하면, 다음부터 이메일과 비밀번호로 모든
        주문 내역을 조회할 수 있어요.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-sm font-semibold text-slate-700">
          주문 이메일
          <input
            type="email"
            value={email}
            disabled={disabled}
            autoComplete="email"
            onChange={(event) => updateEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50"
            placeholder="주문에 사용한 이메일"
          />
        </label>
        <button
          type="button"
          onClick={() => void requestEmailCode()}
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSendingCode
            ? '발송 중...'
            : codeRequested
              ? '코드 재발송'
              : '인증 코드 받기'}
        </button>
      </div>

      {codeRequested && !isComplete && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            이메일 인증 코드
            <input
              inputMode="numeric"
              value={code}
              disabled={disabled}
              onChange={(event) => setCode(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50"
              placeholder="6자리 코드"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            비밀번호
            <input
              type="password"
              value={password}
              disabled={disabled}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50"
              placeholder="비밀번호 입력"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            비밀번호 확인
            <input
              type="password"
              value={passwordConfirm}
              disabled={disabled}
              autoComplete="new-password"
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50"
              placeholder="비밀번호 다시 입력"
            />
          </label>
          <button
            type="button"
            onClick={() => void enrollCustomer()}
            disabled={disabled}
            className="mt-auto inline-flex h-11 items-center justify-center rounded-xl border border-primary/20 px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '저장 중...' : '주문 정보 저장'}
          </button>
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </section>
  );
}
