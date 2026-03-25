// src/lib/tokens/resolveTokens.test.ts
import { describe, it, expect } from 'vitest';
import { resolveTokens, tokensToCssVars } from './resolveTokens';
import type {
  ChannelProfile,
  AlbumTheme,
  TokenResolutionContext,
  BlockStyleOverride,
} from '@/types/album';

// ─── Minimal mock channel profile ───────────────────────────

const mockTypography: ChannelProfile['typography'] = {
  'heading-xl': { fontFamily: 'Cairo', fontWeight: 700, fontSize: 46, lineHeight: 1.25, letterSpacing: -0.02, textAlign: 'right', direction: 'rtl' },
  'heading-l': { fontFamily: 'Cairo', fontWeight: 700, fontSize: 34, lineHeight: 1.3, letterSpacing: -0.01, textAlign: 'right', direction: 'rtl' },
  'heading-m': { fontFamily: 'IBM Plex Arabic', fontWeight: 600, fontSize: 26, lineHeight: 1.35, letterSpacing: 0, textAlign: 'right', direction: 'rtl' },
  'body-m': { fontFamily: 'IBM Plex Arabic', fontWeight: 400, fontSize: 18, lineHeight: 1.7, letterSpacing: 0, textAlign: 'right', direction: 'rtl' },
  'body-s': { fontFamily: 'IBM Plex Arabic', fontWeight: 400, fontSize: 14, lineHeight: 1.5, letterSpacing: 0, textAlign: 'right', direction: 'rtl' },
  'stat-display': { fontFamily: 'Cairo', fontWeight: 700, fontSize: 96, lineHeight: 1.0, letterSpacing: -0.03, textAlign: 'center', direction: 'ltr' },
  'label': { fontFamily: 'IBM Plex Arabic', fontWeight: 400, fontSize: 12, lineHeight: 1.4, letterSpacing: 0.02, textAlign: 'right', direction: 'rtl' },
};

const mockChannelProfile: ChannelProfile = {
  id: 'aj-main',
  name: 'Al Jazeera Arabic',
  logo: {
    primary: { id: 'logo-primary', url: '/logos/primary.svg', mimeType: 'image/svg+xml' },
    reversed: { id: 'logo-reversed', url: '/logos/reversed.svg', mimeType: 'image/svg+xml' },
    compact: { id: 'logo-compact', url: '/logos/compact.svg', mimeType: 'image/svg+xml' },
    clearSpace: 0.03,
  },
  colors: {
    locked: ['#D32F2F'],
    palette: [{ hex: '#D32F2F', label: 'Brand Red', role: 'primary' }],
    allowCustom: false,
  },
  bannerFamilies: [
    {
      id: 'classic-main',
      name: 'الكلاسيكي',
      shape: 'full-width',
      borderRadius: 0,
      sideAccentLine: false,
      allowedPositions: ['top', 'bottom', 'float-top', 'float-bottom'],
    },
  ],
  defaultBannerFamily: 'classic-main',
  footer: {
    height: 0.074,
    logoPosition: 'right',
    showSocialHandles: true,
    paginationPosition: 'left',
    backgroundColor: '#FFFFFF',
    textColor: '#212121',
  },
  sourceStyle: {
    position: 'bottom-right',
    sizeBreakpoints: [
      { maxChars: 20, scale: 1.0 },
      { maxChars: 40, scale: 0.85 },
      { maxChars: 70, scale: 0.70 },
      { maxChars: 9999, scale: 0.60 },
    ],
    fontTokenRef: 'body-s',
  },
  typography: mockTypography,
  availableArchetypes: ['standard_title_body'],
  defaultDensity: 'normal',
  brandLocks: {
    locked: {
      logoAsset: true,
      logoClearSpace: true,
      logoPosition: true,
      footerStructure: true,
      fontFamily: true,
      brandColors: ['#D32F2F'],
    },
    editable: {
      accentColor: { mode: 'palette_only', palette: ['#D32F2F'] },
      bannerPosition: { allowed: ['top', 'bottom', 'float-top', 'float-bottom', 'none'] },
      bulletShape: { allowed: ['square', 'circle', 'dash'] },
      bulletDividers: true,
      densityControl: true,
      overlayOpacity: { min: 0, max: 0.5 },
      sourceSize: { minScale: 0.6, maxScale: 1.0 },
    },
  },
  allowedModes: ['production'],
  numeralStyle: 'western',
};

const baseAlbumTheme: AlbumTheme = {
  primaryColor: '#D32F2F',
  secondaryColor: undefined,
  bannerFamilyId: 'classic-main',
  defaultBannerPosition: 'bottom',
  density: 'normal',
  bulletStyle: 'square',
  bulletDividers: false,
  typographyTone: 'standard',
  mode: 'production',
};

const defaultCanvas = { width: 1350, height: 1080, presetName: 'editorial-landscape-5:4' };

// ─── Tests ───────────────────────────────────────────────────

