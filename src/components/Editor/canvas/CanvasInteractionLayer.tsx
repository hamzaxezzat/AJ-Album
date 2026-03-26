'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type {
  Slide, Album, ContentBlock, RichTextContent,
  BlockStyleOverride, TypographyProfile, NormalizedRect,
} from '@/types/album';
import { useEditorUIStore } from '@/store/editorUIStore';
import { InlineTextEditor } from './InlineTextEditor';
import { FloatingToolbar } from './FloatingToolbar';
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
}

// ─── Editable block types ────────────────────────────────────

const EDITABLE_TYPES = new Set(['main_title', 'body_paragraph', 'subtitle', 'highlighted_phrase']);

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
}: CanvasInteractionLayerProps) {
  const selectedBlockId = useEditorUIStore(s => s.selectedBlockId);
  const isEditing = useEditorUIStore(s => s.isEditingBlock);
  const selectBlock = useEditorUIStore(s => s.setSelectedBlock);
  const startEditing = useEditorUIStore(s => s.startEditingBlock);
  const stopEditing = useEditorUIStore(s => s.stopEditingBlock);

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  const selectedBlock = slide.blocks.find(b => b.id === selectedBlockId) ?? null;
  const editingBlock = isEditing && selectedBlock && EDITABLE_TYPES.has(selectedBlock.type)
    ? (selectedBlock as ContentBlock & { content: RichTextContent; typographyTokenRef: string })
    : null;

  // ── Compute toolbar screen position ──
  useEffect(() => {
    if (!editingBlock || !layerRef.current) {
      setToolbarPos(null);
      return;
    }
    const layerRect = layerRef.current.getBoundingClientRect();
    const blockLeft = editingBlock.position.x * canvasW * canvasScale;
    const blockTop = editingBlock.position.y * canvasH * canvasScale;
    const blockWidth = editingBlock.position.width * canvasW * canvasScale;

    setToolbarPos({
      top: layerRect.top + blockTop - 48,
      left: layerRect.left + blockLeft + blockWidth / 2,
    });
  }, [editingBlock, canvasW, canvasH, canvasScale]);

  // ── Click on empty canvas → deselect ──
  const handleLayerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectBlock(null);
    }
  }, [selectBlock]);

  // ── Drag handler for selected block ──
  const handleBlockMoved = useCallback((position: Partial<NormalizedRect>) => {
    if (selectedBlockId) {
      onUpdateBlockPosition(selectedBlockId, position);
    }
  }, [selectedBlockId, onUpdateBlockPosition]);

  const { handleMouseDown: handleDragStart } = useDragBlock({
    canvasW: canvasW * canvasScale,
    canvasH: canvasH * canvasScale,
    onMove: handleBlockMoved,
  });

  // ── Block content change (from inline editor) ──
  const handleContentChange = useCallback((content: RichTextContent) => {
    if (editingBlock) {
      onUpdateBlockContent(editingBlock.id, content);
    }
  }, [editingBlock, onUpdateBlockContent]);

  // ── Block style change (from toolbar) ──
  const handleStyleChange = useCallback((overrides: Partial<BlockStyleOverride>) => {
    if (selectedBlockId) {
      onUpdateBlockStyle(selectedBlockId, overrides);
    }
  }, [selectedBlockId, onUpdateBlockStyle]);

  // ── Stop editing ──
  const handleStopEditing = useCallback(() => {
    stopEditing();
    setActiveEditor(null);
  }, [stopEditing]);

  // ── Resolve current font size for toolbar ──
  const currentFontSize = (() => {
    if (!selectedBlock) return 28;
    const tokenRef = ('typographyTokenRef' in selectedBlock)
      ? (selectedBlock as { typographyTokenRef: string }).typographyTokenRef
      : 'body-m';
    const token = typography[tokenRef as keyof TypographyProfile];
    return selectedBlock.styleOverrides?.fontSize ?? token?.fontSize ?? 28;
  })();

  const currentTextAlign = selectedBlock?.styleOverrides?.textAlign ?? 'right';

  return (
    <>
      {/* Interaction layer — same size as canvas, positioned on top */}
      <div
        ref={layerRef}
        onClick={handleLayerClick}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          cursor: 'default',
        }}
      >
        {/* Block overlays — clickable selection zones */}
        {slide.blocks.filter(b => b.visible).map(block => {
          const isSelected = block.id === selectedBlockId;
          const isBeingEdited = editingBlock?.id === block.id;
          const isTextBlock = EDITABLE_TYPES.has(block.type);

          return (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                left: block.position.x * canvasW,
                top: block.position.y * canvasH,
                width: block.position.width * canvasW,
                height: block.position.height * canvasH,
                // Selection outline
                outline: isSelected && !isBeingEdited
                  ? '2px solid #2196F3'
                  : '2px solid transparent',
                outlineOffset: 2,
                borderRadius: 2,
                cursor: isSelected && !isBeingEdited
                  ? 'move'
                  : isTextBlock ? 'pointer' : 'default',
                // Hover hint
                transition: 'outline-color 0.15s',
                zIndex: isSelected ? 10 : 1,
                // Hide overlay when inline editing this block (the InlineTextEditor takes over)
                pointerEvents: isBeingEdited ? 'none' : 'auto',
                opacity: isBeingEdited ? 0 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelected) {
                  selectBlock(block.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isTextBlock) {
                  selectBlock(block.id);
                  startEditing();
                }
              }}
              onMouseDown={(e) => {
                if (isSelected && !isEditing) {
                  handleDragStart(e, block.position);
                }
              }}
              // Hover outline
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.outlineColor = 'rgba(33,150,243,0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.outlineColor = 'transparent';
                }
              }}
            />
          );
        })}

        {/* Inline text editor — replaces the block visually while editing */}
        {editingBlock && (
          <InlineTextEditor
            block={editingBlock}
            typography={typography}
            canvasW={canvasW}
            canvasH={canvasH}
            onChange={handleContentChange}
            onEditorReady={setActiveEditor}
            onClickOutside={handleStopEditing}
          />
        )}
      </div>

      {/* Floating toolbar — positioned in screen space, outside the zoom container */}
      {editingBlock && activeEditor && toolbarPos && (
        <div data-floating-toolbar style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
          <div style={{ pointerEvents: 'auto' }}>
            <FloatingToolbar
              editor={activeEditor}
              fontSize={currentFontSize}
              textAlign={currentTextAlign}
              onUpdateStyle={handleStyleChange}
              position={toolbarPos}
              canvasScale={canvasScale}
            />
          </div>
        </div>
      )}
    </>
  );
}
