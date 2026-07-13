import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY ?? 'access_token';

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

type OpenMenu = null | 'feedback' | 'orders';

export default function AdminHeaderDesktop() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState<OpenMenu>(null);

  useEffect(() => {
    // 라우트 변경 시 열린 메뉴 닫기: 외부 상태(URL)와 동기화하는 정상 패턴이라 규칙을 예외 처리한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(null);
  }, [location.hash, location.pathname]);

  const rawActive = location.hash || '#edit';
  const [activePath = 'edit'] = rawActive.replace('#', '').split('?');
  const normalizedActive =
    activePath === 'about-main' || activePath === 'about-detail'
      ? 'about'
      : activePath;

  const activeKey =
    location.pathname.startsWith('/admin/projects') ||
    location.pathname.startsWith('/admin/items')
      ? 'projects'
      : location.pathname.startsWith('/admin/orders')
        ? 'orders'
        : location.pathname.startsWith('/admin/notices')
          ? 'notices'
          : location.pathname.startsWith('/admin/forms')
            ? 'forms'
            : location.pathname.startsWith('/admin/applications')
              ? 'forms'
              : normalizedActive;

  const orderMenuActive =
    activeKey === 'orders' || activeKey === 'order-complete-page';
  const feedbackMenuActive = activeKey === 'form' || activeKey === 'feedback';

  return (
    <div className="mx-auto hidden max-w-none grid-cols-[1fr_auto_1fr] items-center px-6 py-4 md:grid">
      <Link
        to="/admin"
        className="justify-self-start font-heading text-2xl text-white"
      >
        명지공방 관리자
      </Link>

      <nav className="flex flex-wrap items-center gap-1 justify-self-center">
        {LEADING_NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <Link
              key={item.key}
              to={item.href}
              className={[
                'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:bg-slate-800',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}

        <DropdownMenu
          label="주문"
          active={orderMenuActive}
          open={open === 'orders'}
          onToggle={() => setOpen(open === 'orders' ? null : 'orders')}
          onClose={() => setOpen(null)}
          items={ORDER_MENU_ITEMS}
          onNavigate={(href) => navigate(href)}
        />

        {TRAILING_NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <Link
              key={item.key}
              to={item.href}
              className={[
                'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-white text-slate-900'
                  : 'text-slate-300 hover:bg-slate-800',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}

        <DropdownMenu
          label="피드백"
          active={feedbackMenuActive}
          open={open === 'feedback'}
          onToggle={() => setOpen(open === 'feedback' ? null : 'feedback')}
          onClose={() => setOpen(null)}
          items={FEEDBACK_MENU_ITEMS}
          onNavigate={(href) => navigate(href)}
        />
      </nav>

      <div className="justify-self-end">
        <button
          type="button"
          onClick={async () => {
            try {
              await adminApi.logout();
            } finally {
              localStorage.removeItem(TOKEN_KEY);
              navigate('/');
            }
          }}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          LOGOUT
        </button>
      </div>
    </div>
  );
}

function DropdownMenu({
  label,
  active,
  open,
  onToggle,
  onClose,
  items,
  onNavigate,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: Array<{ key: string; label: string; href: string }>;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={[
          'rounded-full px-3 py-1 text-sm font-semibold transition-colors',
          active ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-slate-800',
        ].join(' ')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label} <span className="ml-1 text-slate-400">▾</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="close dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={onClose}
          />
          <div
            className="absolute left-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg"
            role="menu"
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate(item.href);
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800"
                role="menuitem"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
