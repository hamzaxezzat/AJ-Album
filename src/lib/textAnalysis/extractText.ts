// src/lib/textAnalysis/extractText.ts
// Shared utility to extract plain text from RichTextContent.

type DocNode = { type: string; text?: string; content?: DocNode[] };

export function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const doc = content as DocNode;
  if (doc.type === 'text') return doc.text ?? '';
  if (!doc.content) return '';
  const parts = doc.content.map(n => extractPlainText(n));
  // Add newlines between paragraphs
  if (doc.type === 'doc') return parts.join('\n').trim();
  return parts.join('');
}
