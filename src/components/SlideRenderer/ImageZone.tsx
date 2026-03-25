// src/components/SlideRenderer/ImageZone.tsx
import React from 'react';
import type { ImageZoneConfig } from '@/types/album';

interface ImageZoneProps {
  config: ImageZoneConfig;
}

export function ImageZone({ config }: ImageZoneProps) {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `calc(var(--canvas-width) * ${config.rect.x})`,
    top: `calc(var(--canvas-height) * ${config.rect.y})`,
    width: `calc(var(--canvas-width) * ${config.rect.width})`,
    height: `calc(var(--canvas-height) * ${config.rect.height})`,
    overflow: 'hidden',
    zIndex: 1,
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: config.objectFit,
    objectPosition: `${config.focalPoint.x * 100}% ${config.focalPoint.y * 100}%`,
    display: 'block',
  };

  return (
    <div style={containerStyle}>
      {config.asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.asset.url}
          alt={config.asset.altText ?? ''}
          style={imgStyle}
        />
      ) : (
        /* Placeholder shown when no asset is assigned yet */
        <div
          style={{
            ...imgStyle,
            backgroundColor: '#E0E0E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9E9E9E',
            fontSize: 14,
            fontFamily: "'IBM Plex Arabic', sans-serif",
          }}
        >
          صورة
        </div>
      )}

      {/* Overlay tint — for darkening images behind text */}
      {config.overlayColor && (config.overlayOpacity ?? 0) > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: config.overlayColor,
            opacity: config.overlayOpacity ?? 0,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
