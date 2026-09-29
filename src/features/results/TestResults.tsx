import { useCallback, useMemo } from 'react';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import { Card, CardBody, CardFooter } from '../../components/Card';
import { Button } from '../../components/Button';
import { useApp } from '../../app/AppProvider';
import { useSpeechSynthesis } from '../speech/useSpeechSynthesis';
import { pickVoice } from '../speech/speechService';
import { uniqueMistakeWords } from '../test/testUtils';
import { shuffle } from '../../utils/shuffle';
import { countLabel } from '../../utils/pluralize';
import { ResultsSummary } from './ResultsSummary';
import { CorrectResults } from './CorrectResults';
import { IncorrectResults } from './IncorrectResults';
import type { TestSession } from '../test/testTypes';

interface TestResultsProps {
  session: TestSession;
}

export function TestResults({ session }: TestResultsProps) {
  const { goTo, startTest, setPracticeSource, settings } = useApp();
  const { supported, voices, speak } = useSpeechSynthesis();

  const mistakes = useMemo(() => uniqueMistakeWords(session), [session]);

  const handleSpeak = useCallback(
    (word: string) => {
      speak(word, {
        voice: pickVoice(voices, settings.voiceName, settings.language),
        lang: settings.language,
        rate: settings.speechRate,
        pitch: settings.pitch,
      });
    },
    [speak, voices, settings.voiceName, settings.language, settings.speechRate, settings.pitch],
  );

  const handleNewTest = () => {
    setPracticeSource('all');
    goTo('setup');
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardBody className="py-6 sm:py-8">
          <ResultsSummary
            session={session}
            status={session.status === 'active' ? 'completed' : session.status}
          />
        </CardBody>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mistakes.length > 0 && (
            <Button onClick={() => startTest(shuffle(mistakes))} data-testid="practice-mistakes">
              <RotateCcw size={16} aria-hidden="true" />
              Practise {countLabel(mistakes.length, 'mistake')}
            </Button>
          )}
          <Button variant={mistakes.length > 0 ? 'secondary' : 'primary'} onClick={handleNewTest}>
            <Play size={16} aria-hidden="true" />
            New test
          </Button>
          <Button variant="ghost" onClick={() => goTo('library')} className="sm:ml-auto">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to your words
          </Button>
        </CardFooter>
      </Card>

      <IncorrectResults answers={session.answers} onSpeak={supported ? handleSpeak : undefined} />
      <CorrectResults answers={session.answers} />
    </div>
  );
}
