import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Gamepad2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { gameRegistry, gameCategories, type GameCategory } from '../../config/gameRegistry';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface GamesBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  setId: string;
  cardCount: number;
}

export function GamesBrowserModal({ isOpen, onClose, setId, cardCount }: GamesBrowserModalProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<GameCategory | 'all'>('all');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus restore
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => { previouslyFocused?.focus(); };
  }, [isOpen]);

  // Categories that actually have games
  const availableCategories = useMemo(() => {
    const cats = new Set(gameRegistry.map(g => g.category));
    return (Object.keys(gameCategories) as GameCategory[]).filter(c => cats.has(c));
  }, []);

  // Filtered games
  const filteredGames = useMemo(() => {
    const q = search.toLowerCase().trim();
    return gameRegistry.filter(game => {
      if (activeCategory !== 'all' && game.category !== activeCategory) return false;
      if (!q) return true;
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [search, activeCategory]);

  const handleGameClick = (gameId: string) => {
    onClose();
    navigate(`/sets/${setId}/study/${gameId}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="games-browser-title"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />

          {/* Modal */}
          <motion.div
            className="relative bg-[var(--color-surface)] rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-modal)] w-full max-w-lg max-h-[80vh] flex flex-col"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-0">
              <div>
                <h2 id="games-browser-title" className="text-lg font-bold text-[var(--color-text)]">
                  Games
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                  {gameRegistry.length === 0
                    ? 'Fun ways to study your cards'
                    : `${gameRegistry.length} game${gameRegistry.length === 1 ? '' : 's'} available`
                  }
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search + filters (only show when there are games) */}
            {gameRegistry.length > 0 && (
              <div className="px-5 pt-4 space-y-3">
                <Input
                  placeholder="Search games..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                />

                {availableCategories.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeCategory === 'all'
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      All
                    </button>
                    {availableCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          activeCategory === cat
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {gameCategories[cat].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Games grid / empty state */}
            <div className="p-5 overflow-y-auto flex-1">
              {gameRegistry.length === 0 ? (
                /* Empty state — no games registered yet */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg mb-4">
                    <Gamepad2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">
                    Games coming soon!
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] max-w-xs">
                    We're building fun new ways to study your cards. Check back soon for exciting games.
                  </p>
                </div>
              ) : filteredGames.length === 0 ? (
                /* No search results */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="w-8 h-8 text-[var(--color-text-tertiary)] mb-3" />
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    No games match your search.
                  </p>
                </div>
              ) : (
                /* Games grid */
                <div className="grid grid-cols-2 gap-3">
                  {filteredGames.map(game => {
                    const disabled = cardCount < game.minCards;
                    const Icon = game.icon;
                    return (
                      <button
                        key={game.id}
                        onClick={() => !disabled && handleGameClick(game.id)}
                        disabled={disabled}
                        className="text-left"
                      >
                        <Card
                          variant="elevated"
                          className={`flex flex-col items-center gap-2 py-5 min-h-[120px] justify-center text-center group relative overflow-hidden ${
                            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center shadow-lg mb-1`}>
                            <Icon className="w-6 h-6 text-white shrink-0" />
                          </div>
                          <span className="text-sm font-semibold text-[var(--color-text)]">{game.name}</span>
                          <span className="text-xs text-[var(--color-text-tertiary)] px-2 leading-relaxed">
                            {game.description}
                          </span>
                          <Badge variant="default">
                            {gameCategories[game.category].label}
                          </Badge>
                          {disabled && (
                            <span className="text-xs text-[var(--color-warning)]">
                              Needs {game.minCards}+ cards
                            </span>
                          )}
                        </Card>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
