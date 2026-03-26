'use client';
import { useState, useMemo } from 'react';
import type { Album, Slide, MainTitleBlock, BodyParagraphBlock, ChannelProfile } from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import { CANVAS, COLORS, LAYOUT, LOGO, TYPOGRAPHY, BANNER, THEME, SHAPE, FOOTER } from '../../../config/defaults';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── Build a live preview slide from current defaults ────────

function buildPreviewSlide(): { slide: Slide; album: Album } {
  const slide: Slide = {
    id: 'preview',
    number: 1,
    role: 'inner',
    archetypeId: 'standard_title_body',
    blocks: [
      {
        id: 'p-title',
        type: 'main_title',
        position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'مهام أممية' }] }] },
      } as MainTitleBlock,
      {
        id: 'p-body',
        type: 'body_paragraph',
        position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، وتدرّج سريعاً في الرتب العسكرية.' }] }] },
      } as BodyParagraphBlock,
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: {
      family: BANNER.family,
      position: BANNER.defaultPosition,
      heightNormalized: BANNER.heightNormalized,
      backgroundColor: 'accent-primary',
      textColor: 'text-on-accent',
      paddingNormalized: BANNER.paddingNormalized,
      overlap: 'none',
    },
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  };

  const album: Album = {
    id: 'preview-album',
    title: 'معاينة',
    channelProfileId: 'aj-main',
    theme: {
      primaryColor: THEME.primaryColor,
      bannerFamilyId: THEME.bannerFamilyId,
      defaultBannerPosition: THEME.defaultBannerPosition,
      density: THEME.density,
      bulletStyle: THEME.bulletStyle,
      bulletDividers: THEME.bulletDividers,
      typographyTone: THEME.typographyTone,
      mode: THEME.mode,
    },
    canvasDimensions: { width: CANVAS.width, height: CANVAS.height, presetName: CANVAS.presetName },
    slides: [slide],
    assets: [],
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  };

  return { slide, album };
}

// ─── Helpers ─────────────────────────────────────────────────

function ColorSwatch({ hex, label, size = 28 }: { hex: string; label?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: 6, background: hex,
        border: hex.toUpperCase() === '#FFFFFF' ? '1px solid #30363d' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} title={hex} />
      {label && <span style={{ fontSize: 10, color: '#7d8590' }}>{label}</span>}
    </div>
  );
}

function InfoCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{
      background: '#0d1117', border: '1px solid #21262d', borderRadius: 8,
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 11, color: '#7d8590' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', fontFamily: 'system-ui' }}>
        {value}<span style={{ fontSize: 11, color: '#484f58', fontWeight: 400 }}>{unit}</span>
      </span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export function CustomizationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { slide, album } = useMemo(() => buildPreviewSlide(), []);

  const previewScale = 380 / CANVAS.width;
  const previewH = Math.round(CANVAS.height * previewScale);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          background: '#21262d', border: '1px solid #30363d', borderRadius: 8,
          color: '#8b949e', padding: '10px 20px', fontSize: 14, cursor: 'pointer',
          fontFamily: 'var(--brand-font-family)', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#e6edf3'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#8b949e'; }}
      >
        <span style={{ fontSize: 18 }}>&#9881;</span>
        إعدادات المنصة
      </button>
    );
  }

  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
      padding: 28, direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', margin: 0 }}>
            إعدادات المنصة الافتراضية
          </h2>
          <p style={{ fontSize: 12, color: '#7d8590', marginTop: 4 }}>
            معاينة حية لشكل كل ألبوم جديد &mdash; للتعديل: حرّر
            <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: 3, margin: '0 4px', direction: 'ltr', display: 'inline-block', fontSize: 11 }}>
              config/defaults.ts
            </code>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: '#21262d', border: '1px solid #30363d', color: '#8b949e',
            fontSize: 13, cursor: 'pointer', padding: '6px 14px', borderRadius: 6,
            fontFamily: 'var(--brand-font-family)',
          }}
        >إغلاق</button>
      </div>

      {/* Main layout: preview left + settings right */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ── Live Preview ── */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 380, height: previewH,
            borderRadius: 8, overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px #30363d',
          }}>
            <div style={{ zoom: previewScale } as React.CSSProperties}>
              <SlideRenderer slide={slide} album={album} channelProfile={channelProfile} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#484f58', textAlign: 'center', marginTop: 8, fontFamily: 'system-ui' }}>
            {CANVAS.width} &times; {CANVAS.height} &mdash; معاينة حية
          </p>
        </div>

        {/* ── Settings ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Colors row */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>الألوان</h3>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <ColorSwatch hex={COLORS.accent} label="أساسي" />
              <ColorSwatch hex={COLORS.background} label="خلفية" />
              <ColorSwatch hex={COLORS.textPrimary} label="نص" />
              <ColorSwatch hex={COLORS.textSecondary} label="ثانوي" />
              <ColorSwatch hex={COLORS.textOnAccent} label="فوق اللون" />
              <ColorSwatch hex={SHAPE.fillColor} label="أشكال" />
            </div>
          </div>

          {/* Typography */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>الخطوط</h3>
            <div style={{
              background: '#0d1117', borderRadius: 8, padding: 16,
              border: '1px solid #21262d', marginBottom: 12,
            }}>
              <span style={{
                fontFamily: TYPOGRAPHY.fontFamily, fontSize: 24, color: '#e6edf3',
                display: 'block', marginBottom: 4,
              }}>
                {TYPOGRAPHY.fontFamily.split(',')[0].replace(/'/g, '')}
              </span>
              <span style={{ fontSize: 11, color: '#484f58' }}>
                {TYPOGRAPHY.fontFamily}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <InfoCard label="عنوان" value={TYPOGRAPHY.title.fontSize} unit="px" />
              <InfoCard label="نص" value={TYPOGRAPHY.body.fontSize} unit="px" />
              <InfoCard label="صغير" value={TYPOGRAPHY.small.fontSize} unit="px" />
              <InfoCard label="تسمية" value={TYPOGRAPHY.label.fontSize} unit="px" />
            </div>
          </div>

          {/* Layout */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>التخطيط</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <InfoCard label="صورة" value={`${(LAYOUT.imageHeight * 100).toFixed(0)}`} unit="%" />
              <InfoCard label="عنوان Y" value={`${(LAYOUT.titleY * 100).toFixed(0)}`} unit="%" />
              <InfoCard label="نص Y" value={`${(LAYOUT.bodyY * 100).toFixed(0)}`} unit="%" />
              <InfoCard label="هامش" value={`${(LAYOUT.marginX * 100).toFixed(1)}`} unit="%" />
              <InfoCard label="فوتر" value={`${(LAYOUT.footerHeight * 100).toFixed(1)}`} unit="%" />
              <InfoCard label="لوحة" value={`${CANVAS.width}×${CANVAS.height}`} />
            </div>
          </div>

          {/* Logo + Banner + Footer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>الشعار</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoCard label="هامش علوي" value={`${LOGO.marginTop}`} unit="px" />
                <InfoCard label="عرض" value={`${(LOGO.widthFraction * 100).toFixed(0)}`} unit="%" />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>البانر</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoCard label="الموضع" value={BANNER.defaultPosition === 'none' ? 'بدون' : BANNER.defaultPosition} />
                <InfoCard label="الارتفاع" value={`${(BANNER.heightNormalized * 100).toFixed(0)}`} unit="%" />
              </div>
            </div>
          </div>

          {/* Theme row */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 }}>السمة</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <InfoCard label="كثافة" value={THEME.density} />
              <InfoCard label="نقاط" value={THEME.bulletStyle} />
              <InfoCard label="حجم النقاط" value={THEME.bulletSize} unit="px" />
              <InfoCard label="فوتر نقاط" value={FOOTER.dotSize} unit="px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
