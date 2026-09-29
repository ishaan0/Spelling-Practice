import { useMemo, useState } from 'react';
import { Trash2, Play } from 'lucide-react';
import { Card, CardBody, CardHeader, CardFooter } from '../../components/Card';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { useApp } from '../../app/AppProvider';
import { useToast } from '../../components/Toast';
import type { ParseResult } from './parseWords';
import { WordInput } from './WordInput';
import { WordImporter } from './WordImporter';
import { WordList } from './WordList';

export function WordLibrary() {
  const { words, setWords, goTo } = useApp();
  const { show } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const stats = useMemo(() => {
    return `${words.length} ${words.length === 1 ? 'word' : 'words'} ready`;
  }, [words.length]);

  const mergeWords = (newWords: string[], opts?: { sourceLabel?: string }) => {
    if (newWords.length === 0) {
      show('No new words to add', 'info');
      return;
    }
    const existing = new Set(words.map((w) => w.toLowerCase()));
    const additions = newWords.filter((w) => !existing.has(w.toLowerCase()));
    const duplicatesSkipped = newWords.length - additions.length;

    if (additions.length === 0) {
      show('All words were already in your library', 'info');
      return;
    }

    setWords((prev) => {
      const combined = [...prev, ...additions];
      // Keep order; re-dedupe in case of weird overlaps
      const seen = new Set<string>();
      const result: string[] = [];
      for (const w of combined) {
        const k = w.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          result.push(w);
        }
      }
      return result;
    });

    const detail =
      duplicatesSkipped > 0
        ? ` (${duplicatesSkipped} duplicate${duplicatesSkipped === 1 ? '' : 's'} skipped)`
        : '';
    const prefix = opts?.sourceLabel ? `${opts.sourceLabel}: ` : '';
    show(`${prefix}Added ${additions.length} ${additions.length === 1 ? 'word' : 'words'}${detail}`, 'success');
  };

  const handlePasted = (result: ParseResult) => {
    mergeWords(result.words, {
      sourceLabel: undefined,
    });
  };

  const handleImported = ({ words: imported }: { words: string[]; message?: string }) => {
    mergeWords(imported, { sourceLabel: 'Imported' });
  };

  const handleImportError = (message: string) => {
    show(message, 'error');
  };

  const handleRemove = (word: string) => {
    setWords((prev) => prev.filter((w) => w !== word));
    show(`Removed "${word}"`, 'info');
  };

  const handleClear = () => {
    setWords([]);
    setShowClearConfirm(false);
    show('Word library cleared', 'info');
  };

  const handleStart = () => {
    goTo('setup');
  };

  const handleDedup = () => {
    const before = words.length;
    let after = before;
    setWords((prev) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const w of prev) {
        const k = w.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(w);
        }
      }
      after = out.length;
      return out;
    });
    const removed = before - after;
    if (removed > 0) {
      show(`Removed ${removed} duplicate${removed === 1 ? '' : 's'}`, 'success');
    } else {
      show('No duplicates found', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <header className="text-center sm:text-left">
        <h1 className="text-2xl font-semibold text-slate-900">Spelling Practice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Practice spelling by listening and typing what you hear.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-slate-900">Add words</h2>
            <p className="text-sm text-slate-500 mt-1">
              Paste a list or import a file. Words can include phrases like "New York".
            </p>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              <WordInput onParsed={handlePasted} />
              <WordImporter onParsed={handleImported} onError={handleImportError} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-medium text-slate-900">Word library</h2>
              <span className="text-xs font-medium text-slate-500" data-testid="word-count">
                {stats}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {words.length === 0 ? (
              <EmptyState
                title="No practice words yet"
                description="Paste a list or import a file to get started."
              />
            ) : (
              <WordList words={words} onRemove={handleRemove} />
            )}
          </CardBody>
          <CardFooter className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDedup}
                disabled={words.length === 0}
              >
                Remove duplicates
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                disabled={words.length === 0}
              >
                <Trash2 size={14} aria-hidden="true" className="mr-1.5" />
                Clear all
              </Button>
            </div>
            <Button onClick={handleStart} disabled={words.length === 0}>
              <Play size={16} aria-hidden="true" className="mr-1.5" />
              Start test
            </Button>
          </CardFooter>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-500 pt-4">
        Your word list stays in this browser.
      </footer>

      <Dialog
        open={showClearConfirm}
        title="Clear word library?"
        description={`This will remove all ${words.length} ${words.length === 1 ? 'word' : 'words'}. This cannot be undone.`}
        confirmLabel="Clear all"
        confirmVariant="danger"
        cancelLabel="Keep words"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
