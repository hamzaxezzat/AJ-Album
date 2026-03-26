import type { Metadata } from 'next';
import type { ChannelProfile } from '@/types/album';
import ajMain from '../../config/brands/aj-main.json';
import './globals.css';

export const metadata: Metadata = {
  title: 'Editorial Album Platform — Al Jazeera Arabic',
  description: 'Script-driven editorial album creation for newsroom social media production.',
};

/**
 * Generate @font-face CSS + --brand-font-family from the active channel profile.
 * To change the platform font: edit config/brands/aj-main.json → fontFiles + primaryFontFamily.
 * Everything else (UI chrome, slide canvas) picks up the change automatically.
 */
function buildBrandCSS(profile: ChannelProfile): string {
  const fontFaces = profile.fontFiles.map(f =>
    `@font-face{font-family:'${f.family}';src:url('${f.url}') format('${f.format}');font-weight:${f.weight};font-style:normal;font-display:swap;}`
  ).join('');
  return `${fontFaces}:root{--brand-font-family:${profile.primaryFontFamily};}`;
}

// Cast is safe — aj-main.json satisfies ChannelProfile
const brandCSS = buildBrandCSS(ajMain as unknown as ChannelProfile);

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      {/* eslint-disable-next-line react/no-danger */}
      <head><style dangerouslySetInnerHTML={{ __html: brandCSS }} /></head>
      <body>{children}</body>
    </html>
  );
}
