'use client';
import { useCallback } from 'react';
import type {
  RichTextContent,
  BlockStyleOverride,
  NormalizedRect,
  BannerPosition,
  MainTitleBlock,
  BodyParagraphBlock,
  Slide,
} from '@/types/album';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';

type LogoVariant = 'auto' | 'dark' | 'white';

/**
 * Hook encapsulating all block/slide content update handlers.
 * Extracted from EditorClient for SOLID single-responsibility.
 */
export function useBlockUpdates(selectedSlide: Slide | null) {
  const updateSlide = useDocumentStore((s) => s.updateSlide);
  const album = useDocumentStore((s) => s.album);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);

  /** Push a history snapshot before any mutation */
  const withHistory = useCallback((fn: () => void) => {
    if (album) pushSnapshot(album);
    fn();
  }, [album, pushSnapshot]);

  const handleUpdateTitle = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        const b = slide.blocks.find(b => b.type === 'main_title');
        if (b) (b as MainTitleBlock).content = content;
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  const handleUpdateBody = useCallback((content: RichTextContent) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        const b = slide.blocks.find(b => b.type === 'body_paragraph');
        if (b) (b as BodyParagraphBlock).content = content;
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  const handleUpdateBlockStyle = useCallback((
    blockType: 'main_title' | 'body_paragraph',
    overrides: Partial<BlockStyleOverride>,
  ) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        const b = slide.blocks.find(b => b.type === blockType);
        if (b) b.styleOverrides = { ...b.styleOverrides, ...overrides };
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  const handleUpdateBanner = useCallback((pos: BannerPosition) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        if (slide.banner) slide.banner.position = pos;
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  const handleUpdateBannerHeight = useCallback((height: number) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (slide.banner) slide.banner.heightNormalized = height;
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateSource = useCallback((text: string) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      if (!slide.source) {
        slide.source = { text, visible: true, sizeMode: 'auto', paginationBehavior: 'share-space' };
      } else {
        slide.source.text = text;
      }
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateLogoVariant = useCallback((variant: LogoVariant) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => { slide.logoVariant = variant; });
  }, [selectedSlide, updateSlide]);

  const handleUpdateSlideOverrides = useCallback((updater: (o: Partial<import('@/types/album').AlbumTheme>) => Partial<import('@/types/album').AlbumTheme>) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        slide.themeOverrides = updater(slide.themeOverrides ?? {});
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  const handleUploadImage = useCallback((dataUrl: string) => {
    if (!selectedSlide) return;
    withHistory(() => {
      updateSlide(selectedSlide.id, (slide) => {
        slide.image = {
          asset: { id: slide.id, url: dataUrl, mimeType: 'image/jpeg', width: 1080, height: 1350 },
          rect: { x: 0, y: 0, width: 1, height: 0.54 },
          objectFit: 'cover',
          focalPoint: { x: 0.5, y: 0.5 },
        };
      });
    });
  }, [selectedSlide, updateSlide, withHistory]);

  // Canvas interaction callbacks
  const handleUpdateBlockContent = useCallback((blockId: string, content: RichTextContent) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b && 'content' in b) {
        (b as MainTitleBlock | BodyParagraphBlock).content = content;
      }
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBlockPosition = useCallback((blockId: string, position: Partial<NormalizedRect>) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b) Object.assign(b.position, position);
    });
  }, [selectedSlide, updateSlide]);

  const handleUpdateBlockStyleById = useCallback((blockId: string, overrides: Partial<BlockStyleOverride>) => {
    if (!selectedSlide) return;
    updateSlide(selectedSlide.id, (slide) => {
      const b = slide.blocks.find(b => b.id === blockId);
      if (b) b.styleOverrides = { ...b.styleOverrides, ...overrides };
    });
  }, [selectedSlide, updateSlide]);

  return {
    handleUpdateTitle,
    handleUpdateBody,
    handleUpdateBlockStyle,
    handleUpdateBanner,
    handleUpdateBannerHeight,
    handleUpdateSource,
    handleUpdateLogoVariant,
    handleUpdateSlideOverrides,
    handleUploadImage,
    handleUpdateBlockContent,
    handleUpdateBlockPosition,
    handleUpdateBlockStyleById,
  };
}
