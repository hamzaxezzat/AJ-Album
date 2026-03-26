// src/lib/export/ZipExporter.ts
// Client-side ZIP exporter that bundles PNGs from the export service.
// Uses JSZip for bundling. Falls back to sequential download if JSZip is not available.

import type { Album, Slide, ChannelProfile } from '@/types/album';
import type { ClientExporter, ExportOptions, ExportProgress, SlideExportResult } from './types';

const DEFAULT_SERVICE_URL = 'http://localhost:3001';

/**
 * ZipExporter calls the Puppeteer export service for each slide,
 * then bundles all PNGs into a ZIP file for download.
 */
export class ZipExporter implements ClientExporter {
  async exportSlide(
    slide: Slide,
    album: Album,
    channelProfile: ChannelProfile,
    options?: ExportOptions,
  ): Promise<SlideExportResult> {
    const serviceUrl = options?.serviceUrl ?? DEFAULT_SERVICE_URL;

    const res = await fetch(`${serviceUrl}/export/slide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slide, album, channelProfile }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Export failed for slide ${slide.number}: ${res.status} ${text}`);
    }

    const blob = await res.blob();
    const paddedNum = String(slide.number).padStart(2, '0');
    const filename = `${album.title}-${paddedNum}.png`;

    return {
      slideId: slide.id,
      slideNumber: slide.number,
      blob,
      filename,
    };
  }

  async exportAlbumAsZip(
    album: Album,
    channelProfile: ChannelProfile,
    options?: ExportOptions,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<Blob> {
    const slides = album.slides;
    const total = slides.length;
    const results: SlideExportResult[] = [];

    // Export slides sequentially to avoid overwhelming the service
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];

      if (onProgress) {
        onProgress({ current: i, total, slideNumber: slide.number });
      }

      const result = await this.exportSlide(slide, album, channelProfile, options);
      results.push(result);
    }

    if (onProgress) {
      onProgress({ current: total, total, slideNumber: slides[slides.length - 1].number });
    }

    // Bundle into ZIP
    return this.createZip(results, album.title);
  }

  /**
   * Create a ZIP file from export results.
   * Uses the JSZip library if available, otherwise falls back
   * to a minimal ZIP implementation.
   */
  private async createZip(results: SlideExportResult[], albumTitle: string): Promise<Blob> {
    // Try to use JSZip dynamically
    try {
      // @ts-expect-error -- jszip is an optional dependency, not always installed
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const result of results) {
        zip.file(result.filename, result.blob);
      }

      return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    } catch {
      // JSZip not installed — use minimal uncompressed ZIP
      return this.createMinimalZip(results);
    }
  }

  /**
   * Minimal ZIP file creation without external dependencies.
   * Creates valid uncompressed ZIP files.
   */
  private async createMinimalZip(results: SlideExportResult[]): Promise<Blob> {
    const files: { name: string; data: Uint8Array }[] = [];

    for (const result of results) {
      const buffer = await result.blob.arrayBuffer();
      files.push({
        name: result.filename,
        data: new Uint8Array(buffer),
      });
    }

    // Build ZIP structure
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = new TextEncoder().encode(file.name);
      const crc = crc32(file.data);

      // Local file header
      const header = new Uint8Array(30 + nameBytes.length);
      const hv = new DataView(header.buffer);
      hv.setUint32(0, 0x04034b50, true);  // signature
      hv.setUint16(4, 20, true);           // version needed
      hv.setUint16(6, 0, true);            // flags
      hv.setUint16(8, 0, true);            // compression (store)
      hv.setUint16(10, 0, true);           // mod time
      hv.setUint16(12, 0, true);           // mod date
      hv.setUint32(14, crc, true);         // crc32
      hv.setUint32(18, file.data.length, true); // compressed size
      hv.setUint32(22, file.data.length, true); // uncompressed size
      hv.setUint16(26, nameBytes.length, true); // filename length
      hv.setUint16(28, 0, true);           // extra field length
      header.set(nameBytes, 30);

      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdEntry.buffer);
      cv.setUint32(0, 0x02014b50, true);   // signature
      cv.setUint16(4, 20, true);            // version made by
      cv.setUint16(6, 20, true);            // version needed
      cv.setUint16(8, 0, true);             // flags
      cv.setUint16(10, 0, true);            // compression
      cv.setUint16(12, 0, true);            // mod time
      cv.setUint16(14, 0, true);            // mod date
      cv.setUint32(16, crc, true);          // crc32
      cv.setUint32(20, file.data.length, true); // compressed
      cv.setUint32(24, file.data.length, true); // uncompressed
      cv.setUint16(28, nameBytes.length, true); // filename len
      cv.setUint16(30, 0, true);            // extra len
      cv.setUint16(32, 0, true);            // comment len
      cv.setUint16(34, 0, true);            // disk number
      cv.setUint16(36, 0, true);            // internal attrs
      cv.setUint32(38, 0, true);            // external attrs
      cv.setUint32(42, offset, true);       // local header offset
      cdEntry.set(nameBytes, 46);

      parts.push(header, file.data);
      centralDir.push(cdEntry);
      offset += header.length + file.data.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDir) {
      parts.push(cd);
      cdSize += cd.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);      // signature
    ev.setUint16(4, 0, true);               // disk number
    ev.setUint16(6, 0, true);               // cd start disk
    ev.setUint16(8, files.length, true);     // entries on disk
    ev.setUint16(10, files.length, true);    // total entries
    ev.setUint32(12, cdSize, true);          // cd size
    ev.setUint32(16, cdOffset, true);        // cd offset
    ev.setUint16(20, 0, true);              // comment length
    parts.push(eocd);

    return new Blob(parts as BlobPart[], { type: 'application/zip' });
  }
}

/**
 * CRC-32 implementation for ZIP file creation.
 */
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
