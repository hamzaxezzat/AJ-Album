'use client';
import type { Slide, Album, ChannelProfile } from '@/types/album';
import { SlideThumbnail } from './SlideThumbnail';

interface SlideStripProps {
  album: Album;
  channelProfile: ChannelProfile;
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: (id: string) => void;
  onDuplicateSlide: (id: string) => void;
}

export function SlideStrip({
  album,
  channelProfile,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
}: SlideStripProps) {
  return (
    <aside style={{
      width: 180,
      background: '#0d1117',
      borderLeft: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        fontSize: 11,
        color: '#7d8590',
        fontFamily: 'system-ui',
        borderBottom: '1px solid #21262d',
        direction: 'rtl',
      }}>
        الشرائح ({album.slides.length})
      </div>

      {/* Slide list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {album.slides.map((slide) => (
          <SlideStripItem
            key={slide.id}
            slide={slide}
            album={album}
            channelProfile={channelProfile}
            isSelected={slide.id === selectedSlideId}
            onSelect={() => onSelectSlide(slide.id)}
            onDelete={() => onDeleteSlide(slide.id)}
            onDuplicate={() => onDuplicateSlide(slide.id)}
          />
        ))}
      </div>

      {/* Add slide */}
      <div style={{ padding: 8, borderTop: '1px solid #21262d' }}>
        <button
          type="button"
          onClick={onAddSlide}
          style={{
            width: '100%',
            padding: '7px 0',
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: 5,
            color: '#8b949e',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--brand-font-family)',
          }}
        >
          + شريحة جديدة
        </button>
      </div>
    </aside>
  );
}

// ─── Single strip item ────────────────────────────────────────

function SlideStripItem({
  slide, album, channelProfile, isSelected, onSelect, onDelete, onDuplicate,
}: {
  slide: Slide;
  album: Album;
  channelProfile: ChannelProfile;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div style={{
      position: 'relative',
      margin: '0 8px 8px',
      borderRadius: 6,
      border: `2px solid ${isSelected ? '#D32F2F' : 'transparent'}`,
      background: isSelected ? 'rgba(211,47,47,0.08)' : 'transparent',
    }}>
      <button
        type="button"
        onClick={onSelect}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '6px 4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <SlideThumbnail slide={slide} album={album} channelProfile={channelProfile} />
        <span style={{
          fontSize: 10,
          color: isSelected ? '#ef5350' : '#7d8590',
          fontFamily: 'system-ui',
        }}>
          {slide.number}
        </span>
      </button>

      {/* Actions overlay */}
      <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 2 }}>
        <ActionButton title="تكرار" onClick={onDuplicate}>⧉</ActionButton>
        <ActionButton title="حذف" onClick={onDelete} color="#f85149">×</ActionButton>
      </div>
    </div>
  );
}

function ActionButton({ title, onClick, color, children }: {
  title: string; onClick: (e: React.MouseEvent) => void; color?: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      style={{
        width: 16, height: 16, fontSize: 9,
        background: 'rgba(0,0,0,0.6)',
        color: color ?? '#8b949e',
        border: 'none', borderRadius: 3, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}
