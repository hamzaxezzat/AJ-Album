'use client';
import type { AlbumTheme, Slide, ChannelProfile } from '@/types/album';
import { LABEL_STYLE } from './styles';

interface SlideOverridesSectionProps {
  slide: Slide;
  albumTheme: AlbumTheme;
  channelProfile: ChannelProfile;
  onUpdateOverride: (updater: (overrides: Partial<AlbumTheme>) => Partial<AlbumTheme>) => void;
}

export function SlideOverridesSection({
  slide,
  albumTheme,
  channelProfile,
  onUpdateOverride,
}: SlideOverridesSectionProps) {
  const overrides = slide.themeOverrides ?? {};
  const palette = channelProfile.colors.palette;
  const headingToken = channelProfile.typography['heading-l'];
  const bodyToken = channelProfile.typography['body-m'];

  // Effective values (what this slide actually shows)
  const effectivePrimaryColor = overrides.primaryColor ?? albumTheme.primaryColor;
  const effectiveTitleColor = overrides.titleColor ?? albumTheme.titleColor ?? albumTheme.primaryColor;
  const effectiveBodyColor = overrides.bodyColor ?? albumTheme.bodyColor ?? '#1A1A1A';
  const effectiveTitleSize = overrides.titleFontSize ?? albumTheme.titleFontSize ?? headingToken.fontSize;
  const effectiveBodySize = overrides.bodyFontSize ?? albumTheme.bodyFontSize ?? bodyToken.fontSize;

  const hasOverride = (key: keyof AlbumTheme) => overrides[key] !== undefined;

  const resetKey = (key: keyof AlbumTheme) => {
    onUpdateOverride(o => { const next = { ...o }; delete next[key]; return next; });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={{ ...LABEL_STYLE, fontSize: 12, color: '#58a6ff', marginBottom: 0 }}>
        تخصيص هذه الشريحة
      </label>

      {/* Primary color override */}
      <OverrideRow
        label="اللون الرئيسي"
        isOverridden={hasOverride('primaryColor')}
        onReset={() => resetKey('primaryColor')}
      >
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {palette.map(c => (
            <ColorDot key={c.hex} hex={c.hex}
              active={effectivePrimaryColor === c.hex}
              onClick={() => onUpdateOverride(o => ({ ...o, primaryColor: c.hex }))}
            />
          ))}
        </div>
      </OverrideRow>

      {/* Title color override */}
      <OverrideRow
        label="لون العنوان"
        isOverridden={hasOverride('titleColor')}
        onReset={() => resetKey('titleColor')}
      >
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {palette.map(c => (
            <ColorDot key={c.hex} hex={c.hex}
              active={effectiveTitleColor === c.hex}
              onClick={() => onUpdateOverride(o => ({ ...o, titleColor: c.hex }))}
            />
          ))}
        </div>
      </OverrideRow>

      {/* Body color override */}
      <OverrideRow
        label="لون النص"
        isOverridden={hasOverride('bodyColor')}
        onReset={() => resetKey('bodyColor')}
      >
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[...palette, { hex: '#1A1A1A', label: 'أسود' }].map(c => (
            <ColorDot key={c.hex} hex={c.hex}
              active={effectiveBodyColor === c.hex}
              onClick={() => onUpdateOverride(o => ({ ...o, bodyColor: c.hex }))}
            />
          ))}
        </div>
      </OverrideRow>

      {/* Title size override */}
      <OverrideRow
        label={`حجم العنوان (${effectiveTitleSize}px)`}
        isOverridden={hasOverride('titleFontSize')}
        onReset={() => resetKey('titleFontSize')}
      >
        <input type="range" min={20} max={72} step={1}
          value={effectiveTitleSize}
          onChange={(e) => onUpdateOverride(o => ({ ...o, titleFontSize: parseInt(e.target.value) }))}
          style={{ width: '100%', accentColor: '#58a6ff' }}
        />
      </OverrideRow>

      {/* Body size override */}
      <OverrideRow
        label={`حجم النص (${effectiveBodySize}px)`}
        isOverridden={hasOverride('bodyFontSize')}
        onReset={() => resetKey('bodyFontSize')}
      >
        <input type="range" min={12} max={48} step={1}
          value={effectiveBodySize}
          onChange={(e) => onUpdateOverride(o => ({ ...o, bodyFontSize: parseInt(e.target.value) }))}
          style={{ width: '100%', accentColor: '#58a6ff' }}
        />
      </OverrideRow>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function OverrideRow({ label, isOverridden, onReset, children }: {
  label: string; isOverridden: boolean; onReset: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#7d8590', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {label}
        </span>
        {isOverridden ? (
          <button type="button" onClick={onReset} style={{
            fontSize: 9, color: '#58a6ff', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontFamily: 'var(--brand-font-family)',
          }}>
            ↺ افتراضي
          </button>
        ) : (
          <span style={{ fontSize: 9, color: '#484f58' }}>افتراضي</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ColorDot({ hex, active, onClick }: { hex: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: 22, height: 22, borderRadius: '50%',
      background: hex,
      border: `2px solid ${active ? '#58a6ff' : (hex === '#FFFFFF' || hex === '#F5F5F5' ? '#555' : hex)}`,
      cursor: 'pointer', padding: 0, flexShrink: 0,
      boxShadow: active ? '0 0 0 2px rgba(88,166,255,0.3)' : 'none',
    }} />
  );
}
