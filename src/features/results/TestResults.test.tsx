import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestResults } from './TestResults';
import { ToastProvider } from '../../components/Toast';
import { AppProvider, type AppView } from '../../app/AppProvider';
import type { TestSession } from '../test/testTypes';
import type { ReactNode } from 'react';
import { createSession, gradeAnswer } from '../test/testUtils';
import { __installClipboardMock } from '../../test/mocks/clipboard';

function renderResults(session: TestSession, view: AppView = 'results', setView: (v: AppView) => void = () => {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <AppProvider view={view} setView={setView}>
          {children}
        </AppProvider>
      </ToastProvider>
    );
  }
  return render(<Wrapper><TestResults session={session} /></Wrapper>);
}

function makeSession(): TestSession {
  const s = createSession({
    words: ['apple', 'banana', 'cherry'],
    questionCount: 'all',
    timerEnabled: false,
    secondsPerWord: 0,
    language: 'en-US',
    voiceName: null,
    speechRate: 1,
    pitch: 1,
  });
  s.answers = [
    gradeAnswer('apple', 'apple', 0, 'submitted'),
    gradeAnswer('banana', 'bannana', 1, 'submitted'),
    gradeAnswer('cherry', 'cherry', 2, 'submitted'),
  ];
  s.status = 'completed';
  return s;
}

describe('TestResults', () => {
  it('renders the summary counts and accuracy', () => {
    renderResults(makeSession());
    expect(screen.getByText(/Test complete/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Correct
    expect(screen.getByText('1')).toBeInTheDocument(); // Incorrect
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('shows correct word chips', () => {
    renderResults(makeSession());
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('cherry')).toBeInTheDocument();
  });

  it('shows incorrect entries with user answer and correct spelling', () => {
    renderResults(makeSession());
    expect(screen.getByText('bannana')).toBeInTheDocument();
    expect(screen.getByText('banana')).toBeInTheDocument();
  });

  it('copies correct words to clipboard', async () => {
    const user = userEvent.setup();
    renderResults(makeSession());
    const spy = __installClipboardMock();

    const btn = screen.getByTestId('copy-copy-correct-words');
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    await new Promise((r) => setTimeout(r, 0));
    expect(spy.writeText).toHaveBeenCalledTimes(1);
    const text = spy.writeText.mock.calls[0][0] as string;
    expect(text).toContain('apple');
    expect(text).toContain('cherry');
    expect(text).not.toContain('banana');
  });

  it('copies mistakes in "user → correct" format', async () => {
    const user = userEvent.setup();
    renderResults(makeSession());
    const spy = __installClipboardMock();

    await user.click(screen.getByTestId('copy-copy-mistakes'));
    await new Promise((r) => setTimeout(r, 0));

    expect(spy.writeText).toHaveBeenCalledTimes(1);
    const text = spy.writeText.mock.calls[0][0] as string;
    expect(text).toContain('bannana → banana');
  });

  it('copies corrected mistake words', async () => {
    const user = userEvent.setup();
    renderResults(makeSession());
    const spy = __installClipboardMock();

    await user.click(screen.getByTestId('copy-copy-corrected-words'));
    await new Promise((r) => setTimeout(r, 0));

    expect(spy.writeText).toHaveBeenCalledTimes(1);
    const text = spy.writeText.mock.calls[0][0] as string;
    expect(text).toBe('banana');
  });
});