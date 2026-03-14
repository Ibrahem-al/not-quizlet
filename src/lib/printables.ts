import type { Card } from '../types';
import { shuffle } from './algorithms';
import { buildEquivalenceGroups, getWrongOptionPool, getCorrectAnswersNormSet, isDistinctAnswer, getEquivalentAnswers, buildMultiAnswerOptions } from './equivalence';
import { normalizeContent } from './contentHelpers';

export type AnswerDirection = 'term-to-definition' | 'definition-to-term' | 'both';

export interface PrintConfig {
  count: number;
  direction: AnswerDirection;
  testQuestionCount?: number;
  testQuestionTypes?: {
    written: boolean;
    multiple: boolean;
    truefalse: boolean;
  };
  multiAnswerMC?: boolean;
}

// --- Shared helpers ---

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

/** Extract ALL image src attributes from HTML (both data: URLs and http URLs) */
function extractAllImageSrcs(html: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  return matches.map(m => m[1]);
}

/** Convert a URL image to base64 via canvas (for jsPDF compatibility) */
function convertUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        reject(new Error('Canvas tainted'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/** Resolve image sources to base64 data URLs (converts http URLs via canvas) */
async function resolveImages(srcs: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const src of srcs) {
    if (src.startsWith('data:')) {
      results.push(src);
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const base64 = await convertUrlToBase64(src);
        results.push(base64);
      } catch { /* skip unloadable URLs */ }
    }
  }
  return results;
}

function getImageFormat(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+)/);
  if (!match) return 'JPEG';
  const fmt = match[1].toUpperCase();
  return fmt === 'JPG' ? 'JPEG' : fmt;
}

/** Load an image and return its natural dimensions */
function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 100, h: 100 }); // fallback square
    img.src = dataUrl;
  });
}

/** Scale dimensions to fit within maxW x maxH while preserving aspect ratio */
function fitImage(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const ratio = Math.min(maxW / naturalW, maxH / naturalH, 1);
  return { w: naturalW * ratio, h: naturalH * ratio };
}

type JsPDFType = InstanceType<(typeof import('jspdf'))['jsPDF']>;

/** Add a base64 image to the PDF, scaled to fit maxW x maxH. Returns rendered height. */
async function addScaledImage(
  doc: JsPDFType,
  dataUrl: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  const { w: natW, h: natH } = await loadImageSize(dataUrl);
  const { w, h } = fitImage(natW, natH, maxW, maxH);
  const fmt = getImageFormat(dataUrl);
  doc.addImage(dataUrl, fmt, x, y, w, h);
  return h;
}

/** Add multiple images in a horizontal-first grid layout, returns total height used */
async function addScaledImages(
  doc: JsPDFType,
  images: string[],
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  if (images.length === 0) return 0;
  if (images.length === 1) {
    try { return await addScaledImage(doc, images[0], x, y, maxW, maxH); } catch { return 0; }
  }
  const gap = 2;
  // Prefer horizontal grid: 2 → 2x1, 3 → 3x1, 4 → 2x2, 5-6 → 3x2
  const cols = images.length === 4 ? 2 : Math.min(images.length, 3);
  const rows = Math.ceil(images.length / cols);
  const cellW = (maxW - gap * (cols - 1)) / cols;
  const cellH = (maxH - gap * (rows - 1)) / rows;
  let maxRenderedH = 0;
  for (let i = 0; i < images.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const imgX = x + col * (cellW + gap);
    const imgY = y + row * (cellH + gap);
    try {
      const h = await addScaledImage(doc, images[i], imgX, imgY, cellW, cellH);
      const rowBottom = row * (cellH + gap) + h;
      if (rowBottom > maxRenderedH) maxRenderedH = rowBottom;
    } catch { /* skip */ }
  }
  return maxRenderedH;
}

/** Parsed content from a card side: plain text + all image data URLs */
interface CardContent {
  text: string;
  images: string[];
}

/** Parse card HTML, resolve URL images to base64, and optionally include card.imageData */
async function parseCardSideAsync(html: string, imageData?: string): Promise<CardContent> {
  const text = stripHtml(html);
  const srcs = extractAllImageSrcs(html);
  const images = await resolveImages(srcs);
  if (imageData) images.push(imageData);
  return { text, images };
}

// --- Unicode / non-Latin text helpers ---

/** Detect text that requires canvas-based rendering (Arabic, Hebrew, CJK, Thai, Devanagari, etc.) */
function needsCanvasRendering(text: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F\u2100-\u214F\u0300-\u036F]/.test(text);
}

const MM_TO_PX = 96 / 25.4; // ~3.78 px per mm at 96 DPI
const CANVAS_SCALE = 4; // 4x for crisp text in PDF

/** Word-wrap text on a canvas context */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const allLines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) { allLines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        allLines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) allLines.push(line);
  }
  return allLines.length > 0 ? allLines : [''];
}

/** Render text to a high-DPI canvas image (handles Arabic shaping, RTL, CJK, etc. via browser engine) */
function renderTextCanvas(
  text: string,
  maxWidthMm: number,
  fontSizePt: number,
  bold: boolean,
): { dataUrl: string; widthMm: number; heightMm: number; lineCount: number } {
  const maxWidthPx = maxWidthMm * MM_TO_PX * CANVAS_SCALE;
  const fontSizePx = fontSizePt * (4 / 3) * CANVAS_SCALE;
  const fontFamily = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';
  const fontStr = `${bold ? 'bold' : 'normal'} ${fontSizePx}px ${fontFamily}`;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = fontStr;

  const isRtl = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/.test(text);

  const lines = wrapCanvasText(ctx, text, maxWidthPx - 8);
  const lineHeight = fontSizePx * 1.4;

  canvas.width = Math.ceil(maxWidthPx);
  canvas.height = Math.ceil(lines.length * lineHeight + fontSizePx * 0.5);

  // Must re-set after resize
  ctx.font = fontStr;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  if (isRtl) {
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
  }

  for (let i = 0; i < lines.length; i++) {
    const xPos = isRtl ? canvas.width - 4 : 4;
    ctx.fillText(lines[i], xPos, i * lineHeight + fontSizePx * 0.1);
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm: canvas.width / (MM_TO_PX * CANVAS_SCALE),
    heightMm: canvas.height / (MM_TO_PX * CANVAS_SCALE),
    lineCount: lines.length,
  };
}

