# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

A **script-driven, channel-profile-locked, Arabic-first editorial album platform** for newsroom social media production. Modeled on Al Jazeera Arabic album workflows. The full architecture plan lives at `/Users/home/.claude/plans/snazzy-petting-horizon.md`.

The designer receives a pre-numbered script → platform parses it → designer chooses visual treatment per slide → exports ZIP of PNGs. Channel identity is fixed at workspace level, not per project.

---

## Commands

Once scaffolded (Next.js 15 + separate export service):

```bash
# Dev
pnpm dev                          # Next.js app (port 3000)
pnpm --filter export-service dev  # Puppeteer export service (port 3001)

# Tests
pnpm test                         # All tests
pnpm test src/lib/tokens          # Specific module
pnpm test:e2e                     # Export parity tests (browser vs Puppeteer)

# Build
pnpm build
docker build -f export-service/Dockerfile .

# Type check
pnpm typecheck
```

---

## Architecture

### Rendering Strategy (Non-Negotiable)

HTML/CSS editor + **server-side Puppeteer export**. This is the only approach that handles Arabic kashida (`text-justify: kashida`) correctly in both preview and export. The same `<SlideRenderer>` React component renders in the browser for preview and via `renderToStaticMarkup` in the Puppeteer export service. Both use Chromium — output is pixel-identical.

**Never replace with**: Fabric.js, Konva, html2canvas, SVG export. These cannot shape kashida.

### Data Model Rules

1. **All positions are `NormalizedRect` (0.0–1.0), never pixels.** Multiply by canvas dimensions only at render time. This is enforced throughout — CSS uses `calc(var(--x) * var(--canvas-width))`.
2. **Token cascade**: `ChannelProfile → AlbumTheme → SlideOverride → BlockOverride` via CSS custom properties. The renderer reads resolved tokens only — no channel-specific code in rendering.
3. **Album is one JSONB document** in PostgreSQL via Prisma. Single source of truth.
4. **`SlideExporter` interface is in MVP-0.** PNG, PDF, PSD are each separate implementations. Never add format-specific logic outside their own exporter class.

### Key Abstractions

```
src/types/album.ts          — Complete TypeScript type system (Album → Slide → ContentBlock)
src/lib/tokens/             — resolveTokens(context) cascade function
src/components/SlideRenderer/ — Shared renderer (editor + thumbnails + preview + Puppeteer)
src/lib/guardrails/         — GuardrailEngine (runs in editor + export gate)
src/lib/export/             — SlideExporter interface + PngExporter, ZipExporter
src/lib/parser/             — Script parser (numbered text → ParsedScript)
config/brands/              — Channel profile JSON files
config/templates/           — Slide archetype JSON files (pure data, no archetype code in renderer)
export-service/             — Separate Docker container: Node.js + Express + puppeteer-cluster
```

### Channel-as-Workspace Model

Channel profile is loaded at login/workspace level. Designers never see a channel picker. Brand-locked elements are not surfaced as UI options at all. The three zones:
- **Locked**: not shown to user (logo, footer, brand font, core colors)
- **Editable**: shown with channel-defined constraints (accent color from palette, banner position from allowed list)
- **Future Free**: Creative Mode Phase 2+

### Canvas Default

**1350 × 1080 (landscape 5:4).** Exposed as `--canvas-width` and `--canvas-height` CSS custom properties on `.slide-root`. Changing size = change `CanvasConfig` values; everything else adapts via normalized coordinates.

### Fonts

IBM Plex Arabic (body) + Cairo (display). Self-hosted WOFF2. **Never load from Google Fonts** — fonts must be available to Puppeteer headless during export. Fonts bundled in `/public/fonts/` and in the export service Docker image.

### State

- `DocumentStore` (Zustand + Immer) — Album JSON, the single source of truth
- `EditorUIStore` (Zustand) — ephemeral: selection, zoom, panel state — never persisted
- `HistoryStore` (Zustand) — 50-step memento snapshots (full document JSON per step)

### Rich Text

TipTap (ProseMirror). Custom marks:
- `highlight` with `color` attr — inline colored background for emphasis
- `lang` with `"ar"` or `"en"` — triggers bidi and font-family switch for mixed runs
- `hardBreak` — designer-inserted line breaks for title composition

