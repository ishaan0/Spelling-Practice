import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  loadMissedWords,
  loadSettings,
  loadWords,
  saveMissedWords,
  saveSettings,
  saveWords,
  type PersistedSettings,
} from '../services/storage/storageService';
import { STORAGE_KEYS } from '../utils/constants';
import type { TestSession } from '../features/test/testTypes';
import { updateMissedWords } from '../features/test/testUtils';

export type AppView = 'library' | 'setup' | 'active' | 'results';

export interface GoToOptions {
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
}

export type PracticeSource = 'all' | 'missed';

export interface TestRun {
  /** Changes for every run so a repeated test starts from scratch. */
  id: number;
  words: string[];
}

export interface AppContextValue {
  words: string[];
  setWords: Dispatch<SetStateAction<string[]>>;
  settings: PersistedSettings;
  setSettings: Dispatch<SetStateAction<PersistedSettings>>;
  /** Words answered wrongly that have not been spelled correctly since. */
  missedWords: string[];
  setMissedWords: Dispatch<SetStateAction<string[]>>;
  /** True when the browser refused to save (storage full or disabled). */
  storageFailed: boolean;
  view: AppView;
  goTo: (view: AppView, options?: GoToOptions) => void;
  practiceSource: PracticeSource;
  setPracticeSource: (source: PracticeSource) => void;
  testRun: TestRun | null;
  startTest: (words: string[]) => void;
  lastSession: TestSession | null;
  completeTest: (session: TestSession) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  view: AppView;
  setView: (v: AppView, options?: GoToOptions) => void;
  children: ReactNode;
}

export function AppProvider({ view, setView, children }: AppProviderProps) {
  const [storageFailed, setStorageFailed] = useState(false);
  const onWriteError = useCallback(() => setStorageFailed(true), []);

  const [words, setWords] = useLocalStorage<string[]>(
    STORAGE_KEYS.words,
    loadWords,
    saveWords,
    onWriteError,
  );

  const [settings, setSettings] = useLocalStorage<PersistedSettings>(
    STORAGE_KEYS.settings,
    loadSettings,
    saveSettings,
    onWriteError,
  );

  const [missedWords, setMissedWords] = useLocalStorage<string[]>(
    STORAGE_KEYS.missedWords,
    loadMissedWords,
    saveMissedWords,
    onWriteError,
  );

  const [practiceSource, setPracticeSource] = useState<PracticeSource>('all');
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [lastSession, setLastSession] = useState<TestSession | null>(null);

  const goTo = useCallback(
    (next: AppView, options?: GoToOptions) => {
      setView(next, options);
    },
    [setView],
  );

  const startTest = useCallback(
    (testWords: string[]) => {
      if (testWords.length === 0) return;
      setTestRun((prev) => ({ id: (prev?.id ?? 0) + 1, words: testWords }));
      // Starting again from the results replaces them, so Back doesn't pile up old results.
      setView('active', { replace: view === 'results' });
    },
    [setView, view],
  );

  const completeTest = useCallback(
    (session: TestSession) => {
      setLastSession(session);
      setTestRun(null);
      setMissedWords((prev) => updateMissedWords(prev, session, words));
      // The finished test should not be reachable with the Back button.
      setView('results', { replace: true });
    },
    [setView, setMissedWords, words],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      words,
      setWords,
      settings,
      setSettings,
      missedWords,
      setMissedWords,
      storageFailed,
      view,
      goTo,
      practiceSource,
      setPracticeSource,
      testRun,
      startTest,
      lastSession,
      completeTest,
    }),
    [
      words,
      setWords,
      settings,
      setSettings,
      missedWords,
      setMissedWords,
      storageFailed,
      view,
      goTo,
      practiceSource,
      testRun,
      startTest,
      lastSession,
      completeTest,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
