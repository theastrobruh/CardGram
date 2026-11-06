/* ==========================================================================
   CardGram — v0.5.5 · Catálogo de cartas
   Fuente única de verdad para el hub, la biblioteca y los presets integrados.

   Sets activos: Mew Tarot (22/22), Champion-Verse (13/22),
   Dungeons and History (6/22) y Yu-Gi-Oh! (3 cartas, con Full Art).
   Todas las imágenes viven en assets/data/cards/database/<SET>/ como WebP
   896 × 1200, con miniaturas en thumbs/ (760 px). Sin servidor: se carga como
   script clásico para funcionar también al abrir index.html directamente.
   ========================================================================== */
'use strict';

(function () {
  const DB = 'assets/data/cards/database';
  const SHARED_BACK = `${DB}/_shared/BACK_CARDGRAM.webp`;
  const SHARED_BACK_THUMB = `${DB}/_shared/thumbs/BACK_CARDGRAM.webp`;
  const SET_BACKS = {
    'mew-tarot': {
      full: `${DB}/Mew Tarot/00 - BACKCARD-MEWTAROT.webp`,
      thumb: `${DB}/Mew Tarot/thumbs/00 - BACKCARD-MEWTAROT.webp`
    },
    'champion-verse': {
      full: `${DB}/Champion-Verse/00-BACKCARD-CHAMPION-VERSE.webp`,
      thumb: `${DB}/Champion-Verse/thumbs/00-BACKCARD-CHAMPION-VERSE.webp`
    },
    'dungeons-history': {
      full: `${DB}/Dungeons and History/00_BACKCARD_DUNGEONSANDHISTORY.webp`,
      thumb: `${DB}/Dungeons and History/thumbs/00_BACKCARD_DUNGEONSANDHISTORY.webp`
    },
    ygo: {
      full: `${DB}/YGO/BACK_YGO_01.webp`,
      thumb: `${DB}/YGO/thumbs/BACK_YGO_01.webp`
    }
  };

  const pad = (value) => String(value).padStart(2, '0');

  /* Los sets nuevos se declaran por archivo; el manifiesto resuelve rutas,
     numeración y el reverso compartido. */
  const newSets = [
    {
      id: 'mew-tarot',
      folder: 'Mew Tarot',
      name: 'Mew Tarot',
      shortName: 'MEW',
      setSize: 22,
      booster: true,
      complete: true,
      accent: ['#c9a7ff', '#5f7cff'],
      tagline: {
        en: 'The 22 Major Arcana, illustrated with a curious little mew.',
        es: 'Los 22 Arcanos Mayores, ilustrados por un curioso pequeño miau.',
        de: 'Die 22 Großen Arkana, illustriert von einem neugierigen kleinen Miau.'
      },
      description: {
        en: 'A complete tarot deck: every Major Arcana from The Fool to The World, in soft watercolor and gold.',
        es: 'Una baraja de tarot completa: todos los Arcanos Mayores, del Loco al Mundo, en acuarela suave y oro.',
        de: 'Ein vollständiges Tarot-Deck: alle Großen Arkana vom Narr bis zur Welt, in sanftem Aquarell und Gold.'
      },
      cards: [
        ['00 - The Fool', 'The Fool', 'Arcana — Major', 'Mythic Rare', null, 'A leap of faith. New beginnings, curiosity and the courage to start without guarantees.'],
        ['01 - The Magician', 'The Magician', 'Arcana — Major', 'Mythic Rare', null, 'Will made real. Skill, focus and the spark that turns intention into action.'],
        ['02 - The High Priestess', 'The High Priestess', 'Arcana — Major', 'Ultra Rare', null, 'Quiet knowing. Intuition, secrets and the wisdom that waits beneath the surface.'],
        ['03 The Empress', 'The Empress', 'Arcana — Major', 'Ultra Rare', null, 'Abundance and care. Creation that grows when it is nurtured.'],
        ['04 - The Emperor', 'The Emperor', 'Arcana — Major', 'Ultra Rare', null, 'Structure and resolve. The throne is built one clear decision at a time.'],
        ['05 - The Hierophant', 'The Hierophant', 'Arcana — Major', 'Rare', null, 'Tradition and teaching. Wisdom passed down, and the rules worth keeping.'],
        ['06 - The Lovers', 'The Lovers', 'Arcana — Major', 'Rare', null, 'A choice of the heart. Connection, harmony and the paths that meet.'],
        ['07 - The Chariot', 'The Chariot', 'Arcana — Major', 'Rare', null, 'Momentum under control. Drive, direction and victory through discipline.'],
        ['08 - Strenght', 'Strength', 'Arcana — Major', 'Rare', null, 'Gentle courage. The lion is tamed with patience, not force.'],
        ['09 - The Hermit', 'The Hermit', 'Arcana — Major', 'Rare', null, 'A lantern in the dark. Solitude, reflection and the search for truth.'],
        ['10 - Wheel of Fortune', 'Wheel of Fortune', 'Arcana — Major', 'Rare', null, 'The turn of the wheel. Cycles, luck and the change no one can stop.'],
        ['11 - Justice', 'Justice', 'Arcana — Major', 'Rare', null, 'The balance holds. Truth, consequence and the scales that see everything.'],
        ['12 - The Hanged Man', 'The Hanged Man', 'Arcana — Major', 'Rare', null, 'A different angle. Pause, surrender and the insight that waits in stillness.'],
        ['14 - Death', 'Death', 'Arcana — Major', 'Ultra Rare', null, 'An ending that clears the way. Transformation, release and what comes next.'],
        ['14 - Temperance', 'Temperance', 'Arcana — Major', 'Rare', null, 'The middle path. Patience, balance and the quiet art of blending opposites.'],
        ['15 - The Devil', 'The Devil', 'Arcana — Major', 'Rare', null, 'The chain you can drop. Temptation, attachment and the shadow that teaches.'],
        ['16 - The Tower', 'The Tower', 'Arcana — Major', 'Rare', null, 'The lightning truth. Sudden change that breaks what was already cracked.'],
        ['17 - The Star', 'The Star', 'Arcana — Major', 'Ultra Rare', null, 'Hope after the storm. Healing, clarity and a light to steer by.'],
        ['18 - The Moon', 'The Moon', 'Arcana — Major', 'Rare', null, 'The path by moonlight. Dreams, illusion and instinct when certainty is gone.'],
        ['19 - The Sun', 'The Sun', 'Arcana — Major', 'Ultra Rare', null, 'Joy without shadows. Success, warmth and the confidence of a clear day.'],
        ['20 - Judgement', 'Judgement', 'Arcana — Major', 'Rare', null, 'The call answered. Awakening, renewal and a reckoning that frees.'],
        ['21 - The World', 'The World', 'Arcana — Major', 'Mythic Rare', null, 'The circle closes. Completion, wholeness and the door to the next journey.']
      ]
    },
    {
      id: 'champion-verse',
      folder: 'Champion-Verse',
      name: 'Champion-Verse',
      shortName: 'CV',
      setSize: 22,
      booster: true,
      complete: false,
      accent: ['#ffcf5c', '#ff6b9d'],
      tagline: {
        en: 'Heroes, rangers and rivals from every corner of the Champion-Verse.',
        es: 'Héroes, rangers y rivales de cada rincón del Champion-Verse.',
        de: 'Helden, Rangers und Rivalen aus jeder Ecke des Champion-Verse.'
      },
      description: {
        en: 'The first 13 champions of a 22-card set: Saiyans, rangers and apprentices squaring up for the arena.',
        es: 'Los primeros 13 campeones de un set de 22 cartas: saiyans, rangers y aprendices listos para la arena.',
        de: 'Die ersten 13 Champions eines 22-Karten-Sets: Saiyajins, Rangers und Auszubildende bereit für die Arena.'
      },
      cards: [
        ['S00_VEGITO', 'Super Vegito', 'Saiyan — Fusion', 'Mythic Rare', { ATK: 3800, DEF: 3000 }, 'Two powers, one perfect warrior. The fusion that ends the fight before it starts.'],
        ['S01_GOKU', 'Super Saiyan Goku', 'Saiyan — Warrior', 'Mythic Rare', { ATK: 3500, DEF: 2800 }, 'Always chasing the next horizon. Every defeat becomes the next transformation.'],
        ['S02_VEGETA', 'Super Vegeta', 'Saiyan — Prince', 'Ultra Rare', { ATK: 3400, DEF: 2700 }, 'Pride sharpened into discipline. He never accepts second place for long.'],
        ['S03_GOHAN', 'Ultimate Gohan', 'Saiyan — Scholar', 'Ultra Rare', { ATK: 3200, DEF: 2600 }, 'A gentle heart with a hidden ceiling. When it matters, the power answers.'],
        ['S04_AZURA', 'Azura', 'Wanderer — Rogue', 'Ultra Rare', { ATK: 2900, DEF: 2400 }, 'The lone wanderer of the Astro-Verse, one step ahead of every shadow.'],
        ['S05_ARTEMIS', 'Artemis', 'Hunter — Archer', 'Rare', { ATK: 2700, DEF: 2300 }, 'The moonlit huntress. Her arrow finds the gap before the target moves.'],
        ['S06_MINTIE', 'Mintie', 'Support — Healer', 'Rare', { ATK: 1800, DEF: 2600 }, 'Cool-headed and warm-hearted. The team holds together around her.'],
        ['S07_WHITE_RANGER', 'White Ranger', 'Ranger — Leader', 'Rare', { ATK: 2600, DEF: 2500 }, 'The calm at the center of the storm, with a blade of pure light.'],
        ['S08_RED_RANGER', 'Red Ranger', 'Ranger — Vanguard', 'Rare', { ATK: 2800, DEF: 2200 }, 'First into the breach, last to leave. The team follows the red streak.'],
        ['S09_BLUE_RANGER', 'Blue Ranger', 'Ranger — Tactician', 'Rare', { ATK: 2400, DEF: 2600 }, 'Reads the field like a map and always has a second plan.'],
        ['S10_PINK_RANGER', 'Pink Ranger', 'Ranger — Striker', 'Rare', { ATK: 2500, DEF: 2300 }, 'Grace with an edge. The fastest route through a fight is hers.'],
        ['S11_APPRENTICE_VALA', 'Apprentice Vala', 'Mage — Apprentice', 'Rare', { ATK: 2000, DEF: 2100 }, 'Still learning the words, already bending the weather.'],
        ['S12_TRAINEE_WARRIOR_KIRA', 'Trainee Warrior Kira', 'Warrior — Trainee', 'Rare', { ATK: 2100, DEF: 2000 }, 'Every legend starts with a sparring match and a stubborn refusal to quit.']
      ]
    },
    {
      id: 'dungeons-history',
      folder: 'Dungeons and History',
      name: 'Dungeons and History',
      shortName: 'DH',
      setSize: 22,
      booster: true,
      complete: false,
      accent: ['#f0c48a', '#8a5a3b'],
      tagline: {
        en: 'Real legends, dungeon light and a history book gone adventuring.',
        es: 'Leyendas reales, luz de mazmorra y un libro de historia que se fue de aventura.',
        de: 'Echte Legenden, Kerzenlicht im Dungeon und ein Geschichtsbuch auf Abenteuer.'
      },
      description: {
        en: 'Six of 22 cards: liberators, composers, fighters and inventors reimagined as dungeon heroes.',
        es: 'Seis de 22 cartas: libertadores, compositores, luchadores e inventores reinventados como héroes de mazmorra.',
        de: 'Sechs von 22 Karten: Befreier, Komponisten, Kämpfer und Erfinder als Dungeon-Helden.'
      },
      cards: [
        ['DH_00_AZURA', 0, 'Azura', 'Explorer — Rogue', 'Mythic Rare', { ATK: 2800, DEF: 2400 }, 'The one who maps the dungeon first and loots it second.'],
        ['DH_01_ARTEMIS', 1, 'Artemis', 'Ranger — Archer', 'Ultra Rare', { ATK: 2700, DEF: 2300 }, 'Keeper of the old hunt. Every corridor remembers her footsteps.'],
        ['DH_03_SIMON_BOLIVAR', 3, 'Simón Bolívar', 'Leader — Liberator', 'Ultra Rare', { ATK: 3000, DEF: 2500 }, 'The Liberator. Where his banner rises, the chains do not hold.'],
        ['DH_04_BEETHOVEN', 4, 'Beethoven', 'Bard — Composer', 'Rare', { ATK: 2200, DEF: 2600 }, 'He cannot hear the dungeon, but the dungeon answers his rhythm.'],
        ['DH_06_BRUCE_LEE', 6, 'Bruce Lee', 'Monk — Martial Artist', 'Ultra Rare', { ATK: 2900, DEF: 2400 }, 'Be water. The fastest strike is the one the enemy never sees.'],
        ['DH_07_NIKOLA_TESLA', 7, 'Nikola Tesla', 'Artificer — Inventor', 'Rare', { ATK: 2400, DEF: 2300 }, 'Lightning in a bottle, and a hundred more inventions in the satchel.']
      ]
    },
    {
      id: 'ygo',
      name: 'Yu-Gi-Oh!',
      shortName: 'YGO',
      setSize: 3,
      booster: false,
      complete: true,
      accent: ['#b06bff', '#3d7bff'],
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
      accentNote: 'full-art',
      cover: `${DB}/YGO/FRONT_YGO_01.webp`,
      thumbCover: `${DB}/YGO/thumbs/FRONT_YGO_01.webp`,
      cards: [
        ['FRONT_YGO_01', 'Dark Magician Girl', 'Spellcaster / Effect', 'Ultra Rare', 'DARK', { ATK: 2000, DEF: 1700 }, 'Gains 300 ATK for every "Dark Magician" or "Magician of Black Chaos" in the GYs.'],
        ['FRONT_YGO_02', 'Dark Magician', 'Spellcaster', 'Ultra Rare', 'DARK', { ATK: 2500, DEF: 2100 }, 'The ultimate wizard in terms of attack and defense.'],
        ['FRONT_YGO_03', 'Dark Magikuriboh', 'Spellcaster / Effect', 'Rare', 'DARK', { ATK: 300, DEF: 200 }, 'The ultimate kuriboh in terms of magical illusion and fluffy defense.']
      ]
    }
  ];

  function buildCollection(source) {
    const folder = source.folder || source.name;
    const backs = SET_BACKS[source.id] || source.backs || { full: SHARED_BACK, thumb: SHARED_BACK_THUMB };
    const cardList = source.cards.map((entry, index) => {
      const fileName = entry[0];
      const hasSlot = typeof entry[1] === 'number';
      const slot = hasSlot ? entry[1] : index;
      const rest = entry.slice(hasSlot ? 2 : 1);
      const name = rest[0];
      const type = rest[1];
      const rarity = rest[2];
      const isYgo = source.id === 'ygo';
      const attribute = isYgo ? rest[3] : null;
      const stats = isYgo ? rest[4] : rest[3];
      const lore = isYgo ? rest[5] : rest[4];

      const base = {
        id: `${source.id}-${pad(slot)}`,
        set: `${source.shortName}-${pad(slot)}`,
        number: String(slot).padStart(3, '0'),
        name,
        type,
        rarity,
        front: source.folder ? `${DB}/${source.folder}/${fileName}.webp` : `${DB}/${source.name}/${fileName}.webp`,
        back: backs.full,
        thumbFront: source.folder
          ? `${DB}/${source.folder}/thumbs/${fileName}.webp`
          : `${DB}/${source.name}/thumbs/${fileName}.webp`,
        thumbBack: backs.thumb,
        fullArt: null,
        thumbFullArt: null,
        stats: stats || null,
        lore
      };

      if (attribute) base.attribute = attribute;

      if (source.id === 'ygo') {
        base.front = `${DB}/YGO/${fileName}.webp`;
        base.thumbFront = `${DB}/YGO/thumbs/${fileName}.webp`;
        base.fullArt = `${DB}/YGO/${fileName}(FULL-ART).webp`;
        base.thumbFullArt = `${DB}/YGO/thumbs/${fileName}(FULL-ART).webp`;
      }

      return base;
    });

    return {
      id: source.id,
      name: source.name,
      shortName: source.shortName,
      setSize: source.setSize,
      booster: source.booster !== false,
      complete: source.complete !== false,
      missing: Math.max(0, source.setSize - cardList.length),
      fullArt: source.id === 'ygo',
      tagline: source.tagline,
      description: source.description,
      accent: source.accent,
      cover: cardList[0] ? cardList[0].front : null,
      thumbCover: cardList[0] ? cardList[0].thumbFront : null,
      cards: cardList
    };
  }

  const collections = newSets.map(buildCollection);

  /* Cartas aplanadas con la información de su colección adjunta. */
  const cards = collections.flatMap((collection) =>
    collection.cards.map((card) => ({
      ...card,
      collectionId: collection.id,
      collectionName: collection.name,
      collectionShortName: collection.shortName,
      collectionAccent: collection.accent,
      collectionSetSize: collection.setSize
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
    updated: '2026-11-05',
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
