// src/lib/guardrails/rules/overflowRule.ts
// Soft warning: text content likely overflows its block bounds

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue, TypographyProfile, RichTextContent } from '@/types/album';

type DocNode = {
  type: string;
  text?: string;
  content?: DocNode[];
};

/** Rough character count from a TipTap/ProseMirror JSON doc. */
function countChars(content: RichTextContent | undefined | null): number {
  if (!content || content.type !== 'doc') return 0;
  let count = 0;
  function walk(node: DocNode) {
    if (node.type === 'text' && node.text) {
      count += node.text.length;
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }
  for (const node of (content.content ?? []) as DocNode[]) walk(node);
  return count;
}

/** Rough line count from a TipTap doc (paragraphs + list items). */
function countLines(content: RichTextContent | undefined | null): number {
  if (!content || content.type !== 'doc') return 0;
  let lines = 0;
  function walk(node: DocNode) {
    if (node.type === 'paragraph' || node.type === 'listItem') {
      lines++;
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }
  for (const node of (content.content ?? []) as DocNode[]) walk(node);
  return Math.max(lines, 1);
}

export const overflowRule: GuardrailRule = {
  id: 'text-overflow',
  name: 'تجاوز النص',
  category: 'layout',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const issues: GuardrailIssue[] = [];

    for (const block of ctx.slide.blocks) {
      if (!block.visible) continue;

      // Only check text blocks
      if (!('content' in block)) continue;
      const content = (block as { content?: RichTextContent }).content;
      if (!content) continue;

      const charCount = countChars(content);
      const lineCount = countLines(content);
      if (charCount === 0) continue;

      // Get font size for this block
      let fontSize = 28; // default body-m
      if ('typographyTokenRef' in block) {
        const ref = (block as { typographyTokenRef: string }).typographyTokenRef;
        const token = ctx.tokens.typography[ref as keyof TypographyProfile];
        fontSize = block.styleOverrides?.fontSize ?? token?.fontSize ?? 28;
      }

      // Estimate how many characters can fit in the block
      // Average Arabic character width ~ 0.5 * fontSize (rough heuristic)
      const blockWidthPx = block.position.width * ctx.tokens.canvasWidth;
      const blockHeightPx = block.position.height * ctx.tokens.canvasHeight;

      const charsPerLine = Math.floor(blockWidthPx / (fontSize * 0.45));
      const lineHeight = 1.7; // default line-height
      const maxLines = Math.floor(blockHeightPx / (fontSize * lineHeight));

      // Estimate actual lines needed
      const estimatedLines = Math.max(lineCount, Math.ceil(charCount / Math.max(charsPerLine, 1)));

      if (estimatedLines > maxLines && maxLines > 0) {
        issues.push({
          id: `${this.id}-${block.id}`,
          severity: 'warning',
          slideId: ctx.slide.id,
          blockId: block.id,
          message: `النص قد يتجاوز حدود الكتلة (~${estimatedLines} سطر في مساحة ~${maxLines} سطر)`,
          autoFixAvailable: true,
          autoFixDescription: 'تصغير حجم الخط لاستيعاب النص',
        });
      }
    }

    return issues;
  },
};
