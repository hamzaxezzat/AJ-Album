// src/lib/guardrails/index.ts — Barrel export
export { GuardrailEngine } from './engine';
export type { GuardrailRule, GuardrailContext, GuardrailIssueWithFix, AutoFixFn } from './types';
export { contrastRule, contrastRatio } from './rules/contrastRule';
export { fontRule } from './rules/fontRule';
export { overflowRule } from './rules/overflowRule';
export { boldRule } from './rules/boldRule';
export { highlightRule } from './rules/highlightRule';
export { bannerFocalRule } from './rules/bannerFocalRule';
