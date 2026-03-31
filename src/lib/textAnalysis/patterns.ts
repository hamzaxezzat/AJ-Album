// src/lib/textAnalysis/patterns.ts
// Arabic-aware regex patterns for smart text styling.

// Quoted phrases: «...» or "..." or "..."
export const QUOTED_TEXT = /[«"\u201C]([^»"\u201D]{3,60})[»"\u201D]/g;

// Numbers with Arabic units
export const NUMBER_WITH_UNIT = /(\d[\d,٫]*)\s*(%|مليار|مليون|ألف|عام|سنة|سنوات|كم²?|دولار|يورو|ريال|طن)/g;

// Standalone years (1900-2099)
export const STANDALONE_YEAR = /(?<!\d)(19|20)\d{2}(?!\d)/g;

// Parenthetical clarifications
export const PARENTHETICAL = /\(([^)]{2,50})\)/g;

// Key terms after Arabic indicator words
export const KEY_TERM = /(تولّى|تولى|منصب|قائد|رئيس|نائب|وزير|مدير|قيادة|رئاسة)\s+([\u0600-\u06FF\u0750-\u077F\s]{3,35}?)(?=[،.\s\u060C]|$)/g;

// Check if character is Arabic
export function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
