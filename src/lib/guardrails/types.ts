// src/lib/guardrails/types.ts
// Guardrail Engine type definitions

import type {
  Album,
  Slide,
  ContentBlock,
  ChannelProfile,
  ResolvedTokens,
  GuardrailSeverity,
  GuardrailIssue,
  GuardrailResult,
} from '@/types/album';

export type { GuardrailSeverity, GuardrailIssue, GuardrailResult };

/**
 * Context passed to each guardrail rule for evaluation.
 */
export interface GuardrailContext {
  album: Album;
  slide: Slide;
  channelProfile: ChannelProfile;
  tokens: ResolvedTokens;
}

/**
 * A single guardrail rule.
 * Each rule receives a context and returns zero or more issues.
 */
export interface GuardrailRule {
  /** Unique identifier for the rule */
  id: string;
  /** Human-readable name (Arabic) */
  name: string;
  /** Category for grouping in UI */
  category: 'accessibility' | 'typography' | 'layout' | 'brand';
  /** Evaluate this rule against the given context */
  evaluate(ctx: GuardrailContext): GuardrailIssue[];
}

/**
 * Auto-fix function signature.
 * Takes the current slide and returns a patched copy.
 */
export type AutoFixFn = (slide: Slide) => Slide;

/**
 * Extended issue with an attached auto-fix function (runtime only, not serialized).
 */
export interface GuardrailIssueWithFix extends GuardrailIssue {
  autoFix?: AutoFixFn;
}
