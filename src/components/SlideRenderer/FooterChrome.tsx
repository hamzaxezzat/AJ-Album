// src/components/SlideRenderer/FooterChrome.tsx
import React from 'react';
import type { ChannelProfile, ResolvedTokens } from '@/types/album';

interface FooterChromeProps {
  channelProfile: ChannelProfile;
  tokens: ResolvedTokens;
  /** Current slide number (1-based). Used for pagination dots. */
  currentSlideNumber?: number;
  /** Total number of slides in the album. */
  totalSlides?: number;
}

const PLATFORM_ICON: Record<string, string> = {
  facebook: 'f',
  youtube: '▶',
  twitter: '𝕏',
};

export function FooterChrome({ channelProfile, tokens, currentSlideNumber = 1, totalSlides = 3 }: FooterChromeProps) {
  const footer = channelProfile.footer;
  const handles = footer.socialHandles ?? [];
  const labelToken = tokens.typography['label'];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `calc(var(--canvas-height) * ${footer.height})`,
        backgroundColor: footer.backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: `calc(var(--canvas-width) * 0.04)`,
        zIndex: 100,
        direction: 'rtl',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Right side (RTL start): social handles */}
      {handles.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
          {handles.map((h, i) => {
            // Show handle text only once per unique consecutive handle
            const showHandle = i === 0 || h.handle !== handles[i - 1].handle;
            return (
              <span
                key={i}
                style={{
                  fontFamily: labelToken.fontFamily,
                  fontSize: labelToken.fontSize,
                  color: footer.textColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  lineHeight: 1,
                }}
              >
                <span style={{ fontWeight: 700 }}>{PLATFORM_ICON[h.platform] ?? h.platform}</span>
                {showHandle && <span>{h.handle}</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* Left side (RTL end): pagination dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Array.from({ length: totalSlides }, (_, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: i === currentSlideNumber - 1 ? tokens.accentPrimary : '#CCCCCC',
            }}
          />
        ))}
      </div>
    </div>
  );
}
