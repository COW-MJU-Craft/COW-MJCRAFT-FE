import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  setGA4Disabled,
  trackGA4PageView,
} from '../../utils/common/analytics';
import { isPublicAnalyticsPath } from '../../utils/common/analyticsAttribution';
import { AUTH_CHANGED_EVENT, isLoggedIn } from '../../utils/auth/auth';

export default function GoogleAnalytics() {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string | null>(null);
  const pagePath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  );

  // 로그인은 관리자 전용이다. 관리자로 로그인해 있는 동안에는 GA 전송을 모두 끈다.
  // 관리 작업(및 로그인한 채 공개 페이지를 보는 것)이 고객 방문 데이터에 섞이지 않게 하며,
  // 로그인/로그아웃 시점에 바로 반영되도록 인증 변경 이벤트를 구독한다.
  // 첫 page_view 이펙트보다 먼저 실행되도록 이 이펙트를 위에 선언한다.
  useEffect(() => {
    const sync = () => setGA4Disabled(isLoggedIn());
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (lastTrackedPathRef.current === pagePath) return;

    if (!isPublicAnalyticsPath(location.pathname)) return;

    const frameId = window.requestAnimationFrame(() => {
      trackGA4PageView(pagePath);
      lastTrackedPathRef.current = pagePath;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname, pagePath]);

  return null;
}
