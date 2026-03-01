/**
 * Add Image to Card: Search Web (Google/Bing/Wikimedia/Unsplash/Pexels) + Upload. Auto-search from term.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Upload, Loader2, ImageIcon } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import {
  imageSearchService,
  isImageSearchAvailable,
  isGoogleImageSearchConfigured,
  sanitizeSearchQuery,
  type ImageResult,
} from '../../lib/imageSearch';
import { compressImage } from '../../lib/utils';
import { Button } from '../ui';

const PER_PAGE = 9;
const DEBOUNCE_MS = 500;
const AUTO_SEARCH_DELAY_MS = 300;

interface ImageSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (base64: string) => void;
  /** Pre-fill search and run initial query (e.g. card term or definition slice). */
  initialQuery?: string;
}

export function ImageSearchModal({
  open,
  onClose,
  onSelect,
  initialQuery = '',
}: ImageSearchModalProps) {
  const [tab, setTab] = useState<'search' | 'upload'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [rateLimit, setRateLimit] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  const doSearch = useCallback(
    async (q: string, pageNum = 1, append = false) => {
      if (!isImageSearchAvailable()) return;
      setError(null);
      setRateLimit(false);
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const list = await imageSearchService.search(
          q || 'vocabulary',
          pageNum,
          PER_PAGE
        );
        if (append) setResults((prev) => [...prev, ...list]);
        else setResults(list);
      } catch (e) {
        if (e instanceof Error && e.message === 'RATE_LIMIT') {
          setRateLimit(true);
        } else {
          setError(e instanceof Error ? e.message : 'Search failed');
        }
        if (!append) setResults([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  const debouncedSearch = useDebouncedCallback(
    (q: string, pageNum: number, append: boolean) => doSearch(q, pageNum, append),
    DEBOUNCE_MS
  );

  const defaultSearchTerm = sanitizeSearchQuery(initialQuery) || 'vocabulary';

  useEffect(() => {
    if (!open) return;
    const q = sanitizeSearchQuery(initialQuery);
    setQuery(q);
    setPage(1);
    setResults([]);
    setError(null);
    setRateLimit(false);
    if (isOffline) return;
    const t = setTimeout(() => {
      doSearch(q || 'vocabulary', 1, false);
    }, AUTO_SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [open, initialQuery, isOffline, doSearch]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
    const effectiveQuery = value.trim() || defaultSearchTerm;
    debouncedSearch(effectiveQuery, 1, false);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    const effectiveQuery = query.trim() || defaultSearchTerm;
    doSearch(effectiveQuery, next, true);
  };

  const handleSelectImage = async (item: ImageResult) => {
    setSelectingId(item.id);
    setError(null);
    try {
      const base64 = await imageSearchService.downloadAsBase64(item.url);
      onSelect(base64);
      onClose();
    } catch {
      setError('Failed to load image');
    } finally {
      setSelectingId(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) return;
    e.target.value = '';
    setSelectingId('upload');
    try {
      const base64 = await compressImage(file, 800, 500);
      onSelect(base64);
      onClose();
    } catch {
      setError('Upload failed');
    } finally {
      setSelectingId(null);
    }
  };

  const handleManualUrl = async () => {
    const url = manualUrl.trim();
    if (!url) return;
    setSelectingId('manual');
    setError(null);
    try {
      const base64 = await imageSearchService.downloadAsBase64(url);
      onSelect(base64);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load image from URL');
    } finally {
      setSelectingId(null);
    }
  };

  if (!open) return null;

  const content = (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-search-title"
    >
      <motion.div
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-text-secondary)]/20">
          <h2 id="image-search-title" className="text-lg font-semibold text-[var(--color-text)]">
            Add Image to Card
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-[var(--color-text-secondary)]/20">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'search' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
          >
            <Search className="w-4 h-4" /> Search Web
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'upload' ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          <AnimatePresence mode="wait">
            {tab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {isOffline ? (
                  <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">
                    Connect to internet to search images.
                  </p>
                ) : (
                  <>
                    {!initialQuery?.trim() && (
                      <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">
                        Add a term to your card first to see images for that word, or type a search below. You can also upload your own.
                      </p>
                    )}
                    {isImageSearchAvailable() && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder={initialQuery ? `Search for an image of "${defaultSearchTerm.slice(0, 30)}${defaultSearchTerm.length > 30 ? '…' : ''}" or type another word` : 'Type a word or concept to find images (e.g. apple, mitochondria, Paris)'}
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-[var(--color-text-secondary)]/30 bg-[var(--color-background)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        aria-label="Search images"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                          aria-label="Clear"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {query.length > 0 && query.length < 3 && (
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Type at least 3 characters for better results, or we'll show popular images.
                      </p>
                    )}

                    {rateLimit && (
                      <div className="rounded-xl bg-[var(--color-warning)]/20 border border-[var(--color-warning)]/40 px-4 py-3 text-sm text-[var(--color-text)]">
                        Image search limit reached. Try again later or upload your own image.
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-[var(--color-danger)]" role="alert">
                        {error}
                      </p>
                    )}

                    {loading ? (
                      <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-[4/3] rounded-xl bg-[var(--color-text-secondary)]/15 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : results.length === 0 ? (
                      <div className="py-12 text-center">
                        <ImageIcon className="w-12 h-12 mx-auto text-[var(--color-text-secondary)]/50 mb-2" />
                        <p className="text-[var(--color-text-secondary)]">
                          No images found for &quot;{query || 'your search'}&quot;
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                          Try simpler keywords or upload an image.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {results.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectImage(item)}
                              disabled={!!selectingId}
                              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-background)] group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                            >
                              <img
                                src={item.thumb}
                                alt=""
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                              {selectingId === item.id ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                              ) : (
                                <>
                                  <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                  <span className="absolute bottom-0 left-0 right-0 py-1.5 px-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs truncate" title={item.attribution ?? item.author}>
                                    {item.source === 'google' ? 'Google' : item.source === 'bing' ? 'Bing' : item.source === 'wikimedia' ? 'Wikimedia Commons' : item.author}
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium px-3 py-1.5">
                                      Select
                                    </span>
                                  </span>
                                </>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-center pt-4">
                          <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                              </>
                            ) : (
                              'Show more results'
                            )}
                          </Button>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end pt-2">
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {isGoogleImageSearchConfigured() ? 'Images from Google' : 'Images from Wikimedia Commons, Bing, and more'}
                      </span>
                    </div>
                  </>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {tab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[var(--color-text-secondary)]/30 rounded-xl cursor-pointer hover:bg-[var(--color-background)] transition-colors">
                  {selectingId === 'upload' ? (
                    <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-[var(--color-text-secondary)] mb-2" />
                      <span className="text-sm font-medium text-[var(--color-text)]">Choose file or drag here</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={!!selectingId}
                  />
                </label>
                <div className="border-t border-[var(--color-text-secondary)]/20 pt-4">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">Or paste image URL</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-[var(--color-text-secondary)]/30 px-3 py-2 text-sm"
                    />
                    <Button
                      variant="secondary"
                      onClick={handleManualUrl}
                      disabled={!manualUrl.trim() || !!selectingId}
                    >
                      {selectingId === 'manual' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                </div>
                {error && (
                  <p className="text-sm text-[var(--color-danger)]" role="alert">
                    {error}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
