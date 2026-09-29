import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowRight,
  BookOpen,
  Download,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { useApp } from '../../app/AppProvider';
import { useToast } from '../../components/Toast';
import { MAX_WORDS, SAMPLE_WORDS } from '../../utils/constants';
import { countLabel } from '../../utils/pluralize';
import type { WordSource } from './wordTypes';
import { dedupeWords } from './parseWords';
import { WordInput } from './WordInput';
import { WordImporter } from './WordImporter';
import { WordList } from './WordList';

const SEARCH_THRESHOLD = 12;

export function WordLibrary() {
  const { words, setWords, missedWords, goTo, setPracticeSource } = useApp();
  const { show } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [query, setQuery] = useState('');
  const [sorted, setSorted] = useState(false);

  const missedSet = useMemo(() => new Set(missedWords.map((w) => w.toLowerCase())), [missedWords]);
  const reviewCount = useMemo(
    () => words.filter((w) => missedSet.has(w.toLowerCase())).length,
    [words, missedSet],
  );

  const visibleWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? words.filter((w) => w.toLowerCase().includes(q)) : words;
    return sorted
      ? [...filtered].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : filtered;
  }, [words, query, sorted]);

  // Several files can be imported in one go; each must build on the previous
  // one's result rather than on the list from the last render.
  const wordsRef = useRef(words);
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);
  const commit = (next: string[]) => {
    wordsRef.current = next;
    setWords(next);
  };

  const restore = (snapshot: string[]) => () => commit(snapshot);

  const addWords = (incoming: string[], source: WordSource, fileName?: string) => {
    const words = wordsRef.current;
    const existing = new Set(words.map((w) => w.toLowerCase()));
    const fresh = dedupeWords(incoming).filter((w) => !existing.has(w.toLowerCase()));
    const from = fileName ? ` from “${fileName}”` : '';

    if (fresh.length === 0) {
      show(`Nothing new${from} — those words are already in your list`, 'info');
      return;
    }

    const room = MAX_WORDS - words.length;
    if (room <= 0) {
      show(`Your list is full (${MAX_WORDS.toLocaleString()} words). Remove some words first.`, 'error');
      return;
    }

    const additions = fresh.slice(0, room);
    const snapshot = words;
    commit([...words, ...additions]);

    const skipped = incoming.length - fresh.length;
    const details: string[] = [];
    if (skipped > 0) details.push(`${skipped.toLocaleString()} already in your list`);
    if (additions.length < fresh.length) {
      details.push(`${(fresh.length - additions.length).toLocaleString()} left out, list is full`);
    }
    const label = source === 'sample' ? 'sample word' : 'word';
    show(
      `Added ${countLabel(additions.length, label)}${from}${details.length ? ` (${details.join(', ')})` : ''}`,
      'success',
      { action: { label: 'Undo', onClick: restore(snapshot) } },
    );
  };

  const handleRemove = (word: string) => {
    const snapshot = wordsRef.current;
    commit(snapshot.filter((w) => w !== word));
    show(`Removed “${word}”`, 'info', { action: { label: 'Undo', onClick: restore(snapshot) } });
  };

  const handleClear = () => {
    const snapshot = wordsRef.current;
    commit([]);
    setQuery('');
    setShowClearConfirm(false);
    show(`Removed ${countLabel(snapshot.length, 'word')}`, 'info', {
      action: { label: 'Undo', onClick: restore(snapshot) },
    });
  };

  const handleExport = () => {
    const blob = new Blob([`${words.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spelling-words.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    show(`Downloaded ${countLabel(words.length, 'word')} as spelling-words.txt`, 'success');
  };

  const startPractice = (source: 'all' | 'missed') => {
    setPracticeSource(source);
    goTo('setup');
  };

  const hasWords = words.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Your words</h1>
          <p className="mt-1 text-sm text-slate-600">
            Add the words you want to learn, then listen and type them in a test.
          </p>
        </div>
        <Button size="lg" onClick={() => startPractice('all')} disabled={!hasWords}>
          <Play size={18} aria-hidden="true" />
          Start practice
        </Button>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Add words</h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <WordInput existingWords={words} onParsed={(r) => addWords(r.words, 'paste')} />
            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <WordImporter
              onParsed={(r) => addWords(r.words, 'file', r.fileName)}
              onError={(message) => show(message, 'error')}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-slate-900">Word list</h2>
              <span
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600"
                data-testid="word-count"
              >
                {countLabel(words.length, 'word')}
              </span>
            </div>
            {hasWords && (
              <div className="-mr-2 flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleExport}>
                  <Download size={15} aria-hidden="true" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Clear all
                </Button>
              </div>
            )}
          </CardHeader>

          {!hasWords ? (
            <CardBody>
              <EmptyState
                icon={<BookOpen size={22} />}
                title="No words yet"
                description="Paste a list or upload a file to build your list. Not sure where to start? Try a few commonly misspelled words."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => addWords([...SAMPLE_WORDS], 'sample')}
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    Add sample words
                  </Button>
                }
              />
            </CardBody>
          ) : (
            <>
              {reviewCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-100 bg-amber-50/70 px-5 py-3 sm:px-6">
                  <p className="flex items-center gap-2 text-sm text-amber-900">
                    <RotateCcw size={15} className="shrink-0" aria-hidden="true" />
                    <span>
                      <span className="font-semibold">{countLabel(reviewCount, 'word')}</span> to
                      review from earlier tests
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => startPractice('missed')}
                    className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-amber-900 underline-offset-2 hover:underline focus-ring"
                  >
                    Practise them
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              )}

              {words.length >= SEARCH_THRESHOLD && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your words"
                      aria-label="Search your words"
                      className="field h-9 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        aria-label="Clear search"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-ring"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant={sorted ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-9"
                    aria-pressed={sorted}
                    onClick={() => setSorted((v) => !v)}
                    title={sorted ? 'Show in the order added' : 'Sort alphabetically'}
                  >
                    <ArrowDownAZ size={16} aria-hidden="true" />
                    A–Z
                  </Button>
                </div>
              )}

              <CardBody className="max-h-[26rem] overflow-y-auto scroll-thin">
                {visibleWords.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No words match “{query.trim()}”.
                  </p>
                ) : (
                  <WordList
                    key={`${query}|${sorted}`}
                    words={visibleWords}
                    missed={missedSet}
                    onRemove={handleRemove}
                  />
                )}
              </CardBody>
            </>
          )}
        </Card>
      </div>

      <Dialog
        open={showClearConfirm}
        title="Clear your word list?"
        description={`This removes all ${countLabel(words.length, 'word')} from this browser.`}
        confirmLabel="Clear all"
        confirmVariant="danger"
        cancelLabel="Keep words"
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
