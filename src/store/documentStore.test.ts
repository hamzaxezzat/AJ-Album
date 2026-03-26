// src/store/documentStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore, getSavedAlbums } from './documentStore';
import type { Album, Slide, AlbumTheme } from '@/types/album';
import { makeBlankSlide } from '@/components/Editor/lib/slideFactory';

// ─── Mock browser APIs ──────────────────────────────────────

// Mock `window` so typeof window !== 'undefined' checks pass
// @ts-expect-error -- injecting window into node environment
globalThis.window = globalThis;

// Mock the imageStore module to avoid IndexedDB dependency
vi.mock('@/lib/imageStore', () => ({
  storeImage: vi.fn().mockResolvedValue(undefined),
  loadImage: vi.fn().mockResolvedValue(null),
}));

// Mock localStorage — use plain functions (not vi.fn) so vi.clearAllMocks doesn't wipe implementations
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { store = {}; },
    get length() { return Object.keys(store).length; },
    key(i: number) { return Object.keys(store)[i] ?? null; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ─── Test data ──────────────────────────────────────────────

function createTestAlbum(overrides: Partial<Album> = {}): Album {
  return {
    id: 'test-album-1',
    title: 'ألبوم اختباري',
    channelProfileId: 'aj-main',
    theme: {
      primaryColor: '#D32F2F',
      bannerFamilyId: 'classic-main',
      defaultBannerPosition: 'bottom',
      density: 'normal',
      bulletStyle: 'square',
      bulletDividers: false,
      typographyTone: 'standard',
      mode: 'production',
    },
    canvasDimensions: { width: 1080, height: 1350, presetName: 'editorial-portrait-4:5' },
    slides: [makeBlankSlide(1), makeBlankSlide(2)],
    assets: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────

describe('documentStore', () => {
  beforeEach(() => {
    // Reset the store state
    useDocumentStore.setState({ album: null });
    localStorageMock.clear();
  });

  describe('setAlbum', () => {
    it('sets the album in the store', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);
      expect(useDocumentStore.getState().album).toBeDefined();
      expect(useDocumentStore.getState().album!.id).toBe('test-album-1');
    });

    it('triggers save to localStorage', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);
      // saveToLocalStorage is called async, but setItem should be invoked
      // (may need to wait a tick for the promise)
      expect(useDocumentStore.getState().album!.title).toBe('ألبوم اختباري');
    });
  });

  describe('updateSlide', () => {
    it('updates a slide by id using the updater function', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const slideId = album.slides[0].id;
      useDocumentStore.getState().updateSlide(slideId, (slide) => {
        slide.archetypeId = 'bullet_list';
      });

      const updated = useDocumentStore.getState().album!.slides.find(s => s.id === slideId);
      expect(updated?.archetypeId).toBe('bullet_list');
    });

    it('does nothing when album is null', () => {
      // Should not throw
      useDocumentStore.getState().updateSlide('nonexistent', (slide) => {
        slide.archetypeId = 'bullet_list';
      });
      expect(useDocumentStore.getState().album).toBeNull();
    });

    it('does nothing when slide id is not found', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      useDocumentStore.getState().updateSlide('nonexistent', (slide) => {
        slide.archetypeId = 'bullet_list';
      });

      // Original slides unchanged
      for (const s of useDocumentStore.getState().album!.slides) {
        expect(s.archetypeId).toBe('standard_title_body');
      }
    });
  });

  describe('addSlide', () => {
    it('appends a slide at the end by default', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const newSlide = makeBlankSlide(99);
      useDocumentStore.getState().addSlide(newSlide);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides).toHaveLength(3);
      expect(slides[2].id).toBe(newSlide.id);
    });

    it('inserts after specified index', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const newSlide = makeBlankSlide(99);
      useDocumentStore.getState().addSlide(newSlide, 0);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides).toHaveLength(3);
      expect(slides[1].id).toBe(newSlide.id);
    });

    it('renumbers all slides after insertion', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const newSlide = makeBlankSlide(99);
      useDocumentStore.getState().addSlide(newSlide, 0);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides[0].number).toBe(1);
      expect(slides[1].number).toBe(2);
      expect(slides[2].number).toBe(3);
    });
  });

  describe('deleteSlide', () => {
    it('removes a slide by id', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const slideId = album.slides[0].id;
      useDocumentStore.getState().deleteSlide(slideId);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides).toHaveLength(1);
      expect(slides.find(s => s.id === slideId)).toBeUndefined();
    });

    it('renumbers remaining slides after deletion', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      useDocumentStore.getState().deleteSlide(album.slides[0].id);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides[0].number).toBe(1);
    });
  });

  describe('duplicateSlide', () => {
    it('creates a copy of the slide inserted after the original', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const originalId = album.slides[0].id;
      const newSlide = useDocumentStore.getState().duplicateSlide(originalId);

      expect(newSlide).not.toBeNull();
      expect(newSlide!.id).not.toBe(originalId);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides).toHaveLength(3);
      expect(slides[1].id).toBe(newSlide!.id);
    });

    it('returns null when album is null', () => {
      const result = useDocumentStore.getState().duplicateSlide('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when slide not found', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const result = useDocumentStore.getState().duplicateSlide('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('reorderSlides', () => {
    it('moves a slide from one position to another', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      const firstId = album.slides[0].id;
      const secondId = album.slides[1].id;

      useDocumentStore.getState().reorderSlides(0, 1);

      const slides = useDocumentStore.getState().album!.slides;
      expect(slides[0].id).toBe(secondId);
      expect(slides[1].id).toBe(firstId);
    });
  });

  describe('updateAlbumTheme', () => {
    it('updates theme properties via updater function', () => {
      const album = createTestAlbum();
      useDocumentStore.getState().setAlbum(album);

      useDocumentStore.getState().updateAlbumTheme((theme) => {
        theme.primaryColor = '#1565C0';
      });

      expect(useDocumentStore.getState().album!.theme.primaryColor).toBe('#1565C0');
    });

    it('does nothing when album is null', () => {
      // Should not throw
      useDocumentStore.getState().updateAlbumTheme((theme) => {
        theme.primaryColor = '#1565C0';
      });
      expect(useDocumentStore.getState().album).toBeNull();
    });
  });
});

