// src/lib/themeStore.ts
// Saved themes — persisted in localStorage as aj-themes.
// Each theme is a named AlbumTheme snapshot that can be applied to any album.

import type { AlbumTheme } from '@/types/album';

export interface SavedTheme {
  id: string;
  name: string;
  theme: AlbumTheme & Record<string, unknown>;
  createdAt: string;
}

const LS_KEY = 'aj-themes';

export function getSavedThemes(): SavedTheme[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTheme(saved: SavedTheme): void {
  const themes = getSavedThemes();
  const idx = themes.findIndex(t => t.id === saved.id);
  if (idx >= 0) {
    themes[idx] = saved;
  } else {
    themes.push(saved);
  }
  localStorage.setItem(LS_KEY, JSON.stringify(themes));
}

export function deleteTheme(id: string): void {
  const themes = getSavedThemes().filter(t => t.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(themes));
}
