// src/lib/kashida/kashidaEngine.ts
//
// Arabic Kashida Engine — inserts tatweel characters (ـ U+0640)
// at typographically correct positions in Arabic text.
//
// Based on the KashidaPro algorithm by Othman Ahmed.
// Adapted from Photoshop CEP to web/TypeScript.
//
// Usage: applyKashida("وُلد علي عبد اللهي عام") → "وُلـد عـلي عبـد الـلهي عـام"

const TATWEEL = '\u0640'; // ـ

// ─── Arabic character sets ───────────────────────────────────

// Disconnected letters — NEVER place kashida after these
const DISCONNECTED = new Set([
  '\u0627', '\u0623', '\u0625', '\u0622', // ا أ إ آ
  '\u0671', // ٱ Alef Wasla
  '\u062F', '\u0630', // د ذ
  '\u0631', '\u0632', // ر ز
  '\u0648', // و
  '\u0649', '\u0698', // ى ژ
]);

// Priority groups for placement quality
const PRIORITY1_AFTER = new Set(['\u0633', '\u0634', '\u0635', '\u0636']); // س ش ص ض
const PRIORITY2_BEFORE = new Set(['\u062F', '\u0647', '\u0629', '\u062A']); // د هـ ة ت
const PRIORITY3_BEFORE = new Set(['\u0627', '\u0623', '\u0625', '\u0622', '\u0643']); // ا أ إ آ ك
const PRIORITY4_BEFORE = new Set(['\u0641', '\u0642', '\u0639', '\u0648']); // ف ق ع و
const TOOTHED = new Set(['\u0628', '\u062A', '\u062B', '\u0646', '\u064A']); // ب ت ث ن ي
const ROUNDED = new Set(['\u0645', '\u0641', '\u0642']); // م ف ق
const EXTENDABLE = new Set([
  '\u0643', '\u0644', '\u0633', '\u0634', '\u0645',
  '\u0637', '\u0638', '\u0639', '\u063A', '\u0635', '\u0636',
  '\u0642', '\u064A', '\u0646', '\u062D', '\u062C', '\u062E',
  '\u0647', '\u0628', '\u062A', '\u062B', '\u0641',
]);

// Short words that should NEVER get kashida
const FORBIDDEN_WORDS = new Set([
  'على', 'إلى', 'الى', 'إلا', 'الا', 'هذا', 'هذه', 'ذلك', 'تلك',
  'عن', 'من', 'ما', 'لا', 'أن', 'إن', 'أو', 'في', 'كل', 'كان',
  'له', 'لك', 'لي', 'بك', 'بي', 'هو', 'هي', 'أنا', 'نحن', 'هم',
  'بل', 'ثم', 'حتى', 'لم', 'لن', 'قد', 'بين', 'عند', 'بعد',
]);

const LAM = '\u0644';
const ALEFS = new Set(['\u0627', '\u0623', '\u0625', '\u0622']);

// ─── Helpers ─────────────────────────────────────────────────

function isArabic(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 0x0600 && code <= 0x06FF) ||
    (code >= 0x0750 && code <= 0x077F) ||
    (code >= 0x08A0 && code <= 0x08FF) ||
    (code >= 0xFB50 && code <= 0xFDFF) ||
    (code >= 0xFE70 && code <= 0xFEFF);
}

function isDiacritic(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 0x064B && code <= 0x0652) ||
    (code >= 0x0653 && code <= 0x065F) ||
    code === 0x0670;
}

function removeDiacritics(text: string): string {
  return text.replace(/[\u064B-\u0652\u0653-\u065F\u0670]/g, '');
}

function isPunctuation(ch: string): boolean {
  return '.,;:!?\u060C\u061B\u061F-_()[]{}"\'\u00AB\u00BB\u2018\u2019\u201C\u201D'.includes(ch);
}

// ─── Placement rules ─────────────────────────────────────────

