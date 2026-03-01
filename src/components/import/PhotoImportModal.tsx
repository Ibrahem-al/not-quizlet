/**
 * Photo → OCR → preview/edit → add cards.
 * Uses Tesseract.js (client-side). Optional AI extraction when adapter available.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '../ui';
import { recognizeText } from '../../lib/ocr';
import { parseImportText } from '../../lib/importText';
import { getAIGenerator } from '../../lib/ai';
import type { ParsedCard } from '../../lib/importText';

interface PhotoImportModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pairs: { term: string; definition: string }[]) => Promise<void>;
  onToast?: (msg: string) => void;
}

type Step = 'upload' | 'ocr' | 'preview';

export function PhotoImportModal({
  open,
  onClose,
  onConfirm,
  onToast,
}: PhotoImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [previewPairs, setPreviewPairs] = useState<ParsedCard[]>([]);
  const [useAI, setUseAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setOcrProgress(0);
    setOcrStatus('');
    setExtractedText('');
    setPreviewPairs([]);
    setUseAI(false);
    setLoading(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    setFile(f);
    setError(null);
    e.target.value = '';
  };

  const runOCR = useCallback(async () => {
    if (!file) return;
    setStep('ocr');
    setLoading(true);
    setError(null);
    try {
      const text = await recognizeText(file, {
        lang: 'eng',
        onProgress: (p) => {
          setOcrProgress(p.progress);
          setOcrStatus(p.status);
        },
      });
      setExtractedText(text);
      if (!text) {
        setError('No text detected. Try a clearer image.');
        setStep('upload');
      } else {
        setStep('preview');
        const parsed = parseImportText(text);
        if (parsed.length > 0) {
          setPreviewPairs(parsed);
        } else if (useAI) {
          const ai = await getAIGenerator();
          const cards = await ai.extractCardsFromText(text);
          if (cards?.length) {
            setPreviewPairs(cards.map((c) => ({ term: c.term, definition: c.definition })));
          } else {
            setPreviewPairs([{ term: 'Imported text', definition: text.slice(0, 500) }]);
          }
        } else {
          setPreviewPairs([{ term: 'Imported text', definition: text.slice(0, 500) }]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  }, [file, useAI]);

  const extractWithAI = useCallback(async () => {
    if (!extractedText) return;
    setLoading(true);
    setError(null);
    try {
      const ai = await getAIGenerator();
      const cards = await ai.extractCardsFromText(extractedText);
      if (cards?.length) {
        setPreviewPairs(cards.map((c) => ({ term: c.term, definition: c.definition })));
        onToast?.('AI extracted card pairs');
      } else {
        onToast?.('AI unavailable – using manual split');
        const parsed = parseImportText(extractedText);
        setPreviewPairs(parsed.length > 0 ? parsed : [{ term: 'Imported', definition: extractedText.slice(0, 300) }]);
      }
    } catch {
      setError('AI extraction failed');
      const parsed = parseImportText(extractedText);
      setPreviewPairs(parsed.length > 0 ? parsed : [{ term: 'Imported', definition: extractedText.slice(0, 300) }]);
    } finally {
      setLoading(false);
    }
  }, [extractedText, onToast]);

  const handleConfirm = useCallback(async () => {
    if (previewPairs.length === 0) return;
    setLoading(true);
    try {
      await onConfirm(previewPairs);
      onToast?.(`${previewPairs.length} card(s) added`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cards');
    } finally {
      setLoading(false);
    }
  }, [previewPairs, onConfirm, onToast, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-import-title"
    >
      <motion.div
        className="bg-[var(--color-surface)] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-text-secondary)]/20">
          <h2 id="photo-import-title" className="text-lg font-semibold text-[var(--color-text)]">
            Photo to flashcards
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Take or upload a photo of notes or a textbook page. Text will be extracted in the browser (nothing is sent to a server).
                </p>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--color-text-secondary)]/30 rounded-lg cursor-pointer hover:bg-[var(--color-text-secondary)]/5">
                  <ImagePlus className="w-10 h-10 text-[var(--color-text-secondary)] mb-2" />
                  <span className="text-sm text-[var(--color-text)]">
                    {file ? file.name : 'Choose image'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                  />
                  Use AI to extract card pairs (if available)
                </label>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={runOCR} disabled={!file || loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Scanning…
                      </>
                    ) : (
                      'Scan image'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'ocr' && (
              <motion.div
                key="ocr"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[var(--color-text-secondary)]">{ocrStatus}</p>
                <div className="h-2 bg-[var(--color-text-secondary)]/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--color-primary)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {previewPairs.length} card(s) ready. You can add more by editing the text and re-parsing.
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-[var(--color-text-secondary)]/20 p-2">
                  {previewPairs.slice(0, 15).map((p, i) => (
                    <div
                      key={i}
                      className="text-sm text-[var(--color-text)] bg-[var(--color-background)] rounded p-2"
                    >
                      <span className="font-medium">{p.term}</span>
                      <span className="text-[var(--color-text-secondary)]"> → </span>
                      <span>{p.definition.slice(0, 80)}{p.definition.length > 80 ? '…' : ''}</span>
                    </div>
                  ))}
                  {previewPairs.length > 15 && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      … and {previewPairs.length - 15} more
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={extractWithAI} disabled={loading}>
                    Extract with AI
                  </Button>
                  <Button onClick={handleConfirm} disabled={loading || previewPairs.length === 0}>
                    {loading ? 'Adding…' : `Add ${previewPairs.length} cards`}
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('upload')}>
                    New photo
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {error}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
