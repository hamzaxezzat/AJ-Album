'use client';
import { create } from 'zustand';
import type { Album } from '@/types/album';

const MAX_HISTORY = 50;

interface HistoryState {
  /** Past snapshots (oldest first). Max MAX_HISTORY entries. */
  past: string[];
  /** Future snapshots for redo (oldest first). Cleared on new push. */
  future: string[];
  /** Whether we're currently applying an undo/redo (to skip re-push). */
  _applying: boolean;

  /**
   * Push a new snapshot (deep JSON string of the album).
   * Called after every meaningful document mutation.
   */
  pushSnapshot: (album: Album) => void;

  /**
   * Undo: pop from past, push current to future, return the restored album.
   * Returns null if nothing to undo.
   */
  undo: (currentAlbum: Album) => Album | null;

  /**
   * Redo: pop from future, push current to past, return the restored album.
   * Returns null if nothing to redo.
   */
  redo: (currentAlbum: Album) => Album | null;

  /** Can undo? */
  canUndo: () => boolean;
  /** Can redo? */
  canRedo: () => boolean;

  /** Clear all history (e.g. when loading a different album). */
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],
  _applying: false,

  pushSnapshot: (album) => {
    const state = get();
    if (state._applying) return; // Skip when we're applying undo/redo

    const snapshot = JSON.stringify(album);

    // Don't push if identical to the last snapshot
    if (state.past.length > 0 && state.past[state.past.length - 1] === snapshot) {
      return;
    }

    set((s) => {
      const newPast = [...s.past, snapshot];
      // Trim to MAX_HISTORY
      if (newPast.length > MAX_HISTORY) {
        newPast.splice(0, newPast.length - MAX_HISTORY);
      }
      return {
        past: newPast,
        future: [], // New action clears redo stack
      };
    });
  },

  undo: (currentAlbum) => {
    const state = get();
    if (state.past.length === 0) return null;

    const newPast = [...state.past];
    const snapshot = newPast.pop()!;
    const currentSnapshot = JSON.stringify(currentAlbum);

    // Set _applying to suppress pushSnapshot during the setAlbum call that follows
    set({
      past: newPast,
      future: [currentSnapshot, ...state.future],
      _applying: true,
    });

    const restored = JSON.parse(snapshot) as Album;

    // Use queueMicrotask for reliable reset — runs after current synchronous
    // call stack (including the caller's setAlbum) but before next event loop tick
    queueMicrotask(() => set({ _applying: false }));

    return restored;
  },

  redo: (currentAlbum) => {
    const state = get();
    if (state.future.length === 0) return null;

    const newFuture = [...state.future];
    const snapshot = newFuture.shift()!;
    const currentSnapshot = JSON.stringify(currentAlbum);

    set({
      past: [...state.past, currentSnapshot],
      future: newFuture,
      _applying: true,
    });

    const restored = JSON.parse(snapshot) as Album;

    queueMicrotask(() => set({ _applying: false }));

    return restored;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [], _applying: false }),
}));
