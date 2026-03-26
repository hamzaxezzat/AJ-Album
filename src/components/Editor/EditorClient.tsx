'use client';
import { useEffect, useCallback, useState, useRef } from 'react';
import Link from 'next/link';
import type {
  ChannelProfile,
  Slide,
  BannerPosition,
  MainTitleBlock,
  BodyParagraphBlock,
  RichTextContent,
} from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import { RichTextEditor } from './RichTextEditor';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const CANVAS_SCALE = 0.5;
const CANVAS_DISPLAY_W = CANVAS_W * CANVAS_SCALE;   // 540
const CANVAS_DISPLAY_H = CANVAS_H * CANVAS_SCALE;   // 675

const THUMB_W = 144;
const THUMB_SCALE = THUMB_W / CANVAS_W;             // ≈0.133
const THUMB_H = Math.round(CANVAS_H * THUMB_SCALE); // ≈180

const BANNER_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top', label: 'أعلى' },
  { value: 'bottom', label: 'أسفل' },
  { value: 'float-top', label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
  { value: 'none', label: 'بدون' },
];

const ARCHETYPE_LABELS: Record<string, string> = {
  standard_title_body: 'عنوان + نص',
  bullet_list: 'قائمة نقطية',
  highlighted_statement: 'جملة بارزة',
  data_card: 'بطاقة بيانات',
  credentials_profile: 'بيانات شخصية',
  mixed_info: 'معلومات متنوعة',
};

function plainToRichText(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  };
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1080 / img.width, 1350 / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function makeBlankSlide(number: number): Slide {
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  return {
    id, number, role: 'inner', archetypeId: 'standard_title_body',
    blocks: [
      { id: `${id}-title`, type: 'main_title', position: { x: 0.05, y: 0.56, width: 0.90, height: 0.12 }, zIndex: 10, visible: true, typographyTokenRef: 'heading-l', content: plainToRichText('عنوان جديد') } as MainTitleBlock,
      { id: `${id}-body`, type: 'body_paragraph', position: { x: 0.05, y: 0.69, width: 0.90, height: 0.21 }, zIndex: 10, visible: true, typographyTokenRef: 'body-m', kashidaEnabled: true, content: plainToRichText('') } as BodyParagraphBlock,
    ],
    image: { rect: { x: 0, y: 0, width: 1, height: 0.54 }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
    banner: { family: 'classic-main', position: 'none', heightNormalized: 0.10, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: 0.04, overlap: 'none' },
    metadata: { createdAt: now, updatedAt: now },
  };
}

// ─── Slide Thumbnail ──────────────────────────────────────────────────────────
// Uses CSS zoom (not transform:scale) so layout + visual both shrink — no overflow clipping issues.

function SlideThumbnail({ slide, album }: { slide: Slide; album: NonNullable<ReturnType<typeof useDocumentStore.getState>['album']> }) {
  return (
    <div style={{
      width: THUMB_W,
      height: THUMB_H,
      overflow: 'hidden',
      borderRadius: 3,
      border: '1px solid #30363d',
      background: '#1a1f27',
      flexShrink: 0,
      pointerEvents: 'none',
    }}>
      {/* zoom scales both layout and visual — no transform/overflow interaction */}
      <div style={{ zoom: THUMB_SCALE } as React.CSSProperties}>
        <SlideRenderer slide={slide} album={album} channelProfile={channelProfile} />
      </div>
    </div>
  );
}

// ─── Properties Panel ────────────────────────────────────────────────────────

function PropertiesPanel({
  slide,
  onUpdateTitle,
  onUpdateBody,
  onUpdateBanner,
  onUpdateSource,
  onUploadImage,
}: {
  slide: Slide;
  onUpdateTitle: (c: RichTextContent) => void;
  onUpdateBody: (c: RichTextContent) => void;
  onUpdateBanner: (p: BannerPosition) => void;
  onUpdateSource: (t: string) => void;
  onUploadImage: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const titleBlock = slide.blocks.find((b) => b.type === 'main_title') as MainTitleBlock | undefined;
  const bodyBlock = slide.blocks.find((b) => b.type === 'body_paragraph') as BodyParagraphBlock | undefined;
  const bannerPos = slide.banner?.position ?? 'none';
  const imageUrl = slide.image?.asset?.url ?? null;

  const sectionStyle: React.CSSProperties = { marginBottom: 20 };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: '#7d8590', marginBottom: 6, fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 5, color: '#e6edf3', fontSize: 14, fontFamily: "'IBM Plex Arabic', Cairo, sans-serif", direction: 'rtl', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #21262d' }}>
        <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 15, color: '#e6edf3' }}>
          شريحة {slide.number}
        </span>
        <span style={{ fontSize: 11, background: '#21262d', color: '#8b949e', padding: '2px 8px', borderRadius: 10, fontFamily: 'system-ui' }}>
          {ARCHETYPE_LABELS[slide.archetypeId] ?? slide.archetypeId}
        </span>
      </div>

      {/* Image */}
      <div style={sectionStyle}>
        <label style={labelStyle}>الصورة</label>
        {imageUrl ? (
          <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid #30363d' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" style={{ width: '100%', display: 'block', aspectRatio: '4/3', objectFit: 'cover' }} />
            <button type="button" onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              استبدال
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '14px', background: '#161b22', border: '2px dashed #30363d', borderRadius: 6, color: '#7d8590', fontSize: 13, cursor: 'pointer', fontFamily: "'IBM Plex Arabic', Cairo, sans-serif" }}>
            + رفع صورة
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const raw = ev.target?.result;
              if (typeof raw === 'string') onUploadImage(await compressImage(raw));
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* Title */}
      <div style={sectionStyle}>
        <label style={labelStyle}>العنوان</label>
        <RichTextEditor value={titleBlock?.content ?? null} onChange={onUpdateTitle} placeholder="عنوان الشريحة" minHeight={60} />
      </div>

      {/* Body */}
      <div style={sectionStyle}>
        <label style={labelStyle}>النص</label>
        <RichTextEditor value={bodyBlock?.content ?? null} onChange={onUpdateBody} placeholder="نص الشريحة" minHeight={120} />
      </div>

      {/* Banner */}
      <div style={sectionStyle}>
        <label style={labelStyle}>موضع البانر</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BANNER_OPTIONS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => onUpdateBanner(opt.value)} style={{ padding: '5px 10px', borderRadius: 5, border: `1px solid ${bannerPos === opt.value ? '#D32F2F' : '#30363d'}`, background: bannerPos === opt.value ? 'rgba(211,47,47,0.15)' : '#161b22', color: bannerPos === opt.value ? '#ef5350' : '#8b949e', fontSize: 12, cursor: 'pointer', fontFamily: "'IBM Plex Arabic', Cairo, sans-serif" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source */}
      <div style={sectionStyle}>
        <label style={labelStyle}>المصدر</label>
        <input style={inputStyle} dir="rtl" lang="ar" type="text" value={slide.source?.text ?? ''} onChange={(e) => onUpdateSource(e.target.value)} placeholder="مصدر المعلومات" />
      </div>
    </div>
  );
}

