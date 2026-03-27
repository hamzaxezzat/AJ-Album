import { nanoid } from 'nanoid';
import type { Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent } from '@/types/album';
import { LAYOUT, BANNER } from '../../../../config/defaults';

export function plainToRichText(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  };
}

export function makeBlankSlide(number: number): Slide {
  const id = nanoid();
  const now = new Date().toISOString();
  return {
    id,
    number,
    role: 'inner',
    archetypeId: 'standard_title_body',
    blocks: [
      {
        id: `${id}-title`,
        type: 'main_title',
        position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: plainToRichText('عنوان جديد'),
      } as MainTitleBlock,
      {
        id: `${id}-body`,
        type: 'body_paragraph',
        position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: plainToRichText(''),
      } as BodyParagraphBlock,
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: LAYOUT.imageHeight },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: {
      family: BANNER.family,
      position: BANNER.defaultPosition,
      heightNormalized: BANNER.heightNormalized,
      backgroundColor: 'accent-primary',
      textColor: 'text-on-accent',
      paddingNormalized: BANNER.paddingNormalized,
      overlap: 'none',
    },
    metadata: { createdAt: now, updatedAt: now },
  };
}
