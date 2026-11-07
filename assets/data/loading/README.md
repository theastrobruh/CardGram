# Loading screen

## Carpetas
- `desktop/` → fondos horizontales para PC. Recomendado: 1920×1080 o 2560×1440, WebP/JPG.
- `mobile/` → fondos verticales para teléfono. Recomendado: 1080×1920 o 1170×2532, WebP/JPG.

Luego actualiza `manifest.json`:

```json
{
  "desktop": ["assets/data/loading/desktop/fondo-1.webp"],
  "mobile": ["assets/data/loading/mobile/fondo-1.webp"]
}
```

Formatos: `.webp` (mejor peso), `.jpg`/`.jpeg`, `.png`.
Si una lista queda vacía, se usan las imágenes de respaldo del catálogo.