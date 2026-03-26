'use client';
import type { Slide } from '@/types/album';
import { LABEL_STYLE, INPUT_STYLE, toggleBtnStyle } from './styles';

type LogoVariant = 'auto' | 'dark' | 'white';

const LOGO_VARIANT_OPTIONS: { value: LogoVariant; label: string }[] = [
  { value: 'auto',  label: 'تلقائي' },
  { value: 'dark',  label: 'غامق'   },
  { value: 'white', label: 'فاتح'   },
];

interface LayoutSectionProps {
  slide: Slide;
  onUpdateLogoVariant: (v: LogoVariant) => void;
  onUpdateSource: (text: string) => void;
}

export function LayoutSection({ slide, onUpdateLogoVariant, onUpdateSource }: LayoutSectionProps) {
  const currentVariant = slide.logoVariant ?? 'auto';

  return (
    <>
      {/* Logo variant */}
      <div>
        <label style={LABEL_STYLE}>شعار القناة</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {LOGO_VARIANT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdateLogoVariant(opt.value)}
              style={{
                ...toggleBtnStyle(currentVariant === opt.value),
                flex: 1,
                padding: '5px 0',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source / Reference */}
      <div>
        <label style={LABEL_STYLE}>المصدر</label>
        <input
          style={INPUT_STYLE}
          dir="rtl"
          lang="ar"
          type="text"
          value={slide.source?.text ?? ''}
          onChange={(e) => onUpdateSource(e.target.value)}
          placeholder="مصدر المعلومات"
        />
      </div>
    </>
  );
}
