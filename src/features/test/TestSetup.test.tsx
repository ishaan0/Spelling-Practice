import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { TestSetup } from './TestSetup';
import { ToastProvider } from '../../components/Toast';
import { AppProvider } from '../../app/AppProvider';
import type { TestRunRequest } from '../../app/AppProvider';
import {
  DEFAULT_SETTINGS,
  saveCollections,
  saveSettings,
} from '../../services/storage/storageService';

function renderSetup(onStart = vi.fn()) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <AppProvider view="setup" setView={() => {}}>
          {children}
        </AppProvider>
      </ToastProvider>
    );
  }
  render(
    <Wrapper>
      <TestSetup onStart={onStart} />
    </Wrapper>,
  );
  return onStart;
}

function seed() {
  saveCollections([
    {
      id: 'a',
      name: 'Week 1',
      words: ['apple', 'banana', 'cherry', 'grape'],
      errors: [
        { word: 'banana', misses: 1, lastMissedAt: 1 },
        { word: 'apple', misses: 2, lastMissedAt: 1 },
      ],
      createdAt: 0,
    },
    {
      id: 'b',
      name: 'Week 2',
      words: ['rhythm'],
      errors: [
        { word: 'APPLE', misses: 1, lastMissedAt: 1 },
        { word: 'rhythm', misses: 1, lastMissedAt: 1 },
      ],
      createdAt: 0,
    },
  ]);
}

function startedRun(onStart: ReturnType<typeof vi.fn>): TestRunRequest {
  expect(onStart).toHaveBeenCalledTimes(1);
  return onStart.mock.calls[0]![0] as TestRunRequest;
}

describe('TestSetup', () => {
  it('tests the active collection and records mistakes there', async () => {
    const user = userEvent.setup();
    seed();
    const onStart = renderSetup();

    await user.click(screen.getByRole('button', { name: /start test/i }));

    const run = startedRun(onStart);
    expect([...run.words].sort()).toEqual(['apple', 'banana', 'cherry', 'grape']);
    expect(run.owners.cherry).toEqual(['a']);
    expect(run.label).toBe('Week 1');
    expect(run.breakEvery).toBeNull();
  });

  it('tests the frequent errors most-missed first when not shuffling', async () => {
    const user = userEvent.setup();
    seed();
    saveSettings({ ...DEFAULT_SETTINGS, shuffle: false });
    const onStart = renderSetup();

    await user.click(screen.getByRole('radio', { name: /^frequent errors \(2\)/i }));
    await user.click(screen.getByRole('button', { name: /start test/i }));

    const run = startedRun(onStart);
    expect(run.words).toEqual(['apple', 'banana']);
    expect(run.label).toBe('Week 1 · Frequent errors');
  });

  it('tests the errors of all collections once each, sending mistakes back to each source', async () => {
    const user = userEvent.setup();
    seed();
    const onStart = renderSetup();

    await user.click(screen.getByRole('radio', { name: /errors from all collections \(3\)/i }));
    await user.click(screen.getByRole('button', { name: /start test/i }));

    const run = startedRun(onStart);
    expect([...run.words].sort()).toEqual(['apple', 'banana', 'rhythm']);
    expect(run.owners.apple).toEqual(['a', 'b']);
    expect(run.owners.rhythm).toEqual(['b']);
  });

  it('only offers the all-collections test when there is more than one collection', () => {
    saveCollections([
      {
        id: 'a',
        name: 'Only',
        words: ['apple'],
        errors: [{ word: 'apple', misses: 1, lastMissedAt: 0 }],
        createdAt: 0,
      },
    ]);
    renderSetup();
    expect(screen.queryByRole('radio', { name: /all collections/i })).not.toBeInTheDocument();
  });

  it('can practise errors even when the collection has no words left', () => {
    saveCollections([
      {
        id: 'a',
        name: 'Empty',
        words: [],
        errors: [{ word: 'apple', misses: 1, lastMissedAt: 0 }],
        createdAt: 0,
      },
    ]);
    renderSetup();
    expect(screen.getByRole('radio', { name: /frequent errors \(1\)/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /start test/i })).toBeEnabled();
  });

  it('sets up breaks every chosen number of words', async () => {
    const user = userEvent.setup();
    seed();
    const onStart = renderSetup();

    await user.click(screen.getByRole('switch', { name: /take breaks/i }));
    expect(screen.getByTestId('break-summary')).toHaveTextContent(
      'A test of 4 words ends before the first break.',
    );

    const breakChoices = screen.getByRole('radiogroup', { name: /words between breaks/i });
    await user.click(within(breakChoices).getByRole('radio', { name: 'Custom' }));
    const input = screen.getByLabelText(/custom number of words between breaks/i);
    await user.clear(input);
    expect(screen.getByRole('button', { name: /start test/i })).toBeDisabled();
    await user.type(input, '1');
    expect(screen.getByTestId('break-summary')).toHaveTextContent(
      '3 breaks, after words 1, 2 and 3.',
    );
    expect(screen.getByTestId('test-summary')).toHaveTextContent('break every 1');

    await user.click(screen.getByRole('button', { name: /start test/i }));
    expect(startedRun(onStart).breakEvery).toBe(1);
  });
});
