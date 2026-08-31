import { useEffect, useState } from 'react';
import { getToastEventName, type ToastPayload } from '../../utils/toast';

type ToastState = Required<Pick<ToastPayload, 'message'>> & {
  tone: 'success' | 'error' | 'info';
  durationMs: number;
};

export default function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: number | null = null;
    let removeTimer: number | null = null;

    const clearTimers = () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      hideTimer = null;
      removeTimer = null;
    };

    const onToast = (e: Event) => {
      const ce = e as CustomEvent<ToastPayload>;
      const detail = ce.detail;

      const next: ToastState = {
        message: detail?.message ?? '',
        tone: detail?.tone ?? 'info',
        durationMs: detail?.durationMs ?? 1800,
      };

      clearTimers();
      setToast(next);

      requestAnimationFrame(() => setVisible(true));

      hideTimer = window.setTimeout(() => {
        setVisible(false);
        removeTimer = window.setTimeout(() => setToast(null), 220);
      }, next.durationMs);
    };

    window.addEventListener(getToastEventName(), onToast);
    return () => {
      window.removeEventListener(getToastEventName(), onToast);
      clearTimers();
    };
  }, []);

  if (!toast) return null;

  const toneClass =
    toast.tone === 'success'
      ? 'bg-emerald-600'
      : toast.tone === 'error'
        ? 'bg-rose-600'
        : 'bg-slate-800';

  return (
    <div className="fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2 px-4">
      <div
        className={[
          'rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg',
          toneClass,

          'transform transition-all duration-200 ease-out will-change-transform',
          visible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-3 opacity-0 scale-[0.98]',
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );
}
