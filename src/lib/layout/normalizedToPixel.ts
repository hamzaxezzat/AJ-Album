// src/lib/layout/normalizedToPixel.ts
import type { NormalizedRect } from '@/types/album';
import type React from 'react';

/**
 * Converts a NormalizedRect to CSS calc() expressions that reference
 * the CSS custom properties --canvas-width and --canvas-height.
 * This keeps layout correct at any scale without needing pixel values in the data model.
 */
export function normalizedToPixelStyle(
  rect: NormalizedRect,
  _canvasWidth: number,
  _canvasHeight: number,
): React.CSSProperties {
  return {
    left: `calc(var(--canvas-width) * ${rect.x})`,
    top: `calc(var(--canvas-height) * ${rect.y})`,
    width: `calc(var(--canvas-width) * ${rect.width})`,
    height: `calc(var(--canvas-height) * ${rect.height})`,
  };
}

/**
 * Converts a NormalizedRect to actual pixel values for use in contexts
 * where CSS calc() is not available (e.g. Puppeteer clip coords, PSD export).
 */
export function normalizedToPixels(
  rect: NormalizedRect,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x * canvasWidth,
    y: rect.y * canvasHeight,
    width: rect.width * canvasWidth,
    height: rect.height * canvasHeight,
  };
}

/**
 * Converts pixel coordinates to a NormalizedRect.
 * Used when dragging/resizing blocks in the editor.
 */
export function toNormalized(
  pixels: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
): NormalizedRect {
  return {
    x: pixels.x / canvasWidth,
    y: pixels.y / canvasHeight,
    width: pixels.width / canvasWidth,
    height: pixels.height / canvasHeight,
  };
}
