'use client';
import type { Slide, BannerPosition, RichTextContent, BlockStyleOverride } from '@/types/album';
import { ImageSection } from './ImageSection';
import { TextSection } from './TextSection';
import { BannerSection } from './BannerSection';
import { LayoutSection } from './LayoutSection';

type LogoVariant = 'auto' | 'dark' | 'white';

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
  onUpdateTitle: (content: RichTextContent) => void;
  onUpdateBody: (content: RichTextContent) => void;
  onUpdateBlockStyle: (blockType: 'main_title' | 'body_paragraph', overrides: Partial<BlockStyleOverride>) => void;
  onUpdateBanner: (position: BannerPosition) => void;
  onUpdateBannerHeight: (height: number) => void;
  onUpdateSource: (text: string) => void;
  onUploadImage: (dataUrl: string) => void;
  onUpdateLogoVariant: (variant: LogoVariant) => void;
}

export function PropertiesPanel({
  slide,
  onUpdateTitle,
  onUpdateBody,
  onUpdateBlockStyle,
  onUpdateBanner,
  onUpdateBannerHeight,
  onUpdateSource,
  onUploadImage,
  onUpdateLogoVariant,
}: PropertiesPanelProps) {
  return (
    <div style={{
      padding: 20,
      overflowY: 'auto',
      height: '100%',
      boxSizing: 'border-box',
      direction: 'rtl',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 14,
        borderBottom: '1px solid #21262d',
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

      {/* Block 4: Image */}
      <ImageSection
        imageUrl={slide.image?.asset?.url ?? null}
        onUpload={onUploadImage}
      />

      {/* Block 3: Text (Title + Content + Size + Reformat) */}
      <TextSection
        slide={slide}
        onUpdateTitle={onUpdateTitle}
        onUpdateBody={onUpdateBody}
        onUpdateBlockStyle={onUpdateBlockStyle}
      />

      {/* Block 2: Banner */}
      <BannerSection
        position={slide.banner?.position ?? 'none'}
        heightNormalized={slide.banner?.heightNormalized ?? 0.10}
        onUpdatePosition={onUpdateBanner}
        onUpdateHeight={onUpdateBannerHeight}
      />

      {/* Block 1: Layout (Logo + Source) */}
      <LayoutSection
        slide={slide}
        onUpdateLogoVariant={onUpdateLogoVariant}
        onUpdateSource={onUpdateSource}
      />
    </div>
  );
}
