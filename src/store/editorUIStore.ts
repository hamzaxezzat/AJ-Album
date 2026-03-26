'use client';
import { create } from 'zustand';

interface EditorUIState {
  selectedSlideId: string | null;
  selectedBlockId: string | null;
  isEditingBlock: boolean;
  activePanel: 'album' | 'slide' | 'block';

  setSelectedSlide: (slideId: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setActivePanel: (panel: 'album' | 'slide' | 'block') => void;
  startEditingBlock: () => void;
  stopEditingBlock: () => void;
}

export const useEditorUIStore = create<EditorUIState>()((set) => ({
  selectedSlideId: null,
  selectedBlockId: null,
  isEditingBlock: false,
  activePanel: 'album',

  setSelectedSlide: (slideId) =>
    set({
      selectedSlideId: slideId,
      selectedBlockId: null,
      isEditingBlock: false,
      activePanel: slideId ? 'slide' : 'album',
    }),

  setSelectedBlock: (blockId) =>
    set({
      selectedBlockId: blockId,
      isEditingBlock: false,
      activePanel: blockId ? 'block' : 'slide',
    }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  startEditingBlock: () => set({ isEditingBlock: true }),

  stopEditingBlock: () => set({ isEditingBlock: false }),
}));
