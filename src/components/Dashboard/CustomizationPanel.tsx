'use client';
import { useState } from 'react';
import {
  CANVAS, COLORS, LAYOUT, LOGO, TYPOGRAPHY, BANNER, THEME, SHAPE, FOOTER, COLOR_PRESETS,
} from '../../../config/defaults';

// ─── Section wrapper ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700, color: '#e6edf3', marginBottom: 10,
        paddingBottom: 8, borderBottom: '1px solid #21262d',
      }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#8b949e', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

function Val({ value, unit }: { value: string | number; unit?: string }) {
  return (
    <span style={{
      fontSize: 13, color: '#e6edf3', background: '#0d1117',
      border: '1px solid #30363d', borderRadius: 4, padding: '4px 10px',
      fontFamily: 'system-ui', direction: 'ltr', minWidth: 60, textAlign: 'center',
      display: 'inline-block',
    }}>
      {value}{unit && <span style={{ color: '#484f58', fontSize: 11, marginRight: 2 }}>{unit}</span>}
    </span>
  );
}

function ColorDot({ hex, label }: { hex: string; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4, background: hex,
        border: hex === '#FFFFFF' ? '1px solid #30363d' : '1px solid transparent',
      }} title={label ?? hex} />
      <span style={{ fontSize: 11, color: '#484f58', fontFamily: 'monospace' }}>{hex}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────

export function CustomizationPanel() {
  const [isOpen, setIsOpen] = useState(false);

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
      padding: 24, direction: 'rtl', marginTop: 8,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid #21262d',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', margin: 0 }}>
          إعدادات المنصة الافتراضية
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none', border: 'none', color: '#8b949e', fontSize: 20,
            cursor: 'pointer', lineHeight: 1, padding: 4,
          }}
        >&#10005;</button>
      </div>

      <p style={{ fontSize: 12, color: '#7d8590', marginBottom: 20, lineHeight: 1.6 }}>
        هذه الإعدادات الافتراضية لكل ألبوم جديد. للتعديل: حرّر الملف
        <code style={{ background: '#0d1117', padding: '2px 6px', borderRadius: 3, margin: '0 4px', direction: 'ltr', display: 'inline-block' }}>
          config/defaults.ts
        </code>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Column 1 */}
        <div>
          <Section title="اللوحة (Canvas)">
            <Row label="العرض"><Val value={CANVAS.width} unit="px" /></Row>
            <Row label="الارتفاع"><Val value={CANVAS.height} unit="px" /></Row>
            <Row label="النسبة"><Val value={CANVAS.presetName} /></Row>
          </Section>

          <Section title="الألوان">
            <Row label="اللون الأساسي"><ColorDot hex={COLORS.accent} /></Row>
            <Row label="خلفية الشريحة"><ColorDot hex={COLORS.background} /></Row>
            <Row label="نص رئيسي"><ColorDot hex={COLORS.textPrimary} /></Row>
            <Row label="نص ثانوي"><ColorDot hex={COLORS.textSecondary} /></Row>
            <Row label="نص فوق اللون"><ColorDot hex={COLORS.textOnAccent} /></Row>
          </Section>

          <Section title="الخطوط">
            <Row label="عائلة الخط"><Val value={TYPOGRAPHY.fontFamily.split(',')[0].replace(/'/g, '')} /></Row>
            <Row label="حجم العنوان"><Val value={TYPOGRAPHY.title.fontSize} unit="px" /></Row>
            <Row label="وزن العنوان"><Val value={TYPOGRAPHY.title.fontWeight} /></Row>
            <Row label="حجم النص"><Val value={TYPOGRAPHY.body.fontSize} unit="px" /></Row>
            <Row label="وزن النص"><Val value={TYPOGRAPHY.body.fontWeight} /></Row>
            <Row label="حجم صغير"><Val value={TYPOGRAPHY.small.fontSize} unit="px" /></Row>
            <Row label="حجم التسمية"><Val value={TYPOGRAPHY.label.fontSize} unit="px" /></Row>
          </Section>

          <Section title="ألوان النص المتاحة">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.text.map(c => <ColorDot key={c.hex} hex={c.hex} label={c.label} />)}
            </div>
          </Section>

          <Section title="ألوان التمييز">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.highlight.map(c => <ColorDot key={c.hex} hex={c.hex} label={c.label} />)}
            </div>
          </Section>
        </div>

        {/* Column 2 */}
        <div>
          <Section title="التخطيط (Layout)">
            <Row label="هامش جانبي"><Val value={(LAYOUT.marginX * 100).toFixed(1)} unit="%" /></Row>
            <Row label="عرض المحتوى"><Val value={(LAYOUT.contentWidth * 100).toFixed(1)} unit="%" /></Row>
            <Row label="ارتفاع الصورة"><Val value={(LAYOUT.imageHeight * 100).toFixed(0)} unit="%" /></Row>
            <Row label="موضع العنوان Y"><Val value={(LAYOUT.titleY * 100).toFixed(0)} unit="%" /></Row>
            <Row label="موضع النص Y"><Val value={(LAYOUT.bodyY * 100).toFixed(0)} unit="%" /></Row>
            <Row label="ارتفاع الفوتر"><Val value={(LAYOUT.footerHeight * 100).toFixed(1)} unit="%" /></Row>
          </Section>

          <Section title="الشعار (Logo)">
            <Row label="هامش علوي"><Val value={LOGO.marginTop} unit="px" /></Row>
            <Row label="هامش جانبي"><Val value={LOGO.marginLeft} unit="px" /></Row>
            <Row label="عرض الشعار"><Val value={(LOGO.widthFraction * 100).toFixed(0)} unit="%" /></Row>
          </Section>

          <Section title="البانر (Banner)">
            <Row label="الموضع الافتراضي"><Val value={BANNER.defaultPosition === 'none' ? 'بدون' : BANNER.defaultPosition} /></Row>
            <Row label="الارتفاع"><Val value={(BANNER.heightNormalized * 100).toFixed(0)} unit="%" /></Row>
            <Row label="الحشو"><Val value={(BANNER.paddingNormalized * 100).toFixed(0)} unit="%" /></Row>
          </Section>

          <Section title="السمة الافتراضية (Theme)">
            <Row label="الكثافة"><Val value={THEME.density} /></Row>
            <Row label="شكل النقاط"><Val value={THEME.bulletStyle} /></Row>
            <Row label="حجم النقاط"><Val value={THEME.bulletSize} unit="px" /></Row>
            <Row label="فواصل بين النقاط"><Val value={THEME.bulletDividers ? 'نعم' : 'لا'} /></Row>
            <Row label="الوضع"><Val value={THEME.mode} /></Row>
          </Section>

          <Section title="الأشكال الافتراضية (Shapes)">
            <Row label="لون التعبئة"><ColorDot hex={SHAPE.fillColor} /></Row>
            <Row label="شفافية التعبئة"><Val value={(SHAPE.fillOpacity * 100).toFixed(0)} unit="%" /></Row>
            <Row label="سمك الحد"><Val value={SHAPE.strokeWidth} unit="px" /></Row>
            <Row label="تدوير الزوايا"><Val value={SHAPE.borderRadius} unit="px" /></Row>
          </Section>

          <Section title="الفوتر (Footer)">
            <Row label="حجم النقاط"><Val value={FOOTER.dotSize} unit="px" /></Row>
            <Row label="المسافة بين النقاط"><Val value={FOOTER.dotGap} unit="px" /></Row>
          </Section>
        </div>
      </div>
    </div>
  );
}
