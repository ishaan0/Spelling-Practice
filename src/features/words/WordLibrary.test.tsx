import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordLibrary } from './WordLibrary';
import { ToastProvider } from '../../components/Toast';
import { AppProvider, type AppView } from '../../app/AppProvider';
import { loadWords, saveWords } from '../../services/storage/storageService';
import type { ReactNode } from 'react';

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
