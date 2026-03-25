// src/components/SlideRenderer/FooterChrome.tsx
import React from 'react';
import type { ChannelProfile, SourceConfig, ResolvedTokens } from '@/types/album';

interface FooterChromeProps {
  channelProfile: ChannelProfile;
  source?: SourceConfig;
  slideNumber: number;
  tokens: ResolvedTokens;
}

/**
 * Determines the scaling factor for the source text based on character count.
 * Matches the spec: <20 = 100%, 20-40 = 85%, 40-70 = 70%, >70 = 60%.
 */
function getSourceScale(
  text: string,
  breakpoints: ChannelProfile['sourceStyle']['sizeBreakpoints'],
): number {
  const len = text.length;
  for (const bp of breakpoints) {
    if (len <= bp.maxChars) return bp.scale;
  }
  return breakpoints[breakpoints.length - 1].scale;
}

export function FooterChrome({
  channelProfile,
  source,
  slideNumber,
  tokens,
}: FooterChromeProps) {
  const footer = channelProfile.footer;
  const labelToken = tokens.typography['label'];
  const bodyS = tokens.typography['body-s'];

  const showSource = source?.visible === true && source.text.length > 0;
  const sourceScale = showSource
    ? getSourceScale(source!.text, channelProfile.sourceStyle.sizeBreakpoints)
    : 1;

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
        paddingInline: 'calc(var(--canvas-width) * 0.03)',
        zIndex: 100,
        direction: 'rtl',
        borderTop: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {/* Channel logo — right side per AJ spec (logoPosition = "right") */}
      <div style={{ display: 'flex', alignItems: 'center', order: footer.logoPosition === 'right' ? 1 : 0 }}>
        {channelProfile.logo.primary.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={channelProfile.logo.primary.url}
            alt={channelProfile.name}
            style={{ height: 28, width: 'auto', display: 'block' }}
          />
        ) : (
          /* Fallback logo placeholder */
          <div
            style={{
              width: 80,
              height: 28,
              backgroundColor: tokens.accentPrimary,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'IBM Plex Arabic', sans-serif",
            }}
          >
            الجزيرة
          </div>
        )}
      </div>

      {/*
       * Source line or slide number — left side.
       * Source text replaces pagination per paginationBehavior = "replace".
       */}
      <div style={{ order: footer.logoPosition === 'right' ? 0 : 1 }}>
        {showSource ? (
          <div
            style={{
              fontFamily: bodyS.fontFamily,
              fontSize: bodyS.fontSize * sourceScale,
              lineHeight: bodyS.lineHeight,
              color: '#666666',
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            {source!.text}
          </div>
        ) : (
          <div
            style={{
              fontFamily: labelToken.fontFamily,
              fontSize: labelToken.fontSize,
              color: '#999999',
              direction: 'ltr',
            }}
          >
            {slideNumber}
          </div>
        )}
      </div>
    </div>
  );
}
