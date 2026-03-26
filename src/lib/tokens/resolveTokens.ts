// src/lib/tokens/resolveTokens.ts
import type { TokenResolutionContext, ResolvedTokens, TypographyProfile, BulletConnectorConfig } from '@/types/album';

export function resolveTokens(ctx: TokenResolutionContext): ResolvedTokens {
  const { channelProfile, albumTheme, slideOverrides, blockOverrides } = ctx;

  // Effective theme: slide overrides win over album defaults
  const effectiveTheme = { ...albumTheme, ...slideOverrides };

  // Color cascade: block overrides > slide overrides > album theme > channel defaults
  const accentPrimary =
    blockOverrides?.color ??
    slideOverrides?.primaryColor ??
    albumTheme.primaryColor;

  const accentSecondary =
    slideOverrides?.secondaryColor ??
    albumTheme.secondaryColor;

  const density =
    slideOverrides?.density ??
    albumTheme.density;

  const bulletStyle =
    slideOverrides?.bulletStyle ??
    albumTheme.bulletStyle;

  const bulletDividers =
    slideOverrides?.bulletDividers ??
    albumTheme.bulletDividers;

  // Typography: start from channel profile, apply album/slide font size overrides
  const typography: TypographyProfile = { ...channelProfile.typography };

  if (effectiveTheme.titleFontSize) {
    typography['heading-l'] = { ...typography['heading-l'], fontSize: effectiveTheme.titleFontSize };
  }
  if (effectiveTheme.bodyFontSize) {
    typography['body-m'] = { ...typography['body-m'], fontSize: effectiveTheme.bodyFontSize };
  }

  // Title/body color cascade: slide > album > defaults
  const titleColor = effectiveTheme.titleColor ?? effectiveTheme.primaryColor ?? accentPrimary;
  const bodyColor = effectiveTheme.bodyColor ?? '#1A1A1A';

  const bulletSize = effectiveTheme.bulletSize ?? 8;

  const defaultConnector: BulletConnectorConfig = { enabled: false, style: 'solid', width: 1, color: '#CCCCCC' };
  const bulletConnector: BulletConnectorConfig = effectiveTheme.bulletConnector
    ? { ...defaultConnector, ...effectiveTheme.bulletConnector }
    : defaultConnector;

  return {
    accentPrimary,
    accentSecondary,
    textOnAccent: '#FFFFFF',
    background: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#4A4A4A',
    titleColor,
    bodyColor,
    typography,
    density,
    bulletStyle,
    bulletDividers,
    bulletSize,
    bulletConnector,
    canvasWidth: ctx.canvasConfig.width,
    canvasHeight: ctx.canvasConfig.height,
    primaryFontFamily: channelProfile.primaryFontFamily,
  };
}

// Convert resolved tokens to CSS custom properties record
export function tokensToCssVars(tokens: ResolvedTokens): Record<string, string> {
  return {
    '--accent-primary': tokens.accentPrimary,
    '--accent-secondary': tokens.accentSecondary ?? tokens.accentPrimary,
    '--text-on-accent': tokens.textOnAccent,
    '--background': tokens.background,
    '--text-primary': tokens.textPrimary,
    '--text-secondary': tokens.textSecondary,
    '--title-color': tokens.titleColor,
    '--body-color': tokens.bodyColor,
    '--canvas-width': `${tokens.canvasWidth}px`,
    '--canvas-height': `${tokens.canvasHeight}px`,
    '--brand-font-family': tokens.primaryFontFamily,
    // Typography tokens
    '--font-size-heading-xl': `${tokens.typography['heading-xl'].fontSize}px`,
    '--font-size-heading-l': `${tokens.typography['heading-l'].fontSize}px`,
    '--font-size-heading-m': `${tokens.typography['heading-m'].fontSize}px`,
    '--font-size-body-m': `${tokens.typography['body-m'].fontSize}px`,
    '--font-size-body-s': `${tokens.typography['body-s'].fontSize}px`,
    '--font-size-stat': `${tokens.typography['stat-display'].fontSize}px`,
    '--font-size-label': `${tokens.typography['label'].fontSize}px`,
    '--line-height-body': String(tokens.typography['body-m'].lineHeight),
    '--line-height-heading': String(tokens.typography['heading-l'].lineHeight),
  };
}
