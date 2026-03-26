'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type {
  Album, AlbumTheme, Slide, MainTitleBlock, BodyParagraphBlock,
  ChannelProfile, BannerPosition, BulletStyle, BulletConnectorConfig,
} from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import { SlideThumbnail } from '@/components/Editor/panels/SlideThumbnail';
import { useCanvasScale } from '@/components/Editor/hooks/useCanvasScale';
import { CANVAS, COLORS, LAYOUT, BANNER, THEME, TYPOGRAPHY } from '../../../config/defaults';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── Build preview slides ────────────────────────────────────

function rich(text: string) {
  return { type: 'doc' as const, content: [{ type: 'paragraph' as const, content: text ? [{ type: 'text' as const, text }] : [] }] };
}

function buildPreviewSlides(theme: AlbumTheme): Slide[] {
  return [
    {
      id: 's1', number: 1, role: 'inner', archetypeId: 'standard_title_body',
      blocks: [
        { id: 'b1', type: 'main_title', position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight }, zIndex: 10, visible: true, typographyTokenRef: 'heading-l', content: rich('مهام أممية') } as MainTitleBlock,
        { id: 'b2', type: 'body_paragraph', position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight }, zIndex: 10, visible: true, typographyTokenRef: 'body-m', kashidaEnabled: true, content: rich('وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، وتدرّج سريعاً في الرتب العسكرية خلال سنوات الحرب.') } as BodyParagraphBlock,
      ],
      image: { rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
      banner: { family: BANNER.family, position: theme.defaultBannerPosition ?? 'none', heightNormalized: BANNER.heightNormalized, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: BANNER.paddingNormalized, overlap: 'none' },
      metadata: { createdAt: '', updatedAt: '' },
    },
    {
      id: 's2', number: 2, role: 'inner', archetypeId: 'standard_title_body',
      blocks: [
        { id: 'b3', type: 'main_title', position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight }, zIndex: 10, visible: true, typographyTokenRef: 'heading-l', content: rich('قيادة سلاح البر') } as MainTitleBlock,
        { id: 'b4', type: 'body_paragraph', position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight }, zIndex: 10, visible: true, typographyTokenRef: 'body-m', kashidaEnabled: true, content: rich('تولّى منصب قائد سلاح البر في الحرس الثوري ورئاسة أركان القوة البرية في الجيش. هذا الجمع بين قيادة القوتين جعله من القلائل الذين يمتلكون خبرة عميقة في التنسيق المشترك.') } as BodyParagraphBlock,
      ],
      image: { rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
      banner: { family: BANNER.family, position: theme.defaultBannerPosition ?? 'none', heightNormalized: BANNER.heightNormalized, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: BANNER.paddingNormalized, overlap: 'none' },
      metadata: { createdAt: '', updatedAt: '' },
    },
    {
      id: 's3', number: 3, role: 'inner', archetypeId: 'standard_title_body',
      blocks: [
        { id: 'b5', type: 'main_title', position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight }, zIndex: 10, visible: true, typographyTokenRef: 'heading-l', content: rich('المحطة الأمنية') } as MainTitleBlock,
        { id: 'b6', type: 'body_paragraph', position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight }, zIndex: 10, visible: true, typographyTokenRef: 'body-m', kashidaEnabled: true, content: rich('انتقل إلى العمل الأمني المدني، إذ تولّى منصب نائب وزير الداخلية للشؤون الأمنية، فأدار ملفات شائكة تتعلق بالأمن الداخلي والحدود والاحتجاجات.') } as BodyParagraphBlock,
      ],
      image: { rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
      banner: { family: BANNER.family, position: theme.defaultBannerPosition ?? 'none', heightNormalized: BANNER.heightNormalized, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: BANNER.paddingNormalized, overlap: 'none' },
      metadata: { createdAt: '', updatedAt: '' },
    },
  ];
}

// ─── Settings Panel (right side) ─────────────────────────────

const LABEL: React.CSSProperties = { fontSize: 12, color: '#7d8590', display: 'block', marginBottom: 6 };

const TITLE_PRESETS = [
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أزرق', hex: '#1565C0' },
  { label: 'أسود', hex: '#212121' },
];