function canPlaceKashida(word: string, pos: number): boolean {
  if (pos < 1 || pos >= word.length - 1) return false;

  const clean = removeDiacritics(word.trim());
  if (FORBIDDEN_WORDS.has(clean)) return false;
  if (clean.length < 3) return false;

  const current = word[pos];
  const next = word[pos + 1];

  if (!isArabic(current) || !isArabic(next)) return false;
  if (isDiacritic(current) || isDiacritic(next)) return false;
  if (isPunctuation(current) || isPunctuation(next)) return false;
  if (DISCONNECTED.has(current)) return false;

  // No kashida after/before lam
  if (current === LAM || next === LAM) return false;

  // No kashida in lam-alef ligature
  if ((ALEFS.has(current) && next === LAM) || (current === LAM && ALEFS.has(next))) return false;

  // No kashida before ya or ta marbuta at end
  if (next === '\u064A' || next === '\u0629') return false;

  // No kashida in ال prefix
  if (word.length > 2 && pos <= 2) {
    const first = removeDiacritics(word[0]);
    const second = removeDiacritics(word[1]);
    if (ALEFS.has(first) && second === LAM && pos <= 2) return false;
  }

  // No kashida after existing tatweel
  if (current === TATWEEL || next === TATWEEL) return false;

  return true;
}

function getPositionPriority(word: string, pos: number): number {
  if (!canPlaceKashida(word, pos)) return -1;

  const current = word[pos];
  const next = word[pos + 1];
  let priority = 1;

  // Priority 1: after س ش ص ض (best positions)
  if (PRIORITY1_AFTER.has(current)) priority += 10;
  // Priority 2: before د هـ ة ت
  if (PRIORITY2_BEFORE.has(next)) priority += 8;
  // Priority 3: before ا أ إ آ ك
  if (PRIORITY3_BEFORE.has(next)) priority += 6;
  // Priority 4: before ف ق ع و
  if (PRIORITY4_BEFORE.has(next)) priority += 4;
  // Toothed + toothed or rounded + rounded
  if (TOOTHED.has(current) && TOOTHED.has(next)) priority += 3;
  if (ROUNDED.has(current) && ROUNDED.has(next)) priority += 3;
  // Near end of word
  if (pos === word.length - 2) priority += 2;
  // Extendable letter
  if (EXTENDABLE.has(current)) priority += 2;
  // Prefer middle of word
  const distFromEdge = Math.min(pos, word.length - pos - 1);
  priority += distFromEdge * 0.1;

  return priority;
}

// ─── Core algorithm ──────────────────────────────────────────

function findBestPositions(word: string, maxPositions: number): number[] {
  const candidates: { pos: number; priority: number }[] = [];

  for (let i = 0; i < word.length - 1; i++) {
    const priority = getPositionPriority(word, i);
    if (priority > 0) {
      candidates.push({ pos: i, priority });
    }
  }

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  // Take top N positions, then sort by position ascending
  return candidates
    .slice(0, maxPositions)
    .map(c => c.pos)
    .sort((a, b) => a - b);
}

function insertTatweelInWord(word: string, count: number, maxPerWord: number): string {
  const positions = findBestPositions(word, maxPerWord);
  if (positions.length === 0 || count <= 0) return word;

  const perPos = Math.floor(count / positions.length);
  const remainder = count % positions.length;

  const parts: string[] = [];
  let lastIdx = 0;

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    parts.push(word.substring(lastIdx, pos + 1));
    const n = perPos + (i < remainder ? 1 : 0);
    parts.push(TATWEEL.repeat(n));
    lastIdx = pos + 1;
  }
  parts.push(word.substring(lastIdx));

  return parts.join('');
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Apply kashida to Arabic text by inserting tatweel characters.
 *
 * @param text - The input Arabic text
 * @param intensity - 1-3: how many tatweels per eligible position (default 1)
 * @param maxPerWord - Max positions per word to place kashida (default 2)
 * @returns Text with tatweel characters inserted
 */
export function applyKashida(
  text: string,
  intensity: number = 1,
  maxPerWord: number = 2,
): string {
  // First strip any existing tatweels to avoid doubling
  const clean = text.replace(new RegExp(TATWEEL, 'g'), '');

  const words = clean.split(/(\s+)/); // Keep whitespace as separators
  const result: string[] = [];

  for (const segment of words) {
    // Whitespace or non-Arabic — pass through
    if (/^\s+$/.test(segment) || !hasArabicWord(segment)) {
      result.push(segment);
      continue;
    }

    result.push(insertTatweelInWord(segment, intensity, maxPerWord));
  }

  return result.join('');
}

function hasArabicWord(word: string): boolean {
  for (const ch of word) {
    if (isArabic(ch)) return true;
  }
  return false;
}

/**
 * Strip all tatweel characters from text.
 */
export function stripKashida(text: string): string {
  return text.replace(new RegExp(TATWEEL, 'g'), '');
}
