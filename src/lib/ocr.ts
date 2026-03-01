/**
 * Client-side OCR via Tesseract.js. Runs in browser; no API key.
 * Lazy-load to avoid pulling in the worker on initial load.
 */

export interface OCRProgress {
  status: string;
  progress: number; // 0–1
}

export interface OCROptions {
  lang?: string; // e.g. 'eng' or 'eng+spa'
  onProgress?: (p: OCRProgress) => void;
}

/**
 * Run OCR on an image (file, URL, or data URL). Returns extracted text.
 * First run may be slow (model load); subsequent runs use cached worker.
 */
export async function recognizeText(
  image: File | string,
  options: OCROptions = {}
): Promise<string> {
  const { lang = 'eng', onProgress } = options;
  const Tesseract = await import('tesseract.js');
  const result = await Tesseract.recognize(image, lang, {
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress({
          status: m.status ?? 'Recognizing…',
          progress: Math.min(1, Math.max(0, m.progress)),
        });
      }
    },
  });
  return (result.data?.text ?? '').trim();
}