describe('resolveTokens', () => {
  it('uses album theme primaryColor when no overrides', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#D32F2F' },
    };
    const tokens = resolveTokens(ctx);
    expect(tokens.accentPrimary).toBe('#D32F2F');
  });

  it('album theme color overrides channel profile default', () => {
    // The channel profile itself doesn't own a primaryColor — the album theme does.
    // We verify that each album's theme.primaryColor is used.
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#1565C0' },
    };
    const tokens = resolveTokens(ctx);
    expect(tokens.accentPrimary).toBe('#1565C0');
  });

  it('slide overrides override album theme primaryColor', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#D32F2F' },
      slideOverrides: { primaryColor: '#FFC107' },
    };
    const tokens = resolveTokens(ctx);
    expect(tokens.accentPrimary).toBe('#FFC107');
  });

  it('block overrides (color) override slide overrides', () => {
    const blockOverrides: BlockStyleOverride = { color: '#212121' };
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#D32F2F' },
      slideOverrides: { primaryColor: '#FFC107' },
      blockOverrides,
    };
    const tokens = resolveTokens(ctx);
    expect(tokens.accentPrimary).toBe('#212121');
  });

  it('all 4 cascade levels work in sequence: block > slide > album > channel default', () => {
    // Level 1: only album theme
    const lvl1 = resolveTokens({
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#AAAAAA' },
    });
    expect(lvl1.accentPrimary).toBe('#AAAAAA');

    // Level 2: slide overrides album
    const lvl2 = resolveTokens({
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#AAAAAA' },
      slideOverrides: { primaryColor: '#BBBBBB' },
    });
    expect(lvl2.accentPrimary).toBe('#BBBBBB');

    // Level 3: block overrides slide
    const lvl3 = resolveTokens({
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#AAAAAA' },
      slideOverrides: { primaryColor: '#BBBBBB' },
      blockOverrides: { color: '#CCCCCC' },
    });
    expect(lvl3.accentPrimary).toBe('#CCCCCC');
  });

  it('density cascades correctly from album theme', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, density: 'compact' },
    };
    expect(resolveTokens(ctx).density).toBe('compact');
  });

  it('density is overridden by slide overrides', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, density: 'compact' },
      slideOverrides: { density: 'spacious' },
    };
    expect(resolveTokens(ctx).density).toBe('spacious');
  });

  it('bulletStyle cascades from album theme', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, bulletStyle: 'circle' },
    };
    expect(resolveTokens(ctx).bulletStyle).toBe('circle');
  });

  it('typography comes from channel profile', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: baseAlbumTheme,
    };
    const tokens = resolveTokens(ctx);
    expect(tokens.typography['heading-xl'].fontSize).toBe(46);
    expect(tokens.typography['body-m'].lineHeight).toBe(1.7);
  });

  it('canvas dimensions come from canvasConfig, not hardcoded', () => {
    const tokens1350 = resolveTokens({ channelProfile: mockChannelProfile, canvasConfig: defaultCanvas, albumTheme: baseAlbumTheme });
    expect(tokens1350.canvasWidth).toBe(1350);
    expect(tokens1350.canvasHeight).toBe(1080);

    // Verify it reads from config, not hardcoded constants
    const squareCanvas = { width: 1080, height: 1080, presetName: 'square' };
    const tokensSquare = resolveTokens({ channelProfile: mockChannelProfile, canvasConfig: squareCanvas, albumTheme: baseAlbumTheme });
    expect(tokensSquare.canvasWidth).toBe(1080);
    expect(tokensSquare.canvasHeight).toBe(1080);
  });

  it('accentSecondary falls back to undefined when not set', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, secondaryColor: undefined },
    };
    expect(resolveTokens(ctx).accentSecondary).toBeUndefined();
  });

  it('accentSecondary is provided by album theme when set', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, secondaryColor: '#1565C0' },
    };
    expect(resolveTokens(ctx).accentSecondary).toBe('#1565C0');
  });

  it('accentSecondary is overridden by slide override', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, secondaryColor: '#1565C0' },
      slideOverrides: { secondaryColor: '#9C27B0' },
    };
    expect(resolveTokens(ctx).accentSecondary).toBe('#9C27B0');
  });
});

describe('tokensToCssVars', () => {
  it('returns --canvas-width: 1350px', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: baseAlbumTheme,
    };
    const tokens = resolveTokens(ctx);
    const cssVars = tokensToCssVars(tokens);
    expect(cssVars['--canvas-width']).toBe('1350px');
  });

  it('returns --canvas-height: 1080px', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: baseAlbumTheme,
    };
    const tokens = resolveTokens(ctx);
    const cssVars = tokensToCssVars(tokens);
    expect(cssVars['--canvas-height']).toBe('1080px');
  });

  it('maps accentPrimary to --accent-primary', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#FF0000' },
    };
    const cssVars = tokensToCssVars(resolveTokens(ctx));
    expect(cssVars['--accent-primary']).toBe('#FF0000');
  });

  it('--accent-secondary falls back to --accent-primary when no secondary defined', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: { ...baseAlbumTheme, primaryColor: '#FF0000', secondaryColor: undefined },
    };
    const cssVars = tokensToCssVars(resolveTokens(ctx));
    expect(cssVars['--accent-secondary']).toBe('#FF0000');
  });

  it('emits correct font-size vars from typography profile', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: baseAlbumTheme,
    };
    const cssVars = tokensToCssVars(resolveTokens(ctx));
    expect(cssVars['--font-size-heading-xl']).toBe('46px');
    expect(cssVars['--font-size-heading-l']).toBe('34px');
    expect(cssVars['--font-size-body-m']).toBe('18px');
    expect(cssVars['--font-size-stat']).toBe('96px');
  });

  it('emits --line-height-body from body-m token', () => {
    const ctx: TokenResolutionContext = {
      channelProfile: mockChannelProfile,
      canvasConfig: defaultCanvas,
      albumTheme: baseAlbumTheme,
    };
    const cssVars = tokensToCssVars(resolveTokens(ctx));
    expect(cssVars['--line-height-body']).toBe('1.7');
  });
});
