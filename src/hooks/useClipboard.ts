import { useCallback, useEffect, useRef, useState } from 'react';

export interface ClipboardState {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: string | null;
}

export function useClipboard(resetMs = 1800): ClipboardState {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function'
        ) {
          // Always read the live function so test mocks are honored
          const fn = navigator.clipboard.writeText;
          await fn.call(navigator.clipboard, text);
        } else if (typeof document !== 'undefined') {
          // Fallback: hidden textarea
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (!ok) throw new Error('execCommand failed');
        } else {
          throw new Error('No clipboard API available');
        }

        setCopied(true);
        setError(null);
        if (timer.current !== null) {
          window.clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => {
          setCopied(false);
          timer.current = null;
        }, resetMs);
        return true;
      } catch (err) {
        setCopied(false);
        setError(err instanceof Error ? err.message : 'Copy failed');
        return false;
      }
    },
    [resetMs],
  );

  return { copy, copied, error };
}
