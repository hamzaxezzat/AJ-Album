'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Album, Slide } from '@/types/album';

interface DocumentState {
  album: Album | null;
  setAlbum: (album: Album) => void;
  updateSlide: (slideId: string, updater: (slide: Slide) => void) => void;
  addSlide: (slide: Slide, afterIndex?: number) => void;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => Slide | null;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: (albumId: string) => boolean;
}

const LS_KEY = (id: string) => `aj-album-${id}`;

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    album: null,

    setAlbum: (album) => {
      set((state) => {
        state.album = album;
      });
      localStorage.setItem(LS_KEY(album.id), JSON.stringify(album));
    },

    updateSlide: (slideId, updater) => {
      set((state) => {
        if (!state.album) return;
        const slide = state.album.slides.find((s) => s.id === slideId);
        if (slide) updater(slide);
      });
      get().saveToLocalStorage();
    },

    addSlide: (slide, afterIndex) => {
      set((state) => {
        if (!state.album) return;
        const idx = afterIndex !== undefined ? afterIndex + 1 : state.album.slides.length;
        state.album.slides.splice(idx, 0, slide);
        // Renumber all slides
        state.album.slides.forEach((s, i) => { s.number = i + 1; });
      });
      get().saveToLocalStorage();
    },

    deleteSlide: (slideId) => {
      set((state) => {
        if (!state.album) return;
        state.album.slides = state.album.slides.filter(s => s.id !== slideId);
        state.album.slides.forEach((s, i) => { s.number = i + 1; });
      });
      get().saveToLocalStorage();
    },

    duplicateSlide: (slideId) => {
      let newSlide: Slide | null = null;
      set((state) => {
        if (!state.album) return;
        const idx = state.album.slides.findIndex(s => s.id === slideId);
        if (idx === -1) return;
        const src = state.album.slides[idx];
        // Deep clone via JSON round-trip, assign new id
        const clone = JSON.parse(JSON.stringify(src)) as Slide;
        clone.id = Math.random().toString(36).slice(2);
        clone.metadata.createdAt = new Date().toISOString();
        clone.metadata.updatedAt = new Date().toISOString();
        state.album.slides.splice(idx + 1, 0, clone);
        state.album.slides.forEach((s, i) => { s.number = i + 1; });
        newSlide = clone;
      });
      get().saveToLocalStorage();
      return newSlide;
    },

    reorderSlides: (fromIndex, toIndex) => {
      set((state) => {
        if (!state.album) return;
        const slides = state.album.slides;
        const [moved] = slides.splice(fromIndex, 1);
        slides.splice(toIndex, 0, moved);
      });
      get().saveToLocalStorage();
    },

    saveToLocalStorage: () => {
      const { album } = get();
      if (!album) return;
      localStorage.setItem(LS_KEY(album.id), JSON.stringify(album));
    },

    loadFromLocalStorage: (albumId) => {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem(LS_KEY(albumId));
      if (!raw) return false;
      try {
        const album = JSON.parse(raw) as Album;
        set((state) => {
          state.album = album;
        });
        return true;
      } catch {
        return false;
      }
    },
  })),
);

/** Get all saved album summaries from localStorage */
export function getSavedAlbums(): {
  id: string;
  title: string;
  updatedAt: string;
  slideCount: number;
}[] {
  if (typeof window === 'undefined') return [];
  const results: {
    id: string;
    title: string;
    updatedAt: string;
    slideCount: number;
  }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('aj-album-')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const album = JSON.parse(raw) as Album;
      results.push({
        id: album.id,
        title: album.title,
        updatedAt: album.metadata.updatedAt,
        slideCount: album.slides.length,
      });
    } catch {
      // skip corrupt entries
    }
  }
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
