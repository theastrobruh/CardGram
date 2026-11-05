# Design system — Aqua Glass Studio

Source of truth: `assets/css/app.css` §1–3 and `assets/css/hub.css` §2–3.

## 1. Character

| Axis | CardGram choice |
|---|---|
| Era | Frutiger Aero / early-2000s optimism, refined for 2026 |
| Light | Bright, diffused, backlit; white highlights on every edge |
| Material | Frosted glass, polished acrylic, soft-touch plastic |
| Temperature | Cool aqua and sky; tiny warm accents only for warnings and the Ko-fi heart |
| Density | Dense information inside airy panels; generous negative space around the hero |
| Shape | Oversized radii, pill chips, circular avatars |
| Voice | Technical but friendly; tiny uppercase labels, short verbs |

**The test:** if you remove the logo and the card art, it should still feel like a bright aqua control surface from a 2005 future.

## 2. Core tokens

These are the production values. Keep the names when porting.

### Ink and accent

| Token | Value | Use |
|---|---|---|
| `--ink` | `#07333f` | Primary text, headings |
| `--ink-soft` | `#275c69` | Labels, secondary control text |
| `--muted` | `#5c8590` | Helper text, metadata |
| `--muted-strong` | `#3f6f7b` | Inactive nav, stronger metadata |
| `--title` | `#052b35` | Hero/stat/page titles (near-black cyan) |
| `--label` | `#0a6b78` | Micro-labels, section titles, chip text |
| `--label-soft` | `#0b7180` | Version badge and secondary labels |
| `--aqua` | `#2ec4b6` | Accent base, live dots |
| `--aqua-deep` | `#0f9b9b` | Links, active icons, focus |
| `--sky` | `#4aa8e0` | Secondary accent |
| `--sky-deep` | `#2b7fc4` | Deep blue accent |
| `--mint` | `#b9f2e7` | Soft highlight |

### Glass

| Token | Value | Use |
|---|---|---|
| `--glass` | `rgba(255,255,255,.46)` | Standard panel |
| `--glass-strong` | `rgba(255,255,255,.68)` | Modal, prominent panel |
| `--glass-soft` | `rgba(255,255,255,.30)` | Nested/toolbar |
| `--glass-row` | `rgba(255,255,255,.42)` | Control rows |
| `--stroke` | `rgba(255,255,255,.72)` | Panel edge |
| `--stroke-soft` | `rgba(255,255,255,.48)` | Inner group edge |
| `--stroke-ink` | `rgba(15,155,155,.22)` | Aqua divider when needed |

### Depth

| Token | Value | Use |
|---|---|---|
| `--shadow-xl` | `0 34px 80px rgba(6,55,74,.28)` | Studio sidebar, hero media |
| `--shadow-lg` | `0 22px 54px rgba(8,62,82,.18)` | Large panels |
| `--shadow-md` | `0 10px 26px rgba(8,62,82,.12)` | Cards, menus |
| `--shadow-sm` | `0 4px 12px rgba(8,62,82,.10)` | Chips, small buttons |
| `--inset-hi` | `inset 0 1px 0 rgba(255,255,255,.92)` | The signature top highlight |
| `--inset-lo` | `inset 0 -1px 0 rgba(8,62,82,.06)` | Bottom seat |

### Shape, type, motion

| Token | Value |
|---|---|
| `--radius-xl` | `30px` |
| `--radius-lg` | `22px` |
| `--radius-md` | `16px` |
| `--radius-sm` | `12px` |
| `--sidebar-w` | `404px` (370px at ≤980px) |
| `--font` | `"Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Roboto, Arial, sans-serif` |
| `--mono` | `"SFMono-Regular", ui-monospace, "Cascadia Mono", Consolas, monospace` |
| `--ease` | `cubic-bezier(.16, 1, .3, 1)` |
| `--ease-bounce` | `cubic-bezier(.175, .885, .32, 1.275)` |

### Accent gradients

