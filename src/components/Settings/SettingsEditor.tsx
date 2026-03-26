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
import { CANVAS, COLORS, LAYOUT, BANNER, THEME } from '../../../config/defaults';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── Preview slides ──────────────────────────────────────────

function rich(text: string) {
  return { type: 'doc' as const, content: [{ type: 'paragraph' as const, content: text ? [{ type: 'text' as const, text }] : [] }] };
}

function buildPreviewSlides(theme: AlbumTheme): Slide[] {
  const mkSlide = (id: string, num: number, title: string, body: string): Slide => ({
    id, number: num, role: 'inner', archetypeId: 'standard_title_body',
    blocks: [
      { id: `${id}-t`, type: 'main_title', position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight }, zIndex: 10, visible: true, typographyTokenRef: 'heading-l', content: rich(title) } as MainTitleBlock,
      { id: `${id}-b`, type: 'body_paragraph', position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight }, zIndex: 10, visible: true, typographyTokenRef: 'body-m', kashidaEnabled: true, content: rich(body) } as BodyParagraphBlock,
    ],
    image: { rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
    banner: { family: BANNER.family, position: theme.defaultBannerPosition ?? 'none', heightNormalized: (theme as ExtendedTheme).bannerHeight ?? BANNER.heightNormalized, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: BANNER.paddingNormalized, overlap: 'none' },
    metadata: { createdAt: '', updatedAt: '' },
  });

  return [
    mkSlide('s1', 1, 'مهام أممية', 'وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، وتدرّج سريعاً في الرتب العسكرية.'),
    mkSlide('s2', 2, 'قيادة سلاح البر', 'تولّى منصب قائد سلاح البر في الحرس الثوري ورئاسة أركان القوة البرية في الجيش. هذا الجمع بين قيادة القوتين جعله من القلائل الذين يمتلكون خبرة عميقة.'),
    mkSlide('s3', 3, 'المحطة الأمنية', 'انتقل إلى العمل الأمني المدني، إذ تولّى منصب نائب وزير الداخلية للشؤون الأمنية، فأدار ملفات شائكة تتعلق بالأمن الداخلي والحدود والاحتجاجات.'),
  ];
}

// ─── Styles ──────────────────────────────────────────────────

const LABEL: React.CSSProperties = { fontSize: 12, color: '#7d8590', display: 'block', marginBottom: 6, fontFamily: 'var(--brand-font-family)' };
const SECTION_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#e6edf3', margin: 0, paddingBottom: 8, marginBottom: 12, borderBottom: '1px solid #21262d' };
const DIVIDER: React.CSSProperties = { height: 1, background: '#21262d', margin: '6px 0' };

function toggle(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '5px 0', fontSize: 12, cursor: 'pointer', borderRadius: 4,
    fontFamily: 'var(--brand-font-family)',
    background: active ? '#D32F2F' : '#0d1117',
    color: active ? '#fff' : '#8b949e',
    border: active ? '1px solid #D32F2F' : '1px solid #30363d',
  };
}

// ─── Settings Panel ──────────────────────────────────────────

const TITLE_COLOR_PRESETS = [
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أزرق', hex: '#1565C0' },
  { label: 'أسود', hex: '#212121' },
  { label: 'أخضر', hex: '#2E7D32' },
  { label: 'ذهبي', hex: '#F57F17' },
];

const BG_COLOR_PRESETS = [
  { label: 'أبيض', hex: '#FFFFFF' },
  { label: 'كريمي', hex: '#FFFDE7' },
  { label: 'رمادي فاتح', hex: '#F5F5F5' },
  { label: 'أسود', hex: '#212121' },
  { label: 'كحلي', hex: '#0D1117' },
];

