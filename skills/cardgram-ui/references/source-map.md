# Source map — CardGram v0.5.5

Root: `C:\Users\Meghan Camacho\Documents\Repos\CardGram` (adjust if moved). Line numbers are a snapshot; **regenerate them** if the file drifted:

```powershell
Select-String -Path assets\css\hub.css -Pattern '^\s+[0-9]+\. ' | % { "{0,5}  {1}" -f $_.LineNumber, $_.Line.Trim() }
Select-String -Path assets\js\hub.js  -Pattern '^(async )?function ' | % { "{0,5}  {1}" -f $_.LineNumber, ($_.Line -replace '\s*\(.*','') }
```

## Entry points

| File | Lines | Role |
|---|---|---|
| `index.html` | 1545 | Whole shell: SVG sprite, Hub, sheets, Studio, dialogs |
| `assets/css/app.css` | 2779 | Tokens, background, studio shell, controls, export, motion, responsive |
| `assets/css/hub.css` | 5118 | Hub shell, topbar, dashboard, library, collections, profile, ambient, mobile |
| `assets/js/app.js` | 2077 | Studio state, persistence, presets, uploads, UI sync, keyboard |
| `assets/js/hub.js` | 2161 | Hash routing, hub rendering, profile/decks, sheets, lazy studio init |
| `assets/js/scene.js` | 1096 | Three.js scene, card geometry + formats, camera, snapshots |
| `assets/js/ambient.js` | 318 | Card-art palette → `--ambient-*` background tint |
| `assets/js/export.js` | 247 | PNG snapshot and MediaStream video export |
| `assets/js/sound.js` | 675 | Web Audio palette, gesture delegation, sound toggle + persistence |
| `assets/js/i18n.js` | 652 | Studio dictionaries ES/EN/DE + `t()`/`applyLanguage` |
| `assets/js/hub-i18n.js` | 604 | Hub dictionary, merged into `I18N` |
| `assets/js/community.js` | 58 | Community adapter stub, disabled |
| `assets/data/cards/catalog.js` | 154 | Collections/cards manifest |

## `index.html` map

| Lines | Content |
|---|---|
| 1–37 | Head: CSP, description, favicon, CSS/JS links (`?v=&rev=`) |
| 39–236 | Inline SVG sprite (`#i-*` symbols, 24×24) |
| 237–252 | Aero background (orbs, bubbles) |
| 253–890 | `#hub` — ambient layers, topbar, panels, footer, menu button, both sheets |
| 320–522 | Home panel: identity chip (+ full-cover trigger), vitrine, card, tags, name/ⓘ, explorer |
| 524–553 | Library panel |
| 555–622 | Collections & decks panel |
| 624–673 | Explore panel |
| 675–749 | Profile panel |
| 751–758 | Hub footer |
| 759–781 | Mobile nav (hidden; kept for legacy routing state) |
| 783–785 | `#hub-menu-btn` (round, mobile) |
| 787–869 | `#hub-menu-sheet` (player header, studio, Inkra, nav, stats, language, privacy) |
| 871–890 | `#hub-card-sheet` (details: collection, tags, lore) |
| 916–1414 | `#sidebar` — brand, tabs, panes |
| 1014–1104 | Deck pane: presets, Full Art, uploads, **card format select** |
| 1106–1182 | 3D pane: corners, edge, bevel, color, gloss, exposure |
| 1184–1296 | Shots pane: spin, float, camera, backgrounds |
| 1298–1412 | Canvas pane: aspect, scale, export |
| 1417–1499 | `#viewport-container`: stage chips, 9:16 wrapper, hint, radial FAB |
| 1502–1553 | `#deck-dialog` and the closing tags |

## `assets/css/app.css` map

| Section | Lines | What to read |
|---|---|---|
| 1. Tokens | 6–53 | Every design token (colour, glass, depth, radii, type, easing) |
| 2. Base | 54–152 | Reset, body light field, focus ring, icon contract |
| 3. Aero background | 153–240 | Orbs, bubbles, drift keyframes |
| 4. Floating buttons | 241–359 | Sidebar toggle, cinematic, exit tip |
| 5. Sidebar | 360–722 | Glass panel, header, brand, language, tabs, scroll area |
| 6. Typography & controls | 723–1204 | Section titles, control rows, switches, sliders, segmented, swatches, selects |
| 7. Presets/uploads | 1205–1446 | Preset chips, front/back upload tiles |
| 8. Scenes | 1447–1553 | Shot cards, saved dots |
| 9. Buttons | 1554–1652 | Primary/ghost/soft/danger |
| 10. Export footer | 1653–1858 | Meta chips, record/snapshot, progress, status |
| 11. Viewport | 1859–2009 | 9:16 stage, chips, hint |
| 12. Radial menu | 2010–2172 | FAB petals and orientation |
| 13. Loading veil | 2173–2243 | Entrance + WebGL error |
| 14. Toasts | 2244–2367 | Toast stack (raised on mobile by `hub.css` §20) |
| 15. Dialogs | 2368–2519 | Modal, confirm, help |
| 16. Cinematic | 2520–2555 | Clean screen |
| 17. Responsive | 2556–2740 | 980 / 860 / 560 / short landscape |
| 18. Reduced motion | 2741–2779 | Motion and backdrop fallbacks |

