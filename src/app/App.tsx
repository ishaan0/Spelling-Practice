import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';
import { AppProvider, useApp } from './AppProvider';
import { AppHeader } from './AppHeader';
import { useHashView } from './useHashView';
import { ToastProvider } from '../components/Toast';
import { WordLibrary } from '../features/words/WordLibrary';
import { TestSetup } from '../features/test/TestSetup';
import { ActiveTest } from '../features/test/ActiveTest';
import { TestResults } from '../features/results/TestResults';

export function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  const [view, setView] = useHashView();
  return (
    <AppProvider view={view} setView={setView}>
      <div className="flex min-h-full flex-col">
        <AppHeader />
        <StorageWarning />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
            <ViewRouter />
          </div>
        </main>
        <footer className="px-4 pb-6 pt-2 text-center text-xs text-slate-400">
          Your words and settings are saved in this browser only.
        </footer>
      </div>
    </AppProvider>
  );
}

function StorageWarning() {
  const { storageFailed } = useApp();
  if (!storageFailed) return null;
  return (
    <div role="alert" className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2 px-4 py-2.5 text-sm text-amber-900 sm:px-6">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Your latest changes couldn't be saved — this browser's storage is full or turned off.
          They will be lost when you close this tab.
        </p>
      </div>
    </div>
  );
}

function ViewRouter() {
  const { view, goTo, testRun, lastSession, startTest, completeTest } = useApp();

  const missingTest = view === 'active' && !testRun;
  const missingResults = view === 'results' && !lastSession;

  // Reached by reloading or via the Back button — there is nothing to show here.
  useEffect(() => {
    if (missingTest) goTo('setup', { replace: true });
    else if (missingResults) goTo('library', { replace: true });
  }, [missingTest, missingResults, goTo]);

  // Warn before a reload or tab close throws away a test in progress.
  useEffect(() => {
    if (view !== 'active' || !testRun) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [view, testRun]);

  if (view === 'library') return <WordLibrary />;
  if (view === 'setup') return <TestSetup onStart={startTest} />;
  if (view === 'active' && testRun) {
    return (
      <ActiveTest
        key={testRun.id}
        initialWords={testRun.words}
        breakEvery={testRun.breakEvery}
        label={testRun.label}
        onComplete={completeTest}
        onExit={() => goTo('setup', { replace: true })}
      />
    );
  }
  if (view === 'results' && lastSession) return <TestResults session={lastSession} />;
  return null;
}
