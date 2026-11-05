# Motion and 3D

## 1. Motion principles

- **Slow in, soft out.** Entrances are 0.7–2.1 s; hover feedback is 0.18–0.26 s.
- **One easing.** `--ease: cubic-bezier(.16,1,.3,1)` for almost everything. `--ease-bounce` only for the switch thumb.
- **Ambient motion never competes with reading.** Orbs drift 22 s, bubbles 16 s, card idles 11 s, orbit 46 s, shine 8 s.
- **Entrance tells a story.** Hub: veil clears (1.9 s) → card rises (2.1 s) → metadata rises (1.1 s, 0.7 s delay). Studio: panel content fades up 0.36 s.
- **Reduced motion stops loops, not usability.** Remove ambient loops, card idle/shine, fade entrances. Keep state changes instant.

## 2. Timing table

| Element | Duration | Delay | Easing |
|---|---|---|---|
| Hub veil out | 1.9 s | .18 s | `--ease` |
| Card enter | 2.1 s | .24 s | `--ease` |
| Card metadata rise | 1.1 s | .7 s | `--ease` |
| Panel/view rise | .75 s | — | `--ease` |
| Tab pane in | .36 s | — | `--ease` |
| Card flip | 1.35 s | — | `--ease` |
| Tilt follow | .9 s | — | `--ease` |
| Button hover | .2 s | — | `--ease` |
| Switch thumb | .26 s | — | `--ease-bounce` |
| Toast enter | .22 s | — | `--ease` |
| Card camera transition (Three.js) | 1.15 s | — | smoothstep |

## 3. Signature keyframes

```css
@keyframes hubVeilOut {
  0%   { opacity: 1; backdrop-filter: blur(12px); }
  55%  { opacity: .55; }
  100% { opacity: 0; backdrop-filter: blur(0); visibility: hidden; }
}

@keyframes hubRise {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes hubCardEnter {
  0%   { opacity: 0; transform: translateY(52px) scale(.82) rotateX(9deg); filter: blur(14px); }
  55%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotateX(0); filter: blur(0); }
}

@keyframes hubCardIdle {
  0%,100% { transform: translateY(-6px) rotateY(-5deg) rotateX(1.5deg); }
  50%     { transform: translateY(6px)  rotateY(5deg)  rotateX(-1.5deg); }
}

@keyframes hubCardShine {
  0%,12%  { transform: translateX(-38%) rotate(4deg); opacity: 0; }
  30%     { opacity: .7; }
  55%,100%{ transform: translateX(38%) rotate(4deg); opacity: 0; }
}

@keyframes orbDrift {
  0%   { transform: translate3d(0,0,0) scale(1); }
  100% { transform: translate3d(28px,34px,0) scale(1.06); }
}
```

## 4. CSS 3D card

The hub card is pure CSS 3D; no WebGL. Real structure (ids matter for `hub.js`):

```html
<div class="hub-card-surface">
  <div class="hub-card-stage" id="hub-card-stage">
    <div class="hub-card-tilt" id="hub-card-tilt">
      <button class="hub-card" id="hub-card" aria-pressed="false" aria-label="Flip card">
        <span class="hub-card-inner">
          <span class="hub-card-face hub-card-front"><img id="hub-card-front" …></span>
          <span class="hub-card-face hub-card-back"><img id="hub-card-back" …></span>
        </span>
      </button>
    </div>
  </div>
</div>
```

Rules:

1. `.hub-card-stage` owns `perspective: 1500px` **and `aspect-ratio: var(--card-ratio)`**; `hub.js` `syncCardRatio()` overwrites the ratio from the loaded art, so 5:7, Yu-Gi-Oh!, tarot or landscape all keep their shape. Faces use `object-fit: contain`; a matching frame means no bars and no crop.
2. Mobile sizing is height-driven: `width: min(100% - 6px, (100dvh - var(--hub-card-chrome)) * var(--card-ratio), 460px)`. Height is therefore constant for every format; only the width changes. Desktop keeps `clamp(212px, 21vw, 292px)`.
3. `.hub-card-tilt`, `.hub-card` and `.hub-card-inner` all need `transform-style: preserve-3d`.
4. Faces need `backface-visibility: hidden`; the back starts at `rotateY(180deg)`.
5. Flip on hover/focus and on click (`is-flipped`), so touch users get it too.
6. Pointer tilt: set `--tilt-x` / `--tilt-y` on the stage from normalized pointer position, clamp to ±8deg, reset on leave.
7. Keep the idle animation on `.hub-card`, not `.hub-card-inner`, so it composes with the flip.
8. The synthetic shine is a `::after` on `.hub-card-front`, `mix-blend-mode: screen`, clipped by the face radius.
9. Glow, orbit and shadow are tuned per breakpoint in `hub.css` §20; the glow draws from `--ambient-a/b`.

Implementation: `hub.js` (`syncCardRatio`, `setupShowcaseTilt`, `renderFavoriteCard`) and `hub.css` §6 + §20.

## 5. Three.js handoff

Reimplementing the studio engine is optional; this is the contract if you do.

