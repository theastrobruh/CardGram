# Starter kit — Aqua Glass Hub + Studio

A dependency-free distillation of CardGram's UI. Open `index.html` through any static server:

```bash
python -m http.server 8000
# http://localhost:8000
```

No build step, no framework, no external requests.

## Files

| File | Purpose |
|---|---|
| `index.html` | Hub and Studio shells, inline SVG icon sprite, demo content |
| `css/tokens.css` | Design tokens, reset, light field, ambient orbs, shared utilities |
| `css/aqua-ui.css` | Components, Hub, Studio, responsive and accessibility |
| `css/themes.css` | Optional Sunset / Cyber / OLED token overrides |
| `js/demo.js` | Shell switching, panels, tabs, flip/tilt, ranges, drawer, toast |
| `assets/*.webp` | Card art for the demo only — replace with your own |

## Use it in a new project

1. Copy the whole folder.
2. Change brand values in `tokens.css` first.
3. Replace the demo content in `index.html`.
4. Replace `assets/*.webp`; keep the 5:7 ratio for cards.
5. Delete the shell you do not need:
   - Showcase/product site: keep the Hub, delete `<section class="studio">` and the studio CSS block.
   - Editor: keep the Studio, delete the Hub, and set `<body data-view="studio">`.
6. Run the checklist in `../../references/qa-checklist.md` (when used from the skill).

## Themes

Append `?theme=sunset`, `?theme=cyber` or `?theme=oled` to the URL. The override files only change tokens and a small set of dark-surface components; the layout is untouched.

To set a theme permanently:

```html
<html lang="en" data-theme="sunset">
```

or set `document.documentElement.dataset.theme = 'sunset'`.

## What is intentionally simplified

- The card is **CSS 3D**, not Three.js. It flips and tilts but has no real lighting or geometry. The Three.js contract is in the skill's `references/motion-and-3d.md`.
- Export buttons show a toast; there is no MediaRecorder/PNG pipeline.
- Content is static; there is no storage, routing or i18n layer.
- The demo uses CardGram's card thumbnails to preserve the visual reference. Replace them before publishing a different product.

## Browser support

Modern evergreen browsers. `backdrop-filter`, `:is()`, CSS custom properties and `dvh`/`svh` are required for the full effect; the fallback for missing backdrop blur is included. Safari needs `-webkit-backdrop-filter`, already present.
