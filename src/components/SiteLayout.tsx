import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from './Header';
import GoogleAnalyticsFooterStatus from './GoogleAnalyticsFooterStatus';
import { noticesApi } from '../api/notices';
import { formatYmd, parseDateLike } from '../utils/date';

export default function SiteLayout() {
  const [slideIndex, setSlideIndex] = useState(0);

  const touchStartXRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const { data: noticesData, isFetched: noticeReady } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesApi.list(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: (prev) => prev,
  });

  const visibleNotices = useMemo(() => {
    const list = Array.isArray(noticesData) ? noticesData : [];
    return [...list].sort((a, b) => {
      const da = parseDateLike(a.updatedAt ?? a.createdAt);
      const db = parseDateLike(b.updatedAt ?? b.createdAt);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });
  }, [noticesData]);

  useEffect(() => {
    setSlideIndex((prev) => {
      if (visibleNotices.length === 0) return 0;
      return Math.min(prev, visibleNotices.length - 1);
    });
  }, [visibleNotices.length]);

  const moveNotice = useCallback(
    (direction: 'prev' | 'next') => {
      setSlideIndex((prev) => {
        if (visibleNotices.length <= 1) return 0;
        if (direction === 'next') return (prev + 1) % visibleNotices.length;
        return (prev - 1 + visibleNotices.length) % visibleNotices.length;
      });
    },
    [visibleNotices.length],
  );

  const handleBannerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (visibleNotices.length <= 1) return;
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    isSwipingRef.current = false;
  };

  const handleBannerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null) return;
    const currentX = e.touches[0]?.clientX ?? touchStartXRef.current;
    if (Math.abs(currentX - touchStartXRef.current) > 8) {
      isSwipingRef.current = true;
    }
  };

  const handleBannerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (visibleNotices.length <= 1 || touchStartXRef.current === null) return;

    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) moveNotice('next');
    else moveNotice('prev');
  };

  const handleNoticeLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isSwipingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    isSwipingRef.current = false;
  };

  const currentNotice = visibleNotices[slideIndex] ?? null;
  const canSlideNotices = visibleNotices.length > 1;

  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    if (!location.state || typeof location.state !== 'object') return;
    if (!('scrollFromFooter' in location.state)) return;
    if (!location.state.scrollFromFooter) return;

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }, [location.pathname, location.state]);

  const showBanner =
    isHome &&
    noticeReady &&
    visibleNotices.length > 0 &&
    Boolean(currentNotice?.id) &&
    Boolean(currentNotice?.title?.trim());

  const currentNoticeDate = currentNotice
    ? parseDateLike(currentNotice.updatedAt ?? currentNotice.createdAt)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-slate-900 font-body">
      <Header />

      <main className="flex-1 pt-16" style={{ overflowAnchor: 'none' }}>
        {showBanner && currentNotice && (
          <div
            className="border-b border-slate-100 bg-slate-50/50"
            style={{ overflowAnchor: 'none' }}
          >
            <div className="mx-auto max-w-6xl px-4 py-2.5">
              <div
                className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white"
                role="region"
                aria-label="공지"
              >
                <div
                  className="flex h-14 items-center md:h-16"
                  style={{ touchAction: 'pan-y' }}
                  onTouchStart={handleBannerTouchStart}
                  onTouchMove={handleBannerTouchMove}
                  onTouchEnd={handleBannerTouchEnd}
                >
                  <Link
                    key={currentNotice.id}
                    to={`/notices/${currentNotice.id}`}
                    onClick={handleNoticeLinkClick}
                    className="flex min-w-0 flex-1 items-center gap-4 px-4 md:px-5"
                  >
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      공지
                    </span>
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 md:text-base"
                      title={currentNotice.title ?? ''}
                    >
                      {currentNotice.title}
                    </p>
                    {currentNoticeDate && (
                      <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                        {formatYmd(currentNoticeDate)}
                      </span>
                    )}
                  </Link>

                  {canSlideNotices && (
                    <div className="mr-2 hidden items-center gap-1 md:mr-3 md:flex">
                      <button
                        type="button"
                        onClick={() => moveNotice('prev')}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                        aria-label="이전 공지"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => moveNotice('next')}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
                        aria-label="다음 공지"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                {canSlideNotices && (
                  <div className="flex items-center justify-center gap-1.5 py-2">
                    {visibleNotices.map((notice, idx) => (
                      <button
                        key={`notice-dot-${notice.id}-${idx}`}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        className={[
                          'h-1.5 rounded-full transition-all',
                          idx === slideIndex
                            ? 'w-5 bg-primary'
                            : 'w-1.5 bg-slate-300 hover:bg-slate-400',
                        ].join(' ')}
                        aria-label={`${idx + 1}번 공지로 이동`}
                        aria-current={idx === slideIndex ? 'true' : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Outlet />
      </main>

      <footer className="mt-14 md:mt-50 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-7 md:py-10 text-sm text-slate-600">
          <div className="flex flex-col gap-5 md:gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="font-heading text-lg text-primary">
                명지공방 MJU Craft Studio
              </div>
              <p className="mt-1.5 md:mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
                명지대학교 학생들의 창작 활동과 프로젝트를 연결하는 공방형
                커뮤니티입니다. 공방 안팎의 다양한 작업과 이야기를 이곳에서
                만나보세요.
              </p>
            </div>

            <div className="ml-3 md:ml-0 grid grid-cols-[max-content_max-content] justify-start gap-x-5 gap-y-4 text-xs md:grid-cols-4 md:gap-8">
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.18em] text-slate-400">
                  Studio
                </h2>
                <ul className="mt-1.5 md:mt-3 space-y-1">
                  <li>
                    <Link
                      to="/about"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      소개
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/projects"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      컬렉션
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/notices"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      공지사항
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.18em] text-slate-400">
                  Recruit
                </h2>
                <ul className="mt-1.5 md:mt-3 space-y-1">
                  <li>
                    <Link
                      to="/apply"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      모집 안내
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/payouts"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      정산 안내
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.18em] text-slate-400">
                  FEEDBACK
                </h2>
                <ul className="mt-1.5 md:mt-3 space-y-1">
                  <li>
                    <Link
                      to="/feedback"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-600 hover:text-primary"
                    >
                      문의하기
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] md:tracking-[0.18em] text-slate-400">
                  Admin
                </h2>
                <ul className="mt-1.5 md:mt-3 space-y-1">
                  <li>
                    <Link
                      to="/login"
                      state={{ scrollFromFooter: true }}
                      className="text-slate-500 hover:text-primary"
                    >
                      관리자 로그인
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-10 flex flex-col items-start justify-between gap-2 border-t border-slate-100 pt-4 md:pt-8 text-[11px] text-slate-400 md:flex-row md:items-center">
            <p>
              © {new Date().getFullYear()} MJU Craft Studio. All rights
              reserved.
            </p>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <p>
                Designed &amp; built by{' '}
                <span className="font-semibold text-slate-500">COW</span>
              </p>
              {isHome && <GoogleAnalyticsFooterStatus />}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
