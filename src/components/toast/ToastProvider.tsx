import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ToastContext, type ToastPayload, type ToastType } from './ToastContext';

type ToastState = {
  type: ToastType;
  message: string;
  durationMs: number;
} | null;

const DEFAULT_DURATION_MS = 3000;

export default function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    if (!toast) return;
    setVisible(false);
    clearTimer();
    exitTimerRef.current = window.setTimeout(() => {
      setToast(null);
      exitTimerRef.current = null;
    }, 160);
  }, [clearTimer, toast]);

  const show = useCallback(
    (payload: ToastPayload) => {
      const durationMs = payload.durationMs ?? DEFAULT_DURATION_MS;
      clearTimer();
      setToast({ type: payload.type, message: payload.message, durationMs });
      setVisible(false);
      requestAnimationFrame(() => setVisible(true));
      timerRef.current = window.setTimeout(() => {
        setVisible(false);
        exitTimerRef.current = window.setTimeout(() => {
          setToast(null);
          exitTimerRef.current = null;
        }, 160);
        timerRef.current = null;
      }, durationMs);
    },
    [clearTimer],
  );

  const success = useCallback(
    (message: string, durationMs?: number) => show({ type: 'success', message, durationMs }),
    [show],
  );

  const error = useCallback(
    (message: string, durationMs?: number) => show({ type: 'error', message, durationMs }),
    [show],
  );

  const info = useCallback(
    (message: string, durationMs?: number) => show({ type: 'info', message, durationMs }),
    [show],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(
    () => ({ show, success, error, info, clear }),
    [clear, error, info, show, success],
  );

  const toastStyles = toast
    ? [
        'rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg',
        toast.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : toast.type === 'error'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-sky-200 bg-sky-50 text-sky-700',
      ].join(' ')
    : '';

  const icon = toast?.type === 'success' ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : toast?.type === 'error' ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 8v5" strokeLinecap="round" />
      <path d="M12 16h.01" strokeLinecap="round" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" strokeLinecap="round" />
      <path d="M12 16h.01" strokeLinecap="round" />
    </svg>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed right-6 top-24 z-50 w-[calc(100%-3rem)] max-w-sm">
          <div
            className={[
              toastStyles,
              'flex items-center gap-3 transition duration-150',
              visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            <span
              className={[
                'mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full',
                toast.type === 'success'
                  ? 'bg-emerald-100'
                  : toast.type === 'error'
                  ? 'bg-rose-100'
                  : 'bg-sky-100',
              ].join(' ')}
              aria-hidden="true"
            >
              {icon}
            </span>
            <div className="flex-1 text-slate-900">{toast.message}</div>
            <button
              type="button"
              onClick={clear}
              className="rounded-full p-1 text-slate-400 transition hover:text-slate-600"
              aria-label="닫기"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18" strokeLinecap="round" />
                <path d="M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
