// src/lib/parser/parseScript.test.ts
import { describe, it, expect } from 'vitest';
import { parseScript, parsedSlideToSlide, suggestArchetype } from './parseScript';
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

  // ── Cover slide detection ──

  describe('cover slide detection', () => {
    it('marks slide 1 as cover in paragraph format', () => {
      const script = `عنوان الغلاف

شريحة ثانية
نص الشريحة`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[0].number).toBe(1);
      expect(result.slides[0].title).toBe('عنوان الغلاف');
    });

    it('marks slide 1 as cover in numbered format', () => {
      const script = `1
عنوان الغلاف
وصف مختصر

2
شريحة ثانية
نص`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[0].number).toBe(1);
      expect(result.slides[1].role).toBe('inner');
      expect(result.slides[1].number).toBe(2);
    });

    it('sets album title from cover slide title (paragraph format)', () => {
      const script = `عنوان الألبوم

شريحة ثانية
نص`;

      const result = parseScript(script);
      expect(result.albumTitle).toBe('عنوان الألبوم');
    });

    it('sets album title from cover slide title (numbered format)', () => {
      const script = `1
عنوان الألبوم من الغلاف
وصف

2
شريحة ثانية
نص`;

      const result = parseScript(script);
      expect(result.albumTitle).toBe('عنوان الألبوم من الغلاف');
    });

    it('preserves pre-header text as album title in numbered format', () => {
      const script = `علي عبد اللهي
1
الغلاف
وصف

2
شريحة
نص`;

      const result = parseScript(script);
      expect(result.albumTitle).toBe('علي عبد اللهي');
      expect(result.slides[0].role).toBe('cover');
    });

    it('marks all non-cover slides as inner', () => {
      const script = `1
غلاف

2
شريحة ثانية
نص

3
شريحة ثالثة
نص`;

      const result = parseScript(script);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[1].role).toBe('inner');
      expect(result.slides[2].role).toBe('inner');
    });
  });

  // ── Paragraph format ──

  describe('paragraph format', () => {
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
      expect(result.slides).toHaveLength(4);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[0].title).toBe('العنوان');
      expect(result.slides[1].title).toBe('الفقرة الأولى');
      expect(result.slides[2].title).toBe('الفقرة الثانية');
      expect(result.slides[3].title).toBe('الفقرة الثالثة');
    });

    it('assigns sequential slide numbers starting at 1', () => {
      const script = `غلاف

شريحة أولى
نص

شريحة ثانية
نص`;

      const result = parseScript(script);
      expect(result.slides[0].number).toBe(1);
      expect(result.slides[1].number).toBe(2);
      expect(result.slides[2].number).toBe(3);
    });

    it('handles slide with title only (no body)', () => {
      const script = `غلاف

جملة بارزة واحدة فقط`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
      expect(result.slides[1].title).toBe('جملة بارزة واحدة فقط');
      expect(result.slides[1].body).toBe('');
    });

    it('handles multi-line body text', () => {
      const script = `غلاف

عنوان الشريحة
السطر الأول من النص
السطر الثاني من النص
السطر الثالث من النص`;

      const result = parseScript(script);
      expect(result.slides[1].title).toBe('عنوان الشريحة');
      expect(result.slides[1].body).toBe('السطر الأول من النص\nالسطر الثاني من النص\nالسطر الثالث من النص');
    });

    it('preserves body text exactly as written', () => {
      const bodyText = '• نقطة أولى\n• نقطة ثانية\n• نقطة ثالثة';
      const script = `غلاف

عنوان
${bodyText}`;

      const result = parseScript(script);
      expect(result.slides[1].body).toBe(bodyText);
    });
  });

  // ── Numbered format ──

  describe('numbered format', () => {
    it('detects numbered format (bare digits on lines)', () => {
      const script = `1
الغلاف
وصف

2
النشأة والبدايات
وُلد عام 1959

3
قيادة سلاح البر
تولى منصب قائد`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(3);
      expect(result.slides[0].number).toBe(1);
      expect(result.slides[0].title).toBe('الغلاف');
      expect(result.slides[1].number).toBe(2);
      expect(result.slides[1].title).toBe('النشأة والبدايات');
      expect(result.slides[2].number).toBe(3);
      expect(result.slides[2].title).toBe('قيادة سلاح البر');
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

    it('handles numbered format starting at 1 with cover', () => {
      const script = `1
عنوان الغلاف هنا
وصف مختصر

2
عنوان الشريحة الثانية
نص الفقرة الأولى
نص الفقرة الثانية

3
عنوان الشريحة الثالثة
• نقطة أولى
• نقطة ثانية
• نقطة ثالثة`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(3);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[0].title).toBe('عنوان الغلاف هنا');
      expect(result.slides[0].body).toBe('وصف مختصر');
      expect(result.slides[1].role).toBe('inner');
      expect(result.slides[1].body).toBe('نص الفقرة الأولى\nنص الفقرة الثانية');
      expect(result.slides[2].role).toBe('inner');
      expect(result.slides[2].body).toBe('• نقطة أولى\n• نقطة ثانية\n• نقطة ثالثة');
    });

    it('preserves multi-line body in numbered format', () => {
      const script = `1
غلاف

2
عنوان
سطر أول
سطر ثاني
سطر ثالث`;

      const result = parseScript(script);
      expect(result.slides[1].body).toBe('سطر أول\nسطر ثاني\nسطر ثالث');
    });
  });

  // ── Slide count accuracy ──

  describe('slide count accuracy', () => {
    it('single block = 1 slide (paragraph format)', () => {
      const result = parseScript('سطر واحد فقط');
      expect(result.slides).toHaveLength(1);
    });

    it('five numbered slides = 5 slides', () => {
      const script = `1\nأ\n\n2\nب\n\n3\nج\n\n4\nد\n\n5\nه`;
      const result = parseScript(script);
      expect(result.slides).toHaveLength(5);
    });

    it('no extra or missing slides from empty lines within blocks', () => {
      const script = `1
غلاف

2
عنوان
نص الشريحة`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
    });
  });

  // ── Archetype suggestion ──

  describe('archetype suggestion', () => {
    it('suggests highlighted_statement for short text (< 15 words)', () => {
      const script = `غلاف

جملة قصيرة جداً`;

      const result = parseScript(script);
      expect(result.slides[1].contentTypeSuggestion).toBe('highlighted_statement');
    });

    it('suggests highlighted_statement for title-only slides', () => {
      const result = suggestArchetype('عنوان بارز', '');
      expect(result).toBe('highlighted_statement');
    });

    it('suggests standard_title_body for long body text', () => {
      const longBody = Array(20).fill('كلمة').join(' ');
      const script = `غلاف

عنوان الشريحة
${longBody}`;

      const result = parseScript(script);
      expect(result.slides[1].contentTypeSuggestion).toBe('standard_title_body');
    });

    it('suggests data_card when body contains numbers with Arabic units', () => {
      const script = `غلاف

بيانات اقتصادية
بلغ الناتج المحلي الإجمالي للدولة ما يقارب 500 مليار دولار في العام الماضي وهذا يمثل نموًا كبيرًا مقارنة بالسنوات السابقة`;

      const result = parseScript(script);
      expect(result.slides[1].contentTypeSuggestion).toBe('data_card');
    });

    it('suggests bullet_list for lines with bullet markers', () => {
      const result = suggestArchetype('قائمة', '• العنصر الأول في القائمة\n• العنصر الثاني في القائمة\n• العنصر الثالث في القائمة');
      expect(result).toBe('bullet_list');
    });

    it('suggests bullet_list for lines with dash markers', () => {
      const result = suggestArchetype('قائمة', '- العنصر الأول في القائمة\n- العنصر الثاني في القائمة\n- العنصر الثالث في القائمة');
      expect(result).toBe('bullet_list');
    });

    it('suggests credentials_profile for key:value pairs', () => {
      const result = suggestArchetype('بيانات شخصية', 'الاسم: علي عبد اللهي\nتاريخ الميلاد: 1959\nالجنسية: إيرانية\nالمنصب: قائد عسكري');
      expect(result).toBe('credentials_profile');
    });

    it('suggests bullet_list when body has 3+ short lines (heuristic)', () => {
      const script = `غلاف

قائمة العناصر الرئيسية المهمة
العنصر الأول في القائمة الطويلة
العنصر الثاني المهم جداً في السياق
العنصر الثالث الذي يكمل القائمة
العنصر الرابع والأخير في القائمة`;

      const result = parseScript(script);
      expect(result.slides[1].contentTypeSuggestion).toBe('bullet_list');
    });

    it('assigns highlighted_statement to cover slides', () => {
      const script = `1
عنوان الغلاف
وصف مفصل للغلاف يحتوي على معلومات كثيرة ومتعددة تشرح محتوى الألبوم بالكامل

2
شريحة عادية
نص عادي طويل يحتوي على شرح مفصل للموضوع المطروح في هذه الشريحة`;

      const result = parseScript(script);
      expect(result.slides[0].contentTypeSuggestion).toBe('highlighted_statement');
    });
  });

  // ── Arabic-specific text handling ──

  describe('Arabic-specific text handling', () => {
    it('preserves Arabic diacritics in parsed text', () => {
      const script = `غلاف

الحَمْدُ لِلَّهِ
نص مع حركات عربية`;

      const result = parseScript(script);
      expect(result.slides[1].title).toBe('الحَمْدُ لِلَّهِ');
    });

    it('handles mixed Arabic and English text', () => {
      const script = `غلاف

FBI تقرير
نص يحتوي على CIA و NATO وكلمات عربية`;

      const result = parseScript(script);
      expect(result.slides[1].title).toBe('FBI تقرير');
      expect(result.slides[1].body).toContain('CIA');
    });

    it('handles Arabic-Indic numerals in text', () => {
      const script = `غلاف

تقرير ٢٠٢٤
نص يحتوي على أرقام عربية ١٢٣٤٥`;

      const result = parseScript(script);
      expect(result.slides[1].title).toBe('تقرير ٢٠٢٤');
      expect(result.slides[1].body).toContain('١٢٣٤٥');
    });

    it('preserves rawText exactly as written', () => {
      const block = 'عنوان الشريحة\n• نقطة أولى\n• نقطة ثانية';
      const script = `1
غلاف

2
${block}`;

      const result = parseScript(script);
      // rawText should contain the original text (may have leading newline from parsing)
      expect(result.slides[1].rawText).toContain('عنوان الشريحة');
      expect(result.slides[1].rawText).toContain('• نقطة أولى');
      expect(result.slides[1].rawText).toContain('• نقطة ثانية');
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    it('handles script with only one slide (cover only)', () => {
      const result = parseScript('عنوان الغلاف فقط');
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].role).toBe('cover');
      expect(result.slides[0].title).toBe('عنوان الغلاف فقط');
      expect(result.albumTitle).toBe('عنوان الغلاف فقط');
    });

    it('handles numbered format starting at 2 (no slide 1)', () => {
      const script = `2
شريحة ثانية
نص

3
شريحة ثالثة
نص`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
      expect(result.slides[0].number).toBe(2);
      // No slide 1, so no cover
      expect(result.slides[0].role).toBe('inner');
    });

    it('handles extra blank lines between slides', () => {
      const script = `غلاف


شريحة ثانية
نص


شريحة ثالثة
نص`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(3);
    });

    it('does not confuse years in body text with slide numbers', () => {
      const script = `1
غلاف

2
النشأة
وُلد عام 1959 في قرية`;

      const result = parseScript(script);
      expect(result.slides).toHaveLength(2);
      expect(result.slides[1].body).toContain('1959');
    });
  });
});

