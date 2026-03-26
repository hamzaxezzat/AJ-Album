// src/lib/demoAlbum.ts
// Demo album: "علي عبد اللهي" — based on the 5 reference inner slides.
// Used to seed the dashboard on first visit.

import type { Album, Slide, MainTitleBlock, BodyParagraphBlock, RichTextContent } from '@/types/album';

function uid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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
        position: { x: 0.05, y: 0.56, width: 0.90, height: 0.12 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'heading-l',
        content: rich(title),
      } as MainTitleBlock,
      {
        id: uid(),
        type: 'body_paragraph',
        position: { x: 0.05, y: 0.69, width: 0.90, height: 0.21 },
        zIndex: 10,
        visible: true,
        typographyTokenRef: 'body-m',
        kashidaEnabled: true,
        content: rich(body),
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
      primaryColor: '#D32F2F',
      bannerFamilyId: 'classic-main',
      defaultBannerPosition: 'none',
      density: 'normal',
      bulletStyle: 'square',
      bulletDividers: false,
      typographyTone: 'standard',
      mode: 'production',
    },
    canvasDimensions: { width: 1080, height: 1350, presetName: 'editorial-portrait-4:5' },
    slides,
    assets: [],
    scriptSource: 'علي عبد اللهي: العقل المدبر للتنسيق العسكري والأمن الداخلي في إيران',
    metadata: { createdAt: now, updatedAt: now },
  };
}
