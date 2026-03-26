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
import { useDocumentStore } from '@/store/documentStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import ajMainRaw from '../../../config/brands/aj-main.json';
import styles from './EditorClient.module.css';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// Canvas dimensions: 1080 × 1350 (portrait 4:5)
const CANVAS_W = 1080;
const CANVAS_H = 1350;

// Canvas display scale: 540px / 1080px = 0.5
const CANVAS_SCALE = 540 / CANVAS_W;
const CANVAS_DISPLAY_WIDTH = 540;
const CANVAS_DISPLAY_HEIGHT = Math.round(CANVAS_H * CANVAS_SCALE); // 675

// Thumbnail scale: 148px / 1080px ≈ 0.137
const THUMB_WIDTH = 148;
const THUMB_SCALE = THUMB_WIDTH / CANVAS_W;
const THUMB_HEIGHT = Math.round(CANVAS_H * THUMB_SCALE); // ~185

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
  quote_highlight: 'اقتباس',
  comparison_vs: 'مقارنة',
  timeline_sequence: 'تسلسل زمني',
  infographic_assembly: 'إنفوغرافيك',
  free_slide: 'حرة',
};

function richTextToPlain(content: RichTextContent | null | undefined): string {
  if (!content || content.type !== 'doc') return '';
  const nodes = content.content as Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
  return nodes
    .flatMap((n) => n.content ?? [])
    .filter((n) => n.type === 'text')
    .map((n) => n.text ?? '')
    .join('');
}

function plainToRichText(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: text ? [{ type: 'text', text }] : [],
      },
    ],
  };
}

/**
 * Compress an image data URL to JPEG at reduced resolution.
 * localStorage limit is ~5MB; a raw PNG can be 3-10MB as base64.
 * Downscaling to max 1080×1350 at 82% JPEG quality keeps each image ≈150-400KB.
 */
function compressImage(dataUrl: string, maxW = 1080, maxH = 1350): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(dataUrl); // fallback: use original
    img.src = dataUrl;
  });
}

