import { useState } from 'react';
import { Button } from '../../components/Button';
import { parseWordInput, type ParseResult } from './parseWords';

interface WordInputProps {
  onParsed: (result: ParseResult) => void;
}

const PLACEHOLDER = `Paste your words here...

accommodation
necessary
rhythm
conscience
beautiful`;

export function WordInput({ onParsed }: WordInputProps) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const result = parseWordInput(value);
    if (result.words.length > 0) {
      onParsed(result);
      setValue('');
    }
  };

  return (
    <div>
      <label htmlFor="word-input" className="block text-sm font-medium text-slate-700 mb-2">
        Paste words
      </label>
      <textarea
        id="word-input"
        rows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono placeholder:text-slate-400 focus-ring"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={handleAdd} disabled={value.trim().length === 0}>
          Add words
        </Button>
        <p className="text-xs text-slate-500">
          Separators: newlines, commas, tabs, semicolons. Duplicates are removed automatically.
        </p>
      </div>
    </div>
  );
}
