// export-service/src/index.ts
//
// Express server for slide-to-PNG export.
// Called by Next.js API routes (proxied) or directly during development.
// Runs as a separate Docker container with puppeteer + Chromium pre-installed.

import express from 'express';
import type { Request, Response } from 'express';
import { PngExporter } from './exporters/PngExporter.js';
import type { Album, ChannelProfile, Slide } from './types/album-types.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

// ─── CORS middleware ─────────────────────────────────────────
// Allow requests from the Next.js dev server and any local origin.
// In production the API proxy handles this, but during development
// the browser may call the export service directly.
app.use((_req: Request, res: Response, next) => {
  const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const PORT = process.env.PORT ?? 3001;

// Reuse a single PngExporter instance across requests.
// This avoids launching a new Puppeteer browser per request.
let exporterInstance: PngExporter | null = null;

function getExporter(): PngExporter {
  if (!exporterInstance) {
    exporterInstance = new PngExporter();
  }
  return exporterInstance;
}

// ─── Health check ────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'aj-album-export', version: '0.1.0' });
});

// ─── Single slide PNG export ─────────────────────────────────

app.post('/export/slide/png', async (req: Request, res: Response) => {
  const body = req.body as {
    slide: Slide;
    album: Album;
    channelProfile: ChannelProfile;
    scale?: number;
  };

  const { slide, album, channelProfile, scale = 2 } = body;

  if (!slide || !album || !channelProfile) {
    res.status(400).json({ error: 'Missing required fields: slide, album, channelProfile' });
    return;
  }

  console.log('[export] channelProfile.fontFiles:', JSON.stringify((channelProfile as any)?.fontFiles?.length ?? 'MISSING'));
  console.log('[export] channelProfile.primaryFontFamily:', (channelProfile as any)?.primaryFontFamily ?? 'MISSING');

  try {
    const exporter = getExporter();
    const artifact = await exporter.exportSlide(slide, album, {
      canvasDimensions: album.canvasDimensions,
      channelProfile,
      scale,
      totalSlides: album.slides?.length ?? 1,
    });

    res.set('Content-Type', 'image/png');
    res.set(
      'Content-Disposition',
      `attachment; filename="${artifact.filename}"`,
    );
    res.send(artifact.buffer);
  } catch (err) {
    console.error('[export/slide/png] Error:', err);
    res.status(500).json({
      error: 'Export failed',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// ─── Full album ZIP export (stub — ZipExporter in MVP-1) ─────

app.post('/export/album/zip', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not implemented server-side',
    message: 'ZIP bundling is handled client-side by ZipExporter. Use /export/slide/png per slide.',
  });
});

// ─── Graceful shutdown ──────────────────────────────────────

async function shutdown() {
  console.log('[export-service] Shutting down...');
  if (exporterInstance) {
    await exporterInstance.close();
    exporterInstance = null;
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Start ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[export-service] Listening on port ${PORT}`);
  console.log(`[export-service] Health: http://localhost:${PORT}/health`);
  console.log(`[export-service] Export: POST http://localhost:${PORT}/export/slide/png`);
});

export default app;
