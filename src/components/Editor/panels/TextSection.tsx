'use client';
import { useState } from 'react';
import type { Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent, BlockStyleOverride } from '@/types/album';
import { RichTextEditor } from '../RichTextEditor';
import { toBulletList, toOrderedList, toPlainParagraphs, splitBySentences } from '../lib/textReformat';
import { LABEL_STYLE, toggleBtnStyle } from './styles';

// ─── Font size presets (canvas px at 1080×1350) ─────────────

const TITLE_SIZE_PRESETS = [
  { label: 'S', value: 28 },
  { label: 'M', value: 38 },
  { label: 'L', value: 46 },
  { label: 'XL', value: 56 },
];

const BODY_SIZE_PRESETS = [
  { label: 'S', value: 20 },
  { label: 'M', value: 28 },
  { label: 'L', value: 36 },
  { label: 'XL', value: 44 },
];

// ─── Reformat actions ────────────────────────────────────────

const REFORMAT_ACTIONS = [
  { label: '→ نقاط', action: toBulletList },
  { label: '→ أرقام', action: toOrderedList },
  { label: 'نص عادي', action: toPlainParagraphs },
  { label: 'تقسيم جمل', action: splitBySentences },
];

// ─── Component ───────────────────────────────────────────────

interface TextSectionProps {
  slide: Slide;
  onUpdateTitle: (content: RichTextContent) => void;
  onUpdateBody: (content: RichTextContent) => void;
  onUpdateBlockStyle: (blockType: 'main_title' | 'body_paragraph', overrides: Partial<BlockStyleOverride>) => void;
}

export function TextSection({ slide, onUpdateTitle, onUpdateBody, onUpdateBlockStyle }: TextSectionProps) {
  const titleBlock = slide.blocks.find(b => b.type === 'main_title') as MainTitleBlock | undefined;
  const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph') as BodyParagraphBlock | undefined;

  // Track resetKey to force RichTextEditor re-sync after reformats
  const [bodyResetKey, setBodyResetKey] = useState(0);

  const handleReformat = (transform: (c: RichTextContent) => RichTextContent) => {
    if (!bodyBlock?.content) return;
    const newContent = transform(bodyBlock.content);
    onUpdateBody(newContent);
    setBodyResetKey(k => k + 1);
  };

  const currentTitleSize = titleBlock?.styleOverrides?.fontSize;
  const currentBodySize = bodyBlock?.styleOverrides?.fontSize;

  return (
    <>
      {/* ── Title ── */}
      <div>
        <label style={LABEL_STYLE}>العنوان</label>
        <RichTextEditor
          value={titleBlock?.content ?? null}
          onChange={onUpdateTitle}
          placeholder="عنوان الشريحة"
          minHeight={60}
        />
        {/* Title font size presets */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#484f58', alignSelf: 'center', marginInlineEnd: 4 }}>حجم:</span>
          {TITLE_SIZE_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onUpdateBlockStyle('main_title', { fontSize: p.value })}
              style={{
                ...toggleBtnStyle(currentTitleSize === p.value),
                padding: '2px 8px',
                fontSize: 11,
                minWidth: 28,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body / Content ── */}
      <div>
        <label style={LABEL_STYLE}>المحتوى</label>
        <RichTextEditor
          value={bodyBlock?.content ?? null}
          onChange={onUpdateBody}
          placeholder="نص الشريحة"
          minHeight={120}
          resetKey={bodyResetKey}
        />

        {/* Body font size presets */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#484f58', alignSelf: 'center', marginInlineEnd: 4 }}>حجم:</span>
          {BODY_SIZE_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onUpdateBlockStyle('body_paragraph', { fontSize: p.value })}
              style={{
                ...toggleBtnStyle(currentBodySize === p.value),
                padding: '2px 8px',
                fontSize: 11,
                minWidth: 28,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Reformat tools */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #21262d' }}>
          <span style={{ fontSize: 10, color: '#484f58', display: 'block', marginBottom: 6 }}>تنسيق المحتوى</span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {REFORMAT_ACTIONS.map(r => (
              <button
                key={r.label}
                type="button"
                onClick={() => handleReformat(r.action)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid #30363d',
                  background: '#0d1117',
                  color: '#8b949e',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'var(--brand-font-family)',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
