import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AdminHeaderDesktop from './AdminHeaderDesktop';
import AdminHeaderMobile from './AdminHeaderMobile';
import { isLoggedIn } from '../../utils/auth/auth';

export default function AdminLayout() {
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

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-app-bg text-slate-900">
      <header
        className={[
          'print-hidden fixed inset-x-0 top-0 z-50 overflow-visible border-b border-slate-800 bg-slate-950/90 backdrop-blur transition-transform duration-200',
          mobileHeaderVisible ? 'translate-y-0' : '-translate-y-full',
          'md:sticky md:translate-y-0',
        ].join(' ')}
      >
        <AdminHeaderDesktop />
        <AdminHeaderMobile visible={mobileHeaderVisible} />
      </header>
      <main className="overflow-x-hidden pt-20 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
