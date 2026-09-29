import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastOptions {
  /** A single follow-up action, e.g. Undo. Dismisses the toast when used. */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 3500;
const ACTION_DURATION_MS = 7000;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info', options: ToastOptions = {}) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, tone, ...options }].slice(-MAX_VISIBLE));
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const { id, tone, message, action } = toast;
  const duration = toast.durationMs ?? (action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
  const [hovered, setHovered] = useState(false);

  // Each toast runs its own clock; hovering keeps it on screen.
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(() => onDismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, duration, hovered, onDismiss]);

  const iconColor = {
    success: 'text-emerald-400',
    info: 'text-slate-300',
    error: 'text-red-400',
  } as const;
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl bg-slate-900 py-2.5 pl-3.5 pr-2 text-sm text-white shadow-pop animate-slide-up"
    >
      <Icon size={16} aria-hidden="true" className={`shrink-0 ${iconColor[tone]}`} />
      <span className="min-w-0 break-words">{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss(id);
          }}
          className="shrink-0 rounded-md px-2 py-1 font-semibold text-accent-300 hover:bg-white/10 focus-ring focus-visible:ring-offset-slate-900"
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white focus-ring focus-visible:ring-offset-slate-900"
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