/**
 * Get line count for text (works for both Latin and non-Latin).
 * Used for layout height calculations.
 */
function getLineCount(doc: JsPDFType, text: string, maxW: number, fontSize: number): number {
  if (!needsCanvasRendering(text)) {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxW).length;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${fontSize * (4 / 3)}px system-ui, sans-serif`;
  return wrapCanvasText(ctx, text, maxW * MM_TO_PX).length;
}

/**
 * Render text in PDF. Uses jsPDF for Latin text, canvas for non-Latin scripts.
 * Returns height used in mm.
 */
async function pdfText(
  doc: JsPDFType,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontSize: number,
  bold = false,
  align?: 'left' | 'center' | 'right',
): Promise<number> {
  if (!text) return 0;

  if (!needsCanvasRendering(text)) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxW);
    const opts: Record<string, string> = {};
    if (align) opts.align = align;
    doc.text(lines, x, y, opts);
    return lines.length * (fontSize * 0.42 + 0.5);
  }

  const result = renderTextCanvas(text, maxW, fontSize, bold);
  const imgY = y - fontSize * 0.3;
  let imgX = x;
  if (align === 'center') imgX = x - result.widthMm / 2;
  else if (align === 'right') imgX = x - result.widthMm;
  doc.addImage(result.dataUrl, 'PNG', imgX, imgY, result.widthMm, result.heightMm);
  return result.heightMm;
}

function slugify(title: string): string {
  return title.replace(/\s+/g, '-').replace(/[^\w-]/g, '').substring(0, 50);
}

function toLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return first + second;
}

// A4 constants in mm
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const IMG_H_INLINE = 18; // standard inline image height for text-based PDFs (mm)
const IMG_H_OPTION = 12; // smaller height for MC option images

/** Estimate grid height for N images using horizontal-first layout */
function imgGridHeight(count: number, perImgH: number): number {
  if (count <= 0) return 0;
  const cols = count === 4 ? 2 : Math.min(count, 3);
  const rows = Math.ceil(count / cols);
  return rows * perImgH + (rows - 1) * 2;
}

function addHeader(doc: JsPDFType, title: string, subtitle: string): number {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, MARGIN + 6);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`${subtitle}  |  ${new Date().toLocaleDateString()}`, MARGIN, MARGIN + 13);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + 16, PAGE_W - MARGIN, MARGIN + 16);
  return MARGIN + 22;
}

function addFooter(doc: JsPDFType): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }
}

function checkPageBreak(doc: JsPDFType, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 10) {
    doc.addPage();
    return MARGIN + 8;
  }
  return y;
}

// --- 1. Line Matching Worksheet ---

export async function generateLineMatchingPDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const selectedCards = cards.slice(0, Math.min(config.count, cards.length));

  // Resolve direction per-item: "left" is the prompt, "right" is the answer
  const items = await Promise.all(selectedCards.map(async (c) => {
    const dir = config.direction === 'both'
      ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
      : config.direction;
    const swapped = dir === 'definition-to-term';
    return {
      term: await parseCardSideAsync(swapped ? c.definition : c.term, swapped ? undefined : c.imageData),
      definition: await parseCardSideAsync(swapped ? c.term : c.definition, swapped ? c.imageData : undefined),
    };
  }));

  const shuffledDefs = shuffle(items.map((item, i) => ({ def: item.definition, origIndex: i })));
  const answerKey: string[] = [];
  shuffledDefs.forEach((def, letterIdx) => {
    answerKey[def.origIndex] = toLetter(letterIdx);
  });

  const ITEMS_PER_PAGE = 10; // fewer per page to make room for images
  const COL_LEFT_X = MARGIN;
  const COL_LEFT_W = 70;
  const COL_RIGHT_X = MARGIN + CONTENT_W - 70;
  const COL_RIGHT_W = 70;
  const IMG_MAX_W = 28;
  const IMG_MAX_H = 14;

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    let y = addHeader(doc, 'Line Matching Worksheet', title);

    const leftLabel = config.direction === 'definition-to-term' ? 'Definitions' : 'Terms';
    const rightLabel = config.direction === 'definition-to-term' ? 'Terms' : 'Definitions';

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Draw a line from each item on the left to its match on the right.`, MARGIN, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(leftLabel, COL_LEFT_X, y);
    doc.text(rightLabel, COL_RIGHT_X, y);
    doc.setFont('helvetica', 'normal');
    y += 6;

    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, items.length);

    for (let i = startIdx; i < endIdx; i++) {
      const term = items[i].term;
      const shuffledEntry = shuffledDefs[i];
      const def = shuffledEntry ? shuffledEntry.def : { text: '', images: [] };

      doc.setFontSize(10);
      const termText = `${i + 1}. ${term.text || (term.images.length > 0 ? '(see image)' : '—')}`;
      const defText = `${toLetter(i)}. ${def.text || (def.images.length > 0 ? '(see image)' : '—')}`;
      const termLineCount = getLineCount(doc, termText, COL_LEFT_W, 10);
      const defLineCount = getLineCount(doc, defText, COL_RIGHT_W, 10);
      const textRowH = Math.max(termLineCount, defLineCount) * 5;
      const termImgCount = term.images.length;
      const defImgCount = def.images.length;
      const hasImages = termImgCount > 0 || defImgCount > 0;
      const maxImgRows = Math.max(termImgCount, defImgCount);
      const rowHeight = textRowH + (hasImages ? (IMG_MAX_H + 2) * maxImgRows + 1 : 0) + 4;

      y = checkPageBreak(doc, y, rowHeight);

      await pdfText(doc, termText, COL_LEFT_X, y, COL_LEFT_W, 10);
      await pdfText(doc, defText, COL_RIGHT_X, y, COL_RIGHT_W, 10);

      const textBottom = y + textRowH - 2;

      // Draw connecting dotted line
      doc.setDrawColor(220, 220, 220);
      doc.setLineDashPattern([1, 2], 0);
      const dotY = y + textRowH / 2 - 2;
      doc.line(COL_LEFT_X + COL_LEFT_W + 2, dotY, COL_RIGHT_X - 2, dotY);
      doc.setLineDashPattern([], 0);

      // Render images below text
      if (term.images.length > 0) {
        await addScaledImages(doc, term.images, COL_LEFT_X + 10, textBottom + 1, IMG_MAX_W, IMG_MAX_H * maxImgRows + 2 * (maxImgRows - 1));
      }
      if (def.images.length > 0) {
        await addScaledImages(doc, def.images, COL_RIGHT_X + 10, textBottom + 1, IMG_MAX_W, IMG_MAX_H * maxImgRows + 2 * (maxImgRows - 1));
      }

      y += rowHeight;
    }
  }

  // Answer Key page — with equivalence support
  const groups = buildEquivalenceGroups(selectedCards);
  doc.addPage();
  let y = addHeader(doc, 'Answer Key — Line Matching', title);
  doc.setFontSize(11);
  for (let i = 0; i < items.length; i++) {
    y = checkPageBreak(doc, y, 8);
    // Find all valid matching letters for this item (considering equivalent definitions)
    const card = selectedCards[i];
    const dir = config.direction === 'both' ? 'term-to-definition' : config.direction;
    const answerWith = dir === 'definition-to-term' ? 'term' : 'definition';
    const equivAnswers = getEquivalentAnswers(card, answerWith, groups);
    const altLetters: string[] = [];
    shuffledDefs.forEach((def, letterIdx) => {
      const defText = def.def.text || '';
      if (equivAnswers.some((ea) => normalizeContent(ea) === normalizeContent(defText)) && toLetter(letterIdx) !== answerKey[i]) {
        altLetters.push(toLetter(letterIdx));
      }
    });
    const altSuffix = altLetters.length > 0 ? ` (or ${altLetters.join(', ')})` : '';
    doc.text(`${i + 1} = ${answerKey[i]}${altSuffix}`, MARGIN, y);
    y += 7;
  }

  addFooter(doc);
  doc.save(`studyflow-matching-worksheet-${slugify(title)}.pdf`);
}

