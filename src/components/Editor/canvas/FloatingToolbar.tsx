'use client';
import type { Editor } from '@tiptap/react';
import type { BlockStyleOverride } from '@/types/album';

// ─── Types ───────────────────────────────────────────────────

interface FloatingToolbarProps {
  editor: Editor | null;
  fontSize: number;
  textAlign: 'right' | 'left' | 'center' | 'justify';
  kashidaEnabled: boolean;
  onUpdateStyle: (overrides: Partial<BlockStyleOverride>) => void;
  onToggleKashida: () => void;
}

// ─── Color presets ───────────────────────────────────────────

const TEXT_COLORS = [
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أبيض', hex: '#FFFFFF' },
  { label: 'أسود', hex: '#212121' },
  { label: 'أزرق', hex: '#1565C0' },
  { label: 'رمادي', hex: '#757575' },
];

const HIGHLIGHT_COLORS = [
  { label: 'أصفر', hex: '#FFF176' },
  { label: 'أحمر', hex: '#FFCDD2' },
  { label: 'أخضر', hex: '#C8E6C9' },
  { label: 'أزرق', hex: '#BBDEFB' },
  { label: 'بدون', hex: '' },
];

// ─── Component ───────────────────────────────────────────────

export function FloatingToolbar({
  editor,
  fontSize,
  textAlign,
  kashidaEnabled,
  onUpdateStyle,
  onToggleKashida,
}: FloatingToolbarProps) {
  const run = (cmd: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cmd();
  };

  // If no editor, show an empty placeholder bar
  if (!editor) {
    return (
      <div style={BAR_STYLE}>
        <span style={{ color: '#484f58', fontSize: 13, fontFamily: 'var(--brand-font-family)' }}>
          انقر مرتين على النص للتحرير
        </span>
      </div>
    );
  }

  return (
    <div style={BAR_STYLE} data-floating-toolbar onMouseDown={(e) => e.stopPropagation()}>
      {/* ── Text format marks ── */}
      <Group>
        <ToolBtn active={editor.isActive('bold')} onClick={run(() => editor.chain().focus().toggleBold().run())} title="عريض">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn active={editor.isActive('italic')} onClick={run(() => editor.chain().focus().toggleItalic().run())} title="مائل">
          <em>I</em>
        </ToolBtn>
        <ToolBtn active={editor.isActive('underline')} onClick={run(() => editor.chain().focus().toggleUnderline().run())} title="تسطير">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </ToolBtn>
        <ToolBtn active={editor.isActive('strike')} onClick={run(() => editor.chain().focus().toggleStrike().run())} title="يتوسطه خط">
          <s>S</s>
        </ToolBtn>
      </Group>

      <Divider />

      {/* ── Font size ── */}
      <Group>
        <ToolBtn onClick={run(() => onUpdateStyle({ fontSize: Math.max(12, fontSize - 2) }))} title="تصغير">
          <span style={{ fontSize: 16, lineHeight: 1 }}>−</span>
        </ToolBtn>
        <span style={{
          fontSize: 14, color: '#e6edf3', minWidth: 36,
          textAlign: 'center', fontFamily: 'system-ui', userSelect: 'none',
          fontWeight: 600,
        }}>
          {fontSize}
        </span>
        <ToolBtn onClick={run(() => onUpdateStyle({ fontSize: Math.min(120, fontSize + 2) }))} title="تكبير">
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        </ToolBtn>
      </Group>

      <Divider />

      {/* ── Alignment ── */}
      <Group>
        <ToolBtn active={textAlign === 'right'} onClick={run(() => onUpdateStyle({ textAlign: 'right' }))} title="يمين">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="2" width="16" height="2" rx="1"/><rect x="4" y="7" width="12" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn active={textAlign === 'center'} onClick={run(() => onUpdateStyle({ textAlign: 'center' }))} title="وسط">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="2" width="16" height="2" rx="1"/><rect x="2" y="7" width="12" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn active={textAlign === 'left'} onClick={run(() => onUpdateStyle({ textAlign: 'left' }))} title="يسار">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="2" width="16" height="2" rx="1"/><rect x="0" y="7" width="12" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn active={textAlign === 'justify'} onClick={run(() => onUpdateStyle({ textAlign: 'justify' }))} title="ضبط">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="2" width="16" height="2" rx="1"/><rect x="0" y="7" width="16" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn active={kashidaEnabled} onClick={run(onToggleKashida)} title="كشيدة عربية">
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--brand-font-family)', letterSpacing: -1 }}>كـ</span>
        </ToolBtn>
      </Group>

      <Divider />

      {/* ── Lists ── */}
      <Group>
        <ToolBtn active={editor.isActive('bulletList')} onClick={run(() => editor.chain().focus().toggleBulletList().run())} title="قائمة نقطية">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="2" cy="4" r="1.5"/><rect x="5" y="3" width="11" height="2" rx="1"/><circle cx="2" cy="8" r="1.5"/><rect x="5" y="7" width="11" height="2" rx="1"/><circle cx="2" cy="12" r="1.5"/><rect x="5" y="11" width="11" height="2" rx="1"/></svg>
        </ToolBtn>
        <ToolBtn active={editor.isActive('orderedList')} onClick={run(() => editor.chain().focus().toggleOrderedList().run())} title="قائمة مرقمة">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><text x="1" y="5.5" fontSize="5" fontWeight="700" fontFamily="system-ui">1</text><rect x="5" y="3" width="11" height="2" rx="1"/><text x="1" y="9.5" fontSize="5" fontWeight="700" fontFamily="system-ui">2</text><rect x="5" y="7" width="11" height="2" rx="1"/><text x="1" y="13.5" fontSize="5" fontWeight="700" fontFamily="system-ui">3</text><rect x="5" y="11" width="11" height="2" rx="1"/></svg>
        </ToolBtn>
      </Group>

      <Divider />

      {/* ── Text color ── */}
      <Group label="لون النص">
        {TEXT_COLORS.map(c => (
          <ColorDot
            key={c.hex}
            hex={c.hex}
            active={editor.isActive('textStyle', { color: c.hex })}
            onClick={run(() => {
              if (editor.isActive('textStyle', { color: c.hex })) {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(c.hex).run();
              }
            })}
            title={c.label}
          />
        ))}
      </Group>

      <Divider />

      {/* ── Highlight ── */}
      <Group label="تظليل">
        {HIGHLIGHT_COLORS.map(c => (
          <ColorDot
            key={c.hex || 'none'}
            hex={c.hex || 'transparent'}
            active={c.hex ? editor.isActive('highlight', { color: c.hex }) : false}
            onClick={run(() => {
              if (!c.hex || editor.isActive('highlight', { color: c.hex })) {
                editor.chain().focus().unsetHighlight().run();
              } else {
                editor.chain().focus().setHighlight({ color: c.hex }).run();
              }
            })}
            title={c.label}
            isHighlight
          />
        ))}
      </Group>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const BAR_STYLE: React.CSSProperties = {
  height: 44,
  background: '#161b22',
  borderBottom: '1px solid #21262d',
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  gap: 4,
  flexShrink: 0,
  direction: 'ltr',
  overflowX: 'auto',
};

// ─── Sub-components ──────────────────────────────────────────

function Group({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {label && <span style={{ fontSize: 10, color: '#484f58', marginInlineEnd: 3, fontFamily: 'var(--brand-font-family)', whiteSpace: 'nowrap' }}>{label}</span>}
      {children}
    </div>
  );
}

function ToolBtn({
  active, onClick, title, children,
}: {
  active?: boolean;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={onClick}
      title={title}
      style={{
        width: 34, height: 34,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(211,47,47,0.2)' : 'transparent',
        border: active ? '1px solid #D32F2F' : '1px solid transparent',
        borderRadius: 6,
        color: active ? '#ef5350' : '#c9d1d9',
        fontSize: 14, fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'system-ui',
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  );
}

function ColorDot({
  hex, active, onClick, title, isHighlight,
}: {
  hex: string;
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  isHighlight?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={onClick}
      title={title}
      style={{
        width: 22, height: 22,
        borderRadius: isHighlight ? 4 : '50%',
        background: hex === 'transparent' ? '#1c2128' : hex,
        border: `2px solid ${active ? '#ef5350' : (hex === '#FFFFFF' || hex === 'transparent' ? '#555' : hex)}`,
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    />
  );
}

function Divider() {
  return <div style={{ width: 1, height: 26, background: '#30363d', margin: '0 6px', flexShrink: 0 }} />;
}
