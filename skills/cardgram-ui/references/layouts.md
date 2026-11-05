# Layouts

Use the running app as the visual reference. Open it locally with `Iniciar_Webapp.bat` or `python -m http.server 8000`.

## 1. Hub — the lobby


### Anatomy

```
body[data-view="hub"]
└── .hub (fixed, 100dvh, flex column)
    ├── .hub-scroll (the only scroll container)
    │   ├── .hub-shell (max 1280px, centered)
    │   │   ├── .hub-topbar (sticky)
    │   │   ├── main.hub-main
    │   │   │   └── section.hub-panel[data-hub-panel="home|library|collections|explore|profile"]
    │   │   └── footer.hub-footer
    │   └── .aero-bg (fixed orbs/bubbles behind)
    └── nav.hub-mobile-nav (≤860px)
```

### Topbar

- Sticky at `top: 0`, z-index 30.
- Full-bleed: `margin: 0 calc(-1 * page-gutter)`, `padding: 16px page-gutter`.
- Background `rgba(207,245,245,.93)`, `blur(18px) saturate(140%)`.
- Left: 38 px gradient brand mark + `CardGram` + version badge.
- Center: a glass segmented nav (`Home`, `My cards`, `Collections`, `Explore` with a tiny gradient “soon” dot).
- Right: `EN ES DE` segmented control + pill profile (32 px avatar + name/handle).
- At ≤1080 px hide the profile copy; at ≤980 px hide the center nav and the language pills; at ≤860 px hide the version badge and show the floating menu button.

### Dashboard

Desktop ≥1240 px:

```css
grid-template-columns:
  minmax(250px, 286px)   /* player + stats */
  minmax(360px, 1fr)     /* favourite card hero */
  minmax(292px, 334px);  /* explorer */
gap: clamp(14px, 1.8vw, 24px);
min-height: min(820px, calc(100dvh - 112px));
```

- Outer page gutters remain; panels are 28 px radius with 16–21 px padding.
- Left and right panels are full-height glass columns; the center is **not** a panel — it is open space with a glow and orbit.
- Center column is the visual anchor. Card stage `width: clamp(264px, 23vw, 360px)`, aspect 5:7. The card sits above title, collection, chips and a text link.
- Left panel: avatar/identity, divider, “COLLECTION DATA” micro-label, 2-column stat grid, a full-width render stat, two CTAs, privacy note pinned to the bottom.
- Right panel: eyebrow + “Card explorer”, short 2-line description, arrows, segmented All/OG/YGO, horizontal card rail, “tap a card” hint, quick menu rows, each with a right arrow.

Responsive:

| Width | Behaviour |
|---|---|
| ≤1240 px | columns 250/1fr/304, gap 13, panel radius 24 |
| ≤1080 px | columns 232/1fr/278, panel padding 14, avatar 52 |
| ≤980 px | dashboard becomes a single 640 px column: identity chip → vitrine + card → name/chips, explorer hidden; the card is sized from `100dvh` (~78–84 vw on phones) |
| ≤860 px | topbar compressed, 5-item bottom nav hidden in favour of the menu button; content panels reserve 96 px at the bottom so nothing rests under the floating button |
| ≤560 px | identity chip stays one row, chips wrap, name/collection step down; very short screens (≤690 px tall) shrink the card further |

### Alternate hub panels

- **My cards**: page head (back circle, title, subtitle, count pill) + segmented All/Saved/Catalog + responsive card grid `repeat(auto-fill, minmax(210px,1fr))`, cards drop to 150 px min on mobile.
- **Collections**: page head with “New deck” primary + two-column catalog rail + full-width dashed empty state.
- **Explore**: preview shell; deliberately disabled, gradient “soon” dot, no fake live data.
- **Profile**: two-column editor + sticky profile summary; one column under 980 px.



### Mobile hub


