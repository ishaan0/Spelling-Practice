import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp, type AppView } from './AppProvider';
import { ToastProvider } from '../components/Toast';
import { WordLibrary } from '../features/words/WordLibrary';
import { TestSetup } from '../features/test/TestSetup';
import { ActiveTest } from '../features/test/ActiveTest';
import { TestResults } from '../features/results/TestResults';
import type { TestSession } from '../features/test/testTypes';
import { computeScore } from '../features/test/testUtils';

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  const [view, setView] = useState<AppView>('library');
  return (
    <AppProvider view={view} setView={setView}>
      <ViewRouter />
    </AppProvider>
  );
}

function ViewRouter() {
  const { view, goTo } = useApp();
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [pendingTestWords, setPendingTestWords] = useState<string[] | null>(null);

  // Reset transient state when leaving active/results
  useEffect(() => {
    if (view === 'library') {
      setPendingTestWords(null);
      // Keep activeSession so the results view can re-render after returning from library;
      // it will be replaced when a new test completes.
    }
  }, [view]);

  const handleStartTest = useCallback(
    (selectedWords: string[]) => {
      setPendingTestWords(selectedWords);
      goTo('active');
    },
    [goTo],
  );

  const handleComplete = useCallback(
    (info: {
      session: ReturnType<typeof computeScore>;
      words: string[];
      answers: import('../features/test/testTypes').TestAnswer[];
      status: 'completed' | 'ended-early';
      mistakeWords: string[];
    }) => {
      const session: TestSession = {
        id: `s-${Date.now()}`,
        words: info.words,
        currentIndex: info.session.totalAnswered,
        answers: info.answers,
        settings: activeSession?.settings ?? {
          questionCount: info.words.length,
          timerEnabled: false,
          secondsPerWord: 0,
          language: 'en-US',
          voiceName: null,
          speechRate: 1,
          pitch: 1,
        },
        startedAt: activeSession?.startedAt ?? Date.now(),
        endedAt: Date.now(),
        status: info.status,
      };
      setActiveSession(session);
      setPendingTestWords(null);
      goTo('results');
    },
    [goTo, activeSession],
  );

  return (
    <main className="min-h-full">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
        {view === 'library' && <WordLibrary />}
        {view === 'setup' && <TestSetup onStart={handleStartTest} />}
        {view === 'active' && pendingTestWords && (
          <ActiveTest
            initialWords={pendingTestWords}
            onComplete={handleComplete}
            onExit={() => {
              setPendingTestWords(null);
              goTo('library');
            }}
          />
        )}
        {view === 'active' && !pendingTestWords && (
          <div className="text-center py-10 text-slate-600">
            <p>No test prepared. <button className="text-accent-700 underline" onClick={() => goTo('setup')}>Go to setup</button>.</p>
          </div>
        )}
        {view === 'results' && activeSession && <TestResults session={activeSession} />}
        {view === 'results' && !activeSession && (
          <div className="text-center py-10 text-slate-600">
            <p>No test results yet.</p>
            <button className="mt-2 text-accent-700 underline" onClick={() => goTo('library')}>Back to library</button>
          </div>
        )}
      </div>
    </main>
  );
}