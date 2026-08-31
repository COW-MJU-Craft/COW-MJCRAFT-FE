import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import ConfirmModal from '../ui/ConfirmModal';
import { ConfirmContext, type ConfirmOptions } from './ConfirmContext';

type ConfirmState = {
  open: boolean;
  loading: boolean;
  options: ConfirmOptions;
};

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: '확인',
  confirmText: '확인',
  cancelText: '취소',
  danger: false,
};

type Mode =
  | { type: 'open' }
  | { type: 'run'; action: () => Promise<void> };

export default function ConfirmProvider({ children }: PropsWithChildren) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const modeRef = useRef<Mode>({ type: 'open' });
  const runningRef = useRef(false);

  const [state, setState] = useState<ConfirmState>({
    open: false,
    loading: false,
    options: DEFAULT_OPTIONS,
  });

  const closeWith = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false, loading: false }));
  }, []);

  const openInternal = useCallback((options: ConfirmOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        loading: false,
        options: {
          ...DEFAULT_OPTIONS,
          ...options,
          confirmText: options.confirmText ?? DEFAULT_OPTIONS.confirmText,
          cancelText: options.cancelText ?? DEFAULT_OPTIONS.cancelText,
          danger: options.danger ?? DEFAULT_OPTIONS.danger,
          confirmDisabled: options.confirmDisabled ?? false,
        },
      });
    });
  }, []);

  const open = useCallback(
    (options: ConfirmOptions) => {
      modeRef.current = { type: 'open' };
      return openInternal(options);
    },
    [openInternal],
  );

  const run = useCallback(
    async (options: ConfirmOptions, action: () => Promise<void>) => {
      if (runningRef.current) return false;
      modeRef.current = { type: 'run', action };
      const confirmed = await openInternal(options);
      return confirmed;
    },
    [openInternal],
  );

  const handleConfirm = useCallback(async () => {
    const mode = modeRef.current;

    if (mode.type === 'open') {
      closeWith(true);
      return;
    }

    if (runningRef.current) return;

    runningRef.current = true;
    setState((prev) => ({ ...prev, loading: true }));

    try {
      await mode.action();
      closeWith(true);
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    } finally {
      runningRef.current = false;
    }
  }, [closeWith]);

  useEffect(() => () => closeWith(false), [closeWith]);

  const value = useMemo(() => ({ open, run }), [open, run]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmModal
        open={state.open}
        title={state.options.title}
        description={state.options.description}
        confirmText={state.loading ? '처리 중...' : state.options.confirmText}
        cancelText={state.options.cancelText}
        danger={state.options.danger}
        confirmDisabled={state.options.confirmDisabled || state.loading}
        onConfirm={handleConfirm}
        onClose={() => closeWith(false)}
      />
    </ConfirmContext.Provider>
  );
}
