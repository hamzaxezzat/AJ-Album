'use client';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Album, Slide, MainTitleBlock, BodyParagraphBlock } from '@/types/album';
import { storeImage, loadImage } from '@/lib/imageStore';

/**
 * Migrate old album data to current schema.
 * Fixes albums created before the portrait canvas change (1350×1080 → 1080×1350)
 * and before typographyTokenRef was added to blocks.
 */
function migrateAlbum(album: Album): Album {
  // 1. Fix landscape canvas to portrait
  if (album.canvasDimensions.width === 1350 && album.canvasDimensions.height === 1080) {
    album.canvasDimensions = { width: 1080, height: 1350, presetName: 'editorial-portrait-4:5' };
  }

  for (const slide of album.slides) {
    // 2. Migrate blocks to reference layout positions
    for (const block of slide.blocks) {
      if (block.type === 'main_title') {
        const b = block as MainTitleBlock;
        if (!b.typographyTokenRef) b.typographyTokenRef = 'heading-l';
        // Always migrate to new text-zone positions (below the image)
        b.position = { x: 0.05, y: 0.56, width: 0.90, height: 0.12 };
      } else if (block.type === 'body_paragraph') {
        const b = block as BodyParagraphBlock;
        if (!b.typographyTokenRef) b.typographyTokenRef = 'body-m';
        if (b.kashidaEnabled === undefined) b.kashidaEnabled = true;
        b.position = { x: 0.05, y: 0.69, width: 0.90, height: 0.21 };
      }
    }

    // 3. Set image zone to top 54% if full-bleed (height ≥ 0.9) or missing
    if (!slide.image || (slide.image.rect.height >= 0.9)) {
      slide.image = {
        rect: { x: 0, y: 0, width: 1, height: 0.54 },
        objectFit: 'cover',
        focalPoint: slide.image?.focalPoint ?? { x: 0.5, y: 0.5 },
        asset: slide.image?.asset,
      };
    }

    // 4. Remove banner (reference design uses no banner)
    if (slide.banner) slide.banner.position = 'none';
  }

  return album;
}

interface DocumentState {
  album: Album | null;
  setAlbum: (album: Album) => void;
  updateSlide: (slideId: string, updater: (slide: Slide) => void) => void;
  addSlide: (slide: Slide, afterIndex?: number) => void;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => Slide | null;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  saveToLocalStorage: () => Promise<void>;
  loadFromLocalStorage: (albumId: string) => Promise<boolean>;
}

const LS_KEY = (id: string) => `aj-album-${id}`;

export const useDocumentStore = create<DocumentState>()(
  immer((set, get) => ({
    album: null,

    setAlbum: (album) => {
      set((state) => {
        state.album = album;
      });
      void get().saveToLocalStorage();
    },

    updateSlide: (slideId, updater) => {
      set((state) => {
        if (!state.album) return;
        const slide = state.album.slides.find((s) => s.id === slideId);
        if (slide) updater(slide);
      });
      void get().saveToLocalStorage();
    },

    addSlide: (slide, afterIndex) => {
      set((state) => {
        if (!state.album) return;
        const idx = afterIndex !== undefined ? afterIndex + 1 : state.album.slides.length;
        state.album.slides.splice(idx, 0, slide);
        // Renumber all slides
        state.album.slides.forEach((s, i) => { s.number = i + 1; });
      });
      void get().saveToLocalStorage();
    },

    deleteSlide: (slideId) => {
      set((state) => {
        if (!state.album) return;
        state.album.slides = state.album.slides.filter(s => s.id !== slideId);
        state.album.slides.forEach((s, i) => { s.number = i + 1; });
      });
      void get().saveToLocalStorage();
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
      void get().saveToLocalStorage();
      return newSlide;
    },

    reorderSlides: (fromIndex, toIndex) => {
      set((state) => {
        if (!state.album) return;
        const slides = state.album.slides;
        const [moved] = slides.splice(fromIndex, 1);
        slides.splice(toIndex, 0, moved);
      });
      void get().saveToLocalStorage();
    },

    saveToLocalStorage: async () => {
      const { album } = get();
      if (!album) return;
      if (typeof window === 'undefined') return;
      // Deep copy — never mutate the in-memory Zustand state
      const albumToSave = JSON.parse(JSON.stringify(album)) as Album;
      // Strip data URL images → store in IndexedDB, replace with idb:// refs
      for (const slide of albumToSave.slides) {
        const url = slide.image?.asset?.url;
        if (url?.startsWith('data:')) {
          const assetId = slide.image!.asset!.id;
          await storeImage(assetId, url);
          slide.image!.asset!.url = `idb://${assetId}`;
        }
      }
      try {
        localStorage.setItem(LS_KEY(album.id), JSON.stringify(albumToSave));
      } catch (e) {
        console.error('[documentStore] localStorage save failed:', e);
      }
    },

    loadFromLocalStorage: async (albumId) => {
      if (typeof window === 'undefined') return false;
      const raw = localStorage.getItem(LS_KEY(albumId));
      if (!raw) return false;
      try {
        const album = migrateAlbum(JSON.parse(raw) as Album);
        // Resolve idb:// refs → data URLs so rendering is synchronous
        // (backwards compat: old albums with data: URLs pass through untouched)
        for (const slide of album.slides) {
          const url = slide.image?.asset?.url;
          if (url?.startsWith('idb://')) {
            const assetId = url.slice(6);
            const dataUrl = await loadImage(assetId);
            if (dataUrl) slide.image!.asset!.url = dataUrl;
          }
        }
        set((state) => { state.album = album; });
        // Write back: migrates old data: URLs to idb:// refs on first load
        void get().saveToLocalStorage();
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
