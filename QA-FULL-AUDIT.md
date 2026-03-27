# Full QA Audit -- AJ Album Platform
## Date: 2026-03-26

---

### Build Status
- **TypeCheck**: PASS (zero errors)
- **Tests**: PASS (122/122 tests passing, 5 test files)
- **Build**: PASS with 1 warning (jszip module not found -- falls back to minimal ZIP)

---

### Critical (Blocks Core Usage)

- [ ] C1: **PngExporter uses `right:` for block positioning while browser renderer uses `left:`** -- File: `export-service/src/exporters/PngExporter.ts:136` vs `src/lib/layout/normalizedToPixel.ts:16` -- Impact: The export HTML generates `right:calc(${width}px * ${pos.x})` but the browser renderer uses `left:calc(var(--canvas-width) * ${rect.x})`. In the RTL slide, `left` and `right` are NOT equivalent -- `left:calc(1080 * 0.0556)` puts the block 60px from the LEFT edge, while `right:calc(1080 * 0.0556)` puts it 60px from the RIGHT edge. This means ALL block positions in exported PNGs are horizontally mirrored compared to the browser preview.

- [ ] C2: **PngExporter does not render the channel logo** -- File: `export-service/src/exporters/PngExporter.ts:307-336` -- Impact: The export HTML has no `<img>` tag for the AJ logo. The browser SlideRenderer renders the logo at top-left with zIndex 50. Exported PNGs will be missing the channel logo entirely.

- [ ] C3: **PngExporter hardcodes footer social handles instead of reading from channelProfile** -- File: `export-service/src/exporters/PngExporter.ts:329-330` -- Impact: The export HTML hardcodes `@aljazeerachannel &nbsp; @ajarabic` while the browser renderer reads `channelProfile.footer.socialHandles`. Any channel profile changes to social handles will not be reflected in exports.

- [ ] C4: **PngExporter footer height hardcoded to 0.074 instead of reading from channelProfile** -- File: `export-service/src/exporters/PngExporter.ts:319` -- Impact: The footer height is hardcoded as `0.074` while the browser reads `channelProfile.footer.height`. If the channel profile footer height changes, exports will not match.

- [ ] C5: **PngExporter does not apply the token cascade (resolveTokens)** -- File: `export-service/src/exporters/PngExporter.ts:113-264` -- Impact: The PngExporter builds HTML directly from raw slide/album data without calling `resolveTokens()`. This means: slide-level theme overrides (`slide.themeOverrides`) are ignored for color/typography, album-level `bodyColor`/`titleColor` overrides are partially applied (only `primaryColor` is used), and the entire two-tier customization system (album-global + per-slide overrides) is broken in exports.

- [ ] C6: **PngExporter does not apply kashida to body text** -- File: `export-service/src/exporters/PngExporter.ts:174` -- Impact: The export sets `text-justify:kashida` CSS but does NOT insert tatweel characters like the browser renderer does via `applyKashida()`. The CSS `text-justify:kashida` property alone does not produce Arabic kashida -- it needs the tatweel characters inserted by `kashidaEngine.ts`. Exported text will look significantly different from the browser preview for any slide with kashida enabled.

- [ ] C7: **`credential_row` export renders `value` as plain text instead of rich text** -- File: `export-service/src/exporters/PngExporter.ts:213-216` -- Impact: The export uses `escapeHtml(r.value)` but in the type system, `credential_row.rows[].value` is `RichTextContent`, not a string. This will render `[object Object]` for credential values in exports.

---

### High (Major UX/Logic Issues)

- [ ] H1: **Canvas uses CSS `zoom` which causes drag/resize coordinate mismatch** -- File: `src/components/Editor/EditorClient.tsx:300` + `src/components/Editor/canvas/useDragBlock.ts:42-43` -- Impact: CSS `zoom` makes `clientX/clientY` coordinates report in zoomed space, but `useDragBlock` divides by `canvasW * canvasScale` (line 88-89 of CanvasInteractionLayer) assuming unzoomed coordinates. This double-compensates, causing drag to feel sluggish at small scales and jumpy at large scales. Firefox does not support CSS `zoom` at all -- the canvas will overflow.