```css
--accent: linear-gradient(135deg, #7cebdd 0%, #3cc9d8 44%, #2f8fdd 100%);
--accent-hover: linear-gradient(135deg, #8ff4e7 0%, #4ad6e5 44%, #3a9aeb 100%);
--accent-soft: linear-gradient(135deg, rgba(124,235,221,.24), rgba(47,143,221,.18));
```

Use `--accent` for primary buttons, the active language pill, the active preset and the brand mark. Never fill a large background with the full-saturation gradient; it is a small-area signal.

### Reactive and geometry tokens

Written at runtime, never hard-coded in components:

| Token | Value | Set by | Use |
|---|---|---|---|
| `--ambient-a/b/c` | HSL triplets, e.g. `199 53% 64%` | `ambient.js` on `:root` | Radial washes, card glow, menu icons |
| `--ambient-shadow` | HSL triplet, dark | `ambient.js` | Card drop shadow tint |
| `--amb-1/2/3` | same triplets, per layer | `ambient.js` on each `.hub-ambient-layer` | Cross-fade background |
| `--card-ratio` | unitless number, default `.7143` | `hub.js` / CSS fallback | Every card frame (`aspect-ratio`, sizing calc) |
| `--hub-card-chrome` | px budget, `352px` (mobile), `317px` at ≤700 px | `hub.css` §20 | Height-driven card sizing |

`hsl(var(--ambient-a) / .3)` is the house idiom for a tinted surface. If a new card frame needs to respect the artwork, consume `--card-ratio`; never write `5 / 7` again.

## 3. Page light

The body is a four-layer light field, not a flat color:

```css
background-color: #b6ebea;
background-image:
  radial-gradient(1100px 760px at 8% -6%,  #e2fdf6 0%, transparent 58%),
  radial-gradient(1000px 720px at 96% 4%,  #d3f0fd 0%, transparent 55%),
  radial-gradient(900px 760px at 46% 112%, #a5e4f8 0%, transparent 62%),
  linear-gradient(152deg, #c8f5ee 0%, #a8ddf4 46%, #8cc9ee 100%);
```

Add ambient orbs and bubbles with very low contrast:

- Orb 1: 540 px at top-left, white→mint, opacity .65.
- Orb 2: 680 px at top-right, white→sky, opacity .65, delayed.
- Orb 3: 760 px at bottom-center, white→blue, opacity .5.
- Bubble border: `1px solid rgba(255,255,255,.6)` plus an inner top-left highlight.
- Drift: 22 s `ease-in-out infinite alternate`; bubbles 16 s. Keep opacity under .7.

The hub adds a soft radial white wash at 50% −12% and a light cyan veil that fades out once on entry, plus the **ambient layer**: two stacked radial gradients tinted with the active card's palette (`--ambient-a/b/c`), above the wash and below the content. It is a colour wash, not a texture: keep alphas .55–.72 so dark text keeps its contrast.

## 4. Glass hierarchy

This is the most common failure point. There must be four visibly different levels:

| Level | Example | Formula |
|---|---|---|
| 0 · Field | page | multigradient + orbs |
| 1 · Panel | dashboard side panels | `linear-gradient(158deg, rgba(255,255,255,.66), rgba(255,255,255,.30))` + `blur(22px) saturate(135%)` + 1px white edge + large shadow |
| 2 · Row / tile | stat tile, control row | `linear-gradient(155deg, rgba(255,255,255,.60), rgba(255,255,255,.26))` + 1px white edge + small shadow + inset highlight |
| 3 · Active / raised | selected tab, primary button, hovered stat | near-white `rgba(255,255,255,.82–1)` or `--accent`, stronger shadow, aqua icon/text |

Rules:

