'use client';
import { useCallback, useState } from 'react';
import type { Album, Slide, ChannelProfile } from '@/types/album';
import { GuardrailEngine } from '@/lib/guardrails';
import { ZipExporter } from '@/lib/export';
import type { ExportProgress } from '@/lib/export';

interface UseExportOptions {
  album: Album | null;
  selectedSlide: Slide | null;
  channelProfile: ChannelProfile;
}

export interface ExportState {
  isExporting: boolean;
  exportProgress: ExportProgress | null;
  exportError: string | null;
}

/**
 * Hook encapsulating export logic (single PNG + ZIP album).
 * Extracted from EditorClient for SOLID single-responsibility.
 *
 * Uses /api/export (Next.js API proxy) which forwards to the
 * Puppeteer export service. This eliminates CORS issues and
 * removes hardcoded localhost URLs.
 */
export function useExport({ album, selectedSlide, channelProfile }: UseExportOptions) {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    exportProgress: null,
    exportError: null,
  });

  const guardrailEngine = new GuardrailEngine();
  const zipExporter = new ZipExporter();

  /** Clear the export error message */
  const clearExportError = useCallback(() => {
    setState(s => ({ ...s, exportError: null }));
  }, []);

  /** Export the currently selected slide as PNG */
  const handleExportSlide = useCallback(async () => {
    if (!selectedSlide || !album) return;

    setState(s => ({ ...s, isExporting: true, exportError: null }));

    try {
      const result = await zipExporter.exportSlide(selectedSlide, album, channelProfile);
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Check if the error is about the export service being unavailable
      if (message.includes('غير متاحة') || message.includes('503') || message.includes('Failed to fetch')) {
        setState(s => ({
          ...s,
          exportError: 'خدمة التصدير غير متاحة — شغّل الخدمة: pnpm --filter export-service dev',
        }));
      } else {
        setState(s => ({
          ...s,
          exportError: `فشل التصدير: ${message}`,
        }));
      }
    } finally {
      setState(s => ({ ...s, isExporting: false }));
    }
  }, [selectedSlide, album, channelProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Export the entire album as a ZIP of PNGs */
  const handleExportAlbum = useCallback(async () => {
    if (!album) return;

    // Run guardrails first
    const result = guardrailEngine.evaluateAlbum(album, channelProfile);
    if (result.hasHardStops) {
      const hardStopCount = result.issues.filter(i => i.severity === 'hard_stop').length;
      setState(s => ({
        ...s,
        exportError: `لا يمكن التصدير — ${hardStopCount} مشكلة حرجة يجب حلها أولاً`,
      }));
      return;
    }

    setState(s => ({ ...s, isExporting: true, exportError: null, exportProgress: null }));

    try {
      const zipBlob = await zipExporter.exportAlbumAsZip(
        album,
        channelProfile,
        undefined,
        (progress) => {
          setState(s => ({ ...s, exportProgress: progress }));
        },
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${album.title}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('غير متاحة') || message.includes('503') || message.includes('Failed to fetch')) {
        setState(s => ({
          ...s,
          exportError: 'خدمة التصدير غير متاحة — شغّل الخدمة: pnpm --filter export-service dev',
        }));
      } else {
        setState(s => ({
          ...s,
          exportError: `فشل التصدير: ${message}`,
        }));
      }
    } finally {
      setState(s => ({ ...s, isExporting: false, exportProgress: null }));
    }
  }, [album, channelProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    handleExportSlide,
    handleExportAlbum,
    clearExportError,
  };
}
