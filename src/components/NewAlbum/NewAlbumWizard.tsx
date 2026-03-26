'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import type { ChannelProfile, AlbumTheme, Album } from '@/types/album';
import { parseScript, parsedSlideToSlide } from '@/lib/parser/parseScript';
import { useDocumentStore } from '@/store/documentStore';
import { CANVAS, THEME } from '../../../config/defaults';
import ajMainRaw from '../../../config/brands/aj-main.json';
import styles from './NewAlbumWizard.module.css';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

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
  const [parsed, setParsed] = useState<ReturnType<typeof parseScript> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Auto-parse as the user types (debounced via state reset on change)
  function handleParse() {
    if (!scriptText.trim()) return;
    setParsed(parseScript(scriptText));
  }

  function handleCreate() {
    if (!parsed || parsed.slides.length === 0) return;
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

    const slides = parsed.slides.map(s => parsedSlideToSlide(s, theme));

    const album: Album = {
      id: nanoid(),
      title: parsed.albumTitle || 'ألبوم جديد',
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
        <Link href="/" className={styles.backLink}>← العودة</Link>
        <span className={styles.topTitle}>ألبوم جديد</span>
        <span className={styles.channelBadge}>الجزيرة</span>
      </header>

      <main className={styles.main} dir="rtl" lang="ar">
        {!parsed ? (
          /* ── Paste step ── */
          <div className={styles.pasteView}>
            <div className={styles.pasteHeader}>
              <h1 className={styles.pasteTitle}>الصق السكريبت</h1>
              <p className={styles.pasteHint}>
                افصل كل شريحة بسطر فارغ · السطر الأول من كل فقرة = العنوان · ما يليه = النص
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

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className={styles.primaryBtn}
                onClick={handleParse}
                disabled={!scriptText.trim()}
                style={{ flex: 1 }}
              >
                تحليل السكريبت ←
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
                  {parsed.albumTitle || 'ألبوم جديد'}
                </h1>
                <p className={styles.previewCount}>
                  {parsed.slides.length} شريحة مكتشفة
                </p>
              </div>
              <button
                className={styles.reparseBtn}
                onClick={() => setParsed(null)}
              >
                ← تعديل السكريبت
              </button>
            </div>

            <div className={styles.slideGrid}>
              {parsed.slides.map(slide => (
                <div key={slide.number} className={styles.slideCard}>
                  <div className={styles.slideCardNum}>
                    {slide.role === 'cover' ? 'غلاف' : slide.number}
                  </div>
                  <div className={styles.slideCardBody}>
                    <div className={styles.slideCardTitle}>
                      {slide.title || '(بدون عنوان)'}
                    </div>
                    {slide.body && (
                      <div className={styles.slideCardBody2}>
                        {slide.body.slice(0, 70)}{slide.body.length > 70 ? '…' : ''}
                      </div>
                    )}
                    <span className={styles.archetypeChip}>
                      {ARCHETYPE_LABELS[slide.contentTypeSuggestion] ?? slide.contentTypeSuggestion}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleCreate}
              disabled={isCreating || parsed.slides.length === 0}
            >
              {isCreating ? 'جاري الإنشاء...' : `إنشاء الألبوم (${parsed.slides.length} شرائح) →`}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
