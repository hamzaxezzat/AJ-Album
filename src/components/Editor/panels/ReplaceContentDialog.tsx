'use client';
import { useState } from 'react';
import type { Album, Slide, MainTitleBlock, BodyParagraphBlock } from '@/types/album';
import { parseScript, parsedSlideToSlide } from '@/lib/parser/parseScript';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import { plainToRichText } from '../lib/slideFactory';
import { LAYOUT } from '../../../../config/defaults';

type ReplaceMode = 'current' | 'all';

interface ReplaceContentDialogProps {
  album: Album;
  selectedSlide: Slide;
  onClose: () => void;
}

export function ReplaceContentDialog({ album, selectedSlide, onClose }: ReplaceContentDialogProps) {
  const [mode, setMode] = useState<ReplaceMode>('current');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ title: string; body: string }[] | null>(null);

  const updateSlide = useDocumentStore(s => s.updateSlide);
  const setAlbum = useDocumentStore(s => s.setAlbum);
  const pushSnapshot = useHistoryStore(s => s.pushSnapshot);

  const handlePreview = () => {
    if (!text.trim()) return;

    if (mode === 'current') {
      // Single slide: first line = title, rest = body
      const lines = text.trim().split('\n');
      const title = lines[0] ?? '';
      const body = lines.slice(1).join('\n').trim();
      setPreview([{ title, body }]);
    } else {
      // All slides: parse as script
      const parsed = parseScript(text);
      setPreview(parsed.slides.map(s => ({ title: s.title, body: s.body })));
    }
  };

  const handleApply = () => {
    if (!preview) return;

    pushSnapshot(album);

    if (mode === 'current' && preview.length > 0) {
      // Replace content of current slide only — keep design
      const p = preview[0];
      updateSlide(selectedSlide.id, (slide) => {
        const titleBlock = slide.blocks.find(b => b.type === 'main_title') as MainTitleBlock | undefined;
        const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph') as BodyParagraphBlock | undefined;
        if (titleBlock) titleBlock.content = plainToRichText(p.title);
        if (bodyBlock) bodyBlock.content = plainToRichText(p.body);
        slide.rawScript = text.trim();
      });
    } else if (mode === 'all') {
      // Replace all slides content — keep existing design for matching slides,
      // add new slides if script has more, remove extras if fewer
      const parsed = parseScript(text);
      const newAlbum = { ...album };
      const newSlides: Slide[] = [];

      for (let i = 0; i < parsed.slides.length; i++) {
        const p = parsed.slides[i];
        if (i < album.slides.length) {
          // Existing slide — update content, keep design (image, banner, styles)
          const existingSlide = JSON.parse(JSON.stringify(album.slides[i])) as Slide;
          existingSlide.number = i + 1;
          existingSlide.role = p.role;
          existingSlide.rawScript = p.rawText;
          existingSlide.archetypeId = p.contentTypeSuggestion;

          const titleBlock = existingSlide.blocks.find(b => b.type === 'main_title') as MainTitleBlock | undefined;
          const bodyBlock = existingSlide.blocks.find(b => b.type === 'body_paragraph') as BodyParagraphBlock | undefined;
          if (titleBlock) titleBlock.content = plainToRichText(p.title);
          if (bodyBlock) bodyBlock.content = plainToRichText(p.body);

          newSlides.push(existingSlide);
        } else {
          // New slide — create from scratch
          const newSlide = parsedSlideToSlide(p, album.theme);
          newSlides.push(newSlide);
        }
      }

      newAlbum.slides = newSlides;
      newAlbum.title = parsed.albumTitle || album.title;
      setAlbum(newAlbum as Album);
      void useDocumentStore.getState().saveToLocalStorage();
    }

    onClose();
  };

  const toggle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', fontSize: 13, cursor: 'pointer', borderRadius: 6,
    fontFamily: 'var(--brand-font-family)', fontWeight: active ? 700 : 400,
    background: active ? '#D32F2F' : '#0d1117',
    color: active ? '#fff' : '#8b949e',
    border: active ? '1px solid #D32F2F' : '1px solid #30363d',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }} onClick={onClose}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
        padding: 24, width: 600, maxHeight: '80vh', overflowY: 'auto',
        direction: 'rtl', fontFamily: 'var(--brand-font-family)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', margin: 0 }}>
            تغيير المحتوى
          </h2>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 20, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button type="button" onClick={() => { setMode('current'); setPreview(null); }} style={toggle(mode === 'current')}>
            الشريحة الحالية ({selectedSlide.number})
          </button>
          <button type="button" onClick={() => { setMode('all'); setPreview(null); }} style={toggle(mode === 'all')}>
            جميع الشرائح
          </button>
        </div>

        {/* Instructions */}
        <p style={{ fontSize: 12, color: '#7d8590', marginBottom: 12, lineHeight: 1.6 }}>
          {mode === 'current'
            ? 'اكتب المحتوى الجديد — السطر الأول هو العنوان والباقي هو النص. سيتم الحفاظ على التصميم (الصورة، الألوان، البانر).'
            : 'الصق السكريبت الجديد بنفس تنسيق الإنشاء (رقم + عنوان + نص). الشرائح الموجودة ستحتفظ بتصميمها مع تحديث المحتوى.'
          }
        </p>

        {/* Text input */}
        <textarea
          dir="rtl"
          lang="ar"
          value={text}
          onChange={e => { setText(e.target.value); setPreview(null); }}
          placeholder={mode === 'current'
            ? 'العنوان الجديد\nالنص الجديد هنا...'
            : '1\nعنوان الشريحة الأولى\nنص الشريحة الأولى\n\n2\nعنوان الشريحة الثانية\nنص الشريحة الثانية'
          }
          style={{
            width: '100%', minHeight: 160, padding: 14, fontSize: 15,
            background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d',
            borderRadius: 8, resize: 'vertical', lineHeight: 1.7,
            fontFamily: 'var(--brand-font-family)',
          }}
        />

        {/* Preview */}
        {preview && (
          <div style={{ marginTop: 12, padding: 12, background: '#0d1117', borderRadius: 8, border: '1px solid #21262d' }}>
            <p style={{ fontSize: 11, color: '#7d8590', marginBottom: 8 }}>
              معاينة ({preview.length} {preview.length === 1 ? 'شريحة' : 'شرائح'})
            </p>
            {preview.map((p, i) => (
              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < preview.length - 1 ? '1px solid #21262d' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D32F2F' }}>
                  {i + 1}. {p.title || '(بدون عنوان)'}
                </span>
                <span style={{ fontSize: 11, color: '#8b949e', display: 'block', marginTop: 2 }}>
                  {p.body ? p.body.slice(0, 80) + (p.body.length > 80 ? '...' : '') : '(بدون نص)'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-start' }}>
          {!preview ? (
            <button type="button" onClick={handlePreview} disabled={!text.trim()}
              style={{
                background: text.trim() ? '#21262d' : '#161b22', color: text.trim() ? '#e6edf3' : '#484f58',
                border: '1px solid #30363d', borderRadius: 8, padding: '10px 24px',
                fontSize: 14, cursor: text.trim() ? 'pointer' : 'default',
                fontFamily: 'var(--brand-font-family)',
              }}>
              معاينة →
            </button>
          ) : (
            <>
              <button type="button" onClick={handleApply}
                style={{
                  background: '#D32F2F', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 24px', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--brand-font-family)', fontWeight: 700,
                }}>
                تطبيق
              </button>
              <button type="button" onClick={() => setPreview(null)}
                style={{
                  background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
                  borderRadius: 8, padding: '10px 24px', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--brand-font-family)',
                }}>
                تعديل
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