- [ ] H2: **Resize handles have same zoom coordinate issues as drag** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:106-111` -- Impact: `scaledW = canvasW * canvasScale` divides mouse deltas by a value that already accounts for zoom, but zoom makes deltas pre-scaled. Resize behavior is incorrect at non-1.0 scales.

- [ ] H3: **`selectedBlockForToolbar` uses `useEditorUIStore.getState()` during render** -- File: `src/components/Editor/EditorClient.tsx:106` -- Impact: Calling `getState()` outside a selector bypasses React subscriptions. The toolbar won't re-render when `selectedBlockId` changes -- it shows stale data until another state change triggers a re-render.

- [ ] H4: **`handleToolbarStyle` depends on `blockUpdates` which is a new object every render** -- File: `src/components/Editor/EditorClient.tsx:127-131` -- Impact: `useCallback` depends on `blockUpdates` which is a fresh object from `useBlockUpdates()` on every render. This defeats memoization -- `handleToolbarStyle` is re-created every render, causing unnecessary re-renders of `FloatingToolbar`.

- [ ] H5: **`SlideOverridesSection` hex input state initializes once and doesn't track slide changes** -- File: `src/components/Editor/panels/SlideOverridesSection.tsx:38` -- Impact: `useState(effectiveTitleColor)` initializes from the first selected slide's color. When switching slides, `effectiveTitleColor` changes but `hexInput` retains the old value. The hex input shows the wrong color for newly selected slides.

- [ ] H6: **`AlbumSettingsPanel` hex inputs have same stale initialization issue** -- File: `src/components/Editor/panels/AlbumSettingsPanel.tsx:65-66` -- Impact: `hexInput` and `connectorHexInput` don't update when album theme changes via undo/redo or theme preset application.

- [ ] H7: **Inline text editor background is opaque white, obscuring canvas** -- File: `src/components/Editor/canvas/InlineTextEditor.tsx:144` -- Impact: `background: '#FFFFFF'` makes the inline editor look completely different from the actual slide rendering. Users cannot see what text looks like against the slide's actual background (which may be an image, colored, etc.) while editing.

- [ ] H8: **No Escape key handler to close inline text editor** -- File: `src/components/Editor/canvas/InlineTextEditor.tsx` -- Impact: Users must click outside to stop editing. Escape key is the standard way to dismiss editors. No keyboard shortcut exists for this.

- [ ] H9: **Image upload stores `slide.id` as `asset.id`, causing issues on duplicate** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:134` -- Impact: When a slide is duplicated via `duplicateSlide`, the clone gets a new slide ID. The `documentStore.duplicateSlide` does update `clone.image.asset.id = newId` (line 158), so this is partially mitigated. However, `handleUploadImage` always sets `asset.id = slide.id`, so if the user uploads an image to the cloned slide, it uses the cloned slide's ID -- which is correct. The original QA item P18 overstated the issue.

- [ ] H10: **RTL properties panel border on wrong side** -- File: `src/components/Editor/EditorClient.tsx:329` -- Impact: `borderRight: '1px solid #21262d'` on the right aside panel. In RTL, the properties panel should use `borderLeft` or `borderInlineStart` for the separator to appear between the canvas and the panel.

- [ ] H11: **No confirmation before deleting a slide** -- File: `src/components/Editor/panels/SlideStrip.tsx:134` -- Impact: The delete button immediately deletes without confirmation. Album deletion has `confirm()` but slide deletion does not. Users can accidentally delete slides with no undo if they haven't made edits that push history snapshots.

- [ ] H12: **Drag-to-reposition does not push history snapshot** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:183` -- Impact: The drag start on line 183 calls `pushSnapshot(album)` correctly, BUT `handleUpdateBlockPosition` in `useBlockUpdates.ts:156-164` does NOT push history. Since CanvasInteractionLayer pushes on mousedown (line 183), the initial position is captured. However, the snapshot is pushed every mousedown whether or not a drag actually occurs (could just be a click). This wastes undo slots.

---

### Medium (Should Fix)

- [ ] M1: **`JSZip` is not installed as a dependency** -- File: `src/lib/export/ZipExporter.ts:140` -- Impact: Build warning `Module not found: Can't resolve 'jszip'`. Falls back to minimal uncompressed ZIP. Users get larger ZIP files. Should either install JSZip or remove the dynamic import to eliminate the build warning.

- [ ] M2: **Export progress shows 0-based index** -- File: `src/lib/export/ZipExporter.ts:88` -- Impact: `onProgress({ current: i, ... })` starts at `i=0`. The UI shows `تصدير 0/5` instead of `تصدير 1/5`. Should use `i + 1` for user-facing display.

