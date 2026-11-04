<div align="center">

# 🎴 DeckGram
### *Interactive WebGL 3D Card Showcase & Reel Creator*
**by theAstroBruh**

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://theastrobruh.github.io/TCG-HUB/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Version](https://img.shields.io/badge/Version-v0.4.4-00d2d3?style=for-the-badge)](https://github.com/theastrobruh/TCG-HUB)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Ko-fi](https://img.shields.io/badge/Thanks-Ko--fi-ff5e5b?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/theastrobruh)

<br/>

<p align="center">
  <b>La red social visual y estudio 3D en tiempo real para cartas coleccionables, artistas y creadores de contenido.</b>
</p>

[🎮 Probar Demo en Vivo](https://theastrobruh.github.io/TCG-HUB/) • [✨ Características](#-características) • [⚡ Inicio Rápido](#-inicio-rápido)

---

</div>

## 📖 Acerca del Proyecto

**DeckGram** (v0.4.4) permite importar diseños en 2D (anverso y reverso) y transformarlos al instante en una carta tridimensional fotorrealista con cantos ajustables, biseles reflectantes, rotación paramétrica, tomas multicámara y exportación en alta definición a video vertical (9:16) listo para Reels, TikTok y YouTube Shorts.

---

## ✨ Características Principales

### 🎴 Motor 3D & Forge de Cartas
- **Bordes y Curvatura Exacta**: Modelado procedural con soporte de esquinas redondeadas (TCG) y bisel reflectante ajustable.
- **Cantos Personalizables**: Grosor regulable y acabados en Oro Foil Milenario, Plata Metalizada, Negro Mate y Cartulina Blanca.
- **Acabado Especular**: Control milimétrico de rugosidad y brillo reflectante.
- **Luminosidad Ajustable**: Exposición más contenida por defecto y control manual para evitar que los diseños se vean demasiado claros.
- **Full Art Animado**: La carta base alterna suavemente entre el arte normal y su versión Full Art. La animación se puede activar o desactivar desde el panel Deck.

### 🎥 Tomas Multicámara & Animación
- **Capas de hasta 3 Escenas**: Guarda poses de cámara clave y reproduce transiciones fluidas de una toma a otra.
- **Dinámica de Giro**: Velocidades ajustables, inversión de sentido horario/antihorario y nivelación de inclinación.
- **Menú en Flor Radial**: Accesos rápidos en pantalla para centrar, invertir giro, nivelar y guardar poses al instante. Arrastra el botón para moverlo y el abanico se orienta solo para no salirse del lienzo.
- **Modo Visor Cinemático (Clean Screen)**: Oculta toda la interfaz con un clic para grabaciones de pantalla directas y limpias.

### 💾 Presets y Bilingüe
- **Presets Integrados**: Incluye la carta base y los decks Shadowblade Kinetic, Volt Striker y Aureon, the Golden Maw con sus anversos y reversos.
- **Presets Personalizados**: Guarda combinaciones de anverso, reverso y Full Art localmente en el navegador. Cada preset muestra miniaturas de sus dos caras.
- **Multilingüe (EN / ES / DE)**: Interfaz minimalista en inglés por defecto, con cambio instantáneo a español o alemán desde el botón de mundo.

---

## ⚡ Inicio Rápido

### Usar en el Navegador (Sin instalación)
👉 **[Abrir DeckGram](https://theastrobruh.github.io/TCG-HUB/)**

### Ejecutar Localmente

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/theastrobruh/TCG-HUB.git
   cd TCG-HUB
   ```

2. **Abrir en local**:
   - **En Windows**: Haz doble clic sobre `Iniciar_Webapp.bat`.
   - **Con Python**:
     ```bash
     python -m http.server 8000
     ```
     Accede en tu navegador a `http://localhost:8000`.

---

## ☕ Apoya el Proyecto

Si DeckGram te resulta útil, puedes invitarme un café en Ko-fi. ¡Gracias por el apoyo!

[☕ **Thanks · Ko-fi**](https://ko-fi.com/theastrobruh)

---

## 🛠️ Tecnologías

- **[Three.js (r128)](https://threejs.org/)** — Motor 3D y WebGL.
- **Canvas Capture & MediaStream Recording API** — Render y codificación de video en el cliente.
- **HTML5 & CSS3 Vanilla** — Sin dependencias externas ni compiladores requeridos.

---
© 2026 DeckGram — by theAstroBruh
