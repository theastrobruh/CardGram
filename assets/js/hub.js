/* ==========================================================================
   CardGram — v0.5.5 · Hub / Lobby
   Vista de entrada, estadísticas, biblioteca, colecciones, decks, perfil y
   arranque perezoso del motor 3D. El editor solo se inicializa al entrar.
   ========================================================================== */
'use strict';

const HUB_STORAGE = {
  profile: 'cardgram.profile.v1',
  data: 'cardgram.hub.v1',
  booster: 'cardgram.booster.v1',
  layout: 'cardgram.layout.v1',
  home: 'cardgram.home.v1',
  deckBoxes: 'cardgram.deckboxes.v1'
};

/* Deck boxes transparentes de Inventory. */
const INVENTORY_DECK_BOXES = {
  'mew-tarot': 'assets/data/inventory/Deck-Box_Mew-Tarot.webp',
  'champion-verse': 'assets/data/inventory/Deck-Box_Champion-Verse.webp',
  'dungeons-history': 'assets/data/inventory/Deck-Box_Dungeons-&-History.webp',
  ygo: 'assets/data/inventory/Deck-Box_Yu-Gi-Oh!.webp'
};

const USER_DECK_BOXES = [
  'assets/data/inventory/Deck_Box_Created-by-User (1).webp',
  'assets/data/inventory/Deck_Box_Created-by-User (2).webp'
];

let hubDeckBoxes = [];

function loadDeckBoxes() {
  const raw = storage.read(HUB_STORAGE.deckBoxes, []);
  hubDeckBoxes = Array.isArray(raw)
    ? raw.filter((src) => typeof src === 'string' && /^(data:image\/|assets\/)/.test(src)).slice(0, 12)
    : [];
}

function saveDeckBoxes() {
  storage.write(HUB_STORAGE.deckBoxes, hubDeckBoxes);
}

function inventoryBoxFor(collection) {
  return INVENTORY_DECK_BOXES[collection.id] || collection.thumbCover || collection.cover || '';
}

const PRESET_DECK_BOXES = [
  { id: 'user-1', name: 'Aqua Glass', src: 'assets/data/inventory/Deck_Box_Created-by-User (1).webp' },
  { id: 'user-2', name: 'Cyber Void', src: 'assets/data/inventory/Deck_Box_Created-by-User (2).webp' },
  { id: 'champion', name: 'Champion-Verse', src: 'assets/data/inventory/Deck-Box_Champion-Verse.webp' },
  { id: 'dungeons', name: 'Dungeons & History', src: 'assets/data/inventory/Deck-Box_Dungeons-&-History.webp' },
  { id: 'mew-tarot', name: 'Mew Tarot', src: 'assets/data/inventory/Deck-Box_Mew-Tarot.webp' },
  { id: 'ygo', name: 'Yu-Gi-Oh!', src: 'assets/data/inventory/Deck-Box_Yu-Gi-Oh!.webp' }
];

function userBoxFor(index) {
  if (hubData && hubData.selectedUserBox) return hubData.selectedUserBox;
  if (hubDeckBoxes.length) return hubDeckBoxes[index % hubDeckBoxes.length];
  return USER_DECK_BOXES[index % USER_DECK_BOXES.length];
}

function getUserPresets() {
  if (typeof presets !== 'undefined' && Array.isArray(presets) && presets.length) return presets;
  try {
    const raw = storage.read('cardgram.presets.v2', []);
    if (Array.isArray(raw)) return raw;
  } catch (e) {}
  return [];
}

const HUB_LAYOUT_DEFAULT = {
  mode: 'controlled',
  leftWidth: 280,
  rightWidth: 325,
  height: 470,
  offset: 0,
  cardSize: 90,
  sideCards: 115,
  leftX: 0,
  leftY: 0,
  rightX: 0,
  rightY: 0,
  heroX: 0,
  heroY: 0,
  leftExpanded: false,
  rightExpanded: false,
  heroExpanded: false
};

const HUB_HOME_DEFAULT = {
  drawSource: 'all',
  drawCount: 3,
  deckSource: 'all',
  handIds: [],
  drawCursor: 0,
  dropCardId: null,
  backSrc: 'assets/data/cards/database/_shared/thumbs/BACK_CARDGRAM.webp',
  loose: []
};

const HUB_PANELS = ['home', 'booster', 'collections', 'explore', 'plaza', 'about', 'profile'];

const DECK_EMOJIS = [
  '🃏', '🔥', '🌙', '⭐', '✨', '🐉', '🦊', '🐱',
  '⚔️', '🛡️', '🌌', '🍀', '👑', '💎', '🌊', '🌪️',
  '☀️', '🪐', '🎴', '🧿', '🦄', '🐺', '🗡️', '🏆'
];
const HUB_STUDIO_TABS = {
  deck: 'tab-deck',
  '3d': 'tab-3d',
  anim: 'tab-anim',
  canvas: 'tab-canvas'
};

const HUB_CATALOG = window.CardGramCatalog || {
  collections: [],
  cards: [],
  featured: null,
  byId: () => null,
  collectionOf: () => null
};

/* Three.js se descarga solo al entrar al estudio (o en reposo, más tarde).
   Antes competía con las miniaturas del lobby en la carga inicial. */
const THREE_ASSETS = [
  {
    src: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    integrity: 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu'
  },
  {
    src: 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    integrity: 'sha384-wagZhIFgY4hD+7awjQjR4e2E294y6J2HSnd8eTNc15ZubTeQeVRZwhQJ+W6hnBsf'
  }
];

let threeLoadPromise = null;

function ensureThree() {
  if (window.THREE && window.THREE.OrbitControls) return Promise.resolve(true);
  if (threeLoadPromise) return threeLoadPromise;

  threeLoadPromise = THREE_ASSETS.reduce(
    (chain, asset) =>
      chain.then(
        () =>
          new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = asset.src;
            script.integrity = asset.integrity;
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`No se pudo cargar ${asset.src}`));
            document.head.appendChild(script);
          })
      ),
    Promise.resolve()
  )
    .then(() => Boolean(window.THREE && window.THREE.OrbitControls))
    .catch((error) => {
      console.warn('[CardGram] Three.js no disponible', error);
      threeLoadPromise = null;
      return false;
    });

  return threeLoadPromise;
}

function warmThreeInIdle() {
  const connection = navigator.connection;
  if (connection && (connection.saveData || /(^|-)2g$|^3g$/.test(connection.effectiveType || ''))) {
    return;
  }

  const run = () => {
    ensureThree().catch(() => {});
  };
  window.setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      run();
    }
  }, 6000);
}

const hub = {
  ready: false,
  panel: 'home',
  libraryTab: 'all',
  collectionId: null,
  deckId: null,
  deckZone: 'main',
  deckPoolSearch: '',
  deckPoolCollection: 'all',
  deckPoolView: 'grid',
  draftAvatar: null,
  deckCoverId: null,
  homeVisits: 0,
  explorerFilter: 'all',
  explorerIndex: 0,
  explorerMode: 'album',
  explorerShowcase: true,
  explorerTimers: false,
  exploreCreatorId: null,
  explorePackId: null,
  gachaIds: [],
  handDraft: [],
  handSetId: null,
  opening: false,
  presetsRendered: false,
  newCardRequested: false,
  lastRoute: '',
  activeSheet: null,
  viewerCard: null,
  viewerTrigger: null,
  viewerCinema: false,
  mobileData: { player: [], collection: [], playerIndex: 0, collectionIndex: 0 },
  els: {}
};

const hubStatCache = new WeakMap();

/* --------------------------------------------------------------------------
   Utilidades locales
   -------------------------------------------------------------------------- */
function hubEl(id) {
  return document.getElementById(id);
}

function makeNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function makeHubImage(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.width = 567;
  img.height = 760;
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}

function makeHubButton(className, text, data) {
  const button = document.createElement('button');
  button.type = 'button';
  if (className) button.className = className;
  if (text) button.textContent = text;
  if (data) {
    Object.keys(data).forEach((key) => {
      button.dataset[key] = data[key];
    });
  }
  return button;
}

function hubIcon(name) {
  return createIcon(name);
}

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatHubDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString(currentLang || 'en', {
      year: 'numeric',
      month: 'long'
    });
  } catch (error) {
    return new Date(timestamp).getFullYear();
  }
}

function formatHubShortDate(timestamp) {
  try {
    return new Date(timestamp).toLocaleDateString(currentLang || 'en', {
      year: 'numeric',
      month: 'short'
    });
  } catch (error) {
    return new Date(timestamp).getFullYear();
  }
}

function normalizeHandle(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
  return clean || 'creator';
}

/** Textos de catálogo que pueden venir por idioma (string u objeto). */
function localized(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[currentLang] || value.en || value.es || value.de || '';
}

/** Etiqueta con singular/plural sencillo: usa la clave _one cuando existe. */
function countLabel(key, count) {
  const singular = Number(count) === 1 ? `${key}_one` : key;
  const text = t(singular, { count });
  return text === singular ? t(key, { count }) : text;
}

/** Miniaturas WebP para el lobby; el estudio siempre usa el original. */
function thumbOf(card) {
  return (card && (card.thumbFront || card.front)) || '';
}

function backThumbOf(card) {
  return (card && (card.thumbBack || card.back)) || '';
}

/** Versión de 200 px para rejillas diminutas (menú rápido, álbum, mano). */
function microUrl(src) {
  return src ? src.replace('/thumbs/', '/micro/') : src;
}

function microOf(card) {
  return microUrl(thumbOf(card));
}

/** Convierte una ruta de catálogo en su miniatura si existe. */
function previewThumb(url) {
  if (typeof PREVIEW_FRONT === 'undefined' || !PREVIEW_FRONT) return url;
  return PREVIEW_FRONT.get(url) || url;
}

/* --------------------------------------------------------------------------
   Estado persistido
   -------------------------------------------------------------------------- */
function fallbackCard() {
  return (
    HUB_CATALOG.collections
      .find((collection) => collection.id === 'mew-tarot')
      ?.cards.find((card) => /hermit/i.test(card.name)) ||
    HUB_CATALOG.cards[0] ||
    null
  );
}

function defaultFavoriteId() {
  const card = fallbackCard();
  return card ? card.id : null;
}

function defaultFeaturedIds(favoriteId) {
  return favoriteId ? [favoriteId] : [];
}

function sanitizeHubProfile(raw) {
  const fallbackFavorite = defaultFavoriteId();
  const base = {
    name: '¿?',
    handle: 'Fulanito',
    bio: '',
    avatar: null,
    favoriteCardId: fallbackFavorite,
    featuredIds: defaultFeaturedIds(fallbackFavorite),
    joinedAt: Date.now()
  };

  if (!raw || typeof raw !== 'object') return base;

  const name = String(raw.name || '').trim().slice(0, 32);
  const bio = String(raw.bio || '').trim().slice(0, 160);
  const avatar = raw.avatar ? safeImageUrl(raw.avatar) : null;
  /* Perfiles antiguos: hasta que el usuario elija una favorita, la carta por
     defecto es The Hermit (Mew Tarot). */
  const favoriteTouched = Boolean(raw.favoriteTouched);
  const favorite =
    favoriteTouched && HUB_CATALOG.byId(raw.favoriteCardId)
      ? raw.favoriteCardId
      : fallbackFavorite;
  const joined = Number(raw.joinedAt);

  const featuredIds = [];
  if (favoriteTouched && Array.isArray(raw.featuredIds)) {
    raw.featuredIds.forEach((id) => {
      if (featuredIds.length < 6 && HUB_CATALOG.byId(id) && !featuredIds.includes(id)) {
        featuredIds.push(id);
      }
    });
  }
  if (!featuredIds.length) featuredIds.push(...defaultFeaturedIds(favorite));

  /* Manos viejas que nacieron del abanico automático de 3: deja solo la principal. */
  if (featuredIds.length === 3 && featuredIds[0] === favorite) {
    const legacy = [
      favorite,
      ...HUB_CATALOG.cards
        .filter((card) => card.id !== favorite)
        .slice(0, 2)
        .map((card) => card.id)
    ];
    if (legacy.every((id, index) => featuredIds[index] === id)) {
      featuredIds.length = 1;
    }
  }

  return {
    name: name || base.name,
    handle: raw.handle ? normalizeHandle(raw.handle) : base.handle,
    bio,
    avatar,
    favoriteCardId: favorite,
    favoriteTouched,
    featuredIds,
    joinedAt: Number.isFinite(joined) && joined > 0 ? joined : Date.now()
  };
}

function sanitizeHubData(raw) {
  const data = {
    reviewedCollections: [],
    decks: [],
    exports: 0,
    lastRenderAt: null
  };

  if (!raw || typeof raw !== 'object') return data;

  const validCollections = new Set(HUB_CATALOG.collections.map((collection) => collection.id));
  if (Array.isArray(raw.reviewedCollections)) {
    data.reviewedCollections = Array.from(
      new Set(raw.reviewedCollections.filter((id) => validCollections.has(id)))
    );
  }

  const exportsCount = Number(raw.exports);
  data.exports = Number.isFinite(exportsCount)
    ? Math.max(0, Math.min(999999, Math.floor(exportsCount)))
    : 0;

  const lastRender = Number(raw.lastRenderAt);
  data.lastRenderAt = Number.isFinite(lastRender) && lastRender > 0 ? lastRender : null;

  if (Array.isArray(raw.decks)) {
    const usedIds = new Set();
    data.decks = raw.decks
      .slice(0, 24)
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;

        let name = String(item.name || '').trim().slice(0, 48);
        if (!name) name = `Deck #${index + 1}`;

        let id = typeof item.id === 'string' && /^[a-z0-9_-]{1,48}$/i.test(item.id) ? item.id : uid();
        while (usedIds.has(id)) id = uid();
        usedIds.add(id);

        const cover = HUB_CATALOG.byId(item.coverId) || HUB_CATALOG.byId(Array.isArray(item.cardIds) ? item.cardIds[0] : null) || fallbackCard();
        const cardIds = Array.isArray(item.cardIds)
          ? item.cardIds.filter((cardId) => HUB_CATALOG.byId(cardId)).slice(0, 60)
          : [];
        const sideRaw = item.side && typeof item.side === 'object' ? item.side : {};
        const sideCardIds = Array.isArray(sideRaw.cardIds)
          ? sideRaw.cardIds.filter((cardId) => HUB_CATALOG.byId(cardId)).slice(0, 20)
          : [];
        const copyLimitRaw = Number(item.copyLimit);
        const copyLimit = Number.isFinite(copyLimitRaw) ? Math.min(6, Math.max(2, Math.floor(copyLimitRaw))) : 3;
        const createdAt = Number(item.createdAt);

        return {
          id,
          name,
          emoji: typeof item.emoji === 'string' && item.emoji ? item.emoji.slice(0, 8) : '🃏',
          description: String(item.description || '').trim().slice(0, 120),
          coverId: cover ? cover.id : null,
          coverImage: typeof item.coverImage === 'string' && item.coverImage.startsWith('data:image/') ? item.coverImage.slice(0, 900000) : '',
          cardIds,
          side: {
            name: String(sideRaw.name || 'Side Deck').trim().slice(0, 32) || 'Side Deck',
            cardIds: sideCardIds
          },
          copyLimit,
          createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now()
        };
      })
      .filter(Boolean);
  }

  return data;
}

/* --------------------------------------------------------------------------
   Sobre diario
   -------------------------------------------------------------------------- */
function dayKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0')
  ].join('-');
}

function previousDayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

function nextBoosterReset() {
  const reset = new Date();
  reset.setHours(24, 0, 0, 0);
  return reset.getTime();
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function ownedIn(collectionId) {
  const list = hubBooster.owned[collectionId];
  return Array.isArray(list) ? list : [];
}

function boosterSets() {
  return HUB_CATALOG.collections.filter((collection) => collection.cards.length);
}

function sanitizeBooster(raw) {
  const data = {
    day: null,
    setId: null,
    picks: [],
    claimed: false,
    usedGrants: [],
    missionDay: null,
    pendingGrant: null,
    owned: {},
    streak: 0,
    lastClaim: null
  };

  if (!raw || typeof raw !== 'object') return data;

  if (typeof raw.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.day)) data.day = raw.day;

  const validSets = new Set(HUB_CATALOG.collections.map((collection) => collection.id));
  if (typeof raw.setId === 'string' && validSets.has(raw.setId)) data.setId = raw.setId;

  if (Array.isArray(raw.picks)) {
    data.picks = raw.picks
      .filter((id) => HUB_CATALOG.byId(id))
      .slice(0, 6);
  }

  data.claimed = Boolean(raw.claimed);

  if (Array.isArray(raw.usedGrants)) {
    data.usedGrants = raw.usedGrants.filter((key) => ['login', 'create', 'mission'].includes(key));
  }
  if (typeof raw.missionDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.missionDay)) {
    data.missionDay = raw.missionDay;
  }
  if (['login', 'create', 'mission'].includes(raw.pendingGrant)) {
    data.pendingGrant = raw.pendingGrant;
  }

  if (raw.owned && typeof raw.owned === 'object') {
    HUB_CATALOG.collections.forEach((collection) => {
      const list = raw.owned[collection.id];
      if (!Array.isArray(list)) return;
      data.owned[collection.id] = Array.from(
        new Set(
          list.filter((id) => {
            const card = HUB_CATALOG.byId(id);
            return card && card.collectionId === collection.id;
          })
        )
      );
    });
  }

  const streak = Number(raw.streak);
  data.streak = Number.isFinite(streak) && streak > 0 ? Math.min(9999, Math.floor(streak)) : 0;
  if (typeof raw.lastClaim === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.lastClaim)) {
    data.lastClaim = raw.lastClaim;
  }

  return data;
}

/** Reinicia solo la parte diaria; la colección y la racha se conservan. */
function ensureBoosterDay() {
  const today = dayKey();
  if (hubBooster.day === today) return false;

  hubBooster.day = today;
  hubBooster.setId = null;
  hubBooster.picks = [];
  hubBooster.claimed = false;
  hubBooster.usedGrants = [];
  hubBooster.pendingGrant = null;
  persistBooster();
  return true;
}

function boosterGrants() {
  const today = dayKey();
  const createdToday =
    typeof presets !== 'undefined' &&
    Array.isArray(presets) &&
    presets.some((preset) => dayKey(new Date(preset.createdAt || 0)) === today);
  const used = new Set(Array.isArray(hubBooster.usedGrants) ? hubBooster.usedGrants : []);
  return [
    { id: 'login', unlocked: true, used: used.has('login'), label: 'booster_grant_login' },
    { id: 'create', unlocked: createdToday, used: used.has('create'), label: 'booster_grant_create' },
    { id: 'mission', unlocked: hubBooster.missionDay === today, used: used.has('mission'), label: 'booster_grant_mission' }
  ];
}

function availableBoosterGrant() {
  return boosterGrants().find((grant) => grant.unlocked && !grant.used) || null;
}

function availablePackCount() {
  const available = boosterGrants().filter((grant) => grant.unlocked && !grant.used).length;
  return available + (hubBooster.picks.length ? 1 : 0);
}

function syncMobileDailyButton() {
  const count = availablePackCount();
  if (hub.els.brandPack) {
    hub.els.brandPack.hidden = count === 0;
    hub.els.brandPack.classList.toggle('has-packs', count > 0);
    if (hub.els.brandPackBadge) {
      hub.els.brandPackBadge.hidden = count <= 1;
      hub.els.brandPackBadge.textContent = String(count);
    }
  }
  if (hub.els.mobileDaily) {
    hub.els.mobileDaily.hidden = true;
  }
}

function markBoosterMission() {
  const today = dayKey();
  if (hubBooster.missionDay === today) return;
  hubBooster.missionDay = today;
  persistBooster();
}

function boosterCardIsNew(cardId) {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return false;
  return !ownedIn(card.collectionId).includes(cardId);
}

function cardRarity(card) {
  const value = String((card && card.rarity) || '').toLowerCase();
  if (value.includes('mythic')) return { id: 'mythic', label: 'Mythic', weight: 2 };
  if (value.includes('ultra') || value.includes('legend')) return { id: 'legendary', label: 'Legendary', weight: 6 };
  if (value.includes('epic')) return { id: 'epic', label: 'Epic', weight: 12 };
  if (value.includes('rare')) return { id: 'rare', label: 'Rare', weight: 30 };
  if (value.includes('uncommon')) return { id: 'uncommon', label: 'Uncommon', weight: 45 };
  return { id: 'common', label: 'Common', weight: 60 };
}

function drawBoosterCards(collectionId) {
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === collectionId);
  if (!collection || !collection.cards.length) return [];

  const picked = [];
  const used = new Set();
  const pickWeighted = (pool) => {
    const weighted = pool.map((card) => ({ card, weight: cardRarity(card).weight }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.card;
    }
    return weighted[weighted.length - 1].card;
  };

  while (picked.length < 6) {
    const fresh = collection.cards.filter((card) => !used.has(card.id));
    const pool = fresh.length ? fresh : collection.cards;
    const card = pickWeighted(pool);
    picked.push(card.id);
    used.add(card.id);
  }

  if (!picked.some((id) => ['epic', 'legendary', 'mythic'].includes(cardRarity(HUB_CATALOG.byId(id)).id))) {
    const high = collection.cards
      .filter((card) => ['epic', 'legendary', 'mythic'].includes(cardRarity(card).id))
      .sort((a, b) => cardRarity(a).weight - cardRarity(b).weight)[0];
    if (high) picked[picked.length - 1] = high.id;
  }

  return picked;
}

let packOverlayState = {
  cards: [],
  grant: null,
  timers: [],
  currentIndex: 0,
  revealedSet: new Set(),
  isBurst: false,
  viewMode: 'single'
};

function clearPackTimers() {
  packOverlayState.timers.forEach((timer) => window.clearTimeout(timer));
  packOverlayState.timers = [];
}

function closePackOverlay() {
  if (!hub.els.packOverlay) return;
  clearPackTimers();
  hub.els.packOverlay.hidden = true;
  document.body.classList.remove('pack-open');
}

function triggerPackRip() {
  if (packOverlayState.isBurst) return;
  packOverlayState.isBurst = true;
  if (hub.els.packSeal) hub.els.packSeal.classList.add('is-burst');
  if (hub.els.packSealTriggerBtn) hub.els.packSealTriggerBtn.hidden = true;
  if (window.Sound) window.Sound.play('burst');

  packOverlayState.timers.push(
    window.setTimeout(() => {
      if (hub.els.packSealWrap) hub.els.packSealWrap.hidden = true;
      if (hub.els.packTheaterWrap) hub.els.packTheaterWrap.hidden = false;
      if (hub.els.packHeadMeta) hub.els.packHeadMeta.hidden = false;
      if (hub.els.packToggleView) hub.els.packToggleView.hidden = false;

      if (hub.els.packRevealGrid) {
        hub.els.packRevealGrid.replaceChildren(
          ...packOverlayState.cards
            .map((id) => HUB_CATALOG.byId(id))
            .filter(Boolean)
            .map((card, index) => buildPackCard(card, index))
        );
      }
      renderTheaterCard(0);
    }, 650)
  );
}

function renderTheaterCard(index) {
  if (!packOverlayState.cards.length) return;
  if (index < 0) index = 0;
  if (index >= packOverlayState.cards.length) index = packOverlayState.cards.length - 1;
  packOverlayState.currentIndex = index;
  packOverlayState.revealedSet.add(index);

  const cardId = packOverlayState.cards[index];
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return;

  const total = packOverlayState.cards.length;
  const currentNum = index + 1;

  if (hub.els.packCardCounter) {
    hub.els.packCardCounter.textContent = `${currentNum} / ${total}`;
  }
  if (hub.els.packStepDots) {
    hub.els.packStepDots.innerHTML = packOverlayState.cards
      .map((_, i) => `<span class="pack-step-dot ${i === index ? 'is-active' : ''} ${packOverlayState.revealedSet.has(i) ? 'is-revealed' : ''}"></span>`)
      .join('');
  }

  if (hub.els.packTheaterPrev) {
    hub.els.packTheaterPrev.disabled = index === 0;
  }
  if (hub.els.packTheaterNext) {
    if (index === total - 1) {
      hub.els.packTheaterNext.innerHTML = '<span>Completar</span><svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>';
    } else {
      hub.els.packTheaterNext.innerHTML = '<span>Siguiente</span><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"></use></svg>';
    }
  }

  const rarity = cardRarity(card);
  if (hub.els.packTheaterFront) {
    hub.els.packTheaterFront.replaceChildren();

    const head = makeNode('div', 'pack-theater-card-head');
    head.appendChild(makeNode('span', `pack-card-rarity rarity-${rarity.id}`, t(`rarity_${rarity.id}`)));
    head.appendChild(makeNode('span', 'pack-theater-card-collection', card.collectionName || 'CardGram'));

    const img = makeHubImage(card.thumbFront || card.front, card.name);
    img.className = 'pack-theater-img';

    const foot = makeNode('div', 'pack-theater-card-foot');
    foot.appendChild(makeNode('strong', 'pack-theater-card-title', card.name));

    hub.els.packTheaterFront.append(head, img, foot);
  }

  if (hub.els.packTheaterCard) {
    hub.els.packTheaterCard.className = `pack-theater-card rarity-${rarity.id} is-revealed`;
    hub.els.packTheaterCard.style.animation = 'none';
    hub.els.packTheaterCard.offsetHeight;
    hub.els.packTheaterCard.style.animation = '';
  }

  if (window.Sound) {
    window.Sound.play(['legendary', 'mythic'].includes(rarity.id) ? 'success' : 'flip');
  }

  revealPackCard(index);

  if (packOverlayState.revealedSet.size >= total) {
    claimBoosterPackSilently();
    if (hub.els.packEndActions) hub.els.packEndActions.hidden = false;
  }
}

function nextTheaterCard() {
  const nextIdx = packOverlayState.currentIndex + 1;
  if (nextIdx < packOverlayState.cards.length) {
    renderTheaterCard(nextIdx);
  } else {
    claimBoosterPackSilently();
    if (hub.els.packEndActions) hub.els.packEndActions.hidden = false;
    togglePackView('grid');
  }
}

function prevTheaterCard() {
  const prevIdx = packOverlayState.currentIndex - 1;
  if (prevIdx >= 0) {
    renderTheaterCard(prevIdx);
  }
}

function togglePackView(forceMode) {
  const targetMode = forceMode || (packOverlayState.viewMode === 'single' ? 'grid' : 'single');
  packOverlayState.viewMode = targetMode;

  if (targetMode === 'grid') {
    if (hub.els.packTheaterWrap) hub.els.packTheaterWrap.hidden = true;
    if (hub.els.packRevealGrid) hub.els.packRevealGrid.hidden = false;
    if (hub.els.packToggleViewText) hub.els.packToggleViewText.textContent = t('pack_theater_mode') || 'Modo cine';
  } else {
    if (hub.els.packTheaterWrap) hub.els.packTheaterWrap.hidden = false;
    if (hub.els.packRevealGrid) hub.els.packRevealGrid.hidden = true;
    if (hub.els.packToggleViewText) hub.els.packToggleViewText.textContent = t('pack_view_all') || 'Ver todas';
  }
}

function revealPackCard(index) {
  const card = hub.els.packRevealGrid
    ? hub.els.packRevealGrid.querySelector(`[data-pack-card="${index}"]`)
    : null;
  if (!card || card.classList.contains('is-revealed')) return;
  card.classList.add('is-revealed');
  const tier = card.dataset.rarity || 'common';
  if (window.Sound) {
    window.Sound.play(['legendary', 'mythic'].includes(tier) ? 'success' : 'flip');
  }
  const all = hub.els.packRevealGrid.querySelectorAll('.pack-card');
  const revealed = hub.els.packRevealGrid.querySelectorAll('.pack-card.is-revealed');
  if (all.length && revealed.length === all.length) {
    if (hub.els.packRevealAll) hub.els.packRevealAll.hidden = true;
    if (hub.els.packSave) hub.els.packSave.hidden = true;
    if (hub.els.packEndActions) hub.els.packEndActions.hidden = false;
    claimBoosterPackSilently();
  }
}

function revealAllPackCards() {
  clearPackTimers();
  Array.from(hub.els.packRevealGrid.querySelectorAll('.pack-card')).forEach((card) => {
    revealPackCard(Number(card.dataset.packCard));
  });
  claimBoosterPackSilently();
  if (hub.els.packEndActions) hub.els.packEndActions.hidden = false;
}

function buildPackCard(card, index) {
  const rarity = cardRarity(card);
  const button = makeNode('button', `pack-card rarity-${rarity.id}`);
  button.type = 'button';
  button.dataset.packCard = String(index);
  button.dataset.rarity = rarity.id;
  button.setAttribute('aria-label', t('pack_reveal_card', { name: card.name }));

  const inner = makeNode('span', 'pack-card-inner');
  const back = makeNode('span', 'pack-card-face pack-card-back');
  const front = makeNode('span', 'pack-card-face pack-card-front');
  front.appendChild(makeHubImage(card.thumbFront || card.front, card.name));
  front.appendChild(makeNode('span', `pack-card-rarity rarity-${rarity.id}`, t(`rarity_${rarity.id}`)));
  front.appendChild(makeNode('span', 'pack-card-name', card.name));
  inner.append(back, front);
  button.appendChild(inner);
  button.addEventListener('click', () => revealPackCard(index));
  return button;
}

function openPackOverlay() {
  if (!hub.els.packOverlay || !hubBooster.picks.length) return;
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId);
  if (!collection) return;

  packOverlayState.cards = hubBooster.picks.slice();
  packOverlayState.grant = hubBooster.pendingGrant || null;
  packOverlayState.currentIndex = 0;
  packOverlayState.revealedSet = new Set();
  packOverlayState.isBurst = false;
  packOverlayState.viewMode = 'single';
  clearPackTimers();

  if (hub.els.packSealImg) {
    hub.els.packSealImg.src = shopPackArt[collection.id] || collection.thumbCover || collection.cover || collection.cards[0]?.thumbFront || '';
    hub.els.packSealImg.alt = collection.name;
  }
  if (hub.els.packSealName) hub.els.packSealName.textContent = collection.name;
  if (hub.els.packSeal) hub.els.packSeal.classList.remove('is-burst');
  if (hub.els.packSealWrap) hub.els.packSealWrap.hidden = false;
  if (hub.els.packSealTriggerBtn) hub.els.packSealTriggerBtn.hidden = false;
  if (hub.els.packTheaterWrap) hub.els.packTheaterWrap.hidden = true;
  if (hub.els.packRevealGrid) {
    hub.els.packRevealGrid.replaceChildren();
    hub.els.packRevealGrid.hidden = true;
  }
  if (hub.els.packHeadMeta) hub.els.packHeadMeta.hidden = true;
  if (hub.els.packToggleView) hub.els.packToggleView.hidden = true;
  if (hub.els.packRevealAll) hub.els.packRevealAll.hidden = true;
  if (hub.els.packSave) hub.els.packSave.hidden = true;
  if (hub.els.packEndActions) hub.els.packEndActions.hidden = true;

  hub.els.packOverlay.hidden = false;
  document.body.classList.add('pack-open');
  if (window.Sound) window.Sound.play('booster');
}

function openBoosterPack() {
  ensureBoosterDay();
  if (hubBooster.picks.length) {
    openPackOverlay();
    return;
  }

  const grant = availableBoosterGrant();
  if (!grant) {
    toast(t('booster_no_grants'), { type: 'warning' });
    return;
  }

  const setId = hubBooster.setId || (boosterSets()[0] && boosterSets()[0].id);
  if (!setId) return;

  hubBooster.setId = setId;
  hubBooster.picks = drawBoosterCards(setId);
  hubBooster.pendingGrant = grant.id;
  persistBooster();
  renderBooster();
  openPackOverlay();
}


function claimBoosterPackSilently() {
  ensureBoosterDay();
  if (!hubBooster.picks.length) return;
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId);
  if (!collection) return;

  const owned = new Set(ownedIn(collection.id));
  hubBooster.picks.forEach((cardId) => {
    const card = HUB_CATALOG.byId(cardId);
    if (card && card.collectionId === collection.id) owned.add(cardId);
  });
  hubBooster.owned[collection.id] = Array.from(owned);
  if (hubBooster.pendingGrant && !hubBooster.usedGrants.includes(hubBooster.pendingGrant)) {
    hubBooster.usedGrants.push(hubBooster.pendingGrant);
  }
  hubBooster.pendingGrant = null;
  hubBooster.picks = [];
  persistBooster();
  renderBooster();
  renderCollectionRail();
}

