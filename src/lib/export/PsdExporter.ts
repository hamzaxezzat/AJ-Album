// src/lib/export/PsdExporter.ts
//
// Client-side PSD export — generates a Photoshop file from the data model.
// Text blocks become EDITABLE text layers in Photoshop.
// Shape blocks become rasterized layers.
// Uses ag-psd library.

import type { Psd, Layer, LayerTextData, TextStyle, ParagraphStyle } from 'ag-psd';
import { writePsd } from 'ag-psd';
import type { Album, Slide, ChannelProfile, ContentBlock, ResolvedTokens, TypographyProfile } from '@/types/album';
import { resolveTokens } from '@/lib/tokens/resolveTokens';
import { normalizedToPixels } from '@/lib/layout/normalizedToPixel';

// ─── Helpers ─────────────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  main_title: 'Title', subtitle: 'Subtitle', body_paragraph: 'Body',
  text_box: 'Text Box', highlighted_phrase: 'Highlight',
  bullet_list: 'Bullet List', numbered_list: 'Numbered List',
  credential_row: 'Credentials', stat_value: 'Stat',
  quote_block: 'Quote', callout: 'Callout', source_line: 'Source',
  divider: 'Divider', rectangle: 'Rectangle', ellipse: 'Ellipse',
  image_zone: 'Image',
};

function hexToColor(hex: string) {
  const c = hex.replace('#', '');
  return { r: parseInt(c.substring(0, 2), 16), g: parseInt(c.substring(2, 4), 16), b: parseInt(c.substring(4, 6), 16) };
}

function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return '';
  const lines: string[] = [];
  for (const node of doc.content) {
    const parts: string[] = [];
    if (node.content) {
      for (const child of node.content) {
        if (child.text) parts.push(child.text);
      }
    }
    lines.push(parts.join(''));
  }
  return lines.join('\n').trim();
}

function createCanvas(width: number, height: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rgb = hexToColor(color);
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

async function loadImageToCanvas(url: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, 0, width, height);
    if (!url) { resolve(canvas); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.max(width / img.width, height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (width - sw) / 2, (height - sh) / 2, sw, sh);
      resolve(canvas);
    };
    img.onerror = () => resolve(canvas);
    img.src = url;
  });
}

// ─── Font name mapping (CSS → Photoshop PostScript) ──────────

// Photoshop needs the exact PostScript name of the font, not the CSS family.
// These map the CSS font-family to the installed font's PostScript name.
const PS_FONT_MAP: Record<string, Record<number, string>> = {
  'Al-Jazeera': {
    300: 'AlJazeera-Light',
    400: 'AlJazeera-Regular',
    700: 'AlJazeera-Bold',
    900: 'AlJazeera-Heavy',
  },
  'Cairo': {
    400: 'Cairo-Regular',
    600: 'Cairo-SemiBold',
    700: 'Cairo-Bold',
  },
};

function resolvePsFont(cssFamily: string, weight: number): string {
  // Extract first font name from CSS stack: "'Al-Jazeera', Cairo, sans-serif" → "Al-Jazeera"
  const firstName = cssFamily.split(',')[0].replace(/'/g, '').trim();
  const weightMap = PS_FONT_MAP[firstName];
  if (weightMap) {
    // Find exact weight or closest
    if (weightMap[weight]) return weightMap[weight];
    // Fallback: 400 for light weights, 700 for bold
    if (weight <= 400) return weightMap[400] ?? weightMap[300] ?? Object.values(weightMap)[0];
    return weightMap[700] ?? weightMap[900] ?? Object.values(weightMap)[0];
  }
  // Unknown font — return as-is with weight suffix
  return `${firstName}-Regular`;
}

// ─── Text layer builder ──────────────────────────────────────

function renderTextToCanvas(
  text: string,
  w: number, h: number,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
  color: string,
  textAlign: CanvasTextAlign,
  lineHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const rgb = hexToColor(color);
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';

  const lineH = fontSize * lineHeight;
  const xPos = textAlign === 'right' ? w - 4 : textAlign === 'center' ? w / 2 : 4;

  const words = text.split(/\s+/);
  let line = '';
  let y = 4;

  for (const word of words) {
    const testLine = line ? line + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > w - 8 && line) {
      ctx.fillText(line, xPos, y);
      line = word;
      y += lineH;
      if (y > h - lineH) break;
    } else {
      line = testLine;
    }
  }
  if (line && y <= h - fontSize) {
    ctx.fillText(line, xPos, y);
  }

  return canvas;
}

