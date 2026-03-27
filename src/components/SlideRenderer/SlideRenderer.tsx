// src/components/SlideRenderer/SlideRenderer.tsx
//
// The single shared renderer used by:
//   1. Browser editor (interactive preview)
//   2. Thumbnail strip (scaled down)
//   3. Puppeteer export service (renderToStaticMarkup → headless Chromium)
//
// All three code paths produce pixel-identical output because they all use
// the same CSS (CSS Modules + CSS custom properties) and the same Chromium engine.

import React from 'react';

/** Returns true if the hex color is perceived as light (luminance > 0.5). */
function isLightColor(hex: string): boolean {
  const c = (hex ?? '#FFFFFF').replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
import type { Slide, Album, ChannelProfile } from '@/types/album';
import { resolveTokens, tokensToCssVars } from '@/lib/tokens/resolveTokens';
import { LOGO } from '../../../config/defaults';
import { BlockRenderer } from './BlockRenderer';
import { BannerRenderer } from './BannerRenderer';
import { FooterChrome } from './FooterChrome';
import { ImageZone } from './ImageZone';

interface SlideRendererProps {
  slide: Slide;
  album: Album;
  channelProfile: ChannelProfile;
  /**
   * Visual scale applied via CSS transform (does not affect canvas coordinate system).
   * Use for thumbnail rendering; 1.0 = full size.
   */
  scale?: number;
  className?: string;
}

export function SlideRenderer({
  slide,
  album,
  channelProfile,
  scale = 1,
  className,
}: SlideRendererProps) {
  const tokens = resolveTokens({
    channelProfile,
    albumTheme: album.theme,
    canvasConfig: album.canvasDimensions,
    slideOverrides: slide.themeOverrides,
  });

  const cssVars = tokensToCssVars(tokens);

  // Build style: CSS vars first (for children's calc() expressions), then concrete
  // values last so they can't be overridden by a bad var resolution.
  const style: React.CSSProperties = {
    ...(cssVars as React.CSSProperties),
    // Critical layout — all inline so we never depend on CSS Modules loading.
    position: 'relative',
    overflow: 'hidden',
    width: tokens.canvasWidth,
    height: tokens.canvasHeight,
    backgroundColor: tokens.background,
    fontFamily: channelProfile.primaryFontFamily,
    direction: 'rtl' as const,
    WebkitFontSmoothing: 'antialiased',
    ...(scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: 'top left' }
      : {}),
  };

  // Sort blocks by zIndex so stacking order is correct in the DOM
  const sortedBlocks = [...slide.blocks].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={className ?? ''}
      style={style}
      dir="rtl"
      lang="ar"
      data-slide-id={slide.id}
      data-archetype={slide.archetypeId}
      data-slide-number={slide.number}
    >
      {/* Layer 1: Background image zone (zIndex 1) */}
      {slide.image && <ImageZone config={slide.image} />}

      {/* Channel logo — 90px from top-left in canvas pixel space, variant per-slide */}
      {(channelProfile.logo.primary?.url || channelProfile.logo.compact?.url) && (() => {
        // Resolve logo variant: explicit per-slide override → auto luminance detection
        const variant = slide.logoVariant ?? 'auto';
        const useDark =
          variant === 'dark' ? true :
          variant === 'white' ? false :
          isLightColor(tokens.background ?? '#FFFFFF'); // auto

        const logoUrl = useDark
          ? (channelProfile.logo.primary?.url ?? channelProfile.logo.compact?.url)
          : (channelProfile.logo.reversed?.url ?? channelProfile.logo.compact?.url);

        // Use concrete pixel values from tokens — same canvas coordinate system,
        // no CSS-var/zoom interaction issues.
        const LOGO_MARGIN_TOP  = LOGO.marginTop;
        const LOGO_MARGIN_LEFT = LOGO.marginLeft;
        const LOGO_WIDTH       = Math.round(tokens.canvasWidth * LOGO.widthFraction);

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={channelProfile.name}
            style={{
              position: 'absolute',
              top: LOGO_MARGIN_TOP,
              left: LOGO_MARGIN_LEFT,
              width: LOGO_WIDTH,
              height: 'auto',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          />
        );
      })()}

      {/* Layer 2: Content blocks (each carries its own zIndex) */}
      {sortedBlocks.map(
        block =>
          block.visible && (
            <BlockRenderer key={block.id} block={block} tokens={tokens} />
          ),
      )}

      {/* Layer 3: Banner strip */}
      {slide.banner && slide.banner.position !== 'none' && (
        <BannerRenderer banner={slide.banner} tokens={tokens} />
      )}

      {/* Layer 4: Footer chrome — always rendered, locked brand element */}
      <FooterChrome
        channelProfile={channelProfile}
        tokens={tokens}
        currentSlideNumber={slide.number}
        totalSlides={album.slides.length}
      />
    </div>
  );
}
