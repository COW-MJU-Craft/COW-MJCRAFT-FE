const TOAST_EVENT = 'app-toast';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastPayload = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

export function toast(payload: ToastPayload) {
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }),
  );
}

export function getToastEventName() {
  return TOAST_EVENT;
}
