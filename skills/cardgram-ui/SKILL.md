---
name: cardgram-ui
description: Use when building, restyling, or creating variants of CardGram's Aqua Glass Studio interface — Frutiger Aero glassmorphism, aqua-to-sky gradients, game-hub dashboards, 404px studio sidebars, 9:16 trading-card showcases, or any product that should feel like this project.
---

# CardGram UI

## Overview

CardGram's UI is **Aqua Glass Studio**: a bright Frutiger Aero / Y2K-glass language built from aqua-to-sky gradients, white translucent panels, deep cyan shadows, crisp micro-labels and one hero object (the card) floating in space.

It is not generic “glassmorphism”. The identity comes from the specific hierarchy of glass, the blue-green light, the oversized radii, the dense-but-airy dashboard, and the cinematic card presentation.

## Read in this order

1. `references/design-system.md` — tokens, color, type, glass rules.
2. `references/layouts.md` — Hub, Studio, breakpoints, dimensions.
3. `references/components.md` — every reusable component and state.
4. `references/motion-and-3d.md` — motion, CSS 3D card, Three.js handoff.
5. `references/replication-playbook.md` — port this to a new product.
6. `references/variants.md` — create alternatives without losing the DNA.
7. `references/qa-checklist.md` — verify before calling it done.
8. `references/source-map.md` — where each rule lives in the original code.

## Fast path

Copy `assets/starter/` into the target project. It is a dependency-free Hub + Studio demo with a CSS 3D card:

```
assets/starter/
  index.html
  css/tokens.css
  css/aqua-ui.css
  js/demo.js
```

Replace the brand, copy, card art and data. Keep the class names or map them to the target stack. Open `index.html` through a local server.

## Non-negotiables

- **One light source.** The page glows from the top-left/top-center; shadows always fall down-right in deep cyan, never neutral gray.
- **Glass hierarchy is visible.** Ambient background < frosted panel < inset control row < raised active control. Do not put a glass card on a glass card with the same opacity.
- **Aqua is structural, not decorative.** Use the turquoise→blue gradient for the brand mark, primary actions, active tabs and card edge light. Keep body text dark cyan, never pure black.
- **Radii are large.** Panels 22–30 px, controls 12–16 px, pills 999 px. Never 4–8 px except tiny badges.
- **Type is compact and confident.** Micro-labels are uppercase, 800 weight, 0.1–0.13em tracking. Headlines are 800–900 with negative tracking.
- **The hero breathes.** The card or primary object gets the largest empty area and the strongest shadow. Chrome stays at the edges.
- **Motion is slow and expensive.** 0.4–1.4 s entrances on `cubic-bezier(.16,1,.3,1)`; never bouncy except the switch thumb.
- **Mobile is a different shell, not a squeezed desktop.** Hub becomes one column with a floating bottom nav; Studio becomes a full-bleed stage with an off-canvas drawer.

## Choose the shell

| Need | Use | Reference |
|---|---|---|
| Landing, library, profile, community | **Hub**: sticky topbar + max 1280 px dashboard | `layouts.md` § Hub |
| Editor, configurator, canvas, exporter | **Studio**: 404 px glass sidebar + stage | `layouts.md` § Studio |
| Both | Switch with `body[data-view="hub|studio"]`; never render both | `replication-playbook.md` |

## Creating alternatives

Change the tokens first, structure second. The three ready-made directions in `variants.md` are **Sunset Glass**, **Cyber Glass** and **OLED Glass**. Keep the layout, radii and motion; swap the light temperature, accent gradient and panel opacity. If a variant changes more than that, it is a new design system — say so.

## Definition of done

- 1600 px, 1100 px and 390 px screenshots reviewed.
- No horizontal scroll; tablet 860–980 px checked separately.
- Keyboard focus visible on every control; dialogs close with Esc.
- `prefers-reduced-motion: reduce` stops ambient loops and card float.
- Text contrast checked on the lightest and darkest glass.
- The page still reads as CardGram with the logo and card art removed.
