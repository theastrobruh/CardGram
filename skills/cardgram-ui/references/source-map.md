# Source map — CardGram v0.4.5

Original project root: `C:\Users\Meghan Camacho\Documents\Repos\CardGram` (adjust if moved). All references below are to that checkout.

## Entry points

| File | Role |
|---|---|
| `index.html` | Whole app shell: SVG sprite, Hub, Studio, dialogs |
| `assets/css/app.css` | Tokens, background, studio shell, controls, export, motion, responsive |
| `assets/css/hub.css` | Hub shell, topbar, dashboard, library, collections, profile, mobile |
| `assets/js/app.js` | Studio state, persistence, presets, uploads, UI sync, keyboard |
| `assets/js/scene.js` | Three.js scene, card geometry, materials, camera, snapshots |
| `assets/js/export.js` | PNG snapshot and MediaStream video export |
| `assets/js/hub.js` | Hash routing, hub rendering, profile/decks, lazy studio init |
| `assets/js/i18n.js` | Studio EN/ES/DE strings |
| `assets/js/hub-i18n.js` | Hub strings |
| `assets/js/community.js` | Community adapter stub, disabled |
| `assets/data/cards/catalog.js` | Card/collection manifest |

## `index.html` map

| Lines | Content |
|---|---|
| 1–33 | Head, CSP, favicon, CSS/JS links |
| 35–221 | Inline SVG icon sprite (`#i-*` symbols) |
| 223–240 | Aero background (`orbs`, `bubbles`) |
| 242–713 | `#hub` — topbar, home dashboard, library, collections, explore, profile |
| 306–485 | Home dashboard: player panel, favourite card, explorer |
| 490–516 | Library panel |
| 521–585 | Collections & decks panel |
| 590–636 | Explore preview panel |
| 641–713 | Profile panel |
| 715–768 | Hub dialogs (deck editor, etc.) |
| 773–1211 | `#sidebar` — brand, tabs, Deck / 3D Forge / Shots / Canvas panes |
| 1253–1298 | `#viewport-container`, stage chips, radial FAB |
| 1300–1389 | Studio dialogs, toasts, cinematic chrome |

## `assets/css/app.css` map

| Section | Lines | What to read |
|---|---|---|
| 1. Tokens | 7–53 | All design tokens |
| 2. Base | 55–153 | Reset, body field, focus, SVG icon contract |
| 3. Aero background | 154–240 | Orbs, bubbles, drift keyframes |
| 4. Floating buttons | 242–360 | Sidebar toggle, cinematic, exit tip |
| 5. Sidebar | 361–723 | Glass panel, header, brand, language, tabs, scroll area |
| 6. Typography & controls | 724–1198 | Section titles, control rows, switches, sliders, segmented, swatches |
| 7. Presets/uploads | 1200–1441 | Preset chips, card upload tiles |
| 8. Scenes | 1442–1548 | Shot cards, saved dots |
| 9. Buttons | 1549–1646 | Primary/ghost/soft/danger |
| 10. Export footer | 1648–1853 | Meta chips, record/snapshot, progress, status |
| 11. Viewport | 1854–2004 | 9:16 stage, chips, hint |
| 12. Radial menu | 2005–2167 | FAB petals and orientation |
| 13. Loading veil | 2168–2238 | Entrance |
| 14. Toasts | 2239–2362 | Toast stack |
| 15. Dialogs | 2363–2514 | Modal, confirm, help |
| 16. Cinematic | 2515–2550 | Clean screen |
| 17. Responsive | 2551–2734 | 980 / 860 / 560 / short landscape |
| 18. Reduced motion | 2735–2773 | Motion and backdrop fallbacks |

## `assets/css/hub.css` map

| Section | Lines | What to read |
|---|---|---|
| 1. View layers | 8–29 | `data-view` shell switching |
| 2. Structure | 30–119 | Fixed hub, scroll container, 1280 shell |
| 3. Topbar | 120–366 | Brand, nav, language, profile |
| 4. Panels/entrance | 368–395 | Panel show + `hubRise` |
| 5. Hero | 397–516 | Hero composition |
| 6. Favourite card | 517–800 | CSS 3D card, orbit, glow, chips |
| 7. Stats | 801–889 | Stat grid |
| 8. Sections/tiles | 890–1181 | Section heads, collection rail, deck tiles |
| 9. View heads/segments | 1182–1328 | Back button, count, segmented, empty state |
| 10. Card grid | 1329–1478 | Library cards |
| 11. Detail/decks | 1479–1759 | Collection and deck detail |
| 12. Explore | 1760–1912 | Preview shell |
| 13. Profile | 1913–2179 | Editor and preview |
| 14. Footer/mobile nav | 2180–2212 | Footer + floating nav |
| 15. Deck dialog | 2213–2299 | Modal |
| 16. Responsive | 2300–2775 | 1080 / 980 / 860 / 560 |
| 17. Reduced motion | 2776–2842 | Motion fallback |
| 18. Dashboard | 2843–4162 | Player, favourite, explorer, responsive at 1240/1080/980/560 |
| 19. Ambient | 4165–4295 | Reactive background layers, tinted glow/shadow, Inkra entry points |
| 20. Card-first mobile | 4296–4733 | Identity chip, vitrine, privacy strip, menu button, card info row, landscape |
| 21. Mobile menu | 4734–5113 | Bottom sheet (studio, Inkra, nav, stats, language) + compact variants + card details sheet |

