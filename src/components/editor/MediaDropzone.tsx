/**
 * Invisible drop zone for images; reveals on drag-over. Handles paste (Ctrl+V) for images.
 */

import { useState, useCallback } from 'react';
import { compressImage } from '../../lib/utils';

interface MediaDropzoneProps {
  children: React.ReactNode;
  onImage: (base64: string) => void;
  className?: string;
}

export function MediaDropzone({ children, onImage, className = '' }: MediaDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasting, setPasting] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file?.type.startsWith('image/')) return;
      try {
        const base64 = await compressImage(file, 800, 500);
        onImage(base64);
      } catch {
        /* ignore */
      }
    },
    [onImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
  }, []);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const file = e.clipboardData.files?.[0];
      if (!file?.type.startsWith('image/')) return;
      e.preventDefault();
      setPasting(true);
      try {
        const base64 = await compressImage(file, 800, 500);
        onImage(base64);
      } catch {
        /* ignore */
      } finally {
        setPasting(false);
      }
    },
    [onImage]
  );

  return (
    <div
      className={`relative ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      {dragOver && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-primary)]/10 backdrop-invert-[0.1] rounded-lg border-2 border-dashed border-[var(--color-primary)]"
          aria-hidden
        >
          <span className="text-sm font-medium text-[var(--color-text)]">Drop to attach</span>
        </div>
      )}
      {pasting && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text-secondary)] shadow">
          <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
          Compressing…
        </div>
      )}
      {children}
    </div>
  );
}
