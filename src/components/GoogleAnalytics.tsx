import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackGA4PageView } from '../utils/analytics';

export default function GoogleAnalytics() {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string | null>(null);
  const pagePath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  );

  useEffect(() => {
    if (lastTrackedPathRef.current === pagePath) return;
    lastTrackedPathRef.current = pagePath;

    const frameId = window.requestAnimationFrame(() => {
      trackGA4PageView(pagePath);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pagePath]);

  return null;
}
