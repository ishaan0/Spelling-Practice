import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from './AppProvider';
import { loadCollections, saveCollections } from '../services/storage/storageService';
import { createSession, gradeAnswer } from '../features/test/testUtils';
import { ownersFor } from '../features/collections/collectionUtils';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AppProvider view="setup" setView={() => {}}>
      {children}
    </AppProvider>
  );
}

function finishedSession(results: Array<[string, string]>) {
  const s = createSession({
    words: results.map(([w]) => w),
    questionCount: 'all',
    timerEnabled: false,
    secondsPerWord: 0,
    language: 'en-US',
    voiceName: null,
    speechRate: 1,
    pitch: 1,
  });
  s.answers = results.map(([w, typed], i) => gradeAnswer(w, typed, i, 'submitted'));
  s.status = 'completed';
  s.endedAt = 1234;
  return s;
}

describe('AppProvider', () => {
  it('records the mistakes of a finished test in the collection it came from', () => {
    saveCollections([
      { id: 'a', name: 'A', words: ['apple', 'banana'], errors: [], createdAt: 0 },
      { id: 'b', name: 'B', words: ['apple'], errors: [], createdAt: 0 },
    ]);
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() =>
      result.current.startTest({
        words: ['apple', 'banana'],
        breakEvery: null,
        owners: ownersFor(['apple', 'banana'], 'a'),
        label: 'A',
      }),
    );
    act(() =>
      result.current.completeTest(
        finishedSession([
          ['apple', 'aple'],
          ['banana', 'banana'],
        ]),
      ),
    );

    const [a, b] = loadCollections();
    expect(a!.errors).toEqual([{ word: 'apple', misses: 1, lastMissedAt: 1234 }]);
    expect(b!.errors).toEqual([]);
    expect(result.current.lastRun?.label).toBe('A');
    expect(result.current.testRun).toBeNull();
  });

  it('falls back to another collection when the active one is deleted', () => {
    saveCollections([
      { id: 'a', name: 'A', words: [], errors: [], createdAt: 0 },
      { id: 'b', name: 'B', words: [], errors: [], createdAt: 0 },
    ]);
    const { result } = renderHook(() => useApp(), { wrapper });

    act(() => result.current.selectCollection('b'));
    expect(result.current.activeCollection.id).toBe('b');
    act(() => result.current.deleteCollection('b'));
    expect(result.current.activeCollection.id).toBe('a');

    // The last collection can't be deleted.
    act(() => result.current.deleteCollection('a'));
    expect(result.current.collections).toHaveLength(1);
  });
});