## `assets/css/hub.css` map

| Section | Lines | What to read |
|---|---|---|
| 1. View layers | 8–29 | `data-view` shell switching |
| 2. Structure | 30–119 | Fixed hub, scroll container, 1280 shell |
| 3. Topbar | 120–367 | Brand, nav, language, profile |
| 4. Panels/entrance | 368–396 | Panel show + `hubRise` |
| 5. Hero | 397–516 | Hero composition (legacy) |
| 6. Favourite card | 517–803 | CSS 3D card, orbit, glow, chips, `--card-ratio` |
| 7. Stats | 804–892 | Stat grid |
| 8. Sections/tiles | 893–1184 | Section heads, collection rail (incl. `.collection-stack`), deck tiles |
| 9. View heads/segments | 1185–1331 | Back button, count, segmented, empty state |
| 10. Card grid | 1332–1482 | Library cards, `.media-card-thumb` ratio |
| 11. Detail/decks | 1483–1763 | Collection and deck detail |
| 12. Explore | 1764–1916 | Preview shell, `.hub-explorer-art` ratio |
| 13. Profile | 1917–2183 | Editor and preview |
| 14. Footer/mobile nav | 2184–2216 | Footer + floating nav (hidden ≤980) |
| 15. Deck dialog | 2217–2304 | Modal + `.deck-cover-option` ratio |
| 16. Responsive | 2305–2780 | 1080 / 980 / 860 / 560 |
| 17. Reduced motion | 2781–2847 | Motion fallback |
| 18. Dashboard | 2848–4134 | Player, favourite, explorer, responsive 1240/1080/980/560 |
| 19. Ambient | 4135–4276 | `.hub-ambient` layers, tinted glow/shadow, Inkra entry points |
| 20. Card-first mobile | 4277–4736 | Identity chip (only `@`), vitrine, tags row, symmetric name + ⓘ, menu button, landscape |
| 21. Menu + details sheets | 4737–5159 | Player header, bottom sheet, compact variants, card details sheet |

## `assets/js/app.js` map

| Lines | Concern |
|---|---|
| 9–48 | Storage keys, defaults (incl. `cardFormat`), state |
| 51–108 | Catalog bridge, builtin presets, preview maps, mutable flags |
| 203–250 | Legacy storage migration, `safeImageUrl` |
| 254–345 | `sanitizeSettings` (validates `cardFormat`), presets, scenes |
| 346–401 | `loadState`, `serializableState`, persistence |
| 403–590 | Toast/confirm/preset/help dialogs, i18n application, language menu |
| 592–735 | Tabs, sidebar, cinematic, scene poses, sequence playback |
| 739–920 | Preset chips, apply/restore/delete/save |
| 924–1085 | Image decode/optimize/upload, `setupUploads` |
| 1087–1220 | Range/segmented/swatch helpers, `syncUI` (pushes settings + `cardFormat` to `Scene`) |
| 1223–1330 | `setupControls` — every studio binding, incl. `#select-card-format` |
| 1331–1607 | Shots, radial FAB, drag/orientation, resets |
| 1611–1705 | Resize, stage ratios, export size, status/progress |
| 1726–1780 | Keyboard shortcuts |
| 1782–2015 | DOM cache (incl. `el.selectCardFormat`), loading/WebGL error, chrome |
| 2017–2077 | `init()` and boot |

## `assets/js/hub.js` map

| Lines | Concern |
|---|---|
| 8–47 | Storage keys, panels, `hub` state (incl. `activeSheet`) |
| 150–260 | Sanitize profile/data, load/persist |
| 262–402 | Stats, counts, identity/avatar |
| 404–530 | `syncCardRatio` / `refreshCardRatios` / `setupCardRatios`, `renderFavoriteCard` |
| 532–692 | Favourite switching, explorer filters/rail |
| 693–840 | Media cards, library, tabs |
| 840–1188 | Collections, deck detail/edit/create, cover options |
| 1189–1392 | Explore, profile form/avatar/save, `updateLangButtons` |
| 1394–1536 | `openHubSheet` / `closeHubSheet` / focus trap, menu + details triggers, `setActivePanel` |
| 1538–1612 | `showHub`, `navigate`, `applyRoute` |
| 1613–1714 | Loading veil, `openStudio` (lazy `Scene.init`), catalog/preset open |
| 1715–1870 | Delegated hub clicks, showcase tilt, event wiring |
| 1872–1985 | `setupHubEvents` (menu, ⓘ, sheets, uploads, etc.) |
| 1986–2161 | Refresh, export counter, DOM cache, `setupHub` boot |

