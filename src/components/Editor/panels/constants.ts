// Shared constants for editor panels — eliminates duplication across
// AlbumSettingsPanel, BannerSection, SettingsEditor, etc.

import type { BannerPosition, BulletStyle, BulletConnectorConfig } from '@/types/album';

export const BANNER_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: 'top', label: 'أعلى' },
  { value: 'bottom', label: 'أسفل' },
  { value: 'float-top', label: 'عائم أعلى' },
  { value: 'float-bottom', label: 'عائم أسفل' },
  { value: 'none', label: 'بدون' },
];

export const BULLET_OPTIONS: { value: BulletStyle; label: string }[] = [
  { value: 'square', label: '■' },
  { value: 'circle', label: '●' },
  { value: 'dash', label: '—' },
  { value: 'none', label: 'بدون' },
];

export const WEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: 300, label: 'خفيف' },
  { value: 400, label: 'عادي' },
  { value: 600, label: 'متوسط' },
  { value: 700, label: 'عريض' },
  { value: 900, label: 'ثقيل' },
];

export const TITLE_COLOR_PRESETS = [
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أزرق', hex: '#1565C0' },
  { label: 'أسود', hex: '#212121' },
];

export const CONNECTOR_COLOR_PRESETS = [
  { label: 'رمادي', hex: '#CCCCCC' },
  { label: 'أحمر', hex: '#D32F2F' },
  { label: 'أسود', hex: '#212121' },
];

export const LINE_STYLE_OPTIONS: { value: BulletConnectorConfig['style']; label: string }[] = [
  { value: 'solid', label: '━ خط' },
  { value: 'dashed', label: '┅ متقطع' },
  { value: 'dotted', label: '··· نقاط' },
];
