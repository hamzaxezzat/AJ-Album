// src/lib/export/types.ts
// SlideExporter interface for client-side usage

import type { Album, Slide, ChannelProfile } from '@/types/album';

export interface ExportOptions {
  /** Scale factor for retina (default 2) */
  scale?: number;
  /** Export service URL (default http://localhost:3001) */
  serviceUrl?: string;
}

export interface ExportProgress {
  current: number;
  total: number;
  slideNumber: number;
}

/**
 * Result from exporting a single slide.
 */
export interface SlideExportResult {
  slideId: string;
  slideNumber: number;
  blob: Blob;
  filename: string;
}

/**
 * Client-side exporter interface.
 * Unlike the server-side SlideExporter in album.ts,
 * this operates via fetch to the export service.
 */
export interface ClientExporter {
  /** Export a single slide to PNG */
  exportSlide(
    slide: Slide,
    album: Album,
    channelProfile: ChannelProfile,
    options?: ExportOptions,
  ): Promise<SlideExportResult>;

  /** Export all slides and bundle into a ZIP */
  exportAlbumAsZip(
    album: Album,
    channelProfile: ChannelProfile,
    options?: ExportOptions,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<Blob>;
}
