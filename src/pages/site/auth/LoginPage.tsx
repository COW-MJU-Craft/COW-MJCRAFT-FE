import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../../../components/ui/Reveal';
import { adminApi } from '../../../api/admin/admin';
import { useConfirm } from '../../../components/confirm/useConfirm';
import { setAuth } from '../../../utils/auth/auth';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

type AdminLoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  loginId?: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();

  // admin form
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isSubmitting = status === 'submitting';

  const clearMessage = () => {
    if (status === 'error' || status === 'success') {
      setStatus('idle');
      setErrorMsg(null);
    }
  };

  const validateAdmin = () => {
    if (!userId.trim()) return '아이디를 입력해 주세요.';
    if (!password.trim()) return '비밀번호를 입력해 주세요.';
    return null;
  };

  const showAdminLoginErrorModal = async (message: string) => {
    await confirm.open({
      title: '관리자 로그인 실패',
      description: message,
      confirmText: '확인',
    });
  };

  const normalizeAdminLoginErrorMessage = (raw: string) => {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return '로그인에 실패했어요. 다시 시도해 주세요.';
    if (normalized.includes('invalid credentials')) {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    if (
      normalized.includes('unauthorized') ||
      normalized.includes('forbidden')
    ) {
      return '로그인 권한이 없어요. 관리자 계정을 확인해 주세요.';
    }
    return raw;
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const v = validateAdmin();
    if (v) {
      setStatus('error');
      setErrorMsg(v);
      await showAdminLoginErrorModal(v);
      return;
    }

    setStatus('submitting');
    setErrorMsg(null);

    try {
      const result = (await adminApi.login({
        userId: userId.trim(),
        password: password.trim(),
      })) as AdminLoginResponse;

      if (!result?.accessToken) {
        const message = '아이디 또는 비밀번호가 올바르지 않습니다.';
        setStatus('error');
        setErrorMsg(message);
        await showAdminLoginErrorModal(message);
        return;
      }

      const name = (result.loginId ?? userId.trim()).trim() || 'USER';
      setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        userName: name,
      });

      setStatus('success');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const message = normalizeAdminLoginErrorMessage(msg);
      setStatus('error');
      setErrorMsg(message);
      await showAdminLoginErrorModal(message);
    } finally {
      setStatus((prev) => (prev === 'submitting' ? 'idle' : prev));
    }
  };

  const shell = 'mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12';
  const panel =
    'mx-auto mt-6 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 sm:mt-10';
  const body = 'p-6 sm:p-10';

  const input =
    'mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition ' +
    'focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50';

  const primaryBtn =
    'inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-sm ' +
    'transition hover:opacity-95 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-primary/20 ' +
    'disabled:cursor-not-allowed disabled:opacity-60 sm:w-40';

  return (
    <div className={shell}>
      <Reveal>
        <h1 className="font-heading text-2xl text-primary sm:text-3xl">
          관리자 로그인
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          관리자 계정으로 로그인하면 관리 페이지에 접근할 수 있어요.
        </p>
      </Reveal>

      <Reveal className={panel} delayMs={120}>
        <div className={body}>
          <Reveal>
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-lg text-slate-900 sm:text-xl">
                  관리자 로그인
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  관리자 계정으로 로그인하면 관리 페이지에 접근할 수 있어요.
                </p>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-900">
                    아이디
                  </label>
                  <input
                    value={userId}
                    onChange={(e) => {
                      setUserId(e.target.value);
                      clearMessage();
                    }}
                    autoComplete="username"
                    className={input}
                    placeholder="아이디를 입력해주세요."
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900">
                    비밀번호
                  </label>
                  <input
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearMessage();
                    }}
                    type="password"
                    autoComplete="current-password"
                    className={input}
                    placeholder="비밀번호를 입력해주세요."
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 sm:max-w-[70%]">
                    보안상 공용 기기에서는 로그아웃을 꼭 해주세요.
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={primaryBtn}
                  >
                    {isSubmitting ? '로그인 중...' : '관리자 로그인'}
                  </button>
                </div>
              </form>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <Link
                  to="/"
                  className="text-xs font-semibold text-slate-700 hover:underline"
                >
                  메인으로
                </Link>
                <Link
                  to="/feedback"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  문의하기
                </Link>
              </div>
            </div>
          </Reveal>

          <div className="mt-6 min-h-5.5">
            {status === 'error' && errorMsg && (
              <p className="text-sm text-rose-600">{errorMsg}</p>
            )}
            {status === 'success' && (
              <p className="text-sm text-emerald-600">로그인에 성공했어요.</p>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
