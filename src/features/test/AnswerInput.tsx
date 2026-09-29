import { useEffect, useRef } from 'react';
import { Button } from '../../components/Button';

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function AnswerInput({ value, onChange, onSubmit, disabled, inputRef }: AnswerInputProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  useEffect(() => {
    if (!disabled) {
      ref.current?.focus();
    }
  }, [disabled, ref]);

  return (
    <div className="w-full">
      <label htmlFor="answer" className="sr-only">
        Type the word you heard
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="answer"
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!disabled && value.trim().length > 0) {
                onSubmit();
              }
            }
          }}
          placeholder="Type what you hear"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          disabled={disabled}
          className="flex-1 h-12 rounded-lg border border-slate-300 bg-white px-4 text-base focus-ring disabled:bg-slate-50 disabled:text-slate-400"
          data-testid="answer-input"
        />
        <Button
          onClick={onSubmit}
          disabled={disabled || value.trim().length === 0}
          size="lg"
          className="sm:w-32"
          data-testid="submit-btn"
        >
          Submit
        </Button>
      </div>
    </div>
  );
}