// --- 2. Printable Test ---

interface TestQuestion {
  type: 'written' | 'mc' | 'tf';
  card: Card;
  promptContent: CardContent;
  answerContent: CardContent;
  swapped: boolean;
  options?: string[];
  optionImages?: string[][];
  correctOptionIndex?: number;
  correctOptionIndices?: number[];
  equivalentAnswers?: string[];
  shownAnswer?: string;
  shownAnswerImages?: string[];
  isTrue?: boolean;
}

export async function generateTestPDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const questionCount = config.testQuestionCount ?? config.count;
  // Select cards for the requested question count, repeating evenly when needed
  let selectedCards: Card[];
  const pool = cards.slice(0, Math.min(config.count, cards.length));
  if (questionCount <= pool.length) {
    selectedCards = shuffle(pool).slice(0, questionCount);
  } else {
    selectedCards = [];
    const fullRounds = Math.floor(questionCount / pool.length);
    const remainder = questionCount % pool.length;
    for (let r = 0; r < fullRounds; r++) selectedCards.push(...pool);
    selectedCards.push(...shuffle([...pool]).slice(0, remainder));
    selectedCards = shuffle(selectedCards);
  }

  const groups = buildEquivalenceGroups(cards);

  const hasMC = pool.length >= 4;
  const hasTF = pool.length >= 2;
  const types: TestQuestion['type'][] = [];
  const qTypes = config.testQuestionTypes;
  if (qTypes) {
    if (qTypes.written) types.push('written');
    if (qTypes.multiple && hasMC) types.push('mc');
    if (qTypes.truefalse && hasTF) types.push('tf');
    if (types.length === 0) types.push('written');
  } else {
    if (hasMC) types.push('written', 'mc', 'tf');
    else if (hasTF) types.push('written', 'tf');
    else types.push('written');
  }

  const questions: TestQuestion[] = await Promise.all(selectedCards.map(async (card, i) => {
    const type = types[i % types.length];
    const dir = config.direction === 'both'
      ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
      : config.direction;
    const swapped = dir === 'definition-to-term';

    const promptContent = await parseCardSideAsync(swapped ? card.definition : card.term, swapped ? card.imageData : undefined);
    const answerContent = await parseCardSideAsync(swapped ? card.term : card.definition, swapped ? undefined : card.imageData);
    const q: TestQuestion = { type, card, promptContent, answerContent, swapped };

    const answerWith = swapped ? 'term' : 'definition';
    q.equivalentAnswers = getEquivalentAnswers(card, answerWith, groups);

    if (type === 'mc') {
      let allEntries: { text: string; imgs: string[]; isCorrect: boolean }[];
      if (config.multiAnswerMC) {
        const multiOptions = buildMultiAnswerOptions(card, cards, answerWith, groups);
        const parsedOptions = await Promise.all(multiOptions.map((html) => parseCardSideAsync(html)));
        const correctNorm = getCorrectAnswersNormSet(card, answerWith, groups);
        allEntries = parsedOptions.map((parsed) => ({
          text: parsed.text || (parsed.images.length > 0 ? '(see image)' : '—'),
          imgs: parsed.images,
          isCorrect: correctNorm.has(normalizeContent(parsed.text)),
        }));
      } else {
        const wrongPool = getWrongOptionPool(card, cards, answerWith, groups);
        const others = shuffle(wrongPool).slice(0, 3);
        const wrongAnswers = await Promise.all(others.map((c) => parseCardSideAsync(swapped ? c.term : c.definition, swapped ? undefined : c.imageData)));
        allEntries = shuffle([
          { text: answerContent.text || (answerContent.images.length > 0 ? '(see image)' : '—'), imgs: answerContent.images, isCorrect: true },
          ...wrongAnswers.map((d) => ({ text: d.text || (d.images.length > 0 ? '(see image)' : '—'), imgs: d.images, isCorrect: false })),
        ]);
      }
      q.options = allEntries.map((e) => e.text);
      q.optionImages = allEntries.map((e) => e.imgs);
      q.correctOptionIndex = allEntries.findIndex((e) => e.isCorrect);
      // Find all correct option indices (for equivalent answers)
      const correctNorm = getCorrectAnswersNormSet(card, answerWith, groups);
      q.correctOptionIndices = allEntries
        .map((e, idx) => e.isCorrect || correctNorm.has(normalizeContent(e.text)) ? idx : -1)
        .filter((idx) => idx >= 0);
    } else if (type === 'tf') {
      const isTrue = Math.random() > 0.5;
      if (isTrue) {
        q.shownAnswer = answerContent.text || (answerContent.images.length > 0 ? '(see image)' : '—');
        q.shownAnswerImages = answerContent.images;
        q.isTrue = true;
      } else {
        const correctNorm = getCorrectAnswersNormSet(card, answerWith, groups);
        const distinctOthers = cards.filter((c) => {
          const content = swapped ? c.term : c.definition;
          return isDistinctAnswer(content, correctNorm);
        });
        if (distinctOthers.length > 0) {
          const wrongCard = shuffle(distinctOthers)[0];
          const wrongAnswer = await parseCardSideAsync(swapped ? wrongCard.term : wrongCard.definition, swapped ? undefined : wrongCard.imageData);
          q.shownAnswer = wrongAnswer.text || (wrongAnswer.images.length > 0 ? '(see image)' : '—');
          q.shownAnswerImages = wrongAnswer.images;
          q.isTrue = false;
        } else {
          q.shownAnswer = answerContent.text || (answerContent.images.length > 0 ? '(see image)' : '—');
          q.shownAnswerImages = answerContent.images;
          q.isTrue = true;
        }
      }
    }
    return q;
  }));

  // Header
  let y = addHeader(doc, 'Test', title);
  doc.setFontSize(10);
  doc.text('Name: ________________________________________', MARGIN, y);
  y += 7;
  doc.text(`Date: _________________    Score: ______ / ${questions.length}`, MARGIN, y);
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);
  y += 2;

  // Questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const promptLabel = q.promptContent.text || '(see image)';
    const promptImgs = q.promptContent.images;
    doc.setFontSize(10);

    if (q.type === 'written') {
      const verb = q.swapped ? 'What term means' : 'Define';
      const prompt = `${i + 1}. ${verb}: "${promptLabel}"`;
      const promptLineCount = getLineCount(doc, prompt, CONTENT_W, 10);
      const imgSpace = promptImgs.length > 0 ? imgGridHeight(promptImgs.length, IMG_H_INLINE) + 1 : 0;
      const needed = promptLineCount * 5 + imgSpace + 18;
      y = checkPageBreak(doc, y, needed);

      const h = await pdfText(doc, prompt, MARGIN, y, CONTENT_W, 10, true);
      y += h + 1;

      if (promptImgs.length > 0) {
        const imgH = imgGridHeight(promptImgs.length, IMG_H_INLINE);
        const h = await addScaledImages(doc, promptImgs, MARGIN + 5, y, 40, imgH);
        y += h + 1;
      }

      doc.setDrawColor(200, 200, 200);
      for (let line = 0; line < 2; line++) {
        doc.line(MARGIN + 5, y, PAGE_W - MARGIN, y);
        y += 6;
      }
      y += 2;

    } else if (q.type === 'mc') {
      const verb = q.swapped ? 'Which term matches' : 'What is the definition of';
      const prompt = `${i + 1}. ${verb} "${promptLabel}"?`;
      const promptLineCount = getLineCount(doc, prompt, CONTENT_W, 10);
      const imgSpace = promptImgs.length > 0 ? imgGridHeight(promptImgs.length, IMG_H_INLINE) + 1 : 0;
      const optImgSpace = q.optionImages?.reduce((s, imgs) => s + (imgs.length > 0 ? imgGridHeight(imgs.length, IMG_H_OPTION) + 1 : 0), 0) ?? 0;
      const optionLineCounts = q.options!.map((opt) => getLineCount(doc, opt, CONTENT_W - 15, 10));
      const needed = promptLineCount * 5 + imgSpace + optionLineCounts.reduce((s, lc) => s + lc * 5 + 2, 0) + optImgSpace + 6;
      y = checkPageBreak(doc, y, needed);

      const h = await pdfText(doc, prompt, MARGIN, y, CONTENT_W, 10, true);
      y += h + 1;

      if (promptImgs.length > 0) {
        const imgH = imgGridHeight(promptImgs.length, IMG_H_INLINE);
        const h = await addScaledImages(doc, promptImgs, MARGIN + 5, y, 40, imgH);
        y += h + 1;
      }

      const optionLetters = ['a', 'b', 'c', 'd'];
      for (let j = 0; j < q.options!.length; j++) {
        doc.circle(MARGIN + 5, y - 1.2, 2);
        const optFullText = `${optionLetters[j]})  ${q.options![j]}`;
        const optH = await pdfText(doc, optFullText, MARGIN + 10, y, CONTENT_W - 15, 10);
        y += optH;

        const optImgs = q.optionImages?.[j];
        if (optImgs && optImgs.length > 0) {
          const imgH = imgGridHeight(optImgs.length, IMG_H_OPTION);
          const h = await addScaledImages(doc, optImgs, MARGIN + 15, y, 60, imgH);
          y += h + 1;
        }
        y += 1;
      }
      y += 2;

    } else if (q.type === 'tf') {
      const prompt = q.swapped
        ? `${i + 1}. True or False: "${q.shownAnswer}" is the term for "${promptLabel}"`
        : `${i + 1}. True or False: "${promptLabel}" means "${q.shownAnswer}"`;
      const promptLineCount = getLineCount(doc, prompt, CONTENT_W, 10);
      const shownAnswerImgs = q.shownAnswerImages ?? [];
      const allTfImgs = [...promptImgs, ...shownAnswerImgs];
      const hasAnyImg = allTfImgs.length > 0;
      const imgSpace = hasAnyImg ? imgGridHeight(allTfImgs.length, IMG_H_INLINE) + 1 : 0;
      const needed = promptLineCount * 5 + imgSpace + 10;
      y = checkPageBreak(doc, y, needed);

      const tfH = await pdfText(doc, prompt, MARGIN, y, CONTENT_W, 10, true);
      y += tfH + 1;

      if (hasAnyImg) {
        const imgH = imgGridHeight(allTfImgs.length, IMG_H_INLINE);
        const h = await addScaledImages(doc, allTfImgs, MARGIN + 5, y, 70, imgH);
        y += h + 4;
      }

      doc.circle(MARGIN + 10, y - 1.2, 2.5);
      doc.text('True', MARGIN + 15, y);
      doc.circle(MARGIN + 40, y - 1.2, 2.5);
      doc.text('False', MARGIN + 45, y);
      y += 6;
    }
  }

  // Answer Key page
  doc.addPage();
  y = addHeader(doc, 'Answer Key — Test', title);
  doc.setFontSize(10);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ansLabel = q.answerContent.text || (q.answerContent.images.length > 0 ? '(see image)' : '—');
    const ansImgs = q.answerContent.images;
    const equivs = q.equivalentAnswers ?? [];
    const otherAnswers = equivs.filter((a) => a !== ansLabel);
    const equivSuffix = otherAnswers.length > 0 ? ` (or ${otherAnswers.join(', ')})` : '';
    let answer = '';
    if (q.type === 'written') {
      answer = ansLabel + equivSuffix;
    } else if (q.type === 'mc') {
      const indices = q.correctOptionIndices ?? (q.correctOptionIndex != null ? [q.correctOptionIndex] : []);
      const letters = indices.map((idx) => ['a', 'b', 'c', 'd'][idx]).join(', ');
      answer = `${letters}) ${ansLabel}${equivSuffix}`;
    } else if (q.type === 'tf') {
      answer = q.isTrue ? 'True' : 'False';
    }
    const showAnsImgs = ansImgs.length > 0 && (q.type === 'written' || q.type === 'mc');
    const imgSpace = showAnsImgs ? imgGridHeight(ansImgs.length, IMG_H_OPTION) : 0;
    y = checkPageBreak(doc, y, 8 + imgSpace);
    const ansText = `${i + 1}. ${answer}`;
    const ansH = await pdfText(doc, ansText, MARGIN, y, CONTENT_W, 10);
    y += ansH + 1;

    if (showAnsImgs) {
      const ansImgH = imgGridHeight(ansImgs.length, IMG_H_OPTION);
      const h = await addScaledImages(doc, ansImgs, MARGIN + 10, y, 60, ansImgH);
      y += h + 1;
    }
    y += 2;
  }

  addFooter(doc);
  doc.save(`studyflow-test-${slugify(title)}.pdf`);
}

