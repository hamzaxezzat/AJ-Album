// src/lib/export/PsdExporter.ts
//
// Client-side PSD export — generates a Photoshop file from the data model.
// Each ContentBlock becomes a separate Photoshop layer with proper naming.
// Uses ag-psd library (https://github.com/nicktomlin/ag-psd).
//
// Unlike PNG export (Puppeteer screenshot), PSD is built from the data:
//   - Positions from NormalizedRect → pixel coordinates
//   - Text layers with proper font info
//   - Shape layers for rectangles/ellipses
//   - Image layer for the slide background image

import type { Psd, Layer } from 'ag-psd';
import { writePsd } from 'ag-psd';
import type { Album, Slide, ChannelProfile, ContentBlock, ResolvedTokens, TypographyProfile } from '@/types/album';
import { resolveTokens } from '@/lib/tokens/resolveTokens';
import { normalizedToPixels } from '@/lib/layout/normalizedToPixel';

// ─── Block label map ─────────────────────────────────────────

const BLOCK_LABELS: Record<string, string> = {
  main_title: 'Title',
  subtitle: 'Subtitle',
  body_paragraph: 'Body',
  text_box: 'Text Box',
  highlighted_phrase: 'Highlight',
  bullet_list: 'Bullet List',
  numbered_list: 'Numbered List',
  credential_row: 'Credentials',
  stat_value: 'Stat',
  quote_block: 'Quote',
  callout: 'Callout',
  source_line: 'Source',
  divider: 'Divider',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  image_zone: 'Image',
};

// ─── Helpers ─────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '');
  return {
    r: parseInt(c.substring(0, 2), 16),
    g: parseInt(c.substring(2, 4), 16),
    b: parseInt(c.substring(4, 6), 16),
  };
}

function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return '';
  const parts: string[] = [];
  for (const node of doc.content) {
    if (node.content) {
      for (const child of node.content) {
        if (child.text) parts.push(child.text);
      }
    }
    parts.push('\n');
  }
  return parts.join('').trim();
}

function createCanvas(width: number, height: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const rgb = hexToRgb(color);
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

function createTextCanvas(
  text: string,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
  color: string,
  textAlign: CanvasTextAlign = 'right',
  lineHeight: number = 1.5,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, width, height);

  const rgb = hexToRgb(color);
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';

  const lineH = fontSize * lineHeight;
  const x = textAlign === 'right' ? width - 4 : textAlign === 'center' ? width / 2 : 4;

  // Simple word-wrap
  const words = text.split(/\s+/);
  let line = '';
  let y = 4;

  for (const word of words) {
    const testLine = line ? line + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > width - 8 && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
      if (y > height - lineH) break;
    } else {
      line = testLine;
    }
  }
  if (line && y <= height - fontSize) {
    ctx.fillText(line, x, y);
  }

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
      // Cover fit
      const scale = Math.max(width / img.width, height / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
      resolve(canvas);
    };
    img.onerror = () => resolve(canvas);
    img.src = url;
  });
}

// ─── Block → Layer conversion ────────────────────────────────

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

  switch (block.type) {
    case 'main_title':
    case 'subtitle':
    case 'body_paragraph':
    case 'text_box':
    case 'highlighted_phrase':
    case 'source_line': {
      const text = block.type === 'source_line'
        ? (block as { text: string }).text ?? ''
        : extractPlainText(('content' in block) ? (block as { content: unknown }).content : null);

      const color = block.type === 'main_title'
        ? (overrides.color ?? tokens.titleColor)
        : (overrides.color ?? tokens.bodyColor);

      const canvas = createTextCanvas(text, w, h, fontSize, fontWeight, fontFamily, color, 'right', lineHeight);

      return {
        name,
        left: x,
        top: y,
        canvas,
        hidden: !block.visible,
      };
    }

    case 'rectangle': {
      const shape = (block as { shape: { fillColor: string; fillOpacity: number; borderRadius: number } }).shape;
      const canvas = createCanvas(w, h, shape.fillColor);
      return {
        name,
        left: x,
        top: y,
        canvas,
        hidden: !block.visible,
        opacity: shape.fillOpacity,
      };
    }

    case 'ellipse': {
      const shape = (block as { shape: { fillColor: string; fillOpacity: number } }).shape;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);
      const rgb = hexToRgb(shape.fillColor);
      ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return {
        name,
        left: x,
        top: y,
        canvas,
        hidden: !block.visible,
        opacity: shape.fillOpacity,
      };
    }

    case 'bullet_list': {
      const items = (block as { items: Array<{ content: unknown }> }).items ?? [];
      const text = items.map(item => '• ' + extractPlainText(item.content)).join('\n');
      const canvas = createTextCanvas(text, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, 'right', lineHeight);
      return { name, left: x, top: y, canvas, hidden: !block.visible };
    }

    case 'numbered_list': {
      const items = (block as { items: Array<{ content: unknown }> }).items ?? [];
      const text = items.map((item, i) => `${i + 1}. ` + extractPlainText(item.content)).join('\n');
      const canvas = createTextCanvas(text, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, 'right', lineHeight);
      return { name, left: x, top: y, canvas, hidden: !block.visible };
    }

    case 'credential_row': {
      const rows = (block as { rows: Array<{ label: string; value: unknown }> }).rows ?? [];
      const text = rows.map(r => `${r.label}: ${typeof r.value === 'string' ? r.value : extractPlainText(r.value)}`).join('\n');
      const canvas = createTextCanvas(text, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, 'right', lineHeight);
      return { name, left: x, top: y, canvas, hidden: !block.visible };
    }

    case 'stat_value': {
      const val = (block as { value: string }).value ?? '';
      const label = (block as { label: string }).label ?? '';
      const canvas = createTextCanvas(`${val}\n${label}`, w, h, fontSize, fontWeight, fontFamily, tokens.textPrimary, 'center', 1.2);
      return { name, left: x, top: y, canvas, hidden: !block.visible };
    }

    case 'divider': {
      const color = (block as { color: string }).color ?? '#CCCCCC';
      const canvas = createCanvas(w, h, color);
      return { name, left: x, top: y, canvas, hidden: !block.visible };
    }

    default:
      return null;
  }
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Export a single slide as a PSD file.
 * Each block becomes a named Photoshop layer.
 */
