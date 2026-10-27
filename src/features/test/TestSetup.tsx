import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronDown, Play, TriangleAlert, Volume2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Choice, ChoiceGroup } from '../../components/ChoiceGroup';
import { EmptyState } from '../../components/EmptyState';
import { Switch } from '../../components/Switch';
import { useApp, type PracticeSource, type TestRunRequest } from '../../app/AppProvider';
import { useSpeechSynthesis } from '../speech/useSpeechSynthesis';
import { pickVoice, voiceMatchesLanguage } from '../speech/speechService';
import {
  BREAK_PRESETS,
  DEFAULT_SPEECH_PITCH,
  DEFAULT_SPEECH_RATE,
  MAX_CUSTOM_TIMER_SECONDS,
  MAX_SPEECH_PITCH,
  MAX_SPEECH_RATE,
  MAX_WORDS,
  MIN_CUSTOM_TIMER_SECONDS,
  MIN_SPEECH_PITCH,
  MIN_SPEECH_RATE,
  SUPPORTED_LANGUAGES,
  TEST_LENGTH_PRESETS,
  TIMER_PRESETS_SECONDS,
} from '../../utils/constants';
import { countLabel } from '../../utils/pluralize';
import { shuffle } from '../../utils/shuffle';
import { countBreaks, formatDuration } from './testUtils';
import {
  collectGlobalErrors,
  ownersFor,
  ownersForGlobalErrors,
  sortErrors,
} from '../collections/collectionUtils';

interface TestSetupProps {
  onStart: (run: TestRunRequest) => void;
}

const SOURCES: readonly PracticeSource[] = ['all', 'errors', 'global-errors'];

// Rough time to hear, type and review one word when there is no time limit.
const UNTIMED_SECONDS_PER_WORD = 12;
const VOICE_LOAD_GRACE_MS = 2000;

function parseWholeNumber(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  return Number.parseInt(text, 10);
}

function isTimerPreset(seconds: number): boolean {
  return (TIMER_PRESETS_SECONDS as readonly number[]).includes(seconds);
}

function isBreakPreset(words: number): boolean {
  return (BREAK_PRESETS as readonly number[]).includes(words);
}

/** `30, 3` → `after words 30, 60 and 90`; long lists are shortened. */
function describeBreaks(breakEvery: number, count: number): string {
  const at = (n: number) => (n * breakEvery).toLocaleString();
  if (count === 1) return `after word ${at(1)}`;
  if (count <= 4) {
    const all = Array.from({ length: count }, (_, i) => at(i + 1));
    return `after words ${all.slice(0, -1).join(', ')} and ${all[all.length - 1]}`;
  }
  return `after words ${at(1)}, ${at(2)}, ${at(3)} … ${at(count)}`;
}

