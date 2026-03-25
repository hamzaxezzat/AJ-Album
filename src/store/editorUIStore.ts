'use client';
import { create } from 'zustand';

interface EditorUIState {
  selectedSlideId: string | null;
  selectedBlockId: string | null;
  activePanel: 'album' | 'slide' | 'block';
  setSelectedSlide: (slideId: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setActivePanel: (panel: 'album' | 'slide' | 'block') => void;
}

export const useEditorUIStore = create<EditorUIState>()((set) => ({
  selectedSlideId: null,
  selectedBlockId: null,
  activePanel: 'album',

  setSelectedSlide: (slideId) =>
    set({
      selectedSlideId: slideId,
      selectedBlockId: null,
      activePanel: slideId ? 'slide' : 'album',
    }),

  setSelectedBlock: (blockId) =>
    set({
      selectedBlockId: blockId,
      activePanel: blockId ? 'block' : 'slide',
    }),

  setActivePanel: (panel) => set({ activePanel: panel }),
}));
