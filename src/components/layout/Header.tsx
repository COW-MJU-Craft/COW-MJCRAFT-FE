import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import HeaderDesktop from './HeaderDesktop';
import HeaderMobile from './HeaderMobile';
import { useAuth } from '../../hooks/useAuth';
import { clearAuth } from '../../utils/auth';
import { showLogoutToast } from '../../utils/LogoutToast';

export default function Header() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileHeaderVisible, setMobileHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const frame = window.requestAnimationFrame(() => {
      setMobileHeaderVisible(true);
    });
    lastScrollYRef.current = window.scrollY;
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        setMobileHeaderVisible(true);
        lastScrollYRef.current = window.scrollY;
        return;
      }

      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const deltaY = currentScrollY - lastScrollYRef.current;

        if (currentScrollY <= 8) {
          setMobileHeaderVisible(true);
        } else if (deltaY > 8) {
          setMobileHeaderVisible(false);
        } else if (deltaY < -8) {
          setMobileHeaderVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
      });
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileHeaderVisible(true);
      }
    };

    handleResize();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const scrollToTopAfterNav = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-transform duration-200',
        mobileHeaderVisible ? 'translate-y-0' : '-translate-y-full',
        'md:translate-y-0',
      ].join(' ')}
    >
      <div className="border-b border-slate-200/60 bg-white/75 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-none grid-cols-[1fr_auto_1fr] items-center px-6">
          <Link
            to="/"
            onClick={scrollToTopAfterNav}
            className="justify-self-start font-heading text-2xl tracking-tight text-primary"
          >
            명지공방
          </Link>

          <HeaderDesktop />
          <HeaderMobile visible={mobileHeaderVisible} />

          <div className="justify-self-end hidden md:flex items-center gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  clearAuth();
                  showLogoutToast();
                  navigate('/', { replace: true });
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                LOGOUT
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
