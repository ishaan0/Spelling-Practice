import { describe, expect, it, vi } from 'vitest';
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
    expect(screen.getByTestId('stat-correct')).toHaveTextContent('2');
    expect(screen.getByTestId('stat-incorrect')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-accuracy')).toHaveTextContent('67%');
  });

  it('shows correct word chips', () => {
    renderResults(makeSession());
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('cherry')).toBeInTheDocument();
  });

  it('shows incorrect entries with user answer and correct spelling', () => {
    renderResults(makeSession());
    expect(screen.getByText('bannana')).toBeInTheDocument();
    // Present twice: once for screen readers, once with the letters highlighted.
    expect(screen.getAllByText('banana').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /listen to banana/i })).toBeInTheDocument();
  });

  it('starts a new test with only the missed words', async () => {
    const user = userEvent.setup();
    const setView = vi.fn();
    renderResults(makeSession(), 'results', setView);

    await user.click(screen.getByRole('button', { name: /practise 1 mistake/i }));

    expect(setView).toHaveBeenCalledWith('active', { replace: true });
  });

  it('offers no mistake practice after a perfect score', () => {
    const session = makeSession();
    session.answers = session.answers.filter((a) => a.status === 'correct');
    renderResults(session);

    expect(screen.queryByTestId('practice-mistakes')).not.toBeInTheDocument();
    expect(screen.getByText(/no mistakes/i)).toBeInTheDocument();
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