# Visual QA checklist

Run this before claiming a CardGram-style UI is done. Take screenshots; do not judge from code alone.

## Identity

- [ ] The page reads as Aqua Glass Studio with the logo hidden.
- [ ] Background is a multi-layer aqua field, not a flat `#b6ebea`.
- [ ] At least one soft orb/bubble is visible but not distracting.
- [ ] Panels have white borders and cyan-tinted shadows, not gray/black.
- [ ] The `inset 0 1px 0 rgba(255,255,255,.92)` highlight is present on major panels.
- [ ] Primary gradient appears only on small, meaningful surfaces.
- [ ] There is exactly one hero object and it has the strongest shadow.
- [ ] Micro-labels are uppercase with tracking; body copy is not.

## Hierarchy

- [ ] Four glass levels are distinguishable: field, panel, row, raised/active.
- [ ] No glass card sits on an identical glass card.
- [ ] The eye goes hero → primary action → secondary panels, in that order.
- [ ] At 1280 px the hub still has three columns; at 980 px it is one column.
- [ ] The studio sidebar is 404 px at desktop and a drawer at ≤860 px.

## Layout

- [ ] No horizontal scrollbar at 1600, 1280, 1024, 900, 768, 492, 390 and 844×390 landscape.
- [ ] No element overlaps another: measure the boxes (title row, card, menu button, privacy strip, sheets).
- [ ] Home never scrolls at any width; the content panels can scroll and their last row clears the floating menu button.
- [ ] Card frames hug the art: no filler bars, no cropped edges, in the hero, library grid, explorer rail, deck covers and collection stacks.
- [ ] The mobile menu button is 24 px above the safe area and ≥22 px below the card title; in landscape it sits in the topbar centre.
- [ ] The mobile home ends with the round menu button and nothing else: no privacy strip, no footer, no nav.
- [ ] The identity chip shows only `@handle`, sits centred, and opens the player menu on tap, Enter and Space.
- [ ] The three identifier pills sit above the name, never truncate (they wrap at ≤380 px) and the card name is centred within 1 px of the viewport axis.
- [ ] Bottom sheets fit without scrolling at 320×568 and up; below 620 px tall the menu drops its stats strip.
- [ ] Panels don't collapse below their content; text wraps instead of overflow.
- [ ] Tablet 860–980 px checked separately.
- [ ] Safe-area inset respected on iPhone-sized screens.

## Card formats

- [ ] `Auto` matches the loaded artwork (5:7, Yu-Gi-Oh! 0.746, tarot…): the card is neither stretched nor cropped.
- [ ] Each format (`tcg`, `ygo`, `tarot`, `mini`, `wide`, `square`) keeps the card inside the 9:16 stage at the default camera distance.
- [ ] Changing format while a pose/keyframe is active keeps the card framed.
- [ ] The chosen format survives a reload (`cardgram.settings.v1`) and is applied on the first studio open.
- [ ] PNG snapshot and video export show the same proportions as the viewport.
- [ ] Mixed formats in the hub library/explorer produce different frame heights without breaking the grid.

## Type

- [ ] Headlines 800–900, `-0.03em` to `-0.045em`.
- [ ] Micro-labels ≤ .64rem, 800, uppercase, `.10–.13em`.
- [ ] Numbers use tabular figures and don't jump when they change.
- [ ] No line longer than ~70 characters in body copy.
- [ ] Mono only for values, codes and version badges.

## Controls

- [ ] Buttons have 38–48 px height, 12–15 px radius, visible hover and active states.
- [ ] Primary buttons have white text and a subtle text shadow; disabled state is clear.
- [ ] Sliders show a value chip and a filled track.
- [ ] Switches animate the thumb and expose a focus ring.
- [ ] Selects use the custom chevron, not the native arrow.
- [ ] Segmented controls use `aria-selected`/`aria-pressed`, not class only.
- [ ] Tabs support arrow keys or at least clear focus and `aria-controls`.

## Motion

- [ ] Entrance is slow (≥ .7 s) and uses `--ease`.
- [ ] Ambient loops are 8 s or longer and don't distract from reading.
- [ ] Card idle, shine, orbit and orb drift stop under `prefers-reduced-motion`.
- [ ] Hover feedback is ≤ .26 s.
- [ ] No layout shift during entrance.
- [ ] Motion doesn't run while the tab is hidden.

## Accessibility

- [ ] Body text passes 4.5:1 on the lightest glass.
- [ ] Focus-visible ring on every interactive element.
- [ ] Dialogs trap focus and close with Esc.
- [ ] Icon-only buttons have `aria-label`.
- [ ] The card flip is a button with `aria-pressed`.
- [ ] The mobile drawer returns focus to its trigger.
- [ ] Color is never the only active-state signal.
- [ ] Images have alt text; decorative art is `aria-hidden`.

## Performance

- [ ] Backdrop blur is not stacked more than two layers deep.
- [ ] DPR capped at 2 for WebGL.
- [ ] No animation of `box-shadow`/`filter` inside loops.
- [ ] WebGL is lazy and paused off-screen.
- [ ] Large images are compressed to WebP/AVIF and sized to their slot.

## Screenshot set to capture

1. Hub at 1600×1000.
2. Hub at 492×893 with the menu sheet open.
3. Hub at 492×893 with the card details sheet open.
4. Hub at 390×844 and 320×568 (smallest phone).
5. Library with at least two different card ratios.
6. Studio Deck at 1600×1000, auto format.
7. Studio with `tarot` and with `wide` selected.
8. Studio at 390×844 with the drawer open on the format control.

Compare against the running app side by side. If the silhouette and light feel different, fix tokens before adding detail.
