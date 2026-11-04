# Replication playbook

## 1. Decide what you are replicating

| Goal | Copy this much | Do not copy |
|---|---|---|
| Same product, new skin | Layouts + components + tokens | Card art, copy, Three.js engine unless needed |
| New product, CardGram feel | Tokens + glass hierarchy + motion + one shell | Hub-specific stats/deck language |
| “Inspired by” variant | Light field, radii, type scale, primary gradient | Exact panel recipe and all spacing |
| Marketing page | Background, type, buttons, card hero | Studio sidebar and editor controls |

If the target is not about cards, replace the hero object but keep its role: one large, glossy, floating artifact with a strong shadow and an orbit/glow.

## 2. Start from the starter

1. Copy `assets/starter/` into the project, for example `src/ui/cardgram/`.
2. Keep `tokens.css` separate. Change brand values there first; do not edit 200 declarations.
3. Open `index.html` through a local server (`python -m http.server` or `npx serve`).
4. Replace:
   - product name / wordmark (keep the two-tone gradient on the second syllable if it fits),
   - nav labels and routes,
   - card data and art,
   - stats and their labels,
   - footer/privacy copy.
5. Delete the Hub if the product is an editor; delete the Studio if it is a showcase. Do not ship both shells if only one is used.
6. Re-run the QA checklist at three widths.

## 3. Map a new product to the shells

| Product | Shell | Hero | Side panel content |
|---|---|---|---|
| Card design tool | Studio | Card on 9:16 stage | Deck, finish, shots, canvas |
| NFT / collectible gallery | Hub | Featured collectible | Profile, stats, explorer |
| Presentation builder | Studio | Slide/deck on stage | Layout, theme, motion, export |
| Fashion/lookbook | Hub | Garment/photo | Profile, collections, lookbook |
| Audio plugin | Studio | Album/cover art | Presets, tone, scenes, export |
| Dashboard for creators | Hub | Featured work | Stats, library, activity |

Keep the **hero + rail + inspector** triangle. It is the structural signature more than any single color.

## 4. Porting to React / Tailwind / Vue

Do not translate CSS line-by-line. Translate the contract:

1. Put the token values in `:root` (global CSS) or a theme object.
2. Make `GlassPanel`, `StatTile`, `ControlRow`, `Segmented`, `PrimaryButton`, `Pill`, `CardStage` primitives.
3. Use a single `Surface` component with `level: 1 | 2 | 3`; encode the three glass recipes there. This prevents random opacity drift.
4. Keep the responsive switch at 980 px (hub) and 860 px (studio).
5. In Tailwind, define `boxShadow` and `backgroundImage` tokens; arbitrary values everywhere will rot.
6. Do not use a generic `Card` component for the hero card; it has its own 3D transform contract.

## 5. Content rules

- **Labels:** short nouns, sentence case for controls, uppercase only for eyebrows. “3D Forge”, not “3D FORGE SETTINGS”.
- **Numbers:** tabular, no currency unless real. Stats are counts, not fake percentages.
- **Descriptions:** one line, concrete, no marketing fluff. “Browse the collection and pick your next favorite.”
- **Empty states:** explain what will appear and give one action. “No decks yet / Create a deck to gather the cards of a series or an idea.”
- **Privacy:** state local-only behavior plainly when true. “Your images never leave this device.”
- **Buttons:** verb first. “Open the studio”, “Save current card”, “Create a render”.

## 6. What must survive a reskin

- Four-level glass hierarchy with white borders and cyan shadows.
- Aqua→sky accent used in small, meaningful areas.
- Large radii and pill controls.
- Dense micro-labels plus one big hero.
- Slow cinematic entrance and restrained ambient loops.
- The mobile shells (bottom nav / off-canvas drawer), not just a squeezed grid.

## 7. Common failure modes

| Failure | Symptom | Fix |
|---|---|---|
| Flat glass | Panels look like gray cards | Add gradient + white border + inset highlight; tint shadows cyan |
| Glass on glass | Nested cards merge | Raise active level to near-white or gradient; reduce child blur |
| Too much gradient | Entire page looks like a button | Use gradient on ≤10% of the surface area |
| Tiny type everywhere | Dashboard feels like a spreadsheet | Keep micro-labels micro, but let the hero name and numbers breathe |
| Symmetric three columns | No focal point | Center hero wider, side panels narrower, remove panel behind hero |
| Mobile afterthought | Horizontal scroll, tiny tap targets | Switch to one column at 980, drawer at 860, 44 px targets |
| Endless animation | Interface feels seasick | One ambient loop per region; 8–46 s durations; reduced-motion support |
| Pure black shadows | Muddy, dated | `rgba(6,55,74,…)` or `rgba(8,62,82,…)` |

## 8. Working with existing code

- If the project already has design tokens, map CardGram tokens onto them instead of adding a second system.
- If it uses Tailwind/shadcn, keep the component primitives and apply the CardGram surface recipes through variants.
- If it has dark mode, do not simply invert. Use the OLED variant in `variants.md` as a separate palette with its own contrast checks.
- If it has a strict CSP, avoid inline styles/scripts; move the demo JS and the SVG sprite into files, and replace inline event handlers with listeners.
- If there is no build step, the starter works as-is. If there is a bundler, import the CSS files and split the demo JS into modules.

## 9. Naming

Keep semantic names (`hub-player-panel`, `card-stage`, `control-row`) rather than visual names (`blue-box`, `left-thing`). If you rename, update the skill's recipes so the next agent can still map the design.
