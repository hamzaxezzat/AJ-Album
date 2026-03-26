import type { Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent } from '@/types/album';

export function plainToRichText(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  };
}

export function makeBlankSlide(number: number): Slide {
  const id = Math.random().toString(36).slice(2);
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
        position: { x: 0.0833, y: 0.607, width: 0.8333, height: 0.09 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: plainToRichText('عنوان جديد'),
      } as MainTitleBlock,
      {
        id: `${id}-body`,
        type: 'body_paragraph',
        position: { x: 0.0833, y: 0.707, width: 0.8333, height: 0.167 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: plainToRichText(''),
      } as BodyParagraphBlock,
    ],
    image: {
      rect: { x: 0, y: 0, width: 1, height: 0.54 },
      objectFit: 'cover',
      focalPoint: { x: 0.5, y: 0.5 },
    },
    banner: {
      family: 'classic-main',
      position: 'none',
      heightNormalized: 0.10,
      backgroundColor: 'accent-primary',
      textColor: 'text-on-accent',
      paddingNormalized: 0.04,
      overlap: 'none',
    },
    metadata: { createdAt: now, updatedAt: now },
  };
}
