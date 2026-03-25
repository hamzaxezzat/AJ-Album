// src/types/album.ts
// ============================================================
// EDITORIAL ALBUM PLATFORM — COMPLETE TYPE SYSTEM
// All positions: NormalizedRect (0.0–1.0), NEVER pixels
// ============================================================

// ─── Primitives ─────────────────────────────────────────────

export interface NormalizedRect {
  x: number;      // 0.0–1.0
  y: number;      // 0.0–1.0
  width: number;  // 0.0–1.0
  height: number; // 0.0–1.0
}

export interface AssetRef {
  id: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  altText?: string;
}

export interface ColorOption {
  hex: string;
  label: string;
  role?: string;
}

// ─── Typography ─────────────────────────────────────────────

export type TypographyToken = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;        // canvas units (px at 1350×1080)
  lineHeight: number;      // multiplier
  letterSpacing: number;   // em units
  textAlign: 'right' | 'left' | 'center';
  direction: 'rtl' | 'ltr';
};

export interface TypographyProfile {
  'heading-xl': TypographyToken;  // cover/dominant titles
  'heading-l': TypographyToken;   // slide titles
  'heading-m': TypographyToken;   // sub-section headers
  'body-m': TypographyToken;      // standard body
  'body-s': TypographyToken;      // dense body, captions, source
  'stat-display': TypographyToken; // very large numbers
  'label': TypographyToken;       // UI chrome, footer, pagination
}

// ─── Channel Profile ────────────────────────────────────────

export type BannerPosition = 'top' | 'bottom' | 'float-top' | 'float-bottom' | 'none';
export type BulletStyle = 'square' | 'circle' | 'dash' | 'dot' | 'none';
export type Density = 'compact' | 'normal' | 'spacious';
export type NumeralStyle = 'western' | 'arabic-indic';

export interface BannerFamily {
  id: string;
  name: string;
  shape: 'full-width' | 'partial' | 'pill' | 'angled';
  borderRadius: number;
  sideAccentLine: boolean;
  allowedPositions: BannerPosition[];
}

export interface FooterDefinition {
  height: number;          // normalized
  logoPosition: 'left' | 'right';
  showSocialHandles: boolean;
  paginationPosition: 'left' | 'right' | 'center';
  backgroundColor: string; // token ref
  textColor: string;       // token ref
}

export interface SourceStyle {
  position: 'bottom-right' | 'bottom-left';
  sizeBreakpoints: {
    maxChars: number;
    scale: number;         // multiplier on caption token size
  }[];
  fontTokenRef: string;
}

export interface BrandLockConfig {
  locked: {
    logoAsset: boolean;
    logoClearSpace: boolean;
    logoPosition: boolean;
    footerStructure: boolean;
    fontFamily: boolean;
    brandColors: string[];   // hex values always locked
  };
  editable: {
    accentColor: {
      mode: 'palette_only' | 'palette_and_custom' | 'any';
      palette: string[];
    };
    bannerPosition: {
      allowed: BannerPosition[];
    };
    bulletShape: {
      allowed: BulletStyle[];
    };
    bulletDividers: boolean;
    densityControl: boolean;
    overlayOpacity: { min: number; max: number };
    sourceSize: { minScale: number; maxScale: number };
  };
}

export interface ChannelProfile {
  id: string;
  name: string;
  parentId?: string;
  logo: {
    primary: AssetRef;
    reversed: AssetRef;
    compact: AssetRef;
    clearSpace: number;    // normalized
  };
  colors: {
    locked: string[];
    palette: ColorOption[];
    allowCustom: boolean;
  };
  bannerFamilies: BannerFamily[];
  defaultBannerFamily: string;
  footer: FooterDefinition;
  sourceStyle: SourceStyle;
  typography: TypographyProfile;
  availableArchetypes: string[];
  defaultDensity: Density;
  brandLocks: BrandLockConfig;
  allowedModes: ('production' | 'creative')[];
  numeralStyle: NumeralStyle;
}

// ─── Album & Theme ───────────────────────────────────────────

export interface CanvasConfig {
  width: number;    // default: 1350
  height: number;   // default: 1080
  presetName: string;
}

export interface AlbumTheme {
  primaryColor: string;
  secondaryColor?: string;
  bannerFamilyId: string;
  defaultBannerPosition: BannerPosition;
  density: Density;
  bulletStyle: BulletStyle;
  bulletDividers: boolean;
  typographyTone: 'standard' | 'bold-heavy' | 'light';
  mode: 'production' | 'creative';
}