const BODY_COLOR_PRESETS = [
  { label: 'أسود', hex: '#1A1A1A' },
  { label: 'رمادي غامق', hex: '#333333' },
  { label: 'رمادي', hex: '#555555' },
  { label: 'أبيض', hex: '#FFFFFF' },
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

const WEIGHT_OPTS = [
  { value: 300, label: 'خفيف' },
  { value: 400, label: 'عادي' },
  { value: 600, label: 'متوسط' },
  { value: 700, label: 'عريض' },
  { value: 900, label: 'ثقيل' },
];

const LINE_STYLE_OPTS: { value: BulletConnectorConfig['style']; label: string }[] = [
  { value: 'solid', label: 'متصل' },
  { value: 'dashed', label: 'متقطع' },
  { value: 'dotted', label: 'نقاط' },
];

const CONNECTOR_COLOR_PRESETS = [
  { label: 'رمادي', hex: '#CCCCCC' },
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أسود', hex: '#212121' },
];

interface ExtendedTheme extends AlbumTheme {
  bgColor?: string;
  bodyTextColor?: string;
  titleWeight?: number;
  bodyWeight?: number;
  bannerHeight?: number;
}

function SettingsPanel({ theme, onUpdate }: { theme: ExtendedTheme; onUpdate: (fn: (t: ExtendedTheme) => void) => void }) {
  const headingToken = channelProfile.typography['heading-l'];
  const bodyToken = channelProfile.typography['body-m'];
  const titleSize = theme.titleFontSize ?? headingToken.fontSize;
  const bodySize = theme.bodyFontSize ?? bodyToken.fontSize;
  const titleColor = theme.titleColor ?? theme.primaryColor;
  const titleWeight = theme.titleWeight ?? headingToken.fontWeight;
  const bodyWeight = theme.bodyWeight ?? bodyToken.fontWeight;
  const bgColor = theme.bgColor ?? COLORS.background;
  const bodyTextColor = theme.bodyTextColor ?? COLORS.bodyColor;
  const bulletSize = theme.bulletSize ?? THEME.bulletSize;
  const bannerHeight = theme.bannerHeight ?? BANNER.heightNormalized;
  const connector = theme.bulletConnector ?? { enabled: false, style: 'solid' as const, width: 1, color: '#CCCCCC' };
  const [hexInput, setHexInput] = useState(titleColor);
  const [connHexInput, setConnHexInput] = useState(connector.color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, direction: 'rtl', overflowY: 'auto', height: '100%' }}>

      {/* ═══════════════ الألوان ═══════════════ */}
      <h3 style={SECTION_TITLE}>الألوان</h3>

      {/* Title color */}
      <div>
        <label style={LABEL}>لون العنوان</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {TITLE_COLOR_PRESETS.map(c => (
            <button key={c.hex} type="button" title={c.label} onClick={() => { onUpdate(t => { t.titleColor = c.hex; t.primaryColor = c.hex; }); setHexInput(c.hex); }}
              style={{ width: 26, height: 26, borderRadius: '50%', background: c.hex, border: titleColor === c.hex ? '2px solid #ef5350' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0, boxShadow: titleColor === c.hex ? '0 0 0 2px rgba(239,83,80,0.3)' : 'none' }} />
          ))}
          <input type="text" value={hexInput} onChange={e => { setHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onUpdate(t => { t.titleColor = e.target.value; t.primaryColor = e.target.value; }); }}
            style={{ width: 76, padding: '4px 6px', fontSize: 11, background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, color: '#e6edf3', fontFamily: 'monospace', direction: 'ltr' }} />
        </div>
      </div>

      {/* Background color */}
      <div>
        <label style={LABEL}>لون خلفية الشريحة</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {BG_COLOR_PRESETS.map(c => (
            <button key={c.hex} type="button" title={c.label} onClick={() => onUpdate(t => { t.bgColor = c.hex; })}
              style={{ width: 26, height: 26, borderRadius: '50%', background: c.hex, border: bgColor === c.hex ? '2px solid #ef5350' : c.hex === '#FFFFFF' || c.hex === '#F5F5F5' || c.hex === '#FFFDE7' ? '2px solid #555' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
        </div>
      </div>

      {/* Body text color */}
      <div>
        <label style={LABEL}>لون النص الأساسي</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {BODY_COLOR_PRESETS.map(c => (
            <button key={c.hex} type="button" title={c.label} onClick={() => onUpdate(t => { t.bodyTextColor = c.hex; t.bodyColor = c.hex; })}
              style={{ width: 26, height: 26, borderRadius: '50%', background: c.hex, border: bodyTextColor === c.hex ? '2px solid #ef5350' : c.hex === '#FFFFFF' ? '2px solid #555' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
          ))}
        </div>
      </div>

      <div style={DIVIDER} />

      {/* ═══════════════ الخطوط ═══════════════ */}
      <h3 style={SECTION_TITLE}>الخطوط</h3>

      {/* Title font size */}
      <div>
        <label style={LABEL}>حجم العنوان ({titleSize}px)</label>
        <input type="range" min={24} max={80} step={2} value={titleSize}
          onChange={e => onUpdate(t => { t.titleFontSize = Number(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* Title font weight */}
      <div>
        <label style={LABEL}>وزن العنوان</label>
        <div style={{ display: 'flex', gap: 3 }}>
          {WEIGHT_OPTS.map(w => (
            <button key={w.value} type="button" onClick={() => onUpdate(t => { t.titleWeight = w.value; })}
              style={{ ...toggle(titleWeight === w.value), fontSize: 11, padding: '4px 0' }}>{w.label}</button>
          ))}
        </div>
      </div>

      {/* Body font size */}
      <div>
        <label style={LABEL}>حجم النص ({bodySize}px)</label>
        <input type="range" min={16} max={56} step={2} value={bodySize}
          onChange={e => onUpdate(t => { t.bodyFontSize = Number(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* Body font weight */}
      <div>
        <label style={LABEL}>وزن النص</label>
        <div style={{ display: 'flex', gap: 3 }}>
          {WEIGHT_OPTS.map(w => (
            <button key={w.value} type="button" onClick={() => onUpdate(t => { t.bodyWeight = w.value; })}
              style={{ ...toggle(bodyWeight === w.value), fontSize: 11, padding: '4px 0' }}>{w.label}</button>
          ))}
        </div>
      </div>

      {/* Font family info */}
      <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 12px', border: '1px solid #21262d' }}>
        <span style={{ fontSize: 18, color: '#e6edf3', fontFamily: channelProfile.primaryFontFamily }}>
          {channelProfile.primaryFontFamily.split(',')[0].replace(/'/g, '')}
        </span>
        <span style={{ fontSize: 10, color: '#484f58', display: 'block', marginTop: 2 }}>
          عائلة الخط — تعديلها من config/brands/aj-main.json
        </span>
      </div>

      <div style={DIVIDER} />

      {/* ═══════════════ البانر ═══════════════ */}
      <h3 style={SECTION_TITLE}>البانر</h3>

      {/* Banner position */}
      <div>
        <label style={LABEL}>موضع البانر</label>
        <div style={{ display: 'flex', gap: 3 }}>
          {BANNER_OPTS.map(o => (
            <button key={o.value} type="button" onClick={() => onUpdate(t => { t.defaultBannerPosition = o.value; })}
              style={{ ...toggle(theme.defaultBannerPosition === o.value), fontSize: 11 }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Banner height */}
      {theme.defaultBannerPosition !== 'none' && (
        <div>
          <label style={LABEL}>ارتفاع البانر ({(bannerHeight * 100).toFixed(0)}%)</label>
          <input type="range" min={5} max={25} step={1} value={Math.round(bannerHeight * 100)}
            onChange={e => onUpdate(t => { t.bannerHeight = Number(e.target.value) / 100; })}
            style={{ width: '100%', accentColor: '#D32F2F' }} />
        </div>
      )}

      <div style={DIVIDER} />

      {/* ═══════════════ النقاط ═══════════════ */}
      <h3 style={SECTION_TITLE}>النقاط والقوائم</h3>

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

      {/* Bullet dividers */}
      <div>
        <label style={LABEL}>فواصل بين النقاط</label>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" onClick={() => onUpdate(t => { t.bulletDividers = true; })}
            style={toggle(theme.bulletDividers === true)}>مفعّل</button>
          <button type="button" onClick={() => onUpdate(t => { t.bulletDividers = false; })}
            style={toggle(theme.bulletDividers !== true)}>معطّل</button>
        </div>
      </div>

      {/* Connector line */}
      <div>
        <label style={LABEL}>خط ربط النقاط</label>
        <div style={{ display: 'flex', gap: 4, marginBottom: connector.enabled ? 8 : 0 }}>
          <button type="button" onClick={() => onUpdate(t => { t.bulletConnector = { ...connector, enabled: true }; })}
            style={toggle(connector.enabled)}>مفعّل</button>
          <button type="button" onClick={() => onUpdate(t => { t.bulletConnector = { ...connector, enabled: false }; })}
            style={toggle(!connector.enabled)}>معطّل</button>
        </div>

        {connector.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: '#0d1117', borderRadius: 6, border: '1px solid #21262d' }}>
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>نوع الخط</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {LINE_STYLE_OPTS.map(o => (
                  <button key={o.value} type="button" onClick={() => onUpdate(t => { t.bulletConnector = { ...connector, style: o.value }; })}
                    style={{ ...toggle(connector.style === o.value), fontSize: 11 }}>{o.label}</button>
                ))}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>سمك الخط ({connector.width}px)</span>
              <input type="range" min={1} max={5} step={0.5} value={connector.width}
                onChange={e => onUpdate(t => { t.bulletConnector = { ...connector, width: parseFloat(e.target.value) }; })}
                style={{ width: '100%', accentColor: '#D32F2F' }} />
            </div>
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>لون الخط</span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {CONNECTOR_COLOR_PRESETS.map(c => (
                  <button key={c.hex} type="button" title={c.label} onClick={() => { onUpdate(t => { t.bulletConnector = { ...connector, color: c.hex }; }); setConnHexInput(c.hex); }}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c.hex, border: connector.color === c.hex ? '2px solid #ef5350' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
                <input type="text" value={connHexInput} onChange={e => { setConnHexInput(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onUpdate(t => { t.bulletConnector = { ...connector, color: e.target.value }; }); }}
                  style={{ width: 70, padding: '3px 5px', fontSize: 11, background: '#161b22', border: '1px solid #30363d', borderRadius: 3, color: '#e6edf3', fontFamily: 'monospace', direction: 'ltr' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={DIVIDER} />

      {/* ═══════════════ التخطيط ═══════════════ */}
      <h3 style={SECTION_TITLE}>التخطيط</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 10px', border: '1px solid #21262d' }}>
          <span style={{ fontSize: 10, color: '#7d8590' }}>اللوحة</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', display: 'block', fontFamily: 'system-ui' }}>{CANVAS.width}×{CANVAS.height}</span>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 10px', border: '1px solid #21262d' }}>
          <span style={{ fontSize: 10, color: '#7d8590' }}>ارتفاع الصورة</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', display: 'block', fontFamily: 'system-ui' }}>{(LAYOUT.imageHeight * 100).toFixed(0)}%</span>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 10px', border: '1px solid #21262d' }}>
          <span style={{ fontSize: 10, color: '#7d8590' }}>هامش جانبي</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', display: 'block', fontFamily: 'system-ui' }}>{(LAYOUT.marginX * 100).toFixed(1)}%</span>
        </div>
        <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 10px', border: '1px solid #21262d' }}>
          <span style={{ fontSize: 10, color: '#7d8590' }}>ارتفاع الفوتر</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e6edf3', display: 'block', fontFamily: 'system-ui' }}>{(LAYOUT.footerHeight * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Info box */}
      <div style={{ marginTop: 8, padding: 12, background: '#0d1117', borderRadius: 8, border: '1px solid #21262d' }}>
        <p style={{ fontSize: 11, color: '#7d8590', lineHeight: 1.7, margin: 0 }}>
          التغييرات تظهر فوراً في المعاينة. لحفظها كافتراضية دائمة:
        </p>
        <code style={{ fontSize: 11, color: '#58a6ff', display: 'block', marginTop: 4, direction: 'ltr' }}>
          config/defaults.ts
        </code>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function SettingsEditor() {
  const [theme, setTheme] = useState<ExtendedTheme>({
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

  const handleUpdate = useCallback((fn: (t: ExtendedTheme) => void) => {
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
          <span style={{ fontWeight: 700, fontSize: 15, color: '#e6edf3' }} dir="rtl" lang="ar">إعدادات المنصة</span>
          <span style={{ fontSize: 12, color: '#484f58' }}>— معاينة حية</span>
        </div>
        <span style={{ background: '#D32F2F', color: '#fff', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 4 }}>الجزيرة</span>
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
          width: 320, background: '#161b22',
          borderRight: '1px solid #21262d', overflow: 'hidden', flexShrink: 0,
        }}>
          <SettingsPanel theme={theme} onUpdate={handleUpdate} />
        </aside>
      </div>
    </div>
  );
}
