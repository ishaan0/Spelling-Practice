import { useRef } from 'react';
import type { AnswerStatus } from './testTypes';

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter was pressed (once — a held-down key does not repeat). */
  onEnter: () => void;
  /** Locks the field while feedback is shown. */
  locked: boolean;
  /** Outcome to reflect in the field's colour while locked. */
  result?: AnswerStatus | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function AnswerInput({
  value,
  onChange,
  onEnter,
  locked,
  result = null,
  inputRef,
}: AnswerInputProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const tone =
    locked && result === 'correct'
      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 focus-visible:ring-0'
      : locked && result === 'incorrect'
        ? 'border-red-400 bg-red-50 text-red-900 animate-shake focus-visible:ring-0'
        : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-accent-500 focus-visible:ring-4 focus-visible:ring-accent-500/15';

  return (
    <div className="w-full">
      <label htmlFor="answer" className="sr-only">
        Type the word you heard
      </label>
      {/* Read-only rather than disabled while locked: the field keeps focus, so
          Enter still works and the on-screen keyboard stays open on phones. */}
      <input
        id="answer"
        ref={ref}
        type="text"
        inputMode="text"
        enterKeyHint={locked ? 'next' : 'done'}
        value={value}
        readOnly={locked}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
          e.preventDefault();
          if (!e.repeat) onEnter();
        }}
        placeholder="Type what you hear"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={`h-14 w-full rounded-xl border-2 px-4 text-center text-xl font-medium tracking-wide shadow-sm outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus-visible:ring-offset-0 ${tone}`}
        data-testid="answer-input"
      />
    </div>
  );
}
