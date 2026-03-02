/**
 * Collapsible right sidebar: Set settings, Import, Generate (AI), Stats.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, FileInput, Sparkles, BarChart3, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Input } from '../ui';
import { useEditorStore } from '../../stores/editorStore';
import { getAIGenerator, getAIUnavailableHint } from '../../lib/ai';
import { parseImportText } from '../../lib/importText';

const TAB_IDS = ['settings', 'import', 'generate', 'stats'] as const;
type TabId = (typeof TAB_IDS)[number];

interface AISidebarProps {
  open: boolean;
  onToggle: () => void;
  onToast?: (msg: string) => void;
}

export function AISidebar({ open, onToggle, onToast }: AISidebarProps) {
  const [tab, setTab] = useState<TabId>('settings');
  const set = useEditorStore((s) => s.set);
  const updateSetMeta = useEditorStore((s) => s.updateSetMeta);
  const addCard = useEditorStore((s) => s.addCard);
  const updateCard = useEditorStore((s) => s.updateCard);

  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<{ term: string; definition: string }[] | null>(null);
  const [generateTopic, setGenerateTopic] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  if (!set) return null;

  const handleParseImport = () => {
    const parsed = parseImportText(importText);
    setImportPreview(parsed.length > 0 ? parsed : null);
  };

  const handleConfirmImport = () => {
    if (!importPreview?.length) return;
    importPreview.forEach((p) => {
      addCard();
      const { set: s } = useEditorStore.getState();
      const last = s?.cards[s.cards.length - 1];
      if (last) updateCard(last.id, { term: p.term, definition: p.definition });
    });
    setImportText('');
    setImportPreview(null);
    onToast?.(`${importPreview.length} cards added`);
  };

  const handleGenerate = async () => {
    const topic = generateTopic.trim();
    if (!topic) return;
    setGenerateLoading(true);
    try {
      const ai = await getAIGenerator();
      const result = await ai.magicCreate(topic, 7);
      if (result?.cards.length) {
        result.cards.forEach((c) => {
          addCard();
          const cards = useEditorStore.getState().set?.cards ?? [];
          const last = cards[cards.length - 1];
          if (last) updateCard(last.id, { term: c.term, definition: c.definition });
        });
        if (result.suggestedTags?.length) updateSetMeta({ tags: result.suggestedTags });
        onToast?.('Cards generated');
        setGenerateTopic('');
      } else {
        onToast?.(`AI unavailable. ${getAIUnavailableHint()}`);
      }
    } catch (err) {
      const hint = getAIUnavailableHint();
      onToast?.(err instanceof Error ? `${err.message}. ${hint}` : `AI failed. ${hint}`);
    } finally {
      setGenerateLoading(false);
    }
  };

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'import' as const, label: 'Import', icon: FileInput },
    { id: 'generate' as const, label: 'Generate', icon: Sparkles },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  const cardCount = set.cards.length;
  const estMinutes = Math.ceil(cardCount * 0.5);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="studio-sidebar-toggle fixed right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-16 flex items-center justify-center rounded-l-lg text-[var(--color-text)]"
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
      >
        {open ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="studio-sidebar fixed right-0 top-0 bottom-0 z-20 w-[300px] flex flex-col overflow-hidden"
          >
            <div className="studio-sidebar-tabs flex">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 py-2 px-1 flex flex-col items-center gap-0.5 text-xs ${tab === id ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {tab === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-3"
                  >
                    <Input
                      label="Title"
                      value={set.title}
                      onChange={(e) => updateSetMeta({ title: e.target.value })}
                      placeholder="Set title"
                    />
                    <Input
                      label="Description"
                      value={set.description}
                      onChange={(e) => updateSetMeta({ description: e.target.value })}
                      placeholder="Description"
                    />
                    <label className="block text-sm text-[var(--color-text-secondary)]">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={set.tags.join(', ')}
                      onChange={(e) => updateSetMeta({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                      className="w-full rounded-lg border border-[var(--color-text-secondary)]/30 px-3 py-2 text-sm"
                    />
                  </motion.div>
                )}
                {tab === 'import' && (
                  <motion.div
                    key="import"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-3"
                  >
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Paste lines: &quot;term - definition&quot; or tab-separated
                    </p>
                    <textarea
                      className="w-full min-h-[120px] rounded-lg border border-[var(--color-text-secondary)]/30 px-3 py-2 text-sm"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Hola - Hello&#10;Gracias - Thank you"
                    />
                    <Button variant="secondary" onClick={handleParseImport}>
                      Preview
                    </Button>
                    {importPreview && (
                      <>
                        <p className="text-sm">{importPreview.length} cards</p>
                        <Button onClick={handleConfirmImport}>Add all</Button>
                      </>
                    )}
                  </motion.div>
                )}
                {tab === 'generate' && (
                  <motion.div
                    key="generate"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-3"
                  >
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      AI generates cards from a topic (Ollama or cloud)
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[var(--color-text-secondary)]/30 px-3 py-2 text-sm"
                      value={generateTopic}
                      onChange={(e) => setGenerateTopic(e.target.value)}
                      placeholder="e.g. Mitochondria"
                    />
                    <Button onClick={handleGenerate} disabled={generateLoading}>
                      {generateLoading ? 'Generating…' : 'Generate cards'}
                    </Button>
                  </motion.div>
                )}
                {tab === 'stats' && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="space-y-4"
                  >
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Cards</p>
                      <p className="text-2xl font-bold text-[var(--color-text)]">{cardCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Est. study time</p>
                      <p className="text-lg font-medium text-[var(--color-text)]">~{estMinutes} min</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