function claimBoosterPack() {
  ensureBoosterDay();
  if (!hubBooster.picks.length) return;

  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId);
  if (!collection) return;

  const owned = new Set(ownedIn(collection.id));
  let added = 0;
  hubBooster.picks.forEach((cardId) => {
    const card = HUB_CATALOG.byId(cardId);
    if (!card || card.collectionId !== collection.id || owned.has(cardId)) return;
    owned.add(cardId);
    added += 1;
  });

  hubBooster.owned[collection.id] = Array.from(owned);
  if (hubBooster.pendingGrant && !hubBooster.usedGrants.includes(hubBooster.pendingGrant)) {
    hubBooster.usedGrants.push(hubBooster.pendingGrant);
  }
  hubBooster.pendingGrant = null;
  hubBooster.picks = [];
  hubBooster.day = dayKey();
  if (hubBooster.lastClaim !== hubBooster.day) {
    hubBooster.streak =
      hubBooster.lastClaim === previousDayKey() ? Math.min(9999, hubBooster.streak + 1) : 1;
    hubBooster.lastClaim = hubBooster.day;
  }
  persistBooster();

  closePackOverlay();
  renderBooster();
  renderCollectionRail();
  if (hub.panel === 'collections') renderCollections();
  toast(t('booster_claim_toast', { count: added, set: collection.name }), {
    type: 'success',
    duration: 4200
  });
  if (window.Sound) window.Sound.play('success');
}

function makeBoosterCard(cardId, options = {}) {
  const card = HUB_CATALOG.byId(cardId);
  const article = makeNode('article', 'booster-card');
  const inner = makeNode('div', 'booster-card-inner');

  const backFace = makeNode('div', 'booster-card-face booster-card-back');
  const backCollection = HUB_CATALOG.collectionOf(card);
  backFace.appendChild(
    makeHubImage(
      (backCollection && backCollection.cards[0] && backCollection.cards[0].thumbBack) ||
        (card && card.thumbBack) ||
        '',
      ''
    )
  );

  const frontFace = makeNode('div', 'booster-card-face booster-card-front');
  frontFace.appendChild(makeHubImage(card ? thumbOf(card) : '', card ? card.name : ''));
  frontFace.appendChild(makeNode('span', 'booster-card-name', card ? card.name : ''));

  inner.append(backFace, frontFace);
  article.appendChild(inner);

  if (card && boosterCardIsNew(card.id)) article.classList.add('is-new');

  if (options.open) {
    article.classList.add('is-open');
  } else if (!options.reveal) {
    article.classList.add('is-locked');
  }

  return article;
}

function makeBoosterPlaceholder() {
  return makeNode('div', 'booster-card-placeholder');
}

/** Sobre cerrado: cuatro reversos a la espera de abrirse. */
function makeSealedBoosterCard(collection) {
  const article = makeNode('article', 'booster-card is-locked');
  const inner = makeNode('div', 'booster-card-inner');
  const backFace = makeNode('div', 'booster-card-face booster-card-back');
  const sample = collection && collection.cards[0];
  backFace.appendChild(makeHubImage(sample ? sample.thumbBack : '', ''));
  inner.appendChild(backFace);
  article.appendChild(inner);
  return article;
}

function renderBoosterSetButtons(sets) {
  const container = hub.els.boosterSets;
  if (!container) return;

  const locked = hubBooster.picks.length > 0;

  container.replaceChildren(
    ...sets.map((collection) => {
      const owned = ownedIn(collection.id).length;
      const total = collection.cards.length;
      const button = makeHubButton('booster-set', null, { boosterSet: collection.id });
      button.setAttribute('aria-pressed', String(collection.id === hubBooster.setId));
      button.disabled = locked && collection.id !== hubBooster.setId;

      const art = makeNode('span', 'booster-set-art');
      art.appendChild(makeHubImage(microUrl(collection.thumbCover || collection.cover), ''));
      button.appendChild(art);

      const copy = makeNode('span', 'booster-set-copy');
      copy.appendChild(makeNode('strong', null, collection.name));
      copy.appendChild(
        makeNode('small', null, t('booster_progress_owned', { owned, total }))
      );

      const meter = makeNode('span', 'booster-set-meter');
      const fill = makeNode('span');
      fill.style.width = `${total ? Math.round((owned / total) * 100) : 0}%`;
      meter.appendChild(fill);
      copy.appendChild(meter);
      button.appendChild(copy);

      let badgeText;
      if (collection.id === hubBooster.setId && locked) badgeText = t('booster_set_locked');
      else if (!collection.complete) badgeText = t('booster_set_size', { count: total, total: collection.setSize });
      else if (owned >= total) badgeText = t('booster_set_complete');
      else badgeText = t('booster_set_size', { count: total, total: collection.setSize });
      button.appendChild(makeNode('span', 'booster-set-badge', badgeText));

      return button;
    })
  );
}

const SHOP_VENDOR_SPRITES = Array.from({ length: 14 }, (_, index) => `assets/data/vendor/azura/webp/vendor-${index + 1}.webp`);
const SHOP_BACKGROUNDS = {
  dawn: 'assets/data/shop_assets/dawn.webp',
  day: 'assets/data/shop_assets/day.webp',
  afternoon: 'assets/data/shop_assets/afternoon.webp',
  night: 'assets/data/shop_assets/night.webp'
};
const SHOP_LINES = {
  es: [
    'Ah, llegaste. Qué sorpresa… bueno, no tanta.',
    'Los sobres no muerden. Creo.',
    'Si sale una rara, fingiré sorpresa. Muy bien.',
    'Doce horas de turno. Tú eliges, yo juzgo en silencio.',
    'Ese pack tiene buen karma. Lo digo siempre.',
    'No soy adivina, pero ese foil te está llamando.'
  ],
  en: [
    'Oh, you showed up. Shocking. Not really.',
    'Packs don\'t bite. Probably.',
    'Pull a rare and I\'ll pretend to be impressed.',
    'Twelve-hour shift. You pick, I judge silently.',
    'That pack has good karma. I say that a lot.',
    'Not a psychic, but that foil is calling you.'
  ],
  de: [
    'Oh, du bist da. Überraschend. Nicht wirklich.',
    'Packs beißen nicht. Wahrscheinlich.',
    'Zieh eine Rare und ich tue überrascht. Sehr gut.',
    'Zwölf Stunden Schicht. Du wählst, ich urteile still.',
    'Das Pack hat gutes Karma. Sage ich oft.',
    'Keine Wahrsagerin, aber dieses Foil ruft dich.'
  ]
};
const SHOP_MOODS = ['🪷', '🫧', '🌸', '🍒', '🌙', '🎀', '🪻', '🍥', '✨', '🧋'];
const SHOP_IDLE_LINES = {
  es: [
    '¿Sigues ahí? El polvo no se compra solo.',
    'Puedes tocar los sobres, no muerden. Creo.',
    'Si no decides pronto, subo el precio por aburrimiento.',
    'Yo aquí, esperando. Como siempre.'
  ],
  en: [
    'Still there? Dust doesn\'t buy itself.',
    'You can touch the packs. They don\'t bite. Probably.',
    'Decide soon or I raise the price out of boredom.',
    'I\'ll be here. Waiting. As always.'
  ],
  de: [
    'Noch da? Staub kauft sich nicht von selbst.',
    'Du darfst die Packs anfassen. Sie beißen nicht. Wahrscheinlich.',
    'Entscheide dich bald, sonst erhöhe ich den Preis aus Langeweile.',
    'Ich bin hier. Warte. Wie immer.'
  ]
};
let shopVendorTimer = 0;
let shopClockTimer = 0;
let shopTypeTimer = 0;
let shopIdleTimer = 0;
let shopLineCursor = 0;
let shopVendorIndex = 0;
let shopVendorActive = 0;
let shopVendorInitialized = false;
let shopPackArt = {};
let shopPackArtLoaded = false;

function shopTimeSlot(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'afternoon';
  return 'night';
}

function shopRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

function shopLang() {
  const lang = document.documentElement.lang;
  return SHOP_LINES[lang] ? lang : 'en';
}

function typeShopLine(text, instant = false) {
  const speech = hub.els.shopSpeech;
  if (!speech || typeof text !== 'string') return;
  window.clearInterval(shopTypeTimer);
  speech.classList.remove('is-typing');
  if (instant) {
    speech.textContent = text;
    return;
  }
  speech.textContent = '';
  speech.classList.add('is-typing');
  let index = 0;
  shopTypeTimer = window.setInterval(() => {
    index += 1;
    speech.textContent = text.slice(0, index);
    if (index >= text.length) {
      window.clearInterval(shopTypeTimer);
      speech.classList.remove('is-typing');
    }
  }, 28);
}

function scheduleShopIdle() {
  if (!hub.els.shopSpeech) return;
  window.clearTimeout(shopIdleTimer);
  shopIdleTimer = window.setTimeout(() => {
    if (hub.panel !== 'booster' || document.hidden) {
      scheduleShopIdle();
      return;
    }
    speakShopLine('idle');
  }, 17000);
}

function speakShopLine(kind = 'talk') {
  if (!hub.els.shopSpeech) return;
  const lang = shopLang();
  const pool = kind === 'idle'
    ? (SHOP_IDLE_LINES[lang] || SHOP_IDLE_LINES.en)
    : (SHOP_LINES[lang] || SHOP_LINES.en);
  if (!pool || !pool.length) return;
  let line;
  if (kind === 'idle') {
    line = pool[Math.floor(Math.random() * pool.length)];
  } else {
    shopLineCursor = (shopLineCursor + 1) % pool.length;
    line = pool[shopLineCursor];
  }
  typeShopLine(line);
  hub.els.shopSpeech.dataset.lang = lang;
  scheduleShopIdle();
}

function renderShopAtmosphere() {
  const now = new Date();
  const slot = shopTimeSlot(now);
  if (hub.els.shopBg) hub.els.shopBg.style.backgroundImage = `url("${SHOP_BACKGROUNDS[slot]}")`;

  const lang = shopLang();
  if (hub.els.shopSpeech && hub.els.shopSpeech.dataset.lang !== lang) {
    typeShopLine((SHOP_LINES[lang] || SHOP_LINES.en)[0], true);
    hub.els.shopSpeech.dataset.lang = lang;
  }
  const mood = SHOP_MOODS[(Math.floor(now.getTime() / 86400000) + now.getDate()) % SHOP_MOODS.length];
  if (hub.els.shopMoodEmoji) hub.els.shopMoodEmoji.textContent = mood;
  if (hub.els.shopMood) hub.els.shopMood.setAttribute('aria-label', `Mood ${mood}`);

  const hour = now.getHours() + now.getMinutes() / 60;
  const dayShift = hour >= 8 && hour < 20;
  const shiftEnd = new Date(now);
  if (dayShift) shiftEnd.setHours(20, 0, 0, 0);
  else {
    shiftEnd.setHours(8, 0, 0, 0);
    if (hour >= 20) shiftEnd.setDate(shiftEnd.getDate() + 1);
  }
  if (hub.els.shopDaysCount) hub.els.shopDaysCount.textContent = String(hubBooster.streak || 0);
  if (hub.els.shopShift) {
    hub.els.shopShift.textContent = shopRemaining(shiftEnd - now);
    hub.els.shopShift.parentElement.title = dayShift ? t('shop_shift_day') : t('shop_shift_night');
  }

  const reset = new Date(now);
  const nextResetHour = (Math.floor(hour / 6) + 1) * 6;
  reset.setHours(nextResetHour, 0, 0, 0);
  if (hub.els.shopReset) hub.els.shopReset.textContent = shopRemaining(reset - now);
  if (hub.els.shopBg) hub.els.shopBg.dataset.slot = slot;
}

function loadShopPackArt() {
  if (shopPackArtLoaded) return;
  shopPackArtLoaded = true;
  fetch('assets/data/shop_assets/packs/manifest.json', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      shopPackArt = data && data.packs && typeof data.packs === 'object' ? data.packs : {};
      if (hub.ready) renderShopRecommended(boosterSets());
      if (hub.ready && hub.panel === 'explore') renderExplore();
    })
    .catch(() => {});
}


function triggerShopTransitionAnimation(newSlot) {
  const npcContainer = hub.els.shopNpcContainer || document.querySelector('.shop-npc');
  if (!npcContainer) return;
  npcContainer.classList.add('is-time-transition');
  window.setTimeout(() => {
    npcContainer.classList.remove('is-time-transition');
  }, 1500);
}

function triggerAzuraLeave() {
  if (azuraIsAway || hub.panel !== 'booster') return;
  azuraIsAway = true;
  const npcContainer = hub.els.shopNpcContainer || document.querySelector('.shop-npc');
  if (npcContainer) {
    const activeImg = shopVendorActive === 0 ? hub.els.shopNpcA : hub.els.shopNpcB;
    if (activeImg) activeImg.src = AZURA_POSES.leave;
    window.setTimeout(() => {
      npcContainer.classList.add('is-leaving-scene');
    }, 400);
  }
}

function triggerAzuraReturn() {
  if (!azuraIsAway) return;
  azuraIsAway = false;
  const npcContainer = hub.els.shopNpcContainer || document.querySelector('.shop-npc');
  if (npcContainer) {
    npcContainer.classList.remove('is-leaving-scene');
    const activeImg = shopVendorActive === 0 ? hub.els.shopNpcA : hub.els.shopNpcB;
    if (activeImg) activeImg.src = AZURA_POSES.enter;
    npcContainer.classList.add('is-entering-scene');
    window.setTimeout(() => {
      npcContainer.classList.remove('is-entering-scene');
    }, 900);
  }
  scheduleAzuraAway();
}

function scheduleAzuraAway() {
  window.clearTimeout(azuraAwayTimer);
  // Cuando no se usa por un periodo largo (35 segundos sin interacción en la tienda)
  azuraAwayTimer = window.setTimeout(() => {
    if (hub.panel === 'booster' && !document.hidden) {
      triggerAzuraLeave();
    }
  }, 35000);
}

function handleAzuraTap() {
  scheduleAzuraAway();
  const npcContainer = hub.els.shopNpcContainer || document.querySelector('.shop-npc');
  if (npcContainer) {
    npcContainer.classList.remove('is-reacting');
    void npcContainer.offsetWidth;
    npcContainer.classList.add('is-reacting');
    window.setTimeout(() => npcContainer.classList.remove('is-reacting'), 720);
  }
  if (azuraIsAway) {
    triggerAzuraReturn();
    return;
  }
  azuraTapCount += 1;
  window.clearTimeout(azuraTapResetTimer);
  azuraTapResetTimer = window.setTimeout(() => {
    azuraTapCount = 0;
  }, 3500);

  // Si se hace demasiados taps consecutivos (4 o más), adopta postura irritada/molesta
  if (azuraTapCount >= 4) {
    const annoyedSrc = AZURA_POSES.annoyed[Math.floor(Math.random() * AZURA_POSES.annoyed.length)];
    const activeImg = shopVendorActive === 0 ? hub.els.shopNpcA : hub.els.shopNpcB;
    if (activeImg) activeImg.src = annoyedSrc;
    if (hub.els.shopSpeech) {
      const annoyedLine = document.documentElement.lang === 'es'
        ? '¡Oye! Ya te vi, no tienes que picarme la pantalla.'
        : "Hey! I see you, you don't need to poke me repeatedly.";
      typeShopLine(annoyedLine);
    }
  } else {
    speakShopLine('talk');
  }
}

function initShopScene() {
  if (shopVendorInitialized) return;
  shopVendorInitialized = true;
  loadShopPackArt();
  SHOP_VENDOR_SPRITES.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
  if (hub.els.shopNpcA) hub.els.shopNpcA.src = SHOP_VENDOR_SPRITES[0];
  if (hub.els.shopNpcB) hub.els.shopNpcB.src = SHOP_VENDOR_SPRITES[1];
  const swap = () => {
    if (!hub.els.shopNpcA || !hub.els.shopNpcB) return;
    shopVendorIndex = (shopVendorIndex + 1) % SHOP_VENDOR_SPRITES.length;
    const next = shopVendorActive === 0 ? hub.els.shopNpcB : hub.els.shopNpcA;
    const prev = shopVendorActive === 0 ? hub.els.shopNpcA : hub.els.shopNpcB;
    next.src = SHOP_VENDOR_SPRITES[shopVendorIndex];
    next.classList.add('is-active');
    prev.classList.remove('is-active');
    shopVendorActive = shopVendorActive === 0 ? 1 : 0;
    speakShopLine('talk');
  };
  if (hub.els.shopSpeech) {
    typeShopLine((SHOP_LINES[shopLang()] || SHOP_LINES.en)[0]);
  }
  renderShopAtmosphere();
  window.setTimeout(renderShopAtmosphere, 1200);
  window.clearInterval(shopVendorTimer);
  shopVendorTimer = window.setInterval(swap, 4200 + Math.random() * 2200);
  window.clearInterval(shopClockTimer);
  shopClockTimer = window.setInterval(renderShopAtmosphere, 60000);
  scheduleShopIdle();
  if (!hub.shopInteractionBound) {
    hub.shopInteractionBound = true;
    document.addEventListener('click', () => {
      if (hub.panel === 'booster') scheduleShopIdle();
    }, { passive: true });
  }
  bindShopNpcMotion();
}

/* Azura responde al mouse (parallax) y al clic (rebote + pose). */
function bindShopNpcMotion() {
  const npc = document.querySelector('.shop-npc');
  const scene = document.querySelector('.shop-scene');
  if (!npc || !scene || hub.shopNpcMotionBound) return;
  hub.shopNpcMotionBound = true;
  scene.addEventListener('pointermove', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const rect = npc.getBoundingClientRect();
    const px = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
    const py = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
    npc.style.setProperty('--npc-px', px.toFixed(3));
    npc.style.setProperty('--npc-py', py.toFixed(3));
  }, { passive: true });
  scene.addEventListener('pointerleave', () => {
    npc.style.setProperty('--npc-px', '0');
    npc.style.setProperty('--npc-py', '0');
  });
  npc.addEventListener('click', () => handleAzuraTap());
}

function fillShopPackPreview(container, collection) {
  if (!container) return;
  const owned = collection ? new Set(ownedIn(collection.id)) : new Set();
  const cards = collection ? collection.cards.slice().sort((a, b) => cardRarity(a).weight - cardRarity(b).weight) : [];
  container.replaceChildren(
    ...cards.map((card) => {
      const item = makeNode('span', `shop-preview-card${owned.has(card.id) ? ' is-owned' : ' is-locked'}`);
      item.title = owned.has(card.id) ? card.name : `${card.name} · ${t('shop_locked')}`;
      item.appendChild(makeHubImage(thumbOf(card), card.name));
      return item;
    })
  );
}

function renderShopPackDetail() {
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId);
  if (!collection || !hub.els.shopPackView) return;
  if (hub.els.shopPackViewImg) {
    hub.els.shopPackViewImg.src = shopPackArt[collection.id] || collection.thumbCover || collection.cover || '';
    hub.els.shopPackViewImg.alt = collection.name;
  }
  if (hub.els.shopPackViewName) hub.els.shopPackViewName.textContent = collection.name;
  fillShopPackPreview(hub.els.shopPackViewCards, collection);

  if (hub.els.shopPackOpen) {
    hub.els.shopPackOpen.hidden = false;
    hub.els.shopPackOpen.disabled = false;
    const label = hub.els.shopPackOpen.querySelector('span');
    if (label) label.textContent = t('booster_open');
  }
  if (hub.els.shopPackViewHint) {
    hub.els.shopPackViewHint.textContent = t('shop_pack_detail_hint') || 'Contenido del sobre y cartas que puedes conseguir.';
  }
}

function openBoosterFromDetail() {
  ensureBoosterDay();
  if (!hubBooster.picks.length) {
    const grant = availableBoosterGrant();
    if (!grant) {
      toast(t('booster_no_grants'), { type: 'warning' });
      return;
    }
    const setId = hubBooster.setId || (boosterSets()[0] && boosterSets()[0].id);
    if (!setId) return;
    hubBooster.setId = setId;
    hubBooster.picks = drawBoosterCards(setId);
    hubBooster.pendingGrant = grant.id;
    persistBooster();
    renderBooster();
  }
  closeShopPackView();
  openPackOverlay();
}

function setShopPackContentsOpen(open) {
  if (!hub.els.shopPackContents) return;
  hub.els.shopPackContents.hidden = !open;
  if (hub.els.shopPackContentsBtn) {
    hub.els.shopPackContentsBtn.setAttribute('aria-expanded', String(Boolean(open)));
  }
}

function openShopPackView(collectionId) {
  if (!HUB_CATALOG.collections.some((entry) => entry.id === collectionId)) return;
  hubBooster.setId = collectionId;
  hubBooster.dropCardId = null;
  persistBooster();
  renderBooster();
  if (hub.els.shopPackView) hub.els.shopPackView.hidden = false;
  setShopPackContentsOpen(false);
  const scene = document.querySelector('.shop-scene');
  if (scene) scene.classList.add('is-pack-view');
  renderShopPackDetail();
}

function closeShopPackView() {
  if (hub.els.shopPackView) hub.els.shopPackView.hidden = true;
  setShopPackContentsOpen(false);
  const scene = document.querySelector('.shop-scene');
  if (scene) scene.classList.remove('is-pack-view');
}

function renderShopStores() {
  const container = hub.els.shopStores;
  if (!container) return;
  setTimeout(setupShopPlaygroundAll, 50);

  const button = makeHubButton('shop-store', null, { hubRoute: 'explore' });
  button.setAttribute('aria-label', 'Visitar tienda Astro~Verse de theAstroBruh');

  const building = makeNode('span', 'shop-store-building');
  const art = makeNode('span', 'shop-store-art');
  art.appendChild(makeHubImage('assets/data/shops/theastrobruh-cover.png', 'Astro~Verse Shop'));
  building.appendChild(art);
  building.appendChild(makeNode('span', 'shop-store-name', 'Astro~Verse'));
  button.appendChild(building);

  const owner = makeNode('span', 'shop-store-owner');
  const avatar = makeNode('span', 'shop-store-avatar');
  avatar.appendChild(makeHubImage('assets/data/shops/theastrobruh-avatar.jpg', 'theAstroBruh'));
  owner.appendChild(avatar);
  owner.appendChild(makeNode('span', 'shop-store-user', 'theAstroBruh'));
  button.appendChild(owner);

  container.replaceChildren(button);
}

function renderShopRecommended(sets) {
  const container = hub.els.shopRecommended;
  if (!container) return;
  const pools = sets.length ? sets : HUB_CATALOG.collections;
  const slot = Math.floor(Date.now() / (6 * 60 * 60 * 1000)) % Math.max(1, pools.length);
  const recommended = Array.from({ length: Math.min(3, pools.length) }, (_, index) =>
    pools[(slot + index) % pools.length]
  );
  container.replaceChildren(
    ...recommended.map((collection) => {
      const button = makeHubButton('shop-pack');
      button.dataset.shopPackOpen = collection.id;
      button.classList.toggle('is-active', collection.id === hubBooster.setId);
      const art = makeNode('span', 'shop-pack-art');
      const customArt = shopPackArt[collection.id];
      if (customArt) {
        art.classList.add('is-custom');
        art.appendChild(makeHubImage(customArt, collection.name));
      } else {
        art.classList.add('is-cover');
        art.appendChild(makeHubImage(collection.thumbCover || collection.cover || collection.cards[0]?.thumbFront || '', collection.name));
      }
      button.appendChild(art);
      button.appendChild(makeNode('strong', 'shop-pack-name', collection.name));

      const owned = ownedIn(collection.id).length;
      const total = collection.cards.length;
      const percent = total ? Math.round((owned / total) * 100) : 0;

      // Única barra de progreso de soda líquida suave y estética
      const meter = makeNode('span', 'shop-pack-soda-meter');
      const fill = makeNode('span', 'shop-pack-soda-fill');
      fill.style.width = `${Math.max(6, percent)}%`;
      meter.appendChild(fill);
      button.appendChild(meter);

      button.appendChild(makeNode('small', 'shop-pack-count', countLabel('explore_pack_cards', collection.cards.length)));
      return button;
    })
  );
  renderShopStores();
  setupShopPlaygroundAll();
}

function renderBooster() {
  if (!hub.ready || !hub.els.boosterPanel) return;
  ensureBoosterDay();
  setTimeout(setupShopPlaygroundAll, 80);

  const sets = boosterSets();
  if (!hubBooster.setId && sets.length) {
    hubBooster.setId = sets[0].id;
  }
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId) || null;
  const grants = boosterGrants();
  const available = grants.filter((grant) => grant.unlocked && !grant.used).length;
  const pending = hubBooster.picks.length > 0;

  initShopScene();
  renderShopRecommended(sets);
  renderBoosterSetButtons(sets);

  if (hub.els.boosterStreakValue) hub.els.boosterStreakValue.textContent = String(hubBooster.streak || 0);
  if (hub.els.boosterStreakLabel) {
    hub.els.boosterStreakLabel.textContent =
      hubBooster.streak === 1 ? t('booster_streak_short_one') : t('booster_streak_short');
  }

  if (hub.els.boosterStatusTitle && hub.els.boosterStatusCopy) {
    if (pending) {
      hub.els.boosterStatusTitle.textContent = t('booster_status_pending_title');
      hub.els.boosterStatusCopy.textContent = t('booster_status_pending_copy');
    } else if (available > 0) {
      hub.els.boosterStatusTitle.textContent = t(
        available === 1 ? 'booster_status_available_title_one' : 'booster_status_available_title',
        { count: available }
      );
      hub.els.boosterStatusCopy.textContent = t('booster_status_available_copy');
    } else {
      hub.els.boosterStatusTitle.textContent = t('booster_status_empty_title');
      hub.els.boosterStatusCopy.textContent = t('booster_status_empty_copy');
    }
  }

  if (hub.els.boosterProgress) {
    hub.els.boosterProgress.replaceChildren(
      ...grants.map((grant) => {
        const node = makeNode('div', `booster-grant${grant.used ? ' is-used' : ''}${grant.unlocked ? ' is-unlocked' : ''}`);
        node.appendChild(makeNode('strong', null, t(grant.label)));
        node.appendChild(
          makeNode(
            'span',
            null,
            grant.used
              ? t('booster_grant_used')
              : grant.unlocked
                ? t('booster_grant_ready')
                : t('booster_grant_locked')
          )
        );
        return node;
      })
    );
  }

  if (hub.els.boosterPackTitle) {
    hub.els.boosterPackTitle.textContent = collection ? collection.name : t('booster_pack_empty');
  }

  if (hub.els.shopPackPercent) {
    const owned = collection ? ownedIn(collection.id).length : 0;
    const total = collection ? collection.cards.length : 0;
    hub.els.shopPackPercent.textContent = `${total ? Math.round((owned / total) * 100) : 0}%`;
  }
  if (hub.els.shopRareCards) {
    const owned = collection ? new Set(ownedIn(collection.id)) : new Set();
    const cards = collection
      ? collection.cards.slice().sort((a, b) => cardRarity(a).weight - cardRarity(b).weight)
      : [];
    hub.els.shopRareCards.replaceChildren(
      ...cards.map((card) => {
        const item = makeNode('span', `shop-preview-card${owned.has(card.id) ? ' is-owned' : ' is-locked'}`);
        item.title = owned.has(card.id) ? card.name : `${card.name} · ${t('shop_locked')}`;
        item.appendChild(makeHubImage(thumbOf(card), card.name));
        return item;
      })
    );
  }

  if (hub.els.boosterPackChip) {
    if (collection) {
      hub.els.boosterPackChip.hidden = false;
      hub.els.boosterPackChip.textContent = t('booster_chip_six');
    } else {
      hub.els.boosterPackChip.hidden = true;
    }
  }

  if (hub.els.boosterCards) {
    const cards = hub.els.boosterCards;
    cards.replaceChildren(
      ...Array.from({ length: 6 }, () =>
        collection ? makeSealedBoosterCard(collection) : makeBoosterPlaceholder()
      )
    );
  }

  if (hub.els.boosterOpen) {
    hub.els.boosterOpen.hidden = false;
    hub.els.boosterOpen.disabled = !pending && available === 0;
    const label = hub.els.boosterOpen.querySelector('span');
    if (label) label.textContent = pending ? t('booster_continue') : t('booster_open');
  }
  if (hub.els.boosterClaim) hub.els.boosterClaim.hidden = true;
  if (hub.els.mobileDaily) {
    hub.els.mobileDaily.hidden = !(pending || available > 0);
  }
  if (hub.els.boosterHint) {
    hub.els.boosterHint.textContent = pending
      ? t('booster_pending_hint')
      : available > 0
        ? t('booster_open_hint')
        : t('booster_no_grants');
  }
  if (hub.els.shopPackView && !hub.els.shopPackView.hidden) renderShopPackDetail();
}

function updateBoosterClock() {
  if (hub.panel !== 'booster') return;
  if (hubBooster.day && hubBooster.day !== dayKey()) {
    renderBooster();
    return;
  }
  if (!hub.els.boosterHint || hubBooster.picks.length) return;
  if (availableBoosterGrant()) return;
  hub.els.boosterHint.textContent = t('booster_next_in', {
    time: formatCountdown(nextBoosterReset() - Date.now())
  });
}

let hubProfile = sanitizeHubProfile(null);
let hubData = sanitizeHubData(null);
let hubBooster = sanitizeBooster(null);

function loadHubState() {
  hubProfile = sanitizeHubProfile(storage.read(HUB_STORAGE.profile, null));
  hubData = sanitizeHubData(storage.read(HUB_STORAGE.data, null));
  hubBooster = sanitizeBooster(storage.read(HUB_STORAGE.booster, null));
}

function persistHubProfile() {
  const ok = storage.write(HUB_STORAGE.profile, hubProfile);
  if (!ok) toast(t('storage_error'), { type: 'error', duration: 5000 });
  return ok;
}

function persistHubData() {
  const ok = storage.write(HUB_STORAGE.data, hubData);
  if (!ok) toast(t('storage_error'), { type: 'error', duration: 5000 });
  return ok;
}

function persistBooster() {
  const ok = storage.write(HUB_STORAGE.booster, hubBooster);
  if (!ok) toast(t('storage_error'), { type: 'error', duration: 5000 });
  syncMobileDailyButton();
  return ok;
}

/* --------------------------------------------------------------------------
   Composición libre del inicio de escritorio
   -------------------------------------------------------------------------- */
let hubLayout = { ...HUB_LAYOUT_DEFAULT };
let hubHome = { ...HUB_HOME_DEFAULT };

function sanitizeLayout(raw) {
  const data = { ...HUB_LAYOUT_DEFAULT };
  if (!raw || typeof raw !== 'object') return data;
  const number = (key, min, max) => {
    const value = Number(raw[key]);
    if (Number.isFinite(value)) data[key] = Math.min(max, Math.max(min, value));
  };
  if (raw.mode === 'free' || raw.mode === 'controlled') data.mode = raw.mode;
  number('leftWidth', 230, 380);
  number('rightWidth', 260, 420);
  number('height', 300, 700);
  number('offset', -120, 180);
  number('cardSize', 70, 125);
  number('sideCards', 70, 150);
  number('leftX', -500, 500);
  number('leftY', -300, 300);
  number('rightX', -500, 500);
  number('rightY', -300, 300);
  number('heroX', -500, 500);
  number('heroY', -300, 300);
  data.leftExpanded = Boolean(raw.leftExpanded);
  data.rightExpanded = Boolean(raw.rightExpanded);
  data.heroExpanded = Boolean(raw.heroExpanded);
  return data;
}

function persistHubLayout() {
  storage.write(HUB_STORAGE.layout, hubLayout);
}

