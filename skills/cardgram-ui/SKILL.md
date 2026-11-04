---
name: cardgram-ui
description: Use when modifying CardGram's UI — the Hub, Studio, dashboard, card showcase, glass panels, controls, responsive behavior, visual variants, or any styling that must keep the Aqua Glass Studio identity.
---

# CardGram UI

## Overview

CardGram uses **Aqua Glass Studio**: a bright Frutiger Aero / Y2K-glass language made of aqua-to-sky light, white translucent panels, deep cyan shadows, oversized radii, dense micro-labels and one hero card floating in space.

The source of truth is the project, not this document. Read the current files before changing them; these references explain the intent and the patterns.

## Read in this order

1. `references/design-system.md` — tokens, color, type, glass rules.
2. `references/layouts.md` — Hub, Studio, breakpoints, dimensions.
3. `references/components.md` — components and states.
4. `references/motion-and-3d.md` — motion, CSS card, Three.js contract.
5. `references/source-map.md` — where each rule lives in the code.
6. `references/variants.md` — alternatives without losing the identity.
7. `references/qa-checklist.md` — verify before calling it done.

## Working rules

- **Reuse the existing system.** Prefer the tokens in `assets/css/app.css` §1 and existing classes before adding new CSS.
- **Edit the project files directly.** There is no separate demo or starter: the deliverable is the UI in this repo.
- **Keep one light source.** Shadows fall down-right in deep cyan (`rgba(6,55,74,…)`), never neutral gray.
- **Keep the glass hierarchy.** Ambient field < frosted panel < inset row < raised/active control. Never stack two identical glass surfaces.
- **Aqua is structural.** Use the turquoise→blue gradient for the brand, primary actions, active tabs and edge light; do not flood a large area with it.
- **Radii stay large.** Panels 22–30 px, controls 12–16 px, pills 999 px.
- **Mobile is a different shell.** Hub becomes one column with bottom navigation; Studio becomes a full-bleed stage with an off-canvas drawer.
- **Respect the existing architecture.** Hub routing lives in `assets/js/hub.js`; Studio state and UI sync in `assets/js/app.js`; Three.js in `assets/js/scene.js`; export in `assets/js/export.js`.
- **Do not add a build step, framework or dependency** unless the user explicitly asks.
- **Preserve accessibility.** Tabs need `aria-selected`, icon buttons need labels, focus must stay visible, and `prefers-reduced-motion` must disable ambient loops.

## Choose the area

| Task | Start here |
|---|---|
| Hub layout, topbar, dashboard, library | `assets/css/hub.css` + `index.html` §Hub |
| Studio sidebar, tabs, controls, export | `assets/css/app.css` + `index.html` §Studio |
| Card presentation | `hub.css` §6 (CSS 3D) and `scene.js` §geometry |
| Colors, radii, shadows, type | `app.css` §1 and `design-system.md` |
| New visual direction | `variants.md` |

## Definition of done

- 1600 px, 1024 px and 390 px reviewed.
- No horizontal scroll; 860–980 px checked separately.
- Focus visible on every control; dialogs close with Esc.
- Reduced motion stops orbs, bubbles, card float and shine.
- The page still reads as CardGram with the logo and card art removed.
