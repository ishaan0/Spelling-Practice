import { useState } from 'react';
import { X } from 'lucide-react';

interface WordListProps {
  words: string[];
  /** Lower-cased words that are in the collection's frequent errors. */
  missed?: ReadonlySet<string>;
  onRemove: (word: string) => void;
}

// Rendering thousands of chips at once makes the page sluggish.
const PAGE_SIZE = 300;

export function WordList({ words, missed, onRemove }: WordListProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  if (words.length === 0) return null;

  const visible = words.slice(0, limit);
  const hidden = words.length - visible.length;

  return (
    <div>
      <ul className="flex flex-wrap gap-2" aria-label="Word list">
        {visible.map((word) => {
          const needsReview = missed?.has(word.toLowerCase()) ?? false;
          return (
            <li key={word} className="max-w-full">
              <span
                className={`group inline-flex max-w-full items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-sm ${
                  needsReview
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
                title={needsReview ? `${word} — in your frequent errors` : word}
              >
                <span className="truncate">{word}</span>
                {needsReview && <span className="sr-only"> (frequent error)</span>}
                <button
                  type="button"
                  onClick={() => onRemove(word)}
                  aria-label={`Remove word ${word}`}
                  className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-ring"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE_SIZE * 4)}
          className="mt-4 rounded-md text-sm font-medium text-accent-700 hover:text-accent-800 hover:underline focus-ring"
        >
          Show more ({hidden.toLocaleString()} hidden)
        </button>
      )}
    </div>
  );
}
