import { SpellCheck } from 'lucide-react';
import { useApp, type AppView } from './AppProvider';

export function AppHeader() {
  const { view, goTo, activeCollection, lastSession } = useApp();
  const wordCount = activeCollection.words.length;
  const inTest = view === 'active';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => goTo('library')}
          disabled={inTest}
          className="flex items-center gap-2.5 rounded-lg focus-ring disabled:cursor-default"
          aria-label="Spelling Practice — go to your word list"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-white">
            <SpellCheck size={18} aria-hidden="true" />
          </span>
          <span
            className={`whitespace-nowrap text-[15px] font-semibold tracking-tight text-slate-900 ${
              inTest ? '' : 'hidden min-[480px]:inline'
            }`}
          >
            Spelling Practice
          </span>
        </button>

        {inTest ? (
          <span className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Test in progress
          </span>
        ) : (
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavItem target="library" current={view}>
              Words
              {wordCount > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-200/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {wordCount.toLocaleString()}
                </span>
              )}
            </NavItem>
            <NavItem target="setup" current={view}>
              Practice
            </NavItem>
            {lastSession && (
              <NavItem target="results" current={view}>
                Results
              </NavItem>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function NavItem({
  target,
  current,
  children,
}: {
  target: AppView;
  current: AppView;
  children: React.ReactNode;
}) {
  const { goTo } = useApp();
  const active = target === current;
  return (
    <button
      type="button"
      onClick={() => goTo(target)}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-ring ${
        active
          ? 'bg-slate-100 text-slate-900'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
