import { X } from 'lucide-react';

interface WordListProps {
  words: string[];
  onRemove: (word: string) => void;
}

export function WordList({ words, onRemove }: WordListProps) {
  if (words.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Word library">
      {words.map((word) => (
        <li key={word}>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800 border border-slate-200">
            <span className="max-w-[20ch] truncate">{word}</span>
            <button
              type="button"
              onClick={() => onRemove(word)}
              aria-label={`Remove word ${word}`}
              className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
