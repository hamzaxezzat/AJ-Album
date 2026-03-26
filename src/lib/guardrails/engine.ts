// src/lib/guardrails/engine.ts
// GuardrailEngine: runs all registered rules against slides

import type { GuardrailRule, GuardrailContext } from './types';
import type { GuardrailResult, GuardrailIssue, Album, Slide, ChannelProfile } from '@/types/album';
import { resolveTokens } from '@/lib/tokens/resolveTokens';

import { contrastRule } from './rules/contrastRule';
import { fontRule } from './rules/fontRule';
import { overflowRule } from './rules/overflowRule';
import { boldRule } from './rules/boldRule';
import { highlightRule } from './rules/highlightRule';
import { bannerFocalRule } from './rules/bannerFocalRule';

/**
 * GuardrailEngine orchestrates running all guardrail rules.
 * Used in:
 *   1. Editor — on every document change (real-time warnings)
 *   2. Export gate — must pass all hard stops before export
 */
export class GuardrailEngine {
  private rules: GuardrailRule[];

  constructor(rules?: GuardrailRule[]) {
    this.rules = rules ?? GuardrailEngine.defaultRules();
  }

  static defaultRules(): GuardrailRule[] {
    return [
      contrastRule,
      fontRule,
      overflowRule,
      boldRule,
      highlightRule,
      bannerFocalRule,
    ];
  }

  /**
   * Evaluate all rules against a single slide.
   */
  evaluateSlide(
    slide: Slide,
    album: Album,
    channelProfile: ChannelProfile,
  ): GuardrailResult {
    const tokens = resolveTokens({
      channelProfile,
      albumTheme: album.theme,
      canvasConfig: album.canvasDimensions,
      slideOverrides: slide.themeOverrides,
    });

    const ctx: GuardrailContext = {
      album,
      slide,
      channelProfile,
      tokens,
    };

    const issues: GuardrailIssue[] = [];
    for (const rule of this.rules) {
      try {
        const ruleIssues = rule.evaluate(ctx);
        issues.push(...ruleIssues);
      } catch (e) {
        // Never let a single rule crash the engine
        console.warn(`[GuardrailEngine] Rule "${rule.id}" threw:`, e);
      }
    }

    return {
      issues,
      hasHardStops: issues.some(i => i.severity === 'hard_stop'),
      warningCount: issues.filter(i => i.severity === 'warning').length,
    };
  }

  /**
   * Evaluate all rules against the entire album (all slides).
   */
  evaluateAlbum(
    album: Album,
    channelProfile: ChannelProfile,
  ): GuardrailResult {
    const allIssues: GuardrailIssue[] = [];

    for (const slide of album.slides) {
      const result = this.evaluateSlide(slide, album, channelProfile);
      allIssues.push(...result.issues);
    }

    return {
      issues: allIssues,
      hasHardStops: allIssues.some(i => i.severity === 'hard_stop'),
      warningCount: allIssues.filter(i => i.severity === 'warning').length,
    };
  }

  /**
   * Check if export is allowed (no hard stops).
   */
  canExport(album: Album, channelProfile: ChannelProfile): boolean {
    return !this.evaluateAlbum(album, channelProfile).hasHardStops;
  }
}
