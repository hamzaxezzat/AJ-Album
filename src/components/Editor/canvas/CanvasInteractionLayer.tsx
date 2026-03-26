'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type {
  Slide, ContentBlock, RichTextContent,
  BlockStyleOverride, TypographyProfile, NormalizedRect,
} from '@/types/album';
import { useEditorUIStore } from '@/store/editorUIStore';
import { InlineTextEditor } from './InlineTextEditor';
import { useDragBlock } from './useDragBlock';

// ─── Types ───────────────────────────────────────────────────

interface CanvasInteractionLayerProps {
  slide: Slide;
  canvasW: number;
  canvasH: number;
  canvasScale: number;
  typography: TypographyProfile;
  onUpdateBlockContent: (blockId: string, content: RichTextContent) => void;
  onUpdateBlockPosition: (blockId: string, position: Partial<NormalizedRect>) => void;
  onUpdateBlockStyle: (blockId: string, overrides: Partial<BlockStyleOverride>) => void;
  /** Expose TipTap editor instance to parent (for the toolbar bar) */
  onEditorChange: (editor: Editor | null) => void;
}

const EDITABLE_TYPES = new Set(['main_title', 'body_paragraph', 'subtitle', 'highlighted_phrase']);

// ─── Resize handle positions ─────────────────────────────────

type HandlePos = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: { pos: HandlePos; cursor: string; x: number; y: number }[] = [
  { pos: 'nw', cursor: 'nwse-resize', x: 0, y: 0 },
  { pos: 'ne', cursor: 'nesw-resize', x: 1, y: 0 },
  { pos: 'sw', cursor: 'nesw-resize', x: 0, y: 1 },
  { pos: 'se', cursor: 'nwse-resize', x: 1, y: 1 },
  { pos: 'n',  cursor: 'ns-resize',   x: 0.5, y: 0 },
  { pos: 's',  cursor: 'ns-resize',   x: 0.5, y: 1 },
  { pos: 'w',  cursor: 'ew-resize',   x: 0, y: 0.5 },
  { pos: 'e',  cursor: 'ew-resize',   x: 1, y: 0.5 },
];

// ─── Component ───────────────────────────────────────────────

