// src/lib/guardrails/rules/bannerFocalRule.ts
// Soft warning: banner position overlaps image focal point

import type { GuardrailRule, GuardrailContext } from '../types';
import type { GuardrailIssue } from '@/types/album';

export const bannerFocalRule: GuardrailRule = {
  id: 'banner-focal-overlap',
  name: 'تداخل البانر مع بؤرة الصورة',
  category: 'layout',

  evaluate(ctx: GuardrailContext): GuardrailIssue[] {
    const { slide, tokens } = ctx;
    const banner = slide.banner;
    const image = slide.image;

    // No banner or no image — no issue
    if (!banner || banner.position === 'none') return [];
    if (!image || !image.asset) return [];

    const focalY = image.focalPoint.y; // 0-1 normalized within the image zone
    const imageTop = image.rect.y;
    const imageHeight = image.rect.height;

    // Focal point in canvas-normalized coordinates
    const focalYCanvas = imageTop + focalY * imageHeight;

    // Banner bounds in canvas-normalized coordinates
    const bannerH = banner.heightNormalized;
    let bannerTop: number;
    let bannerBottom: number;

    switch (banner.position) {
      case 'top':
      case 'float-top':
        bannerTop = 0;
        bannerBottom = bannerH;
        break;
      case 'bottom':
      case 'float-bottom':
        // Footer is ~0.074 from the bottom; banner sits above it
        const footerH = ctx.channelProfile.footer.height;
        bannerBottom = 1 - footerH;
        bannerTop = bannerBottom - bannerH;
        break;
      default:
        return [];
    }

    // Check if the focal point falls within the banner zone (with a small margin)
    const margin = 0.02;
    if (focalYCanvas >= bannerTop - margin && focalYCanvas <= bannerBottom + margin) {
      return [{
        id: `${this.id}-${slide.id}`,
        severity: 'warning',
        slideId: slide.id,
        message: 'موضع البانر يتداخل مع بؤرة الصورة — قد يحجب العنصر الرئيسي',
        autoFixAvailable: true,
        autoFixDescription: 'نقل البانر إلى موضع لا يتعارض مع بؤرة الصورة',
      }];
    }

    return [];
  },
};
