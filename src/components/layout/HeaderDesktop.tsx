import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

type MenuKey = 'projects' | null;

export default function HeaderDesktop() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<MenuKey>(null);
  const isProjectsOpen = open === 'projects';

  const pathname = location.pathname;

  const isActive = useMemo(
    () => ({
      home: pathname === '/',
      about: pathname.startsWith('/about'),
      projects: pathname.startsWith('/projects'),
      notices: pathname.startsWith('/notices'),
      apply: pathname.startsWith('/apply'),
      feedback: pathname.startsWith('/feedback'),
      cart: pathname.startsWith('/cart'),
      orderLookup: pathname.startsWith('/orders'),
    }),
    [pathname],
  );

  const navBase =
    'rounded-lg px-3 py-2 text-[16px] font-semibold transition-colors';
  const navActive = 'bg-primary/10 text-primary';
  const navIdle = 'text-slate-700 hover:bg-slate-100 hover:text-primary';

  const scrollToTopAfterNav = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  return (
    <nav className="hidden items-center gap-1 md:flex justify-self-center">
      <Link
        to="/about"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.about ? navActive : navIdle}`}
      >
        소개
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(isProjectsOpen ? null : 'projects')}
          className={`${navBase} ${isActive.projects ? navActive : navIdle}`}
          aria-expanded={isProjectsOpen}
          aria-haspopup="menu"
        >
          컬렉션 <span className="ml-1 text-slate-400">▾</span>
        </button>

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
              { label: '전체', href: '/projects' },
              { label: '진행 중', href: '/projects?status=OPEN' },
              { label: '준비중', href: '/projects?status=PREPARING' },
              { label: '마감', href: '/projects?status=CLOSED' },
              { label: '정산', href: '/projects?status=PAYOUT' },
            ].map((x) => (
              <button
                key={x.href}
                type="button"
                onClick={() => {
                  setOpen(null);
                  navigate(x.href);
                  scrollToTopAfterNav();
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
        to="/notices"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.notices ? navActive : navIdle}`}
      >
        공지사항
      </Link>

      <Link
        to="/apply"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.apply ? navActive : navIdle}`}
      >
        지원하기
      </Link>

      <Link
        to="/cart"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.cart ? navActive : navIdle}`}
      >
        장바구니
      </Link>

      <Link
        to="/orders/lookup"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.orderLookup ? navActive : navIdle}`}
      >
        주문조회
      </Link>

      <Link
        to="/feedback"
        onClick={() => {
          setOpen(null);
          scrollToTopAfterNav();
        }}
        className={`${navBase} ${isActive.feedback ? navActive : navIdle}`}
      >
        피드백
      </Link>
    </nav>
  );
}
