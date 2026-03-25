import { nanoid } from 'nanoid';
import type {
  ParsedScript,
  ParsedSlide,
  SlideArchetypeId,
  AlbumTheme,
  Slide,
  RichTextContent,
} from '@/types/album';

/**
 * Parses any Arabic script into slides — no numbering required.
 *
 * Strategy (rule-based, no AI):
 *   1. Split by blank lines → blocks
 *   2. First block = album title (if one line) or slide 1 content
 *   3. Each subsequent block = one slide
 *   4. Within a block: first line = title, remaining lines = body
 *
 * Also handles numbered format (bare digit on its own line) as a fallback.
 *
 * Either format works:
 *
 *   FREE FORM (just paste paragraphs):
 *     النشأة والبدايات العسكرية
 *     وُلد علي عبد اللهي عام 1959 في قرية علي آباد...
 *
 *     قيادة سلاح البر
 *     تولى منصب قائد سلاح البر في الحرس الثوري...
 *
 *   NUMBERED (also works):
 *     2
 *     النشأة والبدايات
 *     وُلد علي عبد اللهي...
 */
export function parseScript(rawText: string): ParsedScript {
  const trimmed = rawText.trim();
  if (!trimmed) return { albumTitle: '', slides: [] };

  // Check if the script uses numbered format (bare digits on their own lines)
  const hasNumberedFormat = /^\d+\s*$/m.test(trimmed);

  if (hasNumberedFormat) {
    return parseNumberedScript(trimmed);
  }

  return parseParagraphScript(trimmed);
}

/**
 * Paragraph-based parsing: split on blank lines.
 * Each non-empty block = one slide.
 * First block is treated as the album title if it's a single short line,
 * otherwise it becomes slide 1.
 */
function parseParagraphScript(text: string): ParsedScript {
  // Split on one or more blank lines
  const blocks = text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  if (blocks.length === 0) return { albumTitle: '', slides: [] };

  let albumTitle = '';
  const slideBlocks: string[] = [];

  const firstBlock = blocks[0];
  const firstBlockLines = firstBlock.split('\n').map(l => l.trim()).filter(Boolean);

  // If the first block is a single line (≤ 80 chars), treat it as the album title
  if (firstBlockLines.length === 1 && firstBlockLines[0].length <= 80) {
    albumTitle = firstBlockLines[0];
    slideBlocks.push(...blocks.slice(1));
  } else {
    // Otherwise the first block is also a slide
    slideBlocks.push(...blocks);
  }

  const slides: ParsedSlide[] = slideBlocks.map((block, index) => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const body = lines.slice(1).join('\n').trim();

    return {
      number: index + 2, // slides start at 2 (1 is cover)
      role: 'inner',
      rawText: block,
      title,
      body,
      contentTypeSuggestion: suggestArchetype(title, body),
    };
  });

  return { albumTitle, slides };
}

/**
 * Numbered-format parsing: bare digit on its own line = new slide.
 */
function parseNumberedScript(text: string): ParsedScript {
  const lines = text.split('\n');
  const slides: ParsedSlide[] = [];
  let albumTitle = '';
  let currentNumber: number | null = null;
  let currentLines: string[] = [];

  function flush() {
    const nonEmpty = currentLines.filter(l => l.trim().length > 0);
    if (nonEmpty.length === 0) return;

    if (currentNumber === null) {
      albumTitle = nonEmpty.join(' ').trim();
    } else {
      const title = nonEmpty[0]?.trim() ?? '';
      const body = nonEmpty.slice(1).join('\n').trim();
      slides.push({
        number: currentNumber,
        role: 'inner',
        rawText: currentLines.join('\n'),
        title,
        body,
        contentTypeSuggestion: suggestArchetype(title, body),
      });
    }
    currentLines = [];
  }

  for (const line of lines) {
    if (/^\d+\s*$/.test(line.trim())) {
      flush();
      currentNumber = parseInt(line.trim(), 10);
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return { albumTitle, slides };
}

function suggestArchetype(title: string, body: string): SlideArchetypeId {
  const lines = body.split('\n').filter(l => l.trim().length > 0);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d+%|\d+\s*(مليار|مليون|ألف|ميار)/.test(body);
  const hasBulletHints = lines.length >= 3 && lines.every(l => l.trim().length < 80);

  if (wordCount === 0 && title.length > 0) return 'highlighted_statement';
  if (wordCount < 15) return 'highlighted_statement';
  if (hasNumbers && wordCount < 60) return 'data_card';
  if (hasBulletHints) return 'bullet_list';
  return 'standard_title_body';
}

function textToRichText(text: string): RichTextContent {
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

export function parsedSlideToSlide(parsed: ParsedSlide, albumTheme: AlbumTheme): Slide {
  return {
    id: nanoid(),
    number: parsed.number,
    role: parsed.role,
    archetypeId: parsed.contentTypeSuggestion,
    rawScript: parsed.rawText,
    blocks: [
      {
        id: nanoid(),
        type: 'main_title',
        position: { x: 0.05, y: 0.06, width: 0.90, height: 0.14 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: textToRichText(parsed.title),
      },
      {
        id: nanoid(),
        type: 'body_paragraph',
        position: { x: 0.05, y: 0.22, width: 0.90, height: 0.55 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: textToRichText(parsed.body),
      },
    ],
    banner: {
      family: 'classic-main',
      position: albumTheme.defaultBannerPosition,
      heightNormalized: 0.10,
      backgroundColor: 'accent-primary',
      textColor: 'text-on-accent',
      paddingNormalized: 0.04,
      overlap: 'none',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
