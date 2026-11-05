/* ==========================================================================
   CardGram — v0.4.5 · Catálogo de cartas
   Estructura segmentada por colección. Cada colección es una carpeta dentro
   de /assets/data/cards y cada carta referencia sus dos (o tres) texturas.

   Este archivo es la única fuente de verdad para el hub, la biblioteca y los
   presets integrados. No necesita servidor: se carga como script clásico para
   funcionar también al abrir index.html directamente.
   ========================================================================== */
'use strict';

(function () {
  const collections = [
    {
      id: 'og',
      name: 'OG Collection',
      shortName: 'OG',
      tagline: {
        en: 'The original designs that started CardGram.',
        es: 'Los diseños originales que iniciaron CardGram.',
        de: 'Die Originaldesigns, mit denen CardGram begann.'
      },
      description: {
        en: 'Three foundational cards with dark fantasy, energy and mythology finishes. The starting point of the studio.',
        es: 'Tres cartas fundacionales con acabados de fantasía oscura, energía y mitología. El punto de partida del estudio.',
        de: 'Drei Grundkarten mit Dark-Fantasy-, Energie- und Mythen-Looks. Der Ausgangspunkt des Studios.'
      },
      accent: ['#7cebdd', '#2f8fdd'],
      cover: 'assets/data/cards/OG/SET-01/FRONT-01.png',
      thumbCover: 'assets/data/cards/OG/SET-01/thumbs/FRONT-01.webp',
      cards: [
        {
          id: 'og-set-01',
          set: 'SET-01',
          number: '001',
          name: 'Shadowblade Kinetic',
          type: 'Human — Rogue',
          rarity: 'Rare',
          front: 'assets/data/cards/OG/SET-01/FRONT-01.png',
          back: 'assets/data/cards/OG/SET-01/BACK-BASE.png',
          thumbFront: 'assets/data/cards/OG/SET-01/thumbs/FRONT-01.webp',
          thumbBack: 'assets/data/cards/OG/SET-01/thumbs/BACK-BASE.webp',
          fullArt: null,
          stats: { STR: 5, AGI: 9, INT: 5 },
          lore: 'The shadows obey those who move faster than light.'
        },
        {
          id: 'og-set-02',
          set: 'SET-02',
          number: '002',
          name: 'Volt Striker',
          type: 'Hero — Striker',
          rarity: 'Rare',
          front: 'assets/data/cards/OG/SET-02/FRONT-01.png',
          back: 'assets/data/cards/OG/SET-02/BACK-BASE.png',
          thumbFront: 'assets/data/cards/OG/SET-02/thumbs/FRONT-01.webp',
          thumbBack: 'assets/data/cards/OG/SET-02/thumbs/BACK-BASE.webp',
          fullArt: null,
          stats: { POWER: 5000 },
          lore: 'Let the storm consume you!'
        },
        {
          id: 'og-set-03',
          set: 'SET-03',
          number: '003',
          name: 'Aureon, the Golden Maw',
          type: 'Legendary Ancient Dragon',
          rarity: 'Mythic Rare',
          front: 'assets/data/cards/OG/SET-03/FRONT-01.png',
          back: 'assets/data/cards/OG/SET-03/BACK-BASE.png',
          thumbFront: 'assets/data/cards/OG/SET-03/thumbs/FRONT-01.webp',
          thumbBack: 'assets/data/cards/OG/SET-03/thumbs/BACK-BASE.webp',
          fullArt: null,
          stats: { POWER: 8, DEFENSE: 8 },
          lore: 'When Aureon enters the battlefield, deal 5 damage to all other characters.'
        }
      ]
    },
    {
      id: 'ygo',
      name: 'Yu-Gi-Oh!',
      shortName: 'YGO',
      tagline: {
        en: 'High-gloss fan art with a Full Art variant.',
        es: 'Fan art de alto brillo con variante Full Art.',
        de: 'Hochglanz-Fanart mit Full-Art-Variante.'
      },
      description: {
        en: 'A collector piece with two finishes: the normal artwork and its animated Full Art version inside the studio.',
        es: 'Una pieza de colección con dos acabados: el arte normal y su versión Full Art animada dentro del estudio.',
        de: 'Ein Sammlerstück mit zwei Looks: das normale Artwork und die animierte Full-Art-Version im Studio.'
      },
      accent: ['#b06bff', '#3d7bff'],
      cover: 'assets/data/cards/YGO/FRONT-DMG_01.png',
      thumbCover: 'assets/data/cards/YGO/thumbs/FRONT-DMG_01.webp',
      cards: [
        {
          id: 'ygo-dmg',
          set: 'DMG-01',
          number: '001',
          name: 'Dark Magician Girl',
          type: 'Spellcaster / Effect',
          rarity: 'Ultra Rare',
          front: 'assets/data/cards/YGO/FRONT-DMG_01.png',
          back: 'assets/data/cards/YGO/BACK-BASE.png',
          thumbFront: 'assets/data/cards/YGO/thumbs/FRONT-DMG_01.webp',
          thumbBack: 'assets/data/cards/YGO/thumbs/BACK-BASE.webp',
          fullArt: 'assets/data/cards/YGO/FRONT-DMG_02 (FULL ART).png',
          thumbFullArt: 'assets/data/cards/YGO/thumbs/FRONT-DMG_02 (FULL ART).webp',
          stats: { ATK: 2000, DEF: 1700 },
          lore: 'Gains 300 ATK for every "Dark Magician" or "Magician of Black Chaos" in the GYs.'
        }
      ]
    }
  ];

  /* Cartas aplanadas con la información de su colección adjunta. */
  const cards = collections.flatMap((collection) =>
    collection.cards.map((card) => ({
      ...card,
      collectionId: collection.id,
      collectionName: collection.name,
      collectionShortName: collection.shortName,
      collectionAccent: collection.accent
    }))
  );

  const byId = (id) => cards.find((card) => card.id === id) || null;

  const collectionOf = (cardOrId) => {
    const id = typeof cardOrId === 'string' ? cardOrId : cardOrId && cardOrId.id;
    const card = byId(id);
    if (!card) return null;
    return collections.find((collection) => collection.id === card.collectionId) || null;
  };

  const featured = cards[0] || null;

  window.CARDGRAM_CARDS = {
    version: '0.4.5',
    updated: '2026-11-04',
    collections,
    cards,
    featuredId: featured ? featured.id : null
  };

  window.CardGramCatalog = {
    collections,
    cards,
    byId,
    collectionOf,
    featured
  };
})();