function buildTextLayer(
  name: string,
  text: string,
  x: number, y: number, w: number, h: number,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
  color: string,
  lineHeight: number,
  textAlign: 'right' | 'left' | 'center' | 'justify' = 'right',
  hidden: boolean = false,
): Layer {
  const rgb = hexToColor(color);

  // Map CSS font-family to Photoshop PostScript name
  const psFontName = resolvePsFont(fontFamily, fontWeight);

  // Render text to canvas — Photoshop uses this as the preview/fallback
  const canvasAlign: CanvasTextAlign = textAlign === 'justify' ? 'right' : textAlign;
  const canvas = renderTextToCanvas(text, w, h, fontSize, fontWeight, fontFamily, color, canvasAlign, lineHeight);

  const textStyle: TextStyle = {
    font: { name: psFontName },
    fontSize,
    fauxBold: false,
    leading: fontSize * lineHeight,
    fillColor: { r: rgb.r, g: rgb.g, b: rgb.b },
    tracking: 0,
    autoKerning: true,
  };

  const justification: ParagraphStyle['justification'] =
    textAlign === 'justify' ? 'justify-right'
    : textAlign === 'center' ? 'center'
    : textAlign === 'left' ? 'left'
    : 'right';

  const paragraphStyle: ParagraphStyle = {
    justification,
  };

  // Text data for editable text layer
  // The text content must end with \r for Photoshop compatibility
  const psText = text.replace(/\n/g, '\r') + '\r';

  const textData: LayerTextData = {
    text: psText,
    // Transform [scaleX, shearY, shearX, scaleY, translateX, translateY]
    // Position the text box at (x, y) in PSD coordinates
    transform: [1, 0, 0, 1, x, y],
    antiAlias: 'sharp',
    style: textStyle,
    styleRuns: [{ length: psText.length, style: textStyle }],
    paragraphStyle,
    paragraphStyleRuns: [{ length: psText.length, style: paragraphStyle }],
    shapeType: 'box',
    // boxBounds relative to transform origin: [top, left, bottom, right]
    boxBounds: [0, 0, h, w],
  };

  return {
    name,
    // Layer bounds must match text position for Photoshop
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    canvas,
    text: textData,
    hidden,
  };
}

// ─── Block → Layer ───────────────────────────────────────────

