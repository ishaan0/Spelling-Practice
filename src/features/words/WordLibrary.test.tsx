import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordLibrary } from './WordLibrary';
import { ToastProvider } from '../../components/Toast';
import { AppProvider, type AppView } from '../../app/AppProvider';
import {
  loadCollections,
  saveCollections,
  saveWords,
} from '../../services/storage/storageService';
import type { ReactNode } from 'react';

/** The words of the first (and, unless a test adds more, only) collection. */
function loadWords(): string[] {
  return loadCollections()[0]!.words;
}

function renderLibrary(view: AppView = 'library', setView: (v: AppView) => void = () => {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <AppProvider view={view} setView={setView}>
          {children}
        </AppProvider>
      </ToastProvider>
    );
  }
  return render(<Wrapper><WordLibrary /></Wrapper>);
}

async function addWords(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText(/paste words/i), text);
  await user.click(screen.getByRole('button', { name: /add words/i }));
}

describe('WordLibrary', () => {
  it('disables the start button when there are no words', () => {
    renderLibrary();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeDisabled();
  });

  it('adds pasted words and enables start', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await addWords(user, 'apple\nbanana\norange');

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start practice/i })).not.toBeDisabled();
  });

  it('saves the first words that are added', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await addWords(user, 'apple, banana');

    expect(loadWords()).toEqual(['apple', 'banana']);
  });

  it('loads saved words', () => {
    saveWords(['rhythm', 'necessary']);
    renderLibrary();
    expect(screen.getByText('rhythm')).toBeInTheDocument();
    expect(screen.getByTestId('word-count')).toHaveTextContent('2 words');
  });

  it('shows the word count after adding words', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await addWords(user, 'apple, banana, orange');

    expect(screen.getByTestId('word-count')).toHaveTextContent('3 words');
  });

  it('previews how many words are new while typing', async () => {
    const user = userEvent.setup();
    saveWords(['apple']);
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'apple, banana, cherry');

    expect(screen.getByText('2 new words')).toBeInTheDocument();
    expect(screen.getByText(/1 already in your list/)).toBeInTheDocument();
  });

  it('does not add words that are already in the list', async () => {
    const user = userEvent.setup();
    saveWords(['apple']);
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'Apple');

    expect(screen.getByRole('button', { name: /add words/i })).toBeDisabled();
  });

  it('removes a word when its X button is clicked and can undo it', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await addWords(user, 'apple\nbanana');

    await user.click(screen.getByRole('button', { name: /remove word apple/i }));
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(loadWords()).toEqual(['banana']);

    const toast = screen.getByText(/Removed “apple”/).closest('[role="status"]') as HTMLElement;
    await user.click(within(toast).getByRole('button', { name: /undo/i }));
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(loadWords()).toEqual(['apple', 'banana']);
  });

  it('deduplicates within a single paste', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await addWords(user, 'apple\napple\nAPPLE');

    expect(screen.getByTestId('word-count')).toHaveTextContent('1 word');
  });

  it('clears the list after confirmation', async () => {
    const user = userEvent.setup();
    saveWords(['apple', 'banana']);
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /clear all/i }));

    expect(screen.getByText(/no words yet/i)).toBeInTheDocument();
    expect(loadWords()).toEqual([]);
  });

  it('adds sample words from the empty state', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /add sample words/i }));

    expect(screen.getByText('rhythm')).toBeInTheDocument();
  });

  it('imports words from uploaded files, one after the other', async () => {
    renderLibrary();

    const first = new File(['﻿apple\r\nbanana\r\n'], 'fruit.txt', { type: 'text/plain' });
    const second = new File(['["cherry", "Apple"]'], 'more.json', { type: 'application/json' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [first, second] } });

    await waitFor(() => expect(screen.getByText('cherry')).toBeInTheDocument());
    expect(loadWords()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('rejects unsupported files', async () => {
    renderLibrary();

    const file = new File(['binary'], 'photo.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });

    expect(await screen.findByText(/isn't supported/i)).toBeInTheDocument();
    expect(loadWords()).toEqual([]);
  });

  it('opens the test setup when starting practice', async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    saveWords(['apple']);
    renderLibrary('library', setView);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(setView).toHaveBeenCalledWith('setup', undefined);
  });
});

describe('WordLibrary collections', () => {
  async function createCollection(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(screen.getByRole('button', { name: /new collection/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Name')).toHaveFocus();
    await user.keyboard(`${name}{Enter}`);
  }

  it('keeps the words of each collection separate', async () => {
    const user = userEvent.setup();
    saveWords(['apple']);
    renderLibrary();

    await createCollection(user, 'Week 2');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Collection' })).toHaveTextContent('Week 2');
    expect(screen.queryByText('apple')).not.toBeInTheDocument();

    await addWords(user, 'banana');
    const [first, second] = loadCollections();
    expect(first).toMatchObject({ name: 'My words', words: ['apple'] });
    expect(second).toMatchObject({ name: 'Week 2', words: ['banana'] });

    await user.click(screen.getByRole('combobox', { name: 'Collection' }));
    await user.click(screen.getByRole('option', { name: /my words/i }));
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.queryByText('banana')).not.toBeInTheDocument();
  });

  it('does not allow two collections with the same name', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /new collection/i }));
    await user.keyboard('my WORDS');

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/already exists/i);
    expect(within(dialog).getByRole('button', { name: /create/i })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(loadCollections()).toHaveLength(1);
  });

  it('renames the active collection', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /^rename$/i }));
    const input = within(screen.getByRole('dialog')).getByLabelText('Name');
    await user.clear(input);
    await user.type(input, 'Spelling bee{Enter}');

    expect(loadCollections()[0]!.name).toBe('Spelling bee');
  });

  it('cannot delete the only collection, and can undo deleting one', async () => {
    const user = userEvent.setup();
    saveWords(['apple']);
    renderLibrary();
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeDisabled();

    await createCollection(user, 'Week 2');
    await addWords(user, 'banana');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /delete collection/i }),
    );

    expect(loadCollections().map((c) => c.name)).toEqual(['My words']);
    expect(screen.getByText('apple')).toBeInTheDocument();

    const toast = screen.getByText(/Deleted “Week 2”/).closest('[role="status"]') as HTMLElement;
    await user.click(within(toast).getByRole('button', { name: /undo/i }));
    expect(loadCollections().map((c) => c.name)).toEqual(['My words', 'Week 2']);
    expect(screen.getByText('banana')).toBeInTheDocument();
  });
});

