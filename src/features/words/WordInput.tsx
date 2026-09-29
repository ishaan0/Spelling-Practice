import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { countLabel } from '../../utils/pluralize';
import { parseWordInput, type ParseResult } from './parseWords';

interface WordInputProps {
  /** Words already in the library, used to preview what would be new. */
  existingWords: readonly string[];
  onParsed: (result: ParseResult) => void;
}

const PLACEHOLDER = `accommodate
necessary
rhythm, conscience, definitely`;

export function WordInput({ existingWords, onParsed }: WordInputProps) {
  const [value, setValue] = useState('');

  const parsed = useMemo(() => parseWordInput(value), [value]);
  const newCount = useMemo(() => {
    const existing = new Set(existingWords.map((w) => w.toLowerCase()));
    return parsed.words.filter((w) => !existing.has(w.toLowerCase())).length;
  }, [parsed.words, existingWords]);

  const hasText = value.trim().length > 0;
  const alreadySaved = parsed.words.length - newCount;
  const canAdd = newCount > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onParsed(parsed);
    setValue('');
  };

  const notes: string[] = [];
  if (alreadySaved > 0) notes.push(`${alreadySaved.toLocaleString()} already in your list`);
  if (parsed.duplicatesRemoved > 0) notes.push(`${countLabel(parsed.duplicatesRemoved, 'duplicate')} ignored`);
  if (parsed.tooLongIgnored > 0) notes.push(`${countLabel(parsed.tooLongIgnored, 'entry', 'entries')} too long`);

  return (
    <div>
      <label htmlFor="word-input" className="block text-sm font-medium text-slate-700 mb-1.5">
        Type or paste words
      </label>
      <textarea
        id="word-input"
        rows={7}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder={PLACEHOLDER}
        aria-describedby="word-input-hint"
        className="field block min-h-[9rem] resize-y py-2.5 leading-relaxed"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      <p id="word-input-hint" className="mt-1.5 min-h-[1.25rem] text-xs text-slate-500" aria-live="polite">
        {!hasText ? (
          'One word or phrase per line, or separate them with commas.'
        ) : parsed.words.length === 0 ? (
          <span className="text-amber-700">No usable words found yet.</span>
        ) : (
          <>
            <span className={canAdd ? 'font-medium text-slate-700' : 'text-amber-700'}>
              {canAdd ? `${countLabel(newCount, 'new word')}` : 'Nothing new to add'}
            </span>
            {notes.length > 0 && ` · ${notes.join(' · ')}`}
          </>
        )}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={handleAdd} disabled={!canAdd}>
          <Plus size={16} aria-hidden="true" />
          Add words
        </Button>
        {hasText && (
          <Button variant="ghost" onClick={() => setValue('')}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
