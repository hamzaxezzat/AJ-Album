// src/components/SlideRenderer/FooterChrome.tsx
//
// Footer chrome — locked brand element at the bottom of every slide.
// Two sections:
//   Left (RTL end): Social handles with platform icons — image or rendered
//   Right (RTL start): Pagination dots OR source reference text

import React, { useState, useEffect } from 'react';
import type { ChannelProfile, ResolvedTokens } from '@/types/album';

interface FooterChromeProps {
  channelProfile: ChannelProfile;
  tokens: ResolvedTokens;
  currentSlideNumber?: number;
  totalSlides?: number;
  /** Source/reference text — replaces pagination dots when present */
  sourceText?: string;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <span style={{ fontWeight: 700, fontFamily: 'system-ui', fontSize: '0.9em' }}>f</span>,
  youtube: <span style={{ fontSize: '0.7em' }}>&#9654;</span>,
  twitter: <span style={{ fontWeight: 700, fontFamily: 'system-ui', fontSize: '0.85em' }}>&#120143;</span>,
  instagram: <span style={{ fontFamily: 'system-ui', fontSize: '0.85em' }}>&#9679;</span>,
};

export function FooterChrome({
  channelProfile,
  tokens,
  currentSlideNumber = 1,
  totalSlides = 1,
  sourceText,
}: FooterChromeProps) {
  const footer = channelProfile.footer;
  const handles = footer.socialHandles ?? [];
  const footerHeight = footer.height ?? 0.074;
  const profileLeftImage = (footer as unknown as Record<string, unknown>).leftImage as string | undefined;
  const dotSize = Math.round(tokens.canvasWidth * 0.008);

  // Check localStorage for uploaded footer images (from /settings page)
  const [customLeftImage, setCustomLeftImage] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomLeftImage(localStorage.getItem('aj-footer-left'));
    }
  }, []);
  const leftImage = customLeftImage || profileLeftImage; // ~8.6px on 1080

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `calc(var(--canvas-height) * ${footerHeight})`,
        backgroundColor: footer.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: `calc(var(--canvas-width) * 0.03)`,
        zIndex: 100,
        direction: 'rtl',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Right side (RTL start): Pagination dots or source ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: dotSize * 0.7 }}>
        {sourceText ? (
          // Source reference replaces dots
          <span style={{
            fontFamily: tokens.typography['label']?.fontFamily ?? tokens.primaryFontFamily,
            fontSize: tokens.typography['label']?.fontSize ?? 14,
            color: tokens.textSecondary,
            direction: 'rtl',
          }}>
            {sourceText}
          </span>
        ) : (
          // Pagination dots
          Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: i === currentSlideNumber - 1 ? tokens.accentPrimary : '#CCCCCC',
                transition: 'background-color 0.2s',
              }}
            />
          ))
        )}
      </div>

      {/* ── Left side (RTL end): Social handles ── */}
      {leftImage ? (
        // Image-based footer (from channel profile)
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={leftImage}
          alt=""
          style={{
            height: '60%',
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      ) : handles.length > 0 ? (
        // Rendered social handles
        <div style={{ display: 'flex', alignItems: 'center', gap: `calc(var(--canvas-width) * 0.015)`, direction: 'ltr' }}>
          {handles.map((h, i) => {
            const showHandle = i === 0 || h.handle !== handles[i - 1].handle;
            return (
              <span
                key={i}
                style={{
                  fontFamily: tokens.primaryFontFamily,
                  fontSize: tokens.typography['label']?.fontSize ?? 14,
                  color: footer.textColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: `calc(var(--canvas-width) * 0.004)`,
                  lineHeight: 1,
                }}
              >
                {PLATFORM_ICONS[h.platform] ?? <span style={{ fontWeight: 700 }}>{h.platform}</span>}
                {showHandle && <span>{h.handle}</span>}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
