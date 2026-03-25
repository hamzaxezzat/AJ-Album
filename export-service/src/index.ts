// export-service/src/index.ts
//
// Express server for slide-to-PNG export.
// Called by Next.js API routes — never directly from the browser.
// Runs as a separate Docker container with puppeteer + Chromium pre-installed.

import express from 'express';
import type { Request, Response } from 'express';
import { PngExporter } from './exporters/PngExporter.js';
import type { Album, ChannelProfile, Slide } from './types/album-types.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT ?? 3001;

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

  try {
    const exporter = new PngExporter();
    const artifact = await exporter.exportSlide(slide, album, {
      canvasDimensions: album.canvasDimensions,
      channelProfile,
      scale,
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
    error: 'Not implemented in MVP-0',
    message: 'ZipExporter will be added in MVP-1',
  });
});

// ─── Start ───────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[export-service] Listening on port ${PORT}`);
  console.log(`[export-service] Health: http://localhost:${PORT}/health`);
});

export default app;
