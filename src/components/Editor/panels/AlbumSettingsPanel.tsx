'use client';
import type { AlbumTheme, ChannelProfile, BannerPosition, BulletStyle, Density } from '@/types/album';
import { LABEL_STYLE, toggleBtnStyle } from './styles';

interface AlbumSettingsPanelProps {
  theme: AlbumTheme;
  channelProfile: ChannelProfile;
  onUpdateTheme: (updater: (theme: AlbumTheme) => void) => void;
}

const BANNER_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top', label: 'أعلى' },
  { value: 'bottom', label: 'أسفل' },
  { value: 'float-top', label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
  { value: 'none', label: 'بدون' },
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'compact', label: 'مكثف' },
  { value: 'normal', label: 'عادي' },
  { value: 'spacious', label: 'واسع' },
];

const BULLET_OPTIONS: { value: BulletStyle; label: string }[] = [
  { value: 'square', label: '■' },
  { value: 'circle', label: '●' },
  { value: 'dash', label: '—' },
  { value: 'none', label: 'بدون' },
];

export function AlbumSettingsPanel({ theme, channelProfile, onUpdateTheme }: AlbumSettingsPanelProps) {
  const palette = channelProfile.colors.palette;
  const headingToken = channelProfile.typography['heading-l'];
  const bodyToken = channelProfile.typography['body-m'];
  const effectiveTitleSize = theme.titleFontSize ?? headingToken.fontSize;
  const effectiveBodySize = theme.bodyFontSize ?? bodyToken.fontSize;
  const effectiveTitleColor = theme.titleColor ?? theme.primaryColor;
  const effectiveBodyColor = theme.bodyColor ?? '#1A1A1A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Primary accent color */}
      <div>
        <label style={LABEL_STYLE}>اللون الرئيسي</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {palette.map(c => (
            <ColorBtn
              key={c.hex}
              hex={c.hex}
              active={theme.primaryColor === c.hex}
              onClick={() => onUpdateTheme(t => { t.primaryColor = c.hex; })}
              title={c.label}
            />
          ))}
        </div>
      </div>

      {/* Title color */}
      <div>
        <label style={LABEL_STYLE}>لون العنوان</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {palette.map(c => (
            <ColorBtn
              key={c.hex}
              hex={c.hex}
              active={effectiveTitleColor === c.hex}
              onClick={() => onUpdateTheme(t => { t.titleColor = c.hex; })}
              title={c.label}
            />
          ))}
          <ResetBtn
            visible={!!theme.titleColor}
            onClick={() => onUpdateTheme(t => { delete t.titleColor; })}
          />
        </div>
      </div>

      {/* Body color */}
      <div>
        <label style={LABEL_STYLE}>لون النص</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[...palette, { hex: '#1A1A1A', label: 'أسود', role: 'dark' }].map(c => (
            <ColorBtn
              key={c.hex}
              hex={c.hex}
              active={effectiveBodyColor === c.hex}
              onClick={() => onUpdateTheme(t => { t.bodyColor = c.hex; })}
              title={c.label}
            />
          ))}
          <ResetBtn
            visible={!!theme.bodyColor}
            onClick={() => onUpdateTheme(t => { delete t.bodyColor; })}
          />
        </div>
      </div>

      {/* Title font size */}
      <div>
        <label style={LABEL_STYLE}>حجم العنوان ({effectiveTitleSize}px)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SizeBtn label="−" onClick={() => onUpdateTheme(t => { t.titleFontSize = Math.max(20, effectiveTitleSize - 2); })} />
          <input
            type="range" min={20} max={72} step={1}
            value={effectiveTitleSize}
            onChange={(e) => onUpdateTheme(t => { t.titleFontSize = parseInt(e.target.value); })}
            style={{ flex: 1, accentColor: '#D32F2F' }}
          />
          <SizeBtn label="+" onClick={() => onUpdateTheme(t => { t.titleFontSize = Math.min(72, effectiveTitleSize + 2); })} />
        </div>
      </div>

      {/* Body font size */}
      <div>
        <label style={LABEL_STYLE}>حجم النص ({effectiveBodySize}px)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SizeBtn label="−" onClick={() => onUpdateTheme(t => { t.bodyFontSize = Math.max(12, effectiveBodySize - 2); })} />
          <input
            type="range" min={12} max={48} step={1}
            value={effectiveBodySize}
            onChange={(e) => onUpdateTheme(t => { t.bodyFontSize = parseInt(e.target.value); })}
            style={{ flex: 1, accentColor: '#D32F2F' }}
          />
          <SizeBtn label="+" onClick={() => onUpdateTheme(t => { t.bodyFontSize = Math.min(48, effectiveBodySize + 2); })} />
        </div>
      </div>

      {/* Density */}
      <div>
        <label style={LABEL_STYLE}>المسافات</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {DENSITY_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => onUpdateTheme(t => { t.density = opt.value; })}
              style={{ ...toggleBtnStyle(theme.density === opt.value), flex: 1, padding: '5px 0' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bullet style */}
      <div>
        <label style={LABEL_STYLE}>نمط النقاط</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {BULLET_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => onUpdateTheme(t => { t.bulletStyle = opt.value; })}
              style={{ ...toggleBtnStyle(theme.bulletStyle === opt.value), flex: 1, padding: '5px 0', fontSize: 14 }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Default banner position */}
      <div>
        <label style={LABEL_STYLE}>موضع البانر الافتراضي</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BANNER_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => onUpdateTheme(t => { t.defaultBannerPosition = opt.value; })}
              style={toggleBtnStyle(theme.defaultBannerPosition === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ColorBtn({ hex, active, onClick, title }: { hex: string; active: boolean; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: '50%',
      background: hex,
      border: `3px solid ${active ? '#ef5350' : (hex === '#FFFFFF' || hex === '#F5F5F5' ? '#555' : hex)}`,
      cursor: 'pointer', padding: 0, flexShrink: 0,
      boxShadow: active ? '0 0 0 2px rgba(239,83,80,0.3)' : 'none',
    }} />
  );
}

function SizeBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 4,
      background: '#0d1117', border: '1px solid #30363d',
      color: '#c9d1d9', fontSize: 16, fontWeight: 700,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {label}
    </button>
  );
}

function ResetBtn({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;
  return (
    <button type="button" onClick={onClick} title="إعادة للافتراضي" style={{
      fontSize: 10, color: '#8b949e', background: '#21262d',
      border: '1px solid #30363d', borderRadius: 4, padding: '2px 8px',
      cursor: 'pointer', fontFamily: 'var(--brand-font-family)',
    }}>
      ↺
    </button>
  );
}
