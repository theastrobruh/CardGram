<div align="center">

# 🎴 DeckGram
### *Interactive WebGL 3D Card Showcase & Reel Creator*
**by theAstroBruh**

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://theastrobruh.github.io/DeckGram/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Version](https://img.shields.io/badge/Version-v0.4.4-00d2d3?style=for-the-badge)](https://github.com/theastrobruh/DeckGram)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Ko-fi](https://img.shields.io/badge/Thanks-Ko--fi-ff5e5b?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/theastrobruh)

<br/>

<p align="center">
  <b>A real-time 3D interactive showcase and visual social platform for trading card creators, digital artists, and content creators.</b>
</p>

[🎮 Try Live Demo](https://theastrobruh.github.io/DeckGram/) • [✨ Features](#-key-features) • [⚡ Quick Start](#-quick-start)

---

</div>

## 📖 About The Project

**DeckGram** (v0.4.4) lets you import 2D card artwork (front and back) and instantly transform it into a photorealistic 3D trading card with customizable edges, reflective bevels, parametric rotation, multi-angle camera shots, and client-side high-definition vertical video export (9:16) tailored for Instagram Reels, TikTok, and YouTube Shorts.

---

## ✨ Key Features

### 🎴 3D Engine & Card Forge
- **Accurate Curves & Borders**: Procedural geometry supporting standard TCG rounded corners and adjustable reflective bevels.
- **Customizable Edges**: Variable thickness with Millennium Foil Gold, Metallic Silver, Matte Black, and White Cardstock finishes.
- **Specular & Gloss Tuning**: Fine-grained roughness, gloss, and reflection control.
- **Exposure Control**: Balanced default luminosity with manual exposure slider to prevent artwork blowout.
- **Animated Full Art Transition**: Base card smoothly transitions between normal artwork and its Full Art variant. Can be toggled on/off in the Deck panel.

### 🎥 Multi-Camera Shots & Motion Dynamics
- **Up to 3 Scene Keyframes**: Store camera angles, targets, and card elevations with fluid interpolated transitions between takes.
- **Spin Dynamics**: Adjustable rotation speeds, clockwise/counter-clockwise direction toggle, and tilt leveling.
- **Draggable Radial FAB Menu**: On-canvas quick shortcuts to center, invert rotation, level tilt, and save poses. The radial fan auto-orients dynamically away from viewport edges.
- **Cinematic Clean Screen Mode**: Hide all UI chrome with a single click (or pressing <kbd>C</kbd>) for pristine screen captures.

### 💾 Presets & Multilingual Support
- **Built-in Presets**: Preloaded with the base deck and themed showcases (*Shadowblade Kinetic*, *Volt Striker*, *Aureon, the Golden Maw*) with their respective fronts and backs.
- **Custom Local Presets**: Save and manage custom combinations of front, back, and Full Art locally in your browser storage.
- **Multilingual (EN / ES / DE)**: Default English interface with instant on-the-fly switching to Spanish or German.

---

## ⚡ Quick Start

### Play in Browser (No installation needed)
👉 **[Open DeckGram](https://theastrobruh.github.io/DeckGram/)**

### Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/theastrobruh/DeckGram.git
   cd DeckGram
   ```

2. **Launch local server**:
   - **On Windows**: Double-click `Iniciar_Webapp.bat`.
   - **With Python**:
     ```bash
     python -m http.server 8000
     ```
     Open `http://localhost:8000` in your web browser.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :---: | :--- |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> | Switch studio tabs (Deck, 3D Forge, Shots, Canvas) |
| <kbd>C</kbd> | Toggle Cinematic Clean Screen Mode |
| <kbd>R</kbd> | Start / Stop Video Recording |
| <kbd>S</kbd> | Capture High-Res PNG Snapshot |
| <kbd>?</kbd> | Open Shortcuts & Help dialog |
| <kbd>Esc</kbd> | Close dialogs / Exit Cinematic Mode |

---

## ☕ Support the Project

If you find DeckGram helpful or inspiring, consider supporting development on Ko-fi. Thank you!

[☕ **Thanks · Ko-fi**](https://ko-fi.com/theastrobruh)

---

## 🛠️ Built With

- **[Three.js (r128)](https://threejs.org/)** — WebGL 3D rendering engine.
- **Canvas Capture & MediaStream Recording API** — In-browser hardware video encoding.
- **HTML5 & Modern CSS3** — Responsive glassmorphic UI without heavyweight bundlers or build steps.

---
© 2026 DeckGram — by theAstroBruh
