# 🎴 CardGram

> A real-time WebGL 3D interactive showcase and reel creator for trading card artists, digital collectors, and content creators — no installation required.

![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-222?logo=github&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r128-black?logo=threedotjs&logoColor=white)
![Version](https://img.shields.io/badge/Version-v0.4.5-00d2d3)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🏛️ Immersive Lobby (v0.4.5)
- **Slow, cinematic entrance** — your favorite card settles in over a soft glass veil before the lobby content
- **Live stats** — saved cards, catalog collections, collections left to review, decks and rendered exports
- **My cards** — saved presets plus the full catalog, with favorite selection and one-tap open in the studio
- **Collections & decks** — collections read from the segmented card folders, plus user-created decks with covers and card lists
- **Profile** — local avatar upload (square crop), creator name, handle, bio and favorite card
- **Explore (prepared)** — community feed shell and data adapter ready, disabled until a backend exists
- **Card-first mobile layout** — one identity chip, the card on a glass vitrine and a single round menu button; no bottom nav, no always-on stats, no language pills in the bar
- **Details on demand** — the collection line and the card tags (rarity, type, stats, lore) sit behind a compact ⓘ next to the card name, so the card keeps the space
- **Any card format** — the hero reads each art's real aspect ratio (5:7, 3:4, tarot, landscape) and sizes a matching frame; thumbnails use `contain`, so nothing is ever cropped
- **Mobile menu sheet** — studio, Inkra, navigation, collection data and EN/ES/DE in one bottom sheet
- **Reactive ambient background** — the lobby is tinted with a pastel palette sampled from the active card's artwork; the same hue drives the card glow, its shadow and the browser theme colour
- **Inkra companion** — one tap opens [Inkra](https://theastrobruh.github.io/Inkra/), the real-scale print layout tool, in a new tab
- **Lazy 3D engine** — no WebGL context on load; the render loop pauses while you are in the lobby

### 🎴 3D Engine & Card Forge
- **Procedural Geometry** — accurate TCG rounded corners and adjustable reflective bevels
- **Card Formats** — standard TCG, Yu-Gi-Oh!, Tarot, Mini Euro, landscape and square; *Auto* matches the loaded artwork. The mesh, the live viewport and both exports use the chosen proportions
- **Customizable Edges** — variable thickness with Millennium Foil Gold, Metallic Silver, Matte Black, and White Cardstock finishes
- **Specular & Gloss Tuning** — fine-grained roughness, gloss, and reflection control
- **Exposure Control** — balanced default luminosity with manual slider to prevent artwork blowout
- **Full Art Transition** — base card smoothly animates to its Full Art variant; toggle per-card in the Deck panel

### 🎥 Camera & Motion
- **Up to 3 Scene Keyframes** — store camera angles, targets, and card elevations with fluid interpolated transitions
- **Spin Dynamics** — adjustable rotation speed, clockwise/counter-clockwise toggle, and tilt leveling
- **Draggable Radial FAB Menu** — on-canvas shortcuts that auto-orient away from viewport edges
- **Cinematic Clean Screen** — hide all UI chrome instantly for pristine captures

### 💾 Presets & i18n
- **Built-in Presets** — *Shadowblade Kinetic*, *Volt Striker*, *Aureon the Golden Maw*, and the base deck included
- **Custom Local Presets** — save front/back/Full Art combinations in browser storage
- **Multilingual (EN / ES / DE)** — instant on-the-fly language switching

### 📤 Export
- **High-Res PNG Snapshot** — single-frame client-side capture
- **9:16 Vertical Video** — in-browser MediaStream recording for Instagram Reels, TikTok, and YouTube Shorts; nothing uploaded to any server

---

## 🚀 Usage

### Online
Open the live site → upload front & back artwork → configure 3D Forge settings → record or snapshot.

👉 **[Open CardGram](https://theastrobruh.github.io/CardGram/)**

### Local

```bash
git clone https://github.com/theastrobruh/CardGram.git
cd CardGram
```

| Method | Command |
|---|---|
| Windows | Double-click `Iniciar_Webapp.bat` |
| Python | `python -m http.server 8000` → open `http://localhost:8000` |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|:---|
| `1` `2` `3` `4` | Switch studio tabs (Deck · 3D Forge · Shots · Canvas) |
| `C` | Toggle Cinematic Clean Screen |
| `R` | Start / Stop video recording |
| `S` | Capture high-res PNG snapshot |
| `?` | Open shortcuts & help dialog |
| `Esc` | Close dialogs / exit Cinematic Mode |

---

## 🗂️ Project Structure

```
├── index.html                  # Main app (HTML + Three.js scene entry point)
├── Iniciar_Webapp.bat          # Windows local server launcher
├── assets/
│   ├── css/
│   │   ├── app.css             # Studio UI styles
│   │   └── hub.css             # Card Hub styles
│   ├── js/
│   │   ├── app.js              # Core studio logic & UI
│   │   ├── scene.js            # Three.js WebGL scene & card geometry
│   │   ├── export.js           # PNG snapshot & video recording
│   │   ├── hub.js              # Card Hub browser
│   │   ├── ambient.js          # Reactive background palette sampled from the card art
│   │   ├── i18n.js             # Studio translations (EN/ES/DE)
│   │   ├── hub-i18n.js         # Hub translations
│   │   └── community.js        # Community feed adapter (prepared, disabled)
│   └── data/
│       └── cards/              # Per-collection folders + catalog.js manifest
│           ├── thumbs/         # WebP thumbnails used by the lobby
│           └── tools/          # make-thumbs.py (regenerate thumbnails)
├── README.md
├── .gitattributes
├── .gitignore
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions — auto-deploy to GitHub Pages
```

---

## 🛠️ Built With

- **[Three.js (r128)](https://threejs.org/)** — WebGL 3D rendering
- **Canvas Capture & MediaStream Recording API** — in-browser video encoding
- **HTML5 & Modern CSS3** — glassmorphic responsive UI with no build step

---

## ☕ Support

If CardGram is useful or inspiring to you, consider supporting development on Ko-fi. Thank you!

👉 [**Ko-fi · theAstroBruh**](https://ko-fi.com/theastrobruh)

---

## 📄 License

MIT © 2026 — Free to use and modify.
