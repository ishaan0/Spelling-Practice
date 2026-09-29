import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * State that is mirrored to localStorage.
 *
 * - Every change is saved (including the very first one).
 * - Changes made in another tab are picked up via the `storage` event.
 * - `onWriteError` is called when the browser refuses to save.
 */
export function useLocalStorage<T>(
  key: string,
  read: () => T,
  write: (value: T) => boolean | void,
  onWriteError?: () => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(read);
  const lastSaved = useRef<T>(value);
  const onWriteErrorRef = useRef(onWriteError);

  useEffect(() => {
    onWriteErrorRef.current = onWriteError;
  }, [onWriteError]);

  // A layout effect, so the value is saved in the same step that puts it on
  // screen — what the user sees is never ahead of what is stored.
  useLayoutEffect(() => {
    // Nothing to do on mount or after syncing from another tab.
    if (Object.is(lastSaved.current, value)) return;
    lastSaved.current = value;
    if (write(value) === false) onWriteErrorRef.current?.();
  }, [value, write]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== null && e.key !== key) return;
      const next = read();
      lastSaved.current = next;
      setValue(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, read]);

  return [value, setValue];
}
