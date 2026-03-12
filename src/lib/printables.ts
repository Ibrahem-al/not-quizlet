import type { Card } from '../types';
import { shuffle } from './algorithms';

export type AnswerDirection = 'term-to-definition' | 'definition-to-term' | 'both';

export interface PrintConfig {
  count: number;
  direction: AnswerDirection;
}

// --- Shared helpers ---

function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

function extractBase64Images(html: string): string[] {
  if (!html) return [];
  const matches = [...html.matchAll(/<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/gi)];
  return matches.map(m => m[1]);
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

/** Add multiple images stacked vertically, returns total height used */
async function addScaledImages(
  doc: JsPDFType,
  images: string[],
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  if (images.length === 0) return 0;
  const gap = 2;
  const perH = (maxH - gap * (images.length - 1)) / images.length;
  let totalH = 0;
  for (const img of images) {
    try {
      const h = await addScaledImage(doc, img, x, y + totalH, maxW, perH);
      totalH += h + gap;
    } catch { /* skip */ }
  }
  return Math.max(0, totalH - gap);
}

/** Parsed content from a card side: plain text + all image data URLs */
interface CardContent {
  text: string;
  images: string[];
}

function parseCardSide(html: string): CardContent {
  return {
    text: stripHtml(html),
    images: extractBase64Images(html),
  };
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
  const items = selectedCards.map((c) => {
    const dir = config.direction === 'both'
      ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
      : config.direction;
    const swapped = dir === 'definition-to-term';
    return {
      term: parseCardSide(swapped ? c.definition : c.term),
      definition: parseCardSide(swapped ? c.term : c.definition),
    };
  });

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
      const termLabel = term.text || '(image)';
      const defLabel = def.text || '(image)';
      const termLines = doc.splitTextToSize(`${i + 1}. ${termLabel}`, COL_LEFT_W);
      const defLines = doc.splitTextToSize(`${toLetter(i)}. ${defLabel}`, COL_RIGHT_W);
      const textRowH = Math.max(termLines.length, defLines.length) * 5;
      const termImgCount = term.images.length;
      const defImgCount = def.images.length;
      const hasImages = termImgCount > 0 || defImgCount > 0;
      const maxImgRows = Math.max(termImgCount, defImgCount);
      const rowHeight = textRowH + (hasImages ? (IMG_MAX_H + 2) * maxImgRows + 1 : 0) + 4;

      y = checkPageBreak(doc, y, rowHeight);

      doc.text(termLines, COL_LEFT_X, y);
      doc.text(defLines, COL_RIGHT_X, y);

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

  // Answer Key page
  doc.addPage();
  let y = addHeader(doc, 'Answer Key — Line Matching', title);
  doc.setFontSize(11);
  for (let i = 0; i < items.length; i++) {
    y = checkPageBreak(doc, y, 8);
    doc.text(`${i + 1} = ${answerKey[i]}`, MARGIN, y);
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
  shownAnswer?: string;
  shownAnswerImages?: string[];
  isTrue?: boolean;
}

export async function generateTestPDF(cards: Card[], title: string, config: PrintConfig): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');

  const selectedCards = cards.slice(0, Math.min(config.count, cards.length));

  const hasMC = selectedCards.length >= 4;
  const types: TestQuestion['type'][] = [];
  if (hasMC) types.push('written', 'mc', 'tf');
  else if (selectedCards.length >= 2) types.push('written', 'tf');
  else types.push('written');

  const questions: TestQuestion[] = selectedCards.map((card, i) => {
    const type = types[i % types.length];
    const dir = config.direction === 'both'
      ? (Math.random() > 0.5 ? 'term-to-definition' : 'definition-to-term')
      : config.direction;
    const swapped = dir === 'definition-to-term';

    const promptContent = parseCardSide(swapped ? card.definition : card.term);
    const answerContent = parseCardSide(swapped ? card.term : card.definition);
    const q: TestQuestion = { type, card, promptContent, answerContent, swapped };

    if (type === 'mc') {
      const others = shuffle(selectedCards.filter((c) => c.id !== card.id)).slice(0, 3);
      const wrongAnswers = others.map((c) => parseCardSide(swapped ? c.term : c.definition));
      const allEntries = shuffle([
        { text: answerContent.text || '(image)', imgs: answerContent.images, isCorrect: true },
        ...wrongAnswers.map((d) => ({ text: d.text || '(image)', imgs: d.images, isCorrect: false })),
      ]);
      q.options = allEntries.map((e) => e.text);
      q.optionImages = allEntries.map((e) => e.imgs);
      q.correctOptionIndex = allEntries.findIndex((e) => e.isCorrect);
    } else if (type === 'tf') {
      const isTrue = Math.random() > 0.5;
      if (isTrue) {
        q.shownAnswer = answerContent.text || '(image)';
        q.shownAnswerImages = answerContent.images;
        q.isTrue = true;
      } else {
        const wrongCard = shuffle(selectedCards.filter((c) => c.id !== card.id))[0];
        const wrongAnswer = parseCardSide(swapped ? wrongCard.term : wrongCard.definition);
        q.shownAnswer = wrongAnswer.text || '(image)';
        q.shownAnswerImages = wrongAnswer.images;
        q.isTrue = false;
      }
    }
    return q;
  });

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
      const promptLines = doc.splitTextToSize(prompt, CONTENT_W);
      const imgSpace = promptImgs.length > 0 ? (IMG_H_INLINE + 2) * promptImgs.length + 1 : 0;
      const needed = promptLines.length * 5 + imgSpace + 24;
      y = checkPageBreak(doc, y, needed);

      doc.setFont('helvetica', 'bold');
      doc.text(promptLines, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      y += promptLines.length * 5 + 2;

      if (promptImgs.length > 0) {
        const h = await addScaledImages(doc, promptImgs, MARGIN + 5, y, 40, (IMG_H_INLINE + 2) * promptImgs.length);
        y += h + 2;
      }
      y += 1;

      doc.setDrawColor(200, 200, 200);
      for (let line = 0; line < 3; line++) {
        doc.line(MARGIN + 5, y, PAGE_W - MARGIN, y);
        y += 7;
      }
      y += 4;

    } else if (q.type === 'mc') {
      const verb = q.swapped ? 'Which term matches' : 'What is the definition of';
      const prompt = `${i + 1}. ${verb} "${promptLabel}"?`;
      const promptLines = doc.splitTextToSize(prompt, CONTENT_W);
      const imgSpace = promptImgs.length > 0 ? (IMG_H_INLINE + 2) * promptImgs.length + 1 : 0;
      const optImgCount = q.optionImages?.reduce((s, imgs) => s + imgs.length, 0) ?? 0;
      const optionLines = q.options!.map((opt) => doc.splitTextToSize(opt, CONTENT_W - 15));
      const needed = promptLines.length * 5 + imgSpace + optionLines.reduce((s, l) => s + l.length * 5 + 2, 0) + optImgCount * (IMG_H_INLINE + 2) + 8;
      y = checkPageBreak(doc, y, needed);

      doc.setFont('helvetica', 'bold');
      doc.text(promptLines, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      y += promptLines.length * 5 + 2;

      if (promptImgs.length > 0) {
        const h = await addScaledImages(doc, promptImgs, MARGIN + 5, y, 40, (IMG_H_INLINE + 2) * promptImgs.length);
        y += h + 2;
      }
      y += 1;

      const optionLetters = ['a', 'b', 'c', 'd'];
      for (let j = 0; j < q.options!.length; j++) {
        doc.circle(MARGIN + 5, y - 1.2, 2);
        const optText = doc.splitTextToSize(`${optionLetters[j]})  ${q.options![j]}`, CONTENT_W - 15);
        doc.text(optText, MARGIN + 10, y);
        y += optText.length * 5 + 1;

        const optImgs = q.optionImages?.[j];
        if (optImgs && optImgs.length > 0) {
          const h = await addScaledImages(doc, optImgs, MARGIN + 15, y, 30, (IMG_H_INLINE - 4 + 2) * optImgs.length);
          y += h + 2;
        }
        y += 1;
      }
      y += 4;

    } else if (q.type === 'tf') {
      const prompt = q.swapped
        ? `${i + 1}. True or False: "${q.shownAnswer}" is the term for "${promptLabel}"`
        : `${i + 1}. True or False: "${promptLabel}" means "${q.shownAnswer}"`;
      const promptLines = doc.splitTextToSize(prompt, CONTENT_W);
      const shownAnswerImgs = q.shownAnswerImages ?? [];
      const totalImgCount = promptImgs.length + shownAnswerImgs.length;
      const hasAnyImg = totalImgCount > 0;
      const maxImgSide = Math.max(promptImgs.length, shownAnswerImgs.length);
      const imgSpace = hasAnyImg ? (IMG_H_INLINE + 2) * maxImgSide + 1 : 0;
      const needed = promptLines.length * 5 + imgSpace + 12;
      y = checkPageBreak(doc, y, needed);

      doc.setFont('helvetica', 'bold');
      doc.text(promptLines, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      y += promptLines.length * 5 + 2;

      if (hasAnyImg) {
        const imgY = y;
        const totalImgH = (IMG_H_INLINE + 2) * maxImgSide;
        if (promptImgs.length > 0) {
          await addScaledImages(doc, promptImgs, MARGIN + 5, imgY, 30, totalImgH);
        }
        if (shownAnswerImgs.length > 0) {
          await addScaledImages(doc, shownAnswerImgs, MARGIN + 50, imgY, 30, totalImgH);
        }
        y += totalImgH + 2;
      }

      doc.circle(MARGIN + 10, y - 1.2, 2.5);
      doc.text('True', MARGIN + 15, y);
      doc.circle(MARGIN + 40, y - 1.2, 2.5);
      doc.text('False', MARGIN + 45, y);
      y += 10;
    }
  }

  // Answer Key page
  doc.addPage();
  y = addHeader(doc, 'Answer Key — Test', title);
  doc.setFontSize(10);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ansLabel = q.answerContent.text || '(image)';
    const ansImgs = q.answerContent.images;
    let answer = '';
    if (q.type === 'written') {
      answer = ansLabel;
    } else if (q.type === 'mc') {
      answer = `${['a', 'b', 'c', 'd'][q.correctOptionIndex!]}) ${ansLabel}`;
    } else if (q.type === 'tf') {
      answer = q.isTrue ? 'True' : 'False';
    }
    const showAnsImgs = ansImgs.length > 0 && (q.type === 'written' || q.type === 'mc');
    const imgSpace = showAnsImgs ? (IMG_H_INLINE + 2) * ansImgs.length : 0;
    y = checkPageBreak(doc, y, 12 + imgSpace);
    const answerLines = doc.splitTextToSize(`${i + 1}. ${answer}`, CONTENT_W);
    doc.text(answerLines, MARGIN, y);
    y += answerLines.length * 5 + 1;

    if (showAnsImgs) {
      const h = await addScaledImages(doc, ansImgs, MARGIN + 10, y, 30, (IMG_H_INLINE - 4 + 2) * ansImgs.length);
      y += h + 2;
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
      const topContent = parseCardSide(swapped ? card.definition : card.term);
      const bottomContent = parseCardSide(swapped ? card.term : card.definition);

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
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    let lines = doc.splitTextToSize(content.text, maxW);
    while (lines.length * 4 > textH && fontSize > 7) {
      fontSize--;
      doc.setFontSize(fontSize);
      lines = doc.splitTextToSize(content.text, maxW);
    }
    doc.text(lines, x, y + 2);
    const textBottom = y + Math.min(lines.length * (fontSize * 0.42) + 2, textH);

    await addScaledImages(doc, content.images, x, textBottom + 1, maxW - 2, imgH);

  } else if (hasImages) {
    // Images only — render stacked
    await addScaledImages(doc, content.images, x, y + 1, maxW - 2, maxH - 2);

  } else {
    // Text only — vertically center
    let fontSize = bold ? 10 : 9;
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    let lines = doc.splitTextToSize(content.text || '(empty)', maxW);
    while (lines.length * 4.5 > maxH - 2 && fontSize > 7) {
      fontSize--;
      doc.setFontSize(fontSize);
      lines = doc.splitTextToSize(content.text || '(empty)', maxW);
    }
    const blockH = lines.length * (fontSize * 0.42);
    const startY = y + Math.max(0, (maxH - blockH) / 2);
    doc.text(lines, x, startY);
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
  selectedCards.forEach((card, i) => {
    const term = parseCardSide(card.term);
    const def = parseCardSide(card.definition);
    tiles.push({ text: term.text, type: 'T', matchNum: i + 1, images: term.images });
    tiles.push({ text: def.text, type: 'D', matchNum: i + 1, images: def.images });
  });

  const shuffledTiles = shuffle(tiles);

  const COLS = 3;
  const ROWS = 5;
  const TILES_PER_PAGE = COLS * ROWS;
  const GAP_X = 4;
  const GAP_Y = 4;
  const TILE_W = (CONTENT_W - GAP_X * (COLS - 1)) / COLS;
  const TILE_H = 35;

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
        // Text on top, images below
        const textH = contentH * 0.35;
        const imgH = contentH * 0.6;
        let fontSize = 8;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', tile.type === 'T' ? 'bold' : 'normal');
        let textLines = doc.splitTextToSize(tile.text, innerW);
        while (textLines.length * 3.5 > textH && fontSize > 6) {
          fontSize--;
          doc.setFontSize(fontSize);
          textLines = doc.splitTextToSize(tile.text, innerW);
        }
        doc.text(textLines, x + TILE_W / 2, contentY, { align: 'center' });
        const textBottom = contentY + textLines.length * (fontSize * 0.42) + 1;

        // Render all images stacked, centered horizontally
        const gap = 1.5;
        const perImgH = (imgH - gap * (tile.images.length - 1)) / tile.images.length;
        let imgYOff = textBottom;
        for (const img of tile.images) {
          try {
            const { w: natW, h: natH } = await loadImageSize(img);
            const { w: imgW, h: imgRH } = fitImage(natW, natH, innerW - 4, perImgH);
            const imgX = x + (TILE_W - imgW) / 2;
            const fmt = getImageFormat(img);
            doc.addImage(img, fmt, imgX, imgYOff, imgW, imgRH);
            imgYOff += imgRH + gap;
          } catch { /* skip */ }
        }

      } else if (hasImages) {
        // Images only — stack centered in cell
        const gap = 1.5;
        const totalImgH = contentH - 2;
        const perImgH = (totalImgH - gap * (tile.images.length - 1)) / tile.images.length;
        let imgYOff = contentY + 1;
        for (const img of tile.images) {
          try {
            const { w: natW, h: natH } = await loadImageSize(img);
            const { w: imgW, h: imgH2 } = fitImage(natW, natH, innerW - 2, perImgH);
            const imgX = x + (TILE_W - imgW) / 2;
            const fmt = getImageFormat(img);
            doc.addImage(img, fmt, imgX, imgYOff, imgW, imgH2);
            imgYOff += imgH2 + gap;
          } catch { /* skip */ }
        }

      } else {
        // Text only
        let fontSize = 9;
        doc.setFontSize(fontSize);
        let textLines = doc.splitTextToSize(tile.text || '(empty)', innerW);
        while (textLines.length * 4 > contentH && fontSize > 6) {
          fontSize--;
          doc.setFontSize(fontSize);
          textLines = doc.splitTextToSize(tile.text || '(empty)', innerW);
        }
        if (textLines.length * 4 > contentH) {
          const maxLines = Math.floor(contentH / 4);
          textLines = textLines.slice(0, maxLines);
          textLines[maxLines - 1] = textLines[maxLines - 1].substring(0, textLines[maxLines - 1].length - 3) + '...';
        }
        const blockH = textLines.length * (fontSize * 0.42);
        const textY = contentY + Math.max(0, (contentH - blockH) / 2);
        doc.setFont('helvetica', tile.type === 'T' ? 'bold' : 'normal');
        doc.text(textLines, x + TILE_W / 2, textY, { align: 'center' });
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
