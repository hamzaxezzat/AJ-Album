'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import type { ChannelProfile, AlbumTheme, Album } from '@/types/album';
import { parseScript, parsedSlideToSlide } from '@/lib/parser/parseScript';
import { useDocumentStore } from '@/store/documentStore';
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

const PLACEHOLDER = `علي عبد اللهي: العقل المدبر للتنسيق العسكري في إيران

النشأة والبدايات العسكرية
وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، والتحق بصفوف الحرس الثوري الإيراني في سن مبكرة إبان الثورة الإسلامية.

قيادة سلاح البر
تولى منصب قائد سلاح البر في الحرس الثوري الإيراني، وأشرف على تطوير القدرات الميدانية خلال سنوات حرب الخليج.

الدور في الحرس الثوري
شغل مناصب قيادية عليا ضمن الهيكل التنظيمي للحرس الثوري، وأسهم في بناء منظومة التنسيق العسكري مع الفصائل الحليفة في المنطقة.`;

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
      bannerFamilyId: 'classic-main',
      defaultBannerPosition: 'bottom',
      density: 'normal',
      bulletStyle: 'square',
      bulletDividers: false,
      typographyTone: 'standard',
      mode: 'production',
    };

    const slides = parsed.slides.map(s => parsedSlideToSlide(s, theme));

    const album: Album = {
      id: nanoid(),
      title: parsed.albumTitle || 'ألبوم جديد',
      channelProfileId: channelProfile.id,
      theme,
      canvasDimensions: { width: 1350, height: 1080, presetName: 'editorial-landscape-5:4' },
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

            <button
              className={styles.primaryBtn}
              onClick={handleParse}
              disabled={!scriptText.trim()}
            >
              تحليل السكريبت ←
            </button>
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
                  <div className={styles.slideCardNum}>{slide.number}</div>
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