function blockToLayer(
  block: ContentBlock,
  tokens: ResolvedTokens,
  canvasW: number,
  canvasH: number,
): Layer | null {
  const px = normalizedToPixels(block.position, canvasW, canvasH);
  const w = Math.round(px.width);
  const h = Math.round(px.height);
  const x = Math.round(px.x);
  const y = Math.round(px.y);

  if (w <= 0 || h <= 0) return null;

  const name = ('label' in block && (block as { label: string }).label)
    ? (block as { label: string }).label
    : BLOCK_LABELS[block.type] ?? block.type;

  const typoRef = ('typographyTokenRef' in block)
    ? (block as { typographyTokenRef: string }).typographyTokenRef
    : 'body-m';
  const typoToken = tokens.typography[typoRef as keyof TypographyProfile];
  const overrides = block.styleOverrides ?? {};

  const fontSize = overrides.fontSize ?? typoToken?.fontSize ?? 38;
  const fontWeight = overrides.fontWeight ?? typoToken?.fontWeight ?? 400;
  const fontFamily = typoToken?.fontFamily ?? "'Al-Jazeera', Cairo, sans-serif";
  const lineHeight = typoToken?.lineHeight ?? 1.5;
  const textAlign = (overrides.textAlign ?? typoToken?.textAlign ?? 'right') as 'right' | 'left' | 'center' | 'justify';

  switch (block.type) {
    case 'main_title':
    case 'subtitle': {
      const text = extractPlainText(('content' in block) ? (block as { content: unknown }).content : null);
      const color = overrides.color ?? tokens.titleColor;
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, color, lineHeight, textAlign, !block.visible);
    }

    case 'body_paragraph':
    case 'text_box':
    case 'highlighted_phrase': {
      const text = extractPlainText(('content' in block) ? (block as { content: unknown }).content : null);
      const color = block.type === 'highlighted_phrase'
        ? ((block as { textColor?: string }).textColor ?? tokens.textPrimary)
        : (overrides.color ?? tokens.bodyColor);
      const align = block.type === 'body_paragraph' || block.type === 'text_box'
        ? ('kashidaEnabled' in block && (block as { kashidaEnabled?: boolean }).kashidaEnabled !== false ? 'justify' as const : textAlign)
        : textAlign;
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, color, lineHeight, align, !block.visible);
    }

    case 'source_line': {
      const text = (block as { text: string }).text ?? '';
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, tokens.textSecondary, lineHeight, textAlign, !block.visible);
    }

    case 'bullet_list': {
      const items = (block as { items: Array<{ content: unknown }> }).items ?? [];
      const text = items.map(item => '• ' + extractPlainText(item.content)).join('\n');
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, lineHeight, textAlign, !block.visible);
    }

    case 'numbered_list': {
      const items = (block as { items: Array<{ content: unknown }> }).items ?? [];
      const text = items.map((item, i) => `${i + 1}. ` + extractPlainText(item.content)).join('\n');
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, lineHeight, textAlign, !block.visible);
    }

    case 'credential_row': {
      const rows = (block as { rows: Array<{ label: string; value: unknown }> }).rows ?? [];
      const text = rows.map(r => `${r.label}: ${typeof r.value === 'string' ? r.value : extractPlainText(r.value)}`).join('\n');
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, lineHeight, textAlign, !block.visible);
    }

    case 'stat_value': {
      const val = (block as { value: string }).value ?? '';
      const label = (block as { label: string }).label ?? '';
      const statColor = (block as { accentColor?: string }).accentColor ?? tokens.accentPrimary;
      return buildTextLayer(name, `${val}\n${label}`, x, y, w, h, fontSize * 1.5, fontWeight, fontFamily, statColor, 1.2, 'center', !block.visible);
    }

    case 'quote_block': {
      const text = extractPlainText(('content' in block) ? (block as { content: unknown }).content : null);
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, lineHeight, textAlign, !block.visible);
    }

    case 'callout': {
      const text = extractPlainText(('content' in block) ? (block as { content: unknown }).content : null);
      const color = (block as { textColor?: string }).textColor ?? tokens.textPrimary;
      return buildTextLayer(name, text, x, y, w, h, fontSize, fontWeight, fontFamily, color, lineHeight, textAlign, !block.visible);
    }

    case 'rectangle': {
      const shape = (block as { shape: { fillColor: string; fillOpacity: number; borderRadius: number } }).shape;
      return { name, left: x, top: y, canvas: createCanvas(w, h, shape.fillColor), hidden: !block.visible, opacity: shape.fillOpacity };
    }

    case 'ellipse': {
      const shape = (block as { shape: { fillColor: string; fillOpacity: number } }).shape;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const rgb = hexToColor(shape.fillColor);
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return { name, left: x, top: y, canvas, hidden: !block.visible, opacity: shape.fillOpacity };
    }

    case 'divider': {
      const color = (block as { color: string }).color ?? '#CCCCCC';
      return { name, left: x, top: y, canvas: createCanvas(w, h, color), hidden: !block.visible };
    }

    default:
      return null;
  }
}

// ─── Build slide layers (shared by single + artboard export) ─

