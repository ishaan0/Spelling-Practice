import { useState } from 'react';
import { Globe, RotateCcw, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { countLabel } from '../../utils/pluralize';
import type { FrequentError } from './collectionTypes';

interface FrequentErrorsProps {
  /** Already sorted, most-missed first. */
  errors: FrequentError[];
  /** Distinct frequent errors across all collections; shown when it adds anything. */
  globalCount: number;
  showGlobal: boolean;
  onRemove: (entry: FrequentError) => void;
  onClear: () => void;
  onPractise: () => void;
  onPractiseGlobal: () => void;
}

const PAGE_SIZE = 300;

export function FrequentErrors({
  errors,
  globalCount,
  showGlobal,
  onRemove,
  onClear,
  onPractise,
  onPractiseGlobal,
}: FrequentErrorsProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const visible = errors.slice(0, limit);
  const hidden = errors.length - visible.length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-slate-900">Frequent errors</h2>
          <span
            className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800"
            data-testid="error-count"
          >
            {countLabel(errors.length, 'word')}
          </span>
        </div>
        <div className="-mr-2 flex flex-wrap items-center gap-1">
          {showGlobal && globalCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onPractiseGlobal}>
              <Globe size={15} aria-hidden="true" />
              All collections ({globalCount.toLocaleString()})
            </Button>
          )}
          {errors.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={onPractise}>
                <RotateCcw size={15} aria-hidden="true" />
                Practise errors
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={15} aria-hidden="true" />
                Clear
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardBody className="max-h-[20rem] overflow-y-auto scroll-thin">
        {errors.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Words you misspell in a test of this collection are collected here. They stay until
            you remove them.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2" aria-label="Frequent errors">
              {visible.map((e) => (
                <li key={e.word.toLowerCase()} className="max-w-full">
                  <span
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-1 pl-3 pr-1 text-sm text-amber-900"
                    title={`${e.word} — missed ${countLabel(e.misses, 'time')}`}
                  >
                    <span className="truncate">{e.word}</span>
                    <span className="shrink-0 rounded-full bg-amber-200/70 px-1.5 text-xs font-semibold tabular-nums text-amber-900">
                      ×{e.misses}
                      <span className="sr-only"> misses</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(e)}
                      aria-label={`Remove ${e.word} from frequent errors`}
                      className="shrink-0 rounded-full p-1 text-amber-700/70 transition-colors hover:bg-amber-200 hover:text-amber-900 focus-ring"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
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
          </>
        )}
      </CardBody>
    </Card>
  );
}
