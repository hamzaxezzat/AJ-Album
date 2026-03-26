// src/lib/guardrails/rules/fontRule.ts
// Hard stop: referenced font must be available in the channel profile

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue, TypographyProfile } from '@/types/album';

/** Known system/fallback fonts that are always available. */
const ALWAYS_AVAILABLE = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'cursive',
  'fantasy',
]);

/**
 * Extract the primary font family name from a CSS font-family stack.
 * e.g. "'Al-Jazeera', Cairo, sans-serif" -> "Al-Jazeera"
 */
function extractPrimaryFont(stack: string): string {
  const first = stack.split(',')[0]?.trim() ?? '';
  return first.replace(/['"]/g, '');
}

export const fontRule: GuardrailRule = {
  id: 'font-availability',
  name: 'توفر الخط',
  category: 'brand',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const issues: GuardrailIssue[] = [];

    // Collect all font families declared in the channel profile
    const declaredFonts = new Set<string>();
    for (const entry of ctx.channelProfile.fontFiles) {
      declaredFonts.add(entry.family);
    }
    // Add well-known self-hosted fonts
    declaredFonts.add('Al-Jazeera');
    declaredFonts.add('Cairo');

    // Check each block's typography token
    for (const block of ctx.slide.blocks) {
      if (!block.visible) continue;
      if (!('typographyTokenRef' in block)) continue;

      const tokenRef = (block as { typographyTokenRef: string }).typographyTokenRef;
      const token = ctx.tokens.typography[tokenRef as keyof TypographyProfile];
      if (!token) {
        issues.push({
          id: `${this.id}-token-${block.id}`,
          severity: 'hard_stop',
          slideId: ctx.slide.id,
          blockId: block.id,
          message: `مرجع الخط "${tokenRef}" غير موجود في الملف الشخصي للقناة`,
          autoFixAvailable: false,
        });
        continue;
      }

      const primaryFont = extractPrimaryFont(token.fontFamily);
      if (primaryFont && !declaredFonts.has(primaryFont) && !ALWAYS_AVAILABLE.has(primaryFont)) {
        issues.push({
          id: `${this.id}-${block.id}`,
          severity: 'hard_stop',
          slideId: ctx.slide.id,
          blockId: block.id,
          message: `الخط "${primaryFont}" غير متوفر في ملف القناة — قد لا يظهر بشكل صحيح عند التصدير`,
          autoFixAvailable: false,
        });
      }
    }

    return issues;
  },
};
