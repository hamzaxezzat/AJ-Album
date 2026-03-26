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
 *   1. Detect numbered format (bare digit on its own line) vs paragraph format
 *   2. Split into slide blocks accordingly
 *   3. Slide 1 is ALWAYS the cover (role: 'cover')
 *   4. Within each block: first non-empty line = title, rest = body
 *   5. Suggest archetype based on content analysis
 *
 * Numbered format:
 *   1
 *   عنوان الغلاف هنا
 *   وصف مختصر
 *
 *   2
 *   النشأة والبدايات
 *   وُلد علي عبد اللهي عام 1959...
 *
 * Paragraph format (split by blank lines):
 *   علي عبد اللهي
 *
 *   النشأة والبدايات العسكرية
 *   وُلد علي عبد اللهي عام 1959...
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
 * First block becomes the cover slide (role: 'cover').
 * The album title is extracted from the cover slide's title.
 */
function parseParagraphScript(text: string): ParsedScript {
  // Split on one or more blank lines
  const blocks = text
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  if (blocks.length === 0) return { albumTitle: '', slides: [] };

  const slides: ParsedSlide[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] ?? '';
    const body = lines.slice(1).join('\n').trim();
    const slideNumber = i + 1;
    const isCover = slideNumber === 1;

    slides.push({
      number: slideNumber,
      role: isCover ? 'cover' : 'inner',
      rawText: block,
      title,
      body,
      contentTypeSuggestion: isCover ? 'highlighted_statement' : suggestArchetype(title, body),
    });
  }

  // Album title comes from the cover slide's title
  const albumTitle = slides.length > 0 ? slides[0].title : '';

  return { albumTitle, slides };
}

/**
 * Numbered-format parsing: bare digit on its own line = new slide.
 * Slide number 1 is always the cover. Text before the first number
 * is treated as album title (pre-header text).
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
      // Text before the first number => album title (pre-header)
      albumTitle = nonEmpty.join(' ').trim();
    } else {
      const title = nonEmpty[0]?.trim() ?? '';
      const body = nonEmpty.slice(1).join('\n').trim();
      const isCover = currentNumber === 1;
      slides.push({
        number: currentNumber,
        role: isCover ? 'cover' : 'inner',
        rawText: currentLines.join('\n'),
        title,
        body,
        contentTypeSuggestion: isCover ? 'highlighted_statement' : suggestArchetype(title, body),
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

  // If no pre-header text was found, derive album title from cover slide
  if (!albumTitle && slides.length > 0 && slides[0].role === 'cover') {
    albumTitle = slides[0].title;
  }

  return { albumTitle, slides };
}

/** Bullet marker pattern: •, -, ●, ▪, ▸, ◆, or Arabic dash ـ at line start */
const BULLET_MARKER = /^[\s]*[•\-●▪▸◆ـ]\s/;

/** Numbered list pattern: 1. or 1) or ١. or ١) at line start */
const NUMBERED_LIST_MARKER = /^[\s]*[\d٠-٩]+[.)]\s/;

/** Key:value pattern for credentials: "label: value" or "label : value" */
const KEY_VALUE_PATTERN = /^.{2,30}\s*[:：]\s*.+$/;

export function suggestArchetype(title: string, body: string): SlideArchetypeId {
  const lines = body.split('\n').filter(l => l.trim().length > 0);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d+%|\d+\s*(مليار|مليون|ألف|ميار)/.test(body);

  // Title only, no body => highlighted statement
  if (wordCount === 0 && title.length > 0) return 'highlighted_statement';

  // Check for key:value pairs (credentials/profile) — before word count check
  // because credential rows can be very short
  const kvLines = lines.filter(l => KEY_VALUE_PATTERN.test(l.trim()));
  if (kvLines.length >= 3 && kvLines.length >= lines.length * 0.6) {
    return 'credentials_profile';
  }

  // Check for explicit bullet markers (•, -, ●, etc.) — before word count check
  // because bullet lists can be short
  const bulletLines = lines.filter(l => BULLET_MARKER.test(l));
  if (bulletLines.length >= 2 && bulletLines.length >= lines.length * 0.5) {
    return 'bullet_list';
  }

  // Check for numbered list markers (1. or 1) etc.)
  const numberedLines = lines.filter(l => NUMBERED_LIST_MARKER.test(l));
  if (numberedLines.length >= 2 && numberedLines.length >= lines.length * 0.5) {
    return 'bullet_list'; // numbered lists use bullet_list archetype
  }

  // Very short body (< 15 words) => highlighted statement
  if (wordCount < 15) return 'highlighted_statement';

  // Data card: numbers with Arabic units
  if (hasNumbers && wordCount < 60) return 'data_card';

  // Bullet heuristic: 3+ short lines (even without markers)
  const hasBulletHints = lines.length >= 3 && lines.every(l => l.trim().length < 80);
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
        // Left/right 90px, top 90px below image zone (54%), 90/1080=0.0833, 900/1080=0.8333, (729+90)/1350=0.607
        position: { x: 0.0833, y: 0.607, width: 0.8333, height: 0.09 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: textToRichText(parsed.title),
      },
      {
        id: nanoid(),
        type: 'body_paragraph',
        // Starts 13px below title (0.607+0.09+0.01=0.707), ends at 70px above footer (1180/1350=0.874), height=0.167
        position: { x: 0.0833, y: 0.707, width: 0.8333, height: 0.167 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: textToRichText(parsed.body),
      },
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: 0.54 },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: {
      family: 'classic-main',
      position: 'none',
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
