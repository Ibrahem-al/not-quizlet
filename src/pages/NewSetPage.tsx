import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { AppLayout } from '../components/layout/AppLayout';
import { useStudyStore } from '../stores/studyStore';
import { getAIGenerator, getAIUnavailableHint } from '../lib/ai';
import { uuid } from '../lib/utils';
import type { Card } from '../types';

export function NewSetPage() {
  const navigate = useNavigate();
  const addSet = useStudyStore((s) => s.addSet);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [magicTopic, setMagicTopic] = useState('');
  const [magicExpanded, setMagicExpanded] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setMagicError(null);
    try {
      const set = await addSet({
        title: title.trim() || 'Untitled Set',
        description: description.trim(),
      });
      navigate(`/sets/${set.id}`);
    } finally {
      setCreating(false);
    }
  };

  const handleMagicCreate = async () => {
    const topic = magicTopic.trim();
    if (!topic) return;
    setMagicLoading(true);
    setMagicError(null);
    try {
      const ai = await getAIGenerator();
      const result = await ai.magicCreate(topic, 7);
      if (result && result.cards.length > 0) {
        const cards: Card[] = result.cards.map((c) => ({
          id: uuid(),
          term: c.term,
          definition: c.definition,
          difficulty: 0,
          repetition: 0,
          interval: 0,
          efFactor: 2.5,
          nextReviewDate: 0,
          history: [],
        }));
        const set = await addSet({
          title: topic,
          description: result.suggestedTags?.length ? `Tags: ${result.suggestedTags.join(', ')}` : '',
          tags: result.suggestedTags ?? [],
          cards,
        });
        navigate(`/sets/${set.id}`);
      } else {
        setMagicError(`AI unavailable or returned no cards. ${getAIUnavailableHint()}`);
      }
    } catch (err) {
      const hint = getAIUnavailableHint();
      setMagicError(err instanceof Error ? `${err.message}. ${hint}` : `AI failed. ${hint}`);
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'New set' }]}>
      <div className="max-w-lg">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-6">
          Create new set
        </h1>
        <div className="space-y-4">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Set title"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </div>

          <div className="border-t border-[var(--color-border)] pt-6 mt-6">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors rounded-[var(--radius-sm)] py-1 -my-1 px-1 -mx-1"
              onClick={() => setMagicExpanded((e) => !e)}
              aria-expanded={magicExpanded}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              Create with AI (Magic Create)
            </button>
            {magicExpanded && (
              <div className="mt-4 space-y-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-primary-muted)]/30 border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Enter a topic; AI will generate flashcards (requires Ollama or cloud AI).
                </p>
                <Input
                  placeholder="e.g. Mitochondria, World War 2"
                  value={magicTopic}
                  onChange={(e) => setMagicTopic(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleMagicCreate}
                  disabled={magicLoading || !magicTopic.trim()}
                >
                  {magicLoading ? 'Generating…' : 'Generate set'}
                </Button>
                {magicError && (
                  <p className="text-sm text-[var(--color-danger)]" role="alert">
                    {magicError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
