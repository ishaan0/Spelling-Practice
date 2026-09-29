import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000),
    );
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [toasts]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <ToastView
            key={t.id}
            tone={t.tone}
            message={t.message}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({
  tone,
  message,
  onDismiss,
}: {
  tone: ToastTone;
  message: string;
  onDismiss: () => void;
}) {
  const palette = {
    success: 'bg-green-600 text-white',
    info: 'bg-slate-800 text-white',
    error: 'bg-red-600 text-white',
  } as const;
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm shadow-lg ${palette[tone]}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 rounded p-0.5 hover:bg-white/15"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op so components can call useToast() outside provider without crashing
    return { show: () => {} };
  }
  return ctx;
}
