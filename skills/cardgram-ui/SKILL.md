---
name: cardgram-ui
description: Use when reading, changing or reviewing CardGram — the hub/lobby, the studio sidebar and 3D stage, card formats, exports, i18n, or any styling that must keep the Aqua Glass Studio identity.
---

# CardGram UI

One static page: `index.html` + `assets/`. Vanilla JavaScript, plain CSS and Three.js r128 from a CDN. **No build step, no framework, no package manager, no server code.** Everything runs from a folder, even `file://`.

Current version: **v0.5.5** (`data-version`, the `?v=` query strings and `APP_VERSION` must move together).

## 60-second map

| File | Owns | Read it when |
|---|---|---|
| `index.html` | All markup: SVG sprite, hub, mobile sheets, studio sidebar, dialogs | You add/rename a node, class or `id` |
| `assets/css/app.css` | Design tokens §1–2, aero background, studio sidebar/stage/controls, dialogs, toasts, responsive | Studio, tokens, global components |
| `assets/css/hub.css` | Lobby: topbar, dashboard, card showcase, library, collections, profile, ambient, mobile hero, sheets | Anything in the hub |
| `assets/js/scene.js` | Three.js: renderer, geometry, materials, card formats, camera, snapshot/video | 3D or exports |
| `assets/js/app.js` | Studio state, settings, controls, presets, uploads, resize, keyboard, export UI | Studio behaviour |
| `assets/js/hub.js` | Lobby state, routing, cards, daily pack, library, decks, profile, tabs, sheets, lazy studio boot | Hub behaviour |
| `assets/js/ambient.js` | Samples the card art and writes `--ambient-*` | Background tint |
| `assets/js/i18n.js` | Studio dictionary ES/EN/DE + language switch | Studio strings |
| `assets/js/hub-i18n.js` | Hub dictionary, merged into `I18N` on load | Hub strings |
| `assets/js/export.js` | Video recording + PNG snapshot plumbing | Export flow |
| `assets/js/sound.js` | Synthesized Web Audio palette, global gesture delegation, sound toggle state | Adding a sound, changing feedback |
| `assets/data/cards/catalog.js` | Collections and cards (front/back/thumbs/lore/stats) | Adding a card or collection |

## Read in this order

1. **This file** (map, rules, gotchas).
2. `references/run-and-debug.md` — serve, verify, inspect runtime state. **Do this before editing.**
3. `references/source-map.md` — exact line ranges per file and per concern.
4. `references/layouts.md` — hub/studio anatomy, breakpoints, z-index ladder.
5. `references/design-system.md` — tokens, glass hierarchy, type.
6. `references/components.md` — every component recipe with class names.
7. `references/motion-and-3d.md` — animations, CSS card, Three.js contract.
8. `references/qa-checklist.md` — run before claiming done.
9. `references/variants.md` — only if the task asks for a different direction.

The project is the source of truth: if a reference disagrees with the code, trust the code and fix the reference in the same commit.

## Fast path: I need to change…

| Task | Start at | Also touch |
|---|---|---|
| Lobby layout / spacing | `hub.css` §18–20, `index.html` `#hub` | `layouts.md` |
| Mobile hero card | `hub.css` §20 (`.hub-card-stage`, `--hub-card-chrome`) | `hub.js` `syncCardRatio` |
| Ambient background | `hub.css` §19 + `ambient.js` | `renderFavoriteCard` in `hub.js` |
| Card tags / details sheet | `index.html` `#hub-card-sheet`, `hub.js` `renderFavoriteCard` + `openCardDetails` | `hub-i18n.js` |
| Bottom menu sheet | `index.html` `#hub-menu-sheet`, `hub.js` `openHubSheet` | `hub.css` §21 |
| Library / explorer / deck frames | `hub.css` §10, §12, §15 + `CARD_RATIO_FRAMES` in `hub.js` | — |
| Studio sidebar control | `index.html` tab pane + `app.css` §5–6 + `app.js` `setupControls` | `i18n.js` ×3 |
| 3D card geometry / formats | `scene.js` `CARD_FORMATS`, `getCardRatio`, `fitCardBox`, `rebuildCard` | `app.js` `state.cardFormat` |
| Camera / poses / float | `scene.js` camera block + `app.js` `setupScenes` | `motion-and-3d.md` |
| Export PNG / video | `export.js` + `scene.js` `createSnapshot` / `createVideoRenderer` | `app.js` `getExportSize` |
| Click / hover / success sounds | `sound.js` palette + `classify()` | `data-sound` on the node, `toast()` in `app.js` |
| Sound on-off UI | `[data-sound-toggle]` in `index.html` | `sound.js` `syncButtons`, `components.md` §23 |
| Any visible string | `i18n.js` (studio) or `hub-i18n.js` (hub) | `data-i18n*` attributes |
| Collection progress / new set | `catalog.js` `setSize` + `hub.js` `makeCollectionCard` | `hub-i18n.js` |
| Daily pack | `hub.js` `renderBooster` / `openBoosterPack` / `claimBoosterPack` | `hub.css` §22, `index.html` `[data-hub-panel="booster"]`, `hub-i18n.js` |
| New catalog card | `assets/data/cards/<COLLECTION>/…` + `catalog.js` | `thumbs/` (WebP) |

