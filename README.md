# 3D Trading Card Studio — Reels & TikTok Creator 🎴✨

Una aplicación web interactiva en 3D para visualizar, personalizar y grabar cartas coleccionables estilizadas (estilo Pokémon, Magic, anime o custom cards), orientada a la creación de contenido vertical para TikTok, Instagram Reels y YouTube Shorts.

## 🚀 Demo en Vivo
Puedes probar la aplicación directamente en GitHub Pages:
> **URL**: `https://<tu-usuario-o-organizacion>.github.io/<nombre-del-repo>/`

---

## ✨ Características Principales

- **Render 3D en Tiempo Real**: Construido con **Three.js** y **OrbitControls** con soporte para sombras suaves e iluminación cinematográfica dual.
- **Efectos Holográficos / Foil**:
  - Efecto arcoíris reflectivo dinámico según la inclinación de la cámara.
  - Efecto de destellos (*glitter/sparkles*) reflectantes.
  - Opciones de relieve 3D (*bump mapping*) y curvatura sutil para realismo de carta física.
- **Borde Metálico / Foil**: Ajuste de color del borde, rugosidad y metalicidad (acabados oro, plata, cromo o neón).
- **Formatos de Grabación Directa**:
  - Vertical 9:16 (1080x1920) ideal para Reels / TikToks / Shorts.
  - Cuadrado 1:1 (1080x1080) para feeds.
  - Horizontal 16:9 (1920x1080) para landscape.
- **Animaciones Predefinidas**:
  - Giro 360 continuo (*Showcase Loop*).
  - Efecto de balanceo e inclinación (*Holo Tilt*).
  - Giro de Revelación con impacto (*Dramatic Flip*).
  - Efecto flotante suave (*Floating Idle*).
- **Exportación en Video y Captura HD**:
  - Grabación directa en formato `.webm` lista para descargar y editar.
  - Captura de fotos en alta resolución en formato `.png`.
- **Carga de Diseños Propios**: Sube fácilmente tu frontal y reverso personalizados directamente desde la interfaz.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 / CSS3 / JavaScript (Vanilla Moderno)**
- **[Three.js (r128)](https://threejs.org/)** — Motor 3D WebGL.
- **MediaStream Recording API & Canvas Capture** — Grabación directa de video en el navegador.

---

## 💻 Uso Local

Si prefieres ejecutarlo localmente:

1. **Opción rápida (Windows)**:
   - Haz doble clic en el archivo `Iniciar_Webapp.bat`. Se abrirá un servidor local en tu navegador predeterminado.
2. **Con Python**:
   ```bash
   python -m http.server 8000
   ```
   Abre en tu navegador: `http://localhost:8000`
3. **Con Node.js / npx**:
   ```bash
   npx serve .
   ```

---

## 🌐 Publicación en GitHub Pages

1. Ve a los **Settings** (Configuración) de tu repositorio en GitHub.
2. En la sección lateral izquierda, haz clic en **Pages**.
3. En **Build and deployment > Source**, selecciona `Deploy from a branch`.
4. En **Branch**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Haz clic en **Save**. En unos minutos tu webapp estará disponible en internet.
