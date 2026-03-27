// Editor UI color palette — single source for all editor chrome styling.
// These are the EDITOR colors (dark UI), not the SLIDE/CONTENT colors
// (which come from config/defaults.ts and the channel profile).

export const EDITOR = {
  /** Main background */
  bgPrimary: '#0D1117',
  /** Panel/header background */
  bgSecondary: '#161b22',
  /** Input/card background */
  bgTertiary: '#21262d',
  /** Border color */
  border: '#30363d',
  /** Primary text */
  textPrimary: '#e6edf3',
  /** Secondary text (labels) */
  textSecondary: '#8b949e',
  /** Muted text (disabled) */
  textMuted: '#484f58',
  /** Dim text */
  textDim: '#7d8590',
  /** Brand accent */
  accent: '#D32F2F',
  /** Selection blue */
  selection: '#2196F3',
  /** Error red */
  error: '#ef5350',
  /** Success green */
  success: '#4CAF50',
} as const;
