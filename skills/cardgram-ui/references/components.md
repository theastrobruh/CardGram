# Components

Every recipe assumes the tokens in `design-system.md`. Prefer the existing class names in `index.html` and the CSS so the next agent can recognize the system.

## 1. Buttons

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 38px; padding: 10px 14px;
  border-radius: 13px;
  font-size: .72rem; font-weight: 800; letter-spacing: .01em;
  transition: transform .2s var(--ease), box-shadow .2s ease, filter .2s ease;
}
.btn .icon { width: 15px; height: 15px; }
.btn:active { transform: translateY(0) scale(.985); }
```

| Variant | Surface | Text | Border / shadow |
|---|---|---|---|
| Primary | `var(--accent)` | white, tiny dark text-shadow | white .42 border, `0 10px 24px rgba(47,143,221,.34)` + inset-hi |
| Ghost | `rgba(255,255,255,.46)` | `--ink-soft` | white .76 border, `--shadow-sm` |
| Soft | `rgba(255,255,255,.56)` | `#0a6b78` | white .82 border, inset-hi |
| Danger | `rgba(255,255,255,.60)` | `#9f1d2c` | red .2 border |
| Icon | 38×38, radius 13 | `--ink-soft` | same as ghost |

Primary gets a `::after` top sheen (`linear-gradient(180deg, rgba(255,255,255,.32), transparent 48%)`) and brightens 6% on hover. Disabled: `filter: grayscale(.4) brightness(.94); opacity: .72`.

Sizes: default 38–42 px, `btn-sm` 7×10 px radius 11, hero CTA 42 px, export primary 48 px.

## 2. Panels and tiles

```css
.panel {
  padding: 16–21px;
  border-radius: 28px; /* 24 at 1240, 22 at 1080 */
  background:
    linear-gradient(158deg, rgba(255,255,255,.66), rgba(255,255,255,.30)),
    radial-gradient(120% 80% at 0 0, rgba(124,235,221,.20), transparent 62%);
  border: 1px solid rgba(255,255,255,.84);
  box-shadow: 0 24px 54px rgba(8,62,82,.12), inset 0 1px 0 rgba(255,255,255,.94);
  backdrop-filter: blur(22px) saturate(135%);
  overflow: hidden;
}
```

Right-hand panels bias the inner radial toward sky blue instead of mint. Add one decorative blurred orb `::after` at top-right; keep it under 12% opacity.

**Stat tile** (`.hub-player-stat`): 16 px radius, 13×12 padding, glass level 2, icon in a 25 px rounded square top-right, value 1.35–1.72rem, label .58rem 800, sub .51rem muted. Hover lifts 2 px. The wide variant spans both columns and lays out horizontally.

**Control row** (`.control-row`): 16 px radius, 9×12 padding, 8 px bottom gap, label left, value right. Use `flex-direction: column` for sliders so the value chip sits above the track.

## 3. Section header

```html
<h2 class="section-title">
  <svg class="icon"><use href="#i-sparkles"></use></svg>
  <span>DESIGNS &amp; PRESETS</span>
</h2>
<p class="section-hint">Pick a saved preset or load the front and back of your card.</p>
```

`.section-title` is a flex row: 13 px icon (75% opacity), 0.64rem / 800 / .13em uppercase, `#0a6b78`, followed by a 1 px gradient rule that fades right. First child has no top margin.

## 4. Segmented control

- Container: 4 px padding, radius 14, `rgba(255,255,255,.34)`, white .48 border, inset-hi.
- Item: equal flex, 7×5 padding, radius 10, .66rem 700, muted text.
- Active: near-white vertical gradient, `0 3px 9px rgba(8,62,82,.14)`, aqua text/icon.
- Use for All/Saved/Catalog, All/OG/YGO, language, aspect ratio, duration.

The hub navigation uses the same pattern at a larger scale: 16 px radius container, 12 px radius items, 0.7rem labels, active tile near-white.

## 5. Chips and badges

| Chip | Recipe |
|---|---|
| Metadata chip | 999 px, 4×9, mono .57rem 700, `#0a6b78` on white .60, white .85 border, inset-hi |
| Kicker | 999 px, 6×12, .58rem 800 uppercase .10em, white .50, blur 10 |
| Count pill | white .60, .68rem 800, min 28 px height |
| Status dot | 6 px circle, `#1aa88f`, 3–4 px translucent halo; red for recording, blue for sky |
| Soon dot | 5 px gradient orange→pink, 3 px halo |
| Version badge | mono .58rem 700, white .68, 999 px |

Never use a dark chip unless the surface is the OLED variant.

## 6. Card presentation (hub)

The hero card is a CSS 3D object — no WebGL — inside an optional vitrine:

```html
<div class="hub-card-surface">                 <!-- mobile panel; display:contents on desktop -->
  <div class="hub-card-stage" id="hub-card-stage">  <!-- --card-ratio, aspect-ratio -->
    <div class="hub-card-tilt">
      <button class="hub-card" aria-pressed="false">   <!-- click/tap flips; drag rotates -->
        <span class="hub-card-inner">
          <span class="hub-card-face hub-card-front"><img></span>
          <span class="hub-card-face hub-card-back"><img></span>
        </span>
      </button>
    </div>
  </div>
</div>
```

```css
.hub-card-stage { --card-ratio: .7143; aspect-ratio: var(--card-ratio); perspective: 1500px; }
.hub-card-face img { width: 100%; height: 100%; object-fit: contain; }
.hub-card-tilt, .hub-card, .hub-card-inner { transform-style: preserve-3d; }
.hub-card-face { position: absolute; inset: 0; overflow: hidden; backface-visibility: hidden; }
.hub-card-back { transform: rotateY(180deg); }
```

- `--card-ratio` is written by `syncCardRatio()` from `naturalWidth / naturalHeight`, so 5:7, Yu-Gi-Oh!, tarot or landscape art gets a frame of its own shape. `contain` + matching frame = no crop and no filler bars.
- Mobile sizing: `width: min(100% - 6px, (100dvh - var(--hub-card-chrome)) * var(--card-ratio), 460px)`; `--hub-card-chrome` is tuned per breakpoint in §20.
- Desktop: `width: clamp(212px, 21vw, 292px)`; the stage keeps `aspect-ratio` so the height follows the art.
- Face shadow: `0 36px 64px hsl(var(--ambient-shadow) / .34), 0 6px 16px …` + inset white highlight.
- Hover shine: 112° white band on `.hub-card-front::after`, `mix-blend-mode: screen`, 8 s loop.
- Idle: 11 s translateY ±6 px + rotateY ±5° + rotateX ±1.5°; entrance 2.1 s from translateY 52 px / scale .82 / blur 14 px.
- Interaction (`setupCardInteraction()`): hover only tilts (±7° X / ±9° Y); click or tap flips (`is-flipped`); drag on `#hub-card-stage` rotates to inspect the edges (clamped ±30° X / ±68° Y, `touch-action: none`), pauses the idle, then springs back in .7 s and swallows the click that would have flipped it. Any change here needs the touch path re-tested, not just the mouse.
- Below the stage: `.hub-card-meta` = `.hub-card-tags` (three pills) → `.hub-card-title-row` (name + ⓘ) → on desktop `.hub-card-sub` and `.hub-card-chips`.

**Identifier pills** (`#hub-card-tags`, mobile only): three `.hub-card-tag` spans rendered by `renderFavoriteCard()` — `collection.name`, `card.attribute || card.type`, and `stats` joined with ` · `. 999 px radius, `.5rem` 700 `#0a6b78`, white .56 with a white .88 border and a 3 px inset highlight; `flex-wrap: nowrap` above 380 px, `wrap` below it so nothing truncates. The same data appears as `.hub-chip` in the details sheet.

**Symmetric title row:** `.hub-card-title-row` is `position: relative; display: flex; justify-content: center; width: 100%`, the name is `text-align: center` with `padding: 0 40px`, and the ⓘ is `position: absolute; right: 0; top: 50%; transform: translateY(-50%)`. The name therefore owns the full width and its text centre matches the viewport centre exactly (verified at 320/390/489/492 for every card); the padding reserves the button's gutter without shifting the text. Never centre name + button as a flex group, and never give the button its own grid track — its min-content width unbalances the tracks.

Never hard-code `5 / 7` again: every card frame in the hub reads `--card-ratio`.

## 7. Sliders

- Track: 6 px high, radius 999, inset shadow.
- WebKit fill is a hard-stop gradient driven by `--fill` (set in JS): `#35c8c3 → #55cfe0 var(--fill), rgba(255,255,255,.52) var(--fill)`.
- Thumb: 18 px white gradient circle, 2 px white border, `0 2px 7px rgba(6,55,74,.3)` + 4 px aqua halo.
- Hover/focus: scale 1.12 and 6 px halo.
- Always show the numeric value in a mono chip above the track.

```js
const pct = (value - min) / (max - min) * 100;
input.style.setProperty('--fill', pct + '%');
```

## 8. Switch

44×25 track, radius 999, `rgba(7,51,63,.18)`, white .82 border, inset-low. Thumb 19 px white circle at 2 px inset; checked track uses `--accent`, thumb translates 19 px with `--ease-bounce`. Label + “N/A” state to the left, switch to the right. Disabled row: opacity .56.

## 9. Select

Appearance none, 7×28×7×10 padding, radius 11, 0.72rem 600, white .72, white .92 border, chevron SVG at right 9 px. Focus adds a 3 px aqua ring. Option background `#f2fffd`, text `#07333f`.

