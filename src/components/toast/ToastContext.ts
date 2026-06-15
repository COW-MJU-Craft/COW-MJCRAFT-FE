import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type ToastPayload = {
  type: ToastType;
  message: string;
  durationMs?: number;
};

export type ToastContextValue = {
  show: (payload: ToastPayload) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
  clear: () => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
