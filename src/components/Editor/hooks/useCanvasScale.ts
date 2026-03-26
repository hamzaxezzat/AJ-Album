import { useEffect, useState } from 'react';

/**
 * Responsively fit the canvas into the available container.
 * Returns a scale factor: canvas_display = canvas_logical * scale.
 * Uses ResizeObserver — updates automatically on window/layout resize.
 * The canvas coordinate system (e.g. 1080×1350) never changes; only display scale changes.
 */
export function useCanvasScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  canvasW: number,
  canvasH: number,
): number {
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const PADDING = 48;
    const compute = (w: number, h: number) => {
      const s = Math.min((w - PADDING * 2) / canvasW, (h - PADDING * 2) / canvasH, 1);
      setScale(Math.max(0.1, parseFloat(s.toFixed(4))));
    };

    const ro = new ResizeObserver(([entry]) => {
      compute(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(el);
    compute(el.clientWidth, el.clientHeight);

    return () => ro.disconnect();
  }, [containerRef, canvasW, canvasH]);

  return scale;
}
