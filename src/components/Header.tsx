import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type MenuKey = 'projects' | null;

export default function Header() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<MenuKey>(null);

  const isProjectsOpen = open === 'projects';

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="border-b border-slate-200/60 bg-white/75 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="font-heading text-xl tracking-tight text-primary"
          >
            명지공방
          </Link>

          {/* Desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/about"
              onClick={() => setOpen(null)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              명지공방
            </Link>

            {/* Projects Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen(isProjectsOpen ? null : 'projects')}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
                aria-expanded={isProjectsOpen}
                aria-haspopup="menu"
              >
                프로젝트 <span className="ml-1 text-slate-400">▾</span>
              </button>

              {/* ✅ 밖 클릭 닫기: 백드롭(가장 단순, effect 불필요) */}
              {isProjectsOpen && (
                <button
                  type="button"
                  aria-label="close dropdown"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setOpen(null)}
                />
              )}

              <div
                className={[
                  'absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg',
                  'transition-all duration-200 ease-out',
                  isProjectsOpen
                    ? 'pointer-events-auto translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-1 opacity-0',
                ].join(' ')}
                role="menu"
              >
                <div className="py-2">
                  {[
                    { label: '진행중', href: '/projects?status=active' },
                    { label: '준비중', href: '/projects?status=upcoming' },
                    { label: '마감', href: '/projects?status=closed' },
                    { label: '전체 보기', href: '/projects' },
                  ].map((x) => (
                    <button
                      key={x.href}
                      onClick={() => {
                        setOpen(null);
                        navigate(x.href);
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
                      role="menuitem"
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Link
              to="/resources"
              onClick={() => setOpen(null)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              무료 배포
            </Link>

            <Link
              to="/settlements"
              onClick={() => setOpen(null)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              정산
            </Link>

            <Link
              to="/contact"
              onClick={() => setOpen(null)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-primary"
            >
              문의
            </Link>

            <Link
              to="/projects?status=active"
              onClick={() => setOpen(null)}
              className="ml-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              진행중 프로젝트 보기
            </Link>
          </nav>

          {/* Mobile: 일단 CTA만 */}
          <div className="md:hidden">
            <Link
              to="/projects?status=active"
              className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white"
            >
              진행중 보기
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