function applyHubLayout() {
  const panel = document.querySelector('.hub-home-panel');
  if (!panel) return;
  const free = hubLayout.mode === 'free';
  const leftExp = Boolean(hubLayout.leftExpanded);
  const rightExp = Boolean(hubLayout.rightExpanded);
  const heroExp = Boolean(hubLayout.heroExpanded);

  panel.dataset.layoutMode = hubLayout.mode;
  panel.dataset.leftExpanded = String(leftExp);
  panel.dataset.rightExpanded = String(rightExp);
  panel.dataset.heroExpanded = String(heroExp);

  const effLeftW = leftExp ? Math.max(hubLayout.leftWidth, 390) : hubLayout.leftWidth;
  const effLeftH = leftExp ? Math.max(hubLayout.height, 620) : hubLayout.height;
  const effRightW = rightExp ? Math.max(hubLayout.rightWidth, 460) : hubLayout.rightWidth;
  const effRightH = rightExp ? Math.max(hubLayout.height, 620) : hubLayout.height;
  const effHeroScale = heroExp ? Math.max(hubLayout.cardSize / 100, 1.25) : (hubLayout.cardSize / 100);

  panel.style.setProperty('--side-w-left', `${effLeftW}px`);
  panel.style.setProperty('--side-h-left', `${effLeftH}px`);
  panel.style.setProperty('--side-w-right', `${effRightW}px`);
  panel.style.setProperty('--side-h-right', `${effRightH}px`);
  panel.style.setProperty('--side-h', `${Math.max(effLeftH, effRightH)}px`);
  panel.style.setProperty('--side-offset', `${hubLayout.offset}px`);
  panel.style.setProperty('--hero-scale', String(effHeroScale));
  panel.style.setProperty('--side-card-scale', String(hubLayout.sideCards / 100));
  panel.style.setProperty('--left-x', `${free ? hubLayout.leftX : 0}px`);
  panel.style.setProperty('--left-y', `${free ? hubLayout.leftY : 0}px`);
  panel.style.setProperty('--right-x', `${free ? hubLayout.rightX : 0}px`);
  panel.style.setProperty('--right-y', `${free ? hubLayout.rightY : 0}px`);
  panel.style.setProperty('--hero-x', `${free ? hubLayout.heroX : 0}px`);
  panel.style.setProperty('--hero-y', `${free ? hubLayout.heroY : 0}px`);

  const syncGripState = (key, isExp) => {
    const grip = document.querySelector(`[data-layout-grip="${key}"]`);
    if (!grip) return;
    if (isExp) {
      grip.setAttribute('data-grip-expanded', 'true');
      grip.setAttribute('aria-label', t('layout_shrink'));
      grip.title = t('layout_shrink');
    } else {
      grip.removeAttribute('data-grip-expanded');
      grip.setAttribute('aria-label', t('layout_enlarge'));
      grip.title = t('layout_enlarge');
    }
  };
  syncGripState('left', leftExp);
  syncGripState('right', rightExp);
  syncGripState('hero', heroExp);

  const values = {
    'layout-left-width': hubLayout.leftWidth,
    'layout-right-width': hubLayout.rightWidth,
    'layout-height': hubLayout.height,
    'layout-offset': hubLayout.offset,
    'layout-card-size': hubLayout.cardSize,
    'layout-side-cards': hubLayout.sideCards
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = String(value);
  });

  document.querySelectorAll('[data-layout-mode]').forEach((button) => {
    const active = button.dataset.layoutMode === hubLayout.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (hub.ready) syncHomeCardScale();
}

function setupLayoutEditor() {
  const dock = document.getElementById('hub-layout-dock');
  const toggle = document.getElementById('hub-layout-toggle');
  const panel = document.getElementById('hub-layout-panel');
  if (!dock || !toggle || !panel) return;

  document.body.appendChild(dock);
  hubLayout = sanitizeLayout(storage.read(HUB_STORAGE.layout, null));
  applyHubLayout();

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  });

  panel.addEventListener('click', (event) => {
    const langButton = event.target.closest('[data-hub-lang]');
    if (langButton) {
      applyLanguage(langButton.dataset.hubLang);
      return;
    }
    const mode = event.target.closest('[data-layout-mode]');
    if (mode) {
      hubLayout.mode = mode.dataset.layoutMode;
      applyHubLayout();
      persistHubLayout();
    }
  });

  const bind = (id, key) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      hubLayout[key] = Number(input.value);
      applyHubLayout();
      persistHubLayout();
    });
  };
  bind('layout-left-width', 'leftWidth');
  bind('layout-right-width', 'rightWidth');
  bind('layout-height', 'height');
  bind('layout-offset', 'offset');
  bind('layout-card-size', 'cardSize');
  bind('layout-side-cards', 'sideCards');

  const reset = document.getElementById('layout-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      hubLayout = { ...HUB_LAYOUT_DEFAULT };
      applyHubLayout();
      persistHubLayout();
    });
  }

  const heroHost = document.querySelector('.hub-card-stage') || document.querySelector('.hub-favorite');
  const grips = [
    ['left', document.querySelector('.hub-player-panel')],
    ['right', document.querySelector('.hub-explorer-panel')],
    ['hero', heroHost]
  ];

  function toggleWindowExpand(key) {
    if (typeof Sound !== 'undefined' && Sound.play) {
      Sound.play('tap');
    }
    let isNowExpanded = false;
    if (key === 'left') {
      hubLayout.leftExpanded = !hubLayout.leftExpanded;
      isNowExpanded = hubLayout.leftExpanded;
    } else if (key === 'right') {
      hubLayout.rightExpanded = !hubLayout.rightExpanded;
      isNowExpanded = hubLayout.rightExpanded;
    } else {
      hubLayout.heroExpanded = !hubLayout.heroExpanded;
      isNowExpanded = hubLayout.heroExpanded;
    }
    applyHubLayout();
    persistHubLayout();
    if (typeof toast === 'function') {
      toast(isNowExpanded ? (t('layout_toast_enlarged') || 'Ventana agrandada') : (t('layout_toast_shrunk') || 'Ventana restaurada'), { duration: 1600 });
    }
  }

  function attachWindowDrag(dragHandle, key) {
    if (!dragHandle) return;
    dragHandle.addEventListener('pointerdown', (event) => {
      if (hubLayout.mode !== 'free') return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target.closest('button:not(.hub-layout-grip), a, input')) return;

      const start = { x: event.clientX, y: event.clientY };
      const base = key === 'left'
        ? { x: hubLayout.leftX, y: hubLayout.leftY }
        : key === 'right'
          ? { x: hubLayout.rightX, y: hubLayout.rightY }
          : { x: hubLayout.heroX, y: hubLayout.heroY };

      let moved = false;
      const onMove = (moveEvt) => {
        const dx = moveEvt.clientX - start.x;
        const dy = moveEvt.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) >= 6) {
          moved = true;
          dragHandle.classList.add('is-dragging');
        }
        if (moved) {
          moveEvt.preventDefault();
          if (key === 'left') {
            hubLayout.leftX = base.x + dx;
            hubLayout.leftY = base.y + dy;
          } else if (key === 'right') {
            hubLayout.rightX = base.x + dx;
            hubLayout.rightY = base.y + dy;
          } else {
            hubLayout.heroX = base.x + dx;
            hubLayout.heroY = base.y + dy;
          }
          applyHubLayout();
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        dragHandle.classList.remove('is-dragging');
        if (moved) persistHubLayout();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  // Permite arrastrar los paneles desde sus cabeceras en modo libre
  attachWindowDrag(document.querySelector('.hub-player-head'), 'left');
  attachWindowDrag(document.querySelector('.hub-explorer-head'), 'right');

  grips.forEach(([key, host]) => {
    if (!host || host.querySelector(`[data-layout-grip="${key}"]`)) return;
    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'hub-layout-grip';
    grip.dataset.layoutGrip = key;
    grip.setAttribute('aria-label', t('layout_enlarge'));
    grip.title = t('layout_enlarge');
    host.appendChild(grip);

    let didDrag = false;
    let startX = 0;
    let startY = 0;
    const DRAG_THRESHOLD = 8;

    grip.addEventListener('pointerdown', (event) => {
      if (hubLayout.mode !== 'free') return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.stopPropagation();
      didDrag = false;
      startX = event.clientX;
      startY = event.clientY;
      const start = { x: startX, y: startY };
      const base = key === 'left'
        ? { x: hubLayout.leftX, y: hubLayout.leftY }
        : key === 'right'
          ? { x: hubLayout.rightX, y: hubLayout.rightY }
          : { x: hubLayout.heroX, y: hubLayout.heroY };

      try { grip.setPointerCapture(event.pointerId); } catch (_) {}

      const move = (moveEvent) => {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (!didDrag && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
          didDrag = true;
          grip.classList.add('is-dragging');
        }
        if (didDrag) {
          moveEvent.preventDefault();
          if (key === 'left') {
            hubLayout.leftX = base.x + dx;
            hubLayout.leftY = base.y + dy;
          } else if (key === 'right') {
            hubLayout.rightX = base.x + dx;
            hubLayout.rightY = base.y + dy;
          } else {
            hubLayout.heroX = base.x + dx;
            hubLayout.heroY = base.y + dy;
          }
          applyHubLayout();
        }
      };

      const end = (endEvent) => {
        try { grip.releasePointerCapture(event.pointerId); } catch (_) {}
        grip.removeEventListener('pointermove', move);
        grip.removeEventListener('pointerup', end);
        grip.removeEventListener('pointercancel', end);
        grip.classList.remove('is-dragging');

        if (didDrag) {
          persistHubLayout();
          setTimeout(() => { didDrag = false; }, 60);
        } else {
          // Si no arrastró: fue un clic limpio -> Agrandar / Achicar
          toggleWindowExpand(key);
        }
      };

      grip.addEventListener('pointermove', move);
      grip.addEventListener('pointerup', end);
      grip.addEventListener('pointercancel', end);
    });

    grip.addEventListener('click', (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (hubLayout.mode !== 'free') return;
      if (didDrag) return;
      toggleWindowExpand(key);
    });
  });
}

/* --------------------------------------------------------------------------
   Estadísticas
   -------------------------------------------------------------------------- */
function hubStats() {
  const reviewed = new Set(hubData.reviewedCollections);
  const collections = HUB_CATALOG.collections;
  const allDeckCards = new Set();
  hubData.decks.forEach((deck) => deck.cardIds.forEach((id) => allDeckCards.add(id)));

  return {
    cards: Array.isArray(presets) ? presets.length : 0,
    catalogCards: HUB_CATALOG.cards.length,
    collections: collections.length,
    review: collections.filter((collection) => !reviewed.has(collection.id)).length,
    decks: hubData.decks.length,
    deckCards: allDeckCards.size,
    renders: hubData.exports
  };
}

function isCollectionReviewed(id) {
  return hubData.reviewedCollections.includes(id);
}

function setStatValue(node, value, animate) {
  if (!node) return;
  const target = Math.max(0, Math.floor(Number(value) || 0));
  const cached = hubStatCache.get(node);

  if (!animate || reduceMotion() || typeof cached !== 'number') {
    hubStatCache.set(node, target);
    node.textContent = String(target);
    return;
  }

  if (cached === target) {
    node.textContent = String(target);
    return;
  }

  if (node._hubRaf) cancelAnimationFrame(node._hubRaf);

  const from = cached;
  const started = performance.now();
  const duration = 1100;

  const step = (now) => {
    const progress = Math.min((now - started) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = String(Math.round(from + (target - from) * eased));
    if (progress < 1) {
      node._hubRaf = requestAnimationFrame(step);
    } else {
      node.textContent = String(target);
      node._hubRaf = 0;
    }
  };

  hubStatCache.set(node, target);
  node._hubRaf = requestAnimationFrame(step);
}

function renderMobileData(stats) {
  if (!hub.els.mobileDataPlayer && !hub.els.mobileDataCollection) return;
  const values = stats || hubStats();
  const data = hub.mobileData;

  data.player = [
    `@${hubProfile.handle}`,
    t('hub_data_decks', { count: values.decks })
  ];
  data.collection = [
    t('hub_data_cards', { count: values.cards }),
    t('hub_data_sets', { count: values.collections }),
    t('hub_data_catalog', { count: values.catalogCards }),
    t('hub_data_review', { count: values.review })
  ];

  if (hub.els.mobileDataPlayer) {
    hub.els.mobileDataPlayer.textContent =
      data.player[data.playerIndex % data.player.length];
  }
  if (hub.els.mobileDataCollection) {
    hub.els.mobileDataCollection.textContent =
      data.collection[data.collectionIndex % data.collection.length];
  }
}

function swapMobileData(node, text) {
  if (!node) return;

  if (reduceMotion()) {
    node.textContent = text;
    return;
  }

  node.classList.add('is-swapping');
  window.setTimeout(() => {
    node.textContent = text;
    node.classList.remove('is-swapping');
  }, 180);
}

function rotateMobileData(slot) {
  if (!hub.ready || hub.panel !== 'home' || document.hidden) return;
  const data = hub.mobileData;
  const list = data[slot];
  if (!Array.isArray(list) || list.length < 2) return;

  const key = slot === 'player' ? 'playerIndex' : 'collectionIndex';
  data[key] = (data[key] + 1) % list.length;
  const node = slot === 'player' ? hub.els.mobileDataPlayer : hub.els.mobileDataCollection;
  swapMobileData(node, list[data[key]]);
}

function setupMobileData() {
  if (reduceMotion() || hub.mobileDataTimer) return;
  /* Ritmos distintos: los dos datos no cambian a la vez. */
  hub.mobileDataTimer = window.setInterval(() => rotateMobileData('player'), 4600);
  hub.mobileDataTimer2 = window.setInterval(() => rotateMobileData('collection'), 6200);
}

function renderHubStats(animate) {
  if (!hub.ready) return;
  const stats = hubStats();

  setStatValue(hub.els.statCards, stats.cards, animate);
  setStatValue(hub.els.statCollections, stats.collections, animate);
  setStatValue(hub.els.statReview, stats.review, animate);
  setStatValue(hub.els.statDecks, stats.decks, animate);
  setStatValue(hub.els.statRenders, stats.renders, animate);

  if (hub.els.statCardsSub) {
    hub.els.statCardsSub.textContent = t('hub_stat_cards_sub', { count: stats.catalogCards });
  }
  if (hub.els.statCollectionsSub) {
    hub.els.statCollectionsSub.textContent = countLabel('hub_stat_collections_sub', stats.catalogCards);
  }
  if (hub.els.statReviewSub) {
    hub.els.statReviewSub.textContent = stats.review
      ? t('hub_stat_review_sub_on', { count: stats.review })
      : t('hub_stat_review_sub_off');
  }
  if (hub.els.statDecksSub) {
    hub.els.statDecksSub.textContent = countLabel('hub_stat_decks_sub', stats.deckCards);
  }

  if (hub.els.menuStatCards) hub.els.menuStatCards.textContent = String(stats.cards);
  if (hub.els.menuStatCollections) hub.els.menuStatCollections.textContent = String(stats.collections);
  if (hub.els.menuStatDecks) hub.els.menuStatDecks.textContent = String(stats.decks);
  if (hub.els.menuStatRenders) hub.els.menuStatRenders.textContent = String(stats.renders);

  if (hub.els.playerSummary) {
    hub.els.playerSummary.textContent = `${stats.catalogCards}·${HUB_CATALOG.collections.length}`;
    hub.els.playerSummary.title = t('hub_mobile_summary', {
      cards: stats.catalogCards,
      collections: HUB_CATALOG.collections.length
    });
  }

  renderProfileSummary(stats);
  renderMobileData(stats);
}

function renderProfileSummary(stats) {
  const values = stats || hubStats();
  if (hub.els.profileStatCards) hub.els.profileStatCards.textContent = String(values.cards);
  if (hub.els.profileStatCollections) {
    hub.els.profileStatCollections.textContent = String(values.collections);
  }
  if (hub.els.profileStatReview) hub.els.profileStatReview.textContent = String(values.review);
  if (hub.els.profileStatDecks) hub.els.profileStatDecks.textContent = String(values.decks);
  if (hub.els.profileStatRenders) hub.els.profileStatRenders.textContent = String(values.renders);
  if (hub.els.profileMemberSince) {
    hub.els.profileMemberSince.textContent = t('profile_member_since', {
      date: formatHubDate(hubProfile.joinedAt)
    });
  }
}

/* --------------------------------------------------------------------------
   Identidad y carta favorita
   -------------------------------------------------------------------------- */
function applyAvatar(container, image, src) {
  if (!container || !image) return;
  if (src) {
    image.src = src;
    image.hidden = false;
    container.classList.add('has-image');
  } else {
    image.removeAttribute('src');
    image.hidden = true;
    container.classList.remove('has-image');
  }
}

function renderHubIdentity() {
  if (!hub.ready) return;

  if (hub.els.topName) hub.els.topName.textContent = hubProfile.name;
  if (hub.els.topHandle) hub.els.topHandle.textContent = `@${hubProfile.handle}`;
  if (hub.els.greetingName) hub.els.greetingName.textContent = hubProfile.name;
  if (hub.els.playerName) hub.els.playerName.textContent = hubProfile.name;
  if (hub.els.playerHandle) hub.els.playerHandle.textContent = `@${hubProfile.handle}`;
  if (hub.els.playerSince) {
    hub.els.playerSince.textContent = t('profile_member_since', {
      date: formatHubDate(hubProfile.joinedAt)
    });
  }
  if (hub.els.playerBio) {
    hub.els.playerBio.textContent = hubProfile.bio;
    hub.els.playerBio.hidden = !hubProfile.bio;
  }

  applyAvatar(hub.els.avatar, hub.els.avatarImg, hubProfile.avatar);
  applyAvatar(hub.els.playerAvatar, hub.els.playerAvatarImg, hubProfile.avatar);
  applyAvatar(hub.els.menuAvatar, hub.els.menuAvatarImg, hubProfile.avatar);

  if (hub.els.menuName) hub.els.menuName.textContent = hubProfile.name;
  if (hub.els.menuHandle) hub.els.menuHandle.textContent = `@${hubProfile.handle}`;
  if (hub.els.menuSince) {
    hub.els.menuSince.textContent = t('profile_member_since', {
      date: formatHubDate(hubProfile.joinedAt)
    });
  }
}

function favoriteCard() {
  return HUB_CATALOG.byId(hubProfile.favoriteCardId) || fallbackCard();
}

/* Marcos que adoptan la proporción real del arte (5:7, 3:4, tarot…). */
const CARD_RATIO_FRAMES = [
  '.hub-card-stage',
  '.media-card-thumb',
  '.hub-explorer-art',
  '.deck-cover-option',
  '.collection-stack'
].join(', ');

function syncCardRatio(image) {
  if (!image) return;

  const frame = image.closest(CARD_RATIO_FRAMES);
  if (!frame) return;

  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) return;

  const ratio = width / height;
  const current = Number(frame.style.getPropertyValue('--card-ratio')) || 0;
  if (Math.abs(ratio - current) < 0.0005) return;

  frame.style.setProperty('--card-ratio', ratio.toFixed(4));
}

/* Aplica la proporción a los marcos ya montados (imágenes en caché). */
function refreshCardRatios(root) {
  const scope = root || hub.root;
  if (!scope) return;
  Array.from(scope.querySelectorAll(CARD_RATIO_FRAMES)).forEach((frame) => {
    const image = frame.querySelector('img');
    if (image && image.complete) syncCardRatio(image);
  });
}

function setupCardRatios() {
  /* Cualquier imagen que termine de cargar ajusta su marco. */
  document.addEventListener(
    'load',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.closest('#hub, #deck-dialog')) {
        syncCardRatio(target);
      }
    },
    true
  );

  /* Los visores se repintan a menudo: cada nodo nuevo recalcula su marco. */
  if (typeof MutationObserver !== 'function') return;

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.tagName === 'IMG') syncCardRatio(node);
        node.querySelectorAll('img').forEach(syncCardRatio);
      });
    });
  });

  if (hub.root) observer.observe(hub.root, { childList: true, subtree: true });
  if (hub.els.deckDialog) {
    observer.observe(hub.els.deckDialog, { childList: true, subtree: true });
  }
}

function syncFavoriteMarks() {
  if (!hub.root) return;
  hub.root.querySelectorAll('[data-fav-card]').forEach((button) => {
    const card = HUB_CATALOG.byId(button.dataset.favCard);
    if (!card) return;
    const selected = hubProfile.favoriteCardId === card.id;
    button.setAttribute('aria-pressed', String(selected));
    if (button.hasAttribute('aria-label')) {
      button.setAttribute('aria-label', explorerCardLabel(card, selected));
    }
    const art = button.querySelector('.hub-explorer-art');
    if (!art) return;
    const mark = art.querySelector('.hub-explorer-selected');
    if (selected && !mark) {
      const selectedMark = makeNode('span', 'hub-explorer-selected');
      selectedMark.setAttribute('aria-hidden', 'true');
      selectedMark.appendChild(hubIcon('check'));
      art.appendChild(selectedMark);
    } else if (!selected && mark) {
      mark.remove();
    }
  });
}

function renderFavoriteCard() {
  if (!hub.ready) return;
  const card = favoriteCard();
  if (!card) return;

  renderFeaturedStack();

  const frontSrc = thumbOf(card);
  const backSrc = backThumbOf(card);

  if (hub.els.cardFront && hub.els.cardFront.dataset.src !== frontSrc) {
    hub.els.cardFront.dataset.src = frontSrc;
    hub.els.cardFront.src = frontSrc;
    syncCardRatio(hub.els.cardFront);
  }
  if (hub.els.cardFront) hub.els.cardFront.alt = `${card.name} — ${card.type}`;
  if (hub.els.cardBack && hub.els.cardBack.dataset.src !== backSrc) {
    hub.els.cardBack.dataset.src = backSrc;
    hub.els.cardBack.src = backSrc;
  }
  if (hub.els.cardBack) hub.els.cardBack.alt = `${card.name} — ${t('back_cover')}`;
  if (hub.els.cardName) hub.els.cardName.textContent = card.name;

  const collection = HUB_CATALOG.collectionOf(card);
  const metaLine = `${collection ? collection.name : card.collectionName} · ${card.set}`;
  if (hub.els.cardSub) {
    hub.els.cardSub.textContent = metaLine;
  }
  if (hub.els.cardSheetSub) {
    hub.els.cardSheetSub.textContent = metaLine;
  }

  /* El fondo del lobby se tiñe con el arte de la carta activa. */
  if (window.CardGramAmbient) {
    window.CardGramAmbient.apply(
      thumbOf(card),
      (collection && collection.accent) || card.collectionAccent
    );
  }

  const chipTexts = [];
  if (card.rarity) chipTexts.push(card.rarity);
  if (card.type) chipTexts.push(card.type);
  Object.keys(card.stats || {}).forEach((key) => chipTexts.push(`${key} ${card.stats[key]}`));

  /* Las etiquetas viven en el home (escritorio) y en la hoja de detalles. */
  [hub.els.cardChips, hub.els.cardSheetChips].forEach((container) => {
    if (!container) return;
    container.replaceChildren(
      ...chipTexts.map((text) => makeNode('span', 'hub-chip', text))
    );
  });

  /* Tres identificadores sobre el nombre: franquicia, tipo/elemento y stats. */
  if (hub.els.cardTags) {
    const tagTexts = [];
    const franchise = collection ? collection.name : card.collectionName;
    if (franchise) tagTexts.push(franchise);
    const kind = card.attribute || card.type;
    if (kind) tagTexts.push(kind);
    const statLine = Object.keys(card.stats || {})
      .map((key) => `${key} ${card.stats[key]}`)
      .join(' · ');
    if (statLine) tagTexts.push(statLine);

    hub.els.cardTags.replaceChildren(
      ...tagTexts.map((text) => {
        const tag = makeNode('span', 'hub-card-tag', text);
        tag.title = text;
        return tag;
      })
    );
  }

  if (hub.els.cardSheetLore) {
    hub.els.cardSheetLore.textContent = card.lore || '';
    hub.els.cardSheetLore.hidden = !card.lore;
  }

  if (hub.els.card) {
    hub.els.card.classList.remove('is-flipped');
    hub.els.card.setAttribute('aria-pressed', 'false');
  }

  syncFavoriteMarks();
}

function setFavoriteCard(cardId) {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return;
  hub.explorerShowcase = false;
  hubProfile.favoriteCardId = card.id;
  hubProfile.favoriteTouched = true;
  persistHubProfile();
  renderFavoriteCard();
  renderHubStats(false);
  if (hub.panel === 'library') renderLibrary();
  if (hub.panel === 'collections') renderCollections();
  if (hub.panel === 'profile') renderProfileForm();
}

/* --------------------------------------------------------------------------
   Explorador de cartas del inicio
   -------------------------------------------------------------------------- */
function renderExplorerFilters() {
  const filters = hub.els.explorerFilters;
  if (!filters) return;

  const entries = [
    { id: 'all', label: t('hub_explorer_all') },
    ...HUB_CATALOG.collections.map((collection) => ({
      id: collection.id,
      label: collection.shortName || collection.name
    }))
  ];

  if (!entries.some((entry) => entry.id === hub.explorerFilter)) {
    hub.explorerFilter = 'all';
  }

  filters.replaceChildren(
    ...entries.map((entry) => {
      const button = makeNode('button', 'hub-explorer-filter', entry.label);
      button.type = 'button';
      button.dataset.explorerFilter = entry.id;
      const active = entry.id === hub.explorerFilter;
      button.setAttribute('aria-pressed', String(active));
      return button;
    })
  );
}

function explorerCards() {
  return HUB_CATALOG.cards.filter(
    (card) => hub.explorerFilter === 'all' || card.collectionId === hub.explorerFilter
  );
}

function explorerCardLabel(card, selected) {
  return `${card.name} · ${selected ? t('hub_explorer_selected') : t('hub_explorer_make_favorite')}`;
}

function makeExplorerArt(card, extraClass, useThumb) {
  const art = makeNode(
    'span',
    extraClass ? `hub-explorer-art ${extraClass}` : 'hub-explorer-art'
  );
  art.appendChild(makeHubImage(useThumb ? thumbOf(card) : microOf(card), card.name));
  art.appendChild(
    makeNode('span', 'hub-explorer-badge', card.collectionShortName || card.set)
  );

  if (hubProfile.favoriteCardId === card.id) {
    const selectedMark = makeNode('span', 'hub-explorer-selected');
    selectedMark.setAttribute('aria-hidden', 'true');
    selectedMark.appendChild(hubIcon('check'));
    art.appendChild(selectedMark);
  }

  return art;
}

function makeStackCard(card) {
  const selected = hubProfile.favoriteCardId === card.id;

  const button = makeNode('button', 'hub-stack-card');
  button.type = 'button';
  button.dataset.favCard = card.id;
  button.title = card.name;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', explorerCardLabel(card, selected));
  button.appendChild(makeExplorerArt(card));
  return button;
}

/* Abanico de cartas destacadas del jugador en el panel izquierdo. */
function featuredCards() {
  const ids =
    Array.isArray(hubProfile.featuredIds) && hubProfile.featuredIds.length
      ? hubProfile.featuredIds
      : defaultFeaturedIds(hubProfile.favoriteCardId);
  const cards = ids
    .map((id) => HUB_CATALOG.byId(id))
    .filter(Boolean)
    .slice(0, 6);
  return cards.length ? cards : HUB_CATALOG.cards.slice(0, 3);
}

function makeDeckCard(card) {
  const button = makeNode('button', 'hub-hand-deck-card');
  button.type = 'button';
  button.dataset.favCard = card.id;
  button.title = card.name;
  button.setAttribute(
    'aria-label',
    explorerCardLabel(card, hubProfile.favoriteCardId === card.id)
  );
  button.appendChild(makeExplorerArt(card, null, true));
  return button;
}

/* Dos cartas detrás de la principal en móvil: carrusel de la mano. */
function renderHandDeck(cards) {
  const deck = hub.els.handDeck;
  if (!deck) return;

  const navs = document.querySelectorAll('[data-hand-nav]');

  /* La vitrina siempre enseña una pila: si la mano elegida tiene una sola
     carta, se completan los huecos con cartas del catálogo. */
  let deckCards = cards.slice();
  if (deckCards.length && deckCards.length < 3) {
    const used = new Set(deckCards.map((card) => card.id));
    const extras = HUB_CATALOG.cards
      .filter((card) => !used.has(card.id))
      .slice(0, 3 - deckCards.length);
    deckCards = deckCards.concat(extras);
  }

  if (deckCards.length < 2) {
    deck.replaceChildren();
    navs.forEach((button) => {
      button.hidden = true;
    });
    return;
  }

  const current = favoriteCard();
  let index = deckCards.findIndex((card) => current && card.id === current.id);
  if (index < 0) index = 0;

  const prev = deckCards[(index - 1 + deckCards.length) % deckCards.length];
  const next = deckCards[(index + 1) % deckCards.length];
  const picks = prev.id === next.id ? [next] : [prev, next];
  const signature = picks.map((card) => card.id).join('|');
  const navsVisible = () => {
    navs.forEach((button) => {
      button.hidden = false;
    });
  };

  if (hub.handDeckSignature === signature && deck.childElementCount) {
    navsVisible();
    return;
  }
  hub.handDeckSignature = signature;

  deck.replaceChildren(...picks.map((card) => makeDeckCard(card)));
  navsVisible();
}

function cycleHand(direction) {
  const cards = featuredCards();
  if (cards.length < 2) return;

  const current = favoriteCard();
  let index = cards.findIndex((card) => current && card.id === current.id);
  if (index < 0) index = 0;

  const next = cards[(index + direction + cards.length) % cards.length];
  if (next) setFavoriteCard(next.id);
}

function sanitizeHome(raw) {
  const data = { ...HUB_HOME_DEFAULT };
  if (!raw || typeof raw !== 'object') return data;
  const sources = new Set(['all']);
  HUB_CATALOG.collections.forEach((collection) => sources.add(`set:${collection.id}`));
  const decks = Array.isArray(hubData.decks) ? hubData.decks : [];
  decks.forEach((deck) => sources.add(`deck:${deck.id}`));
  if (typeof raw.drawSource === 'string') data.drawSource = sources.has(raw.drawSource) ? raw.drawSource : 'all';
  if (typeof raw.deckSource === 'string') data.deckSource = sources.has(raw.deckSource) ? raw.deckSource : 'all';
  if (typeof raw.backSrc === 'string' && raw.backSrc.startsWith('assets/')) data.backSrc = raw.backSrc;
  const count = Number(raw.drawCount);
  data.drawCount = Number.isFinite(count) ? Math.min(5, Math.max(1, Math.floor(count))) : 3;
  if (Array.isArray(raw.handIds)) {
    data.handIds = raw.handIds.filter((id) => HUB_CATALOG.byId(id)).slice(0, 5);
  }
  const cursor = Number(raw.drawCursor);
  data.drawCursor = Number.isFinite(cursor) && cursor >= 0 ? Math.floor(cursor) : 0;
  if (typeof raw.dropCardId === 'string' && HUB_CATALOG.byId(raw.dropCardId)) {
    data.dropCardId = raw.dropCardId;
  }
  if (Array.isArray(raw.loose)) {
    data.loose = raw.loose
      .filter((entry) => entry && typeof entry.id === 'string' && HUB_CATALOG.byId(entry.id))
      .slice(0, 6)
      .map((entry) => ({
        id: entry.id,
        x: Math.min(0.92, Math.max(0.02, Number(entry.x) || 0.5)),
        y: Math.min(0.82, Math.max(0.05, Number(entry.y) || 0.5))
      }));
  }
  return data;
}

function homeBackOptions() {
  const options = [
    { value: 'assets/data/cards/database/_shared/thumbs/BACK_CARDGRAM.webp', label: t('home_back_shared') }
  ];
  HUB_CATALOG.collections.forEach((collection) => {
    const back = collection.thumbBack || (collection.cards[0] && collection.cards[0].thumbBack);
    if (back && !options.some((option) => option.value === back)) {
      options.push({ value: back, label: collection.name });
    }
  });
  return options;
}

function homeSourceOptions() {  const options = [{ value: 'all', label: t('home_source_all') }];
  HUB_CATALOG.collections.forEach((collection) => {
    options.push({ value: `set:${collection.id}`, label: collection.name });
  });
  if (Array.isArray(hubData.decks)) {
    hubData.decks.forEach((deck) => {
      options.push({ value: `deck:${deck.id}`, label: `${deck.emoji || '🃏'} ${deck.name}` });
    });
  }
  return options;
}