- One column, 390 px reference width.
- Topbar: brand left, avatar right. **No language pills, no center nav, no version badge.**
- The player section is a single **identity chip** (`width: fit-content`, centred, ~42 px): 30 px avatar + name + `@handle`. Bio, edit, stats and CTAs are removed from the screen; the collection data lives inside the menu.
- The card sits on a **vitrine**: `.hub-card-surface` is a light glass panel (24 px radius, hairline border) that exists only on mobile (`display: contents` on desktop). The card inside is sized by height: `width: min(100% - 6px, (100dvh - var(--hub-card-chrome)) * var(--card-ratio), 460px)` with `--hub-card-chrome: 317px`. At 492×893 the card is ~84 vw; at 390×844 the width is the limit.
- **Any card ratio.** `syncCardRatio()` in `hub.js` reads `naturalWidth / naturalHeight` of the image and writes that ratio to its nearest frame — `.hub-card-stage`, `.media-card-thumb`, `.hub-explorer-art`, `.deck-cover-option` or `.collection-stack` — each of which sizes itself with `aspect-ratio: var(--card-ratio, 0.7143)`. Frames therefore hug their art instead of showing filler bars, and `object-fit: contain` guarantees nothing is cropped. `setupCardRatios()` keeps it working for dynamically rendered cards (capture `load` listener + a `MutationObserver` on the hub and the deck dialog).
- Under the vitrine: only the card name plus a 30 px **ⓘ button**. The collection line and the tag chips are not shown on mobile; they live in the details sheet.
- A single **circular menu button** (52 px, icon only) floats above the privacy strip. In landscape (≤560 px tall) it moves to the centre of the topbar so it never touches the card.
- The privacy note is a floating inset strip at the bottom (`left/right: 8px`, `bottom: 6px`, 12 px radius).
- The old 5-item bottom nav is hidden (`.hub-mobile-nav { display: none }`); the sheet replaces it.

### Mobile menu sheet

`#hub-menu-sheet` is a dialog (`role="dialog"`, `aria-modal`, `aria-expanded` on the trigger) with a blurred backdrop and a white sheet sliding from the bottom.

- Order: title + close, primary "Open the studio", `Inkra` row, navigation (Home, My cards, Collections, Explore, Profile, synced with `data-menu-nav`), a 4-item collection summary, and the EN/ES/DE selector.
- `Esc`, the close button and the backdrop close it; focus moves to the sheet panel (no stray ring) and returns to the trigger. Tab is trapped inside the sheet.
- Under 700 px of height the sheet compacts; under 620 px it drops the summary row so it still fits without scrolling.
- Navigating from the sheet closes it (`closeHubMenu({ restoreFocus: false })` from `onHubClick`).

### Card details sheet

`#hub-card-sheet` (opened by `#hub-card-info`) is a compact bottom sheet — same component as the menu, `role="dialog"`, `aria-modal`, `aria-expanded` on the ⓘ.

- Content: "Details" title, `collection · set`, every tag chip (rarity, type, stats) and the card lore in an italic box.
- Tags are rendered twice by `renderFavoriteCard()`: `#hub-card-chips` (desktop layout, hidden under 980 px) and `#hub-card-sheet-chips`.
- Closing returns focus to the ⓘ; `Esc`, the X and the backdrop close it. Crossing to desktop closes it automatically.

### Spacing contract (mobile)

Measured at 320–980 px wide, in EN/ES/DE and with every catalog card:

| Between | Minimum gap |
|---|---|
| topbar → identity chip | 8 px |
| identity chip → vitrine | 9 px |
| vitrine → name/ⓘ row | 10 px |
| name/ⓘ row → menu button | 22 px |
| menu button → privacy strip | 15 px |

Nothing overlaps and the home view never scrolls. Content panels reserve 96 px at the bottom so their last row clears the floating button.

### Ambient background


`assets/js/ambient.js` samples the active card's art on a 44 px canvas, buckets hues into 12 bins weighted by saturation and mid-lightness, and writes three pastel triplets as `--ambient-a/b/c` on `:root` plus `--amb-1/2/3` on one of two `.hub-ambient-layer` elements. The layers cross-fade over 1.4 s, so switching favourites feels like a breath instead of a jump.

- The same triplets tint `.hub-showcase-glow`, the card drop shadow (`--ambient-shadow`) and `<meta name="theme-color">`.
- Colours are lifted to 64–84 % lightness and 47–88 % saturation so dark art still produces a readable, light background.
- Noise guard: a hue must reach 16 % of the dominant bin's weight to be used, so a two-pixel glint never sets the mood.
- If the canvas is tainted (`file://`) or the image fails, the collection accent from `catalog.js` is used instead.
- `prefers-reduced-motion` removes the cross-fade.

### Inkra companion

