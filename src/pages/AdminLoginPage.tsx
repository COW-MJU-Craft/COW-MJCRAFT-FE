import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { adminApi } from '../api/admin';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('admin');
  const [password, setPassword] = useState('admin1234');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<null>(null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <h1 className="font-heading text-3xl text-primary">관리자 로그인</h1>
        <p className="mt-2 text-slate-600">
          관리자 페이지에 접속하려면{' '}
          <span className="font-bold">관리자 계정</span>으로 로그인하세요.
        </p>
      </Reveal>

      <Reveal
        delayMs={80}
        className="mt-8 mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            setMe(null);

            try {
              await adminApi.login({ userId, password });
              navigate('/admin');
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              setError(msg);
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
        >
          <label className="block">
            <div className="mb-1 text-sm font-bold text-slate-700">아이디</div>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              placeholder="admin"
              required
              disabled={loading}
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm font-bold text-slate-700">
              비밀번호
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary/60"
              placeholder="admin1234"
              required
              disabled={loading}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className={[
              'w-full rounded-xl px-5 py-3 text-sm font-bold text-white',
              loading ? 'bg-primary/60' : 'bg-primary',
            ].join(' ')}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-sm font-bold text-slate-700 hover:underline"
            >
              메인으로
            </Link>
            <Link
              to="/contact"
              className="text-sm font-bold text-primary hover:underline"
            >
              문의하기
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-white p-4 text-sm font-bold text-rose-700">
              로그인 실패: {error}
              <div className="mt-2 text-xs font-semibold text-slate-500">
                <br />* 서버 설정에 따라 쿠키 도메인/프록시 설정이 필요할 수
                있습니다.
              </div>
            </div>
          )}

          {me && null}
        </form>
      </Reveal>
    </div>
  );
}