function homeSourceCards(source) {
  if (source.startsWith('set:')) {
    const collection = HUB_CATALOG.collections.find((entry) => entry.id === source.slice(4));
    return collection ? collection.cards.slice() : [];
  }
  if (source.startsWith('deck:')) {
    const deck = hubData.decks.find((entry) => entry.id === source.slice(5));
    if (deck) {
      const ids = Array.from(new Set([...(deck.cardIds || []), ...((deck.side && deck.side.cardIds) || [])]));
      const cards = ids.map((id) => HUB_CATALOG.byId(id)).filter(Boolean);
      if (cards.length) return cards;
    }
  }
  const owned = [];
  HUB_CATALOG.collections.forEach((collection) => {
    ownedIn(collection.id).forEach((id) => {
      if (!owned.includes(id)) owned.push(id);
    });
  });
  const cards = owned.map((id) => HUB_CATALOG.byId(id)).filter(Boolean);
  return cards.length ? cards : HUB_CATALOG.cards.slice();
}

function homeHandCards() {
  return hubHome.handIds.map((id) => HUB_CATALOG.byId(id)).filter(Boolean);
}

function saveHome() {
  storage.write(HUB_STORAGE.home, hubHome);
}

function drawHomeHand(options = {}) {
  const cards = homeSourceCards(hubHome.drawSource);
  if (!cards.length) return;
  const count = Math.min(hubHome.drawCount, cards.length);
  const hand = [];
  for (let index = 0; index < count; index += 1) {
    hand.push(cards[(hubHome.drawCursor + index) % cards.length].id);
  }
  hubHome.drawCursor = (hubHome.drawCursor + count) % cards.length;
  hubHome.handIds = hand;
  saveHome();
  renderFeaturedStack();
  renderHomeTable();
  if (!options.silent) {
    if (window.Sound) window.Sound.play('flip');
    toast(t('home_draw_toast', { count }), { type: 'info' });
  }
}

function homeDropCard() {
  if (!hubHome.dropCardId) return null;
  return HUB_CATALOG.byId(hubHome.dropCardId);
}

function drawHomeDeckCard() {
  const cards = homeSourceCards(hubHome.deckSource);
  if (!cards.length) {
    toast(t('home_deck_empty'), { type: 'warning' });
    return;
  }
  let card = cards[Math.floor(Math.random() * cards.length)];
  if (cards.length > 1 && hubHome.dropCardId === card.id) {
    card = cards.find((entry) => entry.id !== hubHome.dropCardId) || card;
  }
  hubHome.dropCardId = card.id;
  saveHome();
  renderHomeTable();
  if (window.Sound) window.Sound.play('flip');
}

function addHomeLooseCard() {
  const card = homeDropCard();
  if (!card) return;
  if (hubHome.loose.length >= 6) {
    toast(t('home_loose_full'), { type: 'warning' });
    return;
  }
  if (hubHome.loose.some((entry) => entry.id === card.id)) {
    toast(t('home_loose_duplicate'), { type: 'info' });
  }
  hubHome.loose.push({
    id: card.id,
    x: Math.min(0.9, 0.58 + Math.random() * 0.18),
    y: Math.min(0.78, 0.35 + Math.random() * 0.3)
  });
  hubHome.dropCardId = null;
  saveHome();
  renderHomeTable();
  if (window.Sound) window.Sound.play('success');
}

function removeHomeLooseCard(index) {
  hubHome.loose.splice(index, 1);
  saveHome();
  renderHomeTable();
}

function makeHomeLooseCard(entry, index) {
  const card = HUB_CATALOG.byId(entry.id);
  if (!card) return null;
  const button = makeNode('div', 'home-loose-card');
  button.tabIndex = 0;
  button.setAttribute('role', 'button');
  button.style.left = `${entry.x * 100}%`;
  button.style.top = `${entry.y * 100}%`;
  button.dataset.looseIndex = String(index);
  button.setAttribute('aria-label', card.name);
  button.appendChild(makeHubImage(thumbOf(card), card.name));

  const remove = makeNode('button', 'home-loose-remove');
  remove.type = 'button';
  remove.dataset.looseRemove = String(index);
  remove.setAttribute('aria-label', t('home_loose_remove'));
  remove.appendChild(hubIcon('close'));
  button.appendChild(remove);

  let startX = 0;
  let startY = 0;
  let originX = entry.x;
  let originY = entry.y;
  let moved = false;
  let dragging = false;

  button.addEventListener('pointerdown', (event) => {
    if (event.target.closest('[data-loose-remove]')) return;
    event.preventDefault();
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originX = entry.x;
    originY = entry.y;
    button.classList.add('is-dragging');
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const panel = document.querySelector('.hub-home-panel');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const dx = (event.clientX - startX) / rect.width;
    const dy = (event.clientY - startY) / rect.height;
    if (Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4) moved = true;
    entry.x = Math.min(0.94, Math.max(0, originX + dx));
    entry.y = Math.min(0.9, Math.max(0, originY + dy));
    button.style.left = `${entry.x * 100}%`;
    button.style.top = `${entry.y * 100}%`;
  });

  const finish = () => {
    if (!dragging) return;
    dragging = false;
    button.classList.remove('is-dragging');
    saveHome();
  };
  button.addEventListener('pointerup', finish);
  button.addEventListener('pointercancel', finish);
  button.addEventListener('click', (event) => {
    if (event.target.closest('[data-loose-remove]')) {
      event.preventDefault();
      removeHomeLooseCard(index);
      return;
    }
    if (!moved) openCardViewer(card.id, button);
  });
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openCardViewer(card.id, button);
    }
  });
  return button;
}

function renderHomeTable() {
  if (!hub.ready) return;
  const options = homeSourceOptions();

  const fillSelect = (id, value) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.replaceChildren(
      ...options.map((option) => {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        return node;
      })
    );
    select.value = options.some((option) => option.value === value) ? value : 'all';
  };
  fillSelect('home-draw-source', hubHome.drawSource);
  fillSelect('home-deck-source', hubHome.deckSource);
  const countSelect = document.getElementById('home-draw-count');
  if (countSelect) countSelect.value = String(hubHome.drawCount);

  const backSelect = document.getElementById('home-back-source');
  if (backSelect) {
    backSelect.replaceChildren(
      ...homeBackOptions().map((option) => {
        const node = document.createElement('option');
        node.value = option.value;
        node.textContent = option.label;
        return node;
      })
    );
    backSelect.value = hubHome.backSrc;
  }

  const drawLabel = document.getElementById('home-draw-label');
  if (drawLabel) drawLabel.textContent = t('home_draw_hint_count', { count: hubHome.drawCount });

  const deckCards = homeSourceCards(hubHome.deckSource);
  if (hub.els.homeDeckCount) hub.els.homeDeckCount.textContent = String(deckCards.length);
  if (hub.els.homeDeckSourceLabel) {
    const option = options.find((entry) => entry.value === hubHome.deckSource);
    hub.els.homeDeckSourceLabel.textContent = option ? option.label : t('home_source_all');
  }
  if (hub.els.homeDeckFace) {
    const sample = deckCards[0];
    hub.els.homeDeckFace.replaceChildren(
      makeHubImage(
        hubHome.backSrc || 'assets/data/cards/database/_shared/thumbs/BACK_CARDGRAM.webp',
        ''
      )
    );
  }

  const drop = hub.els.homeDropArea;
  if (drop) {
    const card = homeDropCard();
    drop.classList.toggle('is-filled', Boolean(card));
    drop.replaceChildren();
    if (card) {
      drop.appendChild(makeHubImage(thumbOf(card), card.name));
    } else {
      drop.appendChild(makeNode('span', 'home-drop-empty', t('home_drop_empty')));
    }
  }

  const layer = hub.els.homeLooseLayer;
  if (layer) {
    layer.replaceChildren(
      ...hubHome.loose
        .map((entry, index) => makeHomeLooseCard(entry, index))
        .filter(Boolean)
    );
  }
  syncHomeCardScale();
}

/* Iguala el tamaño de las cartas secundarias (mano y cartas sueltas) al del
   deck / drop area del escritorio. */
function syncHomeCardScale() {
  const panel = document.querySelector('.hub-home-panel');
  if (!panel) return;
  const drop = panel.querySelector('.home-drop-area');
  if (!drop) return;
  const width = drop.getBoundingClientRect().width;
  if (width <= 0) return;
  panel.style.setProperty('--home-mini-w', `${Math.round(width)}px`);

  /* Reparte la mano izquierda: misma anchura de carta que el deck, con
     separación calculada para que el abanico no se salga del panel. */
  const stack = panel.querySelector('.hub-player-stack');
  const wrap = panel.querySelector('.hub-stack-wrap');
  if (stack && wrap) {
    const count = stack.children.length;
    const available = wrap.clientWidth || panel.clientWidth;
    const step = count > 1
      ? Math.max(24, Math.min(width * 0.82, (available - width) / (count - 1)))
      : 0;
    panel.style.setProperty('--hand-step', `${Math.round(step)}px`);
  }
}

function initHomeTable() {
  hubHome = sanitizeHome(storage.read(HUB_STORAGE.home, null));
  renderHomeTable();
  window.addEventListener('resize', () => {
    window.clearTimeout(initHomeTable.scaleTimer);
    initHomeTable.scaleTimer = window.setTimeout(syncHomeCardScale, 120);
  }, { passive: true });
}

function makeBackStackCard() {
  const card = makeNode('button', 'hub-stack-card is-back');
  card.type = 'button';
  card.dataset.openHand = '1';
  card.setAttribute('aria-label', t('hub_favorites_edit'));
  card.appendChild(
    makeHubImage(
      hubHome.backSrc || 'assets/data/cards/database/_shared/thumbs/BACK_CARDGRAM.webp',
      t('hub_favorites_edit')
    )
  );
  card.addEventListener('click', openHandDialog);
  return card;
}

function renderFeaturedStack() {
  const stack = hub.els.playerStack;
  if (!stack) return;

  const cards = homeHandCards().slice(0, 3);
  const signature = `${currentLang}|${cards.map((card) => card.id).join('|')}|${cards.length ? '1' : 'back'}`;
  stack.dataset.count = String(cards.length || 1);
  if (hub.featuredSignature === signature && stack.childElementCount) {
    renderHandDeck(cards);
    return;
  }
  hub.featuredSignature = signature;
  stack.replaceChildren(...(cards.length ? cards.map((card) => makeStackCard(card)) : [makeBackStackCard()]));
  renderHandDeck(cards);
}

/* --------------------------------------------------------------------------
   Selector de la mano (hasta 6 cartas)
   -------------------------------------------------------------------------- */
function makeHandOption(card) {
  const active = hub.handDraft.includes(card.id);
  const order = hub.handDraft.indexOf(card.id) + 1;
  const button = makeNode('button', 'hand-option');
  button.type = 'button';
  button.dataset.handPick = card.id;
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('is-active', active);
  button.disabled = !active && hub.handDraft.length >= 3;
  button.appendChild(makeExplorerArt(card));
  button.appendChild(makeNode('span', 'hand-option-name', card.name));
  if (active) button.appendChild(makeNode('span', 'hand-order', String(order)));
  return button;
}

function updateHandCount() {
  if (hub.els.handCount) hub.els.handCount.textContent = `${hub.handDraft.length}/3`;
  if (hub.els.handSave) hub.els.handSave.disabled = false;
  if (hub.els.handUndo) hub.els.handUndo.disabled = !hub.handDraft.length;
}

function renderHandPicker() {
  const picker = hub.els.handPicker;
  if (!picker) return;
  picker.replaceChildren();

  if (!hub.handSetId) {
    picker.className = 'hand-set-grid';
    HUB_CATALOG.collections.forEach((collection) => {
      const button = makeNode('button', 'hand-set-card');
      button.type = 'button';
      button.dataset.handSet = collection.id;
      button.appendChild(
        makeHubImage(collection.thumbCover || collection.cover || collection.cards[0]?.thumbFront || '', collection.name)
      );
      button.appendChild(makeNode('strong', null, collection.name));
      picker.appendChild(button);
    });
  } else {
    const collection = HUB_CATALOG.collections.find((entry) => entry.id === hub.handSetId);
    picker.className = 'hand-picker';
    if (collection) {
      const back = makeNode('button', 'hand-back-btn');
      back.type = 'button';
      back.dataset.handBack = '1';
      back.textContent = `← ${collection.name}`;
      picker.appendChild(back);
      collection.cards.forEach((card) => picker.appendChild(makeHandOption(card)));
    }
  }
  updateHandCount();
}

function openHandDialog() {
  hub.handSetId = null;
  hub.handDraft = homeHandCards().slice(0, 3).map((card) => card.id);
  renderHandPicker();
  if (hub.els.handDialog && !hub.els.handDialog.open) {
    hub.els.handDialog.showModal();
  }
}

function toggleHandPick(cardId) {
  if (!HUB_CATALOG.byId(cardId)) return;
  const index = hub.handDraft.indexOf(cardId);
  if (index >= 0) hub.handDraft.splice(index, 1);
  else if (hub.handDraft.length < 3) hub.handDraft.push(cardId);
  renderHandPicker();
}

function saveHand() {
  hubProfile.featuredIds = hub.handDraft.slice(0, 3);
  hubProfile.favoriteTouched = true;
  if (hubProfile.featuredIds.length) {
    hubProfile.favoriteCardId = hubProfile.featuredIds[0];
  }
  hubHome.handIds = hub.handDraft.slice(0, 3);
  persistHubProfile();
  saveHome();
  renderFavoriteCard();
  renderFeaturedStack();
  renderHomeTable();
  if (hub.els.handDialog && hub.els.handDialog.open) hub.els.handDialog.close();
}

function clearHand() {
  hub.handDraft = [];
  updateHandCount();
  renderHandPicker();
}

function undoHand() {
  hub.handDraft.pop();
  renderHandPicker();
}