export function CanvasInteractionLayer({
  slide,
  canvasW,
  canvasH,
  canvasScale,
  typography,
  onUpdateBlockContent,
  onUpdateBlockPosition,
  onUpdateBlockStyle,
  onEditorChange,
}: CanvasInteractionLayerProps) {
  const selectedBlockId = useEditorUIStore(s => s.selectedBlockId);
  const isEditing = useEditorUIStore(s => s.isEditingBlock);
  const selectBlock = useEditorUIStore(s => s.setSelectedBlock);
  const startEditing = useEditorUIStore(s => s.startEditingBlock);
  const stopEditing = useEditorUIStore(s => s.stopEditingBlock);

  const selectedBlock = slide.blocks.find(b => b.id === selectedBlockId) ?? null;
  const editingBlock = isEditing && selectedBlock && EDITABLE_TYPES.has(selectedBlock.type)
    ? (selectedBlock as ContentBlock & { content: RichTextContent; typographyTokenRef: string })
    : null;

  // ── Expose editor to parent ──
  const handleEditorReady = useCallback((editor: Editor) => {
    onEditorChange(editor);
  }, [onEditorChange]);

  // ── Click empty canvas → deselect ──
  const handleLayerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) selectBlock(null);
  }, [selectBlock]);

  // ── Drag to reposition ──
  const handleBlockMoved = useCallback((position: Partial<NormalizedRect>) => {
    if (selectedBlockId) onUpdateBlockPosition(selectedBlockId, position);
  }, [selectedBlockId, onUpdateBlockPosition]);

  const { handleMouseDown: handleDragStart } = useDragBlock({
    canvasW: canvasW * canvasScale,
    canvasH: canvasH * canvasScale,
    onMove: handleBlockMoved,
  });

  // ── Resize handler ──
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    block: ContentBlock,
    handle: HandlePos,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...block.position };
    const scaledW = canvasW * canvasScale;
    const scaledH = canvasH * canvasScale;

    const onMouseMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / scaledW;
      const dy = (me.clientY - startY) / scaledH;
      const next = { ...startPos };

      // Horizontal
      if (handle.includes('e')) {
        next.width = Math.max(0.05, startPos.width + dx);
      } else if (handle.includes('w')) {
        next.x = startPos.x + dx;
        next.width = Math.max(0.05, startPos.width - dx);
      }
      // Vertical
      if (handle.includes('s')) {
        next.height = Math.max(0.03, startPos.height + dy);
      } else if (handle.includes('n')) {
        next.y = startPos.y + dy;
        next.height = Math.max(0.03, startPos.height - dy);
      }

      onUpdateBlockPosition(block.id, next);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [canvasW, canvasH, canvasScale, onUpdateBlockPosition]);

  // ── Content change ──
  const handleContentChange = useCallback((content: RichTextContent) => {
    if (editingBlock) onUpdateBlockContent(editingBlock.id, content);
  }, [editingBlock, onUpdateBlockContent]);

  // ── Stop editing ──
  const handleStopEditing = useCallback(() => {
    stopEditing();
    onEditorChange(null);
  }, [stopEditing, onEditorChange]);

  return (
    <div
      onClick={handleLayerClick}
      style={{ position: 'absolute', inset: 0, zIndex: 100, cursor: 'default' }}
    >
      {/* Block overlays */}
      {slide.blocks.filter(b => b.visible).map(block => {
        const isSelected = block.id === selectedBlockId;
        const isBeingEdited = editingBlock?.id === block.id;
        const isTextBlock = EDITABLE_TYPES.has(block.type);
        const bx = block.position.x * canvasW;
        const by = block.position.y * canvasH;
        const bw = block.position.width * canvasW;
        const bh = block.position.height * canvasH;

        return (
          <div
            key={block.id}
            style={{
              position: 'absolute',
              left: bx, top: by, width: bw, height: bh,
              outline: isSelected && !isBeingEdited ? '2px solid #2196F3' : '2px solid transparent',
              outlineOffset: 2, borderRadius: 2,
              cursor: isSelected && !isBeingEdited ? 'move' : isTextBlock ? 'pointer' : 'default',
              transition: 'outline-color 0.15s',
              zIndex: isSelected ? 10 : 1,
              pointerEvents: isBeingEdited ? 'none' : 'auto',
              opacity: isBeingEdited ? 0 : 1,
            }}
            onClick={(e) => { e.stopPropagation(); if (!isSelected) selectBlock(block.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); if (isTextBlock) { selectBlock(block.id); startEditing(); } }}
            onMouseDown={(e) => { if (isSelected && !isEditing) handleDragStart(e, block.position); }}
            onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(33,150,243,0.4)'; }}
            onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.outlineColor = 'transparent'; }}
          >
            {/* Resize handles — only when selected and not editing */}
            {isSelected && !isBeingEdited && HANDLES.map(h => (
              <div
                key={h.pos}
                style={{
                  position: 'absolute',
                  left: h.x * bw - 5,
                  top: h.y * bh - 5,
                  width: 10, height: 10,
                  background: '#2196F3',
                  border: '2px solid #fff',
                  borderRadius: 2,
                  cursor: h.cursor,
                  zIndex: 20,
                }}
                onMouseDown={(e) => handleResizeStart(e, block, h.pos)}
              />
            ))}
          </div>
        );
      })}

      {/* Inline text editor */}
      {editingBlock && (
        <InlineTextEditor
          block={editingBlock}
          typography={typography}
          canvasW={canvasW}
          canvasH={canvasH}
          onChange={handleContentChange}
          onEditorReady={handleEditorReady}
          onClickOutside={handleStopEditing}
        />
      )}
    </div>
  );
}