async function buildSlideLayers(
  slide: Slide,
  album: Album,
  channelProfile: ChannelProfile,
  offsetX: number = 0,
): Promise<Layer[]> {
  const { width, height } = album.canvasDimensions;

  const tokens = resolveTokens({
    channelProfile,
    albumTheme: album.theme,
    canvasConfig: album.canvasDimensions,
    slideOverrides: slide.themeOverrides,
  });

  const layers: Layer[] = [];

  // 1. Background
  layers.push({ name: 'Background', left: offsetX, top: 0, canvas: createCanvas(width, height, tokens.background) });

  // 2. Image
  if (slide.image) {
    const imgRect = normalizedToPixels(slide.image.rect, width, height);
    const imgCanvas = await loadImageToCanvas(slide.image.asset?.url ?? '', Math.round(imgRect.width), Math.round(imgRect.height));
    layers.push({ name: 'Image', left: offsetX + Math.round(imgRect.x), top: Math.round(imgRect.y), canvas: imgCanvas });
  }

  // 3. Content blocks (editable text layers)
  const sortedBlocks = [...slide.blocks].sort((a, b) => a.zIndex - b.zIndex);
  for (const block of sortedBlocks) {
    if (!block.visible) continue;
    const layer = blockToLayer(block, tokens, width, height);
    if (layer) {
      // Offset for artboard positioning
      if (offsetX > 0) {
        layer.left = (layer.left ?? 0) + offsetX;
        if (layer.text?.transform) {
          layer.text.transform[4] = (layer.text.transform[4] ?? 0) + offsetX;
        }
      }
      layers.push(layer);
    }
  }

  // 4. Banner
  if (slide.banner && slide.banner.position !== 'none') {
    const bannerH = Math.round(height * slide.banner.heightNormalized);
    let bannerY = 0;
    if (slide.banner.position === 'bottom') bannerY = height - bannerH - Math.round(height * 0.074);
    else if (slide.banner.position === 'float-top') bannerY = Math.round(height * (slide.image?.rect.height ?? 0.55) - bannerH / 2);
    else if (slide.banner.position === 'float-bottom') bannerY = Math.round(height * (slide.image?.rect.height ?? 0.55) + height * 0.02);
    layers.push({ name: 'Banner', left: offsetX, top: bannerY, canvas: createCanvas(width, bannerH, tokens.accentPrimary) });
  }

  // 5. Footer
  const footerH = Math.round(height * 0.074);
  layers.push({ name: 'Footer', left: offsetX, top: height - footerH, canvas: createCanvas(width, footerH, tokens.background) });

  return layers;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Export a single slide as a PSD file.
 */
export async function exportSlideToPsd(
  slide: Slide,
  album: Album,
  channelProfile: ChannelProfile,
): Promise<Blob> {
  const { width, height } = album.canvasDimensions;
  const layers = await buildSlideLayers(slide, album, channelProfile, 0);
  const psd: Psd = { width, height, children: layers };
  const buffer = writePsd(psd);
  return new Blob([buffer], { type: 'application/vnd.adobe.photoshop' });
}

/**
 * Export ALL slides as artboards in a single PSD file.
 * Each slide becomes a Photoshop artboard, laid out horizontally.
 */
export async function exportAlbumAsPsd(
  album: Album,
  channelProfile: ChannelProfile,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const { width, height } = album.canvasDimensions;
  const GAP = 100; // px between artboards
  const totalWidth = album.slides.length * width + (album.slides.length - 1) * GAP;

  const artboards: Layer[] = [];

  for (let i = 0; i < album.slides.length; i++) {
    if (onProgress) onProgress(i + 1, album.slides.length);
    const slide = album.slides[i];
    const offsetX = i * (width + GAP);

    // Build child layers for this artboard
    const childLayers = await buildSlideLayers(slide, album, channelProfile, offsetX);

    // Wrap as an artboard group
    const artboardGroup: Layer = {
      name: `شريحة ${slide.number}`,
      children: childLayers,
      opened: true,
      artboard: {
        rect: {
          top: 0,
          left: offsetX,
          bottom: height,
          right: offsetX + width,
        },
        presetName: album.canvasDimensions.presetName,
        backgroundType: 1, // white
      },
    };

    artboards.push(artboardGroup);
  }

  const psd: Psd = {
    width: totalWidth,
    height,
    children: artboards,
    artboards: {
      count: album.slides.length,
      autoExpandEnabled: false,
      origin: { horizontal: 0, vertical: 0 },
      autoExpandOffset: { horizontal: 0, vertical: 0 },
      autoNestEnabled: false,
      autoPositionEnabled: false,
    },
  };

  const buffer = writePsd(psd);
  return new Blob([buffer], { type: 'application/vnd.adobe.photoshop' });
}

export async function exportAlbumToPsdZip(
  album: Album,
  channelProfile: ChannelProfile,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const results: Array<{ name: string; blob: Blob }> = [];
  for (let i = 0; i < album.slides.length; i++) {
    if (onProgress) onProgress(i + 1, album.slides.length);
    const slide = album.slides[i];
    const blob = await exportSlideToPsd(slide, album, channelProfile);
    results.push({ name: `${album.title}-${String(slide.number).padStart(2, '0')}.psd`, blob });
  }
  const files: Array<{ name: string; data: Uint8Array }> = [];
  for (const r of results) {
    files.push({ name: r.name, data: new Uint8Array(await r.blob.arrayBuffer()) });
  }
  return createMinimalZip(files);
}

function createMinimalZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const header = new Uint8Array(30 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 20, true); hv.setUint16(8, 0, true);
    hv.setUint32(14, crc, true); hv.setUint32(18, file.data.length, true); hv.setUint32(22, file.data.length, true);
    hv.setUint16(26, nameBytes.length, true); header.set(nameBytes, 30);
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, file.data.length, true); cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true); cv.setUint32(42, offset, true); cdEntry.set(nameBytes, 46);
    parts.push(header, file.data); centralDir.push(cdEntry);
    offset += header.length + file.data.length;
  }
  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) { parts.push(cd); cdSize += cd.length; }
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, cdOffset, true); parts.push(eocd);
  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) { crc ^= data[i]; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
