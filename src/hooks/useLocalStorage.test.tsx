import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

const KEY = 'test:key';
const read = () => JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as string[];
const write = (value: string[]) => {
  window.localStorage.setItem(KEY, JSON.stringify(value));
  return true;
};

describe('useLocalStorage', () => {
  it('persists the very first update', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, read, write));
    act(() => result.current[1](['apple']));
    expect(result.current[0]).toEqual(['apple']);
    expect(read()).toEqual(['apple']);
  });

  it('persists functional updates', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, read, write));
    act(() => result.current[1]((prev) => [...prev, 'apple']));
    act(() => result.current[1]((prev) => [...prev, 'pear']));
    expect(read()).toEqual(['apple', 'pear']);
  });

  it('does not write on mount', () => {
    const spy = vi.fn(() => true);
    renderHook(() => useLocalStorage(KEY, read, spy));
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports failed writes', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useLocalStorage(KEY, read, () => false, onError));
    act(() => result.current[1](['apple']));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
