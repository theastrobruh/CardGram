# CardGram — agent notes

Read [`skills/cardgram-ui/SKILL.md`](skills/cardgram-ui/SKILL.md) before touching anything: file map, fast-path table, working rules and gotchas.

Non-negotiables:

- One static page (`index.html` + `assets/`). No build step, no framework, no new dependencies.
- After editing **any** CSS or JS, bump `rev` on every asset tag in `index.html` — otherwise the browser serves the old file. See [`references/run-and-debug.md`](skills/cardgram-ui/references/run-and-debug.md) §2.
- Verify with real screenshots and measurements at 390×844, 492×893 and 1440×900 (plus 844×390 when the hub is involved) before claiming anything is done.
- Text goes in `i18n.js` (studio) or `hub-i18n.js` (hub), always in ES/EN/DE.
- Keep the Aqua Glass Studio identity: white glass, cyan-tinted shadows, large radii, dense micro-labels.
