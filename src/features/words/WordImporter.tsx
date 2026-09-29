import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { MAX_IMPORT_FILE_SIZE } from '../../utils/constants';
import { parseJsonWords, parseWordInput, type ParseResult } from './parseWords';

interface WordImporterProps {
  onParsed: (result: ParseResult & { fileName: string }) => void;
  onError: (message: string) => void;
}

const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.tsv', '.json'];

function hasFiles(e: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

export function WordImporter({ onParsed, onError }: WordImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire for every child element, so count them.
  const dragDepth = useRef(0);

  const readFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        onError(
          `“${file.name}” is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} MB.`,
        );
        return;
      }

      const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        onError(`“${file.name}” isn't supported. Use a .txt, .csv or .json file.`);
        return;
      }

      try {
        const text = await file.text();
        const result = ext === '.json' ? parseJsonWords(text) : parseWordInput(text);
        if (result === null) {
          onError(
            `“${file.name}” isn't a word list. Use ["word", …], [{ "word": … }] or { "words": […] }.`,
          );
          return;
        }
        if (result.words.length === 0) {
          onError(`“${file.name}” doesn't contain any words.`);
          return;
        }
        onParsed({ ...result, fileName: file.name });
      } catch {
        onError(`“${file.name}” couldn't be read.`);
      }
    },
    [onParsed, onError],
  );

  const readFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsReading(true);
      try {
        for (const file of Array.from(files)) {
          await readFile(file);
        }
      } finally {
        setIsReading(false);
      }
    },
    [readFile],
  );

  // A file dropped next to the drop zone would otherwise replace the app with the file.
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div>
      <input
        ref={fileInputRef}
        id="word-file"
        type="file"
        multiple
        accept=".txt,.csv,.tsv,.json,text/plain,text/csv,application/json"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) void readFiles(Array.from(files));
          // Allow picking the same file again.
          e.target.value = '';
        }}
        className="sr-only"
        tabIndex={-1}
        data-testid="file-input"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          if (e.dataTransfer.files.length > 0) void readFiles(e.dataTransfer.files);
        }}
        disabled={isReading}
        className={`flex w-full items-center gap-3.5 rounded-xl border-2 border-dashed px-4 py-3.5 text-left transition-colors focus-ring disabled:opacity-60 ${
          isDragging
            ? 'border-accent-500 bg-accent-50'
            : 'border-slate-300 bg-slate-50/60 hover:border-accent-400 hover:bg-accent-50/40'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isDragging ? 'bg-accent-100 text-accent-700' : 'bg-white text-slate-500 shadow-card'
          }`}
          aria-hidden="true"
        >
          <FileUp size={20} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-800">
            {isReading ? 'Reading file…' : isDragging ? 'Drop to add these words' : 'Upload a file'}
          </span>
          <span className="block text-xs text-slate-500">
            Drop a .txt, .csv or .json file here, or click to browse
          </span>
        </span>
      </button>
    </div>
  );
}
