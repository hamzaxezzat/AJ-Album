// export-service/src/exporters/PngExporter.ts
//
// Renders a slide to PNG via Puppeteer. Generates HTML that mirrors
// the browser SlideRenderer exactly — reads actual block positions,
// font sizes, styles, and content from the slide data.

import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Slide, Album, ExportContext, ExportArtifact, SlideExporter } from '../types/album-types.js';

/**
 * Read a font file and return a base64 data URI.
 * This embeds the font directly in the HTML so Puppeteer doesn't
 * need to fetch it over HTTP — guarantees the font loads.
 */
function fontToDataUri(filePath: string, format: string): string | null {
  // Try multiple paths: relative to project root, public/fonts, etc.
  const cleanPath = filePath.replace(/^\//, '');
  const candidates = [
    join(process.cwd(), 'public', cleanPath),
    join(process.cwd(), '..', 'public', cleanPath),
    join(process.cwd(), cleanPath),
    // Absolute fallback for monorepo setups
    join(process.cwd(), 'public', 'fonts', cleanPath.replace(/^fonts\//, '')),
    join(process.cwd(), '..', 'public', 'fonts', cleanPath.replace(/^fonts\//, '')),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const buf = readFileSync(p);
      const mime = format === 'truetype' ? 'font/ttf'
        : format === 'woff2' ? 'font/woff2'
        : 'application/octet-stream';
      return `data:${mime};base64,${buf.toString('base64')}`;
    }
  }
  return null;
}

export class PngExporter implements SlideExporter {
  readonly format = 'png' as const;

  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async exportSlide(
    slide: Slide,
    album: Album,
    ctx: ExportContext,
  ): Promise<ExportArtifact> {
    const { canvasDimensions, scale = 2 } = ctx;
    const { width, height } = canvasDimensions;

    const html = generateSlideHtml(slide, album, ctx);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width, height, deviceScaleFactor: scale });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);

      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height },
      });

      return {
        format: 'png',
        buffer: Buffer.from(buffer),
        filename: `slide-${String(slide.number).padStart(2, '0')}.png`,
      };
    } finally {
      await page.close();
    }
  }

  async exportAlbum(_album: Album, _ctx: ExportContext): Promise<ExportArtifact> {
    throw new Error('Use ZipExporter for full album export');
  }
}

// ─── HTML generation (data-driven, mirrors SlideRenderer) ────

/* eslint-disable @typescript-eslint/no-explicit-any */
type RichNode = {
  type: string;
  text?: string;
  content?: RichNode[];
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
};

