'use client';
import { useState } from 'react';
import type { Slide, Album, ChannelProfile, BannerPosition, RichTextContent, BlockStyleOverride, AlbumTheme } from '@/types/album';
import { ImageSection } from './ImageSection';
import { TextSection } from './TextSection';
import { BannerSection } from './BannerSection';
import { LayoutSection } from './LayoutSection';
import { AlbumSettingsPanel } from './AlbumSettingsPanel';
import { SlideOverridesSection } from './SlideOverridesSection';

type LogoVariant = 'auto' | 'dark' | 'white';
type PanelTab = 'album' | 'slide';

const ARCHETYPE_LABELS: Record<string, string> = {
  standard_title_body: 'عنوان + نص',
  bullet_list: 'قائمة نقطية',
  highlighted_statement: 'جملة بارزة',
  data_card: 'بطاقة بيانات',
  credentials_profile: 'بيانات شخصية',
  mixed_info: 'معلومات متنوعة',
};

export interface PropertiesPanelProps {
  slide: Slide;
  album: Album;
  channelProfile: ChannelProfile;
  onUpdateTitle: (content: RichTextContent) => void;
  onUpdateBody: (content: RichTextContent) => void;
  onUpdateBlockStyle: (blockType: 'main_title' | 'body_paragraph', overrides: Partial<BlockStyleOverride>) => void;
  onUpdateBanner: (position: BannerPosition) => void;
  onUpdateBannerHeight: (height: number) => void;
  onUpdateSource: (text: string) => void;
  onUploadImage: (dataUrl: string) => void;
  onUpdateLogoVariant: (variant: LogoVariant) => void;
  onUpdateAlbumTheme: (updater: (theme: AlbumTheme) => void) => void;
  onUpdateSlideOverrides: (updater: (overrides: Partial<AlbumTheme>) => Partial<AlbumTheme>) => void;
}

export function PropertiesPanel({
  slide,
  album,
  channelProfile,
  onUpdateTitle,
  onUpdateBody,
  onUpdateBlockStyle,
  onUpdateBanner,
  onUpdateBannerHeight,
  onUpdateSource,
  onUploadImage,
  onUpdateLogoVariant,
  onUpdateAlbumTheme,
  onUpdateSlideOverrides,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState<PanelTab>('slide');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
      {/* Tab toggle */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #21262d', flexShrink: 0,
      }}>
        <TabBtn active={tab === 'slide'} onClick={() => setTab('slide')}>الشريحة</TabBtn>
        <TabBtn active={tab === 'album'} onClick={() => setTab('album')}>الألبوم</TabBtn>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {tab === 'album' ? (
          <AlbumSettingsPanel
            theme={album.theme}
            channelProfile={channelProfile}
            onUpdateTheme={onUpdateAlbumTheme}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 12, borderBottom: '1px solid #21262d',
            }}>
              <span style={{ fontFamily: 'var(--brand-font-family)', fontWeight: 700, fontSize: 15, color: '#e6edf3' }}>
                شريحة {slide.number}
              </span>
              <span style={{
                fontSize: 11, background: '#21262d', color: '#8b949e',
                padding: '2px 8px', borderRadius: 10, fontFamily: 'system-ui',
              }}>
                {ARCHETYPE_LABELS[slide.archetypeId] ?? slide.archetypeId}
              </span>
            </div>

            {/* Image */}
            <ImageSection imageUrl={slide.image?.asset?.url ?? null} onUpload={onUploadImage} />

            {/* Text */}
            <TextSection
              slide={slide}
              onUpdateTitle={onUpdateTitle}
              onUpdateBody={onUpdateBody}
              onUpdateBlockStyle={onUpdateBlockStyle}
            />

            {/* Per-slide theme overrides */}
            <SlideOverridesSection
              slide={slide}
              albumTheme={album.theme}
              channelProfile={channelProfile}
              onUpdateOverride={onUpdateSlideOverrides}
            />

            {/* Banner */}
            <BannerSection
              position={slide.banner?.position ?? 'none'}
              heightNormalized={slide.banner?.heightNormalized ?? 0.10}
              onUpdatePosition={onUpdateBanner}
              onUpdateHeight={onUpdateBannerHeight}
            />

            {/* Layout */}
            <LayoutSection
              slide={slide}
              onUpdateLogoVariant={onUpdateLogoVariant}
              onUpdateSource={onUpdateSource}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: '10px 0',
      background: active ? '#161b22' : '#0d1117',
      border: 'none',
      borderBottom: active ? '2px solid #D32F2F' : '2px solid transparent',
      color: active ? '#e6edf3' : '#7d8590',
      fontSize: 13, fontWeight: active ? 700 : 400,
      cursor: 'pointer',
      fontFamily: 'var(--brand-font-family)',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}