// --- 3. Printable Flashcards ---

export async function generateFlashcardsPDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const selectedCards = cards.slice(0, Math.min(config.count, cards.length));

  const COLS = 2;
  const ROWS = 4;
  const CARDS_PER_PAGE = COLS * ROWS;
  const CARD_W = (CONTENT_W - 6) / COLS;
  const CARD_H = (PAGE_H - MARGIN * 2 - 20) / ROWS;
  const GAP = 6;

  const totalPages = Math.ceil(selectedCards.length / CARDS_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${title} — Flashcards`, MARGIN, MARGIN + 4);
    doc.setTextColor(0, 0, 0);

    const startY = MARGIN + 8;
    const startIdx = page * CARDS_PER_PAGE;

    for (let slot = 0; slot < CARDS_PER_PAGE; slot++) {
      const cardIdx = startIdx + slot;
      if (cardIdx >= selectedCards.length) break;

      const card = selectedCards[cardIdx];
      const col = slot % COLS;
      const row = Math.floor(slot / COLS);

      const x = MARGIN + col * (CARD_W + GAP);
      const y = startY + row * CARD_H;

      // Dashed card border
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([2, 2], 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, CARD_W, CARD_H, 2, 2);
      doc.setLineDashPattern([], 0);

      // Card number
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`#${cardIdx + 1}`, x + CARD_W - 3, y + 4, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      const innerW = CARD_W - 8;
      const halfH = CARD_H / 2 - 3;
      const dividerY = y + CARD_H / 2;

      const dir = config.direction === 'both'
        ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
        : config.direction;
      const swapped = dir === 'definition-to-term';
      const topContent = await parseCardSideAsync(swapped ? card.definition : card.term, swapped ? undefined : card.imageData);
      const bottomContent = await parseCardSideAsync(swapped ? card.term : card.definition, swapped ? card.imageData : undefined);

      // --- Top half ---
      await renderCellContent(doc, topContent, x + 4, y + 5, innerW, halfH - 3, true);

      // Dashed divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setLineWidth(0.2);
      doc.line(x + 3, dividerY, x + CARD_W - 3, dividerY);
      doc.setLineDashPattern([], 0);

      // --- Bottom half ---
      await renderCellContent(doc, bottomContent, x + 4, dividerY + 2, innerW, halfH - 1, false);
    }
  }

  doc.setPage(1);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Cut along dashed lines to create individual flashcards.', PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  addFooter(doc);
  doc.save(`studyflow-flashcards-${slugify(title)}.pdf`);
}

