import { useRef, useCallback } from 'react';
import type { NormalizedRect } from '@/types/album';

interface DragBlockOptions {
  canvasW: number;
  canvasH: number;
  onMove: (position: Partial<NormalizedRect>) => void;
}

/**
 * Hook for drag-to-reposition a block on the canvas.
 * All coordinates are in canvas pixel space (1080×1350).
 * Returns mouse event handlers to attach to the block overlay.
 */
export function useDragBlock({ canvasW, canvasH, onMove }: DragBlockOptions) {
  const dragState = useRef<{
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    currentPosition: NormalizedRect,
  ) => {
    // Only left click
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: currentPosition.x,
      startY: currentPosition.y,
    };

    const handleMouseMove = (me: MouseEvent) => {
      if (!dragState.current) return;
      // Divide by actual displayed size (canvasW/canvasH already account for scale)
      const dx = (me.clientX - dragState.current.startMouseX) / canvasW;
      const dy = (me.clientY - dragState.current.startMouseY) / canvasH;
      const newX = Math.max(0, Math.min(1 - currentPosition.width, dragState.current.startX + dx));
      const newY = Math.max(0, Math.min(1 - currentPosition.height, dragState.current.startY + dy));
      onMove({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [canvasW, canvasH, onMove]);

  return { handleMouseDown };
}
