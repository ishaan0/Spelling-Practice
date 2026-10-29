import { useId, useState } from 'react';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { SelectMenu } from '../../components/SelectMenu';
import { useToast } from '../../components/Toast';
import { useApp } from '../../app/AppProvider';
import { MAX_COLLECTIONS } from '../../utils/constants';
import { countLabel } from '../../utils/pluralize';
import { CollectionNameDialog } from './CollectionNameDialog';
import { canAddCollection } from './collectionUtils';

type OpenDialog = 'new' | 'rename' | 'delete' | null;

/** Picks the collection to work on, and creates, renames or deletes collections. */
export function CollectionBar() {
  const {
    collections,
    activeCollection,
    selectCollection,
    addCollection,
    updateCollection,
    deleteCollection,
    restoreCollection,
  } = useApp();
  const { show } = useToast();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const labelId = useId();

  const onlyOne = collections.length <= 1;
  const canAdd = canAddCollection(collections);

  const handleCreate = (name: string) => {
    addCollection(name);
    setDialog(null);
    show(`Created “${name}”`, 'success');
  };

  const handleRename = (name: string) => {
    updateCollection(activeCollection.id, (c) => ({ ...c, name }));
    setDialog(null);
    show(`Renamed to “${name}”`, 'success');
  };

  const handleDelete = () => {
    const deleted = activeCollection;
    const index = collections.findIndex((c) => c.id === deleted.id);
    const next = collections.find((c) => c.id !== deleted.id);
    setDialog(null);
    if (!next) return;
    deleteCollection(deleted.id);
    selectCollection(next.id);
    show(`Deleted “${deleted.name}”`, 'info', {
      action: {
        label: 'Undo',
        onClick: () => {
          restoreCollection(deleted, index);
          selectCollection(deleted.id);
        },
      },
    });
  };

  const { words, errors } = activeCollection;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          id={labelId}
          // Like a <label>: clicking the text focuses the menu button.
          onClick={() => document.getElementById('collection-select')?.focus()}
          className="shrink-0 text-sm font-semibold text-slate-900"
        >
          Collection
        </span>
        <SelectMenu
          id="collection-select"
          labelledBy={labelId}
          value={activeCollection.id}
          onChange={selectCollection}
          options={collections.map((c) => ({
            value: c.id,
            label: c.name,
            description: `${countLabel(c.words.length, 'word')} · ${countLabel(c.errors.length, 'frequent error')}`,
          }))}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
      </div>
      <div className="-ml-2 flex flex-wrap items-center gap-1 sm:ml-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialog('new')}
          disabled={!canAdd}
          title={canAdd ? undefined : `You can have up to ${MAX_COLLECTIONS} collections.`}
          aria-label="New collection"
        >
          <FolderPlus size={15} aria-hidden="true" />
          New<span className="hidden min-[480px]:inline"> collection</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog('rename')}>
          <Pencil size={15} aria-hidden="true" />
          Rename
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialog('delete')}
          disabled={onlyOne}
          title={onlyOne ? 'You need at least one collection.' : undefined}
          className="hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={15} aria-hidden="true" />
          Delete
        </Button>
      </div>

      <CollectionNameDialog
        open={dialog === 'new'}
        title="New collection"
        confirmLabel="Create"
        collections={collections}
        onSubmit={handleCreate}
        onCancel={() => setDialog(null)}
      />
      <CollectionNameDialog
        open={dialog === 'rename'}
        title="Rename collection"
        confirmLabel="Rename"
        initialName={activeCollection.name}
        collections={collections}
        renamingId={activeCollection.id}
        onSubmit={handleRename}
        onCancel={() => setDialog(null)}
      />
      <Dialog
        open={dialog === 'delete'}
        title={`Delete “${activeCollection.name}”?`}
        description={`This removes the collection with its ${countLabel(words.length, 'word')} and ${countLabel(errors.length, 'frequent error')}.`}
        confirmLabel="Delete collection"
        confirmVariant="danger"
        cancelLabel="Keep it"
        onConfirm={handleDelete}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
