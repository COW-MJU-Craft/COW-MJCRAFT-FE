import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '../api/admin';
import { clearAuth } from '../utils/auth';

const SWIPE_CLOSE_THRESHOLD = 60;

const LEADING_NAV_ITEMS = [
  { key: 'edit', label: '회원정보', href: '/admin#edit' },
  { key: 'about', label: '소개', href: '/admin#about?tab=main' },
  { key: 'links', label: '링크', href: '/admin#links' },
];

const TRAILING_NAV_ITEMS = [
  { key: 'projects', label: '프로젝트/상품', href: '/admin/projects' },
  { key: 'notices', label: '공지사항', href: '/admin/notices' },
  { key: 'forms', label: '지원서 관리', href: '/admin/forms' },
  { key: 'payouts', label: '정산', href: '/admin#payouts' },
];

const ORDER_MENU_ITEMS = [
  { key: 'orders', label: '주문 관리', href: '/admin/orders' },
  {
    key: 'order-complete-page',
    label: '주문 완료 설정',
    href: '/admin#order-complete-page',
  },
];

const FEEDBACK_MENU_ITEMS = [
  { key: 'form', label: '폼 수정', href: '/admin#form' },
  { key: 'feedback', label: '목록', href: '/admin#feedback' },
];

type AdminHeaderMobileProps = {
  visible?: boolean;
};

export default function AdminHeaderMobile({
  visible = true,
}: AdminHeaderMobileProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

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
      document.documentElement.style.overscrollBehavior =
        previousHtmlOverscroll;
    };
  }, [open]);

  const resetSwipeState = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const closeMenu = () => {
    resetSwipeState();
    setOpen(false);
    setOrderOpen(false);
    setFeedbackOpen(false);
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
      closeMenu();
    }
  };

  const menuLayer = (
    <div className="md:hidden">
      <button
        type="button"
        onClick={closeMenu}
        className={[
          'fixed inset-0 z-80 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-label="Close admin menu backdrop"
      />

      <aside
        onTouchStart={handleDrawerTouchStart}
        onTouchEnd={handleDrawerTouchEnd}
        onTouchCancel={resetSwipeState}
        className={[
          'fixed left-0 top-0 z-90 flex h-screen w-60 flex-col overflow-y-auto bg-slate-950 p-6 text-slate-100 shadow-2xl overscroll-contain',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between">
          <div className="font-heading text-lg">ADMIN MENU</div>
          <button
            type="button"
            onClick={closeMenu}
            className="text-2xl text-slate-400"
            aria-label="Close admin menu"
          >
            ×
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-2">
          {LEADING_NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              onClick={closeMenu}
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}

          <ExpandableMenu
            label="주문"
            open={orderOpen}
            onToggle={() => setOrderOpen((value) => !value)}
            items={ORDER_MENU_ITEMS}
            onClose={closeMenu}
          />

          {TRAILING_NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              onClick={closeMenu}
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}

          <ExpandableMenu
            label="피드백"
            open={feedbackOpen}
            onToggle={() => setFeedbackOpen((value) => !value)}
            items={FEEDBACK_MENU_ITEMS}
            onClose={closeMenu}
          />
        </nav>

        <button
          type="button"
          onClick={async () => {
            try {
              await adminApi.logout();
            } finally {
              clearAuth();
              navigate('/');
            }
          }}
          className="mt-6 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          LOGOUT
        </button>
      </aside>
    </div>
  );

  return (
    <>
      <div className="relative mx-auto h-16 px-4 md:hidden">
        <Link
          to="/admin"
          className="flex h-full items-center pr-16 font-heading text-lg text-white"
        >
          명지공방 관리자
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={[
            'fixed right-4 top-3 z-60 grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-950/80 text-slate-200 shadow-sm transition-all duration-200 md:hidden',
            visible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-4 pointer-events-none opacity-0',
          ].join(' ')}
          aria-label="Open admin menu"
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

function ExpandableMenu({
  label,
  open,
  onToggle,
  items,
  onClose,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  items: Array<{ key: string; label: string; href: string }>;
  onClose: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        aria-expanded={open}
      >
        {label}
        <span
          className={[
            'text-slate-400 transition-transform',
            open ? 'rotate-90' : 'rotate-0',
          ].join(' ')}
        >
          ›
        </span>
      </button>

      <div
        className={[
          'ml-2 overflow-hidden transition-all duration-200',
          open ? 'mt-1 max-h-40' : 'mt-0 max-h-0',
        ].join(' ')}
      >
        <div
          className={[
            'space-y-1 rounded-xl border border-slate-800 bg-slate-900/40 p-2',
            open ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.href}
              onClick={onClose}
              className="block rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
