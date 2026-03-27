// src/lib/demoAlbum.ts
// Demo album: "علي عبد اللهي" — based on the 5 reference inner slides.
// Used to seed the dashboard on first visit.

import type { Album, Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent } from '@/types/album';
import { LAYOUT, CANVAS, THEME, COLORS, BANNER } from '../../config/defaults';

import { nanoid } from 'nanoid';

function uid() {
  return nanoid();
}

function rich(text: string): RichTextContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  };
}

function makeSlide(
  number: number,
  title: string,
  body: string,
): Slide {
  const id = uid();
  const now = new Date().toISOString();
  return {
    id,
    number,
    role: 'inner',
    archetypeId: 'standard_title_body',
    rawScript: `${title}\n${body}`,
    blocks: [
      {
        id: uid(),
        type: 'main_title',
        position: { x: LAYOUT.marginX, y: LAYOUT.titleY, width: LAYOUT.contentWidth, height: LAYOUT.titleHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: rich(title),
      } as MainTitleBlock,
      {
        id: uid(),
        type: 'body_paragraph',
        position: { x: LAYOUT.marginX, y: LAYOUT.bodyY, width: LAYOUT.contentWidth, height: LAYOUT.bodyHeight },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: rich(body),
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

export function createDemoAlbum(): Album {
  const id = uid();
  const now = new Date().toISOString();

  const slides: Slide[] = [
    makeSlide(
      1,
      'النشأة والبدايات العسكرية',
      'وُلد علي عبد اللهي عام 1959 في قرية علي آباد بمحافظة مازندران، وانخرط في صفوف الحرس الثوري الإيراني إبان الثورة الإسلامية عام 1979، وتدرّج سريعاً في الرتب العسكرية خلال سنوات الحرب الإيرانية العراقية.',
    ),
    makeSlide(
      2,
      'قيادة سلاح البر',
      'تولّى منصب قائد سلاح البر في الحرس الثوري ورئاسة أركان القوة البرية في الجيش. هذا الجمع بين قيادة القوتين جعله من القلائل الذين يمتلكون خبرة عميقة في التنسيق المشترك.',
    ),
    makeSlide(
      3,
      'المحطة الأمنية',
      'انتقل إلى العمل الأمني المدني، إذ تولّى منصب نائب وزير الداخلية للشؤون الأمنية (2009 - 2014)، فأدار ملفات شائكة تتعلق بالأمن الداخلي والحدود والاحتجاجات، ما أضاف صبغةً استخباراتيةً وأمنية إلى شخصيته العسكرية.',
    ),
    makeSlide(
      4,
      'قيادة مقر "خاتم الأنبياء" المركزي',
      'عُيِّن قائداً لمقر "خاتم الأنبياء" المركزي الذي يُعدّ أعلى هيئة عملياتية في إيران، والمسؤول عن التخطيط والقيادة الموحّدة لجميع القوات المسلحة في وقت الحرب والأزمات الكبرى.',
    ),
    makeSlide(
      5,
      'العقوبات الدولية',
      'أُدرج اسم عبد اللهي ضمن قوائم العقوبات الأوروبية والأمريكية نظراً إلى دوره القيادي في القوات المسلحة، حيثُ يُنظر إليه كمهندس لتعزيز القدرات الدفاعية والتدريبات المشتركة.',
    ),
  ];

  return {
    id,
    title: 'علي عبد اللهي',
    channelProfileId: 'aj-main',
    theme: {
      primaryColor: COLORS.accent,
      bannerFamilyId: THEME.bannerFamilyId,
      defaultBannerPosition: THEME.defaultBannerPosition,
      density: THEME.density,
      bulletStyle: THEME.bulletStyle,
      bulletDividers: THEME.bulletDividers,
      typographyTone: THEME.typographyTone,
      mode: THEME.mode,
    },
    canvasDimensions: { width: CANVAS.width, height: CANVAS.height, presetName: CANVAS.presetName },
    slides,
    assets: [],
    scriptSource: 'علي عبد اللهي: العقل المدبر للتنسيق العسكري والأمن الداخلي في إيران',
    metadata: { createdAt: now, updatedAt: now },
  };
}
