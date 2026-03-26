'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import type {
  ChannelProfile,
  BlockStyleOverride,
} from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import { useHistoryStore } from '@/store/historyStore';
import { useCanvasScale } from './hooks/useCanvasScale';
import { useBlockUpdates } from './hooks/useBlockUpdates';
import { useSlideManagement } from './hooks/useSlideManagement';
import { useExport } from './hooks/useExport';
import { useLayerManagement } from './hooks/useLayerManagement';
import { SlideStrip } from './panels/SlideStrip';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { CanvasInteractionLayer } from './canvas/CanvasInteractionLayer';
import { FloatingToolbar } from './canvas/FloatingToolbar';
import type { Editor } from '@tiptap/react';
import type { TypographyProfile } from '@/types/album';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── Editor Client ────────────────────────────────────────────

export function EditorClient({ albumId }: { albumId: string }) {
  // ── Store ──
  const album = useDocumentStore((s) => s.album);
  const setAlbum = useDocumentStore((s) => s.setAlbum);
  const loadFromLocalStorage = useDocumentStore((s) => s.loadFromLocalStorage);
  const updateAlbumTheme = useDocumentStore((s) => s.updateAlbumTheme);
  const selectedSlideId = useEditorUIStore((s) => s.selectedSlideId);
  const setSelectedSlide = useEditorUIStore((s) => s.setSelectedSlide);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  // ── History ──
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const clearHistory = useHistoryStore((s) => s.clear);

  // ── Responsive canvas ──
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasW = album?.canvasDimensions.width ?? 1080;
  const canvasH = album?.canvasDimensions.height ?? 1350;
  const canvasScale = useCanvasScale(canvasAreaRef, canvasW, canvasH);

  // ── Load album ──
  useEffect(() => {
    if (album?.id === albumId) { setLoadAttempted(true); return; }
    clearHistory();
    loadFromLocalStorage(albumId).then(() => setLoadAttempted(true));
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (album?.id === albumId && album.slides.length > 0 && !selectedSlideId) {
      setSelectedSlide(album.slides[0].id);
    }
  }, [album, albumId, selectedSlideId, setSelectedSlide]);

  const selectedSlide = album?.slides.find((s) => s.id === selectedSlideId) ?? null;

  // ── SOLID hooks ──
  const blockUpdates = useBlockUpdates(selectedSlide);
  const slideManagement = useSlideManagement();
  const exportActions = useExport({ album, selectedSlide, channelProfile });
  const layerManagement = useLayerManagement(selectedSlide);

  // ── Undo / Redo handlers ──
  const handleUndo = useCallback(() => {
    if (!album) return;
    const restored = undo(album);
    if (restored) setAlbum(restored);
  }, [album, undo, setAlbum]);

  const handleRedo = useCallback(() => {
    if (!album) return;
    const restored = redo(album);
    if (restored) setAlbum(restored);
  }, [album, redo, setAlbum]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  // ── Toolbar data (for the fixed bar) ──
  const selectedBlockForToolbar = selectedSlide?.blocks.find(
    b => b.id === useEditorUIStore.getState().selectedBlockId
  ) ?? null;

  const toolbarFontSize = (() => {
    if (!selectedBlockForToolbar) return 28;
    const ref = ('typographyTokenRef' in selectedBlockForToolbar)
      ? (selectedBlockForToolbar as { typographyTokenRef: string }).typographyTokenRef
      : 'body-m';
    const token = channelProfile.typography[ref as keyof TypographyProfile];
    return selectedBlockForToolbar.styleOverrides?.fontSize ?? token?.fontSize ?? 28;
  })();

  const toolbarTextAlign = selectedBlockForToolbar?.styleOverrides?.textAlign ?? 'right';

  const toolbarKashida = (() => {
    if (!selectedBlockForToolbar) return false;
    if ('kashidaEnabled' in selectedBlockForToolbar) {
      return (selectedBlockForToolbar as { kashidaEnabled?: boolean }).kashidaEnabled !== false;
    }
    return false;
  })();

  const handleToolbarStyle = useCallback((overrides: Partial<BlockStyleOverride>) => {
    const blockId = useEditorUIStore.getState().selectedBlockId;
    if (!blockId || !selectedSlide) return;
    blockUpdates.handleUpdateBlockStyleById(blockId, overrides);
  }, [selectedSlide, blockUpdates]);

  const handleToggleKashida = useCallback(() => {
    const blockId = useEditorUIStore.getState().selectedBlockId;
    if (!blockId || !selectedSlide) return;
    const updateSlide = useDocumentStore.getState().updateSlide;
    updateSlide(selectedSlide.id, (slide) => {
      const block = slide.blocks.find(b => b.id === blockId);
      if (block && 'kashidaEnabled' in block) {
        (block as { kashidaEnabled: boolean }).kashidaEnabled = !(block as { kashidaEnabled: boolean }).kashidaEnabled;
      }
    });
  }, [selectedSlide]);

  // ── Loading / not-found ──

  const centerStyle: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0D1117', color: '#e6edf3', fontFamily: 'var(--brand-font-family)',
    flexDirection: 'column', gap: 16,
  };

  if (!loadAttempted) {
    return <div style={centerStyle}><p>جاري التحميل...</p></div>;
  }

  if (!album || album.id !== albumId) {
    return (
      <div style={centerStyle}>
        <h2>الألبوم غير موجود</h2>
        <Link href="/" style={{ color: '#D32F2F', textDecoration: 'none' }}>العودة إلى الرئيسية</Link>
      </div>
    );
  }

  // ── Layout ──

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0D1117', color: '#e6edf3',
      fontFamily: 'var(--brand-font-family)', overflow: 'hidden',
    }}>
      {/* ── Top bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, padding: '0 16px', background: '#161b22',
        borderBottom: '1px solid #21262d', flexShrink: 0, direction: 'rtl',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#8b949e', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>&#8592;</Link>
          <span style={{ fontFamily: 'var(--brand-font-family)', fontWeight: 700, fontSize: 15, color: '#e6edf3' }} dir="rtl" lang="ar">
            {album.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Undo / Redo */}
          <UndoRedoButtons
            canUndo={canUndo()}
            canRedo={canRedo()}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <span style={{ width: 1, height: 24, background: '#30363d' }} />

          <span style={{ background: '#D32F2F', color: '#fff', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 4 }}>
            الجزيرة
          </span>

          {/* Export slide */}
          <button type="button" onClick={exportActions.handleExportSlide} disabled={exportActions.isExporting} style={{
            background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
            borderRadius: 5, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--brand-font-family)',
            opacity: exportActions.isExporting ? 0.5 : 1,
          }}>
            تصدير PNG
          </button>

          {/* Export album ZIP */}
          <button type="button" onClick={exportActions.handleExportAlbum} disabled={exportActions.isExporting} style={{
            background: '#D32F2F', color: '#fff', border: 'none',
            borderRadius: 5, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--brand-font-family)',
            opacity: exportActions.isExporting ? 0.5 : 1,
          }}>
            {exportActions.isExporting && exportActions.exportProgress
              ? `تصدير ${exportActions.exportProgress.current}/${exportActions.exportProgress.total}`
              : 'تصدير ZIP'
            }
          </button>
        </div>
      </header>

      {/* Export error banner */}
      {exportActions.exportError && (
        <div style={{
          background: 'rgba(244,67,54,0.1)', borderBottom: '1px solid rgba(244,67,54,0.3)',
          padding: '8px 16px', fontSize: 12, color: '#ef5350',
          fontFamily: 'var(--brand-font-family)', direction: 'rtl',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{exportActions.exportError}</span>
          <button type="button" onClick={exportActions.clearExportError} style={{
            background: 'none', border: 'none', color: '#ef5350', cursor: 'pointer', fontSize: 16,
          }}>
            &#10005;
          </button>
        </div>
      )}

      {/* ── Formatting toolbar bar (fixed under header) ── */}
      <FloatingToolbar
        editor={activeEditor}
        fontSize={toolbarFontSize}
        textAlign={toolbarTextAlign}
        kashidaEnabled={toolbarKashida}
        onUpdateStyle={handleToolbarStyle}
        onToggleKashida={handleToggleKashida}
      />

      {/* ── Body: 3-panel layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: Slide strip */}
        <SlideStrip
          album={album}
          channelProfile={channelProfile}
          selectedSlideId={selectedSlideId}
          onSelectSlide={setSelectedSlide}
          onAddSlide={slideManagement.handleAddSlide}
          onDeleteSlide={slideManagement.handleDeleteSlide}
          onDuplicateSlide={slideManagement.handleDuplicateSlide}
        />

        {/* Center: Canvas */}
        <main
          ref={canvasAreaRef}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0D1117', overflow: 'hidden', minWidth: 0,
          }}
        >
          {selectedSlide ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: Math.round(canvasW * canvasScale),
                height: Math.round(canvasH * canvasScale),
                borderRadius: 4,
                boxShadow: '0 0 0 1px #30363d, 0 4px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden', flexShrink: 0,
                position: 'relative',
              }}>
                <div style={{
                  zoom: canvasScale,
                  position: 'relative',
                } as React.CSSProperties}>
                  <SlideRenderer slide={selectedSlide} album={album} channelProfile={channelProfile} />
                  <CanvasInteractionLayer
                    slide={selectedSlide}
                    canvasW={canvasW}
                    canvasH={canvasH}
                    canvasScale={canvasScale}
                    typography={channelProfile.typography}
                    onUpdateBlockContent={blockUpdates.handleUpdateBlockContent}
                    onUpdateBlockPosition={blockUpdates.handleUpdateBlockPosition}
                    onUpdateBlockStyle={blockUpdates.handleUpdateBlockStyleById}
                    onEditorChange={setActiveEditor}
                  />
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#444c56', fontFamily: 'system-ui' }}>
                {canvasW} &times; {canvasH} &middot; شريحة {selectedSlide.number}
              </span>
            </div>
          ) : (
            <p style={{ color: '#444c56', fontSize: 14 }}>اختر شريحة من القائمة</p>
          )}
        </main>

        {/* Right: Properties panel */}
        <aside style={{
          width: 300, background: '#161b22',
          borderRight: '1px solid #21262d', overflow: 'hidden', flexShrink: 0,
        }}>
          {selectedSlide ? (
            <PropertiesPanel
              slide={selectedSlide}
              album={album}
              channelProfile={channelProfile}
              onUpdateTitle={blockUpdates.handleUpdateTitle}
              onUpdateBody={blockUpdates.handleUpdateBody}
              onUpdateBlockStyle={blockUpdates.handleUpdateBlockStyle}
              onUpdateBanner={blockUpdates.handleUpdateBanner}
              onUpdateBannerHeight={blockUpdates.handleUpdateBannerHeight}
              onUpdateSource={blockUpdates.handleUpdateSource}
              onUploadImage={blockUpdates.handleUploadImage}
              onUpdateLogoVariant={blockUpdates.handleUpdateLogoVariant}
              onUpdateAlbumTheme={updateAlbumTheme}
              onUpdateSlideOverrides={blockUpdates.handleUpdateSlideOverrides}
              onAddBlock={layerManagement.handleAddBlock}
              onDeleteBlock={layerManagement.handleDeleteBlock}
              onReorderBlocks={layerManagement.handleReorderBlocks}
              onToggleVisibility={layerManagement.handleToggleVisibility}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: '#444c56', fontSize: 13 }}>اختر شريحة للتحرير</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function UndoRedoButtons({
  canUndo, canRedo, onUndo, onRedo,
}: {
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
}) {
  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: '1px solid #30363d',
    borderRadius: 4,
    color: enabled ? '#c9d1d9' : '#484f58',
    cursor: enabled ? 'pointer' : 'default',
    padding: '4px 8px',
    fontSize: 16,
    lineHeight: 1,
    opacity: enabled ? 1 : 0.4,
  });

  return (
    <div style={{ display: 'flex', gap: 2 }}>
      <button type="button" onClick={onUndo} disabled={!canUndo} title="تراجع (Ctrl+Z)" style={btnStyle(canUndo)}>
        &#8630;
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo} title="إعادة (Ctrl+Shift+Z)" style={btnStyle(canRedo)}>
        &#8631;
      </button>
    </div>
  );
}
