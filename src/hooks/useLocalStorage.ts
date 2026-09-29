import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  read: () => T,
  write: (value: T) => void,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read());
  const isFirstWrite = useRef(true);

  useEffect(() => {
    // Re-sync if the underlying storage changes (rare, but cheap)
    setValue(read());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (isFirstWrite.current) {
          isFirstWrite.current = false;
        } else {
          write(resolved);
        }
        return resolved;
      });
    },
    [write],
  );

  return [value, update];
}
