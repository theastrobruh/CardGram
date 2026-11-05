/* ==========================================================================
   CardGram — v0.5.5 · Catálogo de cartas
   Fuente única de verdad para el hub, la biblioteca y los presets integrados.

   Todas las imágenes viven en assets/data/cards/database/<COLECCIÓN>/ y sus
   miniaturas WebP en el subdirectorio thumbs/. No necesita servidor: se carga
   como script clásico para funcionar también al abrir index.html directamente.
   ========================================================================== */
'use strict';

(function () {
  const DB = 'assets/data/cards/database';

  const collections = [
    {
      id: 'og',
      name: 'OG Collection',
      shortName: 'OG',
      tagline: {
        en: 'Azura and the Arcana, the designs that started CardGram.',
        es: 'Azura y los Arcanos, los diseños que iniciaron CardGram.',
        de: 'Azura und die Arkana, die Designs, mit denen CardGram begann.'
      },
      description: {
        en: 'Six original pieces: the Lone Wanderer and her super form, plus four Arcana illustrations with a dark, magical finish.',
        es: 'Seis piezas originales: la Errante Solitaria y su super forma, más cuatro ilustraciones de los Arcanos con un acabado oscuro y mágico.',
        de: 'Sechs Originalstücke: die Einsame Wanderin und ihre Superform sowie vier Arkana-Illustrationen mit dunklem, magischem Finish.'
      },
      accent: ['#7cebdd', '#2f8fdd'],
      cover: `${DB}/OG/FRONT_A_00_AZURA_LONE-WANDERER.png`,
      thumbCover: `${DB}/OG/thumbs/FRONT_A_00_AZURA_LONE-WANDERER.webp`,
      cards: [
        {
          id: 'og-azura-lone-wanderer',
          set: 'A-00',
          number: '000',
          name: 'Azura, Lone Wanderer',
          type: 'Human — Rogue',
          rarity: 'Mythic Rare',
          front: `${DB}/OG/FRONT_A_00_AZURA_LONE-WANDERER.png`,
          back: `${DB}/OG/BACK_A_00.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_00_AZURA_LONE-WANDERER.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_00.webp`,
          fullArt: `${DB}/OG/FRONT_A_00_AZURA_LONE-WANDERER(FULL-ART).png`,
          thumbFullArt: `${DB}/OG/thumbs/FRONT_A_00_AZURA_LONE-WANDERER(FULL-ART).webp`,
          stats: { STR: 6, AGI: 9, INT: 8 },
          lore: 'Shadow Step: Azura cannot be blocked by creatures with less AGI. Twin Blades: whenever Azura attacks, she may strike twice.'
        },
        {
          id: 'og-azura-ss',
          set: 'A-02',
          number: '002',
          name: 'Azura S.S.',
          type: 'Warrior — Saiyan',
          rarity: 'Mythic Rare',
          front: `${DB}/OG/FRONT_A_02_AZURA SS.png`,
          back: `${DB}/OG/BACK_A_02.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_02_AZURA SS.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_02.webp`,
          fullArt: `${DB}/OG/FRONT_A_02_AZURA SS(FULL-ART).png`,
          thumbFullArt: `${DB}/OG/thumbs/FRONT_A_02_AZURA SS(FULL-ART).webp`,
          stats: { ATK: 22000 },
          lore: 'Can attack twice per turn. Discard 1 card to destroy an opponent’s unit.'
        },
        {
          id: 'og-the-devil',
          set: 'A-03',
          number: '003',
          name: 'The Devil',
          rarity: 'Rare',
          front: `${DB}/OG/FRONT_A_03-The-Devil.png`,
          back: `${DB}/OG/BACK_A_03.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_03-The-Devil.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_03.webp`,
          fullArt: null,
          lore: 'A little hellion with horns, wings and a golden thread to pull.'
        },
        {
          id: 'og-the-hermit',
          set: 'A-04',
          number: '004',
          name: 'The Hermit',
          rarity: 'Rare',
          front: `${DB}/OG/FRONT_A_04-The-Hermit.png`,
          back: `${DB}/OG/BACK_A_04.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_04-The-Hermit.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_04.webp`,
          fullArt: null,
          lore: 'A lonely lantern-bearer wandering the frozen wilds.'
        },
        {
          id: 'og-blow',
          set: 'A-05',
          number: '005',
          name: 'Blow',
          rarity: 'Rare',
          front: `${DB}/OG/FRONT_A_05-Blow.png`,
          back: `${DB}/OG/BACK_A_05.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_05-Blow.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_05.webp`,
          fullArt: null,
          lore: 'The crowned cat watching the storm from its burning tower.'
        },
        {
          id: 'og-azura',
          set: 'A-06',
          number: '006',
          name: 'Azura',
          rarity: 'Rare',
          front: `${DB}/OG/FRONT_A_06-Azura.png`,
          back: `${DB}/OG/BACK_A_06.png`,
          thumbFront: `${DB}/OG/thumbs/FRONT_A_06-Azura.webp`,
          thumbBack: `${DB}/OG/thumbs/BACK_A_06.webp`,
          fullArt: null,
          lore: 'Azura, as seen through the Astro-Verse window.'
        }
      ]
    },
    {
      id: 'fan-art',
      name: 'Fan Art',
      shortName: 'FAN',
      tagline: {
        en: 'Tributes to Dragon Ball and Mega Man.',
        es: 'Tributos a Dragon Ball y Mega Man.',
        de: 'Tribute an Dragon Ball und Mega Man.'
      },
      description: {
        en: 'Five fan pieces: two Super Saiyans, Ultimate Gohan, and the Reploid duo X and Zero, each with its own back.',
        es: 'Cinco piezas fan: dos Super Saiyans, Gohan Definitivo y el dúo Reploid X y Zero, cada una con su propio reverso.',
        de: 'Fünf Fan-Stücke: zwei Super Saiyajins, Ultimate Gohan und das Reploiden-Duo X und Zero, jede mit eigener Rückseite.'
      },
      accent: ['#ffb15e', '#ff5e5b'],
      cover: `${DB}/FAN ART/FRONT_DBZ-01_SUPER_SAIYAN.png`,
      thumbCover: `${DB}/FAN ART/thumbs/FRONT_DBZ-01_SUPER_SAIYAN.webp`,
      cards: [
        {
          id: 'fan-dbz-01',
          set: 'DBZ-01',
          number: '001',
          name: 'Super Saiyan Goku',
          type: 'Warrior',
          rarity: 'Ultra Rare',
          front: `${DB}/FAN ART/FRONT_DBZ-01_SUPER_SAIYAN.png`,
          back: `${DB}/FAN ART/BACK_DBZ.png`,
          thumbFront: `${DB}/FAN ART/thumbs/FRONT_DBZ-01_SUPER_SAIYAN.webp`,
          thumbBack: `${DB}/FAN ART/thumbs/BACK_DBZ.webp`,
          fullArt: null,
          stats: { ATK: 3300, DEF: 2500 },
          lore: 'If this Unit destroys another Unit while Attacking, it can attack again.'
        },
        {
          id: 'fan-dbz-02',
          set: 'DBZ-02',
          number: '002',
          name: 'Super Saiyan Vegeta',
          type: 'Warrior',
          rarity: 'Ultra Rare',
          front: `${DB}/FAN ART/FRONT_DBZ-02_SUPER_SAIYAN.png`,
          back: `${DB}/FAN ART/BACK_DBZ.png`,
          thumbFront: `${DB}/FAN ART/thumbs/FRONT_DBZ-02_SUPER_SAIYAN.webp`,
          thumbBack: `${DB}/FAN ART/thumbs/BACK_DBZ.webp`,
          fullArt: null,
          stats: { ATK: 3300, DEF: 2500 },
          lore: 'If this Unit destroys another Unit while Attacking, it can attack again.'
        },
        {
          id: 'fan-dbz-03',
          set: 'DBZ-03',
          number: '003',
          name: 'Ultimate Gohan',
          type: 'Warrior',
          rarity: 'Mythic Rare',
          front: `${DB}/FAN ART/FRONT_DBZ-03_ULTIMATE-GOHAN.png`,
          back: `${DB}/FAN ART/BACK_DBZ.png`,
          thumbFront: `${DB}/FAN ART/thumbs/FRONT_DBZ-03_ULTIMATE-GOHAN.webp`,
          thumbBack: `${DB}/FAN ART/thumbs/BACK_DBZ.webp`,
          fullArt: null,
          stats: { ATK: 3800, DEF: 3200 },
          lore: 'Unleashes ultimate dormant power. If this Unit destroys another Unit while Attacking, it can attack again.'
        },
        {
          id: 'fan-mx-x',
          set: 'MX-X',
          number: '004',
          name: 'X',
          type: 'Reploid — Hunter',
          rarity: 'Rare',
          front: `${DB}/FAN ART/FRONT_MX_X.png`,
          back: `${DB}/FAN ART/BACK_MX_X.png`,
          thumbFront: `${DB}/FAN ART/thumbs/FRONT_MX_X.webp`,
          thumbBack: `${DB}/FAN ART/thumbs/BACK_MX_X.webp`,
          fullArt: null,
          stats: { ATK: 2200, DEF: 2000 },
          lore: 'If this Unit is summoned on Main Phase, you can target up to 2 cards on the field and destroy both.'
        },
        {
          id: 'fan-mx-zero',
          set: 'MX-ZERO',
          number: '005',
          name: 'Zero',
          type: 'Reploid — Warrior',
          rarity: 'Rare',
          front: `${DB}/FAN ART/FRONT_MX_ZERO.png`,
          back: `${DB}/FAN ART/BACK_MX_ZERO.png`,
          thumbFront: `${DB}/FAN ART/thumbs/FRONT_MX_ZERO.webp`,
          thumbBack: `${DB}/FAN ART/thumbs/BACK_MX_ZERO.webp`,
          fullArt: null,
          stats: { ATK: 2200, DEF: 2000 },
          lore: 'If this Unit is summoned on Main Phase, you can target up to 2 cards on the field and destroy both.'
        }
      ]
    },
    {
      id: 'ygo',
      name: 'Yu-Gi-Oh!',
      shortName: 'YGO',
      tagline: {
        en: 'High-gloss fan art with Full Art variants.',
        es: 'Fan art de alto brillo con variantes Full Art.',
        de: 'Hochglanz-Fanart mit Full-Art-Varianten.'
      },
      description: {
        en: 'Three collector pieces with two finishes: the normal artwork and its animated Full Art version inside the studio.',
        es: 'Tres piezas de colección con dos acabados: el arte normal y su versión Full Art animada dentro del estudio.',
        de: 'Drei Sammlerstücke mit zwei Looks: das normale Artwork und die animierte Full-Art-Version im Studio.'
      },
      accent: ['#b06bff', '#3d7bff'],
      cover: `${DB}/YGO/FRONT_YGO_01.png`,
      thumbCover: `${DB}/YGO/thumbs/FRONT_YGO_01.webp`,
      cards: [
        {
          id: 'ygo-dmg',
          set: 'YGO-01',
          number: '001',
          name: 'Dark Magician Girl',
          type: 'Spellcaster / Effect',
          attribute: 'DARK',
          rarity: 'Ultra Rare',
          front: `${DB}/YGO/FRONT_YGO_01.png`,
          back: `${DB}/YGO/BACK_YGO_01.png`,
          thumbFront: `${DB}/YGO/thumbs/FRONT_YGO_01.webp`,
          thumbBack: `${DB}/YGO/thumbs/BACK_YGO_01.webp`,
          fullArt: `${DB}/YGO/FRONT_YGO_01(FULL-ART).png`,
          thumbFullArt: `${DB}/YGO/thumbs/FRONT_YGO_01(FULL-ART).webp`,
          stats: { ATK: 2000, DEF: 1700 },
          lore: 'Gains 300 ATK for every "Dark Magician" or "Magician of Black Chaos" in the GYs.'
        },
        {
          id: 'ygo-dark-magician',
          set: 'YGO-02',
          number: '002',
          name: 'Dark Magician',
          type: 'Spellcaster',
          attribute: 'DARK',
          rarity: 'Ultra Rare',
          front: `${DB}/YGO/FRONT_YGO_02.png`,
          back: `${DB}/YGO/BACK_YGO_01.png`,
          thumbFront: `${DB}/YGO/thumbs/FRONT_YGO_02.webp`,
          thumbBack: `${DB}/YGO/thumbs/BACK_YGO_01.webp`,
          fullArt: `${DB}/YGO/FRONT_YGO_02(FULL-ART).png`,
          thumbFullArt: `${DB}/YGO/thumbs/FRONT_YGO_02(FULL-ART).webp`,
          stats: { ATK: 2500, DEF: 2100 },
          lore: 'The ultimate wizard in terms of attack and defense.'
        },
        {
          id: 'ygo-magikuriboh',
          set: 'YGO-03',
          number: '003',
          name: 'Dark Magikuriboh',
          type: 'Spellcaster / Effect',
          attribute: 'DARK',
          rarity: 'Rare',
          front: `${DB}/YGO/FRONT_YGO_03.png`,
          back: `${DB}/YGO/BACK_YGO_01.png`,
          thumbFront: `${DB}/YGO/thumbs/FRONT_YGO_03.webp`,
          thumbBack: `${DB}/YGO/thumbs/BACK_YGO_01.webp`,
          fullArt: `${DB}/YGO/FRONT_YGO_03(FULL-ART).png`,
          thumbFullArt: `${DB}/YGO/thumbs/FRONT_YGO_03(FULL-ART).webp`,
          stats: { ATK: 300, DEF: 200 },
          lore: 'The ultimate kuriboh in terms of magical illusion and fluffy defense.'
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
    version: '0.5.5',
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
