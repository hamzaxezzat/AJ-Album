'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Album, Slide } from '@/types/album';

interface DocumentState {
  album: Album | null;
  setAlbum: (album: Album) => void;
  updateSlide: (slideId: string, updater: (slide: Slide) => void) => void;
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
