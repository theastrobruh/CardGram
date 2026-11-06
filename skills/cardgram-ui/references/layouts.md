# Layouts

Use the running app as the visual reference. Open it locally with `Iniciar_Webapp.bat` or `python -m http.server 8000`.

## 1. Hub — the lobby


### Anatomy

```
body[data-view="hub"]
└── .hub (fixed, 100dvh, flex column)
    ├── .hub-scroll (the only scroll container, flex column)
    │   ├── .hub-topbar (sticky, full-bleed, outside the shell on purpose)
    │   ├── .hub-shell (max 1280px, centered, flex: 1)
    │   │   ├── main.hub-main
    │   │   │   └── section.hub-panel[data-hub-panel="home|library|collections|explore|profile"]
    │   │   └── footer.hub-footer
    │   └── .aero-bg (fixed orbs/bubbles behind)
    └── nav.hub-mobile-nav (≤860px)
```

### Topbar

- Sticky at `top: 0`, z-index 30.
- Full-bleed: the header is a direct child of `.hub-scroll` (not of `.hub-shell`), so its negative side margins cancel the scroll padding and the background reaches both viewport edges. Its content lives in `.hub-topbar-inner` (flex, 16 px block padding, `max-width: 1280px + 2 gutters`, centred), so the brand stays aligned with the dashboard columns.
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
- Left panel: avatar/identity, divider, the user's **hand of up to 6 featured cards** (`.hub-player-stack`; a fan where the favourite is marked and any card sets the favourite on click, plus a pencil that opens `#hand-dialog` to pick the cards), the **support links** (GitHub · Ko-fi · AstroBruh) and the privacy note pinned to the bottom. The collection counters live only in the profile summary (cards, collections, to review, decks, renders) and the mobile menu sheet.
- Right panel: eyebrow + “Card explorer”, short 2-line description, arrows, segmented All/OG/YGO, a **mode switch** (Carousel · Album · Gacha) and three interchangeable views in the same slot:
  - **Carousel** (`.hub-explorer-spotlight`): one large card with name/meta, index counter and dots.
  - **Album** (`.hub-explorer-album-grid`): 3-column grid of every available card (2×2 when there are ≤4) and the quick-picks row hidden.
  - **Gacha** (`.hub-explorer-hand`): a fanned hand of three random cards that redraws every 5 s; tapping one makes it the favourite.
  Until the user picks a mode, the panel cycles the three every 6 s as a showcase (`hub.explorerShowcase`). The old quick-menu rows are gone.

Responsive:

| Width | Behaviour |
|---|---|
| ≤1240 px | columns 250/1fr/304, gap 13, panel radius 24 |
| ≤1080 px | columns 232/1fr/278, panel padding 14, avatar 52 |
| ≤980 px | dashboard becomes a single 640 px column: identity chip → vitrine + card → name/chips, explorer hidden; the card is sized from `100dvh` (~78–84 vw on phones) |
| ≤860 px | topbar compressed, 5-item bottom nav hidden in favour of the menu button; content panels reserve 96 px at the bottom so nothing rests under the floating button |
| ≤560 px | identity chip stays one row, chips wrap, name/collection step down; very short screens (≤690 px tall) shrink the card further |

### Alternate hub panels

- **My cards**: page head (back circle, title, subtitle, count pill) + segmented All/Saved/Catalog + responsive card grid `repeat(auto-fill, minmax(196px,1fr))`, cards drop to ~150 px min on mobile.
- **Collections**: page head with “New deck” primary + two-column catalog rail + full-width dashed empty state.
- **Explore**: preview shell; deliberately disabled, gradient “soon” dot, no fake live data.
- **Profile**: two-column editor + sticky profile summary; one column under 980 px.



### Mobile hub


