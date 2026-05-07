import {
  GA4_DEBUG_MODE,
  GA4_MEASUREMENT_ID,
  GA4_REPORT_URL,
  SHOW_GA4_FOOTER_BADGE,
  isGA4Enabled,
} from '../utils/analytics';

export default function GoogleAnalyticsFooterStatus() {
  if (!SHOW_GA4_FOOTER_BADGE) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400"
      aria-label="GA4 개발자 상태"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
        <span
          className={[
            'h-1.5 w-1.5 rounded-full',
            isGA4Enabled ? 'bg-emerald-500' : 'bg-slate-300',
          ].join(' ')}
        />
        <span>{isGA4Enabled ? 'GA4 connected' : 'GA4 disabled'}</span>
      </span>

      {isGA4Enabled && (
        <span className="font-mono text-slate-400">{GA4_MEASUREMENT_ID}</span>
      )}

      {GA4_DEBUG_MODE && (
        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 font-medium text-blue-600">
          DebugView
        </span>
      )}

      {GA4_REPORT_URL && (
        <a
          href={GA4_REPORT_URL}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-slate-500 underline-offset-2 hover:text-primary hover:underline"
        >
          GA4 보기
        </a>
      )}
    </div>
  );
}
