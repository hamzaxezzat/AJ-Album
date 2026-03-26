'use client';
import { useState, useCallback, useRef } from 'react';
import type { ContentBlock, Slide, RichTextContent } from '@/types/album';
import { useEditorUIStore } from '@/store/editorUIStore';

// ─── Types ───────────────────────────────────────────────────

type AddableBlockType = 'text_box' | 'rectangle' | 'ellipse';

interface LayersPanelProps {
  slide: Slide;
  onAddBlock: (type: AddableBlockType) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (blockIds: string[]) => void;
  onToggleVisibility: (blockId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────

const BLOCK_TYPE_LABELS: Record<string, string> = {
  main_title: 'عنوان رئيسي',
  subtitle: 'عنوان فرعي',
  body_paragraph: 'نص أساسي',
  text_box: 'مربع نص',
  highlighted_phrase: 'جملة بارزة',
  bullet_list: 'قائمة نقطية',
  numbered_list: 'قائمة مرقمة',
  credential_row: 'بيانات',
  stat_value: 'إحصائية',
  quote_block: 'اقتباس',
  callout: 'تنبيه',
  source_line: 'مصدر',
  divider: 'فاصل',
  rectangle: 'مستطيل',
  ellipse: 'دائرة',
  image_zone: 'صورة',
  comparison_block: 'مقارنة',
  timeline_item: 'خط زمني',
  infographic_row: 'إنفوجرافيك',
  icon_text_row: 'أيقونة + نص',
  flag_logo_text_row: 'علم + نص',
};

const BLOCK_TYPE_ICONS: Record<string, string> = {
  main_title: 'T',
  subtitle: 'T',
  body_paragraph: '¶',
  text_box: 'Aa',
  highlighted_phrase: 'H',
  bullet_list: '•',
  numbered_list: '#',
  rectangle: '▬',
  ellipse: '●',
  divider: '—',
  image_zone: '🖼',
  stat_value: '٪',
  quote_block: '❝',
  callout: '!',
  credential_row: '≡',
};

const CORE_TYPES = new Set(['main_title', 'body_paragraph']);

function getBlockLabel(block: ContentBlock): string {
  // For blocks with a label field
  if ('label' in block && (block as { label: string }).label) {
    return (block as { label: string }).label;
  }
  // For text blocks, show content preview
  if ('content' in block) {
    const content = (block as { content: RichTextContent }).content;
    const text = extractPlainText(content);
    if (text.length > 0) return text.slice(0, 25) + (text.length > 25 ? '…' : '');
  }
  return BLOCK_TYPE_LABELS[block.type] ?? block.type;
}

function extractPlainText(content: RichTextContent | null | undefined): string {
  if (!content?.content) return '';
  const parts: string[] = [];
  for (const node of content.content as Array<{ content?: Array<{ text?: string }> }>) {
    if (node.content) {
      for (const child of node.content) {
        if (child.text) parts.push(child.text);
      }
    }
  }
  return parts.join(' ');
}

// ─── Component ───────────────────────────────────────────────

export function LayersPanel({
  slide,
  onAddBlock,
  onDeleteBlock,
  onReorderBlocks,
  onToggleVisibility,
}: LayersPanelProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const selectedBlockId = useEditorUIStore(s => s.selectedBlockId);
  const setSelectedBlock = useEditorUIStore(s => s.setSelectedBlock);
  const dragItem = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  // Sort blocks by zIndex descending (front → back)
  const sortedBlocks = [...slide.blocks].sort((a, b) => b.zIndex - a.zIndex);

  const handleDragStart = useCallback((blockId: string) => {
    dragItem.current = blockId;
  }, []);

  const handleDragEnter = useCallback((blockId: string) => {
    dragOver.current = blockId;
  }, []);

  const handleDrop = useCallback(() => {
    if (!dragItem.current || !dragOver.current || dragItem.current === dragOver.current) return;
    const items = sortedBlocks.map(b => b.id);
    const fromIdx = items.indexOf(dragItem.current);
    const toIdx = items.indexOf(dragOver.current);
    if (fromIdx === -1 || toIdx === -1) return;
    items.splice(fromIdx, 1);
    items.splice(toIdx, 0, dragItem.current);
    // Reverse so index 0 = lowest zIndex (back), last = highest (front)
    onReorderBlocks([...items].reverse());
    dragItem.current = null;
    dragOver.current = null;
  }, [sortedBlocks, onReorderBlocks]);

  const handleAddClick = useCallback((type: AddableBlockType) => {
    onAddBlock(type);
    setShowAddMenu(false);
  }, [onAddBlock]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 10, borderBottom: '1px solid #21262d', marginBottom: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>
          الطبقات ({slide.blocks.length})
        </span>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
              color: '#8b949e', width: 26, height: 26, fontSize: 16,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
          {showAddMenu && (
            <div style={{
              position: 'absolute', top: 30, left: 0,
              background: '#161b22', border: '1px solid #30363d', borderRadius: 6,
              padding: 4, zIndex: 1000, minWidth: 140, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}>
              <AddMenuItem label="مربع نص" icon="Aa" onClick={() => handleAddClick('text_box')} />
              <AddMenuItem label="مستطيل" icon="▬" onClick={() => handleAddClick('rectangle')} />
              <AddMenuItem label="دائرة" icon="●" onClick={() => handleAddClick('ellipse')} />
            </div>
          )}
        </div>
      </div>

      {/* Block list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortedBlocks.map(block => (
          <div
            key={block.id}
            draggable
            onDragStart={() => handleDragStart(block.id)}
            onDragEnter={() => handleDragEnter(block.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => setSelectedBlock(block.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 6px', borderRadius: 4, cursor: 'pointer',
              background: selectedBlockId === block.id ? 'rgba(33,150,243,0.15)' : 'transparent',
              border: selectedBlockId === block.id ? '1px solid rgba(33,150,243,0.3)' : '1px solid transparent',
              opacity: block.visible ? 1 : 0.4,
              transition: 'background 0.1s',
            }}
          >
            {/* Drag handle */}
            <span style={{ color: '#484f58', fontSize: 10, cursor: 'grab', userSelect: 'none' }}>⠿</span>

            {/* Type icon */}
            <span style={{
              width: 22, height: 22, borderRadius: 3,
              background: '#21262d', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#8b949e', flexShrink: 0, fontFamily: 'system-ui',
            }}>
              {BLOCK_TYPE_ICONS[block.type] ?? '□'}
            </span>

            {/* Label */}
            <span style={{
              flex: 1, fontSize: 12, color: '#c9d1d9', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {getBlockLabel(block)}
            </span>

            {/* Visibility toggle */}
            <button
              type="button"
              title={block.visible ? 'إخفاء' : 'إظهار'}
              onClick={(e) => { e.stopPropagation(); onToggleVisibility(block.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: block.visible ? '#8b949e' : '#484f58',
                fontSize: 14, padding: 2, lineHeight: 1,
              }}
            >
              {block.visible ? '👁' : '◡'}
            </button>

            {/* Delete (hidden for core blocks) */}
            {!CORE_TYPES.has(block.type) && (
              <button
                type="button"
                title="حذف"
                onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#484f58', fontSize: 12, padding: 2, lineHeight: 1,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#f85149'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#484f58'; }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function AddMenuItem({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 10px', background: 'none', border: 'none',
        color: '#c9d1d9', fontSize: 13, cursor: 'pointer', borderRadius: 4,
        fontFamily: 'var(--brand-font-family)',
        textAlign: 'right', direction: 'rtl',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#21262d'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
    >
      <span style={{ width: 20, textAlign: 'center', fontFamily: 'system-ui', fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
