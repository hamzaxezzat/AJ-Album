'use client';
import { useEffect, useCallback, useState } from 'react';
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

// Canvas display scale: 720px / 1350px = ~0.533
const CANVAS_SCALE = 720 / 1350;
const CANVAS_DISPLAY_WIDTH = 720;
const CANVAS_DISPLAY_HEIGHT = Math.round(1080 * CANVAS_SCALE); // ~575

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

interface SlideStripItemProps {
  slide: Slide;
  isSelected: boolean;
  onClick: () => void;
}

function SlideStripItem({ slide, isSelected, onClick }: SlideStripItemProps) {
  const titleBlock = slide.blocks.find((b) => b.type === 'main_title') as
    | MainTitleBlock
    | undefined;
  const titleText = titleBlock ? richTextToPlain(titleBlock.content) : '';

  return (
    <button
      className={`${styles.stripItem} ${isSelected ? styles.stripItemSelected : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className={styles.stripNumber}>{slide.number}</span>
      <div className={styles.stripThumb}>
        <div className={styles.stripThumbBanner} />
        <div className={styles.stripThumbContent}>
          <span className={styles.stripThumbTitle} dir="rtl" lang="ar">
            {titleText.slice(0, 28) || '(بدون عنوان)'}
          </span>
        </div>
        <div className={styles.stripThumbFooter} />
      </div>
    </button>
  );
}

interface PropertiesPanelProps {
  slide: Slide;
  onUpdateTitle: (text: string) => void;
  onUpdateBody: (text: string) => void;
  onUpdateBanner: (pos: BannerPosition) => void;
  onUpdateSource: (text: string) => void;
}

function PropertiesPanel({
  slide,
  onUpdateTitle,
  onUpdateBody,
  onUpdateBanner,
  onUpdateSource,
}: PropertiesPanelProps) {
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

  return (
    <div className={styles.propertiesPanel}>
      <div className={styles.propHeader}>
        <span className={styles.propSlideNum}>شريحة {slide.number}</span>
        <span className={styles.archetypeChip}>
          {ARCHETYPE_LABELS[slide.archetypeId] ?? slide.archetypeId}
        </span>
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

export function EditorClient({ albumId }: { albumId: string }) {
  const album = useDocumentStore((s) => s.album);
  const loadFromLocalStorage = useDocumentStore((s) => s.loadFromLocalStorage);
  const updateSlide = useDocumentStore((s) => s.updateSlide);
  const selectedSlideId = useEditorUIStore((s) => s.selectedSlideId);
  const setSelectedSlide = useEditorUIStore((s) => s.setSelectedSlide);

  // Track whether the client-side load attempt has finished
  const [loadAttempted, setLoadAttempted] = useState(false);

  // Load album on mount — always try localStorage, even if store has stale album
  useEffect(() => {
    const alreadyLoaded = album?.id === albumId;
    if (!alreadyLoaded) {
      loadFromLocalStorage(albumId);
    }
    setLoadAttempted(true);
  }, [albumId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first slide when album loads
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

  // Still waiting for client-side localStorage read
  if (!loadAttempted) {
    return <div className={styles.notFound}><p>جاري التحميل...</p></div>;
  }

  // Load was attempted but album not found
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
                isSelected={slide.id === selectedSlideId}
                onClick={() => setSelectedSlide(slide.id)}
              />
            ))}
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
                    width: 1350,
                    height: 1080,
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
                شريحة {selectedSlide.number} — {1350} × {1080}
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