1. **Never** place a level-2 glass on a level-1 glass without changing opacity, blur or border.
2. Every panel gets `inset 0 1px 0 rgba(255,255,255,.92)`; that highlight is the material.
3. Borders are **white**, not gray. If a border needs to be visible, increase alpha rather than darkening.
4. Use `backdrop-filter: blur(22px) saturate(135%)` on large panels, `blur(10–16px)` on chips and menus. Always add `-webkit-backdrop-filter`.
5. Provide an `@supports not (backdrop-filter: blur(1px))` fallback with an opaque `rgba(244,255,253,.96)`.
6. Shadows are cyan-tinted: `rgba(8,62,82,…)`, never `rgba(0,0,0,…)`.
7. **Media frames hug their art.** A frame around a card uses `aspect-ratio: var(--card-ratio)` and `object-fit: contain`; letterbox bars, filler gradients behind the art and `cover` crops are all bugs.

## 5. Type scale

Base is 16 px, but the UI uses a dense micro-scale.

| Role | Size | Weight | Tracking / notes |
|---|---|---|---|
| Page title | `clamp(1.75rem, 8vw, 2.3rem)` | 800 | `-0.04em`, near-black cyan |
| Section headline | `1.15–1.4rem` | 800 | `-0.035em` |
| Card name | `clamp(1.08rem, 1.6vw, 1.34rem)` | 800 | `-0.015em` |
| Body / lede | `.82–.9rem` | 500–600 | line-height 1.5–1.6 |
| Control label | `.72–.74rem` | 600–700 | sentence case |
| Micro-label / eyebrow | `.55–.64rem` | 800 | uppercase, `0.10–0.13em` |
| Metadata | `.51–.68rem` | 600 | muted |
| Numeric value | `1.35–1.72rem` | 800 | `font-variant-numeric: tabular-nums`, `-0.045em` |

Use `Segoe UI` first for the authentic Windows/Aero feel. Do not load a display font; the identity is in the weight and tracking, not a typeface gimmick. Use the mono stack only for codes, slider values, counters and version badges.

## 6. Spacing and sizing

- Page gutter: `clamp(18px, 4vw, 56px)`.
- Hub shell max width: **1280 px**.
- Panel padding: `16–21px`; dashboard gap: `clamp(14px, 1.8vw, 24px)`.
- Control row: `9px 12px`, 8 px gap.
- Button height: 38–48 px; primary hero CTA 42 px.
- Icon sizes: 12–19 px inside controls; 24–26 px in empty states.
- Hit targets: at least 38 px desktop, 44 px mobile.
- Sidebar width 404 px; at ≤980 px 370 px; mobile drawer `min(88vw, 380px)` and full width under 560 px.

## 7. Iconography

- Single inline SVG sprite, 24×24 viewBox, `fill: none`, `stroke: currentColor`, `stroke-width: 1.8`, round caps/joins.
- Icons are line art, never filled, except tiny status dots and the Ko-fi heart.
- Standard icon color: `var(--aqua-deep)` for active/brand contexts, `var(--ink-soft)` for neutral.
- Keep the icon set coherent: cards, sparkles, video, frame, save, upload, layers, camera, sliders, sun, eye, menu, close, target, rotate, level, bolt, pin, info, reset, trash, check, alert, film, image, globe, help, play, keyboard, chevron, clock, expand, drag, home, star, user, compass, plus, arrows, grid, folder, edit, search.

## 8. Accessibility guardrails

- In the light base theme, body text `#07333f` on the lightest glass is >12:1. Never use white body text on light glass.
- White text is only for `--accent` primary buttons; add `text-shadow: 0 1px 2px rgba(6,60,80,.24)`. Dark variants invert this contract and need their own contrast pass.
- Focus ring: `2px solid var(--aqua-deep)` with `2px` offset; on gradient buttons use a white inner ring + aqua outer.
- Do not rely on color alone for active state: pair it with a raised surface and `aria-selected`/`aria-pressed`.
- `prefers-reduced-motion: reduce` must stop orbs, bubbles, card float and shine, and reduce entrances to 1 ms.
- Keep `aria-label`, `role="tablist"`, `role="tab"`, `aria-controls`, `aria-selected` on tab shells.