function generateSlideHtml(slide: Slide, album: Album, ctx: ExportContext): string {
  const { width, height } = ctx.canvasDimensions;
  const fontBase = process.env.FONT_BASE_URL ?? 'http://localhost:3000/fonts';

  // Token cascade: album theme → slide overrides (mirrors resolveTokens.ts)
  const theme = album.theme ?? {} as any;
  const slideOverrides = (slide as any).themeOverrides ?? {};
  const effectiveTheme = { ...theme, ...slideOverrides };
  const accentColor = effectiveTheme.primaryColor ?? '#D32F2F';
  const titleColor = effectiveTheme.titleColor ?? accentColor;
  const bodyColor = effectiveTheme.bodyColor ?? '#1A1A1A';

  // Resolve typography from channel profile, with theme overrides
  const typo = ctx.channelProfile?.typography as Record<string, any> | undefined;
  // Apply font size/weight overrides from theme
  const resolvedTypo: Record<string, any> = {};
  if (typo) {
    for (const key of Object.keys(typo)) resolvedTypo[key] = { ...typo[key] };
    if (effectiveTheme.titleFontSize && resolvedTypo['heading-l']) resolvedTypo['heading-l'].fontSize = effectiveTheme.titleFontSize;
    if (effectiveTheme.titleFontWeight && resolvedTypo['heading-l']) resolvedTypo['heading-l'].fontWeight = effectiveTheme.titleFontWeight;
    if (effectiveTheme.bodyFontSize && resolvedTypo['body-m']) resolvedTypo['body-m'].fontSize = effectiveTheme.bodyFontSize;
    if (effectiveTheme.bodyFontWeight && resolvedTypo['body-m']) resolvedTypo['body-m'].fontWeight = effectiveTheme.bodyFontWeight;
  }

  // Sort visible blocks by zIndex
  const sortedBlocks = [...slide.blocks]
    .filter(b => b.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // Image zone
  const imageRect = slide.image?.rect ?? { x: 0, y: 0, width: 1, height: 0.55 };
  const hasImage = !!(slide.image?.asset?.url);
  const imageUrl = slide.image?.asset?.url ?? '';

  // Build block HTML — C1 fix: use `left:` not `right:` (matches browser renderer)
  const blocksHtml = sortedBlocks.map(block => {
    const b = block as any;
    const pos = block.position;
    const posStyle = `position:absolute;`
      + `left:calc(${width}px * ${pos.x});`
      + `top:calc(${height}px * ${pos.y});`
      + `width:calc(${width}px * ${pos.width});`
      + `height:calc(${height}px * ${pos.height});`
      + `z-index:${block.zIndex ?? 10};`
      + `overflow:hidden;direction:rtl;`;

    const typoRef = (b.typographyTokenRef as string) ?? '';
    const typoToken = resolvedTypo[typoRef] ?? typo?.[typoRef] as any;
    const overrides = block.styleOverrides ?? {};

    const fontSize = (overrides as any).fontSize as number
      ?? (typoToken?.fontSize as number) ?? 38;
    const fontWeight = (overrides as any).fontWeight as number
      ?? (typoToken?.fontWeight as number) ?? 400;
    const lineHeight = (typoToken?.lineHeight as number) ?? 1.6;
    const fontFamily = (typoToken?.fontFamily as string)
      ?? "'Al-Jazeera', Cairo, sans-serif";

    switch (block.type) {
      case 'main_title': {
        const color = (overrides as any).color as string ?? titleColor;
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:700;line-height:${lineHeight};color:${color};text-align:right;text-wrap:balance;">`
          + renderRichContent(b.content as RichNode)
          + `</div>`;
      }

      case 'subtitle': {
        const color = (overrides as any).color as string ?? '#333333';
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:600;line-height:${lineHeight};color:${color};text-align:right;">`
          + renderRichContent(b.content as RichNode)
          + `</div>`;
      }

      case 'body_paragraph':
      case 'text_box': {
        const color = (overrides as any).color as string ?? bodyColor;
        const textAlign = (overrides as any).textAlign as string ?? (b.kashidaEnabled !== false ? 'justify' : 'right');
        const kashidaOn = (b.kashidaEnabled !== false);
        let html = renderRichContent(b.content as RichNode);
        // C6 fix: insert tatweel characters for kashida (same as browser renderer)
        if (kashidaOn) {
          html = html.replace(/>([^<]+)</g, (_m, text) => '>' + applySimpleKashida(text as string) + '<');
        }
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};line-height:${lineHeight};color:${color};text-align:${textAlign};">`
          + html
          + `</div>`;
      }

      case 'highlighted_phrase': {
        const bgColor = (b.backgroundColor as string) ?? '#FFEB3B';
        const textColor = (b.textColor as string) ?? '#1A1A1A';
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:700;line-height:${lineHeight};color:${textColor};background:${bgColor};padding:12px 16px;text-align:right;">`
          + renderRichContent(b.content as RichNode)
          + `</div>`;
      }

      case 'bullet_list': {
        const items = (b.items as Array<{ content: RichNode }>) ?? [];
        const bulletColor = (b.bulletColor as string) ?? accentColor;
        const itemsHtml = items.map(item =>
          `<li style="margin-block-end:0.4em;padding-inline-end:8px;">`
          + renderRichContent(item.content)
          + `</li>`
        ).join('');
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};line-height:${lineHeight};color:#1A1A1A;text-align:right;">`
          + `<ul style="margin:0;padding-inline-end:1.4em;padding-inline-start:0;list-style-type:disc;color:${bulletColor};">`
          + `<span style="color:#1A1A1A;">${itemsHtml}</span></ul></div>`;
      }

      case 'numbered_list': {
        const items = (b.items as Array<{ content: RichNode }>) ?? [];
        const itemsHtml = items.map(item =>
          `<li style="margin-block-end:0.4em;">`
          + renderRichContent(item.content)
          + `</li>`
        ).join('');
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};line-height:${lineHeight};color:#1A1A1A;text-align:right;">`
          + `<ol style="margin:0;padding-inline-end:1.4em;padding-inline-start:0;">${itemsHtml}</ol></div>`;
      }

      case 'credential_row': {
        const rows = (b.rows as Array<{ label: string; value: RichNode | string }>) ?? [];
        const rowsHtml = rows.map(r =>
          `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.08);">`
          + `<span style="font-weight:600;color:${accentColor};">${escapeHtml(r.label)}</span>`
          + `<span style="color:#1A1A1A;">${typeof r.value === 'string' ? escapeHtml(r.value) : renderRichContent(r.value)}</span>`
          + `</div>`
        ).join('');
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;line-height:${lineHeight};">${rowsHtml}</div>`;
      }

      case 'stat_value': {
        const value = (b.value as string) ?? '';
        const label = (b.label as string) ?? '';
        const statAccent = (b.accentColor as string) ?? accentColor;
        return `<div style="${posStyle}font-family:${fontFamily};text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;">`
          + `<div style="font-size:${fontSize * 1.8}px;font-weight:700;color:${statAccent};line-height:1.2;">${escapeHtml(value)}</div>`
          + `<div style="font-size:${fontSize * 0.7}px;color:#666;margin-top:4px;">${escapeHtml(label)}</div>`
          + `</div>`;
      }

      case 'quote_block': {
        const quoteAccent = (b.accentColor as string) ?? accentColor;
        return `<div style="${posStyle}font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};line-height:${lineHeight};color:#1A1A1A;border-right:4px solid ${quoteAccent};padding-right:16px;font-style:italic;">`
          + renderRichContent(b.content as RichNode)
          + (b.attribution ? `<div style="margin-top:8px;font-size:${fontSize * 0.7}px;color:#666;font-style:normal;">— ${escapeHtml(b.attribution as string)}</div>` : '')
          + `</div>`;
      }

      case 'divider': {
        const color = (b.color as string) ?? '#CCCCCC';
        const thickness = (b.thickness as number) ?? 0.002;
        return `<div style="${posStyle}display:flex;align-items:center;justify-content:center;">`
          + `<div style="width:100%;height:${thickness * height}px;background:${color};"></div></div>`;
      }

      case 'rectangle': {
        const shape = (b.shape as any) ?? {};
        return `<div style="${posStyle}background:${shape.fillColor ?? '#D32F2F'};opacity:${shape.fillOpacity ?? 0.8};`
          + `${(shape.strokeWidth as number) > 0 ? `border:${shape.strokeWidth}px solid ${shape.strokeColor ?? '#000'};` : ''}`
          + `border-radius:${shape.borderRadius ?? 0}px;"></div>`;
      }

      case 'ellipse': {
        const shape = (b.shape as any) ?? {};
        return `<div style="${posStyle}background:${shape.fillColor ?? '#D32F2F'};opacity:${shape.fillOpacity ?? 0.8};`
          + `${(shape.strokeWidth as number) > 0 ? `border:${shape.strokeWidth}px solid ${shape.strokeColor ?? '#000'};` : ''}`
          + `border-radius:50%;"></div>`;
      }

      default:
        return '';
    }
  }).join('\n    ');

  // Banner
  const bannerPos = slide.banner?.position ?? 'none';
  const bannerHeight = slide.banner?.heightNormalized ?? 0.1;
  let bannerHtml = '';
  if (bannerPos !== 'none') {
    const bannerTop = bannerPos === 'top' ? '0'
      : bannerPos === 'bottom' ? `calc(${height}px - calc(${height}px * ${bannerHeight}) - calc(${height}px * 0.074))`
      : bannerPos === 'float-top' ? `calc(${height}px * ${imageRect.height} - calc(${height}px * ${bannerHeight / 2}))`
      : `calc(${height}px * ${imageRect.height} + calc(${height}px * 0.02))`;
    bannerHtml = `<div style="position:absolute;left:0;right:0;top:${bannerTop};height:calc(${height}px * ${bannerHeight});background:${accentColor};z-index:20;"></div>`;
  }

  // C2: Channel logo
  const cp = ctx.channelProfile as any;
  const logoUrl = cp?.logo?.primary?.url ?? '';
  const logoMarginTop = Math.round(height * (90 / 1350));
  const logoMarginLeft = Math.round(width * (90 / 1080));
  const logoWidth = Math.round(width * 0.09);
  const logoHtml = logoUrl
    ? `<img src="${fontBase.replace('/fonts', '')}${logoUrl}" style="position:absolute;top:${logoMarginTop}px;left:${logoMarginLeft}px;width:${logoWidth}px;height:auto;z-index:50;pointer-events:none;" />`
    : '';

  // C3/C4: Footer from channel profile
  const footer = cp?.footer ?? {};
  const footerHeight = footer.height ?? 0.074;
  const socialHandles = (footer.socialHandles ?? []) as Array<{ platform: string; handle: string }>;
  const totalSlides = (ctx as any).totalSlides as number ?? slide.number;
  const dotsHtml = Array.from({ length: totalSlides }, (_, i) =>
    `<div style="width:8px;height:8px;border-radius:50%;background:${i === slide.number - 1 ? accentColor : '#CCC'};"></div>`
  ).join('');

  // Generate @font-face from channel profile fontFiles (same fonts as the editor)
  const channelProfile = ctx.channelProfile;
  const fontFiles = (channelProfile as any)?.fontFiles as Array<{ family: string; weight: number; url: string; format: string }> ?? [];
  const primaryFontFamily = (channelProfile as any)?.primaryFontFamily as string ?? "'Al-Jazeera', sans-serif";

  // Embed fonts as base64 data URIs so Puppeteer doesn't need HTTP access.
  // Falls back to HTTP URL if file not found on disk.
  const fontFaces = fontFiles.map(f => {
    const dataUri = fontToDataUri(f.url, f.format);
    if (dataUri) {
      return `@font-face { font-family:'${f.family}'; src:url('${dataUri}') format('${f.format}'); font-weight:${f.weight}; font-style:normal; font-display:block; }`;
    }
    const filePath = f.url.startsWith('/fonts/') ? f.url.slice(6) : f.url.startsWith('/') ? f.url : '/' + f.url;
    return `@font-face { font-family:'${f.family}'; src:url('${fontBase}${filePath}') format('${f.format}'); font-weight:${f.weight}; font-style:normal; font-display:block; }`;
  }).join('\n    ');

  // Cairo fallback — also try data URI
  const cairoRegular = fontToDataUri('/fonts/Cairo-Regular.woff2', 'woff2');
  const cairoBold = fontToDataUri('/fonts/Cairo-Bold.woff2', 'woff2');
  const fallbackFonts = `
    @font-face { font-family:'Cairo'; src:url('${cairoRegular ?? fontBase + '/Cairo-Regular.woff2'}') format('woff2'); font-weight:400; font-display:block; }
    @font-face { font-family:'Cairo'; src:url('${cairoBold ?? fontBase + '/Cairo-Bold.woff2'}') format('woff2'); font-weight:700; font-display:block; }`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontFaces}
    ${fallbackFonts}
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    body { width:${width}px; height:${height}px; overflow:hidden; background:#fff; font-family:${primaryFontFamily}; direction:rtl; -webkit-font-smoothing:antialiased; }
    .slide { position:relative; width:${width}px; height:${height}px; background:#fff; overflow:hidden; }
    .image-zone { position:absolute; top:calc(${height}px * ${imageRect.y}); left:calc(${width}px * ${imageRect.x}); width:calc(${width}px * ${imageRect.width}); height:calc(${height}px * ${imageRect.height}); background:#E0E0E0; overflow:hidden; z-index:1; display:flex; align-items:center; justify-content:center; color:#9E9E9E; font-size:20px; }
    .image-zone img { width:100%; height:100%; object-fit:${slide.image?.objectFit ?? 'cover'}; }
    .footer { position:absolute; bottom:0; left:0; right:0; height:calc(${height}px * ${footerHeight}); background:${footer.backgroundColor ?? '#fff'}; border-top:1px solid rgba(0,0,0,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 calc(${width}px * 0.04); direction:rtl; z-index:100; }
    .dots { display:flex; gap:6px; align-items:center; }
  </style>
</head>
<body>
  <div class="slide">
    <div class="image-zone">${hasImage ? `<img src="${escapeHtml(imageUrl)}" alt="" />` : ''}</div>
    ${logoHtml}
    ${blocksHtml}
    ${bannerHtml}
    <div class="footer">
      <div style="font-family:${primaryFontFamily};font-size:${resolvedTypo['label']?.fontSize ?? 18}px;color:${footer.textColor ?? '#888'};direction:ltr;display:flex;gap:6px;align-items:center;">
        ${socialHandles.map((h: any) => escapeHtml(h.handle ?? '')).filter(Boolean).map((handle: string) => `<span>${handle}</span>`).join(' ')}
      </div>
      <div class="dots">${dotsHtml}</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────

function renderRichContent(content: RichNode | string | undefined | null): string {
  if (!content) return '';
  if (typeof content === 'string') return escapeHtml(content);
  if (content.type !== 'doc') return escapeHtml(extractPlainText(content));
  return renderNodes(content.content ?? []);
}

function renderNodes(nodes: RichNode[]): string {
  return nodes.map(node => {
    if (node.type === 'text') {
      let html = escapeHtml(node.text ?? '');
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold': html = `<strong>${html}</strong>`; break;
            case 'italic': html = `<em>${html}</em>`; break;
            case 'strike': html = `<s>${html}</s>`; break;
            case 'underline': html = `<u>${html}</u>`; break;
            case 'highlight':
              html = `<mark style="background:${escapeHtml(mark.attrs?.color ?? '#FFEB3B')};padding:2px 4px;">${html}</mark>`;
              break;
            case 'textStyle':
              if (mark.attrs?.color) html = `<span style="color:${escapeHtml(mark.attrs.color)}">${html}</span>`;
              break;
          }
        }
      }
      return html;
    }
    if (node.type === 'paragraph') return `<p style="margin:0;margin-block-end:0.3em;">${renderNodes(node.content ?? [])}</p>`;
    if (node.type === 'bulletList') return `<ul style="margin:0;padding-inline-end:1.4em;padding-inline-start:0;list-style-type:disc;">${renderNodes(node.content ?? [])}</ul>`;
    if (node.type === 'orderedList') return `<ol style="margin:0;padding-inline-end:1.4em;padding-inline-start:0;">${renderNodes(node.content ?? [])}</ol>`;
    if (node.type === 'listItem') return `<li style="margin-block-end:0.3em;">${renderNodes(node.content ?? [])}</li>`;
    if (node.type === 'hardBreak') return '<br>';
    if (node.content) return renderNodes(node.content);
    return '';
  }).join('');
}

function extractPlainText(content: RichNode | undefined): string {
  if (!content) return '';
  if (content.type === 'text') return content.text ?? '';
  if (content.content) return content.content.map(extractPlainText).join('');
  return '';
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Simple kashida for export (mirrors kashidaEngine.ts) ────

const TATWEEL = '\u0640';
const DISCONNECTED = new Set(['\u0627','\u0623','\u0625','\u0622','\u0671','\u062F','\u0630','\u0631','\u0632','\u0648','\u0649']);
const FORBIDDEN = new Set(['على','إلى','الى','إلا','هذا','هذه','ذلك','عن','من','ما','لا','أن','إن','أو','في','كل','له','هو','هي']);

function applySimpleKashida(text: string): string {
  const clean = text.replace(new RegExp(TATWEEL, 'g'), '');
  return clean.split(/(\s+)/).map(word => {
    if (/^\s+$/.test(word) || word.length < 3 || FORBIDDEN.has(word.replace(/[\u064B-\u0652]/g, ''))) return word;
    let best = -1;
    for (let i = 1; i < word.length - 1; i++) {
      const ch = word[i];
      const code = ch.charCodeAt(0);
      if (code < 0x0600 || code > 0x06FF) continue;
      if (DISCONNECTED.has(ch) || ch === '\u0644' || word[i+1] === '\u0644') continue;
      if (word[i+1] === '\u064A' || word[i+1] === '\u0629') continue;
      best = i;
      break;
    }
    if (best === -1) return word;
    return word.slice(0, best + 1) + TATWEEL + word.slice(best + 1);
  }).join('');
}
