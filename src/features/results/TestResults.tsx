import { RefreshCw, Plus, Library } from 'lucide-react';
import { Card, CardBody, CardFooter } from '../../components/Card';
import { Button } from '../../components/Button';
import { useApp } from '../../app/AppProvider';
import { useToast } from '../../components/Toast';
import { ResultsSummary } from './ResultsSummary';
import { CorrectResults } from './CorrectResults';
import { IncorrectResults } from './IncorrectResults';
import type { TestSession } from '../test/testTypes';

interface TestResultsProps {
  session: TestSession;
}

export function TestResults({ session }: TestResultsProps) {
  const { goTo, setWords, mistakeWords, setMistakeWords } = useApp();
  const { show } = useToast();

  const handlePracticeMistakes = () => {
    if (mistakeWords.length === 0) {
      show('No mistakes to practice — perfect score!', 'info');
      return;
    }
    setWords((prev) => {
      const existing = new Set(prev.map((w) => w.toLowerCase()));
      const additions = mistakeWords.filter((w) => !existing.has(w.toLowerCase()));
      return [...prev, ...additions];
    });
    setMistakeWords([]);
    goTo('setup');
    show(`Added ${mistakeWords.length} missed ${mistakeWords.length === 1 ? 'word' : 'words'} to your library`, 'success');
  };

  const handleNewTest = () => {
    goTo('setup');
  };

  const handleBackToLibrary = () => {
    goTo('library');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <ResultsSummary session={session} status={session.status === 'active' ? 'completed' : session.status} />
        </CardBody>
        <CardFooter className="flex flex-col sm:flex-row sm:flex-wrap gap-2 justify-end">
          {mistakeWords.length > 0 && (
            <Button onClick={handlePracticeMistakes}>
              <RefreshCw size={16} aria-hidden="true" className="mr-1.5" />
              Practice mistakes again
            </Button>
          )}
          <Button variant="secondary" onClick={handleNewTest}>
            <Plus size={16} aria-hidden="true" className="mr-1.5" />
            New test
          </Button>
          <Button variant="ghost" onClick={handleBackToLibrary}>
            <Library size={16} aria-hidden="true" className="mr-1.5" />
            Back to word library
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CorrectResults answers={session.answers} />
        <IncorrectResults answers={session.answers} />
      </div>
    </div>
  );
}