## `assets/js/app.js` map

| Lines | Concern |
|---|---|
| 7–110 | Version, storage keys, limits, defaults, mutable state |
| 126–235 | Scene bridge, ID/icon helpers, legacy storage migration |
| 253–398 | Sanitizers, load/serialize/persist |
| 399–486 | Toast, confirm dialog, preset/help dialogs |
| 487–588 | i18n application and language menu |
| 592–665 | Tab activation, sidebar, cinematic |
| 666–734 | Scene poses and sequence playback |
| 735–919 | Preset chips, apply/restore/delete/save |
| 920–1082 | Image decode/optimize/upload |
| 1083–1315 | Range, segmented, swatch, sync UI, control binding |
| 1316–1546 | Scene controls, radial FAB, drag/orientation |
| 1547–1690 | Reset, resize, stage ratios, status/progress |
| 1711–1766 | Keyboard shortcuts |
| 1767–2000 | DOM cache, loading/WebGL error, chrome setup |
| 2001–2061 | Init and boot |

## `assets/js/hub.js` map

| Lines | Concern |
|---|---|
| 8–45 | Storage keys, panels, tab map, hub state |
| 149–260 | Sanitize profile/data, load/persist |
| 261–397 | Stats, counts, identity/avatar, card ratio sync |
| 398–598 | Favourite card, explorer filters/rail |
| 599–854 | Library cards, collections, decks |
| 855–1129 | Collection detail, deck detail/edit/create |
| 1130–1300 | Explore shell, profile form/avatar/save |
| 1309–1500 | Panel switching, hash routing, lazy `openStudio` |
| 1501–1773 | Catalog/preset open, delegated hub clicks, showcase tilt, events |
| 1774–1932 | Refresh, export counter, DOM cache, boot |

## `assets/js/ambient.js` map

| Lines | Concern |
|---|---|
| 1–60 | Config, state, colour helpers |
| 60–160 | Palette derivation (HSL clamps, theme colour, accent fallback) |
| 160–250 | Canvas sampling, hue bins, noise threshold |
| 250–330 | Layer cross-fade, `apply()` / `reset()` API |

## `assets/js/scene.js` map

| Lines | Concern |
|---|---|
| 12–67 | Defaults, edge finishes, backgrounds |
| 129–217 | Renderer, camera, controls, materials, environment |
| 219–270 | Lighting and procedural env map |
| 272–397 | Apply settings, gloss/exposure, edge color, background, camera distance |
| 406–498 | Rounded card geometry, bevel, UV remap, front/back faces |
| 503–602 | Full-art shader and mix animation |
| 603–735 | Texture loading, placeholders |
| 736–842 | Pose get/apply, center, animate, float motion |
| 843–1023 | Resize, video renderer, snapshot, context loss, pause |

## Runtime architecture

- **One document, two views.** `body[data-view="hub|studio"]` toggles the shells. The Hub is visible first; the Studio engine is lazy.
- **Hash router.** `#/home`, `#/library`, `#/collections`, `#/collections/<id>`, `#/collections/deck/<id>`, `#/explore`, `#/profile`, `#/studio/deck|3d|anim|canvas`. `hub.js` `applyRoute()` parses and restores state.
- **State is local.** Studio persists `cardgram.settings.v1`, `cardgram.presets.v2`, `cardgram.scenes.v1`. Hub persists `cardgram.profile.v1`, `cardgram.hub.v1`. No backend.
- **Catalog is static.** `assets/data/cards/catalog.js` exposes `collections`, `cards`, `featured`, `byId`, `collectionOf`. Thumbnails live in `thumbs/`.
- **Studio ↔ scene bridge.** `app.js` calls `Scene.*` methods; `scene.js` owns Three.js and never touches the DOM outside its container.
- **Export is client-side.** `export.js` uses `Scene.createSnapshot()` for PNG and `Scene.createVideoRenderer()` + `MediaRecorder` for 9:16 video.
- **i18n is dictionary-based.** `data-i18n` attributes are filled from `i18n.js` / `hub-i18n.js`; language is persisted in settings.
- **Accessibility patterns.** Tabs use `role=tablist/tab/tabpanel`; the hub uses `inert` and `aria-hidden` while in Studio; the drawer restores focus; dialogs use native `<dialog>` where possible.

## Assets

- Full card art: `assets/data/cards/**/FRONT-*.png`, `BACK-BASE.png`.
- Hub thumbnails: `assets/data/cards/**/thumbs/*.webp`.
- Thumbnail generator: `assets/data/cards/tools/make-thumbs.py`.
- Local launcher: `Iniciar_Webapp.bat` (starts a Python server).
- Deployment: `.github/workflows/deploy.yml` → GitHub Pages.

Do not copy the full card art or the 35 MB PSD into another project unless the license and size are appropriate. Replace it with the target project's own imagery and keep the frame/shadow recipe.
