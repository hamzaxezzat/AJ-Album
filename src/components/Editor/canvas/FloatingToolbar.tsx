'use client';
import type { Editor } from '@tiptap/react';
import type { BlockStyleOverride } from '@/types/album';

// ─── Types ───────────────────────────────────────────────────

interface FloatingToolbarProps {
  editor: Editor;
  /** Current block font size (from token or override) */
  fontSize: number;
  /** Current block text alignment */
  textAlign: 'right' | 'left' | 'center';
  /** Update block-level style overrides */
  onUpdateStyle: (overrides: Partial<BlockStyleOverride>) => void;
  /** Position in screen space (px from viewport top-left) */
  position: { top: number; left: number };
  /** Canvas scale (for sizing the toolbar proportionally) */
  canvasScale: number;
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
  onUpdateStyle,
  position,
}: FloatingToolbarProps) {
  const run = (cmd: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cmd();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: '#1c2128',
        border: '1px solid #30363d',
        borderRadius: 8,
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        direction: 'ltr',
        flexWrap: 'wrap',
        maxWidth: 520,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Text format marks ── */}
      <ToolBtn
        active={editor.isActive('bold')}
        onClick={run(() => editor.chain().focus().toggleBold().run())}
        title="عريض"
      >
        <strong>B</strong>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('italic')}
        onClick={run(() => editor.chain().focus().toggleItalic().run())}
        title="مائل"
      >
        <em>I</em>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('underline')}
        onClick={run(() => editor.chain().focus().toggleUnderline().run())}
        title="تسطير"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('strike')}
        onClick={run(() => editor.chain().focus().toggleStrike().run())}
        title="يتوسطه خط"
      >
        <s>S</s>
      </ToolBtn>

      <Divider />

      {/* ── Font size ── */}
      <ToolBtn
        onClick={run(() => onUpdateStyle({ fontSize: Math.max(12, fontSize - 2) }))}
        title="تصغير"
      >
        A-
      </ToolBtn>
      <span style={{
        fontSize: 12, color: '#e6edf3', minWidth: 28,
        textAlign: 'center', fontFamily: 'system-ui', userSelect: 'none',
      }}>
        {fontSize}
      </span>
      <ToolBtn
        onClick={run(() => onUpdateStyle({ fontSize: Math.min(120, fontSize + 2) }))}
        title="تكبير"
      >
        A+
      </ToolBtn>

      <Divider />

      {/* ── Text alignment (block-level) ── */}
      <ToolBtn
        active={textAlign === 'right'}
        onClick={run(() => onUpdateStyle({ textAlign: 'right' }))}
        title="يمين"
      >
        ≡⟩
      </ToolBtn>
      <ToolBtn
        active={textAlign === 'center'}
        onClick={run(() => onUpdateStyle({ textAlign: 'center' }))}
        title="وسط"
      >
        ≡
      </ToolBtn>
      <ToolBtn
        active={textAlign === 'left'}
        onClick={run(() => onUpdateStyle({ textAlign: 'left' }))}
        title="يسار"
      >
        ⟨≡
      </ToolBtn>

      <Divider />

      {/* ── Lists ── */}
      <ToolBtn
        active={editor.isActive('bulletList')}
        onClick={run(() => editor.chain().focus().toggleBulletList().run())}
        title="قائمة نقطية"
      >
        •≡
      </ToolBtn>
      <ToolBtn
        active={editor.isActive('orderedList')}
        onClick={run(() => editor.chain().focus().toggleOrderedList().run())}
        title="قائمة مرقمة"
      >
        1≡
      </ToolBtn>

      <Divider />

      {/* ── Text color ── */}
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

      <Divider />

      {/* ── Highlight ── */}
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
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

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
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(211,47,47,0.2)' : 'transparent',
        border: active ? '1px solid #D32F2F' : '1px solid transparent',
        borderRadius: 4,
        color: active ? '#ef5350' : '#8b949e',
        fontSize: 12, fontWeight: 600,
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
        width: 18, height: 18,
        borderRadius: isHighlight ? 3 : '50%',
        background: hex === 'transparent' ? '#1c2128' : hex,
        border: `2px solid ${active ? '#ef5350' : (hex === '#FFFFFF' || hex === 'transparent' ? '#444' : hex)}`,
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    />
  );
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: '#30363d', margin: '0 4px', flexShrink: 0 }} />;
}
