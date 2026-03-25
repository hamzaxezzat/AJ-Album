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
import type { Slide, Album, ChannelProfile } from '@/types/album';
import { resolveTokens, tokensToCssVars } from '@/lib/tokens/resolveTokens';
import styles from './SlideRenderer.module.css';
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

  const style: React.CSSProperties = {
    // Spread CSS custom properties — TypeScript doesn't know about custom props,
    // but they are valid CSS and work at runtime.
    ...(cssVars as React.CSSProperties),
    ...(scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: 'top left' }
      : {}),
  };

  // Sort blocks by zIndex so stacking order is correct in the DOM
  const sortedBlocks = [...slide.blocks].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      className={`${styles.slideRoot}${className ? ` ${className}` : ''}`}
      style={style}
      dir="rtl"
      lang="ar"
      data-slide-id={slide.id}
      data-archetype={slide.archetypeId}
      data-slide-number={slide.number}
    >
      {/* Layer 1: Background image zone (zIndex 1) */}
      {slide.image && <ImageZone config={slide.image} />}

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
        source={slide.source}
        slideNumber={slide.number}
        tokens={tokens}
      />
    </div>
  );
}
