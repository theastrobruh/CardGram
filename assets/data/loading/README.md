# Loading screen

## Carpetas
- `desktop/` → fondos horizontales para PC. Recomendado: 1920×1080 o 2560×1440, WebP/JPG.

El boot usa siempre esta lista (el mismo arte en desktop y en móvil), así que no
hay una carpeta `mobile/` separada. Si algún día hacen falta fondos verticales,
crea la carpeta, añade la clave `"mobile"` al manifiesto y `boot.js` la usará
solo cuando falte `"desktop"`.

Luego actualiza `manifest.json`:

```json
{
  "desktop": ["assets/data/loading/desktop/fondo-1.webp"]
}
```

Formatos: `.webp` (mejor peso), `.jpg`/`.jpeg`, `.png`.
Si una lista queda vacía, se usan las imágenes de respaldo del catálogo.