export interface AlbumMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Album {
  id: string;
  title: string;
  channelProfileId: string;   // immutable after creation
  theme: AlbumTheme;
  canvasDimensions: CanvasConfig;
  slides: Slide[];
  assets: AssetRef[];
  scriptSource?: string;
  metadata: AlbumMetadata;
}

// ─── Slide ───────────────────────────────────────────────────

export interface ImageZoneConfig {
  asset?: AssetRef;
  rect: NormalizedRect;
  objectFit: 'cover' | 'contain';
  focalPoint: { x: number; y: number };
  overlayColor?: string;
  overlayOpacity?: number;    // 0.0–1.0
}

export interface BannerConfig {
  family: string;
  position: BannerPosition;
  heightNormalized: number;
  backgroundColor: string;    // token ref e.g. "accent-primary"
  textColor: string;          // token ref e.g. "text-on-accent"
  paddingNormalized: number;
  overlap: 'none' | 'image' | 'content';
}

export interface SourceConfig {
  text: string;
  visible: boolean;
  sizeMode: 'auto' | 'fixed';
  paginationBehavior: 'replace' | 'share-space' | 'hide';
}

export interface SlideMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface Slide {
  id: string;
  number: number;             // 1-based; 1 = cover
  role: 'cover' | 'inner' | 'free';
  archetypeId: string;
  blocks: ContentBlock[];
  banner?: BannerConfig;
  source?: SourceConfig;
  image?: ImageZoneConfig;
  themeOverrides?: Partial<AlbumTheme>;
  notes?: string;
  rawScript?: string;
  metadata: SlideMetadata;
}

// ─── Content Blocks ──────────────────────────────────────────

export interface BlockStyleOverride {
  typographyTokenRef?: string;
  fontWeight?: number;
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
}

export interface BaseBlock {
  id: string;
  type: string;
  position: NormalizedRect;
  zIndex: number;
  visible: boolean;
  styleOverrides?: BlockStyleOverride;
}

// Rich text is stored as TipTap/ProseMirror JSON
export type RichTextContent = {
  type: 'doc';
  content: unknown[];
};

export interface MainTitleBlock extends BaseBlock {
  type: 'main_title';
  content: RichTextContent;
  typographyTokenRef: string;
}

export interface SubtitleBlock extends BaseBlock {
  type: 'subtitle';
  content: RichTextContent;
  typographyTokenRef: string;
}

export interface BodyParagraphBlock extends BaseBlock {
  type: 'body_paragraph';
  content: RichTextContent;
  typographyTokenRef: string;
  kashidaEnabled: boolean;
}

export interface HighlightedPhraseBlock extends BaseBlock {
  type: 'highlighted_phrase';
  content: RichTextContent;
  backgroundColor: string;
  textColor: string;
  typographyTokenRef: string;
}

export interface BulletItem {
  id: string;
  content: RichTextContent;
}

export interface BulletListBlock extends BaseBlock {
  type: 'bullet_list';
  items: BulletItem[];
  bulletStyle: BulletStyle;
  bulletColor: string;
  showDividers: boolean;
  typographyTokenRef: string;
}

export interface NumberedListBlock extends BaseBlock {
  type: 'numbered_list';
  items: BulletItem[];
  numeralStyle: NumeralStyle;
  typographyTokenRef: string;
}

export interface CredentialRow {
  id: string;
  label: string;
  value: RichTextContent;
}

export interface CredentialRowBlock extends BaseBlock {
  type: 'credential_row';
  rows: CredentialRow[];
  typographyTokenRef: string;
}

export interface StatValueBlock extends BaseBlock {
  type: 'stat_value';
  value: string;
  label: string;
  direction?: 'up' | 'down' | 'neutral';
  valueTypographyTokenRef: string;
  labelTypographyTokenRef: string;
  accentColor: string;
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote_block';
  content: RichTextContent;
  attribution: string;
  accentColor: string;
  typographyTokenRef: string;
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  label: string;
  content: RichTextContent;
  backgroundColor: string;
  textColor: string;
  typographyTokenRef: string;
}

export interface SourceLineBlock extends BaseBlock {
  type: 'source_line';
  text: string;
  url?: string;
  typographyTokenRef: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  color: string;
  thickness: number;    // normalized
  orientation: 'horizontal' | 'vertical';
}

export interface ComparisonSide {
  label: string;
  value: string;
  flag?: AssetRef;
  accentColor: string;
}

export interface ComparisonBlock extends BaseBlock {
  type: 'comparison_block';
  leftSide: ComparisonSide;
  rightSide: ComparisonSide;
  dividerLabel?: string;
  typographyTokenRef: string;
}