export function TestSetup({ onStart }: TestSetupProps) {
  const {
    collections,
    activeCollection,
    settings,
    setSettings,
    goTo,
    practiceSource,
    setPracticeSource,
  } = useApp();
  const speech = useSpeechSynthesis();
  const { voices } = speech;

  // ----- Which words -----
  const errorWords = useMemo(
    () => sortErrors(activeCollection.errors).map((e) => e.word),
    [activeCollection.errors],
  );
  const globalErrors = useMemo(() => collectGlobalErrors(collections), [collections]);
  const pools = useMemo<Record<PracticeSource, string[]>>(
    () => ({
      all: activeCollection.words,
      // Most-missed first, so an unshuffled shorter test takes the worst ones.
      errors: errorWords,
      'global-errors': globalErrors.map((e) => e.word),
    }),
    [activeCollection.words, errorWords, globalErrors],
  );
  // With one collection, "all collections" would be the same list twice.
  const sources = SOURCES.filter(
    (s) => pools[s].length > 0 && (s !== 'global-errors' || collections.length > 1),
  );
  const source: PracticeSource = sources.includes(practiceSource)
    ? practiceSource
    : (sources[0] ?? 'all');
  const pool = pools[source];
  const available = pool.length;

  // ----- How many -----
  const presets = TEST_LENGTH_PRESETS.filter((n) => n < available);
  const savedCount = settings.questionCount;
  const [customCount, setCustomCount] = useState(
    () =>
      savedCount !== 'all' &&
      savedCount <= available &&
      !(TEST_LENGTH_PRESETS as readonly number[]).includes(savedCount),
  );
  const [customCountText, setCustomCountText] = useState(() =>
    savedCount === 'all' ? '' : String(savedCount),
  );
  const customCountValue = parseWholeNumber(customCountText);
  const customCountValid =
    customCountValue !== null && customCountValue >= 1 && customCountValue <= available;

  const selectedCount = customCount
    ? customCountValid
      ? (customCountValue ?? 0)
      : 0
    : savedCount === 'all'
      ? available
      : Math.min(savedCount, available);

  // ----- Time limit -----
  const [customTimer, setCustomTimer] = useState(() => !isTimerPreset(settings.secondsPerWord));
  const [customTimerText, setCustomTimerText] = useState(() => String(settings.secondsPerWord));
  const customTimerValue = parseWholeNumber(customTimerText);
  const customTimerValid =
    customTimerValue !== null &&
    customTimerValue >= MIN_CUSTOM_TIMER_SECONDS &&
    customTimerValue <= MAX_CUSTOM_TIMER_SECONDS;
  const timerInvalid = settings.timerEnabled && customTimer && !customTimerValid;

  // ----- Breaks -----
  const [customBreak, setCustomBreak] = useState(() => !isBreakPreset(settings.wordsPerBreak));
  const [customBreakText, setCustomBreakText] = useState(() => String(settings.wordsPerBreak));
  const customBreakValue = parseWholeNumber(customBreakText);
  const customBreakValid =
    customBreakValue !== null && customBreakValue >= 1 && customBreakValue <= MAX_WORDS;
  const breakInvalid = settings.breaksEnabled && customBreak && !customBreakValid;
  const breakEvery = settings.breaksEnabled ? settings.wordsPerBreak : null;
  const breakCount = countBreaks(selectedCount, breakEvery);

  // ----- Voice -----
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voicesSettled, setVoicesSettled] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVoicesSettled(true), VOICE_LOAD_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const languageVoices = useMemo(
    () => voices.filter((v) => voiceMatchesLanguage(v, settings.language)),
    [voices, settings.language],
  );
  const resolvedVoice = useMemo(
    () => pickVoice(voices, settings.voiceName, settings.language),
    [voices, settings.voiceName, settings.language],
  );
  const chosenVoiceAvailable =
    settings.voiceName !== null && voices.some((v) => v.name === settings.voiceName);
  const languageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language)?.label ?? settings.language;
  const noVoices = speech.supported && voicesSettled && voices.length === 0;

  const handleTestVoice = () => {
    speech.speak('This is how your words will sound.', {
      voice: resolvedVoice,
      lang: settings.language,
      rate: settings.speechRate,
      pitch: settings.pitch,
    });
  };

  const canStart = speech.supported && selectedCount > 0 && !timerInvalid && !breakInvalid;

  const sourceLabel =
    source === 'global-errors'
      ? 'Frequent errors · All collections'
      : source === 'errors'
        ? `${activeCollection.name} · Frequent errors`
        : activeCollection.name;

  const handleStart = () => {
    if (!canStart) return;
    const ordered = settings.shuffle ? shuffle(pool) : pool;
    // Without shuffling, a shorter test takes the first words of the list.
    const testWords = ordered.slice(0, selectedCount);
    onStart({
      words: testWords,
      breakEvery: breakCount > 0 ? breakEvery : null,
      // Mistakes go back to the collection(s) the words came from.
      owners:
        source === 'global-errors'
          ? ownersForGlobalErrors(globalErrors)
          : ownersFor(testWords, activeCollection.id),
      label: sourceLabel,
    });
  };

  if (sources.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl">
        <EmptyState
          title="Add some words first"
          description={`“${activeCollection.name}” has no words yet. Add at least one before you start a test.`}
          action={<Button onClick={() => goTo('library')}>Go to your words</Button>}
        />
      </Card>
    );
  }

  const secondsPerWord = settings.timerEnabled ? settings.secondsPerWord : UNTIMED_SECONDS_PER_WORD;
  const estimate = formatDuration(selectedCount * secondsPerWord * 1000).replace(/ 0s$/, '');

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <button
          type="button"
          onClick={() => goTo('library')}
          className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 text-sm font-medium text-slate-500 hover:text-slate-900 focus-ring"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Your words
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set up your test</h1>
        <p className="mt-1 text-sm text-slate-600">
          Each word is read aloud — type what you hear. Your choices are remembered for next time.
        </p>
      </header>

      {!speech.supported && (
        <Notice>
          This browser can't read words aloud, so tests can't run here. Try a current version of
          Chrome, Edge or Safari.
        </Notice>
      )}
      {noVoices && (
        <Notice>
          No voices were found on this device, so you may not hear anything. Use “Test voice” below
          to check before you start.
        </Notice>
      )}

      <Card className="divide-y divide-slate-100">
        <Row
          title="Words"
          hint={
            source === 'global-errors'
              ? 'Every collection’s frequent errors, each word once.'
              : `From “${activeCollection.name}”.`
          }
        >
          <ChoiceGroup label="Words to practise">
            {sources.includes('all') && (
              <Choice active={source === 'all'} onSelect={() => setPracticeSource('all')}>
                All words ({pools.all.length.toLocaleString()})
              </Choice>
            )}
            {sources.includes('errors') && (
              <Choice active={source === 'errors'} onSelect={() => setPracticeSource('errors')}>
                Frequent errors ({pools.errors.length.toLocaleString()})
              </Choice>
            )}
            {sources.includes('global-errors') && (
              <Choice
                active={source === 'global-errors'}
                onSelect={() => setPracticeSource('global-errors')}
              >
                Errors from all collections ({pools['global-errors'].length.toLocaleString()})
              </Choice>
            )}
          </ChoiceGroup>
        </Row>

        <Row title="Number of words" hint={`${countLabel(available, 'word')} available.`}>
          <ChoiceGroup label="Number of words">
            {presets.map((n) => (
              <Choice
                key={n}
                active={!customCount && selectedCount === n}
                onSelect={() => {
                  setCustomCount(false);
                  setSettings((s) => ({ ...s, questionCount: n }));
                }}
              >
                {n}
              </Choice>
            ))}
            <Choice
              active={!customCount && selectedCount === available}
              onSelect={() => {
                setCustomCount(false);
                setSettings((s) => ({ ...s, questionCount: 'all' }));
              }}
            >
              All ({available.toLocaleString()})
            </Choice>
            <Choice
              active={customCount}
              onSelect={() => {
                setCustomCount(true);
                if (customCountText === '') setCustomCountText(String(selectedCount));
              }}
            >
              Custom
            </Choice>
            {customCount && (
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={available}
                value={customCountText}
                autoFocus
                onChange={(e) => {
                  setCustomCountText(e.target.value);
                  const n = parseWholeNumber(e.target.value);
                  if (n !== null && n >= 1 && n <= available) {
                    setSettings((s) => ({ ...s, questionCount: n }));
                  }
                }}
                aria-label="Custom number of words"
                aria-invalid={!customCountValid}
                className={`field h-9 w-20 text-center tabular-nums ${customCountValid ? '' : 'field-invalid'}`}
              />
            )}
          </ChoiceGroup>
          {customCount && !customCountValid && (
            <FieldError>
              {available === 1
                ? 'Only 1 word is available.'
                : `Enter a number from 1 to ${available.toLocaleString()}.`}
            </FieldError>
          )}
          <label className="mt-4 flex w-fit cursor-pointer items-center gap-3">
            <Switch
              checked={settings.shuffle}
              onChange={(shuffleOn) => setSettings((s) => ({ ...s, shuffle: shuffleOn }))}
              label="Shuffle the words"
            />
            <span className="text-sm text-slate-700">Shuffle the words</span>
          </label>
        </Row>

        <Row title="Time limit" hint="Counts down once the word has been read out.">
          <label className="flex w-fit cursor-pointer items-center gap-3">
            <Switch
              checked={settings.timerEnabled}
              onChange={(timerEnabled) => setSettings((s) => ({ ...s, timerEnabled }))}
              label="Limit the time for each word"
            />
            <span className="text-sm text-slate-700">
              {settings.timerEnabled ? 'Limit the time for each word' : 'No time limit'}
            </span>
          </label>
          {settings.timerEnabled && (
            <div className="mt-4">
              <ChoiceGroup label="Seconds per word">
                {TIMER_PRESETS_SECONDS.map((s) => (
                  <Choice
                    key={s}
                    active={!customTimer && settings.secondsPerWord === s}
                    onSelect={() => {
                      setCustomTimer(false);
                      setSettings((p) => ({ ...p, secondsPerWord: s }));
                    }}
                  >
                    {s}s
                  </Choice>
                ))}
                <Choice
                  active={customTimer}
                  onSelect={() => {
                    setCustomTimer(true);
                    setCustomTimerText(String(settings.secondsPerWord));
                  }}
                >
                  Custom
                </Choice>
                {customTimer && (
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={MIN_CUSTOM_TIMER_SECONDS}
                      max={MAX_CUSTOM_TIMER_SECONDS}
                      value={customTimerText}
                      autoFocus
                      onChange={(e) => {
                        setCustomTimerText(e.target.value);
                        const n = parseWholeNumber(e.target.value);
                        if (
                          n !== null &&
                          n >= MIN_CUSTOM_TIMER_SECONDS &&
                          n <= MAX_CUSTOM_TIMER_SECONDS
                        ) {
                          setSettings((p) => ({ ...p, secondsPerWord: n }));
                        }
                      }}
                      aria-label="Custom seconds per word"
                      aria-invalid={!customTimerValid}
                      className={`field h-9 w-20 text-center tabular-nums ${customTimerValid ? '' : 'field-invalid'}`}
                    />
                    <span className="text-sm text-slate-500">seconds</span>
                  </span>
                )}
              </ChoiceGroup>
              {customTimer && !customTimerValid && (
                <FieldError>
                  Enter a number from {MIN_CUSTOM_TIMER_SECONDS} to {MAX_CUSTOM_TIMER_SECONDS}.
                </FieldError>
              )}
            </div>
          )}
        </Row>

        <Row title="Breaks" hint="Stop after a set number of words, then carry on or finish.">
          <label className="flex w-fit cursor-pointer items-center gap-3">
            <Switch
              checked={settings.breaksEnabled}
              onChange={(breaksEnabled) => setSettings((s) => ({ ...s, breaksEnabled }))}
              label="Take breaks during the test"
            />
            <span className="text-sm text-slate-700">
              {settings.breaksEnabled ? 'Take a break every' : 'No breaks'}
            </span>
          </label>
          {settings.breaksEnabled && (
            <div className="mt-4">
              <ChoiceGroup label="Words between breaks">
                {BREAK_PRESETS.map((n) => (
                  <Choice
                    key={n}
                    active={!customBreak && settings.wordsPerBreak === n}
                    onSelect={() => {
                      setCustomBreak(false);
                      setSettings((p) => ({ ...p, wordsPerBreak: n }));
                    }}
                  >
                    {n} words
                  </Choice>
                ))}
                <Choice
                  active={customBreak}
                  onSelect={() => {
                    setCustomBreak(true);
                    setCustomBreakText(String(settings.wordsPerBreak));
                  }}
                >
                  Custom
                </Choice>
                {customBreak && (
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_WORDS}
                      value={customBreakText}
                      autoFocus
                      onChange={(e) => {
                        setCustomBreakText(e.target.value);
                        const n = parseWholeNumber(e.target.value);
                        if (n !== null && n >= 1 && n <= MAX_WORDS) {
                          setSettings((p) => ({ ...p, wordsPerBreak: n }));
                        }
                      }}
                      aria-label="Custom number of words between breaks"
                      aria-invalid={!customBreakValid}
                      className={`field h-9 w-20 text-center tabular-nums ${customBreakValid ? '' : 'field-invalid'}`}
                    />
                    <span className="text-sm text-slate-500">words</span>
                  </span>
                )}
              </ChoiceGroup>
              {customBreak && !customBreakValid ? (
                <FieldError>Enter a number from 1 to {MAX_WORDS.toLocaleString()}.</FieldError>
              ) : (
                selectedCount > 0 && (
                  <p className="mt-2 text-xs text-slate-500" data-testid="break-summary">
                    {breakCount === 0
                      ? `A test of ${countLabel(selectedCount, 'word')} ends before the first break.`
                      : `${countLabel(breakCount, 'break')}, ${describeBreaks(settings.wordsPerBreak, breakCount)}.`}
                  </p>
                )
              )}
            </div>
          )}
        </Row>

        <Row title="Voice" hint="How the words are read to you.">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-sm text-slate-700">
              <span className="font-medium text-slate-900">{languageLabel}</span>
              {' · '}
              {chosenVoiceAvailable ? settings.voiceName : 'Automatic voice'}
              {' · '}
              {settings.speechRate.toFixed(2).replace(/\.?0+$/, '')}× speed
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestVoice}
                disabled={!speech.supported}
              >
                <Volume2 size={15} aria-hidden="true" />
                Test voice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVoiceOpen((v) => !v)}
                aria-expanded={voiceOpen}
                aria-controls="voice-options"
                disabled={!speech.supported}
              >
                {voiceOpen ? 'Hide options' : 'Change'}
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={`transition-transform ${voiceOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </div>
          </div>

          {voiceOpen && speech.supported && (
            <div id="voice-options" className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="lang">
                  Accent
                </label>
                <select
                  id="lang"
                  value={settings.language}
                  onChange={(e) =>
                    // A voice belongs to one accent, so go back to the automatic choice.
                    setSettings((s) => ({ ...s, language: e.target.value, voiceName: null }))
                  }
                  className="field h-10"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="voice">
                  Voice
                </label>
                <select
                  id="voice"
                  value={chosenVoiceAvailable ? (settings.voiceName ?? '') : ''}
                  onChange={(e) => setSettings((s) => ({ ...s, voiceName: e.target.value || null }))}
                  className="field h-10"
                >
                  <option value="">
                    Automatic{resolvedVoice ? ` (${resolvedVoice.name})` : ''}
                  </option>
                  {languageVoices.map((v) => (
                    <option key={`${v.name}|${v.lang}`} value={v.name}>
                      {v.name} ({v.lang.replace('_', '-')})
                    </option>
                  ))}
                </select>
                {voices.length === 0 && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {voicesSettled ? 'No voices found on this device.' : 'Loading voices…'}
                  </p>
                )}
              </div>

              <Slider
                id="rate"
                label="Speed"
                value={settings.speechRate}
                display={`${settings.speechRate.toFixed(2)}×`}
                min={MIN_SPEECH_RATE}
                max={MAX_SPEECH_RATE}
                onChange={(speechRate) => setSettings((s) => ({ ...s, speechRate }))}
              />
              <Slider
                id="pitch"
                label="Pitch"
                value={settings.pitch}
                display={settings.pitch.toFixed(2)}
                min={MIN_SPEECH_PITCH}
                max={MAX_SPEECH_PITCH}
                onChange={(pitch) => setSettings((s) => ({ ...s, pitch }))}
              />

              {(settings.speechRate !== DEFAULT_SPEECH_RATE ||
                settings.pitch !== DEFAULT_SPEECH_PITCH) && (
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        speechRate: DEFAULT_SPEECH_RATE,
                        pitch: DEFAULT_SPEECH_PITCH,
                      }))
                    }
                    className="rounded-md text-sm font-medium text-accent-700 hover:underline focus-ring"
                  >
                    Reset speed and pitch
                  </button>
                </div>
              )}
            </div>
          )}
        </Row>

        <div className="flex flex-col gap-3 rounded-b-2xl bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-600" data-testid="test-summary">
            {selectedCount > 0 ? (
              <>
                <span className="font-semibold text-slate-900">
                  {countLabel(selectedCount, 'word')}
                </span>
                {' · '}
                {settings.timerEnabled ? `${settings.secondsPerWord}s each` : 'no time limit'}
                {breakCount > 0 && ` · break every ${settings.wordsPerBreak.toLocaleString()}`}
                {' · '}about {estimate}
              </>
            ) : (
              'Choose how many words to practise.'
            )}
          </p>
          <Button size="lg" onClick={handleStart} disabled={!canStart}>
            <Play size={18} aria-hidden="true" />
            Start test
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:px-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-2 text-sm text-red-600">
      {children}
    </p>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-700" htmlFor={id}>
          {label}
        </label>
        <span className="text-sm tabular-nums text-slate-500">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
