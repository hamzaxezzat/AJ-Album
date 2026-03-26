// src/components/Editor/lib/textReformat.test.ts
import { describe, it, expect } from 'vitest';
import { toBulletList, toOrderedList, toPlainParagraphs, splitBySentences } from './textReformat';
import type { RichTextContent } from '@/types/album';

// ─── Helpers ─────────────────────────────────────────────────

function makeDoc(...paragraphs: string[]): RichTextContent {
  return {
    type: 'doc',
    content: paragraphs.map(text => ({
      type: 'paragraph',
      content: text ? [{ type: 'text', text }] : [],
    })),
  };
}

function makeBulletList(...items: string[]): RichTextContent {
  return {
    type: 'doc',
    content: [{
      type: 'bulletList',
      content: items.map(text => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
      })),
    }],
  };
}

function getTextFromDoc(doc: RichTextContent): string[] {
  const texts: string[] = [];
  function walk(node: unknown) {
    const n = node as { type: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && n.text) texts.push(n.text);
    if (n.content) n.content.forEach(walk);
  }
  (doc.content as unknown[]).forEach(walk);
  return texts;
}

// ─── toBulletList ────────────────────────────────────────────

describe('toBulletList', () => {
  it('converts paragraphs to bullet list items', () => {
    const input = makeDoc('السطر الأول', 'السطر الثاني', 'السطر الثالث');
    const result = toBulletList(input);

    const listNode = result.content[0] as { type: string; content: unknown[] };
    expect(listNode.type).toBe('bulletList');
    expect(listNode.content).toHaveLength(3);
  });

  it('preserves text content', () => {
    const input = makeDoc('نص عربي', 'English text');
    const result = toBulletList(input);
    const texts = getTextFromDoc(result);
    expect(texts).toContain('نص عربي');
    expect(texts).toContain('English text');
  });

  it('returns original content for empty document', () => {
    const emptyDoc: RichTextContent = { type: 'doc', content: [] };
    const result = toBulletList(emptyDoc);
    expect(result.content).toHaveLength(0);
  });

  it('converts existing bullet list back to bullet list (idempotent text)', () => {
    const input = makeBulletList('عنصر أول', 'عنصر ثاني');
    const result = toBulletList(input);
    const texts = getTextFromDoc(result);
    expect(texts).toContain('عنصر أول');
    expect(texts).toContain('عنصر ثاني');
  });
});

// ─── toOrderedList ───────────────────────────────────────────

describe('toOrderedList', () => {
  it('converts paragraphs to ordered list', () => {
    const input = makeDoc('الأول', 'الثاني', 'الثالث');
    const result = toOrderedList(input);

    const listNode = result.content[0] as { type: string; attrs?: { start: number }; content: unknown[] };
    expect(listNode.type).toBe('orderedList');
    expect(listNode.attrs?.start).toBe(1);
    expect(listNode.content).toHaveLength(3);
  });

  it('preserves Arabic text content', () => {
    const input = makeDoc('الحرس الثوري', 'سلاح البر');
    const result = toOrderedList(input);
    const texts = getTextFromDoc(result);
    expect(texts).toContain('الحرس الثوري');
    expect(texts).toContain('سلاح البر');
  });
});

// ─── toPlainParagraphs ───────────────────────────────────────

describe('toPlainParagraphs', () => {
  it('flattens bullet list to plain paragraphs', () => {
    const input = makeBulletList('عنصر أول', 'عنصر ثاني');
    const result = toPlainParagraphs(input);

    expect(result.content).toHaveLength(2);
    for (const node of result.content) {
      expect((node as { type: string }).type).toBe('paragraph');
    }
  });

  it('preserves text content when flattening', () => {
    const input = makeBulletList('نص واحد', 'نص اثنين');
    const result = toPlainParagraphs(input);
    const texts = getTextFromDoc(result);
    expect(texts).toContain('نص واحد');
    expect(texts).toContain('نص اثنين');
  });

  it('passes through already-plain paragraphs', () => {
    const input = makeDoc('فقرة عادية');
    const result = toPlainParagraphs(input);
    const texts = getTextFromDoc(result);
    expect(texts).toContain('فقرة عادية');
  });
});

// ─── splitBySentences ────────────────────────────────────────

describe('splitBySentences', () => {
  it('splits Arabic text by sentence-ending punctuation', () => {
    const input = makeDoc('الجملة الأولى. الجملة الثانية. الجملة الثالثة');
    const result = splitBySentences(input);
    expect(result.content.length).toBe(3);
  });

  it('splits by Arabic comma (،)', () => {
    const input = makeDoc('الأولى، الثانية، الثالثة');
    const result = splitBySentences(input);
    expect(result.content.length).toBe(3);
  });

  it('splits by Arabic question mark (؟)', () => {
    const input = makeDoc('هل هذا سؤال؟ نعم هذا جواب');
    const result = splitBySentences(input);
    expect(result.content.length).toBe(2);
  });

  it('returns original if only one sentence', () => {
    const input = makeDoc('جملة واحدة فقط');
    const result = splitBySentences(input);
    // Single sentence returns original
    expect(result).toBe(input);
  });

  it('handles empty content gracefully', () => {
    const input = makeDoc('');
    const result = splitBySentences(input);
    expect(result).toBe(input);
  });
});
