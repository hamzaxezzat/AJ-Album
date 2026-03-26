'use client';
import { useCallback } from 'react';
import type { Slide } from '@/types/album';
import { useDocumentStore } from '@/store/documentStore';
import { useHistoryStore } from '@/store/historyStore';
import { useEditorUIStore } from '@/store/editorUIStore';
import { makeTextBox, makeRectangle, makeEllipse } from '../lib/blockFactory';

type AddableBlockType = 'text_box' | 'rectangle' | 'ellipse';

const CORE_BLOCK_TYPES = new Set(['main_title', 'body_paragraph']);

/**
 * Hook encapsulating layer management operations.
 * Follows SOLID pattern from useBlockUpdates and useSlideManagement.
 */
export function useLayerManagement(selectedSlide: Slide | null) {
  const album = useDocumentStore((s) => s.album);
  const addBlock = useDocumentStore((s) => s.addBlock);
  const deleteBlock = useDocumentStore((s) => s.deleteBlock);
  const reorderBlocks = useDocumentStore((s) => s.reorderBlocks);
  const toggleBlockVisibility = useDocumentStore((s) => s.toggleBlockVisibility);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const setSelectedBlock = useEditorUIStore((s) => s.setSelectedBlock);

  const withHistory = useCallback((fn: () => void) => {
    if (album) pushSnapshot(album);
    fn();
  }, [album, pushSnapshot]);

  const handleAddBlock = useCallback((blockType: AddableBlockType) => {
    if (!selectedSlide) return;
    const block = blockType === 'text_box' ? makeTextBox()
      : blockType === 'rectangle' ? makeRectangle()
      : makeEllipse();
    withHistory(() => {
      addBlock(selectedSlide.id, block);
    });
    setSelectedBlock(block.id);
  }, [selectedSlide, addBlock, withHistory, setSelectedBlock]);

  const handleDeleteBlock = useCallback((blockId: string) => {
    if (!selectedSlide) return;
    const block = selectedSlide.blocks.find(b => b.id === blockId);
    if (!block) return;
    // Protect core archetype blocks
    if (CORE_BLOCK_TYPES.has(block.type)) return;
    withHistory(() => {
      deleteBlock(selectedSlide.id, blockId);
    });
    // Clear selection if deleted block was selected
    if (useEditorUIStore.getState().selectedBlockId === blockId) {
      setSelectedBlock(null);
    }
  }, [selectedSlide, deleteBlock, withHistory, setSelectedBlock]);

  const handleReorderBlocks = useCallback((blockIds: string[]) => {
    if (!selectedSlide) return;
    withHistory(() => {
      reorderBlocks(selectedSlide.id, blockIds);
    });
  }, [selectedSlide, reorderBlocks, withHistory]);

  const handleToggleVisibility = useCallback((blockId: string) => {
    if (!selectedSlide) return;
    withHistory(() => {
      toggleBlockVisibility(selectedSlide.id, blockId);
    });
  }, [selectedSlide, toggleBlockVisibility, withHistory]);

  return {
    handleAddBlock,
    handleDeleteBlock,
    handleReorderBlocks,
    handleToggleVisibility,
  };
}
