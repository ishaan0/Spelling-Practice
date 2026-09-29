import { useCallback, useEffect, useState } from 'react';
import type { AppView, GoToOptions } from './AppProvider';

const VIEW_TO_HASH: Record<AppView, string> = {
  library: '#/',
  setup: '#/practice',
  active: '#/test',
  results: '#/results',
};

function viewFromHash(hash: string): AppView {
  const match = (Object.keys(VIEW_TO_HASH) as AppView[]).find((v) => VIEW_TO_HASH[v] === hash);
  return match ?? 'library';
}

/**
 * Keeps the current view in the URL hash so the browser's Back and Forward
 * buttons move between screens instead of leaving the app.
 */
export function useHashView(): [AppView, (view: AppView, options?: GoToOptions) => void] {
  const [view, setViewState] = useState<AppView>(() => viewFromHash(window.location.hash));

  useEffect(() => {
    const sync = () => setViewState(viewFromHash(window.location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const setView = useCallback((next: AppView, options?: GoToOptions) => {
    const hash = VIEW_TO_HASH[next];
    if (window.location.hash !== hash) {
      if (options?.replace) window.history.replaceState(null, '', hash);
      else window.history.pushState(null, '', hash);
    }
    setViewState(next);
    window.scrollTo(0, 0);
  }, []);

  return [view, setView];
}