### Scene

- `PerspectiveCamera(38, aspect, .1, 100)`, position `(0,0,4.6)`, target `(0,0,0)`.
- `WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' })`.
- Pixel ratio capped at 2; `ACESFilmicToneMapping`; exposure default `.9` (range .4–1.4); sRGB output; clear alpha 0.
- OrbitControls: damping .06, pan disabled, distance 2–9, rotate .8, zoom .75.

### Card geometry

- **Bounding box** `CARD_BOX = { w: 1.35, h: 1.89 }`. The card's real size comes from the active format and is fitted *inside* that box: `fitCardBox(ratio)` returns `{ w: 1.89 * ratio, h: 1.89 }` for narrow formats and `{ w: 1.35, h: 1.35 / ratio }` for wide ones. That is why the camera never needs re-framing when the format changes.
- **Formats** (`CARD_FORMATS`): `auto` (uses `frontTexture.image` ratio), `tcg` 63/88, `ygo` 59/86, `tarot` 70/120, `mini` 45/68, `wide` 88/63, `square` 1. Add a format by adding one entry plus an `<option>` + three i18n keys.
- Depth `.016`, corner radius `min(w, h) * .0667` (≈ .09 for the base card), bevel `.004`.
- Build a rounded rectangle `THREE.Shape` with quadratic corners. `ExtrudeGeometry` with `bevelSegments:3`, `steps:1`, `bevelSize = bevelThickness = bevel`. Center the geometry.
- Remap UVs front/back so the artwork covers the face including the bevel; side faces get a neutral UV.
- Add separate front/back `ShapeGeometry` planes offset by `depth/2 + bevel + .0004`.
- Material array `[front, edge]` for the extruded body; `MeshStandardMaterial` for faces (`roughness = gloss`, `metalness:.04`, `envMapIntensity:.55`).
- Rebuilds are rAF-throttled (`scheduleRebuild`) and triggered by: format change, corners/thickness/bevel change, and — in `auto` — a new front texture.

### Light and environment

- Ambient `0xffffff` .4.
- Key directional `0xfff8ee` 1.2 at `(3,4,4)`.
- Fill `0xbcd7ff` .55 at `(-3,-1,3)`.
- Rim `0xd8fff9` .9 from behind/top.
- Procedural canvas environment: vertical blue-white gradient + white softbox top-right + warm patch. Set `scene.environment`.

### Edge finishes

| Key | Color | Metalness | Roughness |
|---|---|---|---|
| black | `0x0a0d10` | .15 | .45 |
| gold | `0xd4af37` | .95 | .16 |
| silver | `0xdcdde1` | .98 | .12 |
| white | `0xf7f7f2` | 0 | .50 |

### Behaviors

- Idle float: slow sine on Y plus gentle X rotation; pause when the tab is hidden or the lobby is active.
- Camera poses: store camera position, target and card Y; transition over 1.15 s with smoothstep, not linear.
- Full-art crossfade: custom shader mixes base and full-art textures over 1.5 s; cycle 10 s.
- Resize with `ResizeObserver`, not a window resize storm; render on demand when idle.
- Respect `prefers-reduced-motion` by disabling float/spin and snapping transitions.
- Lazy-init WebGL only when the Studio is visible; no context on the Hub.

## 6. Performance rules

- Transform/opacity only for UI animation; do not animate `box-shadow`, `filter` or `backdrop-filter` in loops.
- Cap device pixel ratio at 2.
- Use one `requestAnimationFrame` loop; cancel it when the studio is hidden.
- Avoid multiple large `backdrop-filter` layers stacked; blur is the most expensive part of this look.
- On low-end mobile, reduce blur to 12–16 px and disable the card shine.

## 7. Sound feedback

`assets/js/sound.js` synthesizes every cue with Web Audio — no files, no requests, CSP-safe.

- **Lazy and polite.** The `AudioContext` is created on the first pointer/key gesture; boot-time toasts stay silent. Palette gains sit between .006 and .045 with a shared compressor, so effects sit under the UI, not over it.
- **One gesture, one cue.** A delegated `pointerdown` plays a default `tap` and overrides it from `data-sound`. Structural transitions (sheets, card flip) use `data-sound="none"` plus an explicit `Sound.play()` inside the function that really performs the change.
- **Semantic palette.** `tap` glass tick · `hover` faint sparkle · `navigate` rising two-note · `lang` small bell · `tab` wood tick · `open`/`close` air sweep · `toggleOn`/`toggleOff` · `flip` paper whoosh · `primary` warm two-note · `info` neutral pair · `success` three-note bell · `reward` four-note arpeggio · `error` soft low interval · `slider` pitch follows value (0–1).
- **Outcomes speak.** `toast()` maps success→bell, error/warning→low interval, info→neutral pair, so favorites, saved presets, deck actions and exports get their reward automatically.
- **Respect the user.** `[data-sound-toggle]` in the hub topbar, mobile menu and studio header flips `cardgram.sound.v1`; `aria-pressed` mirrors it on all three. New sounds belong in the `palette` object, not in inline `AudioContext` calls.
