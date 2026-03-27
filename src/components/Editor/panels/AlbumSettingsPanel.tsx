'use client';
import { useState, useEffect } from 'react';
import type { AlbumTheme, ChannelProfile, BannerPosition, BulletStyle, BulletConnectorConfig } from '@/types/album';
import { LABEL_STYLE, toggleBtnStyle } from './styles';
import { getSavedThemes, type SavedTheme } from '@/lib/themeStore';

interface AlbumSettingsPanelProps {
  theme: AlbumTheme;
  channelProfile: ChannelProfile;
  onUpdateTheme: (updater: (theme: AlbumTheme) => void) => void;
}

const TITLE_COLOR_PRESETS = [
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أزرق', hex: '#1565C0' },
  { label: 'أسود', hex: '#212121' },
];

const BANNER_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top', label: 'أعلى' },
  { value: 'bottom', label: 'أسفل' },
  { value: 'float-top', label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
  { value: 'none', label: 'بدون' },
];

const BULLET_OPTIONS: { value: BulletStyle; label: string }[] = [
  { value: 'square', label: '■' },
  { value: 'circle', label: '●' },
  { value: 'dash', label: '—' },
  { value: 'none', label: 'بدون' },
];

const LINE_STYLE_OPTIONS: { value: BulletConnectorConfig['style']; label: string }[] = [
  { value: 'solid', label: '━ خط' },
  { value: 'dashed', label: '┅ متقطع' },
  { value: 'dotted', label: '··· نقاط' },
];

const WEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 300, label: 'خفيف' },
  { value: 400, label: 'عادي' },
  { value: 600, label: 'متوسط' },
  { value: 700, label: 'عريض' },
  { value: 900, label: 'ثقيل' },
];

const CONNECTOR_COLOR_PRESETS = [
  { label: 'رمادي', hex: '#CCCCCC' },
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أسود', hex: '#212121' },
];

