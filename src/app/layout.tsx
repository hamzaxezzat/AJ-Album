import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Editorial Album Platform — Al Jazeera Arabic',
  description: 'Script-driven editorial album creation for newsroom social media production.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
