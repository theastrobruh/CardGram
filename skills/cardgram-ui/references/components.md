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

## 6. Card presentation

The hero card is a 3D object with a front and back:

```css
.card-stage { width: clamp(264px, 23vw, 360px); aspect-ratio: 5/7; perspective: 1500px; }
.card-tilt { transform-style: preserve-3d; transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y)); transition: transform .9s var(--ease); }
.card { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: cardIdle 11s ease-in-out infinite; }
.card-inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform 1.35s var(--ease); }
.card:hover .card-inner, .card.is-flipped .card-inner { transform: rotateY(180deg); }
.card-face { position: absolute; inset: 0; overflow: hidden; border-radius: 18px; backface-visibility: hidden; }
.card-back { transform: rotateY(180deg); }
```

- Face shadow: `0 36px 64px rgba(6,55,74,.28), 0 6px 16px rgba(6,55,74,.14), inset 0 1px 0 rgba(255,255,255,.9)`.
- Hover shine: a 112° white band across the front, `mix-blend-mode: screen`, 8 s loop.
- Idle: 11 s translateY ±6 px + rotateY ±5deg + rotateX ±1.5deg.
- Entrance: 2.1 s from translateY 52 px / scale .82 / blur 14 px.
- Metadata sits below: eyebrow, name, collection, chips, text link.

For the card art itself use the existing artwork or a real image with `object-fit: cover`. Keep the 5:7 ratio and the existing `assets/data/cards/` structure.

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

## 15. Media card (library)

White glass shell radius 18, 7 px padding, thumb with 12 px radius, favourite star top-right (glass circle), body with title .8rem 800, collection .62rem muted, and a full-width primary “Open” button. Hover lifts 2 px and increases shadow. Grid min 210 px desktop, 150 px mobile.

## 16. Profile fields

Label .6rem 800 uppercase; input 40 px, white .62, radius 12, white border, inset-hi; focus aqua ring. Bio textarea 90 px. Avatar 88 px circle with a 3 px white ring and an “Upload” soft button. Keep the editor and preview in separate panels.

## 17. Radial FAB

A 54 px circular primary-gradient button bottom-right. On open, 3–5 petals fan out on a 60–70 px radius. Petals are 38 px glass circles with icons and labels on hover/focus. Auto-flip the fan up/left near viewport edges with `--petal-dir-x/y`. Use `role="menu"`/`menuitem`; Esc closes and returns focus to the trigger.