function makeExplorerSpotlight(card, index, total) {
  const selected = hubProfile.favoriteCardId === card.id;

  const feature = makeNode('button', 'hub-explorer-feature');
  feature.type = 'button';
  feature.dataset.favCard = card.id;
  feature.setAttribute('aria-pressed', String(selected));
  feature.setAttribute('aria-label', explorerCardLabel(card, selected));

  const art = makeExplorerArt(card, 'hub-explorer-spotlight-art', true);
  art.appendChild(
    makeNode(
      'span',
      'hub-explorer-counter',
      `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
    )
  );
  feature.appendChild(art);

  const copy = makeNode('span', 'hub-explorer-feature-copy');
  copy.appendChild(makeNode('strong', 'hub-explorer-feature-name', card.name));
  copy.appendChild(
    makeNode(
      'span',
      'hub-explorer-feature-meta',
      [card.set, card.rarity].filter(Boolean).join(' · ')
    )
  );
  feature.appendChild(copy);

  const openButton = makeNode('button', 'hub-explorer-open');
  openButton.type = 'button';
  openButton.dataset.openCard = card.id;
  openButton.setAttribute('aria-label', t('hub_explorer_open'));
  openButton.title = t('hub_explorer_open');
  openButton.appendChild(hubIcon('expand'));

  return [feature, openButton];
}

function makeExplorerPick(card) {
  const selected = hubProfile.favoriteCardId === card.id;

  const button = makeNode('button', 'hub-explorer-pick');
  button.type = 'button';
  button.dataset.favCard = card.id;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', explorerCardLabel(card, selected));
  button.appendChild(makeExplorerArt(card));
  button.appendChild(makeNode('span', 'hub-explorer-pick-name', card.name));
  return button;
}

const EXPLORER_MODES = ['album', 'gacha'];

function shuffleList(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderExplorerModes() {
  const modes = hub.els.explorerModes;
  if (!modes) return;

  Array.from(modes.querySelectorAll('[data-explorer-mode]')).forEach((button) => {
    const active = button.dataset.explorerMode === hub.explorerMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (hub.els.explorerPanel) {
    hub.els.explorerPanel.dataset.explorerViewMode = hub.explorerMode;
  }
}

function renderExplorerViews() {
  const views = {
    album: hub.els.explorerAlbum,
    gacha: hub.els.explorerGacha
  };

  Object.keys(views).forEach((mode) => {
    if (views[mode]) views[mode].hidden = mode !== hub.explorerMode;
  });
}

/** Cambia de vista sin reconstruir las tres rejillas (evita parpadeos). */
function setExplorerMode(mode, options = {}) {
  if (!EXPLORER_MODES.includes(mode)) return;
  if (mode === hub.explorerMode && !options.force) return;
  hub.explorerMode = mode;
  renderExplorerModes();
  renderExplorerViews();
  if (mode === 'gacha' && options.redrawGacha) refreshGacha();
}

function makeExplorerAlbumCard(card) {
  const selected = hubProfile.favoriteCardId === card.id;

  const button = makeNode('button', 'hub-explorer-album-card');
  button.type = 'button';
  button.dataset.favCard = card.id;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', explorerCardLabel(card, selected));
  button.appendChild(makeExplorerArt(card));
  button.appendChild(makeNode('span', 'hub-explorer-album-name', card.name));
  return button;
}

function makeExplorerHandCard(card) {
  const selected = hubProfile.favoriteCardId === card.id;

  const button = makeNode('button', 'hub-explorer-hand-card');
  button.type = 'button';
  button.dataset.favCard = card.id;
  button.title = card.name;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', explorerCardLabel(card, selected));
  button.appendChild(makeExplorerArt(card));
  return button;
}

function renderExplorerAlbum(cards) {
  const album = hub.els.explorerAlbumGrid;
  if (!album) return;

  if (!cards.length) {
    album.replaceChildren(makeNode('p', 'hub-explorer-empty', t('hub_explorer_empty')));
    return;
  }

  const openGroups = new Set(
    Array.from(album.querySelectorAll('details[data-album-group][open]')).map(
      (node) => node.dataset.albumGroup
    )
  );
  const groups = HUB_CATALOG.collections
    .map((collection) => ({
      collection,
      cards: cards.filter((card) => card.collectionId === collection.id)
    }))
    .filter((group) => group.cards.length);

  album.replaceChildren(
    ...groups.map((group) => makeExplorerAlbumGroup(group, openGroups.has(group.collection.id)))
  );
}

function makeExplorerAlbumGroup(group, open) {
  const { collection } = group;
  const owned = ownedIn(collection.id).length;
  const details = document.createElement('details');
  details.className = 'hub-album-group';
  details.dataset.albumGroup = collection.id;
  if (open) details.open = true;

  const summary = document.createElement('summary');
  summary.className = 'hub-album-summary';
  summary.setAttribute('aria-label', collection.name);

  const art = makeNode('span', 'hub-album-art');
  art.appendChild(makeHubImage(microUrl(collection.thumbCover || collection.cover), ''));

  const copy = makeNode('span', 'hub-album-copy');
  copy.appendChild(makeNode('strong', null, collection.name));
  const progress = t('collections_set_size', {
    count: collection.cards.length,
    total: collection.setSize || collection.cards.length
  });
  copy.appendChild(
    makeNode('small', null, `${progress} · ${owned}/${collection.cards.length}`)
  );

  const chevron = makeNode('span', 'hub-album-chevron');
  chevron.appendChild(hubIcon('chevron'));

  summary.append(art, copy, chevron);
  details.appendChild(summary);

  const grid = makeNode('div', 'hub-album-grid');
  grid.append(...group.cards.map((card) => makeExplorerAlbumCard(card)));
  details.appendChild(grid);
  return details;
}

function ensureGachaHand(cards, force) {
  const available = cards.map((card) => card.id);
  const valid = hub.gachaIds.filter((id) => available.includes(id));
  const needed = Math.min(3, available.length);

  if (force || valid.length < needed || valid.length !== hub.gachaIds.length) {
    hub.gachaIds = shuffleList(available).slice(0, needed);
  } else {
    hub.gachaIds = valid;
  }
}

function renderExplorerHand() {
  const hand = hub.els.explorerHand;
  if (!hand) return;

  const cards = hub.gachaIds.map((id) => HUB_CATALOG.byId(id)).filter(Boolean);
  if (!cards.length) {
    hand.replaceChildren(
      makeNode('p', 'hub-explorer-empty', t('hub_explorer_empty'))
    );
    return;
  }

  hand.replaceChildren(...cards.map((card) => makeExplorerHandCard(card)));
}

function refreshGacha() {
  ensureGachaHand(explorerCards(), true);
  renderExplorerHand();
  hub.explorerSignature = explorerSignature();
}

function explorerSignature(cards) {
  return [
    currentLang,
    hub.explorerFilter,
    (cards || explorerCards()).map((card) => card.id).join(','),
    hub.gachaIds.join(',')
  ].join('~');
}

function startExplorerTimers() {
  if (hub.explorerTimers) return;
  hub.explorerTimers = true;

  window.setInterval(() => {
    if (hub.explorerMode !== 'gacha' || hub.panel !== 'home') return;
    if (document.body.dataset.view !== 'hub') return;
    refreshGacha();
  }, 5000);
}

function updateExplorerArrows() {
  const total = explorerCards().length;
  const blocked = total <= 1;
  if (hub.els.explorerPrev) {
    hub.els.explorerPrev.disabled = blocked || hub.explorerIndex <= 0;
  }
  if (hub.els.explorerNext) {
    hub.els.explorerNext.disabled = blocked || hub.explorerIndex >= total - 1;
  }
}

function renderExplorerCarousel() {
  const spotlight = hub.els.explorerSpotlight;
  if (!spotlight) return;

  const cards = explorerCards();
  const dots = hub.els.explorerDots;

  if (!cards.length) {
    hub.explorerIndex = 0;
    spotlight.replaceChildren(makeNode('p', 'hub-explorer-empty', t('hub_explorer_empty')));
    if (dots) dots.replaceChildren();
    updateExplorerArrows();
    return;
  }

  hub.explorerIndex = Math.min(Math.max(hub.explorerIndex, 0), cards.length - 1);
  const active = cards[hub.explorerIndex];

  spotlight.replaceChildren(...makeExplorerSpotlight(active, hub.explorerIndex, cards.length));

  if (dots) {
    dots.replaceChildren(
      ...cards.map((card, index) => {
        const dot = makeNode('button', 'hub-explorer-dot');
        dot.type = 'button';
        dot.dataset.explorerDot = String(index);
        dot.setAttribute('aria-label', card.name);
        dot.setAttribute('aria-current', String(index === hub.explorerIndex));
        return dot;
      })
    );
  }

  updateExplorerArrows();
}

function renderCardExplorer(options = {}) {
  const album = hub.els.explorerAlbumGrid;
  if (!album) return;

  const cards = explorerCards();
  ensureGachaHand(cards, Boolean(options.redrawGacha));

  const signature = explorerSignature(cards);

  if (hub.explorerSignature === signature && !options.force) {
    renderExplorerModes();
    renderExplorerViews();
    syncFavoriteMarks();
    return;
  }
  hub.explorerSignature = signature;

  renderExplorerModes();
  renderExplorerAlbum(cards);
  renderExplorerHand();
  renderExplorerViews();
  startExplorerTimers();
}

function setExplorerFilter(filterId) {
  if (filterId === hub.explorerFilter) return;
  hub.explorerShowcase = false;
  hub.explorerFilter = filterId;
  hub.explorerIndex = 0;
  renderCardExplorer({ redrawGacha: hub.explorerMode === 'gacha' });
}

function stepExplorer(direction) {
  const total = explorerCards().length;
  if (!total) return;

  const next = Math.min(Math.max(hub.explorerIndex + direction, 0), total - 1);
  if (next === hub.explorerIndex) return;

  hub.explorerShowcase = false;
  hub.explorerIndex = next;
  renderExplorerCarousel();
}

/* --------------------------------------------------------------------------
   Biblioteca
   -------------------------------------------------------------------------- */
function createMediaCard(options) {
  const {
    kind,
    id,
    name,
    subtitle,
    image,
    badge,
    isFavorite,
    canDelete,
    preview
  } = options;

  const article = makeNode('article', 'media-card');

  const thumb = makeNode('div', 'media-card-thumb');
  thumb.appendChild(makeHubImage(image, name));

  const view = makeNode('button', 'media-card-view');
  view.type = 'button';
  view.setAttribute('aria-label', `${t('library_view')}: ${name}`);
  if (kind === 'catalog') view.dataset.viewCard = id;
  else if (kind === 'preset') view.dataset.viewPreset = id;
  thumb.appendChild(view);

  if (kind === 'catalog') {
    const fav = makeNode('button', `media-fav${isFavorite ? ' active' : ''}`);
    fav.type = 'button';
    fav.dataset.favCard = id;
    fav.setAttribute('aria-pressed', String(Boolean(isFavorite)));
    fav.setAttribute('aria-label', t('library_favorite_title'));
    fav.title = t('library_favorite_title');
    fav.appendChild(hubIcon('star'));
    thumb.appendChild(fav);
  }

  if (badge) thumb.appendChild(makeNode('span', 'media-badge', badge));
  article.appendChild(thumb);

  const body = makeNode('div', 'media-card-body');
  body.appendChild(makeNode('h3', null, name));
  body.appendChild(makeNode('p', null, subtitle));
  article.appendChild(body);

  const actions = makeNode('div', 'media-card-actions');
  const viewButton = makeHubButton('btn btn-primary btn-sm', t('library_view'));
  if (kind === 'catalog') viewButton.dataset.viewCard = id;
  else if (kind === 'preset') viewButton.dataset.viewPreset = id;
  if (preview) viewButton.dataset.openCard = id;
  actions.appendChild(viewButton);

  const open = makeHubButton('btn btn-ghost btn-sm', t('library_edit'));
  if (kind === 'catalog') open.dataset.openCard = id;
  else open.dataset.openPreset = id;
  if (preview) open.dataset.openCard = id;
  actions.appendChild(open);

  if (canDelete) {
    const remove = makeHubButton('btn btn-ghost btn-sm btn-icon-only');
    remove.dataset.deletePreset = id;
    remove.setAttribute('aria-label', t('library_delete'));
    remove.title = t('library_delete');
    remove.appendChild(hubIcon('trash'));
    actions.appendChild(remove);
  }

  article.appendChild(actions);
  return article;
}

function renderLibrary() {
  if (!hub.ready || !hub.els.libraryGrid) return;

  const filter = hub.libraryTab;
  const showSaved = filter === 'all' || filter === 'saved';
  const showCatalog = filter === 'all' || filter === 'catalog';
  const nodes = [];
  let cardCount = 0;

  if (showSaved && Array.isArray(presets)) {
    presets.forEach((preset) => {
      cardCount += 1;
      nodes.push(
        createMediaCard({
          kind: 'preset',
          id: preset.id,
          name: preset.name,
          subtitle: `Preset · ${formatHubDate(preset.createdAt || Date.now())}`,
          image: previewThumb(preset.front),
          badge: t('library_saved_badge'),
          canDelete: true
        })
      );
    });
  }

  if (showCatalog) {
    HUB_CATALOG.collections.forEach((collection) => {
      if (!collection.cards.length) return;
      const heading = makeNode('div', 'library-group-head');
      heading.appendChild(makeNode('strong', null, collection.name));
      heading.appendChild(
        makeNode('span', null, countLabel('hub_collection_cards', collection.cards.length))
      );
      nodes.push(heading);

      collection.cards.forEach((card) => {
        cardCount += 1;
        nodes.push(
          createMediaCard({
            kind: 'catalog',
            id: card.id,
            name: card.name,
            subtitle: `${collection.name} · ${card.set}`,
            image: thumbOf(card),
            badge: collection.shortName,
            isFavorite: hubProfile.favoriteCardId === card.id
          })
        );
      });
    });
  }

  hub.els.libraryGrid.replaceChildren(...nodes);

  if (hub.els.libraryCount) {
    hub.els.libraryCount.textContent = countLabel('library_count', cardCount);
  }

  const isEmpty = cardCount === 0;
  if (hub.els.libraryEmpty) hub.els.libraryEmpty.hidden = !isEmpty;
  if (isEmpty) {
    const isSaved = filter === 'saved';
    const isCatalog = filter === 'catalog';
    if (hub.els.libraryEmptyTitle) {
      hub.els.libraryEmptyTitle.textContent = isSaved
        ? t('library_empty_saved')
        : isCatalog
          ? t('library_empty_catalog')
          : t('library_empty_all');
    }
    if (hub.els.libraryEmptyDesc) {
      hub.els.libraryEmptyDesc.textContent = isSaved
        ? t('library_empty_saved_desc')
        : isCatalog
          ? t('library_empty_catalog_desc')
          : t('library_empty_all_desc');
    }
    if (hub.els.libraryEmptyAction) {
      hub.els.libraryEmptyAction.hidden = isCatalog;
    }
  }
}

function setLibraryTab(tab, options = {}) {
  const next = ['all', 'saved', 'catalog'].includes(tab) ? tab : 'all';
  hub.libraryTab = next;

  if (hub.els.libraryTabs) {
    Array.from(hub.els.libraryTabs.querySelectorAll('[data-library-tab]')).forEach((button) => {
      const active = button.dataset.libraryTab === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  if (options.render !== false) renderLibrary();
}

/* --------------------------------------------------------------------------
   Colecciones
   -------------------------------------------------------------------------- */
function makeCollectionCard(collection) {
  const card = makeHubButton('collection-card', null, { collectionId: collection.id });

  const stack = makeNode('span', 'collection-stack');
  const sources = [
    microUrl(collection.thumbCover || collection.cover),
    ...collection.cards.map((entry) => microOf(entry))
  ]
    .filter(Boolean)
    .filter((src, index, list) => list.indexOf(src) === index)
    .slice(0, 3);
  sources.forEach((src) => stack.appendChild(makeHubImage(src, '')));
  card.appendChild(stack);

  const body = makeNode('span', 'collection-body');
  body.appendChild(makeNode('span', 'collection-eyebrow', collection.shortName || collection.name));
  body.appendChild(makeNode('span', 'collection-title', collection.name));
  body.appendChild(
    makeNode('span', 'collection-tagline', localized(collection.tagline) || localized(collection.description))
  );
  card.appendChild(body);

  const meta = makeNode('span', 'collection-meta');
  meta.appendChild(
    makeNode(
      'span',
      null,
      collection.setSize
        ? t('collections_set_size', { count: collection.cards.length, total: collection.setSize })
        : countLabel('hub_collection_cards', collection.cards.length)
    )
  );
  if (collection.setSize) {
    meta.appendChild(
      makeNode('span', 'collection-progress', t('collections_owned', { count: ownedIn(collection.id).length }))
    );
  }
  if (!collection.complete) {
    meta.appendChild(
      makeNode('span', 'collection-progress collection-progress-warn', t('collections_set_missing', { count: collection.missing }))
    );
  }
  if (!isCollectionReviewed(collection.id)) {
    meta.appendChild(makeNode('span', 'badge-new', t('hub_new')));
  }
  body.appendChild(meta);

  return card;
}

function renderCollectionRail() {
  if (!hub.els.collectionRail) return;
  if (!HUB_CATALOG.collections.length) {
    hub.els.collectionRail.replaceChildren(
      makeNode('p', 'hub-detail-hint', t('library_empty_catalog_desc'))
    );
    return;
  }
  const signature = `${currentLang}|${HUB_CATALOG.collections
    .map(
      (collection) =>
        `${collection.id}:${isCollectionReviewed(collection.id) ? 1 : 0}:${ownedIn(collection.id).length}`
    )
    .join('|')}`;
  if (hub.collectionRailSignature === signature && hub.els.collectionRail.childElementCount) {
    return;
  }
  hub.collectionRailSignature = signature;
  hub.els.collectionRail.replaceChildren(
    ...HUB_CATALOG.collections.map((collection) => makeCollectionCard(collection))
  );
}

function deckCoverSource(deck) {
  if (deck && deck.coverImage) return deck.coverImage;
  const card = deck && HUB_CATALOG.byId(deck.coverId);
  return card ? thumbOf(card) : (fallbackCard() ? thumbOf(fallbackCard()) : '');
}

function makeDeckCoverImage(deck, alt = '') {
  const image = makeNode('img');
  image.src = deckCoverSource(deck);
  image.alt = alt;
  image.loading = 'lazy';
  return image;
}

function renderCollectionsOverview() {
  if (hub.els.ownedGrid) {
    // Mostrar todos los sets disponibles en el catálogo en formato 3 por pantalla
    const allSets = HUB_CATALOG.collections.filter((col) => col.id !== 'user-created');

    const deckBoxCards = allSets.map((collection) => {
      const owned = ownedIn(collection.id);
      const count = owned.length;
      const total = collection.setSize || collection.cards.length;
      const percent = total ? Math.round((count / total) * 100) : 0;
      const button = makeHubButton('deck-box-card', null, { collectionId: collection.id });
      const cover = makeNode('span', 'deck-box-cover');
      const boxImg = makeNode('img', 'deck-box-img');
      boxImg.src = inventoryBoxFor(collection);
      boxImg.alt = collection.name;
      boxImg.loading = 'lazy';
      cover.appendChild(boxImg);
      button.appendChild(cover);

      const body = makeNode('span', 'deck-box-body');
      body.appendChild(makeNode('span', 'deck-box-title', collection.name));
      body.appendChild(makeNode('span', 'deck-box-desc', `${percent}% completado`));
      button.appendChild(body);
      return button;
    });

    hub.els.ownedGrid.replaceChildren(...deckBoxCards);
    if (hub.els.ownedEmpty) hub.els.ownedEmpty.hidden = deckBoxCards.length > 0;
  }

  if (hub.els.createdGrid) {
    const created = getUserPresets();
    const count = created.length;
    const boxSrc = userBoxFor(0);
    const button = makeHubButton('deck-box-card is-user-box', null, { collectionId: 'user-created' });
    const cover = makeNode('span', 'deck-box-cover');
    const boxImg = makeNode('img', 'deck-box-img');
    boxImg.src = boxSrc;
    boxImg.alt = t('collections_tab_created') || 'Cartas creadas';
    boxImg.loading = 'lazy';
    cover.appendChild(boxImg);
    button.appendChild(cover);

    const body = makeNode('span', 'deck-box-body');
    body.appendChild(makeNode('span', 'deck-box-title', t('collections_tab_created') || 'Cartas creadas'));
    body.appendChild(makeNode('span', 'deck-box-desc', count === 1 ? '1 carta creada' : `${count} cartas creadas`));
    button.appendChild(body);

    hub.els.createdGrid.replaceChildren(button);
    if (hub.els.createdEmpty) hub.els.createdEmpty.hidden = true;
  }

  if (hub.els.decksGrid) {
    const cards = hubData.decks.map((deck) => {
      const button = makeHubButton('deck-card', null, { deckId: deck.id });
      const cover = makeNode('span', 'deck-cover');
      const coverCard = HUB_CATALOG.byId(deck.coverId) || fallbackCard();
      if (coverCard) cover.appendChild(makeDeckCoverImage(deck, deck.name));
      button.appendChild(cover);

      const body = makeNode('span', 'deck-body');
      body.appendChild(makeNode('span', 'deck-title', `${deck.emoji || '🃏'} ${deck.name}`));
      body.appendChild(
        makeNode(
          'span',
          'deck-desc',
          `${countLabel('collections_deck_cards', deck.cardIds.length)} · ${countLabel('deck_side_cards', deck.side ? deck.side.cardIds.length : 0)}`
        )
      );
      const meta = makeNode('span', 'deck-meta');
      meta.appendChild(makeNode('span', null, t('deck_copy_limit_short', { count: deck.copyLimit || 3 })));
      body.appendChild(meta);
      button.appendChild(body);
      return button;
    });

    hub.els.decksGrid.replaceChildren(...cards);
  }

  const hasDecks = Array.isArray(hubData.decks) && hubData.decks.length > 0;
  if (hub.els.decksEmpty) hub.els.decksEmpty.hidden = hasDecks;
  const newDeckCenter = document.getElementById('collections-new-deck-center');
  if (newDeckCenter) newDeckCenter.hidden = !hasDecks;
}

function createMissingCard(collection) {
  const article = makeNode('article', 'media-card media-card-missing');
  const thumb = makeNode('div', 'media-card-thumb media-missing-thumb');
  thumb.appendChild(hubIcon('sparkles'));
  article.appendChild(thumb);

  const body = makeNode('div', 'media-card-body');
  body.appendChild(
    makeNode('h3', null, t('collections_missing_card_title', { count: collection.missing }))
  );
  body.appendChild(
    makeNode(
      'p',
      null,
      t('collections_missing_card_desc', {
        count: collection.cards.length,
        total: collection.setSize
      })
    )
  );
  article.appendChild(body);
  return article;
}

function renderCollections() {
  if (!hub.ready) return;

  const hasDetail = Boolean(hub.collectionId || hub.deckId);
  if (hub.els.collectionsOverview) hub.els.collectionsOverview.hidden = hasDetail;
  if (hub.els.collectionDetail) hub.els.collectionDetail.hidden = !hub.collectionId;
  if (hub.els.deckDetail) hub.els.deckDetail.hidden = !hub.deckId;
  if (hub.els.btnNewDeck) hub.els.btnNewDeck.hidden = hasDetail;

  if (hub.els.collectionsBack) {
    const route = hasDetail ? 'collections' : 'home';
    const labelKey = hasDetail ? 'collections_back' : 'hub_back_home';
    hub.els.collectionsBack.dataset.hubRoute = route;
    hub.els.collectionsBack.setAttribute('data-i18n-aria-label', labelKey);
    hub.els.collectionsBack.setAttribute('aria-label', t(labelKey));
    hub.els.collectionsBack.title = t(labelKey);
  }

  if (hub.deckId) {
    renderDeckDetail();
  } else if (hub.collectionId) {
    renderCollectionDetail();
  } else {
    renderCollectionsOverview();
  }
}

function markCollectionReviewed(id) {
  if (!id || isCollectionReviewed(id)) return;
  hubData.reviewedCollections.push(id);
  persistHubData();
  renderHubStats(false);
  renderCollectionRail();
}


function renderUserCreatedCardsDetail() {
  if (!hub.els.collectionDetailHead || !hub.els.collectionDetailGrid) return;
  hub.els.collectionDetailHead.replaceChildren();

  const currentBoxSrc = userBoxFor(0);

  const stack = makeNode('div', 'collection-stack');
  const boxImg = makeNode('img', 'deck-box-img');
  boxImg.src = currentBoxSrc;
  boxImg.alt = 'Cartas creadas';
  stack.appendChild(boxImg);
  hub.els.collectionDetailHead.appendChild(stack);

  const copy = makeNode('div', 'hub-detail-copy');
  copy.appendChild(makeNode('span', 'collection-eyebrow', t('hub_nav_library') || 'Inventario'));
  copy.appendChild(makeNode('h1', null, t('collections_tab_created') || 'Cartas creadas'));
  copy.appendChild(
    makeNode('p', null, 'Tus diseños y cartas personalizadas creadas en eCard Studio.')
  );

  const created = getUserPresets();
  const meta = makeNode('div', 'hub-detail-meta');
  meta.appendChild(
    makeNode('span', 'hub-chip', created.length === 1 ? '1 carta creada' : `${created.length} cartas creadas`)
  );
  copy.appendChild(meta);

  // Acciones dentro de Cartas Creadas
  const actionRow = makeNode('div', 'user-created-actions');

  const createBtn = makeNode('button', 'btn btn-primary btn-sm');
  createBtn.type = 'button';
  createBtn.dataset.openStudio = 'deck';
  createBtn.appendChild(hubIcon('plus'));
  createBtn.appendChild(makeNode('span', null, t('collections_create_card') || 'Crear carta'));
  actionRow.appendChild(createBtn);

  const uploadBtn = makeNode('button', 'btn btn-ghost btn-sm');
  uploadBtn.type = 'button';
  uploadBtn.id = 'upload-user-box-detail';
  uploadBtn.appendChild(hubIcon('upload'));
  uploadBtn.appendChild(makeNode('span', null, t('collections_upload_box') || 'Subir deck box'));
  uploadBtn.addEventListener('click', () => {
    const input = document.getElementById('deck-box-upload');
    if (input) input.click();
  });
  actionRow.appendChild(uploadBtn);

  copy.appendChild(actionRow);

  // Selector de Box Art (Presets oficiales + Custom subidos)
  const selectorBox = makeNode('div', 'user-box-selector');
  const selectorHead = makeNode('div', 'user-box-selector-head');
  selectorHead.appendChild(makeNode('span', 'user-box-selector-label', 'Diseño de Deck Box:'));
  selectorBox.appendChild(selectorHead);

  const optionsRow = makeNode('div', 'user-box-options');

  const allBoxes = [
    ...PRESET_DECK_BOXES.map((b) => ({ id: b.id, name: b.name, src: b.src })),
    ...hubDeckBoxes.map((src, idx) => ({ id: `custom-${idx}`, name: `Custom ${idx + 1}`, src }))
  ];

  allBoxes.forEach((item) => {
    const isActive = item.src === currentBoxSrc;
    const thumbBtn = makeNode('button', `user-box-thumb-btn${isActive ? ' is-active' : ''}`);
    thumbBtn.type = 'button';
    thumbBtn.title = item.name;
    thumbBtn.setAttribute('aria-label', `Elegir ${item.name}`);

    const thumbImg = makeNode('img', 'user-box-thumb-img');
    thumbImg.src = item.src;
    thumbImg.alt = item.name;
    thumbBtn.appendChild(thumbImg);

    if (isActive) {
      const badge = makeNode('span', 'user-box-active-badge');
      badge.textContent = '✓';
      thumbBtn.appendChild(badge);
    }

    thumbBtn.addEventListener('click', () => {
      hubData.selectedUserBox = item.src;
      persistHubData();
      renderUserCreatedCardsDetail();
      renderCollections();
      if (typeof toast === 'function') {
        toast('¡Box art del deck actualizado!', { type: 'success' });
      }
    });

    optionsRow.appendChild(thumbBtn);
  });

  selectorBox.appendChild(optionsRow);
  copy.appendChild(selectorBox);

  hub.els.collectionDetailHead.appendChild(copy);

  // Grid de cartas creadas
  if (created.length === 0) {
    const empty = makeNode('div', 'hub-empty-state');
    empty.style.textAlign = 'center';
    empty.style.padding = '32px 16px';
    empty.style.gridColumn = '1 / -1';
    empty.appendChild(makeNode('p', null, 'Aún no has creado cartas en eCard Studio.'));
    const btn = makeHubButton('btn btn-primary', 'Crear primera carta', { hubRoute: 'studio' });
    btn.appendChild(hubIcon('sparkles'));
    empty.appendChild(btn);
    hub.els.collectionDetailGrid.replaceChildren(empty);
    return;
  }

  hub.els.collectionDetailGrid.replaceChildren(
    ...created.map((preset) => {
      const card = createMediaCard({
        kind: 'preset',
        id: preset.id,
        name: preset.name,
        subtitle: 'Personalizada',
        image: preset.front || preset.back || 'assets/data/cards/database/_shared/thumbs/BACK_CARDGRAM.webp',
        badge: 'Custom',
        isFavorite: hubProfile.favoriteCardId === preset.id,
        preview: true
      });
      return card;
    })
  );
}

function renderCollectionDetail() {
  if (hub.collectionId === 'user-created') {
    renderUserCreatedCardsDetail();
    return;
  }
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hub.collectionId);
  if (!collection) {
    hub.collectionId = null;
    renderCollections();
    return;
  }

  if (hub.els.collectionDetailHead) {
    hub.els.collectionDetailHead.replaceChildren();

    const stack = makeNode('div', 'collection-stack');
    [microUrl(collection.thumbCover || collection.cover), ...collection.cards.map((card) => microOf(card))]
      .filter(Boolean)
      .filter((src, index, list) => list.indexOf(src) === index)
      .slice(0, 3)
      .forEach((src) => stack.appendChild(makeHubImage(src, '')));
    hub.els.collectionDetailHead.appendChild(stack);

    const copy = makeNode('div', 'hub-detail-copy');
    copy.appendChild(makeNode('span', 'collection-eyebrow', collection.shortName || collection.name));
    copy.appendChild(makeNode('h1', null, collection.name));
    copy.appendChild(
      makeNode('p', null, localized(collection.description) || localized(collection.tagline))
    );

    const meta = makeNode('div', 'hub-detail-meta');
    meta.appendChild(
      makeNode('span', 'hub-chip', countLabel('hub_collection_cards', collection.cards.length))
    );
    if (collection.setSize) {
      meta.appendChild(
        makeNode(
          'span',
          'hub-chip',
          t('collections_set_size', { count: collection.cards.length, total: collection.setSize })
        )
      );
      meta.appendChild(
        makeNode('span', 'hub-chip', t('collections_owned', { count: ownedIn(collection.id).length }))
      );
      meta.appendChild(
        makeNode(
          'span',
          'hub-chip',
          collection.complete
            ? t('collections_set_complete')
            : t('collections_set_missing', { count: collection.missing })
        )
      );
    }
    if (!isCollectionReviewed(collection.id)) {
      meta.appendChild(makeNode('span', 'badge-new', t('hub_new')));
    }
    copy.appendChild(meta);
    hub.els.collectionDetailHead.appendChild(copy);
  }

  if (hub.els.collectionDetailGrid) {
    const nodes = collection.cards.map((card) =>
      createMediaCard({
        kind: 'catalog',
        id: card.id,
        name: card.name,
        subtitle: `${collection.name} · ${card.set}`,
        image: thumbOf(card),
        badge: collection.shortName,
        isFavorite: hubProfile.favoriteCardId === card.id
      })
    );
    if (collection.missing > 0) nodes.push(createMissingCard(collection));
    hub.els.collectionDetailGrid.replaceChildren(...nodes);
  }
}

function deckZoneCards(deck, zone) {
  if (zone === 'side') {
    if (!deck.side) deck.side = { name: 'Side Deck', cardIds: [] };
    return deck.side.cardIds;
  }
  return deck.cardIds;
}

function deckZoneLimit(zone) {
  return zone === 'side' ? 20 : 60;
}

function deckZoneName(deck, zone) {
  return zone === 'side' ? deck.side.name || 'Side Deck' : t('deck_main');
}

function deckCopyLimit(deck) {
  return Math.min(6, Math.max(2, Number(deck.copyLimit) || 3));
}

function deckCardCounts(cardIds) {
  const counts = new Map();
  cardIds.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  return counts;
}

function persistDeckChange() {
  persistHubData();
  renderDeckDetail();
  renderHubStats(false);
}

function deckAvailableCards(deck) {
  const ids = new Set();
  Object.values(hubBooster.owned || {}).forEach((list) => {
    if (Array.isArray(list)) list.forEach((id) => ids.add(id));
  });
  [...(deck.cardIds || []), ...((deck.side && deck.side.cardIds) || [])].forEach((id) => ids.add(id));
  return HUB_CATALOG.cards.filter((card) => ids.has(card.id));
}

function makeDeckPoolCard(card, deck, zone) {
  const article = makeNode('article', 'deck-pool-card');
  article.dataset.deckPoolName = card.name.toLowerCase();
  article.dataset.deckPoolSet = card.collectionId;
  article.appendChild(makeHubImage(thumbOf(card), card.name));

  const copy = makeNode('div', 'deck-pool-copy');
  copy.appendChild(makeNode('strong', null, card.name));
  copy.appendChild(makeNode('span', null, card.set));
  article.appendChild(copy);

  const cards = deckZoneCards(deck, zone);
  const count = cards.filter((id) => id === card.id).length;
  const add = makeNode('button', 'deck-pool-add');
  add.type = 'button';
  add.dataset.deckAddCard = card.id;
  add.disabled = cards.length >= deckZoneLimit(zone) || count >= deckCopyLimit(deck);
  add.setAttribute('aria-label', t('deck_add_card_label', { name: card.name }));
  add.title = t('deck_add_card_label', { name: card.name });
  add.appendChild(hubIcon('plus'));
  article.appendChild(add);
  return article;
}

function makeDeckSelectedRow(card, count, deck, zone) {
  const row = makeNode('div', 'deck-selected-row');
  const thumb = makeNode('span', 'deck-selected-thumb');
  thumb.appendChild(makeHubImage(thumbOf(card), card.name));
  if (count > 1) thumb.appendChild(makeNode('span', 'deck-copy-badge', `×${count}`));
  row.appendChild(thumb);

  const copy = makeNode('div', 'deck-selected-copy');
  copy.appendChild(makeNode('strong', null, card.name));
  copy.appendChild(makeNode('span', null, `${card.set} · ${count}/${deckCopyLimit(deck)}`));
  row.appendChild(copy);

  const qty = makeNode('div', 'deck-qty');
  const minus = makeNode('button');
  minus.type = 'button';
  minus.dataset.deckQty = '-1';
  minus.dataset.deckCard = card.id;
  minus.dataset.deckZone = zone;
  minus.setAttribute('aria-label', t('deck_remove_copy'));
  minus.textContent = '−';
  qty.appendChild(minus);

  qty.appendChild(makeNode('span', null, String(count)));

  const plus = makeNode('button');
  plus.type = 'button';
  plus.dataset.deckQty = '1';
  plus.dataset.deckCard = card.id;
  plus.dataset.deckZone = zone;
  plus.disabled = deckZoneCards(deck, zone).length >= deckZoneLimit(zone) || count >= deckCopyLimit(deck);
  plus.setAttribute('aria-label', t('deck_add_copy'));
  plus.appendChild(hubIcon('plus'));
  qty.appendChild(plus);
  row.appendChild(qty);

  const remove = makeNode('button', 'deck-selected-remove');
  remove.type = 'button';
  remove.dataset.deckRemoveCard = card.id;
  remove.dataset.deckZone = zone;
  remove.setAttribute('aria-label', t('collections_remove'));
  remove.title = t('collections_remove');
  remove.appendChild(hubIcon('trash'));
  row.appendChild(remove);
  return row;
}

function renderDeckDetail() {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) {
    hub.deckId = null;
    renderCollections();
    return;
  }

  if (!deck.side) deck.side = { name: 'Side Deck', cardIds: [] };
  const body = hub.els.deckDetailBody;
  if (!body) return;

  const zone = hub.deckZone === 'side' ? 'side' : 'main';
  body.replaceChildren();

  const head = makeNode('div', 'deck-builder-head');
  const title = makeNode('div', 'deck-builder-title');
  const coverButton = makeNode('button', 'deck-builder-cover');
  coverButton.type = 'button';
  coverButton.dataset.deckCoverOpen = '1';
  coverButton.setAttribute('aria-label', t('deck_cover_change'));
  coverButton.title = t('deck_cover_change');
  coverButton.appendChild(makeDeckCoverImage(deck, deck.name));
  title.appendChild(coverButton);
  title.appendChild(makeNode('span', 'deck-builder-emoji', deck.emoji || '🃏'));
  const titleCopy = makeNode('div');
  titleCopy.appendChild(makeNode('h1', null, deck.name));
  titleCopy.appendChild(
    makeNode(
      'p',
      null,
      `${countLabel('collections_deck_cards', deck.cardIds.length)} / 60 · ${deck.side.name || 'Side Deck'} ${deck.side.cardIds.length}/20`
    )
  );
  title.appendChild(titleCopy);
  head.appendChild(title);

  const tools = makeNode('div', 'deck-builder-tools');
  const limitLabel = makeNode('label', 'deck-limit-control');
  limitLabel.appendChild(makeNode('span', null, t('deck_copy_limit')));
  const limitSelect = document.createElement('select');
  limitSelect.dataset.deckCopyLimit = '1';
  for (let value = 2; value <= 6; value += 1) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = String(value);
    limitSelect.appendChild(option);
  }
  limitSelect.value = String(deckCopyLimit(deck));
  limitLabel.appendChild(limitSelect);
  tools.appendChild(limitLabel);

  const deleteButton = makeHubButton('btn btn-ghost btn-sm btn-danger', t('collections_delete_deck'));
  deleteButton.dataset.deckDelete = deck.id;
  deleteButton.appendChild(hubIcon('trash'));
  tools.appendChild(deleteButton);
  head.appendChild(tools);
  body.appendChild(head);

  const split = makeNode('div', 'deck-builder-split');
  const selected = makeNode('section', 'deck-builder-selected');
  const tabs = makeNode('div', 'deck-zone-tabs');
  ['main', 'side'].forEach((zoneId) => {
    const button = makeNode('button', `deck-zone-tab${zone === zoneId ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.deckZoneTab = zoneId;
    button.appendChild(
      makeNode('span', null, zoneId === 'side' ? deck.side.name || 'Side Deck' : t('deck_main'))
    );
    button.appendChild(
      makeNode(
        'span',
        'deck-zone-count',
        `${deckZoneCards(deck, zoneId).length}/${deckZoneLimit(zoneId)}`
      )
    );
    tabs.appendChild(button);
  });
  selected.appendChild(tabs);

  if (zone === 'side') {
    const sideName = document.createElement('input');
    sideName.className = 'deck-side-name';
    sideName.type = 'text';
    sideName.maxLength = 32;
    sideName.value = deck.side.name || 'Side Deck';
    sideName.dataset.deckSideName = '1';
    sideName.setAttribute('aria-label', t('deck_side_rename'));
    sideName.placeholder = t('deck_side_rename');
    selected.appendChild(sideName);
  }

  const cards = deckZoneCards(deck, zone);
  const counts = deckCardCounts(cards);
  const list = makeNode('div', 'deck-selected-list');
  if (!counts.size) {
    list.appendChild(makeNode('p', 'deck-builder-empty', t('deck_builder_empty')));
  } else {
    counts.forEach((count, cardId) => {
      const card = HUB_CATALOG.byId(cardId);
      if (card) list.appendChild(makeDeckSelectedRow(card, count, deck, zone));
    });
  }
  selected.appendChild(list);
  split.appendChild(selected);

  const pool = makeNode('section', 'deck-builder-pool');
  const poolHead = makeNode('div', 'deck-pool-head');
  poolHead.appendChild(makeNode('strong', null, t('deck_pool_title')));
  poolHead.appendChild(
    makeNode('span', null, t('deck_pool_target', { zone: deckZoneName(deck, zone) }))
  );
  pool.appendChild(poolHead);

  const poolTools = makeNode('div', 'deck-pool-tools');
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'deck-pool-search';
  search.placeholder = t('deck_pool_search');
  search.value = hub.deckPoolSearch;
  search.dataset.deckPoolSearch = '1';
  poolTools.appendChild(search);

  const filter = document.createElement('select');
  filter.className = 'deck-pool-filter';
  filter.dataset.deckPoolFilter = '1';
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = t('deck_pool_all_sets');
  filter.appendChild(allOption);
  HUB_CATALOG.collections.forEach((collection) => {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.name;
    filter.appendChild(option);
  });
  filter.value = hub.deckPoolCollection;
  poolTools.appendChild(filter);

  const viewSwitch = makeNode('div', 'deck-view-switch');
  [
    ['grid', 'deck_view_grid'],
    ['list', 'deck_view_list'],
    ['detail', 'deck_view_detail']
  ].forEach(([mode, key]) => {
    const button = makeNode('button', `deck-view-btn${hub.deckPoolView === mode ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.deckView = mode;
    button.title = t(key);
    button.setAttribute('aria-label', t(key));
    button.appendChild(hubIcon(mode === 'grid' ? 'grid' : mode === 'list' ? 'layers' : 'cards'));
    viewSwitch.appendChild(button);
  });
  poolTools.appendChild(viewSwitch);
  pool.appendChild(poolTools);

  const poolGrid = makeNode('div', `deck-pool-grid view-${hub.deckPoolView}`);
  poolGrid.replaceChildren(
    ...deckAvailableCards(deck).map((card) => makeDeckPoolCard(card, deck, zone))
  );
  pool.appendChild(poolGrid);
  split.appendChild(pool);
  body.appendChild(split);
  applyDeckPoolFilters();
}

function applyDeckPoolFilters() {
  const grid = document.querySelector('.deck-pool-grid');
  if (!grid) return;
  const query = String(hub.deckPoolSearch || '').trim().toLowerCase();
  const collection = hub.deckPoolCollection || 'all';
  Array.from(grid.querySelectorAll('.deck-pool-card')).forEach((card) => {
    const matchesText = !query || (card.dataset.deckPoolName || '').includes(query);
    const matchesSet = collection === 'all' || card.dataset.deckPoolSet === collection;
    card.hidden = !matchesText || !matchesSet;
  });
  const empty = grid.querySelector('.deck-pool-empty');
  const visible = Array.from(grid.querySelectorAll('.deck-pool-card')).some((card) => !card.hidden);
  if (!visible && !empty) {
    grid.appendChild(makeNode('p', 'deck-pool-empty', t('deck_pool_empty')));
  } else if (visible && empty) {
    empty.remove();
  }
}

function setDeckPoolView(view) {
  hub.deckPoolView = ['grid', 'list', 'detail'].includes(view) ? view : 'grid';
  const grid = document.querySelector('.deck-pool-grid');
  if (!grid) return;
  grid.classList.remove('view-grid', 'view-list', 'view-detail');
  grid.classList.add(`view-${hub.deckPoolView}`);
  document.querySelectorAll('[data-deck-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.deckView === hub.deckPoolView);
  });
}

function addDeckCardToZone(cardId, zone) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  const card = HUB_CATALOG.byId(cardId);
  if (!deck || !card) return;

  const zoneKey = zone === 'side' ? 'side' : 'main';
  const cards = deckZoneCards(deck, zoneKey);
  if (cards.length >= deckZoneLimit(zoneKey)) {
    toast(t('deck_full', { max: deckZoneLimit(zoneKey) }), { type: 'warning' });
    return;
  }
  if (cards.filter((id) => id === cardId).length >= deckCopyLimit(deck)) {
    toast(t('deck_copy_limit_reached', { max: deckCopyLimit(deck) }), { type: 'warning' });
    return;
  }

  cards.push(cardId);
  if (!deck.coverId) deck.coverId = cardId;
  persistDeckChange();
}

function changeDeckCardQty(cardId, zone, delta) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;
  if (delta > 0) {
    addDeckCardToZone(cardId, zone);
    return;
  }

  const cards = deckZoneCards(deck, zone === 'side' ? 'side' : 'main');
  const index = cards.lastIndexOf(cardId);
  if (index < 0) return;
  cards.splice(index, 1);
  persistDeckChange();
}

function removeDeckCard(cardId, zone) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;
  const cards = deckZoneCards(deck, zone === 'side' ? 'side' : 'main');
  deck[zone === 'side' ? 'side' : 'cardIds'] = zone === 'side'
    ? { ...deck.side, cardIds: cards.filter((id) => id !== cardId) }
    : cards.filter((id) => id !== cardId);
  persistDeckChange();
  toast(t('toast_deck_card_removed'), { type: 'info' });
}

function setDeckCopyLimit(value) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;
  deck.copyLimit = Math.min(6, Math.max(2, Number(value) || 3));
  ['main', 'side'].forEach((zone) => {
    const cards = deckZoneCards(deck, zone);
    const counts = new Map();
    cards.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    if ([...counts.values()].some((count) => count > deck.copyLimit)) {
      const trimmed = [];
      const used = new Map();
      cards.forEach((id) => {
        const count = used.get(id) || 0;
        if (count < deck.copyLimit) {
          trimmed.push(id);
          used.set(id, count + 1);
        }
      });
      if (zone === 'side') deck.side.cardIds = trimmed;
      else deck.cardIds = trimmed;
    }
  });
  persistDeckChange();
  toast(t('deck_copy_limit_set', { count: deck.copyLimit }), { type: 'info' });
}

function renameDeckSide(value) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;
  deck.side.name = String(value || '').trim().slice(0, 32) || 'Side Deck';
  persistHubData();
  renderDeckDetail();
}

async function deleteDeck(deckId) {
  const deck = hubData.decks.find((entry) => entry.id === deckId);
  if (!deck) return;

  const confirmed = await confirmAction({
    title: t('deck_delete_confirm_title'),
    message: t('deck_delete_confirm_desc'),
    confirmLabel: t('collections_delete_deck')
  });
  if (!confirmed) return;

  hubData.decks = hubData.decks.filter((entry) => entry.id !== deckId);
  persistHubData();
  hub.deckId = null;
  hub.collectionId = null;
  renderHubStats(false);
  toast(t('toast_deck_deleted'), { type: 'info' });
  navigate('collections');
}

function renderDeckEmojiOptions() {
  if (!hub.els.deckEmojiOptions) return;
  hub.els.deckEmojiOptions.replaceChildren();

  DECK_EMOJIS.forEach((emoji, index) => {
    const label = document.createElement('label');
    label.className = 'deck-emoji-option';
    label.title = emoji;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'deck-emoji';
    input.value = emoji;
    input.checked = index === 0;

    label.appendChild(input);
    label.appendChild(makeNode('span', null, emoji));
    hub.els.deckEmojiOptions.appendChild(label);
  });
}

function renderDeckCoverGrid() {
  if (!hub.els.deckCoverGrid) return;
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;

  const ids = Array.from(new Set([...(deck.cardIds || []), ...((deck.side && deck.side.cardIds) || [])]));
  hub.els.deckCoverGrid.replaceChildren(
    ...ids
      .map((id) => HUB_CATALOG.byId(id))
      .filter(Boolean)
      .map((card) => {
        const button = makeNode('button', `deck-cover-choice${!deck.coverImage && deck.coverId === card.id ? ' active' : ''}`);
        button.type = 'button';
        button.dataset.deckCoverCard = card.id;
        button.title = card.name;
        button.appendChild(makeHubImage(thumbOf(card), card.name));
        button.appendChild(makeNode('span', null, card.name));
        button.addEventListener('click', () => setDeckCoverCard(card.id));
        return button;
      })
  );
}

function openDeckCoverDialog() {
  if (!hub.els.deckCoverDialog || !hub.deckId) return;
  renderDeckCoverGrid();
  if (!hub.els.deckCoverDialog.open) hub.els.deckCoverDialog.showModal();
}

function setDeckCoverCard(cardId) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck || !HUB_CATALOG.byId(cardId)) return;
  deck.coverId = cardId;
  deck.coverImage = '';
  persistHubData();
  renderDeckDetail();
  if (hub.els.deckCoverDialog) hub.els.deckCoverDialog.close();
}

function readDeckCoverFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('read'));
          return;
        }
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const w = image.width * scale;
        const h = image.height * scale;
        ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        resolve(canvas.toDataURL('image/webp', 0.82));
      };
      image.onerror = () => reject(new Error('read'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

/* Deck boxes: conserva la transparencia y limita el tamaño del data URL. */
function readDeckBoxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 720;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('read'));
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/webp', 0.9);
        resolve(data.startsWith('data:image/') ? data : canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('read'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

async function uploadDeckCover(file) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck || !file) return;
  try {
    deck.coverImage = await readDeckCoverFile(file);
    persistHubData();
    renderDeckDetail();
    if (hub.els.deckCoverDialog) hub.els.deckCoverDialog.close();
  } catch (error) {
    toast(t('upload_failed'), { type: 'error' });
  }
}

function openDeckDialog() {
  if (!hub.els.deckDialog) return;

  hub.els.deckName.value = '';
  renderDeckEmojiOptions();

  if (!hub.els.deckDialog.open) hub.els.deckDialog.showModal();
  setTimeout(() => {
    hub.els.deckName.focus();
    hub.els.deckName.select();
  }, 50);
}

function createDeckFromForm() {
  const name = hub.els.deckName.value.trim().slice(0, 48);
  if (!name) {
    toast(t('deck_name_required'), { type: 'warning' });
    hub.els.deckName.focus();
    return;
  }

  const checked = hub.els.deckForm.querySelector('input[name="deck-emoji"]:checked');
  const emoji = checked ? checked.value : DECK_EMOJIS[0];
  const coverId = defaultFavoriteId() || (fallbackCard() ? fallbackCard().id : null);

  const deck = {
    id: uid(),
    name,
    emoji,
    coverId,
    cardIds: [],
    side: { name: t('deck_side_default'), cardIds: [] },
    copyLimit: 3,
    createdAt: Date.now()
  };

  hubData.decks.unshift(deck);
  if (!persistHubData()) {
    hubData.decks.shift();
    return;
  }

  hub.deckZone = 'main';
  hub.els.deckDialog.close();
  renderHubStats(false);
  toast(t('toast_deck_created', { name: deck.name }), { type: 'success' });
  navigate(`collections/deck/${deck.id}`);
}

/* --------------------------------------------------------------------------
   Explorar (preparado)
   -------------------------------------------------------------------------- */
function explorePacks() {
  return HUB_CATALOG.collections.filter((collection) => collection.cards.length);
}

function makeExploreCreatorCard() {
  const button = makeHubButton('explore-creator explore-shop', null, { exploreCreator: 'theastrobruh' });
  const cover = makeNode('span', 'explore-shop-cover');
  cover.appendChild(makeHubImage('assets/data/shops/theastrobruh-cover.png', 'theAstroBruh Shop'));
  button.appendChild(cover);

  const body = makeNode('span', 'explore-shop-body');
  const avatar = makeNode('span', 'explore-shop-avatar');
  avatar.appendChild(makeHubImage('assets/data/shops/theastrobruh-avatar.jpg', 'theAstroBruh'));
  body.appendChild(avatar);

  const copy = makeNode('span', 'explore-creator-copy');
  copy.appendChild(makeNode('strong', null, 'theAstroBruh'));
  copy.appendChild(makeNode('span', null, '@theastrobruh'));
  const packs = explorePacks();
  const totalCards = packs.reduce((sum, collection) => sum + collection.cards.length, 0);
  copy.appendChild(
    makeNode('span', 'explore-creator-meta', t('explore_creator_meta', { packs: packs.length, cards: totalCards }))
  );
  body.appendChild(copy);

  const cta = makeNode('span', 'explore-shop-cta', t('explore_enter_shop'));
  cta.appendChild(hubIcon('arrow-right'));
  body.appendChild(cta);
  button.appendChild(body);
  return button;
}

function makeExplorePackCard(collection) {
  const button = makeHubButton('explore-pack', null, { explorePack: collection.id });
  const pack = makeNode('span', 'explore-pack-3d');
  const cover = makeNode('span', 'explore-pack-cover');
  const customArt = shopPackArt[collection.id];
  if (customArt) {
    cover.classList.add('is-custom-pack');
    cover.appendChild(makeHubImage(customArt, collection.name));
  } else {
    pack.classList.add('is-placeholder-pack');
    const placeholder = makeNode('span', 'explore-pack-placeholder');
    placeholder.appendChild(hubIcon('sparkles'));
    placeholder.appendChild(makeNode('span', null, t('explore_pack_soon')));
    cover.appendChild(placeholder);
  }
  pack.appendChild(cover);
  button.appendChild(pack);

  const body = makeNode('span', 'explore-pack-body');
  body.appendChild(makeNode('strong', null, collection.name));
  body.appendChild(makeNode('span', null, countLabel('explore_pack_cards', collection.cards.length)));
  body.appendChild(makeNode('span', 'explore-pack-link', t('explore_pack_open')));
  button.appendChild(body);
  return button;
}

function renderExplorePackDetail(collection) {
  const head = hub.els.explorePackHead;
  if (head) {
    head.replaceChildren();
    const copy = makeNode('div', 'explore-pack-detail-copy');
    copy.appendChild(makeNode('span', 'hub-panel-eyebrow', 'theAstroBruh'));
    copy.appendChild(makeNode('h2', null, collection.name));
    copy.appendChild(
      makeNode('p', null, t('explore_pack_detail_lede', { count: collection.cards.length }))
    );
    const open = makeHubButton('btn btn-primary btn-sm', t('explore_open_booster'), {
      exploreOpenPack: collection.id
    });
    open.appendChild(hubIcon('sparkles'));
    copy.appendChild(open);
    head.appendChild(copy);
  }

  if (hub.els.explorePackCards) {
    hub.els.explorePackCards.replaceChildren(
      ...collection.cards.map((card) =>
        createMediaCard({
          kind: 'catalog',
          id: card.id,
          name: card.name,
          subtitle: `${collection.name} · ${card.set}`,
          image: card.thumbFront || card.front,
          badge: collection.shortName,
          isFavorite: hubProfile.favoriteCardId === card.id,
          preview: true
        })
      )
    );
  }
}


function makeExplorePlazaCard() {
  const button = makeHubButton('explore-creator explore-shop explore-plaza-card', null, { explorePlaza: 'true' });
  button.setAttribute('aria-label', 'Entrar a La Plaza');

  const cover = makeNode('span', 'explore-shop-cover explore-plaza-cover');
  cover.appendChild(makeHubImage('assets/data/explore/Plaza-Icon.webp', 'La Plaza'));
  button.appendChild(cover);

  const body = makeNode('span', 'explore-shop-body');
  const avatar = makeNode('span', 'explore-shop-avatar explore-plaza-avatar');
  avatar.appendChild(makeHubImage('assets/data/explore/Plaza-Icon.webp', 'La Plaza'));
  body.appendChild(avatar);

  const copy = makeNode('span', 'explore-creator-copy');
  copy.appendChild(makeNode('strong', null, 'La Plaza'));
  copy.appendChild(makeNode('span', null, '@plaza · Ciudad de Panamá'));
  copy.appendChild(
    makeNode('span', 'explore-creator-meta', 'Noticias & Torneos TCG')
  );
  body.appendChild(copy);

  const cta = makeNode('span', 'explore-shop-cta', 'Entrar a La Plaza');
  cta.appendChild(hubIcon('arrow-right'));
  body.appendChild(cta);
  button.appendChild(body);
  return button;
}


function makeExploreAboutCard() {
  const button = makeHubButton('explore-creator explore-shop explore-about-card', null, { hubRoute: 'about' });
  button.setAttribute('aria-label', t('about_title'));

  const cover = makeNode('span', 'explore-shop-cover explore-about-cover');
  const art = makeHubImage('assets/data/explore/About-Icon.webp', 'CardGram');
  art.addEventListener('error', () => cover.classList.add('is-missing'), { once: true });
  cover.appendChild(art);
  const fallback = makeNode('span', 'explore-about-fallback');
  fallback.appendChild(hubIcon('sparkles'));
  fallback.appendChild(makeNode('strong', null, 'CardGram'));
  cover.appendChild(fallback);
  button.appendChild(cover);

  const body = makeNode('span', 'explore-shop-body');
  const avatar = makeNode('span', 'explore-shop-avatar explore-about-avatar');
  avatar.appendChild(hubIcon('info'));
  body.appendChild(avatar);

  const copy = makeNode('span', 'explore-creator-copy');
  copy.appendChild(makeNode('strong', null, t('about_title')));
  copy.appendChild(makeNode('span', null, t('about_card_handle')));
  copy.appendChild(makeNode('span', 'explore-creator-meta', t('about_card_meta')));
  body.appendChild(copy);

  const cta = makeNode('span', 'explore-shop-cta', t('about_card_cta'));
  cta.appendChild(hubIcon('arrow-right'));
  body.appendChild(cta);
  button.appendChild(body);
  return button;
}

let plazaScope = 'local';
try {
  const savedScope = localStorage.getItem('cardgram.plaza.scope');
  if (savedScope === 'local' || savedScope === 'general') plazaScope = savedScope;
} catch (err) {
  /* ignore */
}

function setPlazaScope(scope) {
  if (scope !== 'local' && scope !== 'general') return;
  plazaScope = scope;
  try {
    localStorage.setItem('cardgram.plaza.scope', scope);
  } catch (err) {
    /* ignore */
  }
  renderPlazaScope();
}

function renderPlazaScope() {
  if (hub.els.plazaScopeGrid) {
    const cards = hub.els.plazaScopeGrid.querySelectorAll('[data-plaza-scope]');
    cards.forEach((btn) => {
      const active = btn.dataset.plazaScope === plazaScope;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }
  if (hub.els.plazaFeedLocal) {
    hub.els.plazaFeedLocal.hidden = plazaScope !== 'local';
  }
  if (hub.els.plazaFeedGeneral) {
    hub.els.plazaFeedGeneral.hidden = plazaScope !== 'general';
  }
}

function renderExplore() {
  if (!hub.ready || !hub.els.exploreCreators) return;
  loadShopPackArt();

  const packs = explorePacks();
  const creatorOpen = hub.exploreCreatorId === 'theastrobruh';
  const plazaStep = hub.explorePlazaStep || null; // null (explore lobby) | 'picker' (screen 1) | 'feed' (screen 2)
  const inPlaza = Boolean(plazaStep);
  const pack = creatorOpen ? packs.find((collection) => collection.id === hub.explorePackId) : null;

  if (hub.els.explorePacksBlock) hub.els.explorePacksBlock.hidden = !creatorOpen || Boolean(pack);
  if (hub.els.explorePackDetail) hub.els.explorePackDetail.hidden = !pack;

  if (hub.els.explorePlazaPickerBlock) hub.els.explorePlazaPickerBlock.hidden = plazaStep !== 'picker';
  if (hub.els.explorePlazaFeedBlock) hub.els.explorePlazaFeedBlock.hidden = plazaStep !== 'feed';

  if (hub.els.explorePlazaEntryBlock) hub.els.explorePlazaEntryBlock.hidden = creatorOpen || inPlaza;
  if (hub.els.exploreCreatorsBlock) hub.els.exploreCreatorsBlock.hidden = creatorOpen || inPlaza;
  if (hub.els.exploreAboutBlock) hub.els.exploreAboutBlock.hidden = creatorOpen || inPlaza;
  if (hub.els.exploreWantMore) hub.els.exploreWantMore.hidden = creatorOpen || inPlaza;
  if (hub.els.exploreRoadmap) hub.els.exploreRoadmap.hidden = creatorOpen || inPlaza;

  if (hub.els.explorePackCount) {
    hub.els.explorePackCount.textContent = countLabel('explore_pack_count', packs.length);
  }

  if (plazaStep === 'feed') {
    renderPlazaScope();
    return;
  }
  if (plazaStep === 'picker') {
    return;
  }

  if (!creatorOpen) {
    if (hub.els.explorePlazaList) {
      hub.els.explorePlazaList.replaceChildren(makeExplorePlazaCard());
    }
    if (hub.els.exploreCreators) {
      hub.els.exploreCreators.replaceChildren(makeExploreCreatorCard());
    }
    if (hub.els.exploreAboutList) {
      hub.els.exploreAboutList.replaceChildren(makeExploreAboutCard());
    }
    return;
  }

  if (pack) {
    renderExplorePackDetail(pack);
    return;
  }

  if (hub.els.explorePacks) {
    hub.els.explorePacks.replaceChildren(...packs.map((collection) => makeExplorePackCard(collection)));
  }
}

/* --------------------------------------------------------------------------
   Perfil
   -------------------------------------------------------------------------- */
function buildProfileFavoriteOptions() {
  if (!hub.els.profileFavorite) return;
  hub.els.profileFavorite.replaceChildren();

  HUB_CATALOG.collections.forEach((collection) => {
    const group = document.createElement('optgroup');
    group.label = collection.name;
    collection.cards.forEach((card) => {
      const option = document.createElement('option');
      option.value = card.id;
      option.textContent = `${card.name} · ${card.set}`;
      group.appendChild(option);
    });
    hub.els.profileFavorite.appendChild(group);
  });
}

function renderProfileForm() {
  if (!hub.ready) return;

  if (hub.els.profileName) hub.els.profileName.value = hubProfile.name;
  if (hub.els.profileHandle) hub.els.profileHandle.value = hubProfile.handle;
  if (hub.els.profileBio) hub.els.profileBio.value = hubProfile.bio;
  if (hub.els.profileFavorite) hub.els.profileFavorite.value = hubProfile.favoriteCardId || '';

  hub.draftAvatar = hubProfile.avatar;
  applyAvatar(hub.els.profileAvatar, hub.els.profileAvatarImg, hub.draftAvatar);
  if (hub.els.btnAvatarRemove) hub.els.btnAvatarRemove.disabled = !hub.draftAvatar;
  updateBioCount();
  renderProfileSummary();
}

function updateBioCount() {
  if (!hub.els.profileBioCount || !hub.els.profileBio) return;
  hub.els.profileBioCount.textContent = `${hub.els.profileBio.value.length}/160`;
}

async function optimizeAvatar(file) {
  if (!file || !file.type || !/^image\/(png|jpe?g|webp|avif|gif)$/i.test(file.type)) {
    throw imageError('type');
  }
  if (file.size > MAX_UPLOAD_BYTES) throw imageError('size');

  const bitmap = await decodeImage(file);
  try {
    const width = bitmap.width || bitmap.naturalWidth;
    const height = bitmap.height || bitmap.naturalHeight;
    if (!width || !height) throw imageError('read');

    const side = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw imageError('read');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      bitmap,
      Math.round((width - side) / 2),
      Math.round((height - side) / 2),
      side,
      side,
      0,
      0,
      512,
      512
    );

    try {
      return canvas.toDataURL('image/webp', 0.9);
    } catch (error) {
      return canvas.toDataURL('image/png');
    }
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

async function handleAvatarFile(file) {
  try {
    const dataUrl = await optimizeAvatar(file);
    hub.draftAvatar = dataUrl;
    applyAvatar(hub.els.profileAvatar, hub.els.profileAvatarImg, dataUrl);
    if (hub.els.btnAvatarRemove) hub.els.btnAvatarRemove.disabled = false;
  } catch (error) {
    toast(t('profile_avatar_error'), { type: 'error' });
  }
}

function saveProfile() {
  const name = hub.els.profileName.value.trim().slice(0, 32);
  if (!name) {
    toast(t('profile_name_required'), { type: 'warning' });
    hub.els.profileName.focus();
    return;
  }

  const favorite = HUB_CATALOG.byId(hub.els.profileFavorite.value)
    ? hub.els.profileFavorite.value
    : defaultFavoriteId();

  hubProfile = {
    ...hubProfile,
    name,
    handle: normalizeHandle(hub.els.profileHandle.value || name),
    bio: hub.els.profileBio.value.trim().slice(0, 160),
    avatar: hub.draftAvatar,
    favoriteCardId: favorite
  };

  if (!persistHubProfile()) return;

  renderHubIdentity();
  renderFavoriteCard();
  renderProfileForm();
  renderHubStats(false);
  renderCardExplorer();
  toast(t('profile_saved'), { type: 'success' });
}

/* --------------------------------------------------------------------------
   Paneles y navegación
   -------------------------------------------------------------------------- */
function updateLangButtons() {
  if (!hub.root) return;
  Array.from(document.querySelectorAll('[data-hub-lang]')).forEach((button) => {
    const active = button.dataset.hubLang === currentLang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-checked', String(active));
  });
  if (hub.els.langCode) {
    hub.els.langCode.textContent = String(currentLang || 'en').toUpperCase();
  }
}

function setHubLangMenu(open, options = {}) {
  const menu = hub.els.langMenu;
  const toggle = hub.els.langToggle;
  if (!menu || !toggle) return;

  const next = Boolean(open);
  menu.hidden = !next;
  toggle.setAttribute('aria-expanded', String(next));

  if (next && options.focus !== false) {
    const active =
      menu.querySelector('.hub-lang-option.active') ||
      menu.querySelector('.hub-lang-option');
    if (active) {
      requestAnimationFrame(() => active.focus({ preventScroll: true }));
    }
  } else if (!next && options.restoreFocus) {
    toggle.focus({ preventScroll: true });
  }
}

/* --------------------------------------------------------------------------
   Hojas modales del lobby: menú y detalles de la carta
   -------------------------------------------------------------------------- */
function openHubSheet(sheet, trigger) {
  if (!sheet || !sheet.hidden) return;
  /* Las hojas son solo de móvil: en escritorio no se abren. */
  if (window.innerWidth > 980) return;
  if (hub.activeSheet && hub.activeSheet.el !== sheet) {
    closeHubSheet({ restoreFocus: false, instant: true });
  }

  hub.activeSheet = { el: sheet, trigger: trigger || null };
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onSheetKeydown);
  if (window.Sound) window.Sound.play('open');

  const panel = sheet.querySelector('.hub-menu-panel');
  if (panel) panel.focus({ preventScroll: true });
}

function closeHubSheet(options = {}) {
  const active = hub.activeSheet;
  if (!active) return;

  const { el, trigger } = active;
  hub.activeSheet = null;

  document.removeEventListener('keydown', onSheetKeydown);
  el.classList.remove('is-open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  if (window.Sound && !options.instant && !options.silent) window.Sound.play('close');

  const finish = () => {
    el.hidden = true;
  };

  if (options.instant || reduceMotion()) finish();
  else window.setTimeout(finish, 240);

  if (options.restoreFocus !== false && trigger) {
    trigger.focus({ preventScroll: true });
  }
}

function onSheetKeydown(event) {
  const active = hub.activeSheet;
  if (!active) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeHubSheet();
    return;
  }

  if (event.key !== 'Tab') return;

  const panel = active.el.querySelector('.hub-menu-panel');
  if (!panel) return;

  const focusables = Array.from(panel.querySelectorAll('button, a[href]'))
    .filter((node) => !node.disabled && node.offsetParent !== null);
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (document.activeElement === panel) {
    if (event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openHubMenu(trigger) {
  openHubSheet(hub.els.menu, trigger || hub.els.menuBtn);
}

function closeHubMenu(options = {}) {
  closeHubSheet(options);
}

function openCardDetails() {
  openHubSheet(hub.els.cardSheet, hub.els.cardInfo);
}

function presetViewerCard(preset) {
  return {
    id: preset.id,
    name: preset.name,
    front: preset.front,
    back: preset.back,
    fullArt: preset.fullArt || null,
    collectionName: t('library_saved_badge'),
    set: '',
    type: '',
    rarity: '',
    stats: null,
    lore: '',
    isPreset: true
  };
}

function setViewerCinema(on) {
  if (!hub.els.viewer) return;
  hub.viewerCinema = Boolean(on);
  hub.els.viewer.classList.toggle('is-cinema', hub.viewerCinema);
  if (hub.els.viewerDetails) {
    hub.els.viewerDetails.setAttribute('aria-pressed', String(!hub.viewerCinema));
    const label = hub.els.viewerDetails.querySelector('span');
    if (label) {
      label.textContent = hub.viewerCinema ? t('viewer_show_details') : t('viewer_hide_details');
    }
  }
}

function flipViewerCard() {
  if (!hub.els.viewerCard) return;
  hub.els.viewerCard.classList.toggle('is-flipped');
}

function openCardViewer(target, trigger) {
  if (!hub.els.viewer) return;
  const card = typeof target === 'string' ? HUB_CATALOG.byId(target) : target;
  if (!card) return;

  hub.viewerCard = card;
  hub.viewerTrigger = trigger || document.activeElement;
  hub.els.viewerCard.classList.remove('is-flipped');
  setViewerCinema(false);

  if (hub.els.viewerFront) {
    hub.els.viewerFront.src = card.front;
    hub.els.viewerFront.alt = card.name;
  }
  if (hub.els.viewerBack) {
    hub.els.viewerBack.src = card.back;
    hub.els.viewerBack.alt = `${card.name} — ${t('back_cover')}`;
  }
  if (hub.els.viewerName) hub.els.viewerName.textContent = card.name;
  if (hub.els.viewerCollection) {
    hub.els.viewerCollection.textContent = [card.collectionName, card.set]
      .filter(Boolean)
      .join(' · ');
  }
  if (hub.els.viewerType) hub.els.viewerType.textContent = card.type || '';
  if (hub.els.viewerLore) hub.els.viewerLore.textContent = card.lore || '';
  if (hub.els.viewerObtain) {
    const collection = card.collectionId
      ? HUB_CATALOG.collections.find((entry) => entry.id === card.collectionId)
      : null;
    if (collection && collection.booster !== false) {
      hub.els.viewerObtain.hidden = false;
      const label = hub.els.viewerObtain.querySelector('span');
      if (label) label.textContent = t('viewer_open_booster');
      hub.els.viewerObtain.onclick = () => {
        closeCardViewer({ restoreFocus: false, silent: true });
        hubBooster.setId = collection.id;
        navigate('booster');
      };
      if (hub.els.viewerObtainNote) {
        hub.els.viewerObtainNote.textContent = card.acquisition
          ? card.acquisition
          : t('viewer_booster_note', { collection: collection.name });
      }
    } else {
      hub.els.viewerObtain.hidden = true;
      if (hub.els.viewerObtainNote) {
        hub.els.viewerObtainNote.textContent = card.acquisition || t('viewer_created_note');
      }
    }
  }
  if (hub.els.viewerChips) {
    const chips = [];
    if (card.rarity) chips.push(card.rarity);
    if (card.attribute || card.type) chips.push(card.attribute || card.type);
    Object.keys(card.stats || {}).forEach((key) => chips.push(`${key} ${card.stats[key]}`));
    hub.els.viewerChips.replaceChildren(...chips.map((text) => makeNode('span', 'hub-chip', text)));
  }

  if (hub.els.viewerEdit) {
    hub.els.viewerEdit.onclick = () => {
      closeCardViewer({ restoreFocus: false, silent: true });
      if (card.isPreset) openSavedPreset(card.id);
      else openCatalogCard(card.id);
    };
  }

  hub.els.viewer.hidden = false;
  document.body.classList.add('viewer-open');
  requestAnimationFrame(() => {
    if (hub.els.viewerClose) hub.els.viewerClose.focus({ preventScroll: true });
  });
}

function closeCardViewer(options = {}) {
  if (!hub.els.viewer || hub.els.viewer.hidden) return;
  hub.els.viewer.hidden = true;
  document.body.classList.remove('viewer-open');
  if (options.restoreFocus !== false) {
    const trigger = hub.viewerTrigger;
    if (trigger && typeof trigger.focus === 'function') trigger.focus({ preventScroll: true });
  }
  hub.viewerCard = null;
  hub.viewerTrigger = null;
}

function setActivePanel(panel, options = {}) {
  const target = panel === 'library' ? 'collections' : HUB_PANELS.includes(panel) ? panel : 'home';
  hub.panel = target;
  if (target !== 'explore') {
    hub.exploreCreatorId = null;
    hub.explorePackId = null;
  }
  if (target === 'collections') markBoosterMission();
  if (hub.ready) syncMobileDailyButton();
  document.body.classList.toggle('is-home-route', target === 'home');
  document.body.classList.toggle('is-booster-route', target === 'booster');
  if (window.Music) {
    const musicScene = target === 'collections'
      ? 'my-cards'
      : target === 'booster'
        ? 'packs'
        : target === 'explore'
          ? 'explore'
          : 'home';
    window.Music.setScene(musicScene);
  }

  Array.from(hub.root.querySelectorAll('[data-hub-panel]')).forEach((section) => {
    const active = section.dataset.hubPanel === target;
    section.hidden = !active;
    section.classList.toggle('active', active);
  });

  Array.from(hub.root.querySelectorAll('.hub-nav-btn, .hub-mobile-btn, [data-menu-nav]')).forEach((button) => {
    const active = button.dataset.hubRoute === target;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  const mobileNav = hub.root.querySelector('.hub-mobile-menu-nav');
  if (hub.els.homeFab) {
    const navButtons = mobileNav
      ? Array.from(mobileNav.querySelectorAll('.hub-fab-btn:not(#hub-home-fab):not(.hub-mobile-daily)'))
      : [];
    navButtons.forEach((button) => { button.hidden = false; });
    const activeNav = navButtons.find((button) => button.dataset.hubRoute === target) || null;
    if (target !== 'home' && activeNav) {
      activeNav.hidden = true;
      hub.els.homeFab.hidden = false;
      activeNav.parentNode.insertBefore(hub.els.homeFab, activeNav);
    } else {
      hub.els.homeFab.hidden = true;
    }
  }

  if (target === 'booster') scheduleShopIdle();
  else window.clearTimeout(shopIdleTimer);

  if (target === 'home') {
    hub.homeVisits += 1;
    renderFavoriteCard();
    renderHomeTable();
    renderHubStats(options.animateStats === true);
    renderCollectionRail();
    renderCardExplorer();
  } else if (target === 'library') {
    renderLibrary();
  } else if (target === 'booster') {
    renderBooster();
    setTimeout(setupShopPlaygroundAll, 120);
  } else if (target === 'collections') {
    renderCollections();
  } else if (target === 'explore') {
    renderExplore();
  } else if (target === 'profile') {
    renderProfileForm();
  }

  refreshCardRatios();

  if (options.scroll !== false) {
    hub.scroll.scrollTo({ top: 0, behavior: 'auto' });
  }
}

function showHub(panel) {
  if (document.body.dataset.view === 'studio') {
    if (Scene && Scene.isReady()) Scene.setRenderPaused(true);
    if (typeof exitCinematic === 'function') exitCinematic();
    if (hub.els.flowerMenu) setFlower(false);
  }

  document.body.dataset.view = 'hub';
  hub.root.setAttribute('aria-hidden', 'false');
  hub.root.inert = false;

  if (hub.els.deckDialog && hub.els.deckDialog.open) hub.els.deckDialog.close();

  setActivePanel(panel);
  renderHubIdentity();
}

function navigate(route) {
  let clean = String(route || 'home').replace(/^#?\/*/, '');
  if (clean === 'library') clean = 'collections';
  const hash = `#/${clean}`;

  if (location.hash === hash) {
    hub.lastRoute = '';
    applyRoute();
    return;
  }

  try {
    history.pushState({ route: clean }, '', hash);
  } catch (error) {
    location.hash = hash;
    return;
  }
  if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.startViewTransition(() => applyRoute());
  } else {
    applyRoute();
  }
}

function applyRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
  const parts = raw.split('/').filter(Boolean);
  const head = parts[0] || 'home';
  const key = parts.join('/') || 'home';

  if (key === hub.lastRoute) return;
  hub.lastRoute = key;

  if (hub.els && hub.els.shopPackView && !hub.els.shopPackView.hidden && key !== 'booster') {
    closeShopPackView();
  }

  if (head === 'studio') {
    openStudio(parts[1] || 'deck');
    return;
  }

  if (head === 'library') {
    showHub('collections');
    return;
  }

  if (head === 'collections' && parts[1] === 'deck') {
    hub.collectionId = null;
    hub.deckId = parts[2] || null;
    showHub('collections');
    if (hub.deckId) renderCollections();
    return;
  }

  if (head === 'collections' && parts[1]) {
    hub.deckId = null;
    hub.collectionId = parts[1];
    markCollectionReviewed(hub.collectionId);
    showHub('collections');
    renderCollections();
    return;
  }

  hub.collectionId = null;
  hub.deckId = null;
  showHub(HUB_PANELS.includes(head) ? head : 'home');
}

/* --------------------------------------------------------------------------
   Arranque perezoso del estudio
   -------------------------------------------------------------------------- */
function showStudioLoading() {
  if (!el.loadingVeil) return;
  el.loadingVeil.classList.remove('hidden', 'is-error');
  el.loadingVeil.setAttribute('aria-hidden', 'false');
  if (el.loadingTitle) el.loadingTitle.textContent = t('loading_title');
  if (el.loadingText) el.loadingText.textContent = t('loading_text');
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function openStudio(tab) {
  if (hub.opening) return;
  if (window.Music) window.Music.setScene('studio');
  if (document.body.dataset.view === 'studio' && Scene && Scene.isReady()) {
    activateTab(HUB_STUDIO_TABS[tab] || 'tab-deck');
    return;
  }

  hub.opening = true;

  if (hub.els.deckDialog && hub.els.deckDialog.open) hub.els.deckDialog.close();

  hub.root.setAttribute('aria-hidden', 'true');
  hub.root.inert = true;
  document.body.dataset.view = 'studio';
  document.body.classList.remove('cinematic-mode');

  if (typeof renderPresets === 'function') {
    renderPresets();
    hub.presetsRendered = true;
  }

  const firstOpen = !Scene.isReady();
  if (firstOpen) showStudioLoading();

  await nextFrame();

  if (firstOpen) {
    const threeReady = await ensureThree();
    if (!threeReady) {
      showWebglError();
      hub.opening = false;
      return;
    }
    const ok = Scene.init();
    if (!ok) {
      showWebglError();
      hub.opening = false;
      return;
    }
  }

  Scene.setRenderPaused(false);
  state.scale = 100;
  const isMobileResponsive = typeof isMobile === 'function' ? isMobile() : (window.innerWidth <= 860);
  const entryCamDist = isMobileResponsive ? 3.8 : 4.6;
  state.camDistance = entryCamDist;
  if (Scene.isReady()) {
    Scene.centerCamera();
    Scene.applySettings({ posX: 0, posY: 0, camDistance: entryCamDist });
  }
  syncUI();
  scheduleResize();

  if (firstOpen || typeof textureStale === 'undefined' || textureStale) {
    try {
      const status = await Scene.loadCardImages(
        currentCard.front,
        currentCard.back,
        currentCard.fullArt
      );
      if (!status.front || !status.back) {
        toast(t('texture_error'), { type: 'warning', duration: 5000 });
      }
      textureStale = false;
    } catch (error) {
      toast(t('texture_error'), { type: 'warning', duration: 5000 });
    } finally {
      hideLoading();
    }
  } else {
    hideLoading();
  }

  if (isMobile()) setSidebar(false, { persist: false });
  else setSidebar(!state.sidebarCollapsed, { persist: false });

  activateTab(HUB_STUDIO_TABS[tab] || 'tab-deck');
  scheduleResize();
  hub.opening = false;

  if (hub.newCardRequested) {
    hub.newCardRequested = false;
    if (typeof beginNewCard === 'function') beginNewCard();
    if (typeof isMobile === 'function' && isMobile() && typeof setSidebar === 'function') {
      setSidebar(true, { persist: false });
    }
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const upload = document.getElementById('upload-front');
        if (upload) {
          upload.scrollIntoView({
            block: 'center',
            behavior: reduceMotion() ? 'auto' : 'smooth'
          });
          upload.focus({ preventScroll: true });
        }
      }, 220);
      toast(t('hub_new_card_hint'), { type: 'info', duration: 4200 });
    });
  }
}