- [ ] M3: **`reorderSlides` did not renumber slides** -- File: `src/store/documentStore.ts:168-178` -- Impact: Previously fixed -- the current code DOES renumber slides after reorder (line 175). Removing from issues.

- [ ] M4: **Script parser always assigns `highlighted_statement` to slide 1 (cover)** -- File: `src/lib/parser/parseScript.ts:81,120` -- Impact: Cover slides always get `highlighted_statement` archetype regardless of content analysis. A cover with a long body paragraph would be better served by `standard_title_body`.

- [ ] M5: **Bullet heuristic is too aggressive** -- File: `src/lib/parser/parseScript.ts:188-189` -- Impact: Any body with 3+ lines where ALL lines are under 80 chars is classified as `bullet_list`. Standard Arabic paragraphs with short sentences get mis-classified as bullet lists.

- [ ] M6: **`HistoryStore._applying` flag reset via `queueMicrotask` is fragile** -- File: `src/store/historyStore.ts:94,121` -- Impact: After undo/redo, `_applying` is reset via `queueMicrotask`. If `setAlbum` triggers `saveToLocalStorage` which triggers `pushSnapshot` in the same microtask, the guard may not work. In practice this works because Zustand's `set()` is synchronous, but it's a race condition.

- [ ] M7: **`compressImage` does not reject on error** -- File: `src/components/Editor/lib/compressImage.ts:15` -- Impact: On image load error, `compressImage` resolves with the original `dataUrl` silently. Corrupt or non-image files will be stored without compression or warning.

- [ ] M8: **`LayersPanel` drag-and-drop uses HTML5 API without drag preview** -- File: `src/components/Editor/panels/LayersPanel.tsx:117-129` -- Impact: `handleDrop` uses `sortedBlocks` from the render closure. Since `sortedBlocks` is recreated on each render (spread + sort), and `handleDrop` is a `useCallback` with `[sortedBlocks, onReorderBlocks]` deps, it captures the current order. However, if a render occurs during drag (e.g., due to hover state changes), `sortedBlocks` changes and the callback is recreated, potentially causing the drag to drop at wrong position.

- [ ] M9: **`CanvasInteractionLayer` overlay blocks pointer events on areas between blocks** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:155` -- Impact: The interaction layer covers `inset: 0` with `zIndex: 100`. Areas between visible blocks are not clickable for the renderer below. While this is needed for canvas interactions, it means underlying elements (e.g., image zone click-to-upload) cannot be reached.

- [ ] M10: **`SettingsEditor` theme changes are local state only -- not persisted to any album** -- File: `src/components/Settings/SettingsEditor.tsx:127` -- Impact: The settings page creates preview slides locally and allows theme customization, but theme changes are only persisted via the "save theme" button. The settings page does not modify any existing album's theme. This is by design (it's a theme sandbox), but the UX doesn't make this clear -- users may expect settings to apply globally.

- [ ] M11: **PngExporter `credential_row` renders `value` field as plain string** -- File: `export-service/src/exporters/PngExporter.ts:216` -- Impact: Uses `escapeHtml(r.value)` but `r.value` is `RichTextContent` (an object), not a string. This will output `[object Object]` in the export.  (Duplicated as C7 since it's critical for credential slides.)

- [ ] M12: **`handleAddSlide` has redundant null check** -- File: `src/components/Editor/hooks/useSlideManagement.ts:22-23` -- Impact: `if (!album) return;` followed by `if (album) pushSnapshot(album);`. The second condition is always true. Minor code smell.

- [ ] M13: **`boldRule` only checks `body_paragraph` blocks, not `text_box`** -- File: `src/lib/guardrails/rules/boldRule.ts:51` -- Impact: Text boxes with excessive bold are not flagged. The CLAUDE.md spec says ">40% body bold" which may mean only body paragraphs, but text boxes have the same readability concern.

- [ ] M14: **Left arrow used for "back" in RTL context** -- File: `src/components/Editor/EditorClient.tsx:195` + `src/components/NewAlbum/NewAlbumWizard.tsx:108` -- Impact: `&#8592;` (left arrow) and `← العودة` are used for "back" navigation. In RTL, "back" should use a right arrow since the user reads right-to-left.

- [ ] M15: **`SlideStrip` uses `borderLeft` instead of RTL-safe property** -- File: `src/components/Editor/panels/SlideStrip.tsx:28` -- Impact: `borderLeft: '1px solid #21262d'` is used on the slide strip aside. In RTL, this puts the border on the physical left side. Should use `borderInlineEnd` for the separator between strip and canvas.