describe('WordLibrary frequent errors', () => {
  function seed() {
    saveCollections([
      {
        id: 'a',
        name: 'Week 1',
        words: ['apple', 'banana', 'cherry'],
        errors: [
          { word: 'banana', misses: 1, lastMissedAt: 1 },
          { word: 'apple', misses: 3, lastMissedAt: 2 },
        ],
        createdAt: 0,
      },
      {
        id: 'b',
        name: 'Week 2',
        words: ['apple', 'rhythm'],
        errors: [
          { word: 'Apple', misses: 1, lastMissedAt: 3 },
          { word: 'rhythm', misses: 1, lastMissedAt: 3 },
        ],
        createdAt: 0,
      },
    ]);
  }

  it('lists the most-missed words first with their miss counts', () => {
    seed();
    renderLibrary();

    const list = screen.getByRole('list', { name: 'Frequent errors' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['apple×3 misses', 'banana×1 misses']);
    expect(screen.getByTestId('error-count')).toHaveTextContent('2 words');
  });

  it('removes a word only when asked, with undo', async () => {
    const user = userEvent.setup();
    seed();
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /remove apple from frequent errors/i }));
    expect(loadCollections()[0]!.errors.map((e) => e.word)).toEqual(['banana']);
    // The word itself stays in the collection.
    expect(loadCollections()[0]!.words).toContain('apple');

    const toast = screen.getByText(/Removed “apple” from frequent errors/).closest('[role="status"]') as HTMLElement;
    await user.click(within(toast).getByRole('button', { name: /undo/i }));
    expect(loadCollections()[0]!.errors).toContainEqual({ word: 'apple', misses: 3, lastMissedAt: 2 });
  });

  it('keeps frequent errors when the word list is cleared', async () => {
    const user = userEvent.setup();
    seed();
    renderLibrary();

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /clear all/i }));

    expect(loadCollections()[0]!.words).toEqual([]);
    expect(loadCollections()[0]!.errors).toHaveLength(2);
  });

  it('offers practice of the errors of all collections, counted once each', async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    seed();
    renderLibrary('library', setView);

    // apple, banana and rhythm — "Apple" in Week 2 is the same word.
    await user.click(screen.getByRole('button', { name: /all collections \(3\)/i }));
    expect(setView).toHaveBeenCalledWith('setup', undefined);
  });
});