## Run and verify

```powershell
python -m http.server 8000   # or Iniciar_Webapp.bat
# http://127.0.0.1:8000/index.html
```

For every change: **screenshot the real page** at 390×844, 492×893 and 1440×900 (plus any size the task names) and compare with the previous state. Do not judge from code.

### The rev rule (this bites every time)

Every asset is referenced with a cache-busting query: `assets/css/hub.css?v=0.5.5&rev=31`.

**After editing any CSS or JS, bump `rev` on every asset tag in `index.html`** (keep them identical):

```powershell
$p='index.html'; $u=New-Object System.Text.UTF8Encoding($false)
$f=Join-Path (Get-Location) $p
$t=[System.IO.File]::ReadAllText($f,$u)
[System.IO.File]::WriteAllText($f,[regex]::Replace($t,'rev=\d+','rev=32'),$u)
```

Symptom when you forget: the browser serves the old file, `data-i18n` shows raw keys, new controls don't exist, and you debug a ghost. **If something "didn't apply", check `rev` before anything else.**

For bulk edits use `[System.IO.File]::ReadAllText/WriteAllText` with `UTF8Encoding($false)` — `Get-Content`/`Set-Content` mangled accents once — or edit with the editor tool.

## Working rules

- **One identity.** Bright aqua field, white translucent glass, deep-cyan shadows, oversized radii, dense micro-labels, one hero card. Never grey borders or neutral shadows.
- **Reuse before inventing.** Tokens live in `app.css` §1; class names are stable and referenced by `hub.js`/`app.js`. Prefer editing an existing rule over adding a parallel one.
- **Cards can be any ratio.** Hub frames take `--card-ratio` (5:7 fallback) from the image; the studio mesh uses `CARD_FORMATS` + `fitCardBox()`. Frames must hug the art: no letterbox bars, no crop.
- **Mobile is a different shell.** Hub ≤980 px: identity chip → vitrine → name + ⓘ → one round menu button → privacy strip. The sheets (`#hub-menu-sheet`, `#hub-card-sheet`) only exist on mobile and are inert on desktop.
- **The studio is lazy.** No WebGL on load. `hub.js` `openStudio()` calls `Scene.init()` once, then `syncUI()`. The render loop pauses off-screen.
- **State is local.** Settings, presets, scenes, hub data and profile live in `localStorage` under `cardgram.*.v*`. No backend; the only network call is the Three.js CDN.
- **No new dependencies** and no build step unless the user asks.
- **Preserve accessibility.** `aria-pressed`/`aria-selected`/`aria-current`, focus-visible, sheet focus trap, `prefers-reduced-motion`.
- **Sound is a garnish.** Five named gestures (`tap`, `favorite`, `nav`, `open`, `error`) play the local samples in `assets/data/sounds/`; the rest of the palette is synthesized. Unlocked by the first gesture, never louder than the UI, always mutable from the hub and the studio. Mark one-off transitions `data-sound="none"` and play their sound from the transition function so a click never doubles.

## Gotchas that cost time

| Symptom | Cause |
|---|---|
| New CSS/JS "does nothing" | Stale `rev` — bump it (`run-and-debug.md` §2) |
| `data-i18n` renders the key | Missing key in **all three** dictionaries, or stale `i18n.js` |
| Card art stretched / cropped | Frame ratio ≠ art ratio, or an `object-fit` mismatch |
| Bottom sheet won't open on desktop | `openHubSheet()` returns early >980 px by design |
| Studio 3D blank | Three.js CDN blocked or WebGL unavailable — the loading veil shows the error |
| Elements overlap at one size | `--hub-card-chrome` / `--card-ratio` interaction; measure, don't guess |
| Accents mangled after a scripted edit | The script wrote the file with the wrong encoding |

## Definition of done

- Reviewed at **1600, 1280, 1024, 900, 768, 492, 390 px** (plus 844×390 landscape when the hub is involved).
- No horizontal scroll, no overlaps, no clipped card, no stray letterbox bars.
- Cards in `auto` and in mixed formats display fully in hub and studio; exports keep the chosen format.
- Keyboard, focus and Esc work on every new control; reduced motion respected.
- Sound toggle reachable in hub (topbar or mobile menu) and studio, state persists, first gesture unlocks audio, zero console errors.
- The page still reads as CardGram with the logo and the card art removed.
- The references in this skill updated if you moved a section or added a component.
