'use client';
/**
 * Test page: renders a hardcoded demo slide to verify the renderer works.
 * Visit /test-render to diagnose blank slide issues without localStorage.
 */
import type { Album, Slide, MainTitleBlock, BodyParagraphBlock, ChannelProfile } from '@/types/album';
import { SlideRenderer } from '@/components/SlideRenderer';
import ajMainRaw from '../../../config/brands/aj-main.json';

const channelProfile = ajMainRaw as unknown as ChannelProfile;

const DEMO_SLIDE: Slide = {
  id: 'demo-slide-1',
  number: 1,
  role: 'inner',
  archetypeId: 'standard_title_body',
  blocks: [
    {
      id: 'demo-title',
      type: 'main_title',
      position: { x: 0.05, y: 0.56, width: 0.90, height: 0.12 },
      zIndex: 10,
      visible: true,
      typographyTokenRef: 'heading-l',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'النشأة والبدايات العسكرية' }] }],
      },
    } as MainTitleBlock,
    {
      id: 'demo-body',
      type: 'body_paragraph',
      position: { x: 0.05, y: 0.69, width: 0.90, height: 0.21 },
      zIndex: 10,
      visible: true,
      typographyTokenRef: 'body-m',
      kashidaEnabled: true,
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، ليبدأ مسيرة عسكرية امتدت لعقود شكّلت ملامح الأمن الإيراني.' }],
        }],
      },
    } as BodyParagraphBlock,
  ],
  image: {
    rect: { x: 0, y: 0, width: 1, height: 0.54 },
    objectFit: 'cover' as const,
    focalPoint: { x: 0.5, y: 0.5 },
  },
  banner: {
    family: 'classic-main',
    position: 'none' as const,
    heightNormalized: 0.10,
    backgroundColor: 'accent-primary',
    textColor: 'text-on-accent',
    paddingNormalized: 0.04,
    overlap: 'none',
  },
  metadata: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
};

const DEMO_ALBUM: Album = {
  id: 'demo-album',
  title: 'ألبوم تجريبي',
  channelProfileId: 'aj-main',
  theme: {
    primaryColor: '#D32F2F',
    bannerFamilyId: 'classic-main',
    defaultBannerPosition: 'bottom',
    density: 'normal',
    bulletStyle: 'square',
    bulletDividers: false,
    typographyTone: 'standard',
    mode: 'production',
  },
  canvasDimensions: { width: 1080, height: 1350, presetName: 'editorial-portrait-4:5' },
  slides: [DEMO_SLIDE],
  assets: [],
  metadata: {
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

const CANVAS_W = 1080;
const CANVAS_H = 1350;
const SCALE = 0.5;

export default function TestRenderPage() {
  return (
    <div style={{ padding: 40, background: '#111', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontFamily: 'monospace', marginBottom: 8 }}>🧪 Renderer Test Page</h1>
      <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#888', marginBottom: 32 }}>
        Hardcoded demo data — no localStorage. If text appears below, the renderer works correctly.
      </p>

      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        {/* Full canvas at 50% scale */}
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa', marginBottom: 8 }}>
            Full canvas @ 50% scale ({CANVAS_W / 2}×{CANVAS_H / 2}px)
          </p>
          <div style={{
            width: CANVAS_W * SCALE,
            height: CANVAS_H * SCALE,
            overflow: 'hidden',
            border: '1px solid #444',
          }}>
            <div style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${SCALE})`,
              transformOrigin: 'top left',
            }}>
              <SlideRenderer slide={DEMO_SLIDE} album={DEMO_ALBUM} channelProfile={channelProfile} />
            </div>
          </div>
        </div>

        {/* Thumbnail at 148px wide */}
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa', marginBottom: 8 }}>
            Thumbnail @ 148px wide
          </p>
          <div style={{
            width: 148,
            height: Math.round(CANVAS_H * (148 / CANVAS_W)),
            overflow: 'hidden',
            border: '1px solid #444',
          }}>
            <div style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${148 / CANVAS_W})`,
              transformOrigin: 'top left',
            }}>
              <SlideRenderer slide={DEMO_SLIDE} album={DEMO_ALBUM} channelProfile={channelProfile} />
            </div>
          </div>
        </div>
      </div>

      {/* Data inspection */}
      <div style={{ marginTop: 40 }}>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa', marginBottom: 8 }}>
          Slide blocks (should have typographyTokenRef):
        </p>
        <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#0f0', background: '#1a1a1a', padding: 16, borderRadius: 4, overflow: 'auto' }}>
          {JSON.stringify(DEMO_SLIDE.blocks.map(b => ({
            type: b.type,
            typographyTokenRef: (b as MainTitleBlock).typographyTokenRef,
            position: b.position,
          })), null, 2)}
        </pre>
      </div>
    </div>
  );
}
