# Catálogo de cartas

Estructura pensada para crecer por colecciones sin tocar el código del estudio.

```text
assets/data/cards/
├── catalog.js          ← manifiesto que lee la web app
├── tools/
│   └── make-thumbs.py  ← genera las miniaturas WebP del lobby
└── database/           ← única carpeta de imágenes de cartas
    ├── OG/
    │   ├── FRONT_A_00_AZURA_LONE-WANDERER.png
    │   ├── FRONT_A_00_AZURA_LONE-WANDERER(FULL-ART).png
    │   ├── BACK_A_00.png
    │   └── thumbs/
    ├── FAN ART/
    │   ├── FRONT_DBZ-01_SUPER_SAIYAN.png
    │   ├── BACK_DBZ.png
    │   └── thumbs/
    └── YGO/
        ├── FRONT_YGO_01.png
        ├── FRONT_YGO_01(FULL-ART).png
        ├── BACK_YGO_01.png
        └── thumbs/
```

## Convenciones de archivos

| Archivo | Uso |
| --- | --- |
| `FRONT_*.png` | Anverso (1792 × 2400). |
| `BACK_*.png` | Reverso de la carta o de la colección. |
| `FRONT_* (FULL-ART).png` | Variante Full Art opcional del mismo anverso. |
| `thumbs/*.webp` | Miniatura de 760 px que usa el lobby; el estudio usa el PNG. |

## Miniaturas

El hub, la biblioteca y las rejillas de colecciones cargan `thumbs/*.webp`
para no descargar varios MB por tarjeta. El estudio 3D siempre usa el PNG
original. Después de añadir imágenes nuevas:

```bash
python assets/data/cards/tools/make-thumbs.py --root assets/data/cards/database
```

## Añadir una colección

1. Crea la carpeta `assets/data/cards/database/<COLECCION>/`.
2. Copia los anversos y reversos con los nombres de arriba.
3. Añade la colección al array `collections` de `catalog.js`:

```js
{
  id: 'nueva',
  name: 'Nueva Colección',
  shortName: 'NUEVA',
  tagline: {
    en: 'A short line for the hub.',
    es: 'Una línea corta para el hub.',
    de: 'Eine kurze Zeile für das Lobby.'
  },
  description: {
    en: 'Collection presentation text.',
    es: 'Texto de presentación de la colección.',
    de: 'Vorstellungstext der Sammlung.'
  },
  accent: ['#7cebdd', '#2f8fdd'],
  cover: 'assets/data/cards/database/NUEVA/FRONT_01.png',
  thumbCover: 'assets/data/cards/database/NUEVA/thumbs/FRONT_01.webp',
  cards: [
    {
      id: 'nueva-01',
      set: 'SET-01',
      number: '001',
      name: 'Nombre de la carta',
      type: 'Tipo — Subtipo',
      rarity: 'Rare',
      front: 'assets/data/cards/database/NUEVA/FRONT_01.png',
      back: 'assets/data/cards/database/NUEVA/BACK_01.png',
      thumbFront: 'assets/data/cards/database/NUEVA/thumbs/FRONT_01.webp',
      thumbBack: 'assets/data/cards/database/NUEVA/thumbs/BACK_01.webp',
      fullArt: null,
      stats: { ATK: 2000, DEF: 1700 },
      lore: 'Texto de sabor.'
    }
  ]
}
```

El hub, la biblioteca, los presets integrados y el selector de carta favorita
se actualizan solos. Las rutas deben empezar por `assets/` y las imágenes se
cargan desde el mismo origen (sin peticiones externas).
