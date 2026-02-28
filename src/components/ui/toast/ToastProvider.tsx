import React, { createContext, useContext, useMemo, useState } from 'react';
import styles from './ToastProvider.module.css';

export type ToastType = 'info' | 'success' | 'error';

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  push: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uuid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push(message, type = 'info') {
        const id = uuid();
        setToasts((prev) => [...prev, { id, type, message }]);
        window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