export interface TimelineItemBlock extends BaseBlock {
  type: 'timeline_item';
  date: string;
  content: RichTextContent;
  accentColor: string;
  typographyTokenRef: string;
}

export interface InfographicRowBlock extends BaseBlock {
  type: 'infographic_row';
  icon?: AssetRef;
  label: string;
  value: string;
  typographyTokenRef: string;
}

export interface IconTextRowBlock extends BaseBlock {
  type: 'icon_text_row';
  icon?: AssetRef;
  content: RichTextContent;
  typographyTokenRef: string;
}

export interface FlagLogoTextRowBlock extends BaseBlock {
  type: 'flag_logo_text_row';
  flag?: AssetRef;
  logo?: AssetRef;
  text: string;
  subtext?: string;
  typographyTokenRef: string;
}

export interface ImageZoneBlock extends BaseBlock {
  type: 'image_zone';
  config: ImageZoneConfig;
}

export type ContentBlock =
  | MainTitleBlock
  | SubtitleBlock
  | BodyParagraphBlock
  | HighlightedPhraseBlock
  | BulletListBlock
  | NumberedListBlock
  | CredentialRowBlock
  | StatValueBlock
  | QuoteBlock
  | CalloutBlock
  | SourceLineBlock
  | DividerBlock
  | ComparisonBlock
  | TimelineItemBlock
  | InfographicRowBlock
  | IconTextRowBlock
  | FlagLogoTextRowBlock
  | ImageZoneBlock;

export type ContentBlockType = ContentBlock['type'];

// ─── Slide Templates ─────────────────────────────────────────

export interface LayoutZone {
  id: string;
  rect: NormalizedRect;
  role: 'image' | 'text_content' | 'banner' | 'footer_chrome' | 'stat' | 'comparison';
  stackingOrder: 'background' | 'content' | 'chrome';
}

export interface SlideTemplate {
  id: string;
  name: string;
  archetype: string;
  zones: LayoutZone[];
  defaultBlocks: Partial<ContentBlock>[];
  channelCompatibility: string[];
  coverCompatible: boolean;
  requiresImage: boolean;
}

// ─── Script Parser ───────────────────────────────────────────

export type SlideArchetypeId =
  | 'standard_title_body'
  | 'bullet_list'
  | 'credentials_profile'
  | 'highlighted_statement'
  | 'data_card'
  | 'mixed_info'
  | 'quote_highlight'
  | 'comparison_vs'
  | 'timeline_sequence'
  | 'infographic_assembly'
  | 'free_slide';

export interface ParsedSlide {
  number: number;
  role: 'cover' | 'inner';
  rawText: string;
  title: string;
  body: string;
  contentTypeSuggestion: SlideArchetypeId;
}

export interface ParsedScript {
  albumTitle: string;
  slides: ParsedSlide[];
}

// ─── Export ──────────────────────────────────────────────────

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'psd' | 'zip';

export interface ExportContext {
  canvasDimensions: CanvasConfig;
  channelProfile: ChannelProfile;
  scale?: number;   // default 2 for retina
}

export interface ExportArtifact {
  format: ExportFormat;
  buffer?: Buffer;
  url?: string;
  filename: string;
}

export interface SlideExporter {
  readonly format: ExportFormat;
  exportSlide(slide: Slide, album: Album, ctx: ExportContext): Promise<ExportArtifact>;
  exportAlbum(album: Album, ctx: ExportContext): Promise<ExportArtifact>;
}

// ─── Guardrails ──────────────────────────────────────────────

export type GuardrailSeverity = 'hard_stop' | 'warning' | 'info';

export interface GuardrailIssue {
  id: string;
  severity: GuardrailSeverity;
  slideId?: string;
  blockId?: string;
  message: string;
  autoFixAvailable: boolean;
  autoFixDescription?: string;
}

export interface GuardrailResult {
  issues: GuardrailIssue[];
  hasHardStops: boolean;
  warningCount: number;
}

// ─── Token Resolution ────────────────────────────────────────

export interface TokenResolutionContext {
  channelProfile: ChannelProfile;
  albumTheme: AlbumTheme;
  canvasConfig: CanvasConfig;
  slideOverrides?: Partial<AlbumTheme>;
  blockOverrides?: BlockStyleOverride;
}

export interface ResolvedTokens {
  // Colors
  accentPrimary: string;
  accentSecondary?: string;
  textOnAccent: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  // Typography
  typography: TypographyProfile;
  // Layout
  density: Density;
  bulletStyle: BulletStyle;
  bulletDividers: boolean;
  // Canvas
  canvasWidth: number;
  canvasHeight: number;
}