export function AlbumSettingsPanel({ theme, channelProfile, onUpdateTheme }: AlbumSettingsPanelProps) {
  const headingToken = channelProfile.typography['heading-l'];
  const bodyToken = channelProfile.typography['body-m'];
  const effectiveTitleSize = theme.titleFontSize ?? headingToken.fontSize;
  const effectiveBodySize = theme.bodyFontSize ?? bodyToken.fontSize;
  const effectiveTitleColor = theme.titleColor ?? theme.primaryColor;
  const effectiveTitleWeight = theme.titleFontWeight ?? headingToken.fontWeight;
  const effectiveBodyWeight = theme.bodyFontWeight ?? bodyToken.fontWeight;
  const effectiveBulletSize = theme.bulletSize ?? 8;
  const connector = theme.bulletConnector ?? { enabled: false, style: 'solid' as const, width: 1, color: '#CCCCCC' };

  const [hexInput, setHexInput] = useState(effectiveTitleColor);
  const [connectorHexInput, setConnectorHexInput] = useState(connector.color);

  // Sync hex inputs when theme changes (undo/redo, theme apply)
  useEffect(() => { setHexInput(effectiveTitleColor); }, [effectiveTitleColor]);
  useEffect(() => { setConnectorHexInput(connector.color); }, [connector.color]);

  const updateConnector = (patch: Partial<BulletConnectorConfig>) => {
    onUpdateTheme(t => {
      t.bulletConnector = { ...connector, ...patch };
    });
  };

  const [themes] = useState(() => getSavedThemes());

  const handleApplyTheme = (saved: SavedTheme) => {
    const s = saved.theme;
    onUpdateTheme(t => {
      if (s.primaryColor !== undefined) t.primaryColor = s.primaryColor as string;
      if (s.titleColor !== undefined) t.titleColor = s.titleColor as string;
      if (s.bodyColor !== undefined) t.bodyColor = s.bodyColor as string;
      if (s.titleFontSize !== undefined) t.titleFontSize = s.titleFontSize as number;
      if (s.titleFontWeight !== undefined) t.titleFontWeight = s.titleFontWeight as number;
      if (s.bodyFontSize !== undefined) t.bodyFontSize = s.bodyFontSize as number;
      if (s.bodyFontWeight !== undefined) t.bodyFontWeight = s.bodyFontWeight as number;
      if (s.bulletStyle !== undefined) t.bulletStyle = s.bulletStyle as BulletStyle;
      if (s.bulletSize !== undefined) t.bulletSize = s.bulletSize as number;
      if (s.bulletDividers !== undefined) t.bulletDividers = s.bulletDividers as boolean;
      if (s.bulletConnector !== undefined) t.bulletConnector = s.bulletConnector as BulletConnectorConfig;
      if (s.defaultBannerPosition !== undefined) t.defaultBannerPosition = s.defaultBannerPosition as BannerPosition;
      if (s.density !== undefined) t.density = s.density as AlbumTheme['density'];
    });
    setHexInput((s.titleColor as string) ?? (s.primaryColor as string) ?? effectiveTitleColor);
    if (s.bulletConnector) setConnectorHexInput((s.bulletConnector as BulletConnectorConfig).color);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Saved themes ── */}
      {themes.length > 0 && (
        <div>
          <label style={LABEL_STYLE}>تطبيق ثيم محفوظ</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {themes.map(s => (
              <button key={s.id} type="button" onClick={() => handleApplyTheme(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: '#0d1117', border: '1px solid #30363d',
                  borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--brand-font-family)',
                  fontSize: 12, color: '#c9d1d9', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#D32F2F'; e.currentTarget.style.background = '#161b22'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.background = '#0d1117'; }}
              >
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.theme.primaryColor ?? '#D32F2F', flexShrink: 0, border: '1px solid #30363d' }} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Title color ── */}
      <div>
        <label style={LABEL_STYLE}>لون العنوان</label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {TITLE_COLOR_PRESETS.map(c => (
            <ColorBtn key={c.hex} hex={c.hex} active={effectiveTitleColor === c.hex}
              onClick={() => { onUpdateTheme(t => { t.titleColor = c.hex; }); setHexInput(c.hex); }}
              title={c.label}
            />
          ))}
          <span style={{ width: 1, height: 22, background: '#30363d', margin: '0 4px' }} />
          {/* Hex input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4,
              background: effectiveTitleColor, border: '2px solid #444',
              flexShrink: 0,
            }} />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                setHexInput(e.target.value);
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  onUpdateTheme(t => { t.titleColor = e.target.value; });
                }
              }}
              placeholder="#D32F2F"
              style={{
                width: 80, padding: '4px 6px', fontSize: 12,
                background: '#0d1117', border: '1px solid #30363d',
                borderRadius: 4, color: '#e6edf3', fontFamily: 'monospace',
                direction: 'ltr', textAlign: 'left',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Title font size ── */}
      <div>
        <label style={LABEL_STYLE}>حجم العنوان ({effectiveTitleSize}px)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SizeBtn label="−" onClick={() => onUpdateTheme(t => { t.titleFontSize = Math.max(20, effectiveTitleSize - 2); })} />
          <input type="range" min={20} max={72} step={1} value={effectiveTitleSize}
            onChange={(e) => onUpdateTheme(t => { t.titleFontSize = parseInt(e.target.value); })}
            style={{ flex: 1, accentColor: '#D32F2F' }} />
          <SizeBtn label="+" onClick={() => onUpdateTheme(t => { t.titleFontSize = Math.min(72, effectiveTitleSize + 2); })} />
        </div>
      </div>

      {/* ── Title font weight ── */}
      <div>
        <label style={LABEL_STYLE}>وزن العنوان</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {WEIGHT_OPTIONS.map(w => (
            <button key={w.value} type="button"
              onClick={() => onUpdateTheme(t => { t.titleFontWeight = w.value; })}
              style={{ ...toggleBtnStyle(effectiveTitleWeight === w.value), flex: 1, padding: '4px 0', fontSize: 11 }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body font size ── */}
      <div>
        <label style={LABEL_STYLE}>حجم النص ({effectiveBodySize}px)</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SizeBtn label="−" onClick={() => onUpdateTheme(t => { t.bodyFontSize = Math.max(12, effectiveBodySize - 2); })} />
          <input type="range" min={12} max={48} step={1} value={effectiveBodySize}
            onChange={(e) => onUpdateTheme(t => { t.bodyFontSize = parseInt(e.target.value); })}
            style={{ flex: 1, accentColor: '#D32F2F' }} />
          <SizeBtn label="+" onClick={() => onUpdateTheme(t => { t.bodyFontSize = Math.min(48, effectiveBodySize + 2); })} />
        </div>
      </div>

      {/* ── Body font weight ── */}
      <div>
        <label style={LABEL_STYLE}>وزن النص</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {WEIGHT_OPTIONS.map(w => (
            <button key={w.value} type="button"
              onClick={() => onUpdateTheme(t => { t.bodyFontWeight = w.value; })}
              style={{ ...toggleBtnStyle(effectiveBodyWeight === w.value), flex: 1, padding: '4px 0', fontSize: 11 }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bullet style ── */}
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

      {/* ── Bullet size ── */}
      <div>
        <label style={LABEL_STYLE}>حجم النقطة ({effectiveBulletSize}px)</label>
        <input type="range" min={4} max={20} step={1} value={effectiveBulletSize}
          onChange={(e) => onUpdateTheme(t => { t.bulletSize = parseInt(e.target.value); })}
          style={{ width: '100%', accentColor: '#D32F2F' }} />
      </div>

      {/* ── Connector line ── */}
      <div>
        <label style={LABEL_STYLE}>خط الربط بين النقاط</label>
        {/* Toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: connector.enabled ? 10 : 0 }}>
          <button type="button" onClick={() => updateConnector({ enabled: true })}
            style={{ ...toggleBtnStyle(connector.enabled), flex: 1, padding: '5px 0' }}>
            مفعّل
          </button>
          <button type="button" onClick={() => updateConnector({ enabled: false })}
            style={{ ...toggleBtnStyle(!connector.enabled), flex: 1, padding: '5px 0' }}>
            معطّل
          </button>
        </div>

        {connector.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10, background: '#0d1117', borderRadius: 6, border: '1px solid #21262d' }}>
            {/* Line style */}
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>نوع الخط</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {LINE_STYLE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => updateConnector({ style: opt.value })}
                    style={{ ...toggleBtnStyle(connector.style === opt.value), flex: 1, padding: '4px 0', fontSize: 11 }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line width */}
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>
                سمك الخط ({connector.width}px)
              </span>
              <input type="range" min={1} max={5} step={0.5} value={connector.width}
                onChange={(e) => updateConnector({ width: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#D32F2F' }} />
            </div>

            {/* Line color */}
            <div>
              <span style={{ fontSize: 10, color: '#7d8590', display: 'block', marginBottom: 4 }}>لون الخط</span>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {CONNECTOR_COLOR_PRESETS.map(c => (
                  <ColorBtn key={c.hex} hex={c.hex} active={connector.color === c.hex}
                    onClick={() => { updateConnector({ color: c.hex }); setConnectorHexInput(c.hex); }}
                    title={c.label} size={20}
                  />
                ))}
                <input type="text" value={connectorHexInput}
                  onChange={(e) => {
                    setConnectorHexInput(e.target.value);
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateConnector({ color: e.target.value });
                  }}
                  style={{
                    width: 70, padding: '3px 5px', fontSize: 11,
                    background: '#161b22', border: '1px solid #30363d',
                    borderRadius: 3, color: '#e6edf3', fontFamily: 'monospace',
                    direction: 'ltr', textAlign: 'left',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Default banner position ── */}
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

function ColorBtn({ hex, active, onClick, title, size = 28 }: {
  hex: string; active: boolean; onClick: () => void; title: string; size?: number;
}) {
  return (
    <button type="button" onClick={onClick} title={title} style={{
      width: size, height: size, borderRadius: '50%',
      background: hex,
      border: `2px solid ${active ? '#ef5350' : (hex === '#FFFFFF' || hex === '#F5F5F5' ? '#555' : hex)}`,
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
