import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title = '확인',
  description,
  confirmText = '확인',
  cancelText = '취소',
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();
  }, [open]);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
        onClick={danger ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl transition"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={[
              'mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full',
              danger ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600',
            ].join(' ')}
            aria-hidden="true"
          >
            {danger ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 9v5" strokeLinecap="round" />
                <path d="M12 17h.01" strokeLinecap="round" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4" strokeLinecap="round" />
                <path d="M12 16h.01" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div>
            <div id="confirm-modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </div>
            {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            ref={cancelButtonRef}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={[
              'rounded-lg px-4 py-2 text-sm font-bold text-white transition',
              danger ? 'bg-rose-600' : 'bg-primary',
              confirmDisabled
                ? 'cursor-not-allowed opacity-60'
                : danger
                ? 'hover:bg-rose-500'
                : 'hover:opacity-90',
            ].join(' ')}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}