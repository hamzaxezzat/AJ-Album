'use client';
import { useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import { useHistoryStore } from '@/store/historyStore';
import { makeBlankSlide } from '../lib/slideFactory';

/**
 * Hook encapsulating slide add/delete/duplicate/reorder operations.
 * Extracted from EditorClient for SOLID single-responsibility.
 */
export function useSlideManagement() {
  const album = useDocumentStore((s) => s.album);
  const addSlide = useDocumentStore((s) => s.addSlide);
  const deleteSlide = useDocumentStore((s) => s.deleteSlide);
  const duplicateSlide = useDocumentStore((s) => s.duplicateSlide);
  const selectedSlideId = useEditorUIStore((s) => s.selectedSlideId);
  const setSelectedSlide = useEditorUIStore((s) => s.setSelectedSlide);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

  const handleAddSlide = useCallback(() => {
    if (!album) return;
    if (album) pushSnapshot(album);
    const idx = album.slides.findIndex(s => s.id === selectedSlideId);
    const after = idx >= 0 ? idx : album.slides.length - 1;
    const ns = makeBlankSlide(after + 2);
    addSlide(ns, after);
    setSelectedSlide(ns.id);
  }, [album, selectedSlideId, addSlide, setSelectedSlide, pushSnapshot]);

  const handleDeleteSlide = useCallback((slideId: string) => {
    if (!album || album.slides.length <= 1) return;
    pushSnapshot(album);
    const idx = album.slides.findIndex(s => s.id === slideId);
    deleteSlide(slideId);
    const remaining = album.slides.filter(s => s.id !== slideId);
    if (remaining.length > 0) setSelectedSlide(remaining[Math.min(idx, remaining.length - 1)].id);
  }, [album, deleteSlide, setSelectedSlide, pushSnapshot]);

  const handleDuplicateSlide = useCallback((slideId: string) => {
    if (!album) return;
    pushSnapshot(album);
    const ns = duplicateSlide(slideId);
    if (ns) setSelectedSlide(ns.id);
  }, [album, duplicateSlide, setSelectedSlide, pushSnapshot]);

  return {
    handleAddSlide,
    handleDeleteSlide,
    handleDuplicateSlide,
  };
}
