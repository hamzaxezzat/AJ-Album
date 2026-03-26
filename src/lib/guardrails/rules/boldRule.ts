// src/lib/guardrails/rules/boldRule.ts
// Soft warning: more than 40% of body text is bold

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue, RichTextContent } from '@/types/album';

type Mark = { type: string };
type DocNode = {
  type: string;
  text?: string;
  content?: DocNode[];
  marks?: Mark[];
};

/**
 * Count total characters and bold characters in a TipTap doc.
 */
function countBoldRatio(content: RichTextContent | undefined | null): { total: number; bold: number } {
  if (!content || content.type !== 'doc') return { total: 0, bold: 0 };

  let total = 0;
  let bold = 0;

  function walk(node: DocNode) {
    if (node.type === 'text' && node.text) {
      const len = node.text.length;
      total += len;
      if (node.marks?.some(m => m.type === 'bold')) {
        bold += len;
      }
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }

  for (const node of (content.content ?? []) as DocNode[]) walk(node);
  return { total, bold };
}

export const boldRule: GuardrailRule = {
  id: 'excessive-bold',
  name: 'إفراط في النص العريض',
  category: 'typography',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const issues: GuardrailIssue[] = [];

    for (const block of ctx.slide.blocks) {
      if (!block.visible) continue;
      if (block.type !== 'body_paragraph') continue;

      const content = (block as { content?: RichTextContent }).content;
      const { total, bold } = countBoldRatio(content);

      if (total > 0 && bold / total > 0.4) {
        const pct = Math.round((bold / total) * 100);
        issues.push({
          id: `${this.id}-${block.id}`,
          severity: 'warning',
          slideId: ctx.slide.id,
          blockId: block.id,
          message: `${pct}% من نص الفقرة عريض — يُفضل ألا يتجاوز 40%`,
          autoFixAvailable: false,
        });
      }
    }

    return issues;
  },
};
