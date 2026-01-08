import { Link, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: '소개', href: '/admin#about' },
  { label: '링크', href: '/admin#links' },
  { label: '링크트리', href: '/admin#linktree' },
  { label: '프로젝트', href: '/admin#projects' },
  { label: '정산', href: '/admin#settlements' },
  { label: '피드백 폼', href: '/admin#form' },
  { label: '피드백 목록', href: '/admin#feedback' },
];

export default function AdminLayout() {
  const location = useLocation();
  const active = location.hash || '#about';

  return (
    <div className="min-h-screen bg-app-bg font-body text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            to="/admin"
            className="font-heading text-lg text-primary"
            aria-label="명지공방 관리자 페이지"
          >
            명지공방
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
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
        </div>
      </header>
      <main className="pt-10">
        <Outlet />
      </main>
    </div>
  );
}
