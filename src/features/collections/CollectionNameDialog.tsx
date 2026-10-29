import { useId, useRef, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { MAX_COLLECTION_NAME_LENGTH } from '../../utils/constants';
import type { Collection } from './collectionTypes';
import { cleanCollectionName, validateCollectionName } from './collectionUtils';

interface CollectionNameDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  initialName?: string;
  collections: readonly Collection[];
  /** The collection being renamed, which may keep its own name. */
  renamingId?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function CollectionNameDialog(props: CollectionNameDialogProps) {
  if (!props.open) return null;
  // Mounted fresh each time it opens, so the field starts from `initialName`.
  return <NameForm {...props} />;
}

function NameForm({
  title,
  confirmLabel,
  initialName = '',
  collections,
  renamingId,
  onSubmit,
  onCancel,
}: CollectionNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();

  const error = validateCollectionName(name, collections, renamingId);
  const unchanged = renamingId !== undefined && cleanCollectionName(name) === initialName;
  // Don't complain about an empty field before anything was typed.
  const showError = error !== null && (touched || name.length > 0);

  const submit = () => {
    setTouched(true);
    if (error !== null) return;
    if (unchanged) {
      onCancel();
      return;
    }
    onSubmit(cleanCollectionName(name));
  };

  return (
    <Dialog
      open
      title={title}
      confirmLabel={confirmLabel}
      confirmDisabled={error !== null}
      initialFocusRef={inputRef}
      onConfirm={submit}
      onCancel={onCancel}
    >
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        Name
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={name}
        maxLength={MAX_COLLECTION_NAME_LENGTH + 10}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="e.g. Week 3, Science words"
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
        autoComplete="off"
        className={`field h-10 ${showError ? 'field-invalid' : ''}`}
      />
      {showError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </Dialog>
  );
}
