// config/defaults.ts
//
// Centralized default configuration for new albums.
// Edit this file to change the default look of every new album created.
// These defaults are used by: slideFactory, demoAlbum, parseScript, resolveTokens.

// ─── Canvas ──────────────────────────────────────────────────

export const CANVAS = {
  width: 1080,
  height: 1350,
  presetName: 'editorial-portrait-4:5',
} as const;

// ─── Colors ──────────────────────────────────────────────────

export const COLORS = {
  /** Brand accent (title color, banner, dots, shapes) */
  accent: '#D32F2F',
  /** Slide background */
  background: '#FFFFFF',
  /** Body text */
  textPrimary: '#1A1A1A',
  /** Secondary text (labels, footer, captions) */
  textSecondary: '#4A4A4A',
  /** Text on accent-colored backgrounds */
  textOnAccent: '#FFFFFF',
  /** Default body text color */
  bodyColor: '#1A1A1A',
} as const;

// ─── Layout (normalized 0.0–1.0) ─────────────────────────────

export const LAYOUT = {
  /** Side margins as fraction of canvas width (60px on 1080) */
  marginX: 0.0556,
  /** Content width = 1 - 2 * marginX */
  contentWidth: 0.8889,
  /** Image zone covers top portion */
  imageHeight: 0.55,
  /** Title block Y position (below image) */
  titleY: 0.57,
  /** Title block height */
  titleHeight: 0.06,
  /** Body block Y position (below title) */
  bodyY: 0.64,
  /** Body block height */
  bodyHeight: 0.27,
  /** Footer height as fraction of canvas */
  footerHeight: 0.074,
} as const;

// ─── Logo ────────────────────────────────────────────────────

export const LOGO = {
  /** Top margin in canvas pixels */
  marginTop: 90,
  /** Left margin in canvas pixels */
  marginLeft: 90,
  /** Width as fraction of canvas width */
  widthFraction: 0.09,
} as const;

// ─── Typography defaults ─────────────────────────────────────

export const TYPOGRAPHY = {
  /** Primary font family stack */
  fontFamily: "'Al-Jazeera', Cairo, sans-serif",
  /** Title */
  title: { fontSize: 56, fontWeight: 700, lineHeight: 1.3 },
  /** Body text */
  body: { fontSize: 38, fontWeight: 400, lineHeight: 1.6 },
  /** Small text */
  small: { fontSize: 22, fontWeight: 400, lineHeight: 1.5 },
  /** Labels (footer, tags) */
  label: { fontSize: 18, fontWeight: 400, lineHeight: 1.4 },
} as const;

// ─── Banner defaults ─────────────────────────────────────────

export const BANNER = {
  family: 'classic-main',
  defaultPosition: 'none' as const,
  heightNormalized: 0.10,
  paddingNormalized: 0.04,
} as const;

// ─── Album theme defaults ────────────────────────────────────

export const THEME = {
  primaryColor: COLORS.accent,
  bannerFamilyId: BANNER.family,
  defaultBannerPosition: BANNER.defaultPosition,
  density: 'normal' as const,
  bulletStyle: 'square' as const,
  bulletDividers: false,
  bulletSize: 8,
  typographyTone: 'standard' as const,
  mode: 'production' as const,
} as const;

// ─── Shape defaults ──────────────────────────────────────────

export const SHAPE = {
  fillColor: COLORS.accent,
  fillOpacity: 0.8,
  strokeColor: '#000000',
  strokeWidth: 0,
  strokeOpacity: 1,
  borderRadius: 4,
} as const;

// ─── Footer ──────────────────────────────────────────────────

export const FOOTER = {
  dotSize: 7,
  dotGap: 5,
} as const;

// ─── Editor color presets ────────────────────────────────────

export const COLOR_PRESETS = {
  text: [
    { hex: '#D32F2F', label: 'أحمر' },
    { hex: '#FFFFFF', label: 'أبيض' },
    { hex: '#212121', label: 'أسود' },
    { hex: '#1565C0', label: 'أزرق' },
    { hex: '#757575', label: 'رمادي' },
  ],
  highlight: [
    { hex: '#FFF176', label: 'أصفر' },
    { hex: '#FFCDD2', label: 'أحمر' },
    { hex: '#C8E6C9', label: 'أخضر' },
    { hex: '#BBDEFB', label: 'أزرق' },
  ],
  title: [
    { hex: '#D32F2F', label: 'أحمر' },
    { hex: '#1565C0', label: 'أزرق' },
    { hex: '#212121', label: 'أسود' },
  ],
} as const;
