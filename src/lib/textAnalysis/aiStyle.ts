// src/lib/textAnalysis/aiStyle.ts
//
// AI-powered text styling — calls /api/analyze-text to get
// formatting decisions from Claude, then builds RichTextContent.

import type { RichTextContent } from '@/types/album';

interface Segment {
  text: string;
  style: 'regular' | 'bold' | 'highlight' | 'italic' | 'bold_highlight';
}

interface AnalysisResult {
  paragraphs: Array<{ segments: Segment[] }>;
}

function segmentsToDocNode(segments: Segment[]) {
  const content = segments.map(seg => {
    const marks: Array<{ type: string; attrs?: Record<string, string> }> = [];
    if (seg.style === 'bold') marks.push({ type: 'bold' });
    if (seg.style === 'highlight') marks.push({ type: 'highlight', attrs: { color: 'accent' } });
    if (seg.style === 'italic') marks.push({ type: 'italic' });
    if (seg.style === 'bold_highlight') {
      marks.push({ type: 'bold' });
      marks.push({ type: 'highlight', attrs: { color: 'accent' } });
    }

    return marks.length > 0
      ? { type: 'text' as const, text: seg.text, marks }
      : { type: 'text' as const, text: seg.text };
  });

  return { type: 'paragraph' as const, content };
}

/**
 * Analyze text using AI and return styled RichTextContent.
 * Falls back to plain text if AI fails.
 */
export async function applyAIStyle(
  text: string,
  options?: { isTitle?: boolean },
): Promise<RichTextContent> {
  const plain: RichTextContent = {
    type: 'doc',
    content: [{ type: 'paragraph', content: text.trim() ? [{ type: 'text', text: text.trim() }] : [] }],
  };

  if (!text.trim() || options?.isTitle) return plain;

  try {
    const res = await fetch('/api/analyze-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, isTitle: options?.isTitle }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return plain;

    const result: AnalysisResult = await res.json();
    if (!result.paragraphs?.length) return plain;

    const docContent = result.paragraphs.map(p => segmentsToDocNode(p.segments));

    return { type: 'doc', content: docContent } as RichTextContent;
  } catch {
    // AI unavailable — return plain text
    return plain;
  }
}
