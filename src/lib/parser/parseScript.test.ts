// src/lib/parser/parseScript.test.ts
import { describe, it, expect } from 'vitest';
import { parseScript, parsedSlideToSlide } from './parseScript';
import type { AlbumTheme } from '@/types/album';

// ─── Helpers ─────────────────────────────────────────────────

const baseTheme: AlbumTheme = {
  primaryColor: '#D32F2F',
  bannerFamilyId: 'classic-main',
  defaultBannerPosition: 'bottom',
  density: 'normal',
  bulletStyle: 'square',
  bulletDividers: false,
  typographyTone: 'standard',
  mode: 'production',
};

// ─── parseScript — empty / edge cases ────────────────────────

describe('parseScript', () => {
  it('returns empty result for empty string', () => {
    const result = parseScript('');
    expect(result.albumTitle).toBe('');
    expect(result.slides).toHaveLength(0);
  });

  it('returns empty result for whitespace-only string', () => {
    const result = parseScript('   \n\n   \t  ');
    expect(result.albumTitle).toBe('');
    expect(result.slides).toHaveLength(0);
  });

  // ── Paragraph format ──

  it('extracts album title from single short first line (paragraph format)', () => {
    const script = `علي عبد اللهي

النشأة والبدايات
وُلد عام 1959 في قرية علي آباد`;

    const result = parseScript(script);
    expect(result.albumTitle).toBe('علي عبد اللهي');
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].title).toBe('النشأة والبدايات');
    expect(result.slides[0].body).toBe('وُلد عام 1959 في قرية علي آباد');
  });

  it('treats long first block as slide content, not album title', () => {
    const longLine = 'هذا النص طويل جدا ويتكون من أكثر من ثمانين حرفًا عربيًا لاختبار عدم اعتباره عنوانًا للألبوم بل محتوى شريحة أولى مع بقية النص';
    const result = parseScript(longLine);
    expect(result.albumTitle).toBe('');
    expect(result.slides.length).toBeGreaterThanOrEqual(1);
  });

  it('parses multiple paragraphs into separate slides', () => {
    const script = `العنوان

الفقرة الأولى
نص الفقرة الأولى

الفقرة الثانية
نص الفقرة الثانية

الفقرة الثالثة
نص الفقرة الثالثة`;

    const result = parseScript(script);
    expect(result.albumTitle).toBe('العنوان');
    expect(result.slides).toHaveLength(3);
    expect(result.slides[0].title).toBe('الفقرة الأولى');
    expect(result.slides[1].title).toBe('الفقرة الثانية');
    expect(result.slides[2].title).toBe('الفقرة الثالثة');
  });

  it('assigns slide numbers starting at 2 (paragraph format)', () => {
    const script = `عنوان الألبوم

شريحة أولى
نص

شريحة ثانية
نص`;

    const result = parseScript(script);
    expect(result.slides[0].number).toBe(2);
    expect(result.slides[1].number).toBe(3);
  });

  it('sets role to inner for all parsed slides', () => {
    const script = `عنوان

شريحة
نص`;
    const result = parseScript(script);
    for (const slide of result.slides) {
      expect(slide.role).toBe('inner');
    }
  });

  it('handles slide with title only (no body)', () => {
    const script = `عنوان الألبوم

جملة بارزة واحدة فقط`;

    const result = parseScript(script);
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].title).toBe('جملة بارزة واحدة فقط');
    expect(result.slides[0].body).toBe('');
  });

  // ── Numbered format ──

  it('detects numbered format (bare digits on lines)', () => {
    const script = `2
النشأة والبدايات
وُلد عام 1959

3
قيادة سلاح البر
تولى منصب قائد`;

    const result = parseScript(script);
    expect(result.slides).toHaveLength(2);
    expect(result.slides[0].number).toBe(2);
    expect(result.slides[0].title).toBe('النشأة والبدايات');
    expect(result.slides[1].number).toBe(3);
    expect(result.slides[1].title).toBe('قيادة سلاح البر');
  });

  it('extracts album title from text before first number', () => {
    const script = `علي عبد اللهي
2
النشأة
نص`;

    const result = parseScript(script);
    expect(result.albumTitle).toBe('علي عبد اللهي');
    expect(result.slides).toHaveLength(1);
  });

  // ── Archetype suggestion ──

  it('suggests highlighted_statement for short text (< 15 words)', () => {
    const script = `عنوان

جملة قصيرة جداً`;

    const result = parseScript(script);
    expect(result.slides[0].contentTypeSuggestion).toBe('highlighted_statement');
  });

  it('suggests standard_title_body for long body text', () => {
    const longBody = Array(20).fill('كلمة').join(' ');
    const script = `عنوان

عنوان الشريحة
${longBody}`;

    const result = parseScript(script);
    expect(result.slides[0].contentTypeSuggestion).toBe('standard_title_body');
  });

  it('suggests data_card when body contains numbers with Arabic units and enough words', () => {
    // suggestArchetype requires wordCount >= 15 to bypass highlighted_statement
    const script = `عنوان

بيانات اقتصادية
بلغ الناتج المحلي الإجمالي للدولة ما يقارب 500 مليار دولار في العام الماضي وهذا يمثل نموًا كبيرًا مقارنة بالسنوات السابقة`;

    const result = parseScript(script);
    expect(result.slides[0].contentTypeSuggestion).toBe('data_card');
  });

  it('suggests bullet_list when body has 3+ short lines and enough words', () => {
    // suggestArchetype checks: lines >= 3, each < 80 chars, AND wordCount >= 15
    const script = `عنوان

قائمة العناصر الرئيسية المهمة
العنصر الأول في القائمة الطويلة
العنصر الثاني المهم جداً في السياق
العنصر الثالث الذي يكمل القائمة
العنصر الرابع والأخير في القائمة`;

    const result = parseScript(script);
    expect(result.slides[0].contentTypeSuggestion).toBe('bullet_list');
  });

  // ── Arabic-specific text handling ──

  it('preserves Arabic diacritics in parsed text', () => {
    const script = `عنوان

الحَمْدُ لِلَّهِ
نص مع حركات عربية`;

    const result = parseScript(script);
    expect(result.slides[0].title).toBe('الحَمْدُ لِلَّهِ');
  });

  it('handles mixed Arabic and English text', () => {
    const script = `عنوان

FBI تقرير
نص يحتوي على CIA و NATO وكلمات عربية`;

    const result = parseScript(script);
    expect(result.slides[0].title).toBe('FBI تقرير');
    expect(result.slides[0].body).toContain('CIA');
  });
});

