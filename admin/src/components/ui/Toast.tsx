'use client';

import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'danger' | 'info';
interface ToastItem {
  readonly id: number;
  readonly tone: ToastTone;
  readonly message: string;
}

interface ToastContextValue {
  show(message: string, tone?: ToastTone): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [items, setItems] = useState<readonly ToastItem[]>([]);
  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="region" aria-live="polite" aria-label="Thông báo">
        {items.map((item) => {
          const Icon =
            item.tone === 'success' ? CheckCircle2 : item.tone === 'danger' ? CircleAlert : Info;
          return (
            <div key={item.id} className={`toast toast--${item.tone}`} role="status">
              <Icon size={18} aria-hidden="true" />
              <span>{item.message}</span>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast phai nam trong ToastProvider');
  return value;
}
