'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import type { ChannelProfile, AlbumTheme, Album, Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent } from '@/types/album';
import { parseScript, parsedSlideToSlide } from '@/lib/parser/parseScript';
import { plainToRichText } from '@/components/Editor/lib/slideFactory';
import { useDocumentStore } from '@/store/documentStore';
import { CANVAS, LAYOUT, BANNER, THEME } from '../../../config/defaults';
import ajMainRaw from '../../../config/brands/aj-main.json';
import styles from './NewAlbumWizard.module.css';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

// ─── AI slide types ──────────────────────────────────────────

interface AISegment { text: string; style: 'regular' | 'bold' | 'highlight' | 'italic' }
interface AISlide {
  number: number;
  role: 'cover' | 'inner';
  title: string;
  body: string;
  bodySegments: AISegment[];
}
interface AIParseResult {
  albumTitle: string;
  slides: AISlide[];
}

function segmentsToRichText(segments: AISegment[]): RichTextContent {
  if (!segments.length) return plainToRichText('');
  const content = segments.map(seg => {
    const marks: Array<{ type: string; attrs?: Record<string, string> }> = [];
    if (seg.style === 'bold') marks.push({ type: 'bold' });
    if (seg.style === 'highlight') marks.push({ type: 'highlight', attrs: { color: 'accent' } });
    if (seg.style === 'italic') marks.push({ type: 'italic' });
    return marks.length > 0
      ? { type: 'text' as const, text: seg.text, marks }
      : { type: 'text' as const, text: seg.text };
  });
  return { type: 'doc', content: [{ type: 'paragraph', content }] } as RichTextContent;
}

