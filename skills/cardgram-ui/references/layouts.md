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
- At ≤1080 px hide the profile copy; at ≤980 px hide the center nav; at ≤860 px hide the version badge and show the mobile bottom nav.

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
| ≤980 px | dashboard becomes a single 690 px column: player panel → favourite → (explorer hidden); stats become 5 columns; card stage ~44 vw |
| ≤860 px | topbar compressed, mobile nav fixed at bottom, scroll gets 96 px bottom padding |
| ≤560 px | card 41 vw, stats labels shrink, CTAs full width, nav labels 0.54rem |

### Alternate hub panels

- **My cards**: page head (back circle, title, subtitle, count pill) + segmented All/Saved/Catalog + responsive card grid `repeat(auto-fill, minmax(210px,1fr))`, cards drop to 150 px min on mobile.
- **Collections**: page head with “New deck” primary + two-column catalog rail + full-width dashed empty state.
- **Explore**: preview shell; deliberately disabled, gradient “soon” dot, no fake live data.
- **Profile**: two-column editor + sticky profile summary; one column under 980 px.



### Mobile hub


- One column, 390 px reference width.
- Topbar: brand left, language + avatar right. No center nav.
- Player panel compresses: stats become 5 equal tiles with no icons; CTAs stack; privacy note stays.
- Favourite card is the hero; metadata and CTA follow it.
- Bottom nav is a floating 94 vw glass bar with 5 items: Home, My cards, Collections, Explore, Profile. Safe-area inset at the bottom.

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
