'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import type {
  ChannelProfile,
  BannerPosition,
  MainTitleBlock,
  BodyParagraphBlock,
  RichTextContent,
  BlockStyleOverride,
  NormalizedRect,
} from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import { useCanvasScale } from './hooks/useCanvasScale';
import { makeBlankSlide } from './lib/slideFactory';
import { SlideStrip } from './panels/SlideStrip';
import { PropertiesPanel } from './panels/PropertiesPanel';
import { CanvasInteractionLayer } from './canvas/CanvasInteractionLayer';
import ajMainRaw from '../../../config/brands/aj-main.json';

type LogoVariant = 'auto' | 'dark' | 'white';
const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── Editor Client ────────────────────────────────────────────

export function EditorClient({ albumId }: { albumId: string }) {
  // ── Store ──
  const album = useDocumentStore((s) => s.album);
  const loadFromLocalStorage = useDocumentStore((s) => s.loadFromLocalStorage);
  const updateSlide = useDocumentStore((s) => s.updateSlide);
  const addSlide = useDocumentStore((s) => s.addSlide);
  const deleteSlide = useDocumentStore((s) => s.deleteSlide);
  const duplicateSlide = useDocumentStore((s) => s.duplicateSlide);
  const selectedSlideId = useEditorUIStore((s) => s.selectedSlideId);
  const setSelectedSlide = useEditorUIStore((s) => s.setSelectedSlide);
  const [loadAttempted, setLoadAttempted] = useState(false);

  // ── Responsive canvas ──
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const canvasW = album?.canvasDimensions.width ?? 1080;
  const canvasH = album?.canvasDimensions.height ?? 1350;
  const canvasScale = useCanvasScale(canvasAreaRef, canvasW, canvasH);

  // ── Load album ──
  useEffect(() => {
    if (album?.id === albumId) { setLoadAttempted(true); return; }
    loadFromLocalStorage(albumId).then(() => setLoadAttempted(true));
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (album?.id === albumId && album.slides.length > 0 && !selectedSlideId) {
      setSelectedSlide(album.slides[0].id);
    }
  }, [album, albumId, selectedSlideId, setSelectedSlide]);

  const selectedSlide = album?.slides.find((s) => s.id === selectedSlideId) ?? null;

  // ── Callbacks ──

  const handleUpdateTitle = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.type === 'main_title');
      if (b) (b as MainTitleBlock).content = content;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBody = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.type === 'body_paragraph');
      if (b) (b as BodyParagraphBlock).content = content;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBlockStyle = useCallback((
    blockType: 'main_title' | 'body_paragraph',
    overrides: Partial<BlockStyleOverride>,
  ) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.type === blockType);
      if (b) b.styleOverrides = { ...b.styleOverrides, ...overrides };
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBanner = useCallback((pos: BannerPosition) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (slide.banner) slide.banner.position = pos;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBannerHeight = useCallback((height: number) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (slide.banner) slide.banner.heightNormalized = height;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateSource = useCallback((text: string) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (!slide.source) {
        slide.source = { text, visible: true, sizeMode: 'auto', paginationBehavior: 'share-space' };
      } else {
        slide.source.text = text;
      }
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateLogoVariant = useCallback((variant: LogoVariant) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => { slide.logoVariant = variant; });
  }, [selectedSlide, updateSlide]);

  const handleUploadImage = useCallback((dataUrl: string) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      slide.image = {
        asset: { id: slide.id, url: dataUrl, mimeType: 'image/jpeg', width: 1080, height: 1350 },
        rect: { x: 0, y: 0, width: 1, height: 0.54 },
        objectFit: 'cover',
        focalPoint: { x: 0.5, y: 0.5 },
      };
    });
  }, [selectedSlide, updateSlide]);

  // ── Canvas interaction callbacks ──

  const handleUpdateBlockContent = useCallback((blockId: string, content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b && 'content' in b) {
        (b as MainTitleBlock | BodyParagraphBlock).content = content;
      }
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBlockPosition = useCallback((blockId: string, position: Partial<NormalizedRect>) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b) Object.assign(b.position, position);
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBlockStyleById = useCallback((blockId: string, overrides: Partial<BlockStyleOverride>) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b) b.styleOverrides = { ...b.styleOverrides, ...overrides };
    });
  }, [selectedSlide, updateSlide]);

  const handleAddSlide = useCallback(() => {
    if (!album) return;
    const idx = album.slides.findIndex(s => s.id === selectedSlideId);
    const after = idx >= 0 ? idx : album.slides.length - 1;
    const ns = makeBlankSlide(after + 2);
    addSlide(ns, after);
    setSelectedSlide(ns.id);
  }, [album, selectedSlideId, addSlide, setSelectedSlide]);

  const handleDeleteSlide = useCallback((slideId: string) => {
    if (!album || album.slides.length <= 1) return;
    const idx = album.slides.findIndex(s => s.id === slideId);
    deleteSlide(slideId);
    const remaining = album.slides.filter(s => s.id !== slideId);
    if (remaining.length > 0) setSelectedSlide(remaining[Math.min(idx, remaining.length - 1)].id);
  }, [album, deleteSlide, setSelectedSlide]);

  const handleDuplicateSlide = useCallback((slideId: string) => {
    const ns = duplicateSlide(slideId);
    if (ns) setSelectedSlide(ns.id);
  }, [duplicateSlide, setSelectedSlide]);

  const handleExport = useCallback(async () => {
    if (!selectedSlide || !album) return;
    try {
      const res = await fetch('http://localhost:3001/export/slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slide: selectedSlide, album, channelProfile }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${selectedSlide.number}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('تأكد من تشغيل خدمة التصدير على المنفذ 3001');
    }
  }, [selectedSlide, album]);

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
          <Link href="/" style={{ color: '#8b949e', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
          <span style={{ fontFamily: 'var(--brand-font-family)', fontWeight: 700, fontSize: 15, color: '#e6edf3' }} dir="rtl" lang="ar">
            {album.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: '#D32F2F', color: '#fff', fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 4 }}>
            الجزيرة
          </span>
          <button type="button" onClick={handleExport} style={{
            background: '#21262d', color: '#e6edf3', border: '1px solid #30363d',
            borderRadius: 5, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--brand-font-family)',
          }}>
            تصدير PNG
          </button>
        </div>
      </header>

      {/* ── Body: 3-panel layout ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left: Slide strip */}
        <SlideStrip
          album={album}
          channelProfile={channelProfile}
          selectedSlideId={selectedSlideId}
          onSelectSlide={setSelectedSlide}
          onAddSlide={handleAddSlide}
          onDeleteSlide={handleDeleteSlide}
          onDuplicateSlide={handleDuplicateSlide}
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
                <div style={{ zoom: canvasScale, position: 'relative' } as React.CSSProperties}>
                  <SlideRenderer slide={selectedSlide} album={album} channelProfile={channelProfile} />
                  <CanvasInteractionLayer
                    slide={selectedSlide}
                    canvasW={canvasW}
                    canvasH={canvasH}
                    canvasScale={canvasScale}
                    typography={channelProfile.typography}
                    onUpdateBlockContent={handleUpdateBlockContent}
                    onUpdateBlockPosition={handleUpdateBlockPosition}
                    onUpdateBlockStyle={handleUpdateBlockStyleById}
                  />
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#444c56', fontFamily: 'system-ui' }}>
                {canvasW} × {canvasH} · شريحة {selectedSlide.number}
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
              onUpdateTitle={handleUpdateTitle}
              onUpdateBody={handleUpdateBody}
              onUpdateBlockStyle={handleUpdateBlockStyle}
              onUpdateBanner={handleUpdateBanner}
              onUpdateBannerHeight={handleUpdateBannerHeight}
              onUpdateSource={handleUpdateSource}
              onUploadImage={handleUploadImage}
              onUpdateLogoVariant={handleUpdateLogoVariant}
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