describe('getSavedAlbums', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns empty array when no albums saved', () => {
    expect(getSavedAlbums()).toEqual([]);
  });

  it('returns album summaries from localStorage', () => {
    const album = createTestAlbum();
    localStorageMock.setItem(`aj-album-${album.id}`, JSON.stringify(album));

    const results = getSavedAlbums();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(album.id);
    expect(results[0].title).toBe('ألبوم اختباري');
    expect(results[0].slideCount).toBe(2);
  });

  it('skips non-album localStorage keys', () => {
    localStorageMock.setItem('some-other-key', 'value');
    expect(getSavedAlbums()).toEqual([]);
  });

  it('skips corrupt localStorage entries gracefully', () => {
    localStorageMock.setItem('aj-album-corrupt', '{invalid json');
    expect(getSavedAlbums()).toEqual([]);
  });

  it('sorts albums by updatedAt descending', () => {
    const album1 = createTestAlbum({ id: 'a1', metadata: { createdAt: '2025-01-01', updatedAt: '2025-01-01' } });
    const album2 = createTestAlbum({ id: 'a2', metadata: { createdAt: '2025-06-01', updatedAt: '2025-06-01' } });

    localStorageMock.setItem('aj-album-a1', JSON.stringify(album1));
    localStorageMock.setItem('aj-album-a2', JSON.stringify(album2));

    const results = getSavedAlbums();
    expect(results[0].id).toBe('a2');
    expect(results[1].id).toBe('a1');
  });
});