// ─── parsedSlideToSlide ──────────────────────────────────────

describe('parsedSlideToSlide', () => {
  it('creates a valid Slide with id, blocks, image, and banner', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص الشريحة');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    expect(slide.id).toBeTruthy();
    expect(slide.blocks).toHaveLength(2);
    expect(slide.image).toBeDefined();
    expect(slide.banner).toBeDefined();
  });

  it('creates main_title and body_paragraph blocks', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title');
    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph');

    expect(titleBlock).toBeDefined();
    expect(bodyBlock).toBeDefined();
    expect(titleBlock!.typographyTokenRef).toBe('heading-l');
    expect(bodyBlock!.typographyTokenRef).toBe('body-m');
  });

  it('sets correct normalized positions for blocks', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title')!;
    expect(titleBlock.position.x).toBeCloseTo(0.0556, 3);
    expect(titleBlock.position.y).toBeCloseTo(0.57, 3);

    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph')!;
    expect(bodyBlock.position.y).toBeCloseTo(0.64, 3);
  });

  it('sets image zone to top 55%', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    expect(slide.image!.rect.height).toBe(0.55);
    expect(slide.image!.rect.y).toBe(0);
    expect(slide.image!.rect.width).toBe(1);
  });

  it('sets banner position to none by default', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);
    expect(slide.banner!.position).toBe('none');
  });

  it('encodes title and body as RichTextContent (ProseMirror doc)', () => {
    const parsed = parseScript('غلاف\n\nعنوان الشريحة\nنص الجسم');
    const slide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    const titleBlock = slide.blocks.find(b => b.type === 'main_title') as import('@/types/album').MainTitleBlock;
    expect(titleBlock.content.type).toBe('doc');
    expect(titleBlock.content.content).toHaveLength(1);
  });

  it('generates unique ids for each call', () => {
    const parsed = parseScript('غلاف\n\nشريحة\nنص');
    const slide1 = parsedSlideToSlide(parsed.slides[0], baseTheme);
    const slide2 = parsedSlideToSlide(parsed.slides[0], baseTheme);
    expect(slide1.id).not.toBe(slide2.id);
  });

  it('preserves cover role from parsed slide', () => {
    const parsed = parseScript('1\nغلاف\n\n2\nشريحة\nنص');
    const coverSlide = parsedSlideToSlide(parsed.slides[0], baseTheme);
    const innerSlide = parsedSlideToSlide(parsed.slides[1], baseTheme);

    expect(coverSlide.role).toBe('cover');
    expect(innerSlide.role).toBe('inner');
  });
});
