# Booster pack art

Coloca aquí los PNG de los sobres (con transparencia si quieres).

Luego edita `manifest.json` y asigna la ruta de cada set:

```json
{
  "packs": {
    "mew-tarot": "assets/data/shop_assets/packs/mew-tarot.png",
    "champion-verse": "assets/data/shop_assets/packs/champion-verse.png",
    "dungeons-history": "assets/data/shop_assets/packs/dungeons-history.png",
    "ygo": "assets/data/shop_assets/packs/ygo.png"
  }
}
```

Recomendado: PNG vertical, fondo transparente, aproximadamente 600×900 px.
Si un pack no tiene imagen, se usa el arte actual como respaldo.