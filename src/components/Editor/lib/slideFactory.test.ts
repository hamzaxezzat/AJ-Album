// src/components/Editor/lib/slideFactory.test.ts
import { describe, it, expect } from 'vitest';
import { makeBlankSlide, plainToRichText } from './slideFactory';

// ─── plainToRichText ─────────────────────────────────────────

describe('plainToRichText', () => {
  it('wraps plain text in a ProseMirror doc/paragraph structure', () => {
    const result = plainToRichText('نص عربي');
    expect(result.type).toBe('doc');
    expect(result.content).toHaveLength(1);

    const para = result.content[0] as { type: string; content: Array<{ type: string; text: string }> };
    expect(para.type).toBe('paragraph');
    expect(para.content[0].type).toBe('text');
    expect(para.content[0].text).toBe('نص عربي');
  });

  it('creates empty paragraph for empty string', () => {
    const result = plainToRichText('');
    expect(result.type).toBe('doc');
    const para = result.content[0] as { type: string; content: unknown[] };
    expect(para.type).toBe('paragraph');
    expect(para.content).toHaveLength(0);
  });

  it('preserves Arabic diacritics', () => {
    const result = plainToRichText('الحَمْدُ لِلَّهِ');
    const para = result.content[0] as { type: string; content: Array<{ text: string }> };
    expect(para.content[0].text).toBe('الحَمْدُ لِلَّهِ');
  });
});

// ─── makeBlankSlide ──────────────────────────────────────────

describe('makeBlankSlide', () => {
  it('creates a slide with the given number', () => {
    const slide = makeBlankSlide(5);
    expect(slide.number).toBe(5);
  });

  it('generates a unique id', () => {
    const s1 = makeBlankSlide(1);
    const s2 = makeBlankSlide(1);
    expect(s1.id).not.toBe(s2.id);
  });

  it('has role "inner"', () => {
    const slide = makeBlankSlide(1);
    expect(slide.role).toBe('inner');
  });

  it('uses standard_title_body archetype', () => {
    const slide = makeBlankSlide(1);
    expect(slide.archetypeId).toBe('standard_title_body');
  });

  it('has exactly 2 blocks: main_title and body_paragraph', () => {
    const slide = makeBlankSlide(1);
    expect(slide.blocks).toHaveLength(2);

    const types = slide.blocks.map(b => b.type);
    expect(types).toContain('main_title');
    expect(types).toContain('body_paragraph');
  });

  it('title block has default Arabic text', () => {
    const slide = makeBlankSlide(1);
    const titleBlock = slide.blocks.find(b => b.type === 'main_title')!;
    // Access content through the raw structure
    const content = titleBlock as unknown as { content: { content: Array<{ content: Array<{ text: string }> }> } };
    const text = content.content.content[0]?.content[0]?.text;
    expect(text).toBe('عنوان جديد');
  });

  it('body block has kashida enabled', () => {
    const slide = makeBlankSlide(1);
    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph') as import('@/types/album').BodyParagraphBlock;
    expect(bodyBlock.kashidaEnabled).toBe(true);
  });

  it('has image zone covering top 54%', () => {
    const slide = makeBlankSlide(1);
    expect(slide.image).toBeDefined();
    expect(slide.image!.rect.height).toBe(0.54);
    expect(slide.image!.rect.width).toBe(1);
  });

  it('has banner with position none', () => {
    const slide = makeBlankSlide(1);
    expect(slide.banner).toBeDefined();
    expect(slide.banner!.position).toBe('none');
  });

  it('has metadata with timestamps', () => {
    const slide = makeBlankSlide(1);
    expect(slide.metadata.createdAt).toBeTruthy();
    expect(slide.metadata.updatedAt).toBeTruthy();
    // Should be valid ISO dates
    expect(() => new Date(slide.metadata.createdAt)).not.toThrow();
  });

  it('sets correct typography token refs', () => {
    const slide = makeBlankSlide(1);
    const titleBlock = slide.blocks.find(b => b.type === 'main_title')!;
    const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph')!;
    expect(titleBlock.typographyTokenRef).toBe('heading-l');
    expect(bodyBlock.typographyTokenRef).toBe('body-m');
  });

  it('blocks have correct normalized positions', () => {
    const slide = makeBlankSlide(1);
    const titleBlock = slide.blocks.find(b => b.type === 'main_title')!;
    // Title at y=0.607 (below 54% image zone)
    expect(titleBlock.position.y).toBeCloseTo(0.607, 3);
    expect(titleBlock.position.x).toBeCloseTo(0.0833, 3);
  });
});