/* --------------------------------------------------------------------------
   Acciones de biblioteca
   -------------------------------------------------------------------------- */
function openCatalogCard(cardId, tab = 'deck') {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return;

  const builtin = typeof BUILTIN_PRESETS !== 'undefined'
    ? BUILTIN_PRESETS.find((preset) => preset.cardId === card.id)
    : null;
  activePresetId = builtin ? builtin.id : null;
  renderPresets();
  applyCardImages(card.front, card.back, card.fullArt || null);
  navigate(`studio/${tab}`);
}

function openSavedPreset(presetId) {
  const preset = Array.isArray(presets) ? presets.find((entry) => entry.id === presetId) : null;
  if (!preset) return;
  loadPreset(preset);
  navigate('studio/deck');
}

/* --------------------------------------------------------------------------
   Eventos
   -------------------------------------------------------------------------- */
function onHubClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const handNav = target.closest('[data-hand-nav]');
  if (handNav) {
    event.preventDefault();
    cycleHand(Number(handNav.dataset.handNav) || 1);
    return;
  }

  const routeButton = target.closest('[data-hub-route]');
  if (routeButton) {
    event.preventDefault();
    closeHubMenu({ restoreFocus: false, silent: true });
    navigate(routeButton.dataset.hubRoute);
    return;
  }

  if (target.closest('[data-render-favorite]')) {
    event.preventDefault();
    const card = favoriteCard();
    if (card) {
      closeHubMenu({ restoreFocus: false, silent: true });
      openCatalogCard(card.id, 'deck');
    }
    return;
  }

  const musicButton = target.closest('[data-music-soon]');
  if (musicButton) {
    event.preventDefault();
    const playing = musicButton.classList.toggle('is-playing');
    musicButton.setAttribute('aria-pressed', String(playing));
    return;
  }

  const newCardButton = target.closest('[data-new-card]');
  if (newCardButton) {
    event.preventDefault();
    closeHubMenu({ restoreFocus: false, silent: true });
    hub.newCardRequested = true;
    navigate('studio/deck');
    return;
  }

  const studioButton = target.closest('[data-open-studio]');
  if (studioButton) {
    event.preventDefault();
    closeHubMenu({ restoreFocus: false, silent: true });
    navigate(`studio/${studioButton.dataset.openStudio || 'deck'}`);
    return;
  }

  if (target.closest('[data-open-favorite]')) {
    event.preventDefault();
    const card = favoriteCard();
    if (card) openCatalogCard(card.id);
    return;
  }

  const shopPack = target.closest('[data-shop-pack-open]');
  if (shopPack) {
    if (Date.now() < shopPlaygroundSuppressClick) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    openShopPackView(shopPack.dataset.shopPackOpen);
    return;
  }

  if (target.closest('[data-shop-pack-close]')) {
    event.preventDefault();
    closeShopPackView();
    return;
  }

  if (target.closest('#shop-pack-contents-btn')) {
    event.preventDefault();
    setShopPackContentsOpen(hub.els.shopPackContents ? hub.els.shopPackContents.hidden : false);
    return;
  }

  if (target.closest('[data-shop-pack-contents-close]')) {
    event.preventDefault();
    setShopPackContentsOpen(false);
    return;
  }

  if (target.closest('#shop-pack-open')) {
    event.preventDefault();
    openBoosterFromDetail();
    return;
  }

  if (target.closest('#shop-pack-save')) {
    event.preventDefault();
    claimBoosterPack();
    renderShopPackDetail();
    return;
  }

  const boosterSet = target.closest('[data-booster-set]');
  if (boosterSet) {
    event.preventDefault();
    if (hubBooster.picks.length) return;
    hubBooster.setId = boosterSet.dataset.boosterSet;
    persistBooster();
    renderBooster();
    return;
  }

  if (target.closest('#booster-open')) {
    event.preventDefault();
    openBoosterPack();
    return;
  }

  if (target.closest('#booster-claim')) {
    event.preventDefault();
    claimBoosterPack();
    return;
  }

  if (target.closest('[data-pack-close]')) {
    event.preventDefault();
    closePackOverlay();
    return;
  }

  // Interacción con sobre sellado
  if (target.closest('#pack-seal') || target.closest('#pack-seal-trigger-btn')) {
    event.preventDefault();
    triggerPackRip();
    return;
  }

  // Interacción con carta en teatro / siguiente carta (Pokémon Pocket style)
  if (target.closest('#pack-theater-card') || target.closest('#pack-theater-next')) {
    event.preventDefault();
    nextTheaterCard();
    return;
  }

  if (target.closest('#pack-theater-prev')) {
    event.preventDefault();
    prevTheaterCard();
    return;
  }

  if (target.closest('#pack-toggle-view')) {
    event.preventDefault();
    togglePackView();
    return;
  }

  const plazaScopeBtn = target.closest('[data-plaza-scope]');
  if (plazaScopeBtn) {
    event.preventDefault();
    setPlazaScope(plazaScopeBtn.dataset.plazaScope);
    hub.explorePlazaStep = 'feed';
    renderExplore();
    if (window.Sound) window.Sound.play('flip');
    return;
  }

  if (target.closest('#pack-reveal-all')) {
    event.preventDefault();
    revealAllPackCards();
    return;
  }

  if (target.closest('[data-pack-to-shop]')) {
    event.preventDefault();
    claimBoosterPackSilently();
    closePackOverlay();
    navigate('booster');
    return;
  }

  if (target.closest('[data-pack-to-inventory]')) {
    event.preventDefault();
    claimBoosterPackSilently();
    closePackOverlay();
    navigate('collections');
    return;
  }

  if (target.closest('[data-pack-to-home]')) {
    event.preventDefault();
    claimBoosterPackSilently();
    closePackOverlay();
    navigate('home');
    return;
  }

  if (target.closest('#pack-save')) {
    event.preventDefault();
    claimBoosterPack();
    return;
  }

  if (target.closest('[data-viewer-close]')) {
    event.preventDefault();
    closeCardViewer();
    return;
  }

  if (target.closest('[data-viewer-details]')) {
    event.preventDefault();
    setViewerCinema(!hub.viewerCinema);
    return;
  }

  if (target.closest('[data-viewer-flip]') || target.closest('#card-viewer-card')) {
    event.preventDefault();
    flipViewerCard();
    return;
  }

  const viewCard = target.closest('[data-view-card]');
  if (viewCard) {
    event.preventDefault();
    openCardViewer(viewCard.dataset.viewCard, viewCard);
    return;
  }

  const viewPreset = target.closest('[data-view-preset]');
  if (viewPreset) {
    event.preventDefault();
    const preset = Array.isArray(presets)
      ? presets.find((entry) => entry.id === viewPreset.dataset.viewPreset)
      : null;
    if (preset) openCardViewer(presetViewerCard(preset), viewPreset);
    return;
  }

  const exploreCreator = target.closest('[data-explore-creator]');
  if (exploreCreator) {
    event.preventDefault();
    hub.exploreCreatorId = exploreCreator.dataset.exploreCreator;
    hub.explorePackId = null;
    renderExplore();
    return;
  }

  const explorePack = target.closest('[data-explore-pack]');
  if (explorePack) {
    event.preventDefault();
    hub.explorePackId = explorePack.dataset.explorePack;
    renderExplore();
    return;
  }

  const exploreOpen = target.closest('[data-explore-open-pack]');
  if (exploreOpen) {
    event.preventDefault();
    hubBooster.setId = exploreOpen.dataset.exploreOpenPack;
    persistBooster();
    navigate('booster');
    return;
  }

  if (target.closest('[data-explore-plaza]')) {
    event.preventDefault();
    hub.explorePlazaStep = 'picker';
    hub.exploreCreatorId = null;
    hub.explorePackId = null;
    renderExplore();
    if (window.Sound) window.Sound.play('flip');
    return;
  }

  if (target.closest('[data-explore-plaza-back]')) {
    event.preventDefault();
    hub.explorePlazaStep = null;
    renderExplore();
    return;
  }

  if (target.closest('[data-plaza-feed-back]')) {
    event.preventDefault();
    hub.explorePlazaStep = 'picker';
    renderExplore();
    return;
  }

  if (target.closest('[data-explore-creators-back]')) {
    event.preventDefault();
    hub.exploreCreatorId = null;
    hub.explorePackId = null;
    renderExplore();
    return;
  }

  if (target.closest('[data-explore-packs-back]')) {
    event.preventDefault();
    hub.explorePackId = null;
    renderExplore();
    return;
  }

  const explorerMode = target.closest('[data-explorer-mode]');
  if (explorerMode) {
    event.preventDefault();
    hub.explorerShowcase = false;
    setExplorerMode(explorerMode.dataset.explorerMode || 'album', { redrawGacha: true, force: true });
    return;
  }

  const explorerArrow = target.closest('[data-explorer-nav]');
  if (explorerArrow) {
    event.preventDefault();
    stepExplorer(Number(explorerArrow.dataset.explorerNav) || 1);
    return;
  }

  const explorerDot = target.closest('[data-explorer-dot]');
  if (explorerDot) {
    event.preventDefault();
    hub.explorerShowcase = false;
    hub.explorerIndex = Number(explorerDot.dataset.explorerDot) || 0;
    renderExplorerCarousel();
    return;
  }

  const explorerFilter = target.closest('[data-explorer-filter]');
  if (explorerFilter) {
    event.preventDefault();
    setExplorerFilter(explorerFilter.dataset.explorerFilter);
    return;
  }

  if (target.closest('#hub-lang-toggle')) {
    event.preventDefault();
    setHubLangMenu(hub.els.langMenu ? hub.els.langMenu.hidden : false);
    return;
  }

  const langButton = target.closest('[data-hub-lang]');
  if (langButton) {
    applyLanguage(langButton.dataset.hubLang);
    setHubLangMenu(false, { restoreFocus: true });
    return;
  }

  if (target.closest('[data-new-deck]')) {
    openDeckDialog();
    return;
  }

  const libraryTab = target.closest('[data-library-tab]');
  if (libraryTab) {
    setLibraryTab(libraryTab.dataset.libraryTab);
    return;
  }

  const favoriteButton = target.closest('[data-fav-card]');
  if (favoriteButton) {
    setFavoriteCard(favoriteButton.dataset.favCard);
    return;
  }

  const openCard = target.closest('[data-open-card]');
  if (openCard) {
    openCatalogCard(openCard.dataset.openCard);
    return;
  }

  const openPreset = target.closest('[data-open-preset]');
  if (openPreset) {
    openSavedPreset(openPreset.dataset.openPreset);
    return;
  }

  const deletePreset = target.closest('[data-delete-preset]');
  if (deletePreset) {
    removeSavedPreset(deletePreset.dataset.deletePreset);
    return;
  }

  const collection = target.closest('[data-collection-id]');
  if (collection) {
    navigate(`collections/${collection.dataset.collectionId}`);
    return;
  }

  const deck = target.closest('[data-deck-id]');
  if (deck) {
    navigate(`collections/deck/${deck.dataset.deckId}`);
    return;
  }

  if (target.closest('[data-collection-back]') || target.closest('[data-deck-back]')) {
    navigate('collections');
    return;
  }

  if (target.closest('[data-deck-cover-open]')) {
    event.preventDefault();
    openDeckCoverDialog();
    return;
  }

  const deckCoverCard = target.closest('[data-deck-cover-card]');
  if (deckCoverCard) {
    event.preventDefault();
    setDeckCoverCard(deckCoverCard.dataset.deckCoverCard);
    return;
  }

  if (target.closest('#deck-cover-cancel')) {
    event.preventDefault();
    if (hub.els.deckCoverDialog) hub.els.deckCoverDialog.close();
    return;
  }

  const deckView = target.closest('[data-deck-view]');
  if (deckView) {
    event.preventDefault();
    setDeckPoolView(deckView.dataset.deckView);
    return;
  }

  const deckZone = target.closest('[data-deck-zone-tab]');
  if (deckZone) {
    event.preventDefault();
    hub.deckZone = deckZone.dataset.deckZoneTab === 'side' ? 'side' : 'main';
    renderDeckDetail();
    return;
  }

  const addDeckCard = target.closest('[data-deck-add-card]');
  if (addDeckCard) {
    event.preventDefault();
    addDeckCardToZone(addDeckCard.dataset.deckAddCard, hub.deckZone);
    return;
  }

  const deckQty = target.closest('[data-deck-qty]');
  if (deckQty) {
    event.preventDefault();
    changeDeckCardQty(
      deckQty.dataset.deckCard,
      deckQty.dataset.deckZone || hub.deckZone,
      Number(deckQty.dataset.deckQty) || 0
    );
    return;
  }

  const removeCard = target.closest('[data-deck-remove-card]');
  if (removeCard) {
    removeDeckCard(removeCard.dataset.deckRemoveCard, removeCard.dataset.deckZone || hub.deckZone);
    return;
  }

  const deleteDeckButton = target.closest('[data-deck-delete]');
  if (deleteDeckButton) {
    deleteDeck(deleteDeckButton.dataset.deckDelete);
  }
}

