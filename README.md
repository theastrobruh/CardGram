<div align="center">

# 🎴 3D Trading Card Studio
### *Interactive WebGL 3D Card Showcase & Content Creator for Reels, TikTok & Shorts*

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://the-astro-bruh.github.io/Card_3D_Webapp/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

<p align="center">
  <b>Una suite de visualización y animación 3D en tiempo real diseñada para creadores de cartas coleccionables (TCG), artistas digitales y creadores de contenido.</b>
</p>

[🎮 Probar Demo en Vivo](https://the-astro-bruh.github.io/Card_3D_Webapp/) • [✨ Características](#-características) • [⚡ Inicio Rápido](#-inicio-rápido) • [🎥 Modos de Grabación](#-modos-de-grabación)

---

</div>

## 📖 Acerca del Proyecto

**3D Trading Card Studio** permite importar diseños en 2D (anverso y reverso) y transformarlos al instante en una carta tridimensional fotorrealista con efectos holográficos avanzados, reflejos metálicos, texturas de relieve (*bump maps*) y animaciones cinemáticas listas para exportar a video (.webm) o capturas fotográficas en alta resolución (.png).

Optimizado con relaciones de aspecto estándar para **TikTok, Instagram Reels y YouTube Shorts (9:16)**, así como formatos cuadrados (**1:1**) y apaisados (**16:9**).

---

## ✨ Características

### 🌈 Shaders y Efectos Holográficos
- **Efecto Arcoíris Dinámico (*Rainbow Foil*)**: Reflejos iridiscentes calculados según el ángulo de visión de la cámara.
- **Partículas Glitter / Sparkles**: Destellos estelares sobre la superficie al mover la carta o la iluminación.
- **Bordes Metálicos Personalizables**: Selector de color, rugosidad (*roughness*) y reflectividad metálica (*metalness*) para simular oro, plata o acabados neón.
- **Relieve Físico 3D & Curvatura**: Simulación sutil del grosor y curvatura natural de una carta física real.

### 🎬 Modos de Animación Preestablecidos
| Animación | Descripción |
| :--- | :--- |
| **Showcase 360°** | Giro continuo y suave ideal para vitrinas virtuales y presentaciones. |
| **Holo Tilt** | Balanceo suave en múltiples ejes para destacar los brillos y foils holográficos. |
| **Dramatic Flip** | Giro de impacto diseñado para transiciones y vídeos de revelación (*Card Reveal*). |
| **Floating Idle** | Levitación fluida y sutil para estética de cartas míticas o legendarias. |

### 📹 Estudio de Grabación Integrado
- **Exportación Directa a Video**: Graba clips de vídeo con la **MediaStream Recording API** sin marcas de agua ni software externo.
- **Captura Instantánea en HD**: Exporta imágenes nítidas de la carta en cualquier pose.
- **Controles de Entorno**: Fondos personalizables (gradientes de estudio, negro profundo, verde croma para composición).

---

## ⚡ Inicio Rápido

### Usar en el Navegador (Sin instalación)
Puedes abrir directamente el proyecto en la web:
👉 **[Abrir 3D Trading Card Studio](https://the-astro-bruh.github.io/Card_3D_Webapp/)**

### Ejecutar Localmente

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/the-astro-bruh/Card_3D_Webapp.git
   cd Card_3D_Webapp
   ```

2. **Abrir en local**:
   - **En Windows**: Haz doble clic sobre `Iniciar_Webapp.bat`.
   - **Con Python**:
     ```bash
     python -m http.server 8000
     ```
     Accede en tu navegador a `http://localhost:8000`.
   - **Con Node / npx**:
     ```bash
     npx serve .
     ```

---

## 🛠️ Tecnologías

- **[Three.js (r128)](https://threejs.org/)** — Motor de renderizado 3D y WebGL.
- **Canvas Capture & MediaStream API** — Procesamiento y captura de vídeo en el navegador.
- **HTML5 & CSS3 Vanilla** — Interfaz limpia, responsiva y sin dependencias pesadas.

---

## 🤝 Contribuciones

Las contribuciones, sugerencias e informes de errores son bienvenidos:
1. Haz un Fork del proyecto.
2. Crea tu rama de características (`git checkout -b feature/NuevaCaracteristica`).
3. Confirma tus cambios (`git commit -m 'Añadir nueva característica'`).
4. Haz Push a la rama (`git push origin feature/NuevaCaracteristica`).
5. Abre un **Pull Request**.

---

<div align="center">
  <sub>Desarrollado con ❤️ para artistas, coleccionistas y creadores de contenido.</sub>
</div>
