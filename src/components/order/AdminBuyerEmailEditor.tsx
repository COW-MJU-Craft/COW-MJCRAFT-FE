import { useEffect, useId, useRef, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { ApiError } from '../../api/core/client';
import { adminOrdersApi } from '../../api/admin/orders';
import { useConfirm } from '../confirm/useConfirm';

type Props = {
  orderId: number;
  initialEmail: string;
  disabled?: boolean;
  onSaved: (email: string) => void | Promise<void>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) {
      return '이메일 형식을 확인해주세요.';
    }
    if (error.status === 403) {
      return '관리자 권한을 확인해주세요. 다시 로그인한 뒤 시도해주세요.';
    }
    if (error.status === 404) {
      return '주문자 정보를 찾을 수 없어요. 주문을 다시 선택해주세요.';
    }
  }

  return error instanceof Error && error.message.trim()
    ? error.message
    : '이메일 정정 결과를 확인하지 못했어요. 잠시 후 다시 시도해주세요.';
}

export default function AdminBuyerEmailEditor({
  orderId,
  initialEmail,
  disabled = false,
  onSaved,
}: Props) {
  const id = useId();
  const confirm = useConfirm();
  const normalizedInitialEmail = initialEmail.trim();
  const [email, setEmail] = useState(normalizedInitialEmail);
  const [savedEmail, setSavedEmail] = useState(normalizedInitialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mounted = useRef(true);
  const lock = useRef(false);
  const request = useRef(0);
  const identity = `${orderId}:${normalizedInitialEmail}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    request.current += 1;
    // 서버의 최신 상세값이 선택 주문을 바꿀 때만 편집 중인 초안을 교체한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmail(normalizedInitialEmail);
    setSavedEmail(normalizedInitialEmail);
    setError('');
    setSuccess('');
  }, [identity, normalizedInitialEmail]);

  const save = async () => {
    if (disabled || lock.current) return;

    const normalizedEmail = email.trim();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    if (normalizedEmail === savedEmail) return;

    lock.current = true;
    const currentRequest = ++request.current;
    try {
      const confirmed = await confirm.open({
        title: '주문자 이메일 정정',
        description:
          '정정한 이메일로 주문 조회 링크를 다시 보냅니다. 기존 조회 링크는 즉시 사용할 수 없게 됩니다.',
        confirmText: '저장 및 재발송',
        cancelText: '취소',
      });
      if (!confirmed || !mounted.current || currentRequest !== request.current) {
        return;
      }

      setPending(true);
      setError('');
      setSuccess('');
      const updatedEmail = await adminOrdersApi.updateBuyerEmail(
        orderId,
        normalizedEmail,
      );
      if (!mounted.current || currentRequest !== request.current) return;

      setEmail(updatedEmail);
      setSavedEmail(updatedEmail);
      setSuccess('이메일을 정정하고 새 주문 조회 링크를 발송했어요.');
      await onSaved(updatedEmail);
    } catch (cause) {
      if (!mounted.current || currentRequest !== request.current) return;
      setError(getErrorMessage(cause));
    } finally {
      lock.current = false;
      if (mounted.current && currentRequest === request.current) {
        setPending(false);
      }
    }
  };

  const normalizedEmail = email.trim();

  return (
    <form
      className="mt-4 border-t border-slate-200 pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <label htmlFor={id} className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Mail size={16} aria-hidden="true" />
            주문자 이메일 정정
          </label>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            이메일을 수정하면 기존 조회 링크는 폐기되고 새 주소로 링크가 다시 발송됩니다.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="email"
          value={email}
          disabled={pending || disabled}
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-status`}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
            setSuccess('');
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
          placeholder="customer@example.com"
        />
        <button
          type="submit"
          disabled={pending || disabled || !normalizedEmail || normalizedEmail === savedEmail}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} aria-hidden="true" />
          {pending ? '저장 중...' : '저장 및 재발송'}
        </button>
      </div>

      <div id={`${id}-status`} className="mt-2 text-sm">
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        {success && <p role="status" className="text-emerald-700">{success}</p>}
      </div>
    </form>
  );
}