async function removeSavedPreset(presetId) {
  const preset = Array.isArray(presets) ? presets.find((entry) => entry.id === presetId) : null;
  if (!preset) return;

  const confirmed = await confirmAction({
    title: t('delete_preset'),
    message: preset.name,
    confirmLabel: t('delete_preset')
  });
  if (!confirmed) return;

  deletePreset(presetId);
  renderLibrary();
  renderHubStats(false);
}

/* --------------------------------------------------------------------------
   Carta del inicio: clic para voltear, arrastre para inspeccionar los bordes.
   -------------------------------------------------------------------------- */
const cardGesture = {
  pointerId: null,
  startX: 0,
  startY: 0,
  baseX: 0,
  baseY: 0,
  tiltX: 0,
  tiltY: 0,
  moved: false
};
let cardSuppressClick = false;

function setCardTilt(x, y) {
  cardGesture.tiltX = x;
  cardGesture.tiltY = y;
  if (!hub.els.cardStage) return;
  hub.els.cardStage.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
  hub.els.cardStage.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
}

function setupCardInteraction() {
  const stage = hub.els.cardStage;
  const showcase = hub.els.showcase;
  if (!stage || !showcase) return;

  const DRAG_THRESHOLD = 5;
  const MAX_TILT_X = 30;
  const MAX_TILT_Y = 68;

  function startDrag(event) {
    if (event.target.closest('.hub-layout-grip, [data-layout-grip]')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (cardGesture.pointerId !== null) return;

    cardGesture.pointerId = event.pointerId;
    cardGesture.startX = event.clientX;
    cardGesture.startY = event.clientY;
    cardGesture.baseX = cardGesture.tiltX;
    cardGesture.baseY = cardGesture.tiltY;
    cardGesture.moved = false;
    cardSuppressClick = false;
  }

  function moveDrag(event) {
    if (cardGesture.pointerId === null) {
      /* Inclinación suave al pasar el ratón, sin voltear la carta. */
      if (event.pointerType !== 'mouse' || reduceMotion()) return;
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setCardTilt(-y * 7, x * 9);
      return;
    }

    if (event.pointerId !== cardGesture.pointerId) return;

    const dx = event.clientX - cardGesture.startX;
    const dy = event.clientY - cardGesture.startY;

    if (!cardGesture.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      cardGesture.moved = true;
      showcase.classList.add('is-dragging');
      /* La captura se toma al superar el umbral para no romper el clic. */
      try {
        stage.setPointerCapture(event.pointerId);
      } catch (error) {
        /* Navegadores sin pointer capture: seguimos con el gesto. */
      }
      if (window.Sound) window.Sound.play('flip');
    }

    if (!cardGesture.moved) return;

    const tiltY = Math.max(-MAX_TILT_Y, Math.min(MAX_TILT_Y, cardGesture.baseY + dx * 0.42));
    const tiltX = Math.max(-MAX_TILT_X, Math.min(MAX_TILT_X, cardGesture.baseX - dy * 0.3));
    setCardTilt(tiltX, tiltY);
  }

  function endDrag(event) {
    if (cardGesture.pointerId === null) return;
    if (event && event.pointerId !== cardGesture.pointerId) return;

    const wasDragging = cardGesture.moved;
    const pointerId = cardGesture.pointerId;
    cardGesture.pointerId = null;
    cardGesture.moved = false;
    showcase.classList.remove('is-dragging');

    if (wasDragging) {
      setCardTilt(0, 0);
      cardSuppressClick = true;
      window.setTimeout(() => {
        cardSuppressClick = false;
      }, 350);
      if (window.Sound) window.Sound.play('cardSettle');
    }

    if (stage.hasPointerCapture && stage.hasPointerCapture(pointerId)) {
      try {
        stage.releasePointerCapture(pointerId);
      } catch (error) {
        /* La captura ya se liberó. */
      }
    }
  }

  stage.addEventListener('pointerdown', startDrag);
  stage.addEventListener('pointermove', moveDrag);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', () => {
    if (cardGesture.pointerId === null) {
      setCardTilt(0, 0);
      return;
    }
    /* Salió antes de superar el umbral: el gesto se cancela, no queda colgado. */
    if (!cardGesture.moved) endDrag();
  });
  stage.addEventListener('dragstart', (event) => event.preventDefault());
}

function setupHubEvents() {
  if (!hub.root) return;

  hub.root.addEventListener('click', onHubClick);
  hub.root.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof Element && target.matches('[data-deck-pool-search]')) {
      hub.deckPoolSearch = target.value;
      applyDeckPoolFilters();
    }
  });

  hub.root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches('[data-deck-copy-limit]')) {
      setDeckCopyLimit(target.value);
    } else if (target.matches('[data-deck-side-name]')) {
      renameDeckSide(target.value);
    } else if (target.matches('[data-deck-pool-filter]')) {
      hub.deckPoolCollection = target.value;
      applyDeckPoolFilters();
    }
  });

  /* Intención de entrar al estudio: adelanta Three.js mientras se mueve el
     cursor o se toca el botón, sin cargarlo en la visita normal al lobby. */
  const prefetchStudio = (event) => {
    if (threeLoadPromise || (window.THREE && window.THREE.OrbitControls)) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-open-studio], [data-open-favorite], [data-open-card], [data-open-preset]')) {
      ensureThree().catch(() => {});
    }
  };
  hub.root.addEventListener('pointerover', prefetchStudio, { passive: true });
  hub.root.addEventListener('touchstart', prefetchStudio, { passive: true });
  hub.root.addEventListener('focusin', prefetchStudio);

  if (hub.els.card) {
    let lastCardTap = 0;
    hub.els.card.addEventListener('click', () => {
      /* Un arrastre no debe voltear la carta al soltar. */
      if (cardSuppressClick) {
        cardSuppressClick = false;
        return;
      }
      const now = performance.now();
      if (now - lastCardTap < 340) {
        lastCardTap = 0;
        hub.els.card.classList.remove('is-flipped');
        hub.els.card.setAttribute('aria-pressed', 'false');
        openCardViewer(hubProfile.favoriteCardId, hub.els.card);
        return;
      }
      lastCardTap = now;
      const flipped = hub.els.card.classList.toggle('is-flipped');
      hub.els.card.setAttribute('aria-pressed', String(flipped));
      if (window.Sound) window.Sound.play('flip');
    });
  }

  setupCardInteraction();

  /* Deslizar la carta principal alterna entre las cartas de la mano. */
  if (hub.els.showcase) {
    let touchX = 0;
    let touchY = 0;
    let tracking = false;

    hub.els.showcase.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;
        touchX = event.touches[0].clientX;
        touchY = event.touches[0].clientY;
        tracking = true;
      },
      { passive: true }
    );

    hub.els.showcase.addEventListener(
      'touchend',
      (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches[0];
        if (!touch) return;
        const dx = touch.clientX - touchX;
        const dy = touch.clientY - touchY;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        cycleHand(dx < 0 ? 1 : -1);
      },
      { passive: true }
    );
  }

  if (hub.els.menuBtn) {
    hub.els.menuBtn.addEventListener('click', () => openHubMenu(hub.els.menuBtn));
  }

  [hub.els.playerStackEdit, hub.els.mobileHandEdit].forEach((button) => {
    if (button) button.addEventListener('click', openHandDialog);
  });

  if (hub.els.handPicker) {
    hub.els.handPicker.addEventListener('click', (event) => {
      const set = event.target.closest('[data-hand-set]');
      if (set) {
        hub.handSetId = set.dataset.handSet;
        renderHandPicker();
        return;
      }
      if (event.target.closest('[data-hand-back]')) {
        hub.handSetId = null;
        renderHandPicker();
        return;
      }
      const option = event.target.closest('[data-hand-pick]');
      if (option) toggleHandPick(option.dataset.handPick);
    });
  }

  if (hub.els.handForm) {
    hub.els.handForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveHand();
    });
  }

  if (hub.els.handCancel && hub.els.handDialog) {
    hub.els.handCancel.addEventListener('click', () => hub.els.handDialog.close());
  }

  if (hub.els.handClear) {
    hub.els.handClear.addEventListener('click', clearHand);
  }

  if (hub.els.handUndo) {
    hub.els.handUndo.addEventListener('click', undoHand);
  }

  if (hub.els.cardInfo) {
    hub.els.cardInfo.addEventListener('click', openCardDetails);
  }

  Array.from(hub.root.querySelectorAll('[data-menu-close]')).forEach((node) => {
    node.addEventListener('click', () => closeHubSheet());
  });

  if (hub.els.explorerCarousel) {
    hub.els.explorerCarousel.addEventListener('keydown', (event) => {
      if (event.target !== hub.els.explorerCarousel) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      stepExplorer(event.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  /* Las hojas solo existen en móvil: al cruzar el breakpoint se cierran. */
  window.addEventListener('resize', () => {
    if (window.innerWidth > 980 && hub.activeSheet) {
      closeHubSheet({ restoreFocus: false, instant: true });
    }
  });

  window.addEventListener('popstate', applyRoute);
  window.addEventListener('hashchange', () => {
    hub.lastRoute = '';
    applyRoute();
  });

  window.addEventListener('cardgram:exported', () => {
    recordRenderExport();
  });

  if (hub.els.profileForm) {
    hub.els.profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      saveProfile();
    });
  }

  if (hub.els.profileBio) {
    hub.els.profileBio.addEventListener('input', updateBioCount);
  }

  if (hub.els.btnAvatarUpload && hub.els.avatarInput) {
    hub.els.btnAvatarUpload.addEventListener('click', () => hub.els.avatarInput.click());
    hub.els.avatarInput.addEventListener('change', () => {
      const file = hub.els.avatarInput.files && hub.els.avatarInput.files[0];
      hub.els.avatarInput.value = '';
      if (file) handleAvatarFile(file);
    });
  }

  if (hub.els.btnAvatarRemove) {
    hub.els.btnAvatarRemove.addEventListener('click', () => {
      hub.draftAvatar = null;
      applyAvatar(hub.els.profileAvatar, hub.els.profileAvatarImg, null);
      hub.els.btnAvatarRemove.disabled = true;
    });
  }

  if (hub.els.btnNewDeck) hub.els.btnNewDeck.addEventListener('click', openDeckDialog);
  if (hub.els.btnNewDeck2) hub.els.btnNewDeck2.addEventListener('click', openDeckDialog);

  if (hub.els.deckForm) {
    hub.els.deckForm.addEventListener('submit', (event) => {
      event.preventDefault();
      createDeckFromForm();
    });
  }

  if (hub.els.deckCoverUpload) {
    hub.els.deckCoverUpload.addEventListener('change', () => {
      const file = hub.els.deckCoverUpload.files && hub.els.deckCoverUpload.files[0];
      hub.els.deckCoverUpload.value = '';
      if (file) uploadDeckCover(file);
    });
  }

  /* Deck boxes personalizados (PNG/WEBP transparente recomendado). */
  if (hub.els.uploadDeckBox && hub.els.deckBoxUpload) {
    hub.els.uploadDeckBox.addEventListener('click', () => hub.els.deckBoxUpload.click());
    hub.els.deckBoxUpload.addEventListener('change', async () => {
      const files = Array.from(hub.els.deckBoxUpload.files || []).slice(0, 6);
      hub.els.deckBoxUpload.value = '';
      if (!files.length) return;
      try {
        for (const file of files) {
          const dataUrl = await readDeckBoxFile(file);
          if (dataUrl) hubDeckBoxes.push(dataUrl);
        }
        hubDeckBoxes = hubDeckBoxes.slice(-12);
        saveDeckBoxes();
        renderCollections();
        toast(t('collections_upload_box_ok'), { type: 'success' });
      } catch (error) {
        toast(t('upload_failed'), { type: 'error' });
      }
    });
  }

  if (hub.els.deckCoverGrid) {
    hub.els.deckCoverGrid.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-deck-cover-card]');
      if (choice) setDeckCoverCard(choice.dataset.deckCoverCard);
    });
  }

  if (hub.els.deckCoverCancel) {
    hub.els.deckCoverCancel.addEventListener('click', () => {
      if (hub.els.deckCoverDialog) hub.els.deckCoverDialog.close();
    });
  }

  if (hub.els.homeDrawBtn) hub.els.homeDrawBtn.addEventListener('click', () => drawHomeHand());
  if (hub.els.homeDeckStack) hub.els.homeDeckStack.addEventListener('click', drawHomeDeckCard);
  if (hub.els.homeDropArea) hub.els.homeDropArea.addEventListener('click', addHomeLooseCard);
  if (hub.els.homeLooseClear) {
    hub.els.homeLooseClear.addEventListener('click', () => {
      hubHome.loose = [];
      saveHome();
      renderHomeTable();
    });
  }

  const drawSource = document.getElementById('home-draw-source');
  if (drawSource) {
    drawSource.addEventListener('change', () => {
      hubHome.drawSource = drawSource.value;
      hubHome.drawCursor = 0;
      hubHome.handIds = [];
      drawHomeHand({ silent: true });
    });
  }
  const drawCount = document.getElementById('home-draw-count');
  if (drawCount) {
    drawCount.addEventListener('change', () => {
      hubHome.drawCount = Math.min(5, Math.max(1, Number(drawCount.value) || 3));
      drawHomeHand({ silent: true });
    });
  }
  const deckSource = document.getElementById('home-deck-source');
  if (deckSource) {
    deckSource.addEventListener('change', () => {
      hubHome.deckSource = deckSource.value;
      hubHome.dropCardId = null;
      saveHome();
      renderHomeTable();
    });
  }
  const backSource = document.getElementById('home-back-source');
  if (backSource) {
    backSource.addEventListener('change', () => {
      hubHome.backSrc = backSource.value;
      saveHome();
      renderFeaturedStack();
      renderHomeTable();
    });
  }

  if (hub.els.deckCancel) {
    hub.els.deckCancel.addEventListener('click', () => hub.els.deckDialog.close());
  }

  if (hub.els.deckDialog) {
    hub.els.deckDialog.addEventListener('click', (event) => {
      if (event.target === hub.els.deckDialog) hub.els.deckDialog.close();
    });
  }

  if (hub.els.btnHomeHub) {
    hub.els.btnHomeHub.addEventListener('click', () => navigate('home'));
  }

  if (hub.els.btnHomeHubFloating) {
    hub.els.btnHomeHubFloating.addEventListener('click', () => navigate('home'));
  }

  if (hub.els.langMenu) {
    hub.els.langMenu.addEventListener('keydown', (event) => {
      const options = Array.from(hub.els.langMenu.querySelectorAll('.hub-lang-option'));
      const index = options.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = options[(index + step + options.length) % options.length];
        if (next) next.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setHubLangMenu(false, { restoreFocus: true });
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!hub.els.langMenu || hub.els.langMenu.hidden) return;
    if (hub.els.lang && hub.els.lang.contains(event.target)) return;
    setHubLangMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !hub.els.langMenu || hub.els.langMenu.hidden) return;
    setHubLangMenu(false, { restoreFocus: true });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (hub.els.packOverlay && !hub.els.packOverlay.hidden) {
      event.preventDefault();
      closePackOverlay();
      return;
    }
    if (!hub.els.viewer || hub.els.viewer.hidden) return;
    event.preventDefault();
    closeCardViewer();
  });

  window.setInterval(updateBoosterClock, 1000);
  // Deshabilitar click derecho en modo escritorio
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Prevenir zoom gestual (pinch to zoom) en modo responsivo
  document.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

}

/* --------------------------------------------------------------------------
   Refresco externo (llamado desde app.js y export.js)
   -------------------------------------------------------------------------- */
function refreshHubData() {
  if (!hub.ready) return;
  renderHubStats(false);
  renderCardExplorer();
  if (hub.panel === 'library') renderLibrary();
  if (hub.panel === 'booster') renderBooster();
  if (hub.panel === 'collections') renderCollections();
  if (hub.panel === 'profile') renderProfileSummary();
}

function refreshHubLocale() {
  if (!hub.ready) return;
  updateLangButtons();
  /* La etiqueta de posición de Azura se escribe desde JS: refrescarla aquí. */
  if (typeof setNpcPosLabel === 'function') setNpcPosLabel('', currentShopNpcPos());
  renderHubIdentity();
  renderFavoriteCard();
  renderHubStats(false);
  renderCollectionRail();
  renderCardExplorer();
  if (hub.panel === 'library') renderLibrary();
  if (hub.panel === 'booster') renderBooster();
  if (hub.panel === 'collections') renderCollections();
  if (hub.panel === 'explore') renderExplore();
  if (hub.panel === 'profile') renderProfileSummary();
  updateBioCount();
}

function recordRenderExport() {
  if (!hub.ready) return;
  hubData.exports = Math.min(999999, (Number(hubData.exports) || 0) + 1);
  hubData.lastRenderAt = Date.now();
  persistHubData();
  renderHubStats(false);
}

/* --------------------------------------------------------------------------
   Cache DOM + arranque
   -------------------------------------------------------------------------- */