// ─── parsedSlideToSlide ──────────────────────────────────────

describe('parsedSlideToSlide', () => {
  it('creates a valid Slide with id, blocks, image, and banner', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص الشريحة');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);

    expect(slide.id).toBeTruthy();
    expect(slide.blocks).toHaveLength(2);
    expect(slide.image).toBeDefined();
    expect(slide.banner).toBeDefined();
  });

  it('creates main_title and body_paragraph blocks', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title');
    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph');

    expect(titleBlock).toBeDefined();
    expect(bodyBlock).toBeDefined();
    expect(titleBlock!.typographyTokenRef).toBe('heading-l');
    expect(bodyBlock!.typographyTokenRef).toBe('body-m');
  });

  it('sets correct normalized positions for blocks', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title')!;
    expect(titleBlock.position.x).toBeCloseTo(0.0833, 3);
    expect(titleBlock.position.y).toBeCloseTo(0.607, 3);

    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph')!;
    expect(bodyBlock.position.y).toBeCloseTo(0.707, 3);
  });

  it('sets image zone to top 54%', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);

    expect(slide.image!.rect.height).toBe(0.54);
    expect(slide.image!.rect.y).toBe(0);
    expect(slide.image!.rect.width).toBe(1);
  });

  it('sets banner position to none by default', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);
    expect(slide.banner!.position).toBe('none');
  });

  it('encodes title and body as RichTextContent (ProseMirror doc)', () => {
    const parsed = parseScript('عنوان\n\nعنوان الشريحة\nنص الجسم');
    const slide = parsedSlideToSlide(parsed.slides[0], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title') as import('@/types/album').MainTitleBlock;
    expect(titleBlock.content.type).toBe('doc');
    expect(titleBlock.content.content).toHaveLength(1);
  });

  it('generates unique ids for each call', () => {
    const parsed = parseScript('عنوان\n\nشريحة\nنص');
    const slide1 = parsedSlideToSlide(parsed.slides[0], baseTheme);
    const slide2 = parsedSlideToSlide(parsed.slides[0], baseTheme);
    expect(slide1.id).not.toBe(slide2.id);
  });
});
