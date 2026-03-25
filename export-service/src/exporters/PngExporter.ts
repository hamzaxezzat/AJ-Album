// export-service/src/exporters/PngExporter.ts
//
// MVP-0 implementation: renders a slide to a PNG buffer via Puppeteer.
//
// MVP-0 renders inline HTML that validates the three irreversible bets:
//   1. Arabic kashida works in headless Chromium
//   2. Self-hosted fonts load correctly in Puppeteer
//   3. Canvas dimensions and normalized coordinates produce correct layout
//
// MVP-1 will replace generateSlideHtml() with renderToStaticMarkup(<SlideRenderer>)
// so the browser and Puppeteer share exactly the same markup.

import puppeteer from 'puppeteer';
import type { Slide, Album, ExportContext, ExportArtifact, SlideExporter } from '../types/album-types.js';

export class PngExporter implements SlideExporter {
  readonly format = 'png' as const;

  async exportSlide(
    slide: Slide,
    album: Album,
    ctx: ExportContext,
  ): Promise<ExportArtifact> {
    const { canvasDimensions, scale = 2 } = ctx;
    const { width, height } = canvasDimensions;

    const html = generateSlideHtml(slide, album, ctx);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: scale });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Wait for fonts to load — critical for Arabic kashida
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
      await browser.close();
    }
  }

  async exportAlbum(_album: Album, _ctx: ExportContext): Promise<ExportArtifact> {
    // Full album ZIP export is implemented by ZipExporter in MVP-1
    throw new Error('Use ZipExporter for full album export');
  }
}

// ─── HTML generation ─────────────────────────────────────────

function generateSlideHtml(slide: Slide, album: Album, ctx: ExportContext): string {
  const { width, height } = ctx.canvasDimensions;
  const accentColor = album.theme.primaryColor;
  // Font base URL — in production this points to the Next.js app's /fonts/ directory
  const fontBase = process.env.FONT_BASE_URL ?? 'http://localhost:3000/fonts';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <style>
    /*
     * Self-hosted fonts — must be available in this container.
     * NEVER load from Google Fonts: fonts must work offline in Puppeteer.
     */
    @font-face {
      font-family: 'IBM Plex Arabic';
      src: url('${fontBase}/IBMPlexArabic-Regular.woff2') format('woff2');
      font-weight: 400;
      font-display: block;
    }
    @font-face {
      font-family: 'IBM Plex Arabic';
      src: url('${fontBase}/IBMPlexArabic-SemiBold.woff2') format('woff2');
      font-weight: 600;
      font-display: block;
    }
    @font-face {
      font-family: 'IBM Plex Arabic';
      src: url('${fontBase}/IBMPlexArabic-Bold.woff2') format('woff2');
      font-weight: 700;
      font-display: block;
    }
    @font-face {
      font-family: 'Cairo';
      src: url('${fontBase}/Cairo-Regular.woff2') format('woff2');
      font-weight: 400;
      font-display: block;
    }
    @font-face {
      font-family: 'Cairo';
      src: url('${fontBase}/Cairo-SemiBold.woff2') format('woff2');
      font-weight: 600;
      font-display: block;
    }
    @font-face {
      font-family: 'Cairo';
      src: url('${fontBase}/Cairo-Bold.woff2') format('woff2');
      font-weight: 700;
      font-display: block;
    }

    /*
     * Canvas dimensions as CSS custom properties — same pattern as the browser renderer.
     * All positions use calc(var(--canvas-width) * N) to stay dimension-agnostic.
     * This guarantees browser preview and Puppeteer export share identical layout logic.
     */
    :root {
      --canvas-width: ${width}px;
      --canvas-height: ${height}px;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      width: var(--canvas-width);
      height: var(--canvas-height);
      overflow: hidden;
      background: #ffffff;
      font-family: 'IBM Plex Arabic', Cairo, sans-serif;
      direction: rtl;
      -webkit-font-smoothing: antialiased;
    }

    .slide {
      position: relative;
      width: var(--canvas-width);
      height: var(--canvas-height);
      background: #ffffff;
      overflow: hidden;
    }

    /* Image zone: top 58% of canvas */
    .image-zone {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: calc(var(--canvas-height) * 0.58);
      background-color: #E0E0E0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9E9E9E;
      font-size: 18px;
      overflow: hidden;
      z-index: 1;
    }

    /* Title block */
    .title {
      position: absolute;
      right: calc(var(--canvas-width) * 0.04);
      top: calc(var(--canvas-height) * 0.60);
      width: calc(var(--canvas-width) * 0.92);
      height: calc(var(--canvas-height) * 0.12);
      font-family: 'Cairo', 'IBM Plex Arabic', sans-serif;
      font-size: 34px;
      font-weight: 700;
      line-height: 1.3;
      color: #1A1A1A;
      text-align: right;
      /*
       * text-wrap: balance improves headline composition for Arabic.
       * Chromium supports this — it is the architectural reason Puppeteer is required.
       */
      text-wrap: balance;
      z-index: 10;
      overflow: hidden;
    }

    /* Body paragraph */
    .body {
      position: absolute;
      right: calc(var(--canvas-width) * 0.04);
      top: calc(var(--canvas-height) * 0.73);
      width: calc(var(--canvas-width) * 0.92);
      height: calc(var(--canvas-height) * 0.17);
      font-family: 'IBM Plex Arabic', sans-serif;
      font-size: 18px;
      font-weight: 400;
      line-height: 1.7;
      color: #1A1A1A;
      text-align: justify;
      /*
       * THE CRITICAL KASHIDA TEST.
       * This property extends Arabic letter connections to fill justified lines.
       * It is only supported in real Chromium — never in html2canvas, SVG, or Canvas.
       * If this property renders correctly in the Puppeteer PNG, MVP-0 is validated.
       */
      text-justify: kashida;
      overflow: hidden;
      z-index: 10;
    }

    /* Banner strip */
    .banner {
      position: absolute;
      left: 0;
      right: 0;
      height: calc(var(--canvas-height) * 0.10);
      background-color: ${accentColor};
      bottom: calc(var(--canvas-height) * 0.078);
      display: flex;
      align-items: center;
      padding: 0 calc(var(--canvas-width) * 0.04);
      z-index: 20;
    }

    /* Footer chrome */
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(var(--canvas-height) * 0.074);
      background: #ffffff;
      border-top: 1px solid rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 calc(var(--canvas-width) * 0.03);
      direction: rtl;
      z-index: 100;
    }

    .logo-placeholder {
      background: ${accentColor};
      color: white;
      font-family: 'IBM Plex Arabic', sans-serif;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 2px;
    }

    .slide-number {
      font-family: 'IBM Plex Arabic', sans-serif;
      font-size: 12px;
      color: #999999;
      direction: ltr;
    }
  </style>
