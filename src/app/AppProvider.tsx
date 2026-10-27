import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  loadActiveCollectionId,
  loadCollections,
  loadSettings,
  saveActiveCollectionId,
  saveCollections,
  saveSettings,
  type PersistedSettings,
} from '../services/storage/storageService';
import { STORAGE_KEYS } from '../utils/constants';
import type { TestSession } from '../features/test/testTypes';
import type { Collection, WordOwners } from '../features/collections/collectionTypes';
import { createCollection, recordMistakes } from '../features/collections/collectionUtils';

export type AppView = 'library' | 'setup' | 'active' | 'results';

export interface GoToOptions {
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
}

/**
 * `all` and `errors` are the active collection's words and frequent errors;
 * `global-errors` is the frequent errors of every collection, each word once.
 */
export type PracticeSource = 'all' | 'errors' | 'global-errors';

export interface TestRun {
  /** Changes for every run so a repeated test starts from scratch. */
  id: number;
  words: string[];
  /** A break is offered after every this many words; null for no breaks. */
  breakEvery: number | null;
  /** Where each word's mistakes are recorded. */
  owners: WordOwners;
  /** What is being practised, e.g. the collection's name. */
  label: string;
}

export type TestRunRequest = Omit<TestRun, 'id'>;

export interface AppContextValue {
  collections: Collection[];
  /** The collection the word list and practice screens work on. Always set. */
  activeCollection: Collection;
  selectCollection: (id: string) => void;
  /** Adds a collection (the name must already be validated) and makes it active. */
  addCollection: (name: string) => Collection;
  /** Applies a change to one collection; does nothing if it no longer exists. */
  updateCollection: (id: string, update: (collection: Collection) => Collection) => void;
  /** Removes a collection, unless it is the only one. */
  deleteCollection: (id: string) => void;
  /** Puts a deleted collection back at its old position (for Undo). */
  restoreCollection: (collection: Collection, index: number) => void;
  settings: PersistedSettings;
  setSettings: Dispatch<SetStateAction<PersistedSettings>>;
  /** True when the browser refused to save (storage full or disabled). */
  storageFailed: boolean;
  view: AppView;
  goTo: (view: AppView, options?: GoToOptions) => void;
  practiceSource: PracticeSource;
  setPracticeSource: (source: PracticeSource) => void;
  testRun: TestRun | null;
  startTest: (run: TestRunRequest) => void;
  lastSession: TestSession | null;
  /** The run that produced `lastSession`. */
  lastRun: TestRun | null;
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

  const [collections, setCollections] = useLocalStorage<Collection[]>(
    STORAGE_KEYS.collections,
    loadCollections,
    saveCollections,
    onWriteError,
  );

  const [activeCollectionId, setActiveCollectionId] = useLocalStorage<string | null>(
    STORAGE_KEYS.activeCollection,
    loadActiveCollectionId,
    saveActiveCollectionId,
    onWriteError,
  );

  const [settings, setSettings] = useLocalStorage<PersistedSettings>(
    STORAGE_KEYS.settings,
    loadSettings,
    saveSettings,
    onWriteError,
  );

  const [practiceSource, setPracticeSource] = useState<PracticeSource>('all');
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [lastSession, setLastSession] = useState<TestSession | null>(null);
  const [lastRun, setLastRun] = useState<TestRun | null>(null);

  // A stale id (deleted here or in another tab) falls back to the first collection.
  const activeCollection =
    collections.find((c) => c.id === activeCollectionId) ?? (collections[0] as Collection);

  const selectCollection = useCallback(
    (id: string) => setActiveCollectionId(id),
    [setActiveCollectionId],
  );

  const addCollection = useCallback(
    (name: string) => {
      const collection = createCollection(name, Date.now());
      setCollections((prev) => [...prev, collection]);
      setActiveCollectionId(collection.id);
      return collection;
    },
    [setCollections, setActiveCollectionId],
  );

  const updateCollection = useCallback(
    (id: string, update: (collection: Collection) => Collection) => {
      setCollections((prev) => prev.map((c) => (c.id === id ? update(c) : c)));
    },
    [setCollections],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      setCollections((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== id)));
    },
    [setCollections],
  );

  const restoreCollection = useCallback(
    (collection: Collection, index: number) => {
      setCollections((prev) =>
        prev.some((c) => c.id === collection.id)
          ? prev
          : [...prev.slice(0, index), collection, ...prev.slice(index)],
      );
    },
    [setCollections],
  );

  const goTo = useCallback(
    (next: AppView, options?: GoToOptions) => {
      setView(next, options);
    },
    [setView],
  );

  const startTest = useCallback(
    (run: TestRunRequest) => {
      if (run.words.length === 0) return;
      setTestRun((prev) => ({ ...run, id: (prev?.id ?? 0) + 1 }));
      // Starting again from the results replaces them, so Back doesn't pile up old results.
      setView('active', { replace: view === 'results' });
    },
    [setView, view],
  );

  const completeTest = useCallback(
    (session: TestSession) => {
      setLastSession(session);
      setLastRun(testRun);
      setTestRun(null);
      if (testRun) {
        const now = session.endedAt ?? Date.now();
        setCollections((prev) => recordMistakes(prev, session, testRun.owners, now));
      }
      // The finished test should not be reachable with the Back button.
      setView('results', { replace: true });
    },
    [setView, setCollections, testRun],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      collections,
      activeCollection,
      selectCollection,
      addCollection,
      updateCollection,
      deleteCollection,
      restoreCollection,
      settings,
      setSettings,
      storageFailed,
      view,
      goTo,
      practiceSource,
      setPracticeSource,
      testRun,
      startTest,
      lastSession,
      lastRun,
      completeTest,
    }),
    [
      collections,
      activeCollection,
      selectCollection,
      addCollection,
      updateCollection,
      deleteCollection,
      restoreCollection,
      settings,
      setSettings,
      storageFailed,
      view,
      goTo,
      practiceSource,
      testRun,
      startTest,
      lastSession,
      lastRun,
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