function aiSlideToSlide(ai: AISlide): Slide {
  const id = nanoid();
  const now = new Date().toISOString();
  return {
    id,
    number: ai.number,
    role: ai.role,
    archetypeId: 'standard_title_body',
    rawScript: `${ai.title}\n${ai.body}`,
    blocks: [
      {
        id: nanoid(),
        type: 'main_title',
        position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: plainToRichText(ai.title),
      } as MainTitleBlock,
      {
        id: nanoid(),
        type: 'body_paragraph',
        position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: ai.bodySegments.length > 0 ? segmentsToRichText(ai.bodySegments) : plainToRichText(ai.body),
      } as BodyParagraphBlock,
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: {
      family: BANNER.family,
      position: BANNER.defaultPosition,
      heightNormalized: BANNER.heightNormalized,
      backgroundColor: 'accent-primary',
      textColor: 'text-on-accent',
      paddingNormalized: BANNER.paddingNormalized,
      overlap: 'none',
    },
    metadata: { createdAt: now, updatedAt: now },
  };
}

const ARCHETYPE_LABELS: Record<string, string> = {
  standard_title_body: 'عنوان + نص',
  bullet_list: 'قائمة نقطية',
  highlighted_statement: 'جملة بارزة',
  data_card: 'بطاقة بيانات',
  credentials_profile: 'بيانات شخصية',
  mixed_info: 'معلومات متنوعة',
};

const DEMO_SCRIPT = `1
علي عبد اللهي: العقل المدبر للتنسيق العسكري في إيران

2
النشأة والبدايات العسكرية
وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، وتدرّج سريعاً في الرتب العسكرية خلال سنوات الحرب الإيرانية العراقية.

3
قيادة سلاح البر
تولّى منصب قائد سلاح البر في الحرس الثوري ورئاسة أركان القوة البرية في الجيش. هذا الجمع بين قيادة القوتين جعله من القلائل الذين يمتلكون خبرة عميقة في التنسيق المشترك.

4
المحطة الأمنية
انتقل إلى العمل الأمني المدني، إذ تولّى منصب نائب وزير الداخلية للشؤون الأمنية (2009 - 2014)، فأدار ملفات شائكة تتعلق بالأمن الداخلي والحدود والاحتجاجات.

5
بيانات شخصية
الاسم: علي عبد اللهي
المنصب: رئيس هيئة الأركان المشتركة
الجنسية: إيراني
سنة الميلاد: 1959

6
العقوبات الدولية
• أُدرج ضمن قوائم العقوبات الأوروبية
• فُرضت عليه عقوبات أمريكية مباشرة
• يُصنّف كمهندس لتعزيز القدرات الدفاعية
• ممنوع من السفر إلى دول الاتحاد الأوروبي`;

const PLACEHOLDER = `الصق السكريبت هنا أو اضغط "تحميل نص تجريبي" للتجربة...`;

export function NewAlbumWizard() {
  const router = useRouter();
  const setAlbum = useDocumentStore(s => s.setAlbum);

  const [scriptText, setScriptText] = useState('');
  const [aiResult, setAiResult] = useState<AIParseResult | null>(null);
  const [regexParsed, setRegexParsed] = useState<ReturnType<typeof parseScript> | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Parse with AI first, regex fallback
  async function handleParse() {
    if (!scriptText.trim()) return;
    setIsParsing(true);
    setParseError('');

    try {
      const res = await fetch('/api/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptText }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const result: AIParseResult = await res.json();
        if (result.slides?.length > 0) {
          // Ensure numbering starts from 1 and first is cover
          result.slides[0].role = 'cover';
          result.slides.forEach((s, i) => { s.number = i + 1; });
          setAiResult(result);
          setRegexParsed(null);
          setIsParsing(false);
          return;
        }
      }
    } catch {
      // AI failed — fall through to regex
    }

    // Fallback: regex parser
    const fallback = parseScript(scriptText);
    setRegexParsed(fallback);
    setAiResult(null);
    setParseError('تم التحليل بالطريقة التقليدية (الذكاء الاصطناعي غير متاح)');
    setIsParsing(false);
  }

  // Get parsed slides (AI or regex)
  const parsedSlides = aiResult?.slides ?? regexParsed?.slides ?? [];
  const albumTitle = aiResult?.albumTitle ?? regexParsed?.albumTitle ?? '';

  function handleCreate() {
    if (parsedSlides.length === 0) return;
    setIsCreating(true);

    const theme: AlbumTheme = {
      primaryColor: channelProfile.colors.palette[0].hex,
      bannerFamilyId: THEME.bannerFamilyId,
      defaultBannerPosition: THEME.defaultBannerPosition,
      density: THEME.density,
      bulletStyle: THEME.bulletStyle,
      bulletDividers: THEME.bulletDividers,
      typographyTone: THEME.typographyTone,
      mode: THEME.mode,
    };

    // Build slides from AI result or regex result
    const slides: Slide[] = aiResult
      ? aiResult.slides.map(s => aiSlideToSlide(s))
      : (regexParsed?.slides ?? []).map(s => parsedSlideToSlide(s, theme));

    const album: Album = {
      id: nanoid(),
      title: albumTitle || 'ألبوم جديد',
      channelProfileId: channelProfile.id,
      theme,
      canvasDimensions: { width: CANVAS.width, height: CANVAS.height, presetName: CANVAS.presetName },
      slides,
      assets: [],
      scriptSource: scriptText,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    setAlbum(album);
    router.push(`/album/${album.id}`);
  }

  return (
    <div className={styles.root}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.backLink}>العودة →</Link>
        <span className={styles.topTitle}>ألبوم جديد</span>
        <span className={styles.channelBadge}>الجزيرة</span>
      </header>

      <main className={styles.main} dir="rtl" lang="ar">
        {parsedSlides.length === 0 ? (
          /* ── Paste step ── */
          <div className={styles.pasteView}>
            <div className={styles.pasteHeader}>
              <h1 className={styles.pasteTitle}>الصق السكريبت</h1>
              <p className={styles.pasteHint}>
                الصق النص كما هو · الذكاء الاصطناعي سيقسم الشرائح ويحدد العناوين والتنسيق تلقائياً
              </p>
            </div>

            <textarea
              className={styles.scriptArea}
              dir="rtl"
              lang="ar"
              placeholder={PLACEHOLDER}
              value={scriptText}
              onChange={e => setScriptText(e.target.value)}
              autoFocus
            />

            {parseError && (
              <p style={{ fontSize: 12, color: '#FFA726', marginBottom: 8 }}>{parseError}</p>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className={styles.primaryBtn}
                onClick={handleParse}
                disabled={!scriptText.trim() || isParsing}
                style={{ flex: 1, opacity: isParsing ? 0.6 : 1 }}
              >
                {isParsing ? '✨ جاري التحليل بالذكاء الاصطناعي...' : '✨ تحليل السكريبت'}
              </button>
              <button
                type="button"
                onClick={() => setScriptText(DEMO_SCRIPT)}
                style={{
                  background: '#21262d',
                  color: '#8b949e',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  padding: '12px 20px',
                  fontSize: 15,
                  cursor: 'pointer',
                  fontFamily: 'var(--brand-font-family)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#e6edf3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#8b949e'; }}
              >
                تحميل نص تجريبي
              </button>
            </div>
          </div>
        ) : (
          /* ── Preview step ── */
          <div className={styles.previewView}>
            <div className={styles.previewHeader}>
              <div>
                <h1 className={styles.previewTitle}>
                  {albumTitle || 'ألبوم جديد'}
                </h1>
                <p className={styles.previewCount}>
                  {parsedSlides.length} شريحة {aiResult ? '(تحليل ذكي ✨)' : ''}
                </p>
              </div>
              <button
                className={styles.reparseBtn}
                onClick={() => { setAiResult(null); setRegexParsed(null); setParseError(''); }}
              >
                تعديل السكريبت →
              </button>
            </div>

            <div className={styles.slideGrid}>
              {parsedSlides.map(slide => {
                const title = 'title' in slide ? (slide as AISlide).title : (slide as { title: string }).title;
                const body = 'body' in slide ? (slide as AISlide).body : (slide as { body?: string }).body;
                const role = 'role' in slide ? (slide as AISlide).role : (slide as { role: string }).role;
                const number = slide.number;
                return (
                <div key={number} className={styles.slideCard}>
                  <div className={styles.slideCardNum}>
                    {role === 'cover' ? 'غلاف' : number}
                  </div>
                  <div className={styles.slideCardBody}>
                    <div className={styles.slideCardTitle}>
                      {title || '(بدون عنوان)'}
                    </div>
                    {body && (
                      <div className={styles.slideCardBody2}>
                        {body.slice(0, 70)}{body.length > 70 ? '…' : ''}
                      </div>
                    )}
                    {!aiResult && 'contentTypeSuggestion' in slide && (
                    <span className={styles.archetypeChip}>
                      {ARCHETYPE_LABELS[(slide as { contentTypeSuggestion: string }).contentTypeSuggestion] ?? ''}
                    </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleCreate}
              disabled={isCreating || parsedSlides.length === 0}
            >
              {isCreating ? 'جاري الإنشاء...' : `→ إنشاء الألبوم (${parsedSlides.length} شرائح)`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
