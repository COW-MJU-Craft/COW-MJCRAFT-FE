import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';

const NAV_ITEMS = [
  { label: '회원정보 수정', href: '/admin#edit' },
  { label: '소개', href: '/admin#about' },
  { label: '링크', href: '/admin#links' },
  { label: '링크트리', href: '/admin#linktree' },
  { label: '프로젝트', href: '/admin#projects' },
  { label: '정산', href: '/admin#settlements' },
  { label: '피드백 폼', href: '/admin#form' },
  { label: '피드백 목록', href: '/admin#feedback' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.hash || '#edit';

  return (
    <div className="min-h-screen bg-app-bg font-body text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link
            to="/admin"
            className="font-heading text-lg text-primary"
            aria-label="명지공방 관리자 페이지"
          >
            명지공방
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const hash = `#${item.href.split('#')[1] ?? ''}`;
              const isActive = active === hash;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-bold transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={async () => {
              try {
                await adminApi.logout();
              } finally {
                navigate('/');
              }
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className="pt-10">
        <Outlet />
      </main>
    </div>
  );
}
