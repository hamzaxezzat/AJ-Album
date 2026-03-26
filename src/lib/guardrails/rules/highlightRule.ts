// src/lib/guardrails/rules/highlightRule.ts
// Soft warning: more than 2 highlight colors used per slide

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue, RichTextContent } from '@/types/album';

type Mark = { type: string; attrs?: Record<string, string> };
type DocNode = {
  type: string;
  text?: string;
  content?: DocNode[];
  marks?: Mark[];
};

/**
 * Collect unique highlight colors used in a TipTap doc.
 */
function collectHighlightColors(content: RichTextContent | undefined | null): Set<string> {
  const colors = new Set<string>();
  if (!content || content.type !== 'doc') return colors;

  function walk(node: DocNode) {
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'highlight' && mark.attrs?.color) {
          colors.add(mark.attrs.color.toLowerCase());
        }
      }
    }
    if (node.content) {
      for (const child of node.content) walk(child);
    }
  }

  for (const node of (content.content ?? []) as DocNode[]) walk(node);
  return colors;
}

export const highlightRule: GuardrailRule = {
  id: 'excessive-highlights',
  name: 'ألوان التظليل',
  category: 'typography',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const allColors = new Set<string>();

    for (const block of ctx.slide.blocks) {
      if (!block.visible) continue;
      if (!('content' in block)) continue;

      const content = (block as { content?: RichTextContent }).content;
      const colors = collectHighlightColors(content);
      for (const c of colors) allColors.add(c);
    }

    if (allColors.size > 2) {
      return [{
        id: `${this.id}-${ctx.slide.id}`,
        severity: 'warning',
        slideId: ctx.slide.id,
        message: `${allColors.size} ألوان تظليل مستخدمة في الشريحة — يُفضل ألا تتجاوز 2`,
        autoFixAvailable: false,
      }];
    }

    return [];
  },
};