const BANNER_OPTS: { value: BannerPosition; label: string }[] = [
  { value: 'none', label: 'بدون' },
  { value: 'top', label: 'أعلى' },
  { value: 'bottom', label: 'أسفل' },
  { value: 'float-top', label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
];

const BULLET_OPTS: { value: BulletStyle; label: string }[] = [
  { value: 'square', label: '■' },
  { value: 'circle', label: '●' },
  { value: 'dash', label: '—' },
  { value: 'none', label: 'بدون' },
];

function SettingsPanel({ theme, onUpdate }: { theme: AlbumTheme; onUpdate: (fn: (t: AlbumTheme) => void) => void }) {
  const headingToken = channelProfile.typography['heading-l'];
  const bodyToken = channelProfile.typography['body-m'];
  const titleSize = theme.titleFontSize ?? headingToken.fontSize;
  const bodySize = theme.bodyFontSize ?? bodyToken.fontSize;
  const titleColor = theme.titleColor ?? theme.primaryColor;
  const bulletSize = theme.bulletSize ?? THEME.bulletSize;
  const connector = theme.bulletConnector ?? { enabled: false, style: 'solid' as const, width: 1, color: '#CCCCCC' };
  const [hexInput, setHexInput] = useState(titleColor);

  const toggle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '5px 0', fontSize: 12, cursor: 'pointer', borderRadius: 4,
    fontFamily: 'var(--brand-font-family)',
    background: active ? '#D32F2F' : '#0d1117',
    color: active ? '#fff' : '#8b949e',
    border: active ? '1px solid #D32F2F' : '1px solid #30363d',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 16, direction: 'rtl', overflowY: 'auto', height: '100%' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', margin: 0, paddingBottom: 10, borderBottom: '1px solid #21262d' }}>
        إعدادات الألبوم الافتراضية
      </h3>

      {/* Title color */}
      <div>
        <label style={LABEL}>لون العنوان</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {TITLE_PRESETS.map(c => (
            <button key={c.hex} type="button" title={c.label} onClick={() => { onUpdate(t => { t.titleColor = c.hex; }); setHexInput(c.hex); }}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c.hex, border: titleColor === c.hex ? '2px solid #ef5350' : '2px solid transparent', cursor: 'pointer', boxShadow: titleColor === c.hex ? '0 0 0 2px rgba(239,83,80,0.3)' : 'none', padding: 0, flexShrink: 0 }} />
          ))}
          <input type="text" value={hexInput} onChange={e => { setHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onUpdate(t => { t.titleColor = e.target.value; }); }}
            style={{ width: 80, padding: '4px 6px', fontSize: 12, background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, color: '#e6edf3', fontFamily: 'monospace', direction: 'ltr' }} />
        </div>
      </div>

      {/* Title font size */}
      <div>
        <label style={LABEL}>حجم العنوان ({titleSize}px)</label>
        <input type="range" min={24} max={80} step={2} value={titleSize}
          onChange={e => onUpdate(t => { t.titleFontSize = Number(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* Body font size */}
      <div>
        <label style={LABEL}>حجم النص ({bodySize}px)</label>
        <input type="range" min={16} max={56} step={2} value={bodySize}
          onChange={e => onUpdate(t => { t.bodyFontSize = Number(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* Banner position */}
      <div>
        <label style={LABEL}>موضع البانر</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {BANNER_OPTS.map(o => (
            <button key={o.value} type="button" onClick={() => onUpdate(t => { t.defaultBannerPosition = o.value; })}
              style={toggle(theme.defaultBannerPosition === o.value)}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Bullet style */}
      <div>
        <label style={LABEL}>نمط النقاط</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {BULLET_OPTS.map(o => (
            <button key={o.value} type="button" onClick={() => onUpdate(t => { t.bulletStyle = o.value; })}
              style={{ ...toggle(theme.bulletStyle === o.value), fontSize: 16 }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Bullet size */}
      <div>
        <label style={LABEL}>حجم النقطة ({bulletSize}px)</label>
        <input type="range" min={4} max={20} step={1} value={bulletSize}
          onChange={e => onUpdate(t => { t.bulletSize = Number(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* Connector */}
      <div>
        <label style={LABEL}>خط ربط النقاط</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={() => onUpdate(t => { t.bulletConnector = { ...connector, enabled: true }; })}
            style={toggle(connector.enabled)}>مفعّل</button>
          <button type="button" onClick={() => onUpdate(t => { t.bulletConnector = { ...connector, enabled: false }; })}
            style={toggle(!connector.enabled)}>معطّل</button>
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop: 12, padding: 12, background: '#0d1117', borderRadius: 8, border: '1px solid #21262d' }}>
        <p style={{ fontSize: 11, color: '#7d8590', lineHeight: 1.7, margin: 0 }}>
          هذه معاينة حية — التغييرات تظهر فوراً في الشرائح على اليسار.
          لحفظ الإعدادات كافتراضية دائمة، حرّر:
        </p>
        <code style={{ fontSize: 11, color: '#58a6ff', display: 'block', marginTop: 6, direction: 'ltr' }}>
          config/defaults.ts
        </code>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function SettingsEditor() {
  const [theme, setTheme] = useState<AlbumTheme>({
    primaryColor: THEME.primaryColor,
    bannerFamilyId: THEME.bannerFamilyId,
    defaultBannerPosition: THEME.defaultBannerPosition,
    density: THEME.density,
    bulletStyle: THEME.bulletStyle,
    bulletDividers: THEME.bulletDividers,
    typographyTone: THEME.typographyTone,
    mode: THEME.mode,
  });

  const [selectedIdx, setSelectedIdx] = useState(0);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasScale = useCanvasScale(canvasAreaRef, CANVAS.width, CANVAS.height);

  const slides = useMemo(() => buildPreviewSlides(theme), [theme]);

  const album: Album = useMemo(() => ({
    id: 'settings-preview',
    title: 'معاينة الإعدادات',
    channelProfileId: 'aj-main',
    theme,
    canvasDimensions: { width: CANVAS.width, height: CANVAS.height, presetName: CANVAS.presetName },
    slides,
    assets: [],
    metadata: { createdAt: '', updatedAt: '' },
  }), [theme, slides]);

  const selectedSlide = slides[selectedIdx] ?? slides[0];

  const handleUpdate = useCallback((fn: (t: AlbumTheme) => void) => {
    setTheme(prev => {
      const next = { ...prev };
      fn(next);
      return next;
    });
  }, []);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0D1117', color: '#e6edf3',
      fontFamily: 'var(--brand-font-family)', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, padding: '0 16px', background: '#161b22',
        borderBottom: '1px solid #21262d', flexShrink: 0, direction: 'rtl',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#8b949e', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>&#8594;</Link>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#e6edf3' }} dir="rtl" lang="ar">
            إعدادات المنصة
          </span>
          <span style={{ fontSize: 12, color: '#484f58' }}>— معاينة حية</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: '#D32F2F', color: '#fff', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 4 }}>
            الجزيرة
          </span>
        </div>
      </header>

      {/* 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: Slide thumbnails */}
        <aside style={{
          width: 180, background: '#0d1117', borderLeft: '1px solid #21262d',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '10px 12px', fontSize: 11, color: '#7d8590', fontFamily: 'system-ui', borderBottom: '1px solid #21262d', direction: 'rtl' }}>
            معاينة الشرائح ({slides.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {slides.map((slide, idx) => (
              <div key={slide.id} style={{
                position: 'relative', margin: '0 8px 8px', borderRadius: 6,
                border: `2px solid ${idx === selectedIdx ? '#D32F2F' : 'transparent'}`,
                background: idx === selectedIdx ? 'rgba(211,47,47,0.08)' : 'transparent',
              }}>
                <button type="button" onClick={() => setSelectedIdx(idx)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  width: '100%', padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer',
                }}>
                  <SlideThumbnail slide={slide} album={album} channelProfile={channelProfile} />
                  <span style={{ fontSize: 10, color: idx === selectedIdx ? '#ef5350' : '#7d8590', fontFamily: 'system-ui' }}>
                    {slide.number}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Canvas */}
        <main ref={canvasAreaRef} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0D1117', overflow: 'hidden', minWidth: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: Math.round(CANVAS.width * canvasScale),
              height: Math.round(CANVAS.height * canvasScale),
              borderRadius: 4,
              boxShadow: '0 0 0 1px #30363d, 0 4px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{ zoom: canvasScale } as React.CSSProperties}>
                <SlideRenderer slide={selectedSlide} album={album} channelProfile={channelProfile} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#444c56', fontFamily: 'system-ui' }}>
              {CANVAS.width} &times; {CANVAS.height} &middot; شريحة {selectedSlide.number}
            </span>
          </div>
        </main>

        {/* Right: Settings panel */}
        <aside style={{
          width: 300, background: '#161b22',
          borderRight: '1px solid #21262d', overflow: 'hidden', flexShrink: 0,
        }}>
          <SettingsPanel theme={theme} onUpdate={handleUpdate} />
        </aside>
      </div>
    </div>
  );
}