/** Render text + images content into a bounded cell area */
async function renderCellContent(
  doc: JsPDFType,
  content: CardContent,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  bold: boolean,
): Promise<void> {
  const hasText = content.text.length > 0;
  const hasImages = content.images.length > 0;

  if (hasText && hasImages) {
    // Text on top, images below — split available height
    const textH = maxH * 0.35;
    const imgH = maxH * 0.6;

    let fontSize = bold ? 10 : 9;
    let lineCount = getLineCount(doc, content.text, maxW, fontSize);
    while (lineCount * 4 > textH && fontSize > 7) {
      fontSize--;
      lineCount = getLineCount(doc, content.text, maxW, fontSize);
    }
    const renderedH = await pdfText(doc, content.text, x, y + 2, maxW, fontSize, bold);
    const textBottom = y + Math.min(renderedH + 2, textH);

    await addScaledImages(doc, content.images, x, textBottom + 1, maxW - 2, imgH);

  } else if (hasImages) {
    // Images only — render stacked
    await addScaledImages(doc, content.images, x, y + 1, maxW - 2, maxH - 2);

  } else {
    // Text only — vertically center
    const displayText = content.text || '(empty)';
    let fontSize = bold ? 10 : 9;
    let lineCount = getLineCount(doc, displayText, maxW, fontSize);
    while (lineCount * 4.5 > maxH - 2 && fontSize > 7) {
      fontSize--;
      lineCount = getLineCount(doc, displayText, maxW, fontSize);
    }
    const blockH = lineCount * (fontSize * 0.42);
    const startY = y + Math.max(0, (maxH - blockH) / 2);
    await pdfText(doc, displayText, x, startY, maxW, fontSize, bold);
  }
  doc.setFont('helvetica', 'normal');
}