// ─── Editor Client ────────────────────────────────────────────────────────────

export function EditorClient({ albumId }: { albumId: string }) {
  const album = useDocumentStore((s) => s.album);
  const loadFromLocalStorage = useDocumentStore((s) => s.loadFromLocalStorage);
  const updateSlide = useDocumentStore((s) => s.updateSlide);
  const addSlide = useDocumentStore((s) => s.addSlide);
  const deleteSlide = useDocumentStore((s) => s.deleteSlide);
  const duplicateSlide = useDocumentStore((s) => s.duplicateSlide);
  const selectedSlideId = useEditorUIStore((s) => s.selectedSlideId);
  const setSelectedSlide = useEditorUIStore((s) => s.setSelectedSlide);
  const [loadAttempted, setLoadAttempted] = useState(false);

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

  const handleUpdateTitle = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find((b) => b.type === 'main_title');
      if (b) (b as MainTitleBlock).content = content;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBody = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find((b) => b.type === 'body_paragraph');
      if (b) (b as BodyParagraphBlock).content = content;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBanner = useCallback((pos: BannerPosition) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => { if (slide.banner) slide.banner.position = pos; });
  }, [selectedSlide, updateSlide]);

  const handleUpdateSource = useCallback((text: string) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (!slide.source) { slide.source = { text, visible: true, sizeMode: 'auto', paginationBehavior: 'share-space' }; }
      else { slide.source.text = text; }
    });
  }, [selectedSlide, updateSlide]);

  const handleUploadImage = useCallback((dataUrl: string) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      slide.image = { asset: { id: slide.id, url: dataUrl, mimeType: 'image/jpeg', width: 1080, height: 1350 }, rect: { x: 0, y: 0, width: 1, height: 0.54 }, objectFit: 'cover', focalPoint: { x: 0.5, y: 0.5 } };
    });
  }, [selectedSlide, updateSlide]);

  const handleAddSlide = useCallback(() => {
    if (!album) return;
    const idx = album.slides.findIndex((s) => s.id === selectedSlideId);
    const after = idx >= 0 ? idx : album.slides.length - 1;
    const ns = makeBlankSlide(after + 2);
    addSlide(ns, after);
    setSelectedSlide(ns.id);
  }, [album, selectedSlideId, addSlide, setSelectedSlide]);

  const handleDeleteSlide = useCallback((slideId: string) => {
    if (!album || album.slides.length <= 1) return;
    const idx = album.slides.findIndex((s) => s.id === slideId);
    deleteSlide(slideId);
    const remaining = album.slides.filter((s) => s.id !== slideId);
    if (remaining.length > 0) setSelectedSlide(remaining[Math.min(idx, remaining.length - 1)].id);
  }, [album, deleteSlide, setSelectedSlide]);

  const handleDuplicateSlide = useCallback((slideId: string) => {
    const ns = duplicateSlide(slideId);
    if (ns) setSelectedSlide(ns.id);
  }, [duplicateSlide, setSelectedSlide]);

  // ── Loading / not-found states ──────────────────────────────────────────────

  const centerStyle: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0D1117', color: '#e6edf3', fontFamily: "'Cairo', sans-serif", flexDirection: 'column', gap: 16,
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

  // ── Main editor layout (fully inline styles) ────────────────────────────────

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0D1117', color: '#e6edf3', fontFamily: "'IBM Plex Arabic', Cairo, sans-serif", overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, padding: '0 16px', background: '#161b22', borderBottom: '1px solid #21262d', flexShrink: 0, direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ color: '#8b949e', textDecoration: 'none', fontSize: 20, lineHeight: 1 }}>←</Link>
          <span style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 15, color: '#e6edf3' }} dir="rtl" lang="ar">
            {album.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: '#D32F2F', color: '#fff', fontFamily: "'Cairo', sans-serif", fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 4 }}>
            الجزيرة
          </span>
          <button type="button"
            style={{ background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 5, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontFamily: "'IBM Plex Arabic', Cairo, sans-serif" }}
            onClick={async () => {
              if (!selectedSlide) return;
              try {
                const res = await fetch('http://localhost:3001/export/slide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slide: selectedSlide, album, channelProfile }) });
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `slide-${selectedSlide.number}.png`; a.click();
                URL.revokeObjectURL(url);
              } catch { alert('تأكد من تشغيل خدمة التصدير على المنفذ 3001'); }
            }}>
            تصدير PNG
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Slide strip ── */}
        <aside style={{ width: 180, background: '#0d1117', borderLeft: '1px solid #21262d', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', fontSize: 11, color: '#7d8590', fontFamily: 'system-ui', borderBottom: '1px solid #21262d', direction: 'rtl' }}>
            الشرائح ({album.slides.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {album.slides.map((slide) => {
              const isSelected = slide.id === selectedSlideId;
              return (
                <div key={slide.id} style={{ position: 'relative', margin: '0 8px 8px', borderRadius: 6, border: `2px solid ${isSelected ? '#D32F2F' : 'transparent'}`, background: isSelected ? 'rgba(211,47,47,0.08)' : 'transparent' }}>
                  <button type="button" onClick={() => setSelectedSlide(slide.id)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <SlideThumbnail slide={slide} album={album} />
                    <span style={{ fontSize: 10, color: isSelected ? '#ef5350' : '#7d8590', fontFamily: 'system-ui' }}>{slide.number}</span>
                  </button>
                  {/* Delete / Duplicate */}
                  <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 2 }}>
                    <button type="button" title="تكرار" onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(slide.id); }}
                      style={{ width: 16, height: 16, fontSize: 9, background: 'rgba(0,0,0,0.6)', color: '#8b949e', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⧉</button>
                    <button type="button" title="حذف" onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id); }}
                      style={{ width: 16, height: 16, fontSize: 11, background: 'rgba(0,0,0,0.6)', color: '#f85149', border: 'none', borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 8, borderTop: '1px solid #21262d' }}>
            <button type="button" onClick={handleAddSlide}
              style={{ width: '100%', padding: '7px 0', background: '#21262d', border: '1px solid #30363d', borderRadius: 5, color: '#8b949e', fontSize: 12, cursor: 'pointer', fontFamily: "'IBM Plex Arabic', Cairo, sans-serif" }}>
              + شريحة جديدة
            </button>
          </div>
        </aside>

        {/* ── Canvas area ── */}
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1117', overflow: 'auto', padding: 32 }}>
          {selectedSlide ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {/*
                Canvas wrapper: fixed at display dimensions.
                The inner div uses CSS `zoom` (not transform:scale) so BOTH the layout
                and visual size shrink to the display size — no overflow/clipping issue.
              */}
              <div style={{
                width: CANVAS_DISPLAY_W,
                height: CANVAS_DISPLAY_H,
                borderRadius: 4,
                boxShadow: '0 0 0 1px #30363d, 0 4px 24px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{ zoom: CANVAS_SCALE } as React.CSSProperties}>
                  <SlideRenderer
                    slide={selectedSlide}
                    album={album}
                    channelProfile={channelProfile}
                  />
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#444c56', fontFamily: 'system-ui' }}>
                {CANVAS_W} × {CANVAS_H} · شريحة {selectedSlide.number}
              </span>
            </div>
          ) : (
            <p style={{ color: '#444c56', fontSize: 14, fontFamily: "'IBM Plex Arabic', Cairo, sans-serif" }}>اختر شريحة من القائمة</p>
          )}
        </main>

        {/* ── Properties panel ── */}
        <aside style={{ width: 300, background: '#161b22', borderRight: '1px solid #21262d', overflow: 'hidden', flexShrink: 0 }}>
          {selectedSlide ? (
            <PropertiesPanel
              slide={selectedSlide}
              onUpdateTitle={handleUpdateTitle}
              onUpdateBody={handleUpdateBody}
              onUpdateBanner={handleUpdateBanner}
              onUpdateSource={handleUpdateSource}
              onUploadImage={handleUploadImage}
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
