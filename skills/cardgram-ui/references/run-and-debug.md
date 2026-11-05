# Run and debug

The fastest way to lose an hour in this repo is to debug a file the browser never loaded. This page is the loop: serve → bump `rev` → verify with real measurements → read runtime state.

## 1. Serve it

```powershell
cd "C:\Users\<you>\Documents\Repos\CardGram"
python -m http.server 8000
# open http://127.0.0.1:8000/index.html
```

- `Iniciar_Webapp.bat` does the same on Windows.
- `file://` also works: everything is relative, the ambient canvas falls back to the collection accent when it can't read the image, and `history.replaceState` may be blocked (the hub ignores that).
- The only network request is the Three.js CDN (`cdnjs` + `jsdelivr`). Offline, the lobby works and the studio shows the WebGL error veil.

## 2. Cache busting — the rule

`index.html` loads every asset as `?v=<version>&rev=<n>`. Chrome caches by full URL, so **a changed file without a new `rev` is invisible**. Bump all of them at once, after the last CSS/JS edit:

```powershell
$p='index.html'; $u=New-Object System.Text.UTF8Encoding($false)
$f=Join-Path (Get-Location) $p
$t=[System.IO.File]::ReadAllText($f,$u)
[System.IO.File]::WriteAllText($f,[regex]::Replace($t,'rev=\d+','rev=32'),$u)
```

Check: `Select-String index.html -Pattern 'rev='` → all eleven rows identical.

Symptoms of a stale rev: new markup missing, `data-i18n` printing keys, a new select without options, "my CSS change does nothing". **Check the rev before debugging anything else.**

While iterating you can skip the bump by loading `index.html?dev=<anything>` — a fresh HTML URL re-fetches the page, but asset URLs stay cached, so this only helps for markup edits. Bump for CSS/JS.

## 3. The verification loop

1. Open the page, wait ~1 s for the veil.
2. Set the viewport (390×844, 492×893, 1440×900; plus any size in the task).
3. Screenshot, then **measure** — do not eyeball geometry.
4. Compare with the previous screenshot before/after the change.
5. Check the console: zero errors, zero warnings.

Geometry probe (paste into the browser console or a Playwright `page.evaluate`):

```js
() => {
  const box = (s) => { const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom),
             left: Math.round(r.left), right: Math.round(r.right) }; };
  const a = box('.hub-card-stage'), b = box('.hub-card-title-row'), c = box('#hub-menu-btn');
  return { card: a, title: b, menu: c, gap: c && b ? Math.round(c.top - b.bottom) : null,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scroll: (() => { const s = document.querySelector('.hub-scroll'); return s.scrollHeight - s.clientHeight; })() };
}
```

Overlap test between two boxes:

```js
const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
                     Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
```

## 4. Runtime state

### Globals

| Global | What it is |
|---|---|
| `Scene` | 3D engine API: `init, isReady, applySettings, applyPose, getPose, centerCamera, loadCardImages, loadCardImage, setFullArtEnabled, clearFullArt, hasFullArt, rebuildCard, resize, setRenderPaused, createVideoRenderer, createSnapshot, CARD_FORMATS` |
| `state` | Studio state (mirror of `cardgram.settings.v1`), e.g. `state.cardFormat`, `state.aspect`, `state.bg` |
| `currentLang` / `t(key)` | Active language (`'en' \| 'es' \| 'de'`) and lookup |
| `applyLanguage(lang)` | Switches language and re-renders both shells |
| `I18N` | Dictionaries: `I18N.es/en/de` (studio + hub merged) |
| `hubProfile`, `hubData` | Hub profile and counters (favorite card, decks, exports…) |
| `setFavoriteCard(id)`, `navigate(route)`, `openStudio(tab)` | Hub actions |
| `Scene.applySettings({ speed: 0, float: 'off' })` | Freeze the card for a clean screenshot |
| `Scene.centerCamera()` | Face the camera to the card |

### localStorage

| Key | Contents |
|---|---|
| `cardgram.settings.v1` | Studio settings: `corners, cardFormat, edgeThickness, bevel, edgeColor, gloss, exposure, speed, spinDir, float, camDistance, posY, tilt, aspect, scale, bg, duration, fullArtAnim, fabX, fabY, lang, sidebarCollapsed` |
| `cardgram.presets.v2` | Saved card presets (front/back/fullArt data URLs + name) |
| `cardgram.scenes.v1` | Three camera keyframes |
| `cardgram.profile.v1` | Hub profile: `name, handle, bio, avatar, favoriteCardId, joinedAt` |
| `cardgram.hub.v1` | `exports`, `reviewedCollections`, `decks`, `lastRenderAt` |

Legacy prefixes `deckgram.` / `tcghub.` are migrated on boot (`migrateLegacyStorage`). To reset the demo state:

```js
Object.keys(localStorage).filter(k => k.startsWith('cardgram.')).forEach(k => localStorage.removeItem(k));
location.reload();
```

### Freeze the card for screenshots

```js
Scene.applySettings({ speed: 0, float: 'off' });
Scene.centerCamera();
```

## 5. Useful selectors

| Selector | Node |
|---|---|
| `#hub` / `body[data-view]` | Hub shell / view switch |
| `.hub-player-panel` | Identity chip (mobile) / player panel (desktop) |
| `.hub-card-surface`, `.hub-card-stage`, `.hub-card-meta` | Vitrine, 3D-ish CSS card, name row |
| `#hub-card-info` | ⓘ opens the details sheet |
| `#hub-menu-btn` | Round menu button |
| `#hub-menu-sheet`, `#hub-card-sheet` | Bottom sheets (mobile only) |
| `.hub-mobile-privacy`, `.toast-stack` | Fixed bottom chrome |
| `.hub-card-grid`, `.media-card-thumb` | Library / explore grid and frames |
| `#sidebar`, `#viewport-container`, `#canvas-window-wrapper` | Studio panel, stage, 9:16 wrapper |
| `#select-card-format` | Card format control |
| `#tab-deck / #tab-3d / #tab-anim / #tab-canvas` | Studio panes |

## 6. Common failures

| Symptom | Check |
|---|---|
| Change not visible | `rev` (section 2); hard-reload the page |
| Raw i18n keys | key missing in all three dictionaries; then `rev` |
| Card looks squashed | `--card-ratio` on the frame, or `CARD_FORMATS`/`auto` in the studio |
| Bars / letterbox around art | frame ratio ≠ image ratio; `object-fit` should be `contain` with a matching frame |
| Sheet does nothing | `openHubSheet` early-returns above 980 px (mobile-only by design) |
| 3D blank or black | CDN blocked / WebGL disabled → error veil; check `Scene.isReady()` |
| Export is empty | snapshot happens on the live scene; check `#canvas-window-wrapper` size and `body[data-view="studio"]` |
| Overlap at one breakpoint | measure; adjust `--hub-card-chrome`, sheet paddings or `--card-ratio` |
| Accents garbled in the file | a script wrote it with the wrong encoding — rewrite that file with the editor tool |

## 7. Repository hygiene

- `.gitattributes` normalises to LF; the Windows console may still print mojibake for accents. Verify bytes with a UTF-8 read, not with the console.
- `git status` after a session should list only the files you touched plus `rev` in `index.html`.
- Screenshots and test harness output do not belong in the repo.
