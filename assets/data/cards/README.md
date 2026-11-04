# Catálogo de cartas

Estructura pensada para crecer por colecciones sin tocar el código del estudio.

```text
assets/data/cards/
├── catalog.js          ← manifiesto que lee la web app
├── tools/
│   └── make-thumbs.py  ← genera las miniaturas WebP del lobby
├── OG/
│   ├── SET-01/
│   │   ├── FRONT-01.png
│   │   ├── BACK-BASE.png
│   │   └── thumbs/
│   │       ├── FRONT-01.webp
│   │       └── BACK-BASE.webp
│   ├── SET-02/
│   └── SET-03/
├── YGO/
│   ├── FRONT-DMG_01.png
│   ├── FRONT-DMG_02 (FULL ART).png
│   ├── BACK-BASE.png
│   └── thumbs/
└── PSD/
    └── cards.psd       ← material fuente, no se carga en la web
```

## Convenciones de archivos

| Archivo | Uso |
| --- | --- |
| `FRONT-*.png` | Anverso (750 × 1050 o 1792 × 2400). |
| `BACK-BASE.png` | Reverso compartido por la colección. |
| `FRONT-* (FULL ART).png` | Variante Full Art opcional del mismo anverso. |
| `thumbs/*.webp` | Miniatura de 760 px que usa el lobby; el estudio usa el PNG. |
| `PSD/` | Fuentes editables; no se sirven en el visor 3D. |

## Miniaturas

El hub, la biblioteca y las rejillas de colecciones cargan `thumbs/*.webp`
para no descargar varios MB por tarjeta. El estudio 3D siempre usa el PNG
original. Después de añadir imágenes nuevas:

```bash
python assets/data/cards/tools/make-thumbs.py
```

## Añadir una colección

1. Crea la carpeta `assets/data/cards/<COLECCION>/SET-XX/`.
2. Copia el anverso y el reverso con los nombres de arriba.
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
  cover: 'assets/data/cards/NUEVA/SET-01/FRONT-01.png',
  thumbCover: 'assets/data/cards/NUEVA/SET-01/thumbs/FRONT-01.webp',
  cards: [
    {
      id: 'nueva-set-01',
      set: 'SET-01',
      number: '001',
      name: 'Nombre de la carta',
      type: 'Tipo — Subtipo',
      rarity: 'Rare',
      front: 'assets/data/cards/NUEVA/SET-01/FRONT-01.png',
      back: 'assets/data/cards/NUEVA/SET-01/BACK-BASE.png',
      thumbFront: 'assets/data/cards/NUEVA/SET-01/thumbs/FRONT-01.webp',
      thumbBack: 'assets/data/cards/NUEVA/SET-01/thumbs/BACK-BASE.webp',
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
