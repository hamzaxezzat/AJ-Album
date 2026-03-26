// src/app/api/export/route.ts
// Next.js API route that proxies export requests to the Puppeteer export service.
// This eliminates CORS issues and removes hardcoded localhost URLs from the client.

import { NextRequest, NextResponse } from 'next/server';

const EXPORT_SERVICE_URL = process.env.EXPORT_SERVICE_URL ?? 'http://localhost:3001';

/**
 * POST /api/export — Proxy to the export service.
 * Expects JSON body with: { slide, album, channelProfile, scale? }
 * Returns the PNG image as binary.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { slide, album, channelProfile, scale } = body;

  if (!slide || !album || !channelProfile) {
    return NextResponse.json(
      { error: 'Missing required fields: slide, album, channelProfile' },
      { status: 400 },
    );
  }

  // Check if the export service is reachable
  try {
    const healthRes = await fetch(`${EXPORT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!healthRes.ok) {
      throw new Error('Health check failed');
    }
  } catch {
    return NextResponse.json(
      {
        error: 'خدمة التصدير غير متاحة',
        details: `Export service at ${EXPORT_SERVICE_URL} is not running. Start it with: pnpm --filter export-service dev`,
      },
      { status: 503 },
    );
  }

  // Proxy the export request
  try {
    const exportRes = await fetch(`${EXPORT_SERVICE_URL}/export/slide/png`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slide, album, channelProfile, scale: scale ?? 2 }),
    });

    if (!exportRes.ok) {
      const errorText = await exportRes.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: 'Export service error', details: errorText },
        { status: exportRes.status },
      );
    }

    const pngBuffer = await exportRes.arrayBuffer();
    const filename = `slide-${String((slide as { number?: number }).number ?? 1).padStart(2, '0')}.png`;

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pngBuffer.byteLength),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Export request failed',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/export — Health check for the export service proxy.
 */
export async function GET() {
  try {
    const res = await fetch(`${EXPORT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ proxy: 'ok', service: data });
    }
    return NextResponse.json(
      { proxy: 'ok', service: 'unhealthy' },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      {
        proxy: 'ok',
        service: 'unavailable',
        instructions: 'Start the export service: pnpm --filter export-service dev',
      },
      { status: 503 },
    );
  }
}
