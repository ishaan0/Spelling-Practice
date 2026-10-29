import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveTest } from './ActiveTest';
import { ToastProvider } from '../../components/Toast';
import { AppProvider } from '../../app/AppProvider';
import { DEFAULT_SETTINGS, saveSettings } from '../../services/storage/storageService';
import type { ReactNode } from 'react';
import type { TestSession } from './testTypes';
import {
  __installSpeechSynthesisMock,
  __setVoices,
  __fireStart,
  __getPendingUtterances,
} from '../../test/mocks/speechSynthesis';

function renderActive(
  words: string[],
  onComplete = vi.fn(),
  onExit = vi.fn(),
  breakEvery: number | null = null,
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <AppProvider view="active" setView={() => {}}>
          {children}
        </AppProvider>
      </ToastProvider>
    );
  }
  return render(
    <Wrapper>
      <ActiveTest
        initialWords={words}
        breakEvery={breakEvery}
        onComplete={onComplete}
        onExit={onExit}
      />
    </Wrapper>,
  );
}

describe('ActiveTest integration', () => {
  beforeEach(() => {
    __installSpeechSynthesisMock();
    __setVoices([
      { name: 'Alex', lang: 'en-US', localService: true, default: true, voiceURI: 'Alex' },
    ] as unknown as SpeechSynthesisVoice[]);
  });

  it('renders the first question prompt and queues the first word for speech', async () => {
    renderActive(['apple', 'banana']);
    expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();
    expect(__getPendingUtterances().map((u) => u.text)).toEqual(['apple']);
  });

  it('submits an answer via Enter and shows feedback', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    act(() => {
      __fireStart();
    });

    await user.type(screen.getByTestId('answer-input'), 'apple{enter}');

    expect(await screen.findByTestId('feedback')).toHaveTextContent(/Correct/i);
  });

  it('accepts typing before the audio has started', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    // No speech start event has been fired.
    await user.type(screen.getByTestId('answer-input'), 'apple{enter}');

    expect(await screen.findByTestId('feedback')).toHaveTextContent(/Correct/i);
  });

  it('does not show an audio error when speech is cut short by answering', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    const utterance = __getPendingUtterances()[0] as unknown as {
      onstart: () => void;
      onerror: (e: { error: string }) => void;
    };
    act(() => utterance.onstart());
    await user.type(screen.getByTestId('answer-input'), 'apple{enter}');
    act(() => utterance.onerror({ error: 'interrupted' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('waits on a wrong answer, shows the correction and continues with Enter', async () => {
    const user = userEvent.setup();
    renderActive(['banana', 'apple']);

    const input = screen.getByTestId('answer-input');
    await user.type(input, 'bannana{enter}');

    const feedback = await screen.findByTestId('feedback');
    expect(feedback).toHaveTextContent(/Not quite/i);
    expect(feedback).toHaveTextContent('banana');
    expect(feedback).toHaveTextContent('bannana');

    // Still on the same question until the user moves on.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/Question 1 of 2/i)).toBeInTheDocument();

    await user.type(input, '{enter}');
    expect(screen.getByText(/Question 2 of 2/i)).toBeInTheDocument();
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('replays the word when Enter is pressed on an empty answer', async () => {
    const user = userEvent.setup();
    renderActive(['apple']);
    const synth = window.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    const before = synth.speak.mock.calls.length;

    await user.type(screen.getByTestId('answer-input'), '{enter}');

    expect(synth.speak.mock.calls.length).toBe(before + 1);
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument();
  });

  it('lets the user skip a word they do not know', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    await user.click(screen.getByRole('button', { name: /i don't know/i }));

    const feedback = await screen.findByTestId('feedback');
    expect(feedback).toHaveTextContent(/Skipped/i);
    expect(feedback).toHaveTextContent('apple');
  });

  it('keeps the keyboard working after a button was clicked', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    await user.click(screen.getByRole('button', { name: /i don't know/i }));
    expect(screen.getByTestId('answer-input')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByText(/Question 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByTestId('answer-input')).toHaveFocus();
  });

  it('reports the finished session', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderActive(['apple', 'banana'], onComplete);

    const input = screen.getByTestId('answer-input');
    await user.type(input, 'aple{enter}');
    await user.click(screen.getByRole('button', { name: /next word/i }));
    await user.type(input, 'banana{enter}');
    await user.type(input, '{enter}');

    expect(onComplete).toHaveBeenCalledTimes(1);
    const session = onComplete.mock.calls[0]![0] as TestSession;
    expect(session.status).toBe('completed');
    expect(session.answers.map((a) => a.status)).toEqual(['incorrect', 'correct']);
  });

  it('end test requires confirmation', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    await user.click(screen.getByRole('button', { name: /^end test$/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /keep practicing/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^end test$/i })).toBeInTheDocument();
  });

  it('ending before answering anything leaves without results', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onExit = vi.fn();
    renderActive(['apple', 'banana'], onComplete, onExit);

    await user.click(screen.getByRole('button', { name: /^end test$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^end test$/i }));

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ending early reports the answers given so far', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderActive(['apple', 'banana', 'cherry'], onComplete);

    await user.type(screen.getByTestId('answer-input'), 'aple{enter}');
    await user.click(screen.getByRole('button', { name: /^end test$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^end test$/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const session = onComplete.mock.calls[0]![0] as TestSession;
    expect(session.status).toBe('ended-early');
    expect(session.answers).toHaveLength(1);
  });
});

describe('ActiveTest breaks', () => {
  beforeEach(() => {
    __installSpeechSynthesisMock();
  });

  async function answerWrong(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByTestId('answer-input'), 'zzz{enter}');
  }

  it('offers a break after the chosen number of words, then continues', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana', 'cherry'], vi.fn(), vi.fn(), 2);

    await answerWrong(user);
    await user.click(screen.getByRole('button', { name: /next word/i }));
    await answerWrong(user);
    await user.click(screen.getByRole('button', { name: /take a break/i }));

    const pause = screen.getByTestId('test-break');
    expect(pause).toHaveTextContent(/done 2 of 3 words — 1 to go/i);
    expect(screen.queryByTestId('answer-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('continue-btn')).toHaveFocus();

    const synth = window.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    const before = synth.speak.mock.calls.length;
    await user.keyboard('{Enter}');

    expect(screen.queryByTestId('test-break')).not.toBeInTheDocument();
    expect(screen.getByText(/Question 3 of 3/i)).toBeInTheDocument();
    // Speech starts a moment later, after the previous word is cancelled.
    await waitFor(() => expect(synth.speak.mock.calls.length).toBe(before + 1));
    expect(screen.getByTestId('answer-input')).toHaveFocus();
  });

  it('can finish at a break with the words answered so far', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderActive(['apple', 'banana', 'cherry'], onComplete, vi.fn(), 1);

    await user.type(screen.getByTestId('answer-input'), 'apple{enter}');
    await screen.findByTestId('test-break');
    await user.click(screen.getByTestId('finish-at-break'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const session = onComplete.mock.calls[0]![0] as TestSession;
    expect(session.status).toBe('ended-early');
    expect(session.answers.map((a) => a.word)).toEqual(['apple']);
  });
});

describe('ActiveTest timing', () => {
  beforeEach(() => {
    __installSpeechSynthesisMock();
    saveSettings({ ...DEFAULT_SETTINGS, timerEnabled: true, secondsPerWord: 5 });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the timer even when the browser never starts speaking', () => {
    renderActive(['apple', 'banana']);

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/audio didn't start/i);

    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.getByTestId('feedback')).toHaveTextContent(/Time's up/i);
  });

  it('marks what was typed when time runs out', () => {
    renderActive(['apple', 'banana']);
    act(() => {
      __fireStart();
    });

    fireEvent.change(screen.getByTestId('answer-input'), { target: { value: 'apple' } });
    act(() => {
      vi.advanceTimersByTime(5100);
    });

    expect(screen.getByTestId('feedback')).toHaveTextContent(/Correct/i);
  });

  it('pauses the timer while the end-test dialog is open', () => {
    renderActive(['apple', 'banana']);
    act(() => {
      __fireStart();
    });

    fireEvent.click(screen.getByRole('button', { name: /^end test$/i }));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.queryByTestId('feedback')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /keep practicing/i }));
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.getByTestId('feedback')).toHaveTextContent(/Time's up/i);
  });
});