// --- 4. Matching Game Cards ---

export async function generateMatchingGamePDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const selectedCards = cards.slice(0, Math.min(config.count, cards.length));

  interface GameTile {
    text: string;
    type: 'T' | 'D';
    matchNum: number;
    images: string[];
  }

  const tiles: GameTile[] = [];
  for (let i = 0; i < selectedCards.length; i++) {
    const card = selectedCards[i];
    const term = await parseCardSideAsync(card.term, card.imageData);
    const def = await parseCardSideAsync(card.definition);
    tiles.push({ text: term.text, type: 'T', matchNum: i + 1, images: term.images });
    tiles.push({ text: def.text, type: 'D', matchNum: i + 1, images: def.images });
  }

  const shuffledTiles = shuffle(tiles);

  const COLS = 3;
  const ROWS = 5;
  const TILES_PER_PAGE = COLS * ROWS;
  const GAP_X = 3;
  const GAP_Y = 3;
  const TILE_W = (CONTENT_W - GAP_X * (COLS - 1)) / COLS;
  const TILE_H = 38;

  const totalPages = Math.ceil(shuffledTiles.length / TILES_PER_PAGE);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    let startY = MARGIN;

    if (page === 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Matching Game', MARGIN, startY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${title}  |  Cut out cards. Match each term (T) with its definition (D).`, MARGIN, startY + 12);
      doc.text('Matching numbers in the corners can be used to verify correct pairs.', MARGIN, startY + 17);
      doc.setTextColor(0, 0, 0);
      startY += 22;
    }

    const startIdx = page * TILES_PER_PAGE;

    for (let slot = 0; slot < TILES_PER_PAGE; slot++) {
      const tileIdx = startIdx + slot;
      if (tileIdx >= shuffledTiles.length) break;

      const tile = shuffledTiles[tileIdx];
      const col = slot % COLS;
      const row = Math.floor(slot / COLS);

      const x = MARGIN + col * (TILE_W + GAP_X);
      const y = startY + row * (TILE_H + GAP_Y);

      // Dashed border
      doc.setDrawColor(160, 160, 160);
      doc.setLineDashPattern([2, 1.5], 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, TILE_W, TILE_H, 2, 2);
      doc.setLineDashPattern([], 0);

      // Type badge
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      const badgeColor = tile.type === 'T' ? [59, 130, 246] : [16, 185, 129];
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(x + 2, y + 2, 8, 5, 1, 1, 'F');
      doc.text(tile.type, x + 6, y + 5.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Match number
      doc.setFontSize(6);
      doc.setTextColor(190, 190, 190);
      doc.text(`#${tile.matchNum}`, x + TILE_W - 3, y + 5, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      const innerW = TILE_W - 8;
      const contentY = y + 9;
      const contentH = TILE_H - 13;

      const hasText = tile.text.length > 0;
      const hasImages = tile.images.length > 0;

      if (hasText && hasImages) {
        // Text on top, images below (horizontal-first layout)
        const textH = contentH * 0.35;
        const imgH = contentH * 0.6;
        let fontSize = 8;
        const isBold = tile.type === 'T';
        let lc = getLineCount(doc, tile.text, innerW, fontSize);
        while (lc * 3.5 > textH && fontSize > 6) {
          fontSize--;
          lc = getLineCount(doc, tile.text, innerW, fontSize);
        }
        const renderedH = await pdfText(doc, tile.text, x + TILE_W / 2, contentY, innerW, fontSize, isBold, 'center');
        const textBottom = contentY + renderedH + 1;
        await addScaledImages(doc, tile.images, x + 4, textBottom, innerW - 4, imgH);

      } else if (hasImages) {
        // Images only — horizontal-first grid layout
        await addScaledImages(doc, tile.images, x + 4, contentY + 1, innerW - 2, contentH - 2);

      } else {
        // Text only
        const displayText = tile.text || '(empty)';
        const isBold = tile.type === 'T';
        let fontSize = 9;
        let lc = getLineCount(doc, displayText, innerW, fontSize);
        while (lc * 4 > contentH && fontSize > 6) {
          fontSize--;
          lc = getLineCount(doc, displayText, innerW, fontSize);
        }
        const blockH = lc * (fontSize * 0.42);
        const textY = contentY + Math.max(0, (contentH - blockH) / 2);
        await pdfText(doc, displayText, x + TILE_W / 2, textY, innerW, fontSize, isBold, 'center');
        doc.setFont('helvetica', 'normal');
      }
    }
  }

  doc.setPage(1);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Cut along dashed lines. Match term cards (T) with definition cards (D).', PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  addFooter(doc);
  doc.save(`studyflow-matching-game-${slugify(title)}.pdf`);
}

