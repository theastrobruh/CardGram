# Catálogo de cartas

Estructura pensada para crecer por colecciones sin tocar el código del estudio.

```text
assets/data/cards/
├── catalog.js              ← manifiesto que lee la web app
├── tools/
│   ├── optimize-sets.py    ← convierte a WebP, genera miniaturas y reversos
│   └── make-thumbs.py      ← regenera solo las miniaturas del lobby
└── database/               ← única carpeta de imágenes de cartas
    ├── _shared/
    │   ├── BACK_CARDGRAM.webp
    │   └── thumbs/
    ├── Mew Tarot/          ← 22/22 cartas · set completo
    │   ├── 00 - BACKCARD-MEWTAROT.webp
    │   ├── 00 - The Fool.webp   (896 × 1200)
    │   └── thumbs/00 - The Fool.webp
    ├── Champion-Verse/     ← 13/22 cartas · faltan 9 por revelar
    │   ├── 00-BACKCARD-CHAMPION-VERSE.webp
    │   ├── S00_VEGITO.webp
    │   └── thumbs/
    ├── Dungeons and History/ ← 6/22 cartas · faltan 16 por revelar
    │   ├── 00_BACKCARD_DUNGEONSANDHISTORY.webp
    │   ├── DH_00_AZURA.webp
    │   └── thumbs/
    └── YGO/                ← 3 cartas · único set con Full Art
        ├── FRONT_YGO_01.webp
        ├── FRONT_YGO_01(FULL-ART).webp
        ├── BACK_YGO_01.webp
        └── thumbs/
```

## Convenciones de archivos

| Archivo | Uso |
| --- | --- |
| `FRONT_*.webp` / `<nombre>.webp` | Anverso optimizado a 896 × 1200. |
| `*BACKCARD*.webp` | Reverso oficial del set; si no existe se usa `_shared/BACK_CARDGRAM.webp`. |
| `FRONT_*(FULL-ART).webp` | Variante Full Art opcional del mismo anverso. |
| `thumbs/*.webp` | Miniatura de 760 px que usa el lobby; el estudio usa el WebP grande. |

## Optimización

Todo el catálogo se sirve en WebP. Para reprocesar los sets activos:

```bash
python assets/data/cards/tools/optimize-sets.py
```

El script convierte anversos y reversos a 896 × 1200 (calidad 82), genera las
miniaturas de 760 px y elimina los formatos pesados de origen. Los sets `OG` y
`FAN ART` se retiraron junto con sus imágenes.

## Sets y sobre diario

- `Mew Tarot` está completo: 22 de 22 cartas.
- `Champion-Verse` y `Dungeons and History` están en construcción: se declaran
  con `setSize: 22`, por lo que el hub muestra cuántas cartas faltan.
- `YGO` no entra en el sobre diario (`booster: false`) porque es el set de
  exhibición de Full Art.

El sobre diario entrega 4 cartas aleatorias del set que elija el usuario, una
vez al día, y guarda la colección en `localStorage` (`cardgram.booster.v1`).

## Añadir una colección

1. Crea la carpeta `assets/data/cards/database/<COLECCION>/` en WebP.
2. Añade la colección al array `newSets` de `catalog.js`:

```js
{
  id: 'nueva',
  folder: 'Nueva Colección',
  name: 'Nueva Colección',
  shortName: 'NUEVA',
  setSize: 22,
  booster: true,
  complete: false,
  accent: ['#7cebdd', '#2f8fdd'],
  tagline: { en: '…', es: '…', de: '…' },
  description: { en: '…', es: '…', de: '…' },
  backs: { full: '…', thumb: '…' },
  cards: [
    ['FRONT_01', 'Nombre', 'Tipo — Subtipo', 'Rare', { ATK: 2000, DEF: 1700 }, 'Texto de sabor.']
  ]
}
```

El hub, la biblioteca, el sobre diario, los presets integrados y el selector de
carta favorita se actualizan solos. Las rutas deben empezar por `assets/` y las
imágenes se cargan desde el mismo origen (sin peticiones externas).
