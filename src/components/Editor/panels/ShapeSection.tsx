'use client';
import type { RectangleBlock, EllipseBlock, ShapeStyleConfig } from '@/types/album';

interface ShapeSectionProps {
  block: RectangleBlock | EllipseBlock;
  onUpdateShape: (shape: Partial<ShapeStyleConfig>) => void;
}

export function ShapeSection({ block, onUpdateShape }: ShapeSectionProps) {
  const s = block.shape;
  const isRect = block.type === 'rectangle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', paddingBottom: 6, borderBottom: '1px solid #21262d' }}>
        {isRect ? 'خصائص المستطيل' : 'خصائص الدائرة'}
      </div>

      {/* Fill color */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#8b949e' }}>لون التعبئة</span>
        <input
          type="color"
          value={s.fillColor}
          onChange={(e) => onUpdateShape({ fillColor: e.target.value })}
          style={{ width: 32, height: 24, border: '1px solid #30363d', borderRadius: 3, cursor: 'pointer', background: 'none' }}
        />
      </div>

      {/* Fill opacity */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>شفافية التعبئة</span>
          <span style={{ fontSize: 11, color: '#484f58' }}>{Math.round(s.fillOpacity * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={100} step={5}
          value={Math.round(s.fillOpacity * 100)}
          onChange={(e) => onUpdateShape({ fillOpacity: Number(e.target.value) / 100 })}
          style={{ width: '100%', accentColor: '#D32F2F' }}
        />
      </div>

      {/* Stroke color */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#8b949e' }}>لون الحد</span>
        <input
          type="color"
          value={s.strokeColor}
          onChange={(e) => onUpdateShape({ strokeColor: e.target.value })}
          style={{ width: 32, height: 24, border: '1px solid #30363d', borderRadius: 3, cursor: 'pointer', background: 'none' }}
        />
      </div>

      {/* Stroke width */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>سمك الحد</span>
          <span style={{ fontSize: 11, color: '#484f58' }}>{s.strokeWidth}px</span>
        </div>
        <input
          type="range" min={0} max={10} step={1}
          value={s.strokeWidth}
          onChange={(e) => onUpdateShape({ strokeWidth: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#D32F2F' }}
        />
      </div>

      {/* Border radius (rectangle only) */}
      {isRect && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>تدوير الزوايا</span>
            <span style={{ fontSize: 11, color: '#484f58' }}>{s.borderRadius}px</span>
          </div>
          <input
            type="range" min={0} max={50} step={1}
            value={s.borderRadius}
            onChange={(e) => onUpdateShape({ borderRadius: Number(e.target.value) })}
            style={{ width: '100%', accentColor: '#D32F2F' }}
          />
        </div>
      )}
    </div>
  );
}
