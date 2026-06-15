import { createContext } from 'react';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
};

export type ConfirmContextValue = {
  open: (options: ConfirmOptions) => Promise<boolean>;
  run: (options: ConfirmOptions, action: () => Promise<void>) => Promise<boolean>;
};

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);