## 10. Swatches

Four-column grid, 6 px gap. Each swatch: 7×3 padding, radius 12, label .58rem 700, transparent border. Active gets white surface, white .95 border, `0 3px 10px` shadow. Dot 20 px with inset highlight:

- Black: `linear-gradient(145deg,#3a4550,#0a0d10 70%)`
- Gold: `linear-gradient(145deg,#ffe9a3,#d4af37 48%,#8a6416)`
- Silver: `linear-gradient(145deg,#fff,#c9ced8 48%,#7d8592)`
- White: `linear-gradient(145deg,#fff,#f1f3ef 60%,#d7dcd3)`

Background swatches use 3 columns, 30 px preview strip, 8 px radius, plus a checkerboard for transparent.

## 11. Studio tabs

Four equal columns. Each is a vertical icon+label, 7×2×6 padding, radius 13, 0.61rem 700. Active tile is near-white with a 5 px/14 px shadow. Keep the icon 17 px, 80% opacity; active 100% + aqua. On mobile the labels stay, the entire tab strip stays 4-up.

## 12. Export footer

```
padding: 12px 16px calc(14px + env(safe-area-inset-bottom));
background: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.46));
border-top: 1px solid rgba(255,255,255,.6);
box-shadow: 0 -8px 24px rgba(8,62,82,.05);
```

- Meta row: 9:16 + 1080p chips left, duration right, .61rem.
- Actions: primary record button flex 1, min-height 48; square snapshot 48×48 radius 15.
- Status: 6 px dot + .62rem text; recording = red pulsing, success = green, error = dark red.
- Progress: 6 px white track, aqua→blue fill with a glow.

## 13. Dialog and toast

- Overlay: `rgba(5,43,55,.28)` + `blur(4px)`.
- Dialog: max 440 px, 24–26 px radius, `rgba(255,255,255,.92)`, 1 px white border, `--shadow-xl`, 20–24 padding.
- Title 1.15rem 800; body .82rem; actions right-aligned with ghost + primary.
- Toast: bottom center, glass pill/panel, max 420 px, 14 px radius, icon + message + optional action + close. Enter with translateY 12→0 and fade 220 ms; auto-dismiss 3.6 s.

## 14. Empty state

Dashed white .55 border, 1.5 px, radius 24, centered stack: 52 px glass icon tile, 1rem 800 title, .78rem muted body, primary/soft CTA. Keep vertical padding 40–60 px.

## 15. Media card (library / explore)

White glass shell radius 18, 7 px padding, thumb with 12 px radius, favourite star top-right (glass circle), body with title .8rem 800, collection .62rem muted, and a full-width primary “Open” button. Hover lifts 2 px and increases shadow. Grid `repeat(auto-fill, minmax(196px, 1fr))`, `align-items: start` (formats have different heights), gap 13 px.

`.media-card-thumb` uses `aspect-ratio: var(--card-ratio, .7143)` fed by `syncCardRatio()`, so every thumbnail hugs its art; `img { object-fit: contain }`. Same hook in `.hub-explorer-art`, `.deck-cover-option` and `.collection-stack`.

## 16. Profile fields

Label .6rem 800 uppercase; input 40 px, white .62, radius 12, white border, inset-hi; focus aqua ring. Bio textarea 90 px. Avatar 88 px circle with a 3 px white ring and an “Upload” soft button. Keep the editor and preview in separate panels.

## 17. Radial FAB

A 54 px circular primary-gradient button bottom-right. On open, 3–5 petals fan out on a 60–70 px radius. Petals are 38 px glass circles with icons and labels on hover/focus. Auto-flip the fan up/left near viewport edges with `--petal-dir-x/y`. Use `role="menu"`/`menuitem`; Esc closes and returns focus to the trigger.

## 18. Identity chip (hub ≤980 px)

`.hub-player-panel` becomes a single centred capsule: `width: fit-content; margin: 0 auto; padding: 5px 16px 5px 5px; border-radius: 999px` on a white glass gradient. Its content is **only** the 30 px avatar and `@handle` (0.74rem, 700, `--ink`); `.hub-player-name` is `display: none` here — the name, bio and stats live in the menu sheet.

The capsule is a trigger: `.hub-player-open` is an absolutely positioned, transparent button covering it (`z-index: 2`, `border-radius: inherit`), `aria-haspopup="dialog"`, `aria-controls="hub-menu-sheet"`, label `hub_player_open`. It calls `openHubMenu(trigger)` so `openHubSheet` can sync `aria-expanded` and restore focus on close. On desktop the button is `display: none` and the panel shows name + handle + edit as before.

The handle truncates with `text-overflow: ellipsis` at `max-width: 100%` (long handles shrink the pill instead of overflowing).

