// export-service/src/types/album-types.ts
//
// Re-exports the canonical type system from the Next.js app.
// The export service shares the same data model — it does NOT duplicate types.
//
// Note: TypeScript resolves this via relative path because the export service
// is a separate package. In a monorepo with a shared package this would be
// imported from @aj-album/types instead.

export type {
  Slide,
  Album,
  ExportContext,
  ExportArtifact,
  SlideExporter,
  ExportFormat,
  ChannelProfile,
  CanvasConfig,
  ContentBlock,
  RichTextContent,
  ResolvedTokens,
  AlbumTheme,
} from '../../../src/types/album.js';
