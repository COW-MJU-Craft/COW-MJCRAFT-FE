import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/Reveal';
import {
  loadAdminEdit,
  saveAdminEdit,
  type AdminEdit,
} from '../../utils/adminEdit';

export default function AdminEditSection() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<AdminEdit>(() =>
    loadAdminEdit()
  );
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [activeAction, setActiveAction] = useState<'id' | 'password' | null>(
    null
  );
  const [nextUserId, setNextUserId] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const maskedUserId = useMemo(() => {
    if (!credentials.userId) return '';
    if (credentials.userId.length <= 2) return credentials.userId;
    return (
      credentials.userId.slice(0, 2) + '•'.repeat(credentials.userId.length - 2)
    );
  }, [credentials.userId]);

  const handleVerify = () => {
    setError(null);
    setMessage(null);

    const stored = loadAdminEdit();
    if (
      stored.userId !== currentUserId ||
      stored.password !== currentPassword
    ) {
      setError('현재 아이디 또는 비밀번호가 올바르지 않습니다.');
      setIsVerified(false);
      return;
    }

    setIsVerified(true);
    setMessage('인증되었습니다. 변경할 항목을 선택해 주세요.');
  };

  const handleUpdateUserId = () => {
    setError(null);
    setMessage(null);
    if (!nextUserId.trim()) {
      setError('새 아이디를 입력해 주세요.');
      return;
    }

    const stored = loadAdminEdit();
    const updated: AdminEdit = {
      userId: nextUserId.trim(),
      password: stored.password,
      updatedAt: Date.now(),
    };

    saveAdminEdit(updated);
    setCredentials(updated);
    setNextUserId('');
    setIsVerified(false);
    setActiveAction(null);
    setMessage('아이디가 변경되었습니다. 다시 로그인해 주세요.');
    window.setTimeout(() => {
      navigate('/admin/login');
    }, 1200);
  };

  const handleUpdatePassword = () => {
    setError(null);
    setMessage(null);

    if (!nextPassword.trim() || !confirmPassword.trim()) {
      setError('새 비밀번호를 입력해 주세요.');
      return;
    }

    const passwordPolicy =
      nextPassword.length >= 8 &&
      /[A-Za-z]/.test(nextPassword) &&
      /\d/.test(nextPassword);
    if (!passwordPolicy) {
      setError('비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.');
      return;
    }

    if (nextPassword !== confirmPassword) {
      setError('입력하신 비밀번호가 맞지 않습니다.');
      return;
    }

    const stored = loadAdminEdit();
    const updated: AdminEdit = {
      userId: stored.userId,
      password: nextPassword,
      updatedAt: Date.now(),
    };

    saveAdminEdit(updated);
    setCredentials(updated);
    setNextPassword('');
    setConfirmPassword('');
    setIsVerified(false);
    setActiveAction(null);
    setMessage('비밀번호가 변경되었습니다. 다시 로그인해 주세요.');
    window.setTimeout(() => {
      navigate('/admin/login');
    }, 1200);
  };

  return (
    <Reveal id="edit" delayMs={80} className="mt-8 rounded-3xl bg-white p-8">
      <h2 className="font-heading text-xl text-slate-900">회원정보 수정</h2>
      <p className="mt-2 text-sm text-slate-600">
        현재 아이디/비밀번호를 확인한 뒤 변경할 수 있어요.
      </p>
      <div className="mt-4 text-sm text-slate-600">
        현재 아이디: <span className="font-semibold">{maskedUserId}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="text-sm font-bold text-slate-700">현재 아이디</div>
          <input
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="현재 아이디"
            disabled={isVerified}
          />
        </label>
        <label className="block">
          <div className="text-sm font-bold text-slate-700">현재 비밀번호</div>
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="현재 비밀번호"
            disabled={isVerified}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleVerify}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
        >
          인증
        </button>
        {isVerified && (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveAction('id');
                setMessage(null);
                setError(null);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              아이디 변경
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveAction('password');
                setMessage(null);
                setError(null);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              비밀번호 변경
            </button>
          </>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-600">
            {message}
          </div>
        )}
      </div>

      {isVerified && activeAction === 'id' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-700">새 아이디</div>
          <input
            value={nextUserId}
            onChange={(e) => setNextUserId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="새 아이디 입력"
          />
          <button
            type="button"
            onClick={handleUpdateUserId}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            변경하기
          </button>
        </div>
      )}

      {isVerified && activeAction === 'password' && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-bold text-slate-700">새 비밀번호</div>
          <input
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="새 비밀번호 입력"
          />
          <div className="mt-3 text-sm font-bold text-slate-700">
            비밀번호 확인
          </div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary/60"
            placeholder="비밀번호 확인"
          />
          <button
            type="button"
            onClick={handleUpdatePassword}
            className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            변경하기
          </button>
        </div>
      )}
    </Reveal>
  );
}
