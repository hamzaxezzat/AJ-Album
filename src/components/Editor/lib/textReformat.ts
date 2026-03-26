import type { RichTextContent } from '@/types/album';

type DocNode = { type: string; text?: string; content?: DocNode[]; marks?: unknown[]; attrs?: Record<string, unknown> };

/** Extract all text nodes from any ProseMirror structure. */
function collectTextLines(content: RichTextContent): string[] {
  const lines: string[] = [];

  function walk(node: DocNode): void {
    if (node.type === 'text' && node.text) {
      lines.push(node.text);
    } else if (node.type === 'paragraph') {
      const texts: string[] = [];
      for (const child of node.content ?? []) {
        if (child.type === 'text' && child.text) texts.push(child.text);
      }
      if (texts.length > 0) lines.push(texts.join(''));
    } else if (node.type === 'listItem') {
      // Recurse into list item paragraphs
      for (const child of node.content ?? []) walk(child);
    } else if (node.content) {
      for (const child of node.content) walk(child);
    }
  }

  for (const node of (content.content ?? []) as DocNode[]) {
    walk(node);
  }

  return lines.filter(Boolean);
}

function makeParagraph(text: string): DocNode {
  return {
    type: 'paragraph',
    content: text.trim() ? [{ type: 'text', text: text.trim() }] : [],
  };
}

/** Convert paragraphs/plain text → bullet list. */
export function toBulletList(content: RichTextContent): RichTextContent {
  const lines = collectTextLines(content);
  if (lines.length === 0) return content;

  return {
    type: 'doc',
    content: [{
      type: 'bulletList',
      content: lines.map(line => ({
        type: 'listItem',
        content: [makeParagraph(line)],
      })),
    }],
  };
}

/** Convert paragraphs/plain text → ordered (numbered) list. */
export function toOrderedList(content: RichTextContent): RichTextContent {
  const lines = collectTextLines(content);
  if (lines.length === 0) return content;

  return {
    type: 'doc',
    content: [{
      type: 'orderedList',
      attrs: { start: 1 },
      content: lines.map(line => ({
        type: 'listItem',
        content: [makeParagraph(line)],
      })),
    }],
  };
}

/** Flatten any structure (lists, etc.) back to plain paragraphs. */
export function toPlainParagraphs(content: RichTextContent): RichTextContent {
  const lines = collectTextLines(content);
  if (lines.length === 0) return content;

  return {
    type: 'doc',
    content: lines.map(line => makeParagraph(line)),
  };
}

/** Split text by Arabic sentence delimiters into separate paragraphs. */
export function splitBySentences(content: RichTextContent): RichTextContent {
  const lines = collectTextLines(content);
  const fullText = lines.join(' ');
  if (!fullText.trim()) return content;

  // Split by Arabic sentence-ending punctuation, keeping the delimiter with the sentence
  const sentences = fullText
    .split(/(?<=[.،؟!؛])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return content;

  return {
    type: 'doc',
    content: sentences.map(s => makeParagraph(s)),
  };
}