export async function exportSlideToPsd(
  slide: Slide,
  album: Album,
  channelProfile: ChannelProfile,
): Promise<Blob> {
  const { width, height } = album.canvasDimensions;

  const tokens = resolveTokens({
    channelProfile,
    albumTheme: album.theme,
    canvasConfig: album.canvasDimensions,
    slideOverrides: slide.themeOverrides,
  });

  // Build layers bottom-to-top
  const layers: Layer[] = [];

  // 1. Background layer
  const bgCanvas = createCanvas(width, height, tokens.background);
  layers.push({ name: 'Background', canvas: bgCanvas });

  // 2. Image zone layer
  if (slide.image) {
    const imgRect = normalizedToPixels(slide.image.rect, width, height);
    const imgW = Math.round(imgRect.width);
    const imgH = Math.round(imgRect.height);
    const imgCanvas = await loadImageToCanvas(
      slide.image.asset?.url ?? '',
      imgW,
      imgH,
    );
    layers.push({
      name: 'Image',
      left: Math.round(imgRect.x),
      top: Math.round(imgRect.y),
      canvas: imgCanvas,
    });
  }

  // 3. Content block layers (sorted by zIndex)
  const sortedBlocks = [...slide.blocks].sort((a, b) => a.zIndex - b.zIndex);
  for (const block of sortedBlocks) {
    if (!block.visible) continue;
    const layer = blockToLayer(block, tokens, width, height);
    if (layer) layers.push(layer);
  }

  // 4. Banner layer
  if (slide.banner && slide.banner.position !== 'none') {
    const bannerH = Math.round(height * slide.banner.heightNormalized);
    let bannerY = 0;
    if (slide.banner.position === 'bottom') bannerY = Math.round(height * (1 - tokens.canvasHeight * 0.074 / height) - bannerH);
    else if (slide.banner.position === 'top') bannerY = 0;
    else if (slide.banner.position === 'float-top') bannerY = Math.round(height * (slide.image?.rect.height ?? 0.55) - bannerH / 2);
    else bannerY = Math.round(height * (slide.image?.rect.height ?? 0.55) + height * 0.02);

    const bannerCanvas = createCanvas(width, bannerH, tokens.accentPrimary);
    layers.push({ name: 'Banner', left: 0, top: bannerY, canvas: bannerCanvas });
  }

  // 5. Footer layer
  const footerH = Math.round(height * 0.074);
  const footerCanvas = createCanvas(width, footerH, tokens.background);
  layers.push({ name: 'Footer', left: 0, top: height - footerH, canvas: footerCanvas });

  // Build PSD
  const psd: Psd = {
    width,
    height,
    children: layers,
  };

  const buffer = writePsd(psd);
  return new Blob([buffer], { type: 'application/vnd.adobe.photoshop' });
}

/**
 * Export all slides as individual PSD files bundled in a ZIP.
 */
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
    const num = String(slide.number).padStart(2, '0');
    results.push({ name: `${album.title}-${num}.psd`, blob });
  }

  // Bundle using minimal ZIP (same approach as ZipExporter)
  const files: Array<{ name: string; data: Uint8Array }> = [];
  for (const r of results) {
    const buf = await r.blob.arrayBuffer();
    files.push({ name: r.name, data: new Uint8Array(buf) });
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
    hv.setUint32(0, 0x04034b50, true);
    hv.setUint16(4, 20, true);
    hv.setUint16(8, 0, true);
    hv.setUint32(14, crc, true);
    hv.setUint32(18, file.data.length, true);
    hv.setUint32(22, file.data.length, true);
    hv.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);

    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cdEntry.set(nameBytes, 46);

    parts.push(header, file.data);
    centralDir.push(cdEntry);
    offset += header.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) { parts.push(cd); cdSize += cd.length; }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  parts.push(eocd);

  return new Blob(parts as BlobPart[], { type: 'application/zip' });
}

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
