import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Toast as ToastType } from '@/types';
import Toast from './Toast';

export interface ToastContextType {
  toasts: ToastType[];
  addToast: (toast: Omit<ToastType, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastInput: Omit<ToastType, 'id'> & { id?: string }): string => {
      const id = toastInput.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastType = {
        ...toastInput,
        id,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'success', message, title, duration }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'error', message, title, duration }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'warning', message, title, duration }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'info', message, title, duration }),
    [addToast]
  );

  const contextValue = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearAll,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, removeToast, clearAll, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container rendered fixed bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none max-w-full"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