</head>
<body>
  <div class="slide">
    <div class="image-zone">صورة</div>
    <div class="title">${escapeHtml(getSlideTitle(slide))}</div>
    <div class="body">${escapeHtml(getSlideBody(slide))}</div>
    <div class="banner"></div>
    <div class="footer">
      <div class="logo-placeholder">الجزيرة</div>
      <div class="slide-number">${slide.number}</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────

function getSlideTitle(slide: Slide): string {
  const titleBlock = slide.blocks.find(b => b.type === 'main_title');
  if (!titleBlock || titleBlock.type !== 'main_title') {
    return 'عنوان الشريحة';
  }
  return extractPlainText(titleBlock.content as { type: string; content?: unknown[] });
}

function getSlideBody(slide: Slide): string {
  const bodyBlock = slide.blocks.find(b => b.type === 'body_paragraph');
  if (!bodyBlock || bodyBlock.type !== 'body_paragraph') {
    return 'نص الشريحة الذي يحتوي على معلومات تفصيلية حول الموضوع المطروح للنقاش.';
  }
  return extractPlainText(bodyBlock.content as { type: string; content?: unknown[] });
}

type TextNode = { type: string; text?: string; content?: TextNode[] };

function extractPlainText(content: { type: string; content?: unknown[] } | undefined): string {
  if (!content || content.type !== 'doc') return '';
  return extractFromNodes((content.content ?? []) as TextNode[]);
}

function extractFromNodes(nodes: TextNode[]): string {
  return nodes
    .map(node => {
      if (node.type === 'text') return node.text ?? '';
      if (node.content) return extractFromNodes(node.content);
      return '';
    })
    .join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
