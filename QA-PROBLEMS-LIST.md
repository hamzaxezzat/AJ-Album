# QA Problems List -- AJ Album Platform
## Date: 2026-03-26

---

### Critical (Blocks Usage)

- [ ] P1: **Export error dismiss button is a no-op** -- File: `src/components/Editor/EditorClient.tsx:213` -- Impact: The "X" button on the export error banner calls `onClick={() => {}}`, meaning users cannot dismiss the error banner. Once an export error appears, it stays until the next export attempt.

- [ ] P2: **PngExporter HTML does NOT match SlideRenderer** -- File: `export-service/src/exporters/PngExporter.ts:91-310` -- Impact: The export service generates its own hardcoded HTML with different positions (title at 0.60 vs renderer 0.607, body at 0.73 vs 0.707, widths 0.92 vs 0.8333, image height 0.54 vs dynamic) and different fonts (Cairo heading font vs Al-Jazeera). Exported PNGs will look significantly different from the browser preview. This violates the core architectural guarantee: "the same SlideRenderer component renders in both". The CLAUDE.md states this is MVP-1 work but marks this as the critical architectural bet.

- [ ] P3: **Export HTML ignores all slide-level customizations** -- File: `export-service/src/exporters/PngExporter.ts:91-310` -- Impact: The PngExporter HTML hardcodes font sizes (34px title, 18px body), colors (accent for title, #1A1A1A for body), and positions. It completely ignores: `slideOverrides`, `styleOverrides`, `albumTheme.titleFontSize/bodyFontSize/titleColor`, per-block font size changes, text alignment changes, and banner position. Any customization the user makes in the editor will not appear in the exported PNG.

- [ ] P4: **Export banner always renders in HTML even when slide has `position: 'none'`** -- File: `export-service/src/exporters/PngExporter.ts:302` -- Impact: The export HTML always includes `<div class="banner"></div>` regardless of the slide's banner position setting. A red banner strip will appear in every exported slide even though the editor preview correctly hides it.

- [ ] P5: **Migration force-resets ALL block positions on every load** -- File: `src/store/documentStore.ts:21-29` -- Impact: `migrateAlbum()` unconditionally overwrites `main_title` position to `{x:0.0833, y:0.607, ...}` and `body_paragraph` to `{x:0.0833, y:0.707, ...}` on EVERY load via `loadFromLocalStorage`. Any user who drags/resizes blocks to custom positions will lose their changes the next time the album is loaded. The migration should only apply when the block needs migration (e.g., check if `typographyTokenRef` is missing), not every time.

- [ ] P6: **Migration force-removes banners on every load** -- File: `src/store/documentStore.ts:45` -- Impact: `migrateAlbum()` unconditionally sets `slide.banner.position = 'none'` for every slide on every load. Users who set a banner position in the editor will find it reset to "none" after page reload.

- [ ] P7: **`useExport` hook creates new `GuardrailEngine` and `ZipExporter` instances on every render** -- File: `src/components/Editor/hooks/useExport.ts:31-32` -- Impact: `new GuardrailEngine()` and `new ZipExporter()` are called outside of `useCallback`/`useMemo`/`useState`, meaning they are re-instantiated on every component re-render. While not causing runtime crashes, this is wasteful and the instances are captured in stale closures inside the `useCallback` hooks (lines 35 and 56) because `guardrailEngine` and `zipExporter` are not in the dependency arrays.

- [ ] P8: **Al-Jazeera font files are TTF but `layout.tsx` generates `@font-face` with `format('truetype')` which is correct, BUT the channel profile declares font `'Al-Jazeera'` as the primary font family while no actual `Al-Jazeera` font files exist in `/public/fonts/`** -- File: `config/brands/aj-main.json:142-145` -- Impact: The JSON lists `AlJazeera-Regular.ttf`, `AlJazeera-Bold.ttf` etc at `/fonts/AlJazeera-Regular.ttf`. These files DO exist in `/public/fonts/`. However, the font is registered as `font-family: 'Al-Jazeera'` but the files are named `AlJazeera-*.ttf`. This works fine because `@font-face` family name is independent of filename. This item is OK -- removing from critical.

---

### High (Major UX Issues)

- [ ] P9: **RTL properties panel has wrong border side** -- File: `src/components/Editor/EditorClient.tsx:288` -- Impact: The right `<aside>` panel uses `borderRight: '1px solid #21262d'`. In an RTL layout, the properties panel is on the LEFT side of the screen, so the border should be `borderLeft` (or `borderInlineStart`). The visual separator appears on the wrong edge.

- [ ] P10: **Drag-to-reposition uses scaled canvas dimensions but mouse deltas are in screen pixels** -- File: `src/components/Editor/canvas/useDragBlock.ts:41-42` -- Impact: `useDragBlock` receives `canvasW * canvasScale` and `canvasH * canvasScale` from the caller (line 83-84 of CanvasInteractionLayer), and divides mouse deltas by these values. However, the canvas uses CSS `zoom: canvasScale` (EditorClient.tsx:261), and zoom affects clientX/clientY coordinates differently than transform. When zoom is used, `mousemove` events report coordinates in the zoomed coordinate space, so dividing by `canvasW * canvasScale` double-compensates. This makes drag feel "sluggish" at small scales and "jumpy" at large scales.

- [ ] P11: **Resize handles also have zoom compensation issues** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:99-100` -- Impact: Same issue as P10. The resize handler calculates `scaledW = canvasW * canvasScale` and `scaledH = canvasH * canvasScale` and divides mouse deltas by these. With CSS `zoom`, the mouse coordinates are already in zoomed space, causing incorrect resize behavior.

- [ ] P12: **Footer pagination dots are hardcoded to 3 dots with first always active** -- File: `src/components/SlideRenderer/FooterChrome.tsx:67-79` -- Impact: The footer shows exactly 3 pagination dots with the first always highlighted. It does not reflect the actual slide count or current slide number. For an album with 5+ slides, the dots are misleading.

- [ ] P13: **`handleDeleteSlide` reads stale `album.slides` after `deleteSlide` mutation** -- File: `src/components/Editor/hooks/useSlideManagement.ts:36-37` -- Impact: After calling `deleteSlide(slideId)` (which mutates the Zustand store), the code filters `album.slides` from the closure -- but `album` is the stale reference from before the deletion. While the filter logic happens to work (it re-derives the remaining list), it could select the wrong slide if Immer reuses object references unexpectedly. The `remaining` array is correctly computed from the stale reference because the filter is applied to the pre-mutation list, but the index `idx` was also from the pre-mutation list, so `Math.min(idx, remaining.length - 1)` should be correct. Downgrading but flagging as code smell.

- [ ] P14: **`handleUpdateBlockContent` from canvas does NOT push history snapshots** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:121-129` -- Impact: When editing text inline on the canvas, `handleUpdateBlockContent` does not call `withHistory()` like the other handlers do. This means inline text edits are not undoable via Ctrl+Z. Only panel-based title/body updates push history.

- [ ] P15: **`handleUpdateBannerHeight` does NOT push history snapshot** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:74-79` -- Impact: Adjusting banner height via the slider is not undoable. Other banner changes (position) do push history.

- [ ] P16: **`handleUpdateSource` does NOT push history snapshot** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:81-90` -- Impact: Changing the source text is not undoable.

- [ ] P17: **`handleUpdateLogoVariant` does NOT push history snapshot** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:92-95` -- Impact: Changing logo variant is not undoable.

- [ ] P18: **Image upload stores slide ID as asset ID, breaking when slide is duplicated** -- File: `src/components/Editor/hooks/useBlockUpdates.ts:111` -- Impact: `handleUploadImage` uses `slide.id` as the `asset.id`. When a slide is duplicated (via `JSON.parse(JSON.stringify(src))`), the clone gets a new slide ID but the image asset still references the original slide's ID. Then when saving, `saveToLocalStorage` looks for `slide.image.asset.id` to store the image in IndexedDB -- this will store the image under the original slide's ID, not the cloned slide's ID. The original slide's image will be overwritten, and the cloned slide's image URL `idb://originalSlideId` will point to the wrong data after the original slide's image changes.

- [ ] P19: **Delete album does not clean up IndexedDB images** -- File: `src/components/Dashboard/DashboardClient.tsx:52` -- Impact: When deleting an album, only `localStorage.removeItem` is called. The images stored in IndexedDB (`aj-album-images` store) are never cleaned up, leading to storage leaks over time.

- [ ] P20: **Export service PngExporter does NOT load the Al-Jazeera custom font** -- File: `export-service/src/exporters/PngExporter.ts:112-147` -- Impact: The generated HTML only includes `@font-face` declarations for `IBM Plex Arabic` and `Cairo`, but the channel profile's primary font is `'Al-Jazeera'`. The export HTML uses `font-family: 'IBM Plex Arabic', Cairo, sans-serif` for body and `'Cairo', 'IBM Plex Arabic'` for title. The actual Al-Jazeera branded font will not be used in exports, causing a visual mismatch with the browser preview which does load Al-Jazeera via `layout.tsx`.

---

### Medium (Should Fix)

- [ ] P21: **`useExport` hook has missing dependencies in `useCallback`** -- File: `src/components/Editor/hooks/useExport.ts:53,92` -- Impact: `handleExportSlide` captures `zipExporter` from render scope but does not list it in deps. Same for `handleExportAlbum` with `guardrailEngine`. Since new instances are created each render (P7), each callback captures a potentially stale instance. In practice this works because the instances are stateless, but it is incorrect per React rules.

- [ ] P22: **`selectedBlockForToolbar` calls `useEditorUIStore.getState()` during render** -- File: `src/components/Editor/EditorClient.tsx:103` -- Impact: Calling `getState()` outside a selector bypasses React's subscription system. The toolbar will not re-render when `selectedBlockId` changes. The `selectedBlockId` obtained this way is stale until the next re-render triggered by some other state change.

- [ ] P23: **Canvas uses CSS `zoom` which is non-standard** -- File: `src/components/Editor/EditorClient.tsx:261` -- Impact: CSS `zoom` is supported in Chromium and Safari but not Firefox. Firefox users will see the canvas at full size (1080x1350px) overflowing its container. The recommended approach is `transform: scale()` which is used elsewhere (test-render page, SlideThumbnail). Using `zoom` also causes the drag/resize coordinate issues (P10, P11).

- [ ] P24: **`handleAddSlide` has redundant null check** -- File: `src/components/Editor/hooks/useSlideManagement.ts:22-23` -- Impact: `if (!album) return;` on line 22 followed by `if (album) pushSnapshot(album);` on line 23. The second `if (album)` is always true because the function already returned if album is null. Minor code smell.

- [ ] P25: **Logo image URLs may not exist** -- File: `config/brands/aj-main.json:6-19` -- Impact: Logo references point to `/logos/aj-main/aj-logo-dark.png` and `/logos/aj-main/aj-logo-white.png`. These files DO exist (`public/logos/aj-main/`). However, the `compact` variant reuses `aj-logo-dark.png` rather than the `compact.svg` that is also present. Minor inconsistency.

- [ ] P26: **Script parser treats ALL slide 1 as `highlighted_statement` archetype** -- File: `src/lib/parser/parseScript.ts:81,120` -- Impact: Cover slides are always assigned `highlighted_statement` regardless of content, even when the content has a title + long body that would be better served by `standard_title_body`. This means the cover always shows as a "highlighted statement" in the preview step.

- [ ] P27: **`JSZip` is not installed as a dependency** -- File: `src/lib/export/ZipExporter.ts:85` -- Impact: The build warns about `Module not found: Can't resolve 'jszip'`. The code falls back to a minimal ZIP implementation, but this produces uncompressed ZIP files. The fallback works but users get larger files. JSZip should either be installed or the dynamic import should be removed to avoid the build warning.

- [ ] P28: **`suggestArchetype` bullet heuristic is too aggressive** -- File: `src/lib/parser/parseScript.ts:186-187` -- Impact: Any body with 3+ lines where ALL lines are under 80 chars is classified as `bullet_list`. This catches many standard paragraph texts that happen to be split across short lines. Most Arabic paragraphs with line breaks will be mis-classified as bullet lists.

- [ ] P29: **`CanvasInteractionLayer` overlay blocks pointer events on the underlying `SlideRenderer`** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:148` -- Impact: The interaction layer covers `inset: 0` with `zIndex: 100`. Block overlays only appear for `block.visible` blocks. Non-visible blocks or areas between blocks cannot be interacted with in the renderer below because the overlay div captures all clicks.

- [ ] P30: **`tokensToCssVars` is called but `normalizedToPixelStyle` uses CSS calc with `var(--canvas-width)` which expects `px` units** -- File: `src/lib/tokens/resolveTokens.ts:85-86` -- Impact: The CSS vars are set as `--canvas-width: 1080px` (with `px` suffix). When `normalizedToPixelStyle` uses `calc(var(--canvas-width) * 0.5)`, CSS evaluates `calc(1080px * 0.5) = 540px` which is correct. No issue here -- confirmed working.

- [ ] P31: **`EditorClient` has unused import `BlockStyleOverride`** -- File: `src/components/Editor/EditorClient.tsx:6` -- Impact: Minor -- `BlockStyleOverride` IS used on line 117 so this is actually fine. Removing this item.

- [ ] P32: **`handleToolbarStyle` dependency on `blockUpdates` object causes re-creation every render** -- File: `src/components/Editor/EditorClient.tsx:117-121` -- Impact: `useCallback` depends on `blockUpdates` which is a new object from `useBlockUpdates()` every render (hooks return a new object literal each time). This means `handleToolbarStyle` is re-created every render, defeating the purpose of `useCallback`.

- [ ] P33: **`reorderSlides` does not renumber slides** -- File: `src/store/documentStore.ts:134-142` -- Impact: After reordering slides via `reorderSlides()`, the `number` property is not updated (unlike `addSlide`, `deleteSlide`, and `duplicateSlide` which all renumber). Slide numbers will be wrong after reorder.

- [ ] P34: **Inline text editor background obscures the canvas** -- File: `src/components/Editor/canvas/InlineTextEditor.tsx:135` -- Impact: The inline editor has `background: 'rgba(255,255,255,0.95)'` which makes the text look different from the final render. Users cannot see what the text will actually look like against the slide background while editing inline.

- [ ] P35: **`ImageZone` uses CSS calc expressions referencing `--canvas-width`/`--canvas-height`** -- File: `src/components/SlideRenderer/ImageZone.tsx:12-16` -- Impact: This is consistent with the renderer pattern. However, the `BannerRenderer` and `FooterChrome` also use these vars while `BlockRenderer` uses `normalizedToPixelStyle`. Both approaches work because the CSS vars are set on the root div. No issue -- removing.

- [ ] P36: **Export HTML does not include images from IndexedDB** -- File: `export-service/src/exporters/PngExporter.ts:299` -- Impact: When images are stored in IndexedDB, the in-memory URL is a `data:` URL. The export service receives the full album JSON including the data URL. If an image was loaded from IndexedDB and its data URL is very large, it will work but could hit JSON body size limits (currently set to 50mb). More critically, if the image ref is `idb://...` (not resolved), the export will not show the image. The `loadFromLocalStorage` resolves `idb://` refs to data URLs before the album enters Zustand state, so the export should receive data URLs. This is OK in the current flow.

- [ ] P37: **`handleEditorReady` in CanvasInteractionLayer uses `useCallback` with `onEditorChange` as dep** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:68-70` -- Impact: `onEditorChange` is `setActiveEditor` from `useState`, which is stable. No issue.

- [ ] P38: **`contrastRule` uses `this.id` inside an arrow-less object method** -- File: `src/lib/guardrails/rules/contrastRule.ts:63` -- Impact: The `evaluate` method is written as a regular method on an object literal, so `this` correctly refers to the `contrastRule` object. However, if the method is ever extracted and passed as a standalone function (e.g., `const fn = contrastRule.evaluate; fn(ctx)`), `this` would be undefined. This pattern is consistent across all rules.

- [ ] P39: **`SlideOverridesSection` hex input state initializes once and doesn't track slide changes** -- File: `src/components/Editor/panels/SlideOverridesSection.tsx:38` -- Impact: `useState(effectiveTitleColor)` initializes from the first slide's color. When the user switches to a different slide, `effectiveTitleColor` changes but the `hexInput` state retains the old value because `useState` only uses the initial value once. The hex input field will show the wrong color for newly selected slides.

- [ ] P40: **`AlbumSettingsPanel` hex input has same initialization issue** -- File: `src/components/Editor/panels/AlbumSettingsPanel.tsx:54-55` -- Impact: Similar to P39, `hexInput` and `connectorHexInput` state variables are initialized once and won't update when the album theme changes externally (e.g., via undo/redo).

- [ ] P41: **`HistoryStore` `_applying` flag reset via `setTimeout` is fragile** -- File: `src/store/historyStore.ts:89,110` -- Impact: After undo/redo, `_applying` is set to `true` synchronously and reset via `setTimeout(..., 0)`. If any state update happens in the same microtask queue (e.g., `setAlbum` triggers `saveToLocalStorage` which triggers `pushSnapshot`), the `_applying` guard may not be active yet. The `setTimeout` approach works in practice because `setAlbum` in EditorClient calls `set()` which is synchronous via Immer, but it's a race condition waiting to happen.

---

### Low (Polish)

- [ ] P42: **Arabic plural form for "slide" is always singular** -- File: `src/components/NewAlbum/NewAlbumWizard.tsx:167` -- Impact: The button text shows `{slides.length} شرائح` (plural) even for 1 or 2 slides. Arabic has singular (1), dual (2), and plural (3+) forms. "1 شرائح" is grammatically incorrect; should be "شريحة واحدة" for 1 and "شريحتان" for 2.

- [ ] P43: **Same Arabic plural issue in DashboardClient** -- File: `src/components/Dashboard/DashboardClient.tsx:91` -- Impact: `{albums.length} ألبوم` doesn't use proper Arabic number agreement.

- [ ] P44: **`test-render` page uses emoji in heading** -- File: `src/app/test-render/page.tsx:94` -- Impact: Minor -- emojis in production code. The test page is dev-only so this is negligible.

- [ ] P45: **Left arrow `&#8592;` is used for "back" in RTL context** -- File: `src/components/Editor/EditorClient.tsx:159` -- Impact: In RTL layouts, "back" typically uses a right arrow. The left arrow `<-` visually points the wrong direction for Arabic users.

- [ ] P46: **Same RTL arrow issue in NewAlbumWizard** -- File: `src/components/NewAlbum/NewAlbumWizard.tsx:87` -- Impact: `← العودة` uses left arrow for "back" in RTL. Should be `→ العودة` or a mirrored icon.

- [ ] P47: **`textTransform: 'uppercase'` applied to Arabic labels** -- File: `src/components/Editor/panels/styles.ts:9` -- Impact: Arabic has no uppercase/lowercase distinction. The `textTransform: 'uppercase'` CSS on `LABEL_STYLE` has no effect on Arabic text but is misleading in code.

- [ ] P48: **Footer social handles show all platforms even if they share the same handle** -- File: `src/components/SlideRenderer/FooterChrome.tsx:44` -- Impact: The dedup logic only hides the handle text for consecutive entries with the same handle. If handles are reordered, duplicate handles could show.

- [ ] P49: **No keyboard trap handling when inline editor is active** -- File: `src/components/Editor/canvas/InlineTextEditor.tsx` -- Impact: There is no Escape key handler to close the inline editor. Users must click outside to stop editing. Adding Escape would improve usability.

- [ ] P50: **`SlideStrip` action buttons (duplicate/delete) are very small (16x16px)** -- File: `src/components/Editor/panels/SlideStrip.tsx:149` -- Impact: At 16x16 pixels with 9px font, these buttons are difficult to click, especially on touch devices.

- [ ] P51: **`RichTextEditor` in properties panel lacks Underline support** -- File: `src/components/Editor/RichTextEditor.tsx:44-49` -- Impact: The panel editor includes StarterKit, Highlight, TextStyle, Color but not `Underline`. The FloatingToolbar (canvas) offers underline via the `Underline` extension, but the properties panel RichTextEditor does not. Underline marks applied on-canvas will render but cannot be toggled in the panel.

- [ ] P52: **`compressImage` does not reject on error** -- File: `src/components/Editor/lib/compressImage.ts:15` -- Impact: On image load error, `compressImage` resolves with the original `dataUrl`. This means corrupt or non-image files will be stored without compression. Should ideally warn the user.

- [ ] P53: **`SlideRenderer` logo uses `left` positioning instead of `inset-inline-start`** -- File: `src/components/SlideRenderer/SlideRenderer.tsx:119` -- Impact: Logo is positioned with `left: LOGO_MARGIN_LEFT`. In an RTL layout, `left` positions from the physical left edge. For AJ Arabic this means the logo appears at the top-LEFT of the slide, but AJ reference slides show the logo at top-LEFT (in physical space), which IS correct for their brand. However, using `left` in an RTL document is fragile -- `insetInlineEnd` would be more RTL-appropriate if the logo should be on the inline-start (right) side. Based on references, logo at physical top-left appears correct.

- [ ] P54: **No loading indicator during image compression** -- File: `src/components/Editor/panels/ImageSection.tsx:14-24` -- Impact: `compressImage()` is async but no loading state is shown. For large images, the UI freezes briefly with no feedback.

- [ ] P55: **`handleBlockMoved` does not push history snapshot** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:78-80` -- Impact: Dragging blocks to reposition them on the canvas is not undoable.

- [ ] P56: **Resize operations do not push history snapshots** -- File: `src/components/Editor/canvas/CanvasInteractionLayer.tsx:89-132` -- Impact: Resizing blocks via handles is not undoable.

- [ ] P57: **`AlbumSettingsPanel` `connectorHexInput` doesn't update when theme connector color changes externally** -- File: `src/components/Editor/panels/AlbumSettingsPanel.tsx:55` -- Impact: Same stale-state issue as P39/P40. If connector color changes via undo/redo, the hex input shows the old value.

- [ ] P58: **Export progress shows 0-based index** -- File: `src/lib/export/ZipExporter.ts:86` -- Impact: `onProgress({ current: i, total, ... })` starts at `i=0` for the first slide. The UI in EditorClient.tsx:197 shows `تصدير 0/5` instead of `تصدير 1/5`. Should use `i+1` for user-facing display.

- [ ] P59: **`EditorClient` `useEffect` for loading album has incomplete deps** -- File: `src/components/Editor/EditorClient.tsx:53-57` -- Impact: The ESLint disable comment `// eslint-disable-line react-hooks/exhaustive-deps` suppresses warnings about missing `album`, `clearHistory`, `loadFromLocalStorage` in the deps array. This is intentional to avoid re-loading on every album change, but should be documented more clearly.

- [ ] P60: **No confirmation before deleting a slide** -- File: `src/components/Editor/panels/SlideStrip.tsx:134` -- Impact: The delete button on slide thumbnails immediately deletes without confirmation. Album deletion has a confirm dialog, but slide deletion does not. Users can accidentally delete slides.
