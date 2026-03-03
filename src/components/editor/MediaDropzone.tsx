/**
 * Invisible drop zone for images; reveals on drag-over. Handles paste (Ctrl+V) for images and URLs.
 */

import { useState, useCallback } from 'react';
import { compressImage, isImageUrl, extractImageUrlFromHtml, downloadImageFromUrl } from '../../lib/utils';

interface MediaDropzoneProps {
  children: React.ReactNode;
  onImage: (base64: string) => void;
  className?: string;
}

export function MediaDropzone({ children, onImage, className = '' }: MediaDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

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
      setPasteError(null);

      // Case 1: Pasted file (e.g. from file manager)
      const file = e.clipboardData.files?.[0];
      if (file?.type.startsWith('image/')) {
        e.preventDefault();
        setPasting(true);
        try {
          const base64 = await compressImage(file, 800, 500);
          onImage(base64);
        } catch {
          setPasteError('Failed to process pasted image');
        } finally {
          setPasting(false);
        }
        return;
      }

      // Case 2: Pasted text that looks like an image URL
      const text = e.clipboardData.getData('text/plain');
      if (text && isImageUrl(text)) {
        e.preventDefault();
        setPasting(true);
        try {
          const base64 = await downloadImageFromUrl(text.trim(), 800, 500);
          onImage(base64);
        } catch (err) {
          setPasteError(err instanceof Error ? err.message : 'Failed to download image');
        } finally {
          setPasting(false);
        }
        return;
      }

      // Case 3: Pasted HTML containing an image (e.g. copied from web page)
      const html = e.clipboardData.getData('text/html');
      if (html) {
        const imageUrl = extractImageUrlFromHtml(html);
        if (imageUrl) {
          e.preventDefault();
          setPasting(true);
          try {
            const base64 = await downloadImageFromUrl(imageUrl, 800, 500);
            onImage(base64);
          } catch (err) {
            setPasteError(err instanceof Error ? err.message : 'Failed to download image');
          } finally {
            setPasting(false);
          }
          return;
        }
      }
    },
    [onImage]
  );

  const clearError = useCallback(() => setPasteError(null), []);

  return (
    <div
      className={`relative ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
      onClick={clearError}
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
          Processing…
        </div>
      )}
      {pasteError && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded bg-[var(--color-danger)]/10 border border-[var(--color-danger)] px-2 py-1 text-xs text-[var(--color-danger)] shadow max-w-[200px]">
          <span>{pasteError}</span>
        </div>
      )}
      {!pasting && !pasteError && (
        <div className="absolute bottom-1 right-1 z-10 opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded">
            Ctrl+V to paste image/URL
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
