// src/lib/textAnalysis/smartStyle.ts
//
// Smart Text Styling Engine — analyzes Arabic text and applies
// editorial-quality formatting marks (bold, highlight, italic).
//
// Key principle: SEMANTIC marks, not visual. The mark stores
// { color: 'accent' } and the renderer resolves the actual color
// from the theme. Changing the theme changes all highlights.

import type { RichTextContent } from '@/types/album';
import {
  QUOTED_TEXT, NUMBER_WITH_UNIT, STANDALONE_YEAR,
  PARENTHETICAL, KEY_TERM,
} from './patterns';

// ─── Types ───────────────────────────────────────────────────

interface StyledSpan {
  start: number;
  end: number;
  mark: { type: string; attrs?: Record<string, string> };
  priority: number;
}

interface SmartStyleOptions {
  /** If true, return plain text (titles are already prominent) */
  isTitle?: boolean;
  /** Max bold spans per paragraph (default 2) */
  maxBold?: number;
  /** Max highlight spans per paragraph (default 1) */
  maxHighlight?: number;
}

type TextNode = {
  type: 'text';
  text: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
};

type DocNode = {
  type: string;
  content?: DocNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
};

// ─── Plain text helper ───────────────────────────────────────

function plainRichText(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content: text.trim() ? [{ type: 'text', text: text.trim() }] : [],
    }],
  };
}

// ─── Span detection ──────────────────────────────────────────

function detectSpans(text: string): StyledSpan[] {
  const spans: StyledSpan[] = [];

  // 1. Quoted text → highlight (highest priority)
  QUOTED_TEXT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = QUOTED_TEXT.exec(text)) !== null) {
    const innerStart = m.index + 1; // skip opening quote
    const innerEnd = m.index + m[0].length - 1; // skip closing quote
    spans.push({
      start: innerStart,
      end: innerEnd,
      mark: { type: 'highlight', attrs: { color: 'accent' } },
      priority: 10,
    });
  }

  // 2. Numbers with units → bold
  NUMBER_WITH_UNIT.lastIndex = 0;
  while ((m = NUMBER_WITH_UNIT.exec(text)) !== null) {
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      mark: { type: 'bold' },
      priority: 8,
    });
  }

  // 3. Standalone years → bold
  STANDALONE_YEAR.lastIndex = 0;
  while ((m = STANDALONE_YEAR.exec(text)) !== null) {
    // Skip if already inside a NUMBER_WITH_UNIT span
    const yearStart = m.index;
    const yearEnd = m.index + m[0].length;
    const alreadyCovered = spans.some(s =>
      s.mark.type === 'bold' && s.start <= yearStart && s.end >= yearEnd
    );
    if (!alreadyCovered) {
      spans.push({
        start: yearStart,
        end: yearEnd,
        mark: { type: 'bold' },
        priority: 7,
      });
    }
  }

  // 4. Key terms after indicator words → bold
  KEY_TERM.lastIndex = 0;
  while ((m = KEY_TERM.exec(text)) !== null) {
    // Bold the indicator + term together
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      mark: { type: 'bold' },
      priority: 6,
    });
  }

  // 5. Parentheticals → italic
  PARENTHETICAL.lastIndex = 0;
  while ((m = PARENTHETICAL.exec(text)) !== null) {
    spans.push({
      start: m.index,
      end: m.index + m[0].length,
      mark: { type: 'italic' },
      priority: 4,
    });
  }

  return spans;
}

// ─── Span filtering (enforce limits) ─────────────────────────

function filterSpans(
  spans: StyledSpan[],
  textLength: number,
  maxBold: number,
  maxHighlight: number,
): StyledSpan[] {
  // Sort by priority descending
  const sorted = [...spans].sort((a, b) => b.priority - a.priority);

  const selected: StyledSpan[] = [];
  let boldCount = 0;
  let highlightCount = 0;
  let boldChars = 0;
  const maxBoldChars = textLength * 0.3; // Never bold more than 30%

  for (const span of sorted) {
    // Check overlap with already selected
    const overlaps = selected.some(s =>
      span.start < s.end && span.end > s.start
    );
    if (overlaps) continue;

    if (span.mark.type === 'bold') {
      if (boldCount >= maxBold) continue;
      if (boldChars + (span.end - span.start) > maxBoldChars) continue;
      boldCount++;
      boldChars += span.end - span.start;
    } else if (span.mark.type === 'highlight') {
      if (highlightCount >= maxHighlight) continue;
      highlightCount++;
    }
    // Italic has no limit (parentheticals are structural)

    selected.push(span);
  }

  // Sort by position for building text nodes
  return selected.sort((a, b) => a.start - b.start);
}

// ─── Build marked paragraph ──────────────────────────────────

function buildMarkedParagraph(text: string, spans: StyledSpan[]): DocNode {
  if (spans.length === 0) {
    return {
      type: 'paragraph',
      content: text.trim() ? [{ type: 'text', text: text.trim() }] : [],
    };
  }

  const nodes: TextNode[] = [];
  let pos = 0;

  for (const span of spans) {
    // Text before this span
    if (span.start > pos) {
      const before = text.slice(pos, span.start);
      if (before) nodes.push({ type: 'text', text: before });
    }

    // The styled span
    const styledText = text.slice(span.start, span.end);
    if (styledText) {
      nodes.push({
        type: 'text',
        text: styledText,
        marks: [span.mark],
      });
    }

    pos = span.end;
  }

  // Remaining text after last span
  if (pos < text.length) {
    const after = text.slice(pos);
    if (after.trim()) nodes.push({ type: 'text', text: after });
  }

  return {
    type: 'paragraph',
    content: nodes.length > 0 ? nodes : [],
  };
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Analyze text and apply smart editorial styling.
 * Returns RichTextContent with bold, highlight, italic marks.
 *
 * @param text - Plain text input
 * @param options - Styling options
 */
export function applySmartStyle(
  text: string,
  options?: SmartStyleOptions,
): RichTextContent {
  const { isTitle = false, maxBold = 2, maxHighlight = 1 } = options ?? {};

  // Titles: return plain (already prominent via font size/color)
  if (isTitle || !text.trim()) {
    return plainRichText(text);
  }

  // Split into paragraphs (handle both \n and single block)
  const paragraphs = text.split('\n').filter(p => p.trim());

  const docContent: DocNode[] = paragraphs.map(para => {
    const trimmed = para.trim();

    // Skip very short paragraphs
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount < 8) {
      return {
        type: 'paragraph',
        content: [{ type: 'text', text: trimmed }],
      };
    }

    // Detect and filter spans
    const allSpans = detectSpans(trimmed);
    const selectedSpans = filterSpans(allSpans, trimmed.length, maxBold, maxHighlight);

    return buildMarkedParagraph(trimmed, selectedSpans);
  });

  return {
    type: 'doc',
    content: docContent,
  } as RichTextContent;
}
