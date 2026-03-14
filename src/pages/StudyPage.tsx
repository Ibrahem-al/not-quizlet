import { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlashcardMode } from '../components/modes/FlashcardMode';
import { LearnMode } from '../components/modes/LearnMode';
import { MatchMode } from '../components/modes/MatchMode';
import { TestMode } from '../components/modes/TestMode';

import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui';
import { useStudySet } from '../hooks/useStudySet';
import { gameRegistry } from '../config/gameRegistry';

type Mode = 'flashcards' | 'learn' | 'match' | 'test';

function StudyError({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <p className="text-[var(--color-text-secondary)]">{message}</p>
        <Button variant="secondary" onClick={onBack}>
          Back to set
        </Button>
      </div>
    </AppLayout>
  );
}

export function StudyPage() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const navigate = useNavigate();
  const set = useStudySet(id);

  const exit = () => navigate(`/sets/${id}`);

  if (!set) {
    return <StudyError message="Set not found." onBack={() => navigate('/')} />;
  }

  const cards = set.cards;

  switch (mode as Mode) {
    case 'flashcards':
      return <FlashcardMode cards={cards} setId={set.id} onExit={exit} />;
    case 'learn':
      return <LearnMode cards={cards} setId={set.id} onExit={exit} />;
    case 'match':
      return <MatchMode cards={cards} onExit={exit} />;
    case 'test':
      return <TestMode cards={cards} setTitle={set.title} onExit={exit} />;
    default: {
      const game = gameRegistry.find(g => g.id === mode);
      if (game) {
        const GameComponent = game.component;
        return (
          <Suspense fallback={
            <AppLayout>
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            </AppLayout>
          }>
            <GameComponent cards={cards} setId={set.id} onExit={exit} />
          </Suspense>
        );
      }
      return <StudyError message="Unknown study mode." onBack={exit} />;
    }
  }
}