## 19. Vitrine (hub mobile stage)

`.hub-card-surface` is the light panel the card sits on: 24 px radius, `clamp(8px, 2.6vw, 16px)` padding, `linear-gradient(170deg, white .58, sky .34, hsl(--ambient-a / .14))`, 1 px white border, soft shadow. It is `display: contents` on desktop (the wrapper disappears from layout). The card inside is `100% - 6px` wide.

## 20. Menu button and bottom sheets

```html
<button class="hub-menu-btn" aria-haspopup="dialog" aria-expanded="false" aria-controls="hub-menu-sheet">…</button>

<div class="hub-menu" id="hub-menu-sheet" role="dialog" aria-modal="true" hidden>
  <div class="hub-menu-backdrop" data-menu-close></div>
  <div class="hub-menu-panel" tabindex="-1"> … </div>
</div>
```

- **Button**: fixed, centred, 52 px circle, white glass, 19 px icon, `bottom: 48px + safe-area`. In landscape (≤560 px tall) it moves to the topbar centre (`top: 9px`, 44 px) so it never touches the card.
- **Sheet**: fixed overlay `z 240`, panel `min(100%, 470px)`, `border-radius: 26px 26px 0 0`, white→sky gradient, `max-height: 88dvh`, `transform: translateY(102%)` → `none` on `.is-open` (280 ms `--ease`); backdrop `rgba(5,43,55,.32)` + `blur(5px)`.
- **Menu content**: player header (42 px avatar, name, `@handle`, “member since”; close button right), primary “Open the studio”, Inkra row, five `data-menu-nav` rows (active state synced by `setActivePanel`), 4-up stats strip, EN/ES/DE pill, and the privacy note (`.hub-menu-privacy`) as the last row.
- **Details sheet** (`#hub-card-sheet`): same shell, `max-height: 72dvh`, content = `collection · set`, tag chips, italic lore box. Triggered by `#hub-card-info` (30 px circle next to the card name).
- Behaviour lives in `hub.js`: `openHubSheet(sheet, trigger)` / `closeHubSheet({restoreFocus})` / `onSheetKeydown` (Esc + Tab trap). Focus goes to the panel (no stray ring) and returns to the trigger — the round button or the identity chip. Both sheets refuse to open above 980 px.
- Under 700 px of height the menu compacts; under 620 px it hides the stats strip and the member line, tightens the nav rows, and raises the panel to `94dvh` so it fits without scrolling.

## 21. Ambient layer (reactive background)

```html
<div class="hub-ambient" aria-hidden="true">
  <span class="hub-ambient-layer" data-ambient-layer="0"></span>
  <span class="hub-ambient-layer" data-ambient-layer="1"></span>
</div>
```

Two absolute layers (`z 1`, above `.hub::before`, below `.hub-scroll`) whose radial gradients read `--amb-1/2/3`; `ambient.js` cross-fades them over 1.4 s when the card changes. The same triplets tint `.hub-showcase-glow`, the card shadow (`--ambient-shadow`) and `<meta name="theme-color">`. Alphas .55–.72, `filter: saturate(112%)`. Fallback: collection accent from `catalog.js`.

## 22. Card format control (studio)

`#select-card-format` lives in the Deck pane under the uploads, inside a `.control-row-col` with a `.header-line` label and a `.control-note` hint, using `select.select-block` (full width, no `max-width`). Options: `auto`, `tcg`, `ygo`, `tarot`, `mini`, `wide`, `square` — labels carry the millimetres. On change: `state.cardFormat` → `Scene.applySettings({ cardFormat })` → `persistSettings()`; `sanitizeSettings` validates against `Scene.CARD_FORMATS`.

## 23. Sound toggle

One shared button contract, three placements: `.hub-sound-btn` (desktop topbar, hidden ≤980), `.hub-menu-sound` (inside `.hub-menu-lang` in the mobile sheet) and `#btn-sound` (studio `.header-actions`).

```html
<button class="icon-btn" type="button" data-sound-toggle data-sound="none"
        aria-pressed="true" aria-label="Efectos de sonido" data-i18n-aria-label="ui_sound_toggle">
  <svg class="icon sound-on" aria-hidden="true"><use href="#i-sound"></use></svg>
  <svg class="icon sound-off" aria-hidden="true"><use href="#i-sound-off"></use></svg>
</button>
```

- `data-sound-toggle` is the hook: `sound.js` syncs `is-muted` and `aria-pressed` on all three at once and toggles on click.
- `data-sound="none"` stops the generic pointerdown tick so the toggle does not double-fire.
- `is-muted` swaps the wave icon for the crossed one (rules in `app.css` §2).
- State lives in `cardgram.sound.v1`; labels in `i18n.js` as `ui_sound_toggle` (ES/EN/DE).
