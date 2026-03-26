'use client';
import type { BannerPosition } from '@/types/album';
import { LABEL_STYLE, toggleBtnStyle } from './styles';

const BANNER_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top',          label: 'أعلى' },
  { value: 'bottom',       label: 'أسفل' },
  { value: 'float-top',    label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
  { value: 'none',         label: 'بدون' },
];

interface BannerSectionProps {
  position: BannerPosition;
  heightNormalized: number;
  onUpdatePosition: (p: BannerPosition) => void;
  onUpdateHeight: (h: number) => void;
}

export function BannerSection({
  position,
  heightNormalized,
  onUpdatePosition,
  onUpdateHeight,
}: BannerSectionProps) {
  return (
    <>
      {/* Position picker */}
      <div>
        <label style={LABEL_STYLE}>موضع البانر</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BANNER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdatePosition(opt.value)}
              style={toggleBtnStyle(position === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Height slider — only visible when banner is active */}
      {position !== 'none' && (
        <div>
          <label style={LABEL_STYLE}>
            حجم البانر ({Math.round(heightNormalized * 100)}%)
          </label>
          <input
            type="range"
            min={0.05}
            max={0.25}
            step={0.01}
            value={heightNormalized}
            onChange={(e) => onUpdateHeight(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#D32F2F' }}
          />
        </div>
      )}
    </>
  );
}