- One column, 390 px reference width.
- Topbar: brand at the left, header actions at the right, and the **player identity circle centred above them** at ≤860 px. No language pills, no center nav, no version badge.
- The **player identity circle** is `position: fixed; top: 4px; left: 50%`, 72–84 px, white ring + cyan shadow, with the avatar art filling it; it rises above the topbar and extends a little below it. Name, handle, bio, stats and CTAs stay off-screen.
- The whole circle (`#hub-player-avatar-btn`, `inset: 0`) opens the **profile**. `#hub-player-open` is hidden on mobile. The floating menu button still reaches the full menu sheet.
- Directly under the topbar, `.hub-mobile-datastrip` holds **two live data items** (player · collection) in two equal centred columns with a hairline divider; each value rotates every 4.6 s / 6.2 s (`renderMobileData` + `setupMobileData` in `hub.js`). It is hidden in landscape.
- The hand becomes a **stacked carousel**: two of the selected cards (`.hub-hand-deck-card`) sit behind the main card, peeking out as card edges. Swiping the stage or pressing the large, background-less side chevrons (`.hub-hand-nav`) cycles the favourite through the hand; tapping a peeking card also selects it. A small pencil in the title row opens `#hand-dialog`. The main card keeps the full mobile width.
- The card sits on a **vitrine**: `.hub-card-surface` is a light glass panel (24 px radius, hairline border) that exists only on mobile (`display: contents` on desktop). The card inside is sized by height: `width: min(100% - 6px, (100dvh - var(--hub-card-chrome)) * var(--card-ratio), 460px)` with `--hub-card-chrome: 339px`, which includes the tags and name rows. At 476×891 the card is ~543 px tall.
- **Any card ratio.** `syncCardRatio()` in `hub.js` reads `naturalWidth / naturalHeight` of the image and writes that ratio to its nearest frame — `.hub-card-stage`, `.media-card-thumb`, `.hub-explorer-art`, `.deck-cover-option` or `.collection-stack` — each of which sizes itself with `aspect-ratio: var(--card-ratio, 0.7143)`. Frames therefore hug their art instead of showing filler bars, and `object-fit: contain` guarantees nothing is cropped. `setupCardRatios()` keeps it working for dynamically rendered cards (capture `load` listener + a `MutationObserver` on the hub and the deck dialog).
- Under the vitrine, a row of **three identifier pills** (`#hub-card-tags`): franchise/collection · type or element (`card.attribute || card.type`) · stats (`ATK 2000 · DEF 1700`, `STR 5 · AGI 9 · INT 5`). They never truncate: at ≤380 px the row wraps to two lines, above that it stays on one.
- Then the **card name** plus a 30 px **ⓘ button**. The name row is `position: relative; display: flex; justify-content: center` and the name is `text-align: center` with `padding: 0 40px`; the ⓘ is absolutely pinned to the row's right edge (`right: 0`, vertically centred), so the name owns the full width and its optical centre is the viewport centre (measured 0 px offset at 320–492 px, one or two lines). The collection line and the full tag chips stay hidden; they live in the details sheet.
- A single **circular menu button** (52 px, icon only) floats at `bottom: 24px + safe-area` with **nothing under it**. In landscape (≤560 px tall) it moves to the centre of the topbar so it never touches the card.
- The privacy note lives **inside the menu sheet** (`.hub-menu-privacy`, last row, above the safe area). No strip is pinned to the bottom of the home screen.
- The old 5-item bottom nav is hidden (`.hub-mobile-nav { display: none }`); the sheet replaces it.

### Mobile menu sheet

`#hub-menu-sheet` is a dialog (`role="dialog"`, `aria-modal`, `aria-expanded` on the trigger) with a blurred backdrop and a white sheet sliding from the bottom.

- Order: player header (avatar, name, `@handle`, member since) + close, primary "Open the studio", `Inkra` row, navigation (Home, My cards, Collections, Explore, Profile, synced with `data-menu-nav`), a 4-item collection summary, the EN/ES/DE selector and the privacy note.
- `Esc`, the close button and the backdrop close it; focus moves to the sheet panel (no stray ring) and returns to whichever trigger opened it (the round button or the identity chip). Tab is trapped inside the sheet.
- Under 700 px of height the sheet compacts; under 620 px it drops the summary row and the member line, tightens the nav rows and may use 94 dvh so it still fits without scrolling.
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
| vitrine → tags row | 8 px |
| tags row → name/ⓘ row | 8 px |
| name/ⓘ row → menu button | 22 px (37 px at 320×568) |
| menu button → viewport bottom | 24 px + safe-area |

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
| `xs` | 560–859 | Menu button + privacy strip replace the nav; stage loses chrome |
| `2xs` | <560 | Edge-to-edge stage, compact type |

Test at **1600, 1280, 1024, 900, 768, 492, 390** and **320×568** (smallest phone), plus **844×390** landscape for the hub. The 860–980 px band is where most implementations break: the hub should be single-column but still show the top nav only if it fits; the studio must already be a drawer.

## 4. Z-index ladder

Keep it small and explicit:

| Layer | z |
|---|---|
| Aero background | 0 |
| Hub ambient layer | 1 |
| Hub content | 2 |
| Identity chip trigger (inside the panel) | 2 |
| Sticky topbar | 30 |
| Studio sidebar | 60 |
| Floating menu buttons | 120 |
| Drawer backdrop | 140–160 |
| Hub menu button | 168 |
| Bottom sheets (menu + details) | 240 |
| Dialogs / toasts | 300–600 |
| Cinematic exit | 500 |

Never use `9999` as a shortcut; it makes dialogs and drawers fight.
