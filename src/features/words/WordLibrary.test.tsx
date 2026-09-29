import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordLibrary } from './WordLibrary';
import { ToastProvider } from '../../components/Toast';
import { AppProvider, type AppView } from '../../app/AppProvider';
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

describe('WordLibrary', () => {
  it('disables the start button when there are no words', () => {
    renderLibrary();
    const startBtn = screen.getByRole('button', { name: /start test/i });
    expect(startBtn).toBeDisabled();
  });

  it('adds pasted words and enables start', async () => {
    const user = userEvent.setup();
    renderLibrary();

    const textarea = screen.getByLabelText(/paste words/i);
    await user.type(textarea, 'apple\nbanana\norange');

    const addBtn = screen.getByRole('button', { name: /add words/i });
    await user.click(addBtn);

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /start test/i });
    expect(startBtn).not.toBeDisabled();
  });

  it('shows the word count after adding words', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'apple, banana, orange');
    await user.click(screen.getByRole('button', { name: /add words/i }));

    expect(screen.getByTestId('word-count')).toHaveTextContent('3 words ready');
  });

  it('removes a word when its X button is clicked', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'apple\nbanana');
    await user.click(screen.getByRole('button', { name: /add words/i }));

    expect(screen.getByText('apple')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove word apple/i }));
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
  });

  it('parses comma-separated values', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'apple, banana, orange');
    await user.click(screen.getByRole('button', { name: /add words/i }));

    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('orange')).toBeInTheDocument();
  });

  it('deduplicates within a single paste', async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.type(screen.getByLabelText(/paste words/i), 'apple\napple\nAPPLE');
    await user.click(screen.getByRole('button', { name: /add words/i }));

    expect(screen.getByTestId('word-count')).toHaveTextContent('1 word ready');
  });
});