// --- 5. Cut & Glue Activity ---

export async function generateCutAndGluePDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const selectedCards = cards.slice(0, Math.min(config.count, cards.length));

  // Resolve direction per-item
  const items = await Promise.all(selectedCards.map(async (c) => {
    const dir = config.direction === 'both'
      ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
      : config.direction;
    const swapped = dir === 'definition-to-term';
    return {
      term: await parseCardSideAsync(swapped ? c.definition : c.term, swapped ? undefined : c.imageData),
      definition: await parseCardSideAsync(swapped ? c.term : c.definition, swapped ? c.imageData : undefined),
    };
  }));

  // Shuffle terms for cut-out section and build answer key
  const shuffledTerms = shuffle(items.map((item, i) => ({ term: item.term, origIndex: i })));
  const answerKey: number[] = [];
  shuffledTerms.forEach((entry) => {
    answerKey[entry.origIndex] = shuffledTerms.indexOf(entry);
  });

  // --- Layout constants ---
  const TERM_COLS = 3;
  const TERM_GAP_X = 4;
  const TERM_GAP_Y = 4;
  const BOX_W = (CONTENT_W - TERM_GAP_X * (TERM_COLS - 1)) / TERM_COLS;
  const BOX_H = 22;
  const DEF_TEXT_W = CONTENT_W - BOX_W - 6;
  const ITEMS_PER_DEF_PAGE = 8;

  // ── Section 1: Definitions with glue spaces ──

  const defPages = Math.ceil(items.length / ITEMS_PER_DEF_PAGE);
  const promptLabel = config.direction === 'definition-to-term' ? 'Terms' : 'Definitions';
  const cutLabel = config.direction === 'definition-to-term' ? 'definitions' : 'terms';

  for (let page = 0; page < defPages; page++) {
    if (page > 0) doc.addPage();
    let y = addHeader(doc, 'Cut & Glue Activity', title);

    if (page === 0) {
      doc.setFontSize(10);
      doc.text('Name: ________________________________________', MARGIN, y);
      y += 7;
      doc.text(`Date: _________________`, MARGIN, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Cut out the ${cutLabel} and glue each one next to its matching ${promptLabel.toLowerCase().slice(0, -1)}.`, MARGIN, y);
      doc.setTextColor(0, 0, 0);
      y += 8;
    }

    const startIdx = page * ITEMS_PER_DEF_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_DEF_PAGE, items.length);

    for (let i = startIdx; i < endIdx; i++) {
      const def = items[i].definition;

      // Calculate dynamic row height based on text + images
      const defText = `${i + 1}. ${def.text || (def.images.length > 0 ? '(see image)' : '—')}`;
      doc.setFontSize(10);
      const textLines = getLineCount(doc, defText, DEF_TEXT_W, 10);
      const textH = textLines * 5;
      const imgSpace = def.images.length > 0 ? imgGridHeight(def.images.length, IMG_H_INLINE) + 2 : 0;
      const contentH = textH + imgSpace + 4;
      const rowH = Math.max(BOX_H, contentH) + 4;

      y = checkPageBreak(doc, y, rowH);

      // Definition number + text
      await pdfText(doc, defText, MARGIN, y + 5, DEF_TEXT_W, 10, false);

      // Render definition images below text if present
      if (def.images.length > 0) {
        const imgH = imgGridHeight(def.images.length, IMG_H_INLINE);
        await addScaledImages(doc, def.images, MARGIN + 5, y + textH + 4, DEF_TEXT_W - 10, imgH);
      }

      // Empty glue box (solid border) — height matches the row
      const glueH = rowH - 4;
      const boxX = MARGIN + DEF_TEXT_W + 6;
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([], 0);
      doc.roundedRect(boxX, y, BOX_W, glueH, 1.5, 1.5);

      // Light "Glue here" hint
      doc.setFontSize(7);
      doc.setTextColor(210, 210, 210);
      doc.text('Glue here', boxX + BOX_W / 2, y + glueH / 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      y += rowH;
    }
  }

  // ── Section 2: Cut-out terms with dotted borders ──

  doc.addPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cut Out & Glue', MARGIN, MARGIN + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Cut along the dotted lines. Glue each ${cutLabel.slice(0, -1)} next to its matching ${promptLabel.toLowerCase().slice(0, -1)}.`, MARGIN, MARGIN + 12);
  doc.setTextColor(0, 0, 0);

  // Dashed divider line under header
  doc.setDrawColor(160, 160, 160);
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, MARGIN + 16, PAGE_W - MARGIN, MARGIN + 16);
  doc.setLineDashPattern([], 0);

  // Pre-calculate uniform term box height based on tallest content
  const innerW = BOX_W - 6;
  let maxTermH = BOX_H;
  for (const entry of shuffledTerms) {
    const hasText = entry.term.text.length > 0;
    const hasImages = entry.term.images.length > 0;
    if (hasImages) {
      const imgH = imgGridHeight(entry.term.images.length, IMG_H_INLINE);
      if (hasText) {
        doc.setFontSize(9);
        const lc = getLineCount(doc, entry.term.text, innerW, 9);
        const textH = lc * 5;
        maxTermH = Math.max(maxTermH, textH + imgH + 6);
      } else {
        maxTermH = Math.max(maxTermH, imgH + 4);
      }
    }
  }
  const TERM_H = maxTermH;
  const actualTermRows = Math.floor((PAGE_H - MARGIN * 2 - 24) / (TERM_H + TERM_GAP_Y));
  const actualTermsPerPage = TERM_COLS * Math.max(actualTermRows, 1);

  let termStartY = MARGIN + 22;
  const termPages = Math.ceil(shuffledTerms.length / actualTermsPerPage);

  for (let page = 0; page < termPages; page++) {
    if (page > 0) {
      doc.addPage();
      termStartY = MARGIN + 10;
    }

    const startIdx = page * actualTermsPerPage;

    for (let slot = 0; slot < actualTermsPerPage; slot++) {
      const termIdx = startIdx + slot;
      if (termIdx >= shuffledTerms.length) break;

      const termEntry = shuffledTerms[termIdx];
      const col = slot % TERM_COLS;
      const row = Math.floor(slot / TERM_COLS);

      const x = MARGIN + col * (BOX_W + TERM_GAP_X);
      const y = termStartY + row * (TERM_H + TERM_GAP_Y);

      // Dotted border — cut line (heavier to emphasize cutting)
      doc.setDrawColor(80, 80, 80);
      doc.setLineDashPattern([2, 2], 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, BOX_W, TERM_H, 1.5, 1.5);
      doc.setLineDashPattern([], 0);

      // Term content
      const hasText = termEntry.term.text.length > 0;
      const hasImages = termEntry.term.images.length > 0;

      if (hasText && hasImages) {
        let fontSize = 9;
        let lc = getLineCount(doc, termEntry.term.text, innerW, fontSize);
        const imgH = imgGridHeight(termEntry.term.images.length, IMG_H_INLINE);
        const availTextH = TERM_H - imgH - 6;
        while (lc * 4 > availTextH && fontSize > 6) {
          fontSize--;
          lc = getLineCount(doc, termEntry.term.text, innerW, fontSize);
        }
        const renderedH = await pdfText(doc, termEntry.term.text, x + BOX_W / 2, y + 3, innerW, fontSize, true, 'center');
        await addScaledImages(doc, termEntry.term.images, x + 3, y + renderedH + 4, innerW, imgH);
      } else if (hasImages) {
        const imgH = imgGridHeight(termEntry.term.images.length, IMG_H_INLINE);
        const imgY = y + Math.max(2, (TERM_H - imgH) / 2);
        await addScaledImages(doc, termEntry.term.images, x + 3, imgY, innerW, imgH);
      } else {
        const displayText = termEntry.term.text || '(empty)';
        let fontSize = 9;
        let lc = getLineCount(doc, displayText, innerW, fontSize);
        while (lc * 4 > TERM_H - 4 && fontSize > 6) {
          fontSize--;
          lc = getLineCount(doc, displayText, innerW, fontSize);
        }
        const blockH = lc * (fontSize * 0.42);
        const textY = y + Math.max(2, (TERM_H - blockH) / 2);
        await pdfText(doc, displayText, x + BOX_W / 2, textY, innerW, fontSize, true, 'center');
      }
      doc.setFont('helvetica', 'normal');
    }
  }

  // Footer note on first cut page
  doc.setPage(defPages + 1);
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Cut along dotted lines, then glue each one next to its matching pair.', PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // ── Answer Key page ──
  const cutGroups = buildEquivalenceGroups(selectedCards);
  doc.addPage();
  let y = addHeader(doc, 'Answer Key — Cut & Glue', title);
  doc.setFontSize(10);
  for (let i = 0; i < items.length; i++) {
    y = checkPageBreak(doc, y, 8);
    const termLabel = items[i].term.text || '(image)';
    const defLabel = items[i].definition.text || '(image)';
    const card = selectedCards[i];
    const dir = config.direction === 'both' ? 'term-to-definition' : config.direction;
    const answerWith = dir === 'definition-to-term' ? 'term' : 'definition';
    const equivAnswers = getEquivalentAnswers(card, answerWith, cutGroups);
    const otherAnswers = equivAnswers.filter((a) => normalizeContent(a) !== normalizeContent(defLabel));
    const equivSuffix = otherAnswers.length > 0 ? ` (or ${otherAnswers.join(', ')})` : '';
    const ansText = `${i + 1}. ${termLabel} = ${defLabel}${equivSuffix}`;
    const h = await pdfText(doc, ansText, MARGIN, y, CONTENT_W, 10);
    y += h + 3;
  }

  addFooter(doc);
  doc.save(`studyflow-cut-and-glue-${slugify(title)}.pdf`);
}