function cacheHubDom() {
  const els = hub.els;
  hub.root = hubEl('hub');
  hub.scroll = hubEl('hub-scroll');

  els.lang = hubEl('hub-lang');
  els.langToggle = hubEl('hub-lang-toggle');
  els.langMenu = hubEl('hub-lang-menu');
  els.langCode = hubEl('hub-lang-code');
  els.menuBtn = hubEl('hub-menu-btn');
  els.menu = hubEl('hub-menu-sheet');
  els.menuPanel = document.querySelector('.hub-menu-panel');
  els.menuClose = document.querySelector('.hub-menu-close');
  els.menuStatCards = hubEl('menu-stat-cards');
  els.menuStatCollections = hubEl('menu-stat-collections');
  els.menuStatDecks = hubEl('menu-stat-decks');
  els.menuStatRenders = hubEl('menu-stat-renders');
  els.playerOpen = hubEl('hub-player-open');
  els.menuAvatar = hubEl('hub-menu-avatar');
  els.menuAvatarImg = hubEl('hub-menu-avatar-img');
  els.menuName = hubEl('hub-menu-title');
  els.menuHandle = hubEl('hub-menu-handle');
  els.menuSince = hubEl('hub-menu-since');

  els.cardInfo = hubEl('hub-card-info');
  els.cardTags = hubEl('hub-card-tags');
  els.cardSheet = hubEl('hub-card-sheet');
  els.cardSheetSub = hubEl('hub-card-sheet-sub');
  els.cardSheetChips = hubEl('hub-card-sheet-chips');
  els.cardSheetLore = hubEl('hub-card-sheet-lore');
  els.viewer = hubEl('card-viewer');
  els.viewerCard = hubEl('card-viewer-card');
  els.viewerFront = hubEl('card-viewer-front');
  els.viewerBack = hubEl('card-viewer-back');
  els.viewerName = hubEl('card-viewer-name');
  els.viewerCollection = hubEl('card-viewer-collection');
  els.viewerType = hubEl('card-viewer-type');
  els.viewerChips = hubEl('card-viewer-chips');
  els.viewerLore = hubEl('card-viewer-lore');
  els.viewerObtain = hubEl('card-viewer-obtain');
  els.viewerObtainNote = hubEl('card-viewer-obtain-note');
  els.viewerDetails = hubEl('card-viewer-details');
  els.viewerEdit = hubEl('card-viewer-edit');
  els.viewerClose = document.querySelector('.card-viewer-close');
  els.packOverlay = hubEl('pack-overlay');
  els.packSeal = hubEl('pack-seal');
  els.packSealWrap = hubEl('pack-seal-wrap');
  els.packSealImg = hubEl('pack-seal-img');
  els.packSealName = hubEl('pack-seal-name');
  els.packSealTriggerBtn = hubEl('pack-seal-trigger-btn');
  els.packTheaterWrap = hubEl('pack-theater-wrap');
  els.packTheaterCard = hubEl('pack-theater-card');
  els.packTheaterFront = hubEl('pack-theater-front');
  els.packTheaterPrev = hubEl('pack-theater-prev');
  els.packTheaterNext = hubEl('pack-theater-next');
  els.packCardCounter = hubEl('pack-card-counter');
  els.packStepDots = hubEl('pack-step-dots');
  els.packHeadMeta = hubEl('pack-head-meta');
  els.packToggleView = hubEl('pack-toggle-view');
  els.packToggleViewText = hubEl('pack-toggle-view-text');
  els.packRevealGrid = hubEl('pack-reveal-grid');
  els.packRevealAll = hubEl('pack-reveal-all');
  els.packSave = hubEl('pack-save');
  els.packEndActions = hubEl('pack-end-actions');
  els.shopPackViewMeterBar = hubEl('shop-pack-view-meter-bar');
  els.plazaScopeGrid = hubEl('plaza-scope-grid');
  els.plazaFeedLocal = hubEl('plaza-feed-local');
  els.plazaFeedGeneral = hubEl('plaza-feed-general');
  els.topName = hubEl('hub-profile-name');
  els.topHandle = hubEl('hub-profile-handle');
  els.avatar = hubEl('hub-avatar');
  els.avatarImg = hubEl('hub-avatar-img');
  els.greetingName = hubEl('hub-greeting-name');

  els.playerAvatar = hubEl('hub-player-avatar');
  els.playerAvatarImg = hubEl('hub-player-avatar-img');
  els.playerName = hubEl('hub-player-name');
  els.playerHandle = hubEl('hub-player-handle');
  els.playerBio = hubEl('hub-player-bio');
  els.playerSince = hubEl('hub-player-since');
  els.playerStack = hubEl('hub-player-stack');
  els.playerSummary = hubEl('hub-player-summary');
  els.mobileDataPlayer = hubEl('hub-mobile-data-player');
  els.mobileDataCollection = hubEl('hub-mobile-data-collection');
  els.playerStackEdit = hubEl('hub-player-stack-edit');
  els.mobileHandEdit = hubEl('hub-mobile-hand-edit');
  els.homeFab = hubEl('hub-home-fab');
  els.handDeck = hubEl('hub-hand-deck');
  els.handDialog = hubEl('hand-dialog');
  els.handForm = hubEl('hand-form');
  els.handPicker = hubEl('hand-picker');
  els.handCount = hubEl('hand-count');
  els.handSave = hubEl('hand-save');
  els.handCancel = hubEl('hand-cancel');
  els.handClear = hubEl('hand-clear');
  els.handUndo = hubEl('hand-undo');

  els.showcase = hubEl('hub-showcase');
  els.card = hubEl('hub-card');
  els.cardFront = hubEl('hub-card-front');
  els.cardBack = hubEl('hub-card-back');
  els.cardStage = hubEl('hub-card-stage');
  els.cardName = hubEl('hub-card-name');
  els.cardSub = hubEl('hub-card-sub');
  els.cardChips = hubEl('hub-card-chips');

  els.collectionRail = hubEl('hub-collection-rail');

  els.explorerFilters = hubEl('hub-explorer-filters');
  els.explorerPanel = document.querySelector('.hub-explorer-panel');
  els.explorerModes = hubEl('hub-explorer-modes');
  els.explorerCarousel = hubEl('hub-explorer-carousel');
  els.explorerSpotlight = hubEl('hub-explorer-spotlight');
  els.explorerDots = hubEl('hub-explorer-dots');
  els.explorerAlbum = hubEl('hub-explorer-album');
  els.explorerAlbumGrid = hubEl('hub-explorer-album-grid');
  els.explorerGacha = hubEl('hub-explorer-gacha');
  els.explorerHand = hubEl('hub-explorer-hand');
  els.explorerGrid = hubEl('hub-explorer-grid');
  els.explorerPrev = document.querySelector('[data-explorer-nav="-1"]');
  els.explorerNext = document.querySelector('[data-explorer-nav="1"]');

  els.boosterPanel = document.querySelector('[data-hub-panel="booster"]');
  els.shopRecommended = hubEl('shop-recommended');
  els.shopNpcA = hubEl('shop-npc-a');
  els.shopNpcB = hubEl('shop-npc-b');
  els.shopSpeech = hubEl('shop-speech-text');
  els.shopBg = document.querySelector('.shop-bg');
  els.shopMoodEmoji = hubEl('shop-mood-emoji');
  els.shopMood = hubEl('shop-mood');
  els.shopShift = hubEl('shop-shift');
  els.shopReset = hubEl('shop-reset');
  els.shopPackPercent = hubEl('shop-pack-percent');
  els.shopRareCards = hubEl('shop-rare-cards');
  els.shopStores = hubEl('shop-stores');
  els.shopDaysCount = hubEl('shop-days-count');
  els.shopPackView = hubEl('shop-pack-view');
  els.shopPackViewImg = hubEl('shop-pack-view-img');
  els.shopPackViewName = hubEl('shop-pack-view-name');
  els.shopPackViewPercent = hubEl('shop-pack-view-percent');
  els.shopPackViewCards = hubEl('shop-pack-view-cards');
  els.shopPackViewReveal = hubEl('shop-pack-view-reveal');
  els.shopPackViewHint = hubEl('shop-pack-view-hint');
  els.shopPackContents = hubEl('shop-pack-contents');
  els.shopPackContentsBtn = hubEl('shop-pack-contents-btn');
  els.shopPackOpen = hubEl('shop-pack-open');
  els.shopPackSave = hubEl('shop-pack-save');
  els.mobileDaily = hubEl('hub-mobile-daily');
  els.brandPack = hubEl('hub-brand-pack');
  els.brandPackBadge = hubEl('hub-brand-pack-badge');
  els.boosterStreakValue = hubEl('booster-streak-value');
  els.boosterStreakLabel = hubEl('booster-streak-label');
  els.boosterStatusTitle = hubEl('booster-status-title');
  els.boosterStatusCopy = hubEl('booster-status-copy');
  els.boosterProgress = hubEl('booster-progress');
  els.boosterSets = hubEl('booster-sets');
  els.boosterPackTitle = hubEl('booster-pack-title');
  els.boosterPackChip = hubEl('booster-pack-chip');
  els.boosterCards = hubEl('booster-cards');
  els.boosterOpen = hubEl('booster-open');
  els.boosterClaim = hubEl('booster-claim');
  els.boosterHint = hubEl('booster-hint');

  els.statCards = hubEl('stat-cards');
  els.statCardsSub = hubEl('stat-cards-sub');
  els.statCollections = hubEl('stat-collections');
  els.statCollectionsSub = hubEl('stat-collections-sub');
  els.statReview = hubEl('stat-review');
  els.statReviewSub = hubEl('stat-review-sub');
  els.statDecks = hubEl('stat-decks');
  els.statDecksSub = hubEl('stat-decks-sub');
  els.statRenders = hubEl('stat-renders');

  els.libraryTabs = hubEl('library-tabs');
  els.libraryGrid = hubEl('library-grid');
  els.libraryCount = hubEl('library-count');
  els.libraryEmpty = hubEl('library-empty');
  els.libraryEmptyTitle = hubEl('library-empty-title');
  els.libraryEmptyDesc = hubEl('library-empty-desc');
  els.libraryEmptyAction = hubEl('library-empty-action');

  els.collectionsOverview = hubEl('collections-overview');
  els.collectionsGrid = hubEl('collections-grid');
  els.ownedGrid = hubEl('owned-grid');
  els.ownedEmpty = hubEl('owned-empty');
  els.createdGrid = hubEl('created-grid');
  els.createdEmpty = hubEl('created-empty');
  els.decksGrid = hubEl('decks-grid');
  els.decksEmpty = hubEl('decks-empty');
  els.collectionDetail = hubEl('collection-detail');
  els.collectionDetailHead = hubEl('collection-detail-head');
  els.collectionDetailGrid = hubEl('collection-detail-grid');
  els.collectionsBack = hubEl('collections-view-back');
  els.deckDetail = hubEl('deck-detail');
  els.deckDetailBody = hubEl('deck-detail-body');
  els.btnNewDeck = hubEl('btn-new-deck');
  els.btnNewDeck2 = hubEl('btn-new-deck-2');
  els.uploadDeckBox = hubEl('upload-deck-box');
  els.deckBoxUpload = hubEl('deck-box-upload');

  els.exploreCreators = hubEl('explore-creators');
  els.explorePlazaEntryBlock = hubEl('explore-plaza-entry-block');
  els.explorePlazaList = hubEl('explore-plaza-list');
  els.explorePlazaPickerBlock = hubEl('explore-plaza-picker-block');
  els.explorePlazaFeedBlock = hubEl('explore-plaza-feed-block');
  els.exploreWantMore = document.querySelector('.explore-want-more');
  els.exploreRoadmap = document.querySelector('.explore-roadmap');
  els.exploreCreatorsBlock = hubEl('explore-creators-block');
  els.exploreAboutBlock = hubEl('explore-about-block');
  els.exploreAboutList = hubEl('explore-about-list');
  els.explorePacksBlock = hubEl('explore-packs-block');
  els.explorePacks = hubEl('explore-packs');
  els.explorePackDetail = hubEl('explore-pack-detail');
  els.explorePackHead = hubEl('explore-pack-detail-head');
  els.explorePackCards = hubEl('explore-pack-cards');
  els.explorePackCount = hubEl('explore-pack-count');

  els.profileForm = hubEl('profile-form');
  els.profileName = hubEl('profile-name');
  els.profileHandle = hubEl('profile-handle');
  els.profileBio = hubEl('profile-bio');
  els.profileBioCount = hubEl('profile-bio-count');
  els.profileFavorite = hubEl('profile-favorite');
  els.profileAvatar = hubEl('profile-avatar');
  els.profileAvatarImg = hubEl('profile-avatar-img');
  els.avatarInput = hubEl('avatar-file-input');
  els.btnAvatarUpload = hubEl('btn-avatar-upload');
  els.btnAvatarRemove = hubEl('btn-avatar-remove');
  els.profileStatCards = hubEl('profile-stat-cards');
  els.profileStatCollections = hubEl('profile-stat-collections');
  els.profileStatReview = hubEl('profile-stat-review');
  els.profileStatDecks = hubEl('profile-stat-decks');
  els.profileStatRenders = hubEl('profile-stat-renders');
  els.profileMemberSince = hubEl('profile-member-since');

  els.deckDialog = hubEl('deck-dialog');
  els.deckForm = hubEl('deck-form');
  els.deckName = hubEl('deck-name');
  els.deckEmojiOptions = hubEl('deck-emoji-options');
  els.deckCancel = hubEl('deck-dialog-cancel');
  els.deckCoverDialog = hubEl('deck-cover-dialog');
  els.deckCoverGrid = hubEl('deck-cover-grid');
  els.deckCoverUpload = hubEl('deck-cover-upload');
  els.deckCoverCancel = hubEl('deck-cover-cancel');

  els.btnHomeHub = hubEl('btn-home-hub');
  els.btnHomeHubFloating = hubEl('btn-home-hub-floating');
  els.flowerMenu = hubEl('flower-menu');
  els.homeDrawBtn = hubEl('home-draw-btn');
  els.homeDrawLabel = hubEl('home-draw-label');
  els.homeDeckStack = hubEl('home-deck-stack');
  els.homeDeckFace = hubEl('home-deck-face');
  els.homeDeckCount = hubEl('home-deck-count');
  els.homeDeckSourceLabel = hubEl('home-deck-source-label');
  els.homeDropArea = hubEl('home-drop-area');
  els.homeLooseLayer = hubEl('home-loose-layer');
  els.homeLooseClear = hubEl('home-loose-clear');
}

function setupHub() {
  cacheHubDom();
  if (!hub.root) return;

  loadHubState();
  loadDeckBoxes();
  buildProfileFavoriteOptions();
  setupHubEvents();
  setupCardRatios();
  setupLayoutEditor();
  initHomeTable();

  hub.ready = true;
  updateLangButtons();
  renderHubIdentity();
  renderFavoriteCard();
  renderHubStats(true);
  setupMobileData();
  renderCollectionRail();
  renderCardExplorer();
  renderHomeTable();
  syncMobileDailyButton();
  renderBooster();
  setLibraryTab('all', { render: false });
  renderProfileForm();
  renderHubStats(false);
  refreshCardRatios();
  warmThreeInIdle();
}

window.addEventListener('load', () => {
  if (!location.hash) {
    try {
      history.replaceState({ route: 'home' }, '', '#/home');
    } catch (error) {
      /* El archivo local puede bloquear replaceState. */
    }
  }
});

/* ==========================================================================
   DESKTOP SHOP PLAYGROUND ENGINE (V4 DEFINITIVO: PERSISTENCIA, CAPTURING CLICK Y REBOTE REAL)
   - Boosters (.shop-pack), Azura (.shop-npc) y Tienda (.shop-stores)
   - Los boosters NO se resetean al soltarlos (estado persistido por ID de colección)
   - Captura de click en fase de captura (evita que el clic abra el sobre tras arrastrar)
   - Cero lecturas DOM en bucle durante arrastre para máxima fluidez
   - Rebote elástico en paredes y paredes infranqueables
   ========================================================================== */
const shopPlaygroundStateByKey = new Map();
let shopPlaygroundSuppressClick = 0;

function isShopDesktop() {
  return window.matchMedia('(min-width: 981px)').matches;
}

function getPlaygroundKey(el) {
  if (el.classList.contains('shop-npc')) return 'npc';
  if (el.classList.contains('shop-stores') || el.id === 'shop-stores') return 'stores';
  if (el.dataset.shopPackOpen) return `pack:${el.dataset.shopPackOpen}`;
  return el.id || el.className;
}

function getPlaygroundState(el) {
  const key = getPlaygroundKey(el);
  if (!shopPlaygroundStateByKey.has(key)) {
    shopPlaygroundStateByKey.set(key, {
      x: 0,
      y: 0,
      scale: 1,
      vx: 0,
      vy: 0,
      rot: 0,
      rotV: 0,
      animId: null,
      isDragging: false,
      hasMoved: false,
      minX: -9999,
      maxX: 9999,
      minY: -9999,
      maxY: 9999
    });
  }
  return shopPlaygroundStateByKey.get(key);
}

function applyPlaygroundTransform(el, state) {
  const rot = state.rot ? ` rotate(${state.rot.toFixed(2)}deg)` : '';
  if (el.classList.contains('shop-npc')) {
    /* Azura se desplaza en horizontal y cambia de tamaño solo con el slider. */
    el.style.setProperty('transform', `translateX(calc(-50% + ${state.x}px)) scale(${state.scale})`, 'important');
  } else if (el.classList.contains('shop-stores')) {
    el.style.setProperty('transform', `translate(${state.x}px, calc(-50% + ${state.y}px))${rot} scale(${state.scale})`, 'important');
  } else {
    el.style.setProperty('transform', `translate3d(${state.x}px, ${state.y}px, 0)${rot} scale(${state.scale})`, 'important');
  }
}

function showPlaygroundScaleBadge(el, scale) {
  let badge = el.querySelector('.playground-scale-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'playground-scale-badge';
    el.appendChild(badge);
  }
  badge.textContent = `${Math.round(scale * 100)}%`;
  badge.classList.add('is-visible');
  clearTimeout(el._scaleTimer);
  el._scaleTimer = setTimeout(() => {
    badge.classList.remove('is-visible');
  }, 900);
}

function attachShopPlayground(el) {
  if (!el || el._hasPlaygroundAttached) {
    // Si ya tiene listener pero es un nuevo elemento re-renderizado, restaurar su estado persistido
    if (el) {
      const state = getPlaygroundState(el);
      if (state.x !== 0 || state.y !== 0 || state.scale !== 1) {
        applyPlaygroundTransform(el, state);
      }
    }
    return;
  }
  el._hasPlaygroundAttached = true;

  const state = getPlaygroundState(el);

  // Restaurar posición si ya existía en memoria
  if (state.x !== 0 || state.y !== 0 || state.scale !== 1) {
    applyPlaygroundTransform(el, state);
  }

  // Evitar arrastre nativo de imágenes HTML5
  el.addEventListener('dragstart', (e) => e.preventDefault());

  // CAPTURA DE CLIC: Bloquear clic en fase de captura si el usuario estuvo arrastrando
  el.addEventListener('click', (e) => {
    if (state.hasMoved || Date.now() < shopPlaygroundSuppressClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      return false;
    }
  }, true); // Capturing!

  el.addEventListener('pointerdown', (e) => {
    if (!isShopDesktop()) return;
    if (e.button !== 0) return; // Solo clic izquierdo

    const scene = document.querySelector('.shop-scene');
    if (!scene) return;

    if (state.animId) {
      cancelAnimationFrame(state.animId);
      state.animId = null;
    }
    state.vx = 0;
    state.vy = 0;
    state.isDragging = false;
    state.hasMoved = false;

    /* Azura se arrastra en horizontal dentro del escenario; su tamaño
       solo cambia con el slider del botón integrado. */
    const isNpc = el.classList.contains('shop-npc');

    // Calcular límites de la escena de una sola vez
    {
      const sRect = scene.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const pad = 12;

      state.minX = state.x + ((sRect.left + pad) - eRect.left);
      state.maxX = state.x + ((sRect.right - pad) - eRect.right);
      state.minY = state.y + ((sRect.top + pad) - eRect.top);
      state.maxY = state.y + ((sRect.bottom - pad) - eRect.bottom);

      if (state.maxX < state.minX) {
        const mid = (state.minX + state.maxX) / 2;
        state.minX = mid - 40;
        state.maxX = mid + 40;
      }
      if (state.maxY < state.minY) {
        const mid = (state.minY + state.maxY) / 2;
        state.minY = mid - 40;
        state.maxY = mid + 40;
      }
    }

    try { el.setPointerCapture(e.pointerId); } catch (_) {}

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startStateX = state.x;
    const startStateY = state.y;
    const startScale = state.scale;
    let lastMoveTime = performance.now();
    let lastMoveX = e.clientX;
    let lastMoveY = e.clientY;

    const onPointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startPointerX;
      const dy = moveEvent.clientY - startPointerY;
      const dist = Math.hypot(dx, dy);

      if (!state.hasMoved && dist > 4) {
        state.hasMoved = true;
        el.classList.add('is-dragging');
        if (isNpc) {
          setNpcPosLabel('', 'custom');
        } else {
          state.isDragging = true;
          const parentRec = el.closest('.shop-recommended');
          if (parentRec) parentRec.classList.add('has-dragging-pack');
          if (window.Sound) window.Sound.play('hover');
          if (navigator.vibrate) navigator.vibrate(8);
        }
      }

      if (!state.hasMoved) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTime);

      if (isNpc) {
        /* Desplazamiento lateral puro: sin zoom ni rotación. */
        state.x = Math.max(state.minX, Math.min(state.maxX, startStateX + dx));
        state.y = 0;
        state.rot = 0;
      } else {
        const rawTargetX = startStateX + dx;
        const rawTargetY = startStateY + dy;
        state.x = Math.max(state.minX, Math.min(state.maxX, rawTargetX));
        state.y = Math.max(state.minY, Math.min(state.maxY, rawTargetY));

        const instantVx = ((moveEvent.clientX - lastMoveX) / dt) * 16;
        const instantVy = ((moveEvent.clientY - lastMoveY) / dt) * 16;
        state.vx = state.vx * 0.55 + Math.max(-26, Math.min(26, instantVx)) * 0.45;
        state.vy = state.vy * 0.55 + Math.max(-26, Math.min(26, instantVy)) * 0.45;
        state.rot = Math.max(-12, Math.min(12, state.vx * 0.5));
        state.rotV = Math.max(-2.4, Math.min(2.4, state.vx * 0.12));
      }

      lastMoveTime = now;
      lastMoveX = moveEvent.clientX;
      lastMoveY = moveEvent.clientY;
      applyPlaygroundTransform(el, state);
    };

    const onPointerUp = (upEvt) => {
      if (upEvt && upEvt.pointerId !== undefined) {
        try { el.releasePointerCapture(upEvt.pointerId); } catch (_) {}
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      el.classList.remove('is-dragging', 'is-resizing');
      const parentRec = el.closest('.shop-recommended');
      if (parentRec) parentRec.classList.remove('has-dragging-pack');

      if (state.hasMoved) {
        shopPlaygroundSuppressClick = Date.now() + 450;
        if (window.Sound) window.Sound.play('cardSettle');
        if (navigator.vibrate) navigator.vibrate(6);
      }

      state.isDragging = false;

      if (isNpc) {
        state.rot = 0;
        applyPlaygroundTransform(el, state);
        return;
      }

      // Lanzamiento con física de rebote si llevaba velocidad
      if (state.hasMoved && Math.hypot(state.vx, state.vy) > 0.8) {
        runPlaygroundPhysics(el, state);
      } else {
        state.rot = 0;
        applyPlaygroundTransform(el, state);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });
    window.addEventListener('pointercancel', onPointerUp, { passive: false });
  });

  // Modificación de tamaño con rueda del ratón (los packs; Azura usa su slider)
  el.addEventListener('wheel', (e) => {
    if (!isShopDesktop()) return;
    if (el.classList.contains('shop-npc')) return;
    e.preventDefault();
    e.stopPropagation();

    const zoom = e.deltaY < 0 ? 1.07 : 0.93;
    const min = el.classList.contains('shop-npc') ? 0.55 : 0.4;
    const max = el.classList.contains('shop-npc') ? 1.9 : 2.5;
    state.scale = Math.max(min, Math.min(max, state.scale * zoom));
    applyPlaygroundTransform(el, state);
    showPlaygroundScaleBadge(el, state.scale);
  }, { passive: false });
}

function runPlaygroundPhysics(el, state) {
  if (state.animId) cancelAnimationFrame(state.animId);
  let bounces = 0;

  function step() {
    if (state.isDragging) return;

    state.x += state.vx;
    state.y += state.vy;
    state.rot += state.rotV;
    if (state.rot > 18) { state.rot = 18; state.rotV = 0; }
    if (state.rot < -18) { state.rot = -18; state.rotV = 0; }

    // Fricción del aire + giro que se asienta.
    state.vx *= 0.955;
    state.vy *= 0.955;
    state.rotV *= 0.9;

    let bounced = false;

    // Rebote elástico en paredes
    if (state.x <= state.minX) {
      state.x = state.minX;
      state.vx = Math.abs(state.vx) * 0.7;
      state.rotV += 1.6;
      bounced = true;
    } else if (state.x >= state.maxX) {
      state.x = state.maxX;
      state.vx = -Math.abs(state.vx) * 0.7;
      state.rotV -= 1.6;
      bounced = true;
    }

    if (state.y <= state.minY) {
      state.y = state.minY;
      state.vy = Math.abs(state.vy) * 0.7;
      bounced = true;
    } else if (state.y >= state.maxY) {
      state.y = state.maxY;
      state.vy = -Math.abs(state.vy) * 0.7;
      bounced = true;
    }

    if (bounced) {
      bounces += 1;
      triggerPlaygroundBounce(el);
      if (bounces < 4 && window.Sound) window.Sound.play('tap');
    }

    applyPlaygroundTransform(el, state);

    if (Math.hypot(state.vx, state.vy) > 0.2) {
      state.animId = requestAnimationFrame(step);
    } else {
      state.animId = null;
      state.vx = 0;
      state.vy = 0;
      state.rotV = 0;
      /* Deja la carta perfectamente recta al detenerse. */
      const settle = () => {
        state.rot *= 0.8;
        if (Math.abs(state.rot) > 0.15) {
          applyPlaygroundTransform(el, state);
          requestAnimationFrame(settle);
        } else {
          state.rot = 0;
          applyPlaygroundTransform(el, state);
        }
      };
      requestAnimationFrame(settle);
    }
  }

  state.animId = requestAnimationFrame(step);
}

function triggerPlaygroundBounce(el) {
  el.classList.add('is-bouncing');
  setTimeout(() => el.classList.remove('is-bouncing'), 160);
}

function setNpcPosLabel(text, posKey) {
  const key = posKey || 'left';
  const resolved = typeof t === 'function' ? t(`shop_npc_pos_${key}`) : text;
  const label = document.getElementById('shop-npc-pos-label');
  if (label) label.textContent = resolved || text;

  const menu = document.getElementById('shop-npc-pos-menu');
  if (menu) {
    Array.from(menu.querySelectorAll('[data-npc-pos]')).forEach((btn) => {
      btn.classList.toggle('is-selected', btn.dataset.npcPos === key);
    });
  }
}

function setShopNpcPosition(pos) {
  const npc = document.querySelector('.shop-npc');
  if (!npc) return;
  const state = getPlaygroundState(npc);

  if (state.animId) {
    cancelAnimationFrame(state.animId);
    state.animId = null;
  }
  state.vx = 0;
  state.vy = 0;
  state.rot = 0;
  state.rotV = 0;
  state.isDragging = false;
  state.x = 0;
  state.y = 0;

  npc.style.removeProperty('transform');
  npc.classList.remove('pos-center', 'pos-left', 'pos-right', 'pos-hidden');

  if (pos === 'center') {
    npc.classList.add('pos-center');
    setNpcPosLabel('Azura: Centro', 'center');
  } else if (pos === 'left') {
    npc.classList.add('pos-left');
    setNpcPosLabel('Azura: Izquierda', 'left');
  } else if (pos === 'right') {
    npc.classList.add('pos-right');
    setNpcPosLabel('Azura: Derecha', 'right');
  } else if (pos === 'hidden') {
    npc.classList.add('pos-hidden');
    setNpcPosLabel('Azura: Fuera', 'hidden');
  }

  /* Conserva el tamaño elegido con el slider al cambiar de posición. */
  if (pos !== 'hidden' && state.scale !== 1) applyPlaygroundTransform(npc, state);
  syncShopNpcSizeUi();
}

function resetShopPlayground() {
  shopPlaygroundStateByKey.forEach((state) => {
    if (state.animId) {
      cancelAnimationFrame(state.animId);
      state.animId = null;
    }
    state.x = 0;
    state.y = 0;
    state.scale = 1;
    state.vx = 0;
    state.vy = 0;
    state.rot = 0;
    state.rotV = 0;
    state.isDragging = false;
    state.hasMoved = false;
  });

  const scene = document.querySelector('.shop-scene');
  if (scene) {
    const items = scene.querySelectorAll('.shop-pack, .shop-stores, .shop-npc');
    items.forEach((item) => {
      item.style.setProperty('transition', 'transform 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28)', 'important');
      item.style.removeProperty('transform');
      setTimeout(() => item.style.removeProperty('transition'), 460);
    });
  }

  const npc = document.querySelector('.shop-npc');
  if (npc) {
    npc.classList.remove('pos-center', 'pos-right', 'pos-hidden');
    npc.classList.add('pos-left');
  }
  setNpcPosLabel('Azura: Izquierda', 'left');
  syncShopNpcSizeUi();

  if (typeof toast === 'function') {
    toast('¡Playground restablecido al diseño original!', { type: 'success' });
  }
}

function currentShopNpcPos() {
  const npc = document.querySelector('.shop-npc');
  if (!npc) return 'left';
  if (Math.abs(getPlaygroundState(npc).x) > 0.5) return 'custom';
  if (npc.classList.contains('pos-left')) return 'left';
  if (npc.classList.contains('pos-right')) return 'right';
  if (npc.classList.contains('pos-hidden')) return 'hidden';
  if (npc.classList.contains('pos-center')) return 'center';
  return 'left';
}

function setShopNpcScale(scale, options = {}) {
  const npc = document.querySelector('.shop-npc');
  if (!npc) return;
  const state = getPlaygroundState(npc);
  state.scale = Math.max(0.55, Math.min(1.9, Number(scale) || 1));
  state.rot = 0;
  applyPlaygroundTransform(npc, state);
  syncShopNpcSizeUi();
  if (!options.silent) showPlaygroundScaleBadge(npc, state.scale);
}

function syncShopNpcSizeUi() {
  const range = document.getElementById('shop-npc-size-range');
  const output = document.getElementById('shop-npc-size-value');
  const npc = document.querySelector('.shop-npc');
  if (!range || !output || !npc) return;
  const percent = Math.round(getPlaygroundState(npc).scale * 100);
  range.value = String(percent);
  output.textContent = `${percent}%`;
}

function setupShopNpcSizeUi() {
  const box = document.getElementById('shop-npc-size');
  const range = document.getElementById('shop-npc-size-range');
  if (!box || !range) return;

  /* El slider vive dentro del menú: sus eventos no deben cerrarlo ni
     iniciar arrastres del escenario. */
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

  if (!range._hasInput) {
    range._hasInput = true;
    range.addEventListener('input', () => {
      setShopNpcScale(Number(range.value) / 100);
    });
  }

  syncShopNpcSizeUi();
}

/* Dev tool: exporta las coordenadas reales del playground para poder
   reproducir el layout exacto desde CSS sin adivinar. */
function collectShopPlaygroundLayout() {
  const scene = document.querySelector('.shop-scene');
  if (!scene) return null;

  const sRect = scene.getBoundingClientRect();
  const px = (n) => Math.round(n * 10) / 10;
  const pct = (n, total) => Math.round((n / total) * 1000) / 10;

  const describe = (el, label) => {
    const state = getPlaygroundState(el);
    const r = el.getBoundingClientRect();
    const left = r.left - sRect.left;
    const top = r.top - sRect.top;
    const centerX = left + r.width / 2;
    const centerY = top + r.height / 2;
    return {
      id: getPlaygroundKey(el),
      label: label || '',
      offset: { x: px(state.x), y: px(state.y), scale: Math.round(state.scale * 100) / 100 },
      scalePercent: Math.round(state.scale * 100),
      rect: { left: px(left), top: px(top), width: px(r.width), height: px(r.height) },
      center: { x: px(centerX), y: px(centerY) },
      centerPct: { x: pct(centerX, sRect.width), y: pct(centerY, sRect.height) },
      edgePct: {
        left: pct(left, sRect.width),
        top: pct(top, sRect.height),
        right: pct(left + r.width, sRect.width),
        bottom: pct(top + r.height, sRect.height)
      }
    };
  };

  const npc = document.querySelector('.shop-npc');
  const stores = document.getElementById('shop-stores');
  const packs = Array.from(document.querySelectorAll('#shop-recommended .shop-pack'));

  return {
    app: 'CardGram',
    version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.5.5',
    kind: 'shop-playground-layout',
    exportedAt: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    },
    scene: { width: px(sRect.width), height: px(sRect.height) },
    npc: Object.assign({ position: currentShopNpcPos() }, npc ? describe(npc, 'Azura') : {}),
    stores: stores ? describe(stores, 'Astro~Verse') : null,
    packs: packs.map((pack) => describe(pack, (pack.querySelector('.shop-pack-name') || {}).textContent || '')),
    notes: 'rect / center / edgePct / centerPct se miden sobre .shop-scene (px y %). offset es el translate del playground sobre la posición CSS base; scale es el zoom del playground. npc.position: left | center | right | hidden | custom (custom = desplazada a mano con el ratón). npc.scalePercent: tamaño elegido con el slider dentro de Azura. Envía este archivo al agente para fijar el layout por defecto.'
  };
}

function exportShopPlaygroundLayout() {
  const layout = collectShopPlaygroundLayout();
  if (!layout) return null;

  const json = JSON.stringify(layout, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cardgram-shop-layout-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }
  if (typeof toast === 'function') {
    const label = typeof t === 'function' ? t('shop_dev_export_done') : 'Layout exportado como JSON';
    toast(label, { type: 'success' });
  }
  return layout;
}

function setupShopPlaygroundAll() {
  if (!isShopDesktop()) return;

  // 1. Azura (NPC) — por defecto a la izquierda, como en el mockup.
  const npc = document.querySelector('.shop-npc');
  if (npc) {
    if (!npc.classList.contains('pos-left') && !npc.classList.contains('pos-right') && !npc.classList.contains('pos-hidden') && !npc.classList.contains('pos-center')) {
      npc.classList.add('pos-left');
      setNpcPosLabel('Azura: Izquierda', 'left');
    }
    attachShopPlayground(npc);
  }

  // 2. Tienda del día (edificio + pastillas + avatar como un conjunto)
  const stores = document.getElementById('shop-stores');
  if (stores) attachShopPlayground(stores);

  // 3. Boosters individuales
  const packs = document.querySelectorAll('#shop-recommended .shop-pack');
  packs.forEach((pack) => attachShopPlayground(pack));

  // 4. Menú de posición de Azura
  const posBtn = document.getElementById('shop-npc-pos-btn');
  const posMenu = document.getElementById('shop-npc-pos-menu');
  if (posBtn && posMenu && !posBtn._hasClick) {
    posBtn._hasClick = true;
    posBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = posMenu.hidden;
      posMenu.hidden = !open;
      posBtn.setAttribute('aria-expanded', String(open));
      if (open) syncShopNpcSizeUi();
    });

    posMenu.addEventListener('click', (e) => {
      const opt = e.target.closest('[data-npc-pos]');
      if (!opt) return;
      e.stopPropagation();
      setShopNpcPosition(opt.dataset.npcPos);
      posMenu.hidden = true;
      posBtn.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', () => {
      if (!posMenu.hidden) {
        posMenu.hidden = true;
        posBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // 5. Botón de restablecimiento
  const resetBtn = document.getElementById('shop-playground-reset');
  if (resetBtn && !resetBtn._hasClick) {
    resetBtn._hasClick = true;
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetShopPlayground();
    });
  }

  // 6. Slider de tamaño integrado en Azura
  setupShopNpcSizeUi();

  // 7. Exportador de layout (dev): JSON con las coordenadas exactas
  const exportBtn = document.getElementById('shop-playground-export');
  if (exportBtn && !exportBtn._hasClick) {
    exportBtn._hasClick = true;
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportShopPlaygroundLayout();
    });
  }
}

window.exportShopLayout = collectShopPlaygroundLayout;
