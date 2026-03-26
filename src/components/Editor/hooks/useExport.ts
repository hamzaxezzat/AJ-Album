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
 */
export function useExport({ album, selectedSlide, channelProfile }: UseExportOptions) {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    exportProgress: null,
    exportError: null,
  });

  const guardrailEngine = new GuardrailEngine();
  const zipExporter = new ZipExporter();

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
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setState(s => ({ ...s, exportError: 'تأكد من تشغيل خدمة التصدير على المنفذ 3001' }));
    } finally {
      setState(s => ({ ...s, isExporting: false }));
    }
  }, [selectedSlide, album, channelProfile]);

  /** Export the entire album as a ZIP of PNGs */
  const handleExportAlbum = useCallback(async () => {
    if (!album) return;

    // Run guardrails first
    const result = guardrailEngine.evaluateAlbum(album, channelProfile);
    if (result.hasHardStops) {
      setState(s => ({
        ...s,
        exportError: `لا يمكن التصدير — ${result.issues.filter(i => i.severity === 'hard_stop').length} مشكلة حرجة يجب حلها أولاً`,
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
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setState(s => ({ ...s, exportError: 'فشل التصدير — تأكد من تشغيل خدمة التصدير' }));
    } finally {
      setState(s => ({ ...s, isExporting: false, exportProgress: null }));
    }
  }, [album, channelProfile]);

  return {
    ...state,
    handleExportSlide,
    handleExportAlbum,
  };
}
