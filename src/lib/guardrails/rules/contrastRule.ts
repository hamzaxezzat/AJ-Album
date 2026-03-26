// src/lib/guardrails/rules/contrastRule.ts
// Hard stop: text-background contrast ratio must be >= 3:1 (WCAG AA large text)

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue } from '@/types/album';

/**
 * Convert hex color to relative luminance (WCAG 2.1 formula).
 */
function hexToLuminance(hex: string): number {
  const c = (hex ?? '#000000').replace('#', '');
  if (c.length < 6) return 0;
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculate WCAG contrast ratio between two colors.
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const contrastRule: GuardrailRule = {
  id: 'contrast-ratio',
  name: 'نسبة التباين',
  category: 'accessibility',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const issues: GuardrailIssue[] = [];
    const bg = ctx.tokens.background;

    for (const block of ctx.slide.blocks) {
      if (!block.visible) continue;

      let textColor: string | undefined;

      switch (block.type) {
        case 'main_title':
          textColor = block.styleOverrides?.color ?? ctx.tokens.titleColor;
          break;
        case 'body_paragraph':
        case 'subtitle':
          textColor = block.styleOverrides?.color ?? ctx.tokens.bodyColor;
          break;
        case 'highlighted_phrase':
          // Check phrase text against its own background
          textColor = block.textColor;
          const phraseBg = block.backgroundColor;
          if (textColor && phraseBg) {
            const ratio = contrastRatio(textColor, phraseBg);
            if (ratio < 3) {
              issues.push({
                id: `${this.id}-${block.id}`,
                severity: 'hard_stop',
                slideId: ctx.slide.id,
                blockId: block.id,
                message: `تباين النص في الجملة البارزة (${ratio.toFixed(1)}:1) أقل من الحد الأدنى 3:1`,
                autoFixAvailable: false,
              });
            }
          }
          continue; // Skip the general check below
        case 'stat_value':
          textColor = block.accentColor;
          break;
        case 'quote_block':
          textColor = ctx.tokens.textPrimary;
          break;
        case 'callout':
          // Check callout text against its own background
          const calloutRatio = contrastRatio(block.textColor, block.backgroundColor);
          if (calloutRatio < 3) {
            issues.push({
              id: `${this.id}-${block.id}`,
              severity: 'hard_stop',
              slideId: ctx.slide.id,
              blockId: block.id,
              message: `تباين النص في التنبيه (${calloutRatio.toFixed(1)}:1) أقل من الحد الأدنى 3:1`,
              autoFixAvailable: false,
            });
          }
          continue;
        default:
          continue;
      }

      if (!textColor) continue;

      const ratio = contrastRatio(textColor, bg);
      if (ratio < 3) {
        issues.push({
          id: `${this.id}-${block.id}`,
          severity: 'hard_stop',
          slideId: ctx.slide.id,
          blockId: block.id,
          message: `تباين النص (${ratio.toFixed(1)}:1) أقل من الحد الأدنى 3:1`,
          autoFixAvailable: true,
          autoFixDescription: 'تغيير لون النص إلى لون أكثر تبايناً',
        });
      }
    }

    return issues;
  },
};
