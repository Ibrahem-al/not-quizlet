/**
 * Command palette (Cmd+K / Ctrl+K): search sets, quick actions.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, FileText, Plus, BarChart3, Home } from 'lucide-react';
import { useStudyStore } from '../../stores/studyStore';
import Fuse from 'fuse.js';
import './CommandPalette.css';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const sets = useStudyStore((s) => s.sets);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const fuse = useMemo(
    () => new Fuse(sets, { keys: ['title', 'tags', 'cards.term'], threshold: 0.4 }),
    [sets]
  );
  const filteredSets = useMemo(() => {
    if (!search.trim()) return sets.slice(0, 8);
    return fuse.search(search).map((r) => r.item).slice(0, 8);
  }, [sets, search, fuse]);

  const run = useCallback(
    (path: string) => {
      onClose();
      navigate(path);
    },
    [navigate, onClose]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose} role="presentation">
      <Command
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="command-palette-input-wrap">
          <Search className="command-palette-icon" aria-hidden />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search sets or run a command..."
            autoFocus
            aria-label="Command palette search"
          />
        </div>
        <Command.List className="command-palette-list">
          <Command.Group heading="Actions">
            <Command.Item onSelect={() => run('/')}>
              <Home className="w-4 h-4" /> Home
            </Command.Item>
            <Command.Item onSelect={() => run('/sets/new')}>
              <Plus className="w-4 h-4" /> New set
            </Command.Item>
            <Command.Item onSelect={() => run('/stats')}>
              <BarChart3 className="w-4 h-4" /> Stats
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Study sets">
            {filteredSets.length === 0 && (
              <Command.Empty className="command-palette-empty">No sets found.</Command.Empty>
            )}
            {filteredSets.map((set) => (
              <Command.Item
                key={set.id}
                onSelect={() => run(`/sets/${set.id}`)}
                value={`${set.title} ${set.tags.join(' ')}`}
              >
                <FileText className="w-4 h-4" />
                <span>{set.title}</span>
                {set.cards.length > 0 && (
                  <span className="command-palette-meta">{set.cards.length} cards</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
