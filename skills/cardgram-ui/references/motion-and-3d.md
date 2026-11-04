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

The hub card is pure CSS 3D; no WebGL. Structure:

```html
<div class="card-stage">
  <div class="card-tilt">
    <button class="card" aria-pressed="false" aria-label="Flip card">
      <span class="card-inner">
        <span class="card-face card-front"><img …></span>
        <span class="card-face card-back"><img …></span>
      </span>
    </button>
  </div>
</div>
```

Rules:

1. `.card-stage` owns `perspective: 1500px`.
2. `.card-tilt` and `.card` and `.card-inner` all need `transform-style: preserve-3d`.
3. Faces need `backface-visibility: hidden`; the back starts at `rotateY(180deg)`.
4. Flip on hover/focus and on click (`is-flipped`), so touch users get it too.
5. Pointer tilt: set `--tilt-x` / `--tilt-y` on the stage from normalized pointer position, clamp to ±8deg, reset on leave.
6. Keep the idle animation on `.card`, not `.card-inner`, so it composes with the flip.
7. Add a synthetic shine as a `::after` on the front, `mix-blend-mode: screen`, clipped by the face radius.

The starter implements 1–6 in `assets/starter/js/demo.js`.

## 5. Three.js handoff

Reimplementing the studio engine is optional; this is the contract if you do.

### Scene

- `PerspectiveCamera(38, aspect, .1, 100)`, position `(0,0,4.6)`, target `(0,0,0)`.
- `WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' })`.
- Pixel ratio capped at 2; `ACESFilmicToneMapping`; exposure default `.9` (range .4–1.4); sRGB output; clear alpha 0.
- OrbitControls: damping .06, pan disabled, distance 2–9, rotate .8, zoom .75.

### Card geometry

- Card size `1.35 × 1.89`, depth `.016`, corner radius `.09`, bevel `.004`.
- Build a rounded rectangle `THREE.Shape` with quadratic corners. `ExtrudeGeometry` with `bevelSegments:3`, `steps:1`, `bevelSize = bevelThickness = .004`. Center the geometry.
- Remap UVs front/back so artwork covers the face including bevel; side faces get a neutral UV.
- Add separate front/back `ShapeGeometry` planes offset by `depth/2 + bevel + .0004` for crisp art and a clean back.
- Material array `[front, edge]` for the extruded body; `MeshStandardMaterial` for faces (`roughness = gloss`, `metalness:.04`, `envMapIntensity:.55`).

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
