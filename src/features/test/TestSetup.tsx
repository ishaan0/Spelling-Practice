import { useEffect, useMemo, useState } from 'react';
import { Play, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { useApp } from '../../app/AppProvider';
import { useVoices } from '../../hooks/useVoices';
import { useSpeechSynthesis } from '../speech/useSpeechSynthesis';
import { useToast } from '../../components/Toast';
import {
  MAX_CUSTOM_TIMER_SECONDS,
  MAX_SPEECH_PITCH,
  MAX_SPEECH_RATE,
  MIN_CUSTOM_TIMER_SECONDS,
  MIN_SPEECH_PITCH,
  MIN_SPEECH_RATE,
  SUPPORTED_LANGUAGES,
  TEST_LENGTH_PRESETS,
  TIMER_PRESETS_SECONDS,
} from '../../utils/constants';
import { shuffle } from '../../utils/shuffle';

interface TestSetupProps {
  onStart: (selectedWords: string[]) => void;
}

export function TestSetup({ onStart }: TestSetupProps) {
  const { words, settings, setSettings, goTo } = useApp();
  const voices = useVoices();
  const speech = useSpeechSynthesis();
  const { show } = useToast();
  const [voiceOpen, setVoiceOpen] = useState(false);

  const [countMode, setCountMode] = useState<'all' | 'preset' | 'custom'>(() => {
    if (settings.questionCount === 'all') return 'all';
    if (typeof settings.questionCount === 'number' && (TEST_LENGTH_PRESETS as readonly number[]).includes(settings.questionCount)) {
      return 'preset';
    }
    return 'custom';
  });
  const [customCount, setCustomCount] = useState<string>(() =>
    typeof settings.questionCount === 'number' && !((TEST_LENGTH_PRESETS as readonly number[]).includes(settings.questionCount))
      ? String(settings.questionCount)
      : '25',
  );
  const [customSeconds, setCustomSeconds] = useState<string>('20');

  const selectedCount = useMemo(() => {
    if (countMode === 'all') return words.length;
    if (countMode === 'preset') {
      return typeof settings.questionCount === 'number' ? Math.min(settings.questionCount, words.length) : words.length;
    }
    const n = Number.parseInt(customCount, 10);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, words.length);
  }, [countMode, customCount, settings.questionCount, words.length]);

  const effectiveSecondsPerWord = useMemo(() => {
    if (!settings.timerEnabled) return 0;
    return settings.secondsPerWord;
  }, [settings.timerEnabled, settings.secondsPerWord]);

  // Resolve selected voice
  const resolvedVoice = useMemo(() => {
    if (!settings.voiceName) return null;
    const exact = voices.find((v) => v.name === settings.voiceName);
    if (exact) return exact;
    const byLang = voices.find((v) => v.lang === settings.language);
    return byLang ?? null;
  }, [voices, settings.voiceName, settings.language]);

  // Persist settings changes
  useEffect(() => {
    if (countMode === 'all') {
      if (settings.questionCount !== 'all') {
        setSettings((s) => ({ ...s, questionCount: 'all' }));
      }
    } else if (countMode === 'preset') {
      if (typeof settings.questionCount !== 'number' || !((TEST_LENGTH_PRESETS as readonly number[]).includes(settings.questionCount))) {
        setSettings((s) => ({ ...s, questionCount: 10 }));
      }
    } else {
      const n = Number.parseInt(customCount, 10);
      if (Number.isFinite(n) && n > 0 && settings.questionCount !== n) {
        setSettings((s) => ({ ...s, questionCount: n }));
      }
    }
  }, [countMode, customCount, settings.questionCount, setSettings]);

  const handleStart = () => {
    if (words.length === 0) {
      show('Add some words first.', 'error');
      return;
    }
    const chosen = shuffle(words).slice(0, selectedCount);
    onStart(chosen);
  };

  const handleTestVoice = () => {
    if (!speech.supported) {
      show("Audio pronunciation isn't available in this browser.", 'error');
      return;
    }
    speech.speak('hello', {
      voice: resolvedVoice,
      lang: settings.language,
      rate: settings.speechRate,
      pitch: settings.pitch,
    });
  };

  const validTimerSeconds = (n: number): boolean =>
    Number.isFinite(n) && n >= MIN_CUSTOM_TIMER_SECONDS && n <= MAX_CUSTOM_TIMER_SECONDS;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Configure your test</h1>
        <p className="mt-1 text-sm text-slate-600">
          Word library: {words.length} {words.length === 1 ? 'word' : 'words'}
          {selectedCount > 0 && (
            <>
              {' '}· Test length: {selectedCount} {selectedCount === 1 ? 'word' : 'words'}
            </>
          )}
        </p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-slate-900">Number of words</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Number of words">
            <ChoiceButton
              active={countMode === 'all'}
              onClick={() => setCountMode('all')}
              label={`All (${words.length})`}
            />
            {TEST_LENGTH_PRESETS.map((n) => (
              <ChoiceButton
                key={n}
                active={countMode === 'preset' && settings.questionCount === n}
                onClick={() => {
                  setCountMode('preset');
                  setSettings((s) => ({ ...s, questionCount: n }));
                }}
                label={String(n)}
                disabled={n > words.length}
              />
            ))}
            <ChoiceButton
              active={countMode === 'custom'}
              onClick={() => setCountMode('custom')}
              label="Custom"
            />
            {countMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={words.length}
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus-ring"
                  aria-label="Custom word count"
                />
              </div>
            )}
          </div>
          {selectedCount === 0 && (
            <p className="text-sm text-red-600">Please choose at least 1 word.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-slate-900">Time per word</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.timerEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, timerEnabled: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-accent-600 focus-ring"
            />
            <span className="text-sm text-slate-800">Enable per-word timer</span>
          </label>
          {settings.timerEnabled && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Seconds per word">
              {TIMER_PRESETS_SECONDS.map((s) => (
                <ChoiceButton
                  key={s}
                  active={settings.secondsPerWord === s && !countModeIsCustomTime()}
                  onClick={() => setSettings((p) => ({ ...p, secondsPerWord: s }))}
                  label={`${s}s`}
                />
              ))}
              <ChoiceButton
                active={!TIMER_PRESETS_SECONDS.includes(settings.secondsPerWord as 5 | 10 | 15 | 20 | 30)}
                onClick={() => setSettings((p) => ({ ...p, secondsPerWord: Number.parseInt(customSeconds, 10) || 20 }))}
                label="Custom"
              />
              {!TIMER_PRESETS_SECONDS.includes(settings.secondsPerWord as 5 | 10 | 15 | 20 | 30) && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={MIN_CUSTOM_TIMER_SECONDS}
                    max={MAX_CUSTOM_TIMER_SECONDS}
                    value={customSeconds}
                    onChange={(e) => {
                      setCustomSeconds(e.target.value);
                      const n = Number.parseInt(e.target.value, 10);
                      if (validTimerSeconds(n)) {
                        setSettings((p) => ({ ...p, secondsPerWord: n }));
                      }
                    }}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus-ring"
                    aria-label="Custom seconds per word"
                  />
                  <span className="text-xs text-slate-500">sec (3–300)</span>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setVoiceOpen((v) => !v)}
            className="flex items-center justify-between w-full text-left focus-ring rounded"
            aria-expanded={voiceOpen}
          >
            <h2 className="text-lg font-medium text-slate-900">Voice & pronunciation</h2>
            {voiceOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>
        </CardHeader>
        {voiceOpen && (
          <CardBody className="space-y-4">
            {!speech.supported ? (
              <p className="text-sm text-red-600">
                Audio pronunciation isn't available in this browser. Try a current version of Chrome, Edge, Safari, or another browser with speech synthesis support.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="lang">
                      Language
                    </label>
                    <select
                      id="lang"
                      value={settings.language}
                      onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus-ring"
                    >
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="voice">
                      Voice
                    </label>
                    <select
                      id="voice"
                      value={settings.voiceName ?? ''}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, voiceName: e.target.value || null }))
                      }
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus-ring"
                    >
                      <option value="">Browser default</option>
                      {voices
                        .filter((v) => v.lang.startsWith(settings.language.split('-')[0] ?? 'en'))
                        .map((v) => (
                          <option key={v.name} value={v.name}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {voices.length === 0 ? 'Loading voices…' : `${voices.length} voices available`}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="rate">
                      Speech rate: {settings.speechRate.toFixed(2)}
                    </label>
                    <input
                      id="rate"
                      type="range"
                      min={MIN_SPEECH_RATE}
                      max={MAX_SPEECH_RATE}
                      step={0.05}
                      value={settings.speechRate}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, speechRate: Number.parseFloat(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="pitch">
                      Pitch: {settings.pitch.toFixed(2)}
                    </label>
                    <input
                      id="pitch"
                      type="range"
                      min={MIN_SPEECH_PITCH}
                      max={MAX_SPEECH_PITCH}
                      step={0.05}
                      value={settings.pitch}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, pitch: Number.parseFloat(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleTestVoice}>
                    <Volume2 size={14} aria-hidden="true" className="mr-1.5" />
                    Test voice
                  </Button>
                  <p className="text-xs text-slate-500">Speaks "hello" so you can hear the chosen voice.</p>
                </div>
              </>
            )}
          </CardBody>
        )}
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button variant="ghost" onClick={() => goTo('library')}>
          Back to word library
        </Button>
        <Button
          size="lg"
          onClick={handleStart}
          disabled={words.length === 0 || selectedCount === 0}
        >
          <Play size={16} aria-hidden="true" className="mr-1.5" />
          Start test ({selectedCount} {selectedCount === 1 ? 'word' : 'words'}
          {effectiveSecondsPerWord > 0 && `, ${effectiveSecondsPerWord}s each`})
        </Button>
      </div>
    </div>
  );

  function countModeIsCustomTime(): boolean {
    return !(TIMER_PRESETS_SECONDS as readonly number[]).includes(settings.secondsPerWord);
  }
}

function ChoiceButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`h-9 px-3 rounded-md text-sm font-medium border transition-colors focus-ring ${
        active
          ? 'bg-accent-600 text-white border-accent-600'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}