### Banner System

Dynamic position per slide: `top | bottom | float-top | float-bottom | none`. Per-slide override of album default. UI shows 5-option visual picker. Guardrail warns when banner position overlaps image `focalPoint`.

### Source Placement

Bottom-right, auto-sized: <20 chars = 100% of caption token, 20–40 = 85%, 40–70 = 70%, >70 = 60% minimum. Never overlaps logo or body text.

### Guardrail Engine

Runs on every document change in the editor AND at export gate. Categories:
- **Hard stops**: contrast <3:1, font not found
- **Soft warnings**: overflow, >40% body bold, >2 highlight colors per slide, banner over focal point
- **Auto-fix**: one-click safe alternative

---

## MVP Phase Structure

### MVP-0 (Weeks 1–4): Foundation — validate before any UI

In strict order:
1. `src/types/album.ts` — complete type system
2. `src/lib/tokens/resolveTokens.ts` + unit tests
3. `config/brands/aj-main.json` — first channel profile
4. `config/templates/standard_title_body.json` — first slide template
5. `<SlideRenderer>` component — renders one slide from data model
6. Puppeteer export service in Docker — same slide renders to PNG

**Gate**: Arabic kashida renders identically in browser and Puppeteer export PNG. All three architectural bets validated before any editor UI work.

### MVP-1 (Weeks 5–12): Usable editor

Project dashboard, script parser, full editor (navigator + canvas + properties panel), all 6 archetypes, TipTap inline editing, image upload, banner system, source system, guardrail engine, AI pipeline, ZIP export.

---

## Non-Obvious Constraints

- Arabic numerals default to Western (0–9); channel profile can switch to Arabic-Indic (٠–٩)
- `text-wrap: balance` applied to all Arabic headlines by default
- `padding-inline-end` (not `padding-right`) for bullet indentation — logical RTL-safe property
- Export service is **not serverless** — Puppeteer needs stable memory and pre-warmed instances. Runs as separate Docker container, proxied by Next.js API routes
- PSD export (Phase 3) uses `ag-psd` and is generated from the **data model**, not rendered pixels. Each `ContentBlock` maps to a specific Photoshop layer type. This works because all positions are already normalized
- `SlideTemplate` JSON defines zones and default blocks. After slide creation, blocks are independently positionable — template is a creation scaffold, not a live binding
- Script parser must always show a review step before committing — AI output is never auto-committed
- `channelProfileId` is immutable after album creation. No channel switching mid-project

---

## Reference Material

- `/Users/home/Projects/AJ-Album/Album-References/` — 44 AJ Arabic album slides (6 families) used for visual analysis
- `/Users/home/Projects/AJ-Album/plan-overview.png` — visual architecture map
- `/Users/home/Projects/AJ-Album/plan-workflow.png` — visual production workflow
- Full master plan: `/Users/home/.claude/plans/snazzy-petting-horizon.md`

---

## Current Scaffold State (MVP-1 editor complete — 2026-03-26)

### Framework
- **Next.js 16.2.1** (React 19, TypeScript 5) with `src/` directory and `@/*` import alias
- App Router, CSS Modules (no Tailwind on canvas — Tailwind deferred to MVP-1 UI chrome)
- pnpm workspace: root app + `export-service/` sub-package

### Files Written