## `assets/js/scene.js` map

| Lines | Concern |
|---|---|
| 12–76 | `DEFAULTS`, edge finishes, backgrounds, `CARD_FORMATS`, `CARD_BOX` |
| 145–217 | `init()` — renderer, camera, controls, materials, environment |
| 235–270 | Lighting + procedural env map |
| 288–322 | `applySettings` (handles `cardFormat`) |
| 324–347 | `normalizeCardFormat`, `getCardRatio`, `fitCardBox` |
| 348–440 | Gloss/exposure/edge colour/background/camera distance |
| 442–549 | `rebuildCard` — rounded/extruded geometry for the active ratio, UV remap, faces |
| 551–650 | Full-art shader + crossfade |
| 651–786 | Textures, placeholders (auto re-fit on front load), batch loaders |
| 787–824 | Poses: get/apply/center |
| 825–892 | Animate loop, float motion |
| 894–945 | `resize` (stage aspect + DPR) |
| 947–1025 | `createVideoRenderer`, `createSnapshot` |
| 1027–1096 | Context loss/restore, pause, public API (`CARD_FORMATS` exported) |

## `assets/js/ambient.js` map

| Lines | Concern |
|---|---|
| 10–36 | Config, state, cache |
| 37–102 | `rgbToHsl`, `hslToRgb`, `toHex`, `fromHex` |
| 104–158 | `displayColor`, `buildPalette`, `paletteFromAccents` |
| 159–228 | `sampleImage` (44 px canvas, 12 hue bins, 16 % noise guard) |
| 229–278 | Layer cache, `paint` cross-fade, `loadImage` |
| 279–318 | `apply(src, accents)` public API |

## i18n

| File | Lines | Content |
|---|---|---|
| `i18n.js` | 13–631 | `I18N.es` 14–219 · `I18N.en` 220–425 · `I18N.de` 426–631 |
| `hub-i18n.js` | 11–604 | Merges `I18N.es/en/de` (hub keys: nav, home, library, collections, explore, profile, menu, details, Inkra) |

Rule: every visible key needs **three** entries. `data-i18n`, `data-i18n-aria-label`, `data-i18n-title`, `data-i18n-alt` and `data-i18n-placeholder` are all supported.

## Runtime architecture

- **One document, two views.** `body[data-view="hub|studio"]` toggles the shells. The Hub renders first; the 3D engine is lazy (`openStudio` → `Scene.init`).
- **Hash router.** `#/home`, `#/library`, `#/collections`, `#/collections/<id>`, `#/collections/deck/<id>`, `#/explore`, `#/profile`, `#/studio/<tab>`.
- **State is local.** `cardgram.settings.v1`, `cardgram.presets.v2`, `cardgram.scenes.v1`, `cardgram.profile.v1`, `cardgram.hub.v1`, `cardgram.sound.v1`. No backend, no telemetry.
- **Sound is hybrid.** `sound.js` owns one lazy `AudioContext`, a compressor, a noise buffer and the named palette. Five cues (`tap`, `flip`, `open`, `tab`, `error`) play local WAV samples from `assets/data/sounds/`; the rest stay synthesized. `toast()` and hub sheet/card handlers call `Sound.play()`.
- **Catalog is static.** `catalog.js` exposes `collections`, `cards`, `featured`, `byId`, `collectionOf`; thumbnails in `thumbs/`.
- **Studio ↔ scene bridge.** `app.js` calls `Scene.*`; `scene.js` never touches the DOM outside its container.
- **Card geometry** adapts to `CARD_FORMATS` (auto = front texture ratio) inside a fixed 1.35 × 1.89 bounding box, so the camera never needs to re-frame.
- **Export is client-side.** `Scene.createSnapshot()` for PNG, `createVideoRenderer()` + `MediaRecorder` for 9:16 video; both inherit the live camera and the active card format.
- **Hub media** uses `--card-ratio` on every frame (stage, grid thumb, explorer art, deck cover, collection stack) so mixed formats never crop or letterbox.
- **Accessibility patterns.** `role=tablist/tab/tabpanel`, `inert` + `aria-hidden` while in Studio, focus-trapped sheets with Esc, native `<dialog>` for deck/help.

## Assets

- Full card art: `assets/data/cards/database/**/FRONT_*.png`, `BACK_*.png` (1792×2400).
- Hub thumbnails: `assets/data/cards/database/**/thumbs/*.webp` (760 px max).
- Thumbnail generator: `assets/data/cards/tools/make-thumbs.py` (`--root assets/data/cards/database`).
- Local launcher: `Iniciar_Webapp.bat`.
- Deployment: `.github/workflows/deploy.yml` → GitHub Pages.

Do not copy the full card art or the 35 MB PSD into another project unless the license and size are appropriate. Replace it with the target project's own imagery and keep the frame/shadow recipe.
