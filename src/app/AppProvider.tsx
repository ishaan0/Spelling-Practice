import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  loadSettings,
  loadWords,
  saveSettings,
  saveWords,
  type PersistedSettings,
} from '../services/storage/storageService';
import { STORAGE_KEYS } from '../utils/constants';

export type AppView = 'library' | 'setup' | 'active' | 'results';

export interface CompletedTest {
  id: string;
  finishedAt: number;
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
}

export interface AppContextValue {
  words: string[];
  setWords: (next: string[] | ((prev: string[]) => string[])) => void;
  settings: PersistedSettings;
  setSettings: (
    next: PersistedSettings | ((prev: PersistedSettings) => PersistedSettings),
  ) => void;
  view: AppView;
  goTo: (view: AppView) => void;
  pendingWords: string[] | null;
  setPendingWords: (words: string[] | null) => void;
  lastResult: CompletedTest | null;
  setLastResult: (r: CompletedTest | null) => void;
  mistakeWords: string[];
  setMistakeWords: (words: string[]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  view: AppView;
  setView: (v: AppView) => void;
  children: ReactNode;
}

export function AppProvider({ view, setView, children }: AppProviderProps) {
  const [words, setWords] = useLocalStorage<string[]>(
    STORAGE_KEYS.words,
    loadWords,
    saveWords,
  );

  const [settings, setSettings] = useLocalStorage<PersistedSettings>(
    STORAGE_KEYS.settings,
    loadSettings,
    saveSettings,
  );

  const [pendingWords, setPendingWordsState] = useState<string[] | null>(null);
  const [lastResult, setLastResult] = useState<CompletedTest | null>(null);
  const [mistakeWords, setMistakeWords] = useState<string[]>([]);

  const goTo = useCallback(
    (next: AppView) => {
      setView(next);
    },
    [setView],
  );

  const setPendingWords = useCallback((next: string[] | null) => {
    setPendingWordsState(next);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      words,
      setWords,
      settings,
      setSettings,
      view,
      goTo,
      pendingWords,
      setPendingWords,
      lastResult,
      setLastResult,
      mistakeWords,
      setMistakeWords,
    }),
    [
      words,
      setWords,
      settings,
      setSettings,
      view,
      goTo,
      pendingWords,
      setPendingWords,
      lastResult,
      mistakeWords,
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
