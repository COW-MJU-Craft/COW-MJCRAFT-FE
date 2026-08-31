import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clearAuth } from '../../utils/auth';
import { showLogoutToast } from '../../utils/LogoutToast';

const SWIPE_CLOSE_THRESHOLD = 60;

type HeaderMobileProps = {
  visible?: boolean;
};

export default function HeaderMobile({ visible = true }: HeaderMobileProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const { isLoggedIn } = useAuth();

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

  const menuBase =
    'flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors';
  const menuActive = 'bg-primary/10 text-primary';
  const menuIdle = 'text-slate-800 hover:bg-slate-100';

  useEffect(() => {
    if (!mobileOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [mobileOpen]);

  const closeAll = () => {
    setMobileOpen(false);
    setMobileProjectsOpen(false);
  };

  const scrollToTopAfterNav = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const closeAllAndScrollTop = () => {
    closeAll();
    scrollToTopAfterNav();
  };

  const handleLogout = () => {
    clearAuth();
    showLogoutToast();
    closeAll();
    navigate('/', { replace: true });
  };

  const resetSwipeState = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleDrawerTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleDrawerTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const endY = event.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;

    resetSwipeState();

    if (
      deltaX <= -SWIPE_CLOSE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY) + 12
    ) {
      closeAll();
    }
  };

  const menuLayer = (
    <div className="md:hidden">
      <button
        type="button"
        onClick={closeAll}
        className={[
          'fixed inset-0 z-[80] bg-black/30 transition-opacity duration-200',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-label="Close menu backdrop"
      />

      <aside
        onTouchStart={handleDrawerTouchStart}
        onTouchEnd={handleDrawerTouchEnd}
        onTouchCancel={resetSwipeState}
        className={[
          'fixed left-0 top-0 z-[90] flex h-screen w-60 flex-col overflow-y-auto bg-white shadow-2xl overscroll-contain',
          'transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-200 py-5 pl-9 pr-5">
          <div className="font-heading text-lg text-primary">MENU</div>
          <button
            type="button"
            onClick={closeAll}
            aria-label="Close menu panel"
            className="text-2xl font-bold text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-2 bg-white px-5 py-5">
          <Link
            to="/"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${isActive.home ? menuActive : menuIdle}`}
          >
            HOME
          </Link>

          <Link
            to="/about"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${isActive.about ? menuActive : menuIdle}`}
          >
            소개
          </Link>

          <button
            type="button"
            aria-expanded={mobileProjectsOpen}
            onClick={() => setMobileProjectsOpen((v) => !v)}
            className={`${menuBase} ${
              isActive.projects ? menuActive : menuIdle
            }`}
          >
            컬렉션
            <span
              className={[
                'text-slate-400 transition-transform',
                mobileProjectsOpen ? 'rotate-90' : 'rotate-0',
              ].join(' ')}
            >
              ›
            </span>
          </button>

          <div
            className={[
              'ml-2 overflow-hidden transition-all duration-200',
              mobileProjectsOpen ? 'mt-2 max-h-56' : 'mt-0 max-h-0',
            ].join(' ')}
          >
            <div
              className={[
                'space-y-1 rounded-xl border bg-slate-50',
                mobileProjectsOpen
                  ? 'border-slate-200 p-2 opacity-100'
                  : 'border-transparent p-0 opacity-0',
              ].join(' ')}
            >
              {[
                { label: '전체', href: '/projects' },
                { label: '진행 중', href: '/projects?status=OPEN' },
                { label: '준비중', href: '/projects?status=PREPARING' },
                { label: '마감', href: '/projects?status=CLOSED' },
                { label: '정산', href: '/projects?status=PAYOUT' },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeAllAndScrollTop}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            to="/notices"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${
              isActive.notices ? menuActive : menuIdle
            }`}
          >
            공지사항
          </Link>

          <Link
            to="/apply"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${isActive.apply ? menuActive : menuIdle}`}
          >
            지원하기
          </Link>

          <Link
            to="/cart"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${isActive.cart ? menuActive : menuIdle}`}
          >
            장바구니
          </Link>

          <Link
            to="/orders/lookup"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${
              isActive.orderLookup ? menuActive : menuIdle
            }`}
          >
            주문조회
          </Link>

          <Link
            to="/feedback"
            onClick={closeAllAndScrollTop}
            className={`${menuBase} ${
              isActive.feedback ? menuActive : menuIdle
            }`}
          >
            피드백
          </Link>

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              LOGOUT
            </button>
          )}
        </div>
      </aside>
    </div>
  );

  return (
    <>
      <div className="fixed right-4 top-3 z-[90] flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileOpen((v) => !v);
            setMobileProjectsOpen(false);
          }}
          className={[
            'grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200',
            visible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-4 pointer-events-none opacity-0',
          ].join(' ')}
          aria-label="Open menu"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
            <path
              d="M1 1h16M1 6h16M1 11h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(menuLayer, document.body)
        : menuLayer}
    </>
  );
}
