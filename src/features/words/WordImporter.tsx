import { useCallback, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '../../components/Button';
import { MAX_IMPORT_FILE_SIZE, MAX_WORDS } from '../../utils/constants';
import { parseWordInput } from './parseWords';

interface WordImporterProps {
  onParsed: (result: { words: string[]; message?: string }) => void;
  onError: (message: string) => void;
}

const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.json'];

export function WordImporter({ onParsed, onError }: WordImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        onError(
          `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} MB.`,
        );
        return;
      }

      const name = file.name.toLowerCase();
      const ext = name.match(/\.[^.]+$/)?.[0] ?? '';
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        onError(`Unsupported file type: ${ext || 'unknown'}. Use .txt, .csv, or .json.`);
        return;
      }

      try {
        const text = await file.text();
        let words: string[];

        if (ext === '.json') {
          const jsonWords = parseJsonWords(text);
          if (jsonWords === null) {
            onError('This JSON file has an unsupported format.');
            return;
          }
          words = jsonWords;
        } else {
          const result = parseWordInput(text);
          words = result.words;
        }

        if (words.length === 0) {
          onError('The file does not contain any usable words.');
          return;
        }
        if (words.length > MAX_WORDS) {
          onError(
            `File has too many words (${words.length.toLocaleString()}). Max is ${MAX_WORDS.toLocaleString()}.`,
          );
          return;
        }

        onParsed({ words });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to read this file.';
        onError(`Unable to read this file. ${msg}`);
      }
    },
    [onParsed, onError],
  );

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Import file
      </label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
          isDragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
        aria-label="Click or drop a file to import words"
      >
        <Upload size={24} className="text-slate-500" aria-hidden="true" />
        <p className="text-sm text-slate-700">
          <span className="font-medium">Click to choose a file</span> or drag and drop
        </p>
        <p className="text-xs text-slate-500">.txt, .csv, or .json</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.json,text/plain,application/json"
          onChange={onSelect}
          className="sr-only"
          data-testid="file-input"
        />
      </div>
      <div className="mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText size={16} aria-hidden="true" className="mr-1.5" />
          Choose file
        </Button>
      </div>
    </div>
  );
}

function parseJsonWords(text: string): string[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (Array.isArray(parsed)) {
    // string[]
    if (parsed.every((v) => typeof v === 'string')) {
      return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
    // Array<{ word: string }>
    if (
      parsed.every(
        (v) => v !== null && typeof v === 'object' && 'word' in v && typeof (v as { word: unknown }).word === 'string',
      )
    ) {
      return parsed
        .map((v) => (v as { word: string }).word)
        .filter((w) => w.trim().length > 0);
    }
    return null;
  }

  if (parsed !== null && typeof parsed === 'object' && 'words' in parsed) {
    const words = (parsed as { words: unknown }).words;
    if (Array.isArray(words) && words.every((v) => typeof v === 'string')) {
      return words.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    }
    return null;
  }

  return null;
}