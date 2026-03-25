// src/components/SlideRenderer/BannerRenderer.tsx
import React from 'react';
import type { BannerConfig, ResolvedTokens } from '@/types/album';
import styles from './BannerRenderer.module.css';

interface BannerRendererProps {
  banner: BannerConfig;
  tokens: ResolvedTokens;
}

/** Maps BannerPosition values to CSS module class names */
const POSITION_CLASS: Record<string, string> = {
  top: styles.top,
  bottom: styles.bottom,
  'float-top': styles.floatTop,
  'float-bottom': styles.floatBottom,
};

/** Resolve token references to actual color values */
function resolveColor(ref: string, tokens: ResolvedTokens): string {
  if (ref === 'accent-primary') return tokens.accentPrimary;
  if (ref === 'accent-secondary') return tokens.accentSecondary ?? tokens.accentPrimary;
  if (ref === 'text-on-accent') return tokens.textOnAccent;
  if (ref === 'text-primary') return tokens.textPrimary;
  if (ref === 'text-secondary') return tokens.textSecondary;
  if (ref === 'background') return tokens.background;
  return ref; // raw hex/rgb value passed through
}

export function BannerRenderer({ banner, tokens }: BannerRendererProps) {
  if (banner.position === 'none') return null;

  const resolvedBg = resolveColor(banner.backgroundColor, tokens);
  const resolvedText = resolveColor(banner.textColor, tokens);
  const positionClass = POSITION_CLASS[banner.position] ?? '';

  return (
    <div
      className={`${styles.banner} ${positionClass}`}
      style={{
        backgroundColor: resolvedBg,
        color: resolvedText,
        height: `calc(var(--canvas-height) * ${banner.heightNormalized})`,
        padding: `0 calc(var(--canvas-width) * ${banner.paddingNormalized})`,
      }}
    />
  );
}