---

### Low (Polish/Nice-to-have)

- [ ] L1: **Arabic plural form for "slide" is always plural** -- File: `src/components/NewAlbum/NewAlbumWizard.tsx:174,213` -- Impact: `{slides.length} شريحة مكتشفة` and `{parsed.slides.length} شرائح` don't use proper Arabic number agreement (singular/dual/plural forms).

- [ ] L2: **Same Arabic plural issue in DashboardClient** -- File: `src/components/Dashboard/DashboardClient.tsx:110,152` -- Impact: `{albums.length} ألبوم` and `{album.slideCount} شريحة` don't use proper Arabic number agreement.

- [ ] L3: **`textTransform: 'uppercase'` applied to Arabic labels** -- File: `src/components/Editor/panels/styles.ts:9` -- Impact: Arabic has no uppercase/lowercase distinction. The `textTransform: 'uppercase'` on `LABEL_STYLE` has no visual effect on Arabic text but is misleading in code and causes English labels to be shouted.

- [ ] L4: **Footer social handles dedup only works for consecutive entries** -- File: `src/components/SlideRenderer/FooterChrome.tsx:48` -- Impact: The dedup logic checks `h.handle !== handles[i-1].handle`. If handles are reordered to have non-consecutive duplicates, they could show twice.

- [ ] L5: **SlideStrip action buttons are very small (16x16px)** -- File: `src/components/Editor/panels/SlideStrip.tsx:149` -- Impact: 16x16 pixel buttons with 9px font are difficult to click, especially on touch devices. Should be at least 24x24px for accessibility.

- [ ] L6: **Properties panel `RichTextEditor` lacks Underline support** -- File: `src/components/Editor/RichTextEditor.tsx:44-49` -- Impact: The panel editor has StarterKit, Highlight, TextStyle, Color but not `Underline`. The canvas FloatingToolbar has Underline via the `Underline` extension. Underline marks applied on-canvas will render but cannot be toggled in the panel.

- [ ] L7: **`GuardrailPanel` creates a new `GuardrailEngine` per component instance** -- File: `src/components/Editor/panels/GuardrailPanel.tsx:31` -- Impact: `useMemo(() => new GuardrailEngine(), [])` creates one per mounted component. When switching slides, the component stays mounted so this is fine. But if multiple panels are rendered, each gets its own engine. Minor -- engines are stateless.

- [ ] L8: **`lang` mark in `BlockRenderer` uses same font family for both Arabic and English** -- File: `src/components/SlideRenderer/BlockRenderer.tsx:73-74` -- Impact: Both `lang === 'en'` and the else branch use `"'Al-Jazeera', Cairo, sans-serif"`. The English font should likely use a Latin-optimized font like IBM Plex Arabic or a separate Latin font.

- [ ] L9: **No loading indicator during image compression in some paths** -- File: `src/components/Editor/panels/ImageSection.tsx:36` -- Impact: ImageSection already handles loading state with `setLoading(true/false)` and shows a message. This was fixed from the original QA list.

- [ ] L10: **`overflowRule` uses hardcoded `lineHeight: 1.7`** -- File: `src/lib/guardrails/rules/overflowRule.ts:79` -- Impact: The overflow heuristic uses `1.7` for line height but the actual line height varies per typography token (1.3 for headings, 1.6 for body). This makes overflow detection inaccurate for headings (overestimates) and roughly correct for body text.

- [ ] L11: **`SlideRenderer` logo width calculation is redundant** -- File: `src/components/SlideRenderer/SlideRenderer.tsx:107-109` -- Impact: `LOGO_MARGIN_TOP = Math.round(tokens.canvasHeight * (LOGO.marginTop / tokens.canvasHeight))` simplifies to `Math.round(LOGO.marginTop)` = 90. The complex expression has no effect since the division cancels out. Same for `LOGO_MARGIN_LEFT`. `LOGO_WIDTH = Math.round(tokens.canvasWidth * LOGO.widthFraction)` is the only meaningful calculation.

- [ ] L12: **`ErrorBoundary` does not log error details** -- File: `src/components/ErrorBoundary.tsx:13` -- Impact: `getDerivedStateFromError` captures the error but there's no `componentDidCatch` to log it. Production errors will be silently swallowed with only the message shown to the user.

