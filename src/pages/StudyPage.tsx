import { useParams, useNavigate } from 'react-router-dom';
import { FlashcardMode } from '../components/modes/FlashcardMode';
import { LearnMode } from '../components/modes/LearnMode';
import { MatchMode } from '../components/modes/MatchMode';
import { TestMode } from '../components/modes/TestMode';
import { useStudySet } from '../hooks/useStudySet';

type Mode = 'flashcards' | 'learn' | 'match' | 'test';

export function StudyPage() {
  const { id, mode } = useParams<{ id: string; mode: string }>();
  const navigate = useNavigate();
  const set = useStudySet(id);

  const exit = () => navigate(`/sets/${id}`);

  if (!set) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">Set not found.</p>
      </div>
    );
  }

  const cards = set.cards;

  switch (mode as Mode) {
    case 'flashcards':
      return (
        <FlashcardMode cards={cards} setId={set.id} onExit={exit} />
      );
    case 'learn':
      return <LearnMode cards={cards} setId={set.id} onExit={exit} />;
    case 'match':
      return <MatchMode cards={cards} onExit={exit} />;
    case 'test':
      return (
        <TestMode
          cards={cards}
          setTitle={set.title}
          onExit={exit}
        />
      );
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[var(--color-text-secondary)]">Unknown mode.</p>
          <button type="button" onClick={exit}>
            Back
          </button>
        </div>
      );
  }
}
