import { getCurrentSessionAttribution } from './analyticsAttribution';
import type { GA4EcommerceItem } from './analyticsEcommerce';

export const GA4_MEASUREMENT_ID = (
  import.meta.env.VITE_GA4_MEASUREMENT_ID ?? ''
).trim();

export const GA4_DEBUG_MODE =
  import.meta.env.DEV && import.meta.env.VITE_GA4_DEBUG_MODE === 'true';

export const GA4_REPORT_URL = (import.meta.env.VITE_GA4_REPORT_URL ?? '').trim();

export const SHOW_GA4_FOOTER_BADGE =
  import.meta.env.DEV && import.meta.env.VITE_SHOW_GA4_FOOTER_BADGE === 'true';

export const isGA4Enabled = GA4_MEASUREMENT_ID.length > 0;

type GtagConfigParams = {
  debug_mode?: boolean;
  page_location?: string;
  page_path?: string;
  page_title?: string;
  send_page_view?: boolean;
};

type GtagEventParams = Record<string, unknown> & {
  debug_mode?: boolean;
  page_location?: string;
  page_path?: string;
  page_title?: string;
};

type GtagCommand =
  | ['js', Date]
  | ['config', string, GtagConfigParams]
  | ['event', string, GtagEventParams];

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: GtagCommand) => void;
  }
}

let initialized = false;

const getDebugParams = () => (GA4_DEBUG_MODE ? { debug_mode: true } : {});

const appendGtagScript = () => {
  if (document.getElementById('ga4-gtag-script')) return;

  const script = document.createElement('script');
  script.id = 'ga4-gtag-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
    GA4_MEASUREMENT_ID,
  )}`;

  document.head.appendChild(script);
};

export const initializeGA4 = () => {
  if (!isGA4Enabled || initialized || typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    (function () {
      // Google tag processes command arguments objects, not ordinary arrays.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    });

  appendGtagScript();
  window.gtag('js', new Date());
  window.gtag('config', GA4_MEASUREMENT_ID, {
    send_page_view: false,
    ...getDebugParams(),
  });

  initialized = true;
};

// GA 공식 수집 차단 스위치(window['ga-disable-측정ID'])를 켜고 끈다.
// 켜져 있는 동안은 향상된 측정(브라우저 기록 변경 감지로 자동 전송되는 page_view 등)을
// 포함해 gtag.js의 모든 전송이 막힌다. 코드에서 직접 호출하는 이벤트만 막는 방식으로는
// 이 자동 전송을 막을 수 없다.
export const setGA4Disabled = (disabled: boolean) => {
  if (!isGA4Enabled || typeof window === 'undefined') return;

  (window as unknown as Record<string, unknown>)[
    `ga-disable-${GA4_MEASUREMENT_ID}`
  ] = disabled;
};

export const trackGA4PageView = (path: string) => {
  if (!isGA4Enabled || typeof window === 'undefined') return;

  try {
    initializeGA4();

    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
      ...getCurrentSessionAttribution(),
      ...getDebugParams(),
    });
  } catch {
    // Analytics failures must never affect the site experience.
  }
};

export const trackGA4Event = (eventName: string, params: GtagEventParams = {}) => {
  if (!isGA4Enabled || typeof window === 'undefined') return;

  try {
    initializeGA4();
    window.gtag?.('event', eventName, {
      ...params,
      ...getCurrentSessionAttribution(),
      ...getDebugParams(),
    });
  } catch {
    // Analytics failures must never affect a user's purchase flow.
  }
};

export const trackGA4EcommerceEvent = (
  eventName: 'add_to_cart' | 'begin_checkout' | 'order_submit' | 'view_cart' | 'view_item',
  {
    items,
    value,
  }: {
    items: GA4EcommerceItem[];
    value: number;
  },
) => {
  trackGA4Event(eventName, {
    currency: 'KRW',
    items,
    value,
  });
};

export const trackGA4ExternalLinkClick = ({
  label,
  url,
}: {
  label: string;
  url: string;
}) => {
  let linkDomain = '';
  try {
    linkDomain = new URL(url).hostname;
  } catch {
    return;
  }

  trackGA4Event('external_link_click', {
    link_domain: linkDomain,
    link_text: label,
    link_url: url,
    outbound: true,
  });
};