- [ ] L13: **`SettingsEditor` uses `ExtendedTheme` type with extra fields not in `AlbumTheme`** -- File: `src/components/Settings/SettingsEditor.tsx:119-125` -- Impact: Fields like `bgColor`, `bodyTextColor`, `titleWeight`, `bodyWeight`, `bannerHeight` are settings-only extensions that don't map directly to `AlbumTheme`. When saving a theme, these extended properties are included and may not be recognized by the album editor.

- [ ] L14: **`test-render` page uses emoji in heading** -- File: `src/app/test-render/page.tsx:94` -- Impact: Minor -- emojis in production code. The test page is dev-only.

- [ ] L15: **`DashboardClient` album card thumbnail is a CSS mockup, not an actual slide render** -- File: `src/components/Dashboard/DashboardClient.tsx:138-145` -- Impact: The dashboard shows a simplified CSS-only thumbnail (red banner strip + title text) instead of an actual `SlideThumbnail` render. Users cannot visually distinguish albums.

- [ ] L16: **`parseScript` button text says `← تحليل السكريبت` with left arrow** -- File: `src/components/NewAlbum/NewAlbumWizard.tsx:141` -- Impact: The parse button text `تحليل السكريبت ←` uses a left arrow for "forward" in RTL. Should be `→` for forward/next direction.

- [ ] L17: **`handleDeleteSlide` reads stale `album.slides` after mutation** -- File: `src/components/Editor/hooks/useSlideManagement.ts:36-37` -- Impact: After calling `deleteSlide(slideId)`, the code uses `album.slides` from the pre-mutation closure to compute the remaining list. This works in practice because `filter` re-derives correctly from the stale reference, but it's a code smell.

- [ ] L18: **Export service CORS allows only one origin** -- File: `export-service/src/index.ts:20` -- Impact: `const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'` allows only a single origin. Multiple dev environments or proxied setups won't work. In production, the API proxy handles CORS, so this only affects direct dev access.

---

### Already Fixed (from previous QA)

- [x] P1: Export error dismiss button was a no-op -- fixed: `clearExportError` callback now properly clears state (EditorClient.tsx:249)
- [x] P5/P6: Migration force-reset positions/banners on every load -- fixed: migration now only applies when `isLandscape` is true (documentStore.ts:34,66)
- [x] P7: `useExport` created instances on every render -- fixed: moved to module-level singletons (useExport.ts:21-22)
- [x] P12: Footer pagination dots hardcoded to 3 -- fixed: FooterChrome now accepts `currentSlideNumber` and `totalSlides` props
- [x] P14/P15/P16/P17: Multiple handlers missing history push -- fixed: `handleUpdateBannerHeight`, `handleUpdateSource`, `handleUpdateLogoVariant` now all call `withHistory()`; `handleUpdateBlockContent` now uses `withDebouncedHistory()`
- [x] P19: Delete album does not clean up IndexedDB -- fixed: `DashboardClient.handleDeleteAlbum` now calls `deleteAlbumImages(raw)` before removing localStorage entry
- [x] P33: `reorderSlides` does not renumber -- fixed: line 175 now renumbers all slides after reorder
- [x] P55: `handleBlockMoved` does not push history -- fixed: CanvasInteractionLayer line 183 pushes snapshot on mouseDown before drag
- [x] P56: Resize does not push history -- fixed: CanvasInteractionLayer line 102 pushes snapshot before resize
- [x] P58: Export progress 0-based -- partially addressed (still uses `i` not `i+1`, see M2)

---

### Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 12 |
| Medium | 15 |
| Low | 18 |
| Fixed | 10 |

**Most impactful cluster**: The export service PngExporter (C1-C7) has the highest density of critical issues. It generates HTML that diverges from the browser `SlideRenderer` in multiple ways: mirrored block positions (`right:` vs `left:`), missing logo, missing kashida, hardcoded footer, and no token cascade. The core architectural promise -- "same SlideRenderer renders pixel-identical output" -- is not yet fulfilled.

**Second priority**: Canvas interaction (H1-H2) via CSS `zoom` causes incorrect drag/resize behavior and Firefox incompatibility. Switching to `transform: scale()` (already used by test-render page and SlideThumbnail) would fix all zoom-related issues.

**Third priority**: Stale state issues in hex color inputs (H5-H6) and toolbar data (H3-H4) cause confusing behavior when switching slides or undoing changes.