`Inkra` (https://theastrobruh.github.io/Inkra/) is CardGram's print companion: it lays out card proxies at real scale. On desktop it is a row in the player panel actions; on mobile it is the second row of the menu sheet. Always `target="_blank"` + `rel="noopener noreferrer"`. It cannot be embedded (CSP `default-src 'self'`), so it always opens in a new tab.


## 2. Studio — the editor


### Anatomy

```
body[data-view="studio"]
├── aside#sidebar (404px glass panel, 14px margin)
│   ├── header.app-header (brand + home/lang/help)
│   ├── nav.nav-tabs (Deck · 3D Forge · Shots · Canvas)
│   ├── div.scroll-content (the only scrolling area)
│   │   └── section.tab-pane (one active)
│   └── footer.export-footer (fixed at panel bottom)
└── main#viewport-container
    ├── .stage-chips (LIVE · 9:16 · HD)
    ├── #canvas-window-wrapper (9:16 stage)
    ├── .viewport-hint
    └── .flower-fab-container (radial menu)
```

### Sidebar

- The **Deck** pane starts with the presets rail, the Full Art toggle and the front/back upload boxes; right after them comes **Card format** — a full-width `<select>` (`#select-card-format`) with `auto`, standard TCG (63 × 88 mm), Yu-Gi-Oh! (59 × 86 mm), Tarot (70 × 120 mm), Mini Euro (45 × 68 mm), landscape (88 × 63 mm) and square (70 × 70 mm).
- `auto` follows the loaded artwork: `scene.js` reads the front texture and rebuilds the mesh with `fitCardBox()`, so the card keeps the same bounding box (1.35 × 1.89 units) in every format and the default camera framing never needs to change. The chosen format is part of `cardgram.settings.v1` and drives the 3D mesh, the live viewport and both exports.

- `flex: 0 0 404px`, height `calc(100% - 28px)`, margin 14px 0 14px 14px.
- Radius 30 px; glass gradient `165deg, rgba(255,255,255,.62) → rgba(238,252,251,.42) → rgba(226,248,252,.5)`.
- `backdrop-filter: blur(28px) saturate(150%)`; shadow `--shadow-xl`.
- Header has 20 px top padding and 70 px left padding to clear the floating menu button.
- Tabs are a 5 px padded glass strip with 4 equal columns; each tab is icon-over-label, 0.61rem, active = near-white raised tile.
- Content scrolls independently; export footer stays fixed and uses a top hairline + upward shadow.

### Stage

- `flex: 1`, centered, padding 26 px, overflow hidden.
- A soft radial white/aqua glow sits behind the stage.
- 9:16 stage card: 28 px radius, aqua gradient, white border, huge shadow, inset vignette.
- Stage chips float top-center; hint bottom-left; radial FAB bottom-right.
- At ≤860 px: sidebar becomes a fixed off-canvas drawer `min(88vw,380px)`, stage fills 100dvh, chips stay top-center.
- At ≤560 px: stage is edge-to-edge with 0 radius; chips hidden; FAB 16 px from edges.




### Mobile studio


Only the stage remains visible. The menu button top-left opens the sidebar; home and cinematic eye float top-right. The card is the entire experience.

## 3. Breakpoint contract

| Token | Value | Meaning |
|---|---|---|
| `2xl` | ≥1440 px | Full 3-column dashboard, 404 px sidebar |
| `xl` | 1240–1439 | Tighter dashboard columns |
| `lg` | 1080–1239 | Profile copy hides, sidebar still fixed |
| `md` | 980–1079 | Hub nav hides; studio sidebar narrows to 370 |
| `sm` | 860–979 | Hub single column; studio drawer takes over |
| `xs` | 560–859 | Mobile hub nav appears; stage loses chrome |
| `2xs` | <560 | Edge-to-edge stage, compact type |

Test at **1600, 1280, 1024, 900, 768, 390**. The 860–980 px band is where most implementations break: the hub should be single-column but still show the top nav only if it fits; the studio must already be a drawer.

## 4. Z-index ladder

Keep it small and explicit:

| Layer | z |
|---|---|
| Aero background | 0 |
| Hub content | 2 |
| Sticky topbar | 30 |
| Studio sidebar | 60 |
| Floating menu buttons | 120 |
| Mobile nav / drawer backdrop | 140–160 |
| Modal / toast | 300–500 |
| Cinematic exit | 500 |

Never use `9999` as a shortcut; it makes dialogs and drawers fight.