function makeBlankSlide(number: number): Slide {
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  return {
    id,
    number,
    role: 'inner',
    archetypeId: 'standard_title_body',
    blocks: [
      {
        id: `${id}-title`,
        type: 'main_title',
        position: { x: 0.05, y: 0.56, width: 0.90, height: 0.12 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: plainToRichText('عنوان جديد'),
      } as MainTitleBlock,
      {
        id: `${id}-body`,
        type: 'body_paragraph',
        position: { x: 0.05, y: 0.69, width: 0.90, height: 0.21 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: plainToRichText(''),
      } as BodyParagraphBlock,
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: 0.54 },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: { family: 'classic-main', position: 'none', heightNormalized: 0.10, backgroundColor: 'accent-primary', textColor: 'text-on-accent', paddingNormalized: 0.04, overlap: 'none' },
    metadata: { createdAt: now, updatedAt: now },
  };
}

// ─── Slide Thumbnail ────────────────────────────────────────────────────────

interface SlideThumbnailProps {
  slide: Slide;
  album: ReturnType<typeof useDocumentStore.getState>['album'];
}

function SlideThumbnail({ slide, album }: SlideThumbnailProps) {
  if (!album) return <div className={styles.thumbPlaceholder} />;
  return (
    <div
      className={styles.stripThumb}
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
    >
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <SlideRenderer
          slide={slide}
          album={album}
          channelProfile={channelProfile}
        />
      </div>
    </div>
  );
}

// ─── Slide Strip Item ────────────────────────────────────────────────────────

interface SlideStripItemProps {
  slide: Slide;
  album: ReturnType<typeof useDocumentStore.getState>['album'];
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SlideStripItem({ slide, album, isSelected, onClick, onDelete, onDuplicate }: SlideStripItemProps) {
  return (
    <div className={`${styles.stripItem} ${isSelected ? styles.stripItemSelected : ''}`}>
      <button className={styles.stripClickable} onClick={onClick} type="button">
        <span className={styles.stripNumber}>{slide.number}</span>
        <SlideThumbnail slide={slide} album={album} />
      </button>
      <div className={styles.stripActions}>
        <button
          className={styles.stripActionBtn}
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          type="button"
          title="تكرار"
        >⧉</button>
        <button
          className={`${styles.stripActionBtn} ${styles.stripActionDelete}`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          type="button"
          title="حذف"
        >×</button>
      </div>
    </div>
  );
}

// ─── Properties Panel ────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  slide: Slide;
  onUpdateTitle: (text: string) => void;
  onUpdateBody: (text: string) => void;
  onUpdateBanner: (pos: BannerPosition) => void;
  onUpdateSource: (text: string) => void;
  onUploadImage: (dataUrl: string) => void;
}

function PropertiesPanel({
  slide,
  onUpdateTitle,
  onUpdateBody,
  onUpdateBanner,
  onUpdateSource,
  onUploadImage,
}: PropertiesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleBlock = slide.blocks.find((b) => b.type === 'main_title') as
    | MainTitleBlock
    | undefined;
  const bodyBlock = slide.blocks.find((b) => b.type === 'body_paragraph') as
    | BodyParagraphBlock
    | undefined;

  const titleText = titleBlock ? richTextToPlain(titleBlock.content) : '';
  const bodyText = bodyBlock ? richTextToPlain(bodyBlock.content) : '';
  const sourceText = slide.source?.text ?? '';
  const bannerPos = slide.banner?.position ?? 'none';
  const imageUrl = slide.image?.asset?.url ?? null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result;
      if (typeof raw === 'string') {
        const compressed = await compressImage(raw);
        onUploadImage(compressed);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propHeader}>
        <span className={styles.propSlideNum}>شريحة {slide.number}</span>
        <span className={styles.archetypeChip}>
          {ARCHETYPE_LABELS[slide.archetypeId] ?? slide.archetypeId}
        </span>
      </div>

      {/* Image */}
      <div className={styles.propSection}>
        <label className={styles.propLabel}>الصورة</label>
        {imageUrl ? (
          <div className={styles.imagePreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className={styles.imagePreviewImg} />
            <button
              type="button"
              className={styles.imageReplaceBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              استبدال
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.imageUploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            + رفع صورة
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      <div className={styles.propSection}>
        <label className={styles.propLabel}>العنوان</label>
        <textarea
          className={styles.propTextarea}
          dir="rtl"
          lang="ar"
          rows={3}
          value={titleText}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="عنوان الشريحة"
        />
      </div>

      <div className={styles.propSection}>
        <label className={styles.propLabel}>النص</label>
        <textarea
          className={styles.propTextarea}
          dir="rtl"
          lang="ar"
          rows={6}
          value={bodyText}
          onChange={(e) => onUpdateBody(e.target.value)}
          placeholder="نص الشريحة"
        />
      </div>

      <div className={styles.propSection}>
        <label className={styles.propLabel}>موضع البانر</label>
        <div className={styles.bannerPicker}>
          {BANNER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.bannerOpt} ${bannerPos === opt.value ? styles.bannerOptSelected : ''}`}
              onClick={() => onUpdateBanner(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.propSection}>
        <label className={styles.propLabel}>المصدر</label>
        <input
          className={styles.propInput}
          dir="rtl"
          lang="ar"
          type="text"
          value={sourceText}
          onChange={(e) => onUpdateSource(e.target.value)}
          placeholder="مصدر المعلومات"
        />
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
    const alreadyLoaded = album?.id === albumId;
    if (!alreadyLoaded) {
      loadFromLocalStorage(albumId).then(() => setLoadAttempted(true));
    } else {
      setLoadAttempted(true);
    }
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (album?.id === albumId && album.slides.length > 0 && !selectedSlideId) {
      setSelectedSlide(album.slides[0].id);
    }
  }, [album, albumId, selectedSlideId, setSelectedSlide]);

  const selectedSlide = album?.slides.find((s) => s.id === selectedSlideId) ?? null;

  const handleUpdateTitle = useCallback(
    (text: string) => {
      if (!selectedSlide) return;
      updateSlide(selectedSlide.id, (slide) => {
        const block = slide.blocks.find((b) => b.type === 'main_title');
        if (block && block.type === 'main_title') {
          (block as MainTitleBlock).content = plainToRichText(text);
        }
      });
    },
    [selectedSlide, updateSlide],
  );

  const handleUpdateBody = useCallback(
    (text: string) => {
      if (!selectedSlide) return;
      updateSlide(selectedSlide.id, (slide) => {
        const block = slide.blocks.find((b) => b.type === 'body_paragraph');
        if (block && block.type === 'body_paragraph') {
          (block as BodyParagraphBlock).content = plainToRichText(text);
        }
      });
    },
    [selectedSlide, updateSlide],
  );

  const handleUpdateBanner = useCallback(
    (pos: BannerPosition) => {
      if (!selectedSlide) return;
      updateSlide(selectedSlide.id, (slide) => {
        if (slide.banner) {
          slide.banner.position = pos;
        }
      });
    },
    [selectedSlide, updateSlide],
  );

  const handleUpdateSource = useCallback(
    (text: string) => {
      if (!selectedSlide) return;
      updateSlide(selectedSlide.id, (slide) => {
        if (!slide.source) {
          slide.source = {
            text,
            visible: true,
            sizeMode: 'auto',
            paginationBehavior: 'share-space',
          };
        } else {
          slide.source.text = text;
        }
      });
    },
    [selectedSlide, updateSlide],
  );

  const handleUploadImage = useCallback(
    (dataUrl: string) => {
      if (!selectedSlide) return;
      updateSlide(selectedSlide.id, (slide) => {
        slide.image = {
          asset: { id: slide.id, url: dataUrl, mimeType: 'image/jpeg', width: 1080, height: 1350 },
          rect: { x: 0, y: 0, width: 1, height: 1 },
          objectFit: 'cover',
          focalPoint: { x: 0.5, y: 0.5 },
        };
      });
    },
    [selectedSlide, updateSlide],
  );

  const handleAddSlide = useCallback(() => {
    if (!album) return;
    const selectedIdx = album.slides.findIndex((s) => s.id === selectedSlideId);
    const afterIndex = selectedIdx >= 0 ? selectedIdx : album.slides.length - 1;
    const newSlide = makeBlankSlide(afterIndex + 2); // temporary number, will be renumbered
    addSlide(newSlide, afterIndex);
    setSelectedSlide(newSlide.id);
  }, [album, selectedSlideId, addSlide, setSelectedSlide]);

  const handleDeleteSlide = useCallback(
    (slideId: string) => {
      if (!album || album.slides.length <= 1) return;
      const idx = album.slides.findIndex((s) => s.id === slideId);
      deleteSlide(slideId);
      // Select adjacent slide
      const remaining = album.slides.filter((s) => s.id !== slideId);
      if (remaining.length > 0) {
        const nextIdx = Math.min(idx, remaining.length - 1);
        setSelectedSlide(remaining[nextIdx].id);
      }
    },
    [album, deleteSlide, setSelectedSlide],
  );

  const handleDuplicateSlide = useCallback(
    (slideId: string) => {
      const newSlide = duplicateSlide(slideId);
      if (newSlide) setSelectedSlide(newSlide.id);
    },
    [duplicateSlide, setSelectedSlide],
  );

  if (!loadAttempted) {
    return <div className={styles.notFound}><p>جاري التحميل...</p></div>;
  }

  if (!album || album.id !== albumId) {
    return (
      <div className={styles.notFound}>
        <h2>الألبوم غير موجود</h2>
        <Link href="/" className={styles.notFoundBack}>العودة إلى الرئيسية</Link>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/" className={styles.backBtn} title="العودة">
            ←
          </Link>
          <span className={styles.albumTitle} dir="rtl" lang="ar">
            {album.title}
          </span>
        </div>
        <div className={styles.topBarRight}>
          <span className={styles.channelBadge}>الجزيرة</span>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={async () => {
              if (!selectedSlide) return;
              try {
                const res = await fetch('http://localhost:3001/export/slide', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ slide: selectedSlide, album, channelProfile }),
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `slide-${selectedSlide.number}.png`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                alert('تعذّر تصدير الشريحة. تأكد من تشغيل خدمة التصدير على المنفذ 3001.');
              }
            }}
          >
            تصدير PNG
          </button>
        </div>
      </header>

      {/* Body: slide strip + canvas + properties */}
      <div className={styles.body}>
        {/* Slide strip */}
        <aside className={styles.slideStrip}>
          <div className={styles.stripHeader}>
            الشرائح ({album.slides.length})
          </div>
          <div className={styles.stripList}>
            {album.slides.map((slide) => (
              <SlideStripItem
                key={slide.id}
                slide={slide}
                album={album}
                isSelected={slide.id === selectedSlideId}
                onClick={() => setSelectedSlide(slide.id)}
                onDelete={() => handleDeleteSlide(slide.id)}
                onDuplicate={() => handleDuplicateSlide(slide.id)}
              />
            ))}
          </div>
          <div className={styles.stripFooter}>
            <button
              type="button"
              className={styles.addSlideBtn}
              onClick={handleAddSlide}
            >
              + شريحة جديدة
            </button>
          </div>
        </aside>

        {/* Canvas */}
        <main className={styles.canvasArea}>
          {selectedSlide ? (
            <div className={styles.canvasWrapper}>
              <div
                className={styles.canvasOuter}
                style={{
                  width: CANVAS_DISPLAY_WIDTH,
                  height: CANVAS_DISPLAY_HEIGHT,
                }}
              >
                <div
                  style={{
                    width: CANVAS_W,
                    height: CANVAS_H,
                    transform: `scale(${CANVAS_SCALE})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <SlideRenderer
                    slide={selectedSlide}
                    album={album}
                    channelProfile={channelProfile}
                  />
                </div>
              </div>
              <div className={styles.canvasLabel} dir="rtl" lang="ar">
                شريحة {selectedSlide.number} — {CANVAS_W} × {CANVAS_H}
              </div>
            </div>
          ) : (
            <div className={styles.canvasEmpty}>
              <p>اختر شريحة من القائمة</p>
            </div>
          )}
        </main>

        {/* Properties panel */}
        <aside className={styles.propertiesSide}>
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
            <div className={styles.propEmpty}>
              <p>اختر شريحة للتحرير</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
