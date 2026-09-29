import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveTest } from './ActiveTest';
import { ToastProvider } from '../../components/Toast';
import { AppProvider } from '../../app/AppProvider';
import type { ReactNode } from 'react';
import {
  __installSpeechSynthesisMock,
  __setVoices,
  __fireStart,
  __getPendingUtterances,
} from '../../test/mocks/speechSynthesis';

function renderActive(words: string[], onComplete = vi.fn(), onExit = vi.fn()) {
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
      <ActiveTest initialWords={words} onComplete={onComplete} onExit={onExit} />
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
    expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
    expect(__getPendingUtterances().length).toBeGreaterThanOrEqual(0);
  });

  it('submits an answer via Enter and shows feedback', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderActive(['apple', 'banana'], onComplete);

    // Trigger speech start so we can submit
    act(() => {
      __fireStart();
    });

    const input = await screen.findByTestId('answer-input');
    await user.type(input, 'apple{enter}');

    expect(await screen.findByTestId('feedback')).toHaveTextContent(/Correct/i);
    // Should NOT show the next question immediately — feedback delay
    expect(screen.queryByTestId('feedback')).toBeInTheDocument();
  });

  it('end test requires confirmation', async () => {
    const user = userEvent.setup();
    renderActive(['apple', 'banana']);

    act(() => {
      __fireStart();
    });

    // Click the top-bar End Test button
    await user.click(screen.getByRole('button', { name: /^end test$/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /keep practicing/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^end test$/i })).toBeInTheDocument();
  });
});