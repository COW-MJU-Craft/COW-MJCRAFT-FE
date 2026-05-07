export const GA4_MEASUREMENT_ID = (
  import.meta.env.VITE_GA4_MEASUREMENT_ID ?? ''
).trim();

export const GA4_DEBUG_MODE = import.meta.env.VITE_GA4_DEBUG_MODE === 'true';

export const GA4_REPORT_URL = (import.meta.env.VITE_GA4_REPORT_URL ?? '').trim();

export const SHOW_GA4_FOOTER_BADGE =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_GA4_FOOTER_BADGE === 'true';

export const isGA4Enabled = GA4_MEASUREMENT_ID.length > 0;

type GtagConfigParams = {
  debug_mode?: boolean;
  page_location?: string;
  page_path?: string;
  page_title?: string;
  send_page_view?: boolean;
};

type GtagEventParams = {
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
    dataLayer?: GtagCommand[];
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
    ((...args: GtagCommand) => {
      window.dataLayer?.push(args);
    });

  appendGtagScript();
  window.gtag('js', new Date());
  window.gtag('config', GA4_MEASUREMENT_ID, {
    send_page_view: false,
    ...getDebugParams(),
  });

  initialized = true;
};

export const trackGA4PageView = (path: string) => {
  if (!isGA4Enabled || typeof window === 'undefined') return;

  initializeGA4();

  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    ...getDebugParams(),
  });
};
