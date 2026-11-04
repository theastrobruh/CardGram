<div align="center">

# 🎴 TCG:HUB
### *Interactive WebGL 3D Card Showcase & Reel Creator*
**by theAstroBruh**

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://theastrobruh.github.io/TCG-HUB/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

<p align="center">
  <b>Una suite de visualización y animación 3D en tiempo real inspirada en la estética de duelos TCG, diseñada para creadores de cartas coleccionables, artistas y creadores de contenido.</b>
</p>

[🎮 Probar Demo en Vivo](https://theastrobruh.github.io/TCG-HUB/) • [✨ Características](#-características) • [⚡ Inicio Rápido](#-inicio-rápido)

---

</div>

## 📖 Acerca del Proyecto

**TCG:HUB** permite importar diseños en 2D (anverso y reverso) y transformarlos al instante en una carta tridimensional fotorrealista con cantos ajustables, biseles reflectantes, rotación paramétrica, tomas multicámara y exportación en alta definición a video vertical (9:16) listo para Reels, TikTok y YouTube Shorts.

---

## ✨ Características Principales

### 🎴 Motor 3D & Forge de Cartas
- **Bordes y Curvatura Exacta**: Modelado procedural con soporte de esquinas redondeadas (TCG) y bisel reflectante ajustable.
- **Cantos Personalizables**: Grosor regulable y acabados en Oro Foil Milenario, Plata Metalizada, Negro Mate y Cartulina Blanca.
- **Acabado Especular**: Control milimétrico de rugosidad y brillo reflectante.

### 🎥 Tomas Multicámara & Animación
- **Capas de hasta 3 Escenas**: Guarda poses de cámara clave y reproduce transiciones fluidas de una toma a otra.
- **Dinámica de Giro**: Velocidades ajustables, inversión de sentido horario/antihorario y nivelación de inclinación.
- **Menú en Flor Radial**: Accesos rápidos en pantalla para centrar, invertir giro, nivelar y guardar poses al instante.
- **Modo Visor Cinemático (Clean Screen)**: Oculta toda la interfaz con un clic para grabaciones de pantalla directas y limpias.

### 💾 Presets y Bilingüe
- **Gestor de Presets**: Guarda combinaciones de anverso y reverso localmente en el navegador para intercambios rápidos.
- **Bilingüe (ES / EN)**: Interfaz intuitiva y minimalista en español e inglés.

---

## ⚡ Inicio Rápido

### Usar en el Navegador (Sin instalación)
👉 **[Abrir TCG:HUB](https://theastrobruh.github.io/TCG-HUB/)**

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

## 🛠️ Tecnologías

- **[Three.js (r128)](https://threejs.org/)** — Motor 3D y WebGL.
- **Canvas Capture & MediaStream Recording API** — Render y codificación de video en el cliente.
- **HTML5 & CSS3 Vanilla** — Sin dependencias externas ni compiladores requeridos.

---
© 2026 TCG:HUB — by theAstroBruh