```
src/types/album.ts                          Complete type system (all interfaces)
src/lib/tokens/resolveTokens.ts             Token cascade + CSS var emitter
src/lib/tokens/resolveTokens.test.ts        19 vitest tests — all passing
src/lib/layout/normalizedToPixel.ts         NormalizedRect → CSS calc() helpers
src/components/SlideRenderer/
  SlideRenderer.tsx                         Main renderer (browser + Puppeteer)
  SlideRenderer.module.css                  Canvas root styles
  BlockRenderer.tsx                         All 18 block types rendered
  BlockRenderer.module.css
  BannerRenderer.tsx                        5-position banner strip
  BannerRenderer.module.css
  FooterChrome.tsx                          Locked footer with source scaling
  ImageZone.tsx                             Image + overlay + focal point
  index.ts                                  Barrel export
config/brands/aj-main.json                  Al Jazeera Arabic channel profile
config/templates/standard_title_body.json   First slide template (عنوان + نص)
export-service/
  package.json                              @aj-album/export-service, ESM
  tsconfig.json
  src/index.ts                              Express server (ports 3001)
  src/types/album-types.ts                  Re-exports from src/types/album.ts
  src/exporters/PngExporter.ts             Puppeteer PNG export with kashida HTML
  Dockerfile                               node:20-slim + chromium + Noto fonts
public/fonts/                               6 self-hosted WOFF2 files (downloaded)
  IBMPlexArabic-Regular/SemiBold/Bold.woff2
  Cairo-Regular/SemiBold/Bold.woff2
scripts/download-fonts.sh                   Font download script (versioned URLs)
vitest.config.ts                            Vitest + vite-tsconfig-paths

src/lib/parser/parseScript.ts               Script parser (numbered Arabic text → ParsedScript)
src/store/documentStore.ts                  Zustand+Immer: Album state + localStorage auto-save
src/store/editorUIStore.ts                  Zustand: selectedSlideId, activePanel (ephemeral)
src/components/Dashboard/
  DashboardClient.tsx                       Album grid + empty state + New Album CTA
src/components/NewAlbum/
  NewAlbumWizard.tsx                        2-step wizard: album setup → paste+parse script
src/components/Editor/
  EditorClient.tsx                          3-panel editor: slide strip + canvas + properties
src/app/page.tsx                            → DashboardClient
src/app/album/new/page.tsx                  → NewAlbumWizard
src/app/album/[id]/page.tsx                 → EditorClient (async params)
src/app/test-render/page.tsx                Hardcoded demo slide — diagnose renderer without localStorage
```

### Font Correction
The fontsource package for IBM Plex Arabic is `@fontsource/ibm-plex-sans-arabic`
(NOT `@fontsource/ibm-plex-arabic` — that package does not exist on npm).
Files are named `IBMPlexArabic-*.woff2` locally for readability.

### Deviations from Plan
- **Next.js version**: Plan specified 15, scaffold installed 16.2.1 (latest stable). No functional difference.
- **export-service `puppeteer-cluster`**: MVP-0 uses plain `puppeteer` (simpler). `puppeteer-cluster` is for MVP-1 high-throughput mode.
- **export-service tsconfig `rootDir`**: Omitted (not set) to allow cross-package type imports from `../src/types/album.ts`.

### Post-Reviewer Fixes Applied
After AJ Reviewer audit, three gate conditions were fixed:
1. **`TokenResolutionContext` now requires `canvasConfig: CanvasConfig`** — canvas dimensions come from `album.canvasDimensions`, never hardcoded. Square/vertical formats work automatically.
2. **`PngExporter` now declares `implements SlideExporter`** — interface contract enforced at the class level.
3. **Export HTML now uses CSS custom properties** — `--canvas-width`/`--canvas-height` set on `:root`, all positions use `calc(var(--canvas-width) * N)` matching the browser renderer exactly. No `Math.round()` pixel values.

### Status
- `pnpm typecheck` — zero errors (Next.js app)
- `pnpm --filter @aj-album/export-service tsc --noEmit` — zero errors
- `pnpm test` — 19/19 tests passing (includes canvas config cascade test)
- MVP-0 gate pending: Arabic kashida validation requires running `pnpm dev` + export service together to compare browser vs Puppeteer PNG output

### MVP-1 Notes
- Storage: localStorage (`aj-album-{id}` keys). No database yet.
- `getSavedAlbums()` in documentStore scans all `aj-album-*` localStorage keys
- Script parser splits on bare digit lines; `suggestArchetype()` uses word count + number pattern heuristics
- Canvas displayed at `scale(0.5)` in editor (540px display for 1080px canvas, 675px display height)
- Export button in editor POSTs to export-service at localhost:3001 — must be running separately
- **Data migration**: `documentStore.loadFromLocalStorage` runs `migrateAlbum()` on every load, fixing old landscape albums (1350×1080 → 1080×1350), missing `typographyTokenRef`, and landscape-era block positions (y>0.5 → correct portrait positions)
- **Image upload**: compressImage() resizes to max 1080×1350 at JPEG 82% quality before localStorage (~150-400KB per image)
- **Test page**: `/test-render` renders a hardcoded Arabic demo slide — visit to isolate renderer bugs from localStorage data bugs
