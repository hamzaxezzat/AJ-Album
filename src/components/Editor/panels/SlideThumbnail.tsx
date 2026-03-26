'use client';
import type { Slide, Album, ChannelProfile } from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';

const THUMB_W = 144;

interface SlideThumbnailProps {
  slide: Slide;
  album: Album;
  channelProfile: ChannelProfile;
}

export function SlideThumbnail({ slide, album, channelProfile }: SlideThumbnailProps) {
  const thumbScale = THUMB_W / album.canvasDimensions.width;
  const thumbH = Math.round(album.canvasDimensions.height * thumbScale);

  return (
    <div style={{
      width: THUMB_W,
      height: thumbH,
      overflow: 'hidden',
      borderRadius: 3,
      border: '1px solid #30363d',
      background: '#1a1f27',
      flexShrink: 0,
      pointerEvents: 'none',
    }}>
      <div style={{
        transform: `scale(${thumbScale})`,
        transformOrigin: 'top left',
        width: album.canvasDimensions.width,
        height: album.canvasDimensions.height,
      }}>
        <SlideRenderer slide={slide} album={album} channelProfile={channelProfile} />
      </div>
    </div>
  );
}
