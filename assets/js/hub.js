/* ==========================================================================
   CardGram — v0.5.5 · Hub / Lobby
   Vista de entrada, estadísticas, biblioteca, colecciones, decks, perfil y
   arranque perezoso del motor 3D. El editor solo se inicializa al entrar.
   ========================================================================== */
'use strict';

const HUB_STORAGE = {
  profile: 'cardgram.profile.v1',
  data: 'cardgram.hub.v1',
  booster: 'cardgram.booster.v1'
};

const HUB_PANELS = ['home', 'booster', 'library', 'collections', 'explore', 'profile'];
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
  draftAvatar: null,
  deckCoverId: null,
  homeVisits: 0,
  explorerFilter: 'all',
  explorerIndex: 0,
  explorerMode: 'album',
  explorerShowcase: true,
  explorerTimers: false,
  gachaIds: [],
  handDraft: [],
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
function defaultFavoriteId() {
  const cards = HUB_CATALOG.cards;
  if (!cards.length) return null;
  return cards[Math.floor(Math.random() * cards.length)].id;
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
  const favorite = HUB_CATALOG.byId(raw.favoriteCardId) ? raw.favoriteCardId : fallbackFavorite;
  const joined = Number(raw.joinedAt);

  const featuredIds = [];
  if (Array.isArray(raw.featuredIds)) {
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

        const cover = HUB_CATALOG.byId(item.coverId) || HUB_CATALOG.cards[0] || null;
        const cardIds = Array.isArray(item.cardIds)
          ? Array.from(new Set(item.cardIds.filter((cardId) => HUB_CATALOG.byId(cardId))))
          : [];
        const createdAt = Number(item.createdAt);

        return {
          id,
          name,
          description: String(item.description || '').trim().slice(0, 120),
          coverId: cover ? cover.id : null,
          cardIds,
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
  return HUB_CATALOG.collections.filter((collection) => collection.booster !== false && collection.cards.length);
}

function sanitizeBooster(raw) {
  const data = {
    day: null,
    setId: null,
    picks: [],
    claimed: false,
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
      .slice(0, 4);
  }

  data.claimed = Boolean(raw.claimed);

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
  persistBooster();
  return true;
}

function boosterCardIsNew(cardId) {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return false;
  return !ownedIn(card.collectionId).includes(cardId);
}

function drawBoosterCards(collectionId) {
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === collectionId);
  if (!collection || !collection.cards.length) return [];

  const owned = new Set(ownedIn(collectionId));
  const fresh = collection.cards.filter((card) => !owned.has(card.id));
  const picked = [];
  const takeFrom = (pool) => {
    const available = pool.filter((card) => !picked.includes(card.id));
    while (available.length && picked.length < 4) {
      const index = Math.floor(Math.random() * available.length);
      picked.push(available.splice(index, 1)[0].id);
    }
  };

  takeFrom(fresh);
  takeFrom(collection.cards);

  /* Con sets de menos de 4 cartas se repite alguna; nunca queda un hueco. */
  while (picked.length < 4 && collection.cards.length) {
    picked.push(collection.cards[picked.length % collection.cards.length].id);
  }

  return picked;
}

function openBoosterPack() {
  ensureBoosterDay();
  if (hubBooster.claimed || hubBooster.picks.length) return;

  const setId = hubBooster.setId || (boosterSets()[0] && boosterSets()[0].id);
  if (!setId) return;

  const collection = HUB_CATALOG.collections.find((entry) => entry.id === setId);
  if (!collection) return;

  hubBooster.setId = setId;
  hubBooster.picks = drawBoosterCards(setId);
  hubBooster.reveal = true;
  persistBooster();
  renderBooster();
  if (window.Sound) window.Sound.play('success');
}

function claimBoosterPack() {
  ensureBoosterDay();
  if (!hubBooster.picks.length || hubBooster.claimed) return;

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
  hubBooster.claimed = true;
  hubBooster.day = dayKey();
  hubBooster.streak =
    hubBooster.lastClaim === previousDayKey() ? Math.min(9999, hubBooster.streak + 1) : 1;
  hubBooster.lastClaim = hubBooster.day;
  persistBooster();

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

  const locked = hubBooster.claimed || hubBooster.picks.length > 0;

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

function renderBooster() {
  if (!hub.ready || !hub.els.boosterPanel) return;
  ensureBoosterDay();

  const sets = boosterSets();
  if (!hubBooster.setId && sets.length) {
    hubBooster.setId = sets[0].id;
  }
  const collection = HUB_CATALOG.collections.find((entry) => entry.id === hubBooster.setId) || null;

  renderBoosterSetButtons(sets);

  if (hub.els.boosterStreakValue) hub.els.boosterStreakValue.textContent = String(hubBooster.streak || 0);
  if (hub.els.boosterStreakLabel) {
    hub.els.boosterStreakLabel.textContent =
      hubBooster.streak === 1 ? t('booster_streak_short_one') : t('booster_streak_short');
  }

  const owned = collection ? ownedIn(collection.id).length : 0;
  const total = collection ? collection.cards.length : 0;
  const setLabel = collection ? collection.name : '';

  if (hub.els.boosterStatusTitle && hub.els.boosterStatusCopy) {
    if (hubBooster.claimed) {
      hub.els.boosterStatusTitle.textContent = t('booster_status_claimed_title');
      hub.els.boosterStatusCopy.textContent = t('booster_status_claimed_copy', { set: setLabel });
    } else if (hubBooster.picks.length) {
      hub.els.boosterStatusTitle.textContent = t('booster_status_opened_title');
      hub.els.boosterStatusCopy.textContent = t('booster_status_opened_copy', { set: setLabel });
    } else {
      hub.els.boosterStatusTitle.textContent = t('booster_ready_title');
      hub.els.boosterStatusCopy.textContent = t('booster_ready_copy');
    }
  }

  if (hub.els.boosterProgress) {
    const chips = [];
    if (collection) {
      chips.push(
        makeNode(
          'span',
          'hub-chip',
          t('booster_progress_owned', { owned, total })
        )
      );
      if (!collection.complete) {
        chips.push(
          makeNode(
            'span',
            'hub-chip',
            t('booster_set_size', { count: total, total: collection.setSize })
          )
        );
      } else if (owned >= total) {
        chips.push(makeNode('span', 'hub-chip', t('collections_set_complete')));
      }
    }
    hub.els.boosterProgress.replaceChildren(...chips);
  }

  if (hub.els.boosterPackTitle) {
    hub.els.boosterPackTitle.textContent = collection
      ? collection.name
      : t('booster_pack_empty');
  }

  if (hub.els.boosterPackChip) {
    if (collection) {
      hub.els.boosterPackChip.hidden = false;
      hub.els.boosterPackChip.textContent = t('booster_chip_available', { count: total });
    } else {
      hub.els.boosterPackChip.hidden = true;
    }
  }

  if (hub.els.boosterCards) {
    const cards = hub.els.boosterCards;
    if (!sets.length) {
      cards.replaceChildren(makeNode('p', 'hub-detail-hint', t('booster_no_set')));
    } else if (!hubBooster.picks.length) {
      cards.replaceChildren(
        ...Array.from({ length: 4 }, () =>
          collection ? makeSealedBoosterCard(collection) : makeBoosterPlaceholder()
        )
      );
    } else {
      const reveal = hubBooster.reveal === true;
      hubBooster.reveal = false;
      cards.replaceChildren(
        ...hubBooster.picks.map((id) =>
          makeBoosterCard(id, { open: !reveal, reveal })
        )
      );
      if (reveal) {
        requestAnimationFrame(() => {
          Array.from(cards.children).forEach((node, index) => {
            window.setTimeout(() => {
              node.classList.remove('is-locked');
              node.classList.add('is-open');
            }, index * 150);
          });
        });
      }
    }
  }

  if (hub.els.boosterOpen) {
    hub.els.boosterOpen.hidden = hubBooster.picks.length > 0 || hubBooster.claimed;
    hub.els.boosterOpen.disabled = !collection || hubBooster.claimed;
  }
  if (hub.els.boosterClaim) {
    hub.els.boosterClaim.hidden = !hubBooster.picks.length || hubBooster.claimed;
  }
  if (hub.els.boosterHint) {
    if (hubBooster.claimed) hub.els.boosterHint.textContent = t('booster_claimed_today');
    else if (hubBooster.picks.length) hub.els.boosterHint.textContent = t('booster_claim_hint');
    else hub.els.boosterHint.textContent = t('booster_open_hint');
  }
}

function updateBoosterClock() {
  if (hub.panel !== 'booster') return;
  if (hubBooster.day && hubBooster.day !== dayKey()) {
    renderBooster();
    return;
  }
  if (!hub.els.boosterHint || !hubBooster.claimed) return;
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
  return ok;
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
  return HUB_CATALOG.byId(hubProfile.favoriteCardId) || HUB_CATALOG.cards[0] || null;
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

function renderFeaturedStack() {
  const stack = hub.els.playerStack;
  if (!stack) return;

  const cards = featuredCards();
  const signature = `${currentLang}|${cards.map((card) => card.id).join('|')}`;
  stack.dataset.count = String(cards.length);
  if (hub.featuredSignature === signature && stack.childElementCount) {
    renderHandDeck(cards);
    return;
  }
  hub.featuredSignature = signature;
  stack.replaceChildren(...cards.map((card) => makeStackCard(card)));
  renderHandDeck(cards);
}

/* --------------------------------------------------------------------------
   Selector de la mano (hasta 6 cartas)
   -------------------------------------------------------------------------- */
function makeHandOption(card) {
  const active = hub.handDraft.includes(card.id);
  const button = makeNode('button', 'hand-option');
  button.type = 'button';
  button.dataset.handPick = card.id;
  button.setAttribute('aria-pressed', String(active));
  button.classList.toggle('is-active', active);
  button.disabled = !active && hub.handDraft.length >= 6;
  button.appendChild(makeExplorerArt(card));
  button.appendChild(makeNode('span', 'hand-option-name', card.name));
  return button;
}

function updateHandCount() {
  if (hub.els.handCount) hub.els.handCount.textContent = `${hub.handDraft.length}/6`;
  if (hub.els.handSave) hub.els.handSave.disabled = !hub.handDraft.length;
}

function renderHandPicker() {
  const picker = hub.els.handPicker;
  if (!picker) return;
  picker.replaceChildren(...HUB_CATALOG.cards.map((card) => makeHandOption(card)));
  updateHandCount();
}

function openHandDialog() {
  hub.handDraft = featuredCards().map((card) => card.id);
  renderHandPicker();
  if (hub.els.handDialog && !hub.els.handDialog.open) {
    hub.els.handDialog.showModal();
  }
}

function toggleHandPick(cardId) {
  if (!HUB_CATALOG.byId(cardId)) return;
  const index = hub.handDraft.indexOf(cardId);
  if (index >= 0) {
    hub.handDraft.splice(index, 1);
  } else if (hub.handDraft.length < 6) {
    hub.handDraft.push(cardId);
  }
  renderHandPicker();
}

function saveHand() {
  if (!hub.handDraft.length) {
    toast(t('hub_hand_empty'), { type: 'warning' });
    return;
  }

  hubProfile.featuredIds = hub.handDraft.slice(0, 6);
  /* Si la carta principal ya no está en la mano, pasa a ser la primera elegida. */
  if (!hubProfile.featuredIds.includes(hubProfile.favoriteCardId)) {
    hubProfile.favoriteCardId = hubProfile.featuredIds[0];
  }
  persistHubProfile();
  renderFavoriteCard();
  if (hub.els.handDialog && hub.els.handDialog.open) hub.els.handDialog.close();
}

/* Deja la mano en una sola carta: la protagonista actual (sin cerrar el diálogo). */
function clearHand() {
  const main = favoriteCard();
  hub.handDraft = main ? [main.id] : [];
  hubProfile.featuredIds = hub.handDraft.slice();
  persistHubProfile();
  renderFeaturedStack();
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

function renderCollectionsOverview() {
  if (hub.els.collectionsGrid) {
    hub.els.collectionsGrid.replaceChildren(
      ...HUB_CATALOG.collections.map((collection) => makeCollectionCard(collection))
    );
  }

  if (hub.els.decksGrid) {
    const cards = hubData.decks.map((deck) => {
      const button = makeHubButton('deck-card', null, { deckId: deck.id });
      const cover = makeNode('span', 'deck-cover');
      const coverCard = HUB_CATALOG.byId(deck.coverId) || HUB_CATALOG.cards[0];
      if (coverCard) cover.appendChild(makeHubImage(thumbOf(coverCard), ''));
      button.appendChild(cover);

      const body = makeNode('span', 'deck-body');
      body.appendChild(makeNode('span', 'deck-title', deck.name));
      body.appendChild(
        makeNode('span', 'deck-desc', deck.description || t('collections_deck_no_description'))
      );
      const meta = makeNode('span', 'deck-meta');
      meta.appendChild(
        makeNode('span', null, countLabel('collections_deck_cards', deck.cardIds.length))
      );
      body.appendChild(meta);
      button.appendChild(body);
      return button;
    });

    hub.els.decksGrid.replaceChildren(...cards);
  }

  if (hub.els.decksEmpty) hub.els.decksEmpty.hidden = hubData.decks.length > 0;
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

function renderCollectionDetail() {
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

function renderDeckDetail() {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) {
    hub.deckId = null;
    renderCollections();
    return;
  }

  const coverCard = HUB_CATALOG.byId(deck.coverId) || HUB_CATALOG.cards[0];
  const body = hub.els.deckDetailBody;
  if (!body) return;
  body.replaceChildren();

  const head = makeNode('div', 'deck-detail-head');
  const cover = makeNode('div', 'deck-cover');
  if (coverCard) cover.appendChild(makeHubImage(thumbOf(coverCard), ''));
  head.appendChild(cover);

  const copy = makeNode('div', 'deck-detail-copy');
  copy.appendChild(makeNode('h1', null, deck.name));
  copy.appendChild(
    makeNode('p', null, deck.description || t('collections_deck_no_description'))
  );
  const meta = makeNode('div', 'hub-detail-meta');
  meta.appendChild(
    makeNode('span', 'hub-chip', countLabel('collections_deck_cards', deck.cardIds.length))
  );
  copy.appendChild(meta);
  head.appendChild(copy);

  const headActions = makeNode('div', 'hub-detail-actions');
  const deleteButton = makeHubButton('btn btn-ghost btn-sm btn-danger', t('collections_delete_deck'));
  deleteButton.dataset.deckDelete = deck.id;
  deleteButton.appendChild(hubIcon('trash'));
  headActions.appendChild(deleteButton);
  head.appendChild(headActions);
  body.appendChild(head);

  const list = makeNode('div', 'deck-card-list');
  if (deck.cardIds.length === 0) {
    body.appendChild(makeNode('div', 'deck-empty-inline', t('collections_deck_empty')));
  } else {
    deck.cardIds.forEach((cardId) => {
      const card = HUB_CATALOG.byId(cardId);
      if (!card) return;
      const chip = makeNode('span', 'deck-card-chip');
      chip.appendChild(makeHubImage(thumbOf(card), card.name));
      chip.appendChild(makeNode('span', null, card.name));

      const remove = makeNode('button');
      remove.type = 'button';
      remove.dataset.deckRemoveCard = card.id;
      remove.setAttribute('aria-label', t('collections_remove'));
      remove.title = t('collections_remove');
      remove.appendChild(hubIcon('close'));
      chip.appendChild(remove);
      list.appendChild(chip);
    });
    body.appendChild(list);
  }

  const addRow = makeNode('div', 'deck-add-row');
  const label = makeNode('label', null, t('collections_add_card'));
  label.setAttribute('for', 'deck-add-select');
  addRow.appendChild(label);

  const select = document.createElement('select');
  select.id = 'deck-add-select';
  const available = HUB_CATALOG.cards.filter((card) => !deck.cardIds.includes(card.id));
  if (available.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('collections_no_more_cards');
    select.appendChild(option);
    select.disabled = true;
  } else {
    available.forEach((card) => {
      const option = document.createElement('option');
      option.value = card.id;
      option.textContent = `${card.name} · ${card.set}`;
      select.appendChild(option);
    });
  }
  addRow.appendChild(select);

  const addButton = makeHubButton('btn btn-primary btn-sm', t('collections_add'), {
    deckAdd: '1'
  });
  addButton.appendChild(hubIcon('plus'));
  addButton.disabled = available.length === 0;
  addRow.appendChild(addButton);
  body.appendChild(addRow);
}

function addSelectedDeckCard() {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  const select = document.getElementById('deck-add-select');
  if (!deck || !select) return;

  const cardId = select.value;
  if (!cardId || deck.cardIds.includes(cardId)) return;

  deck.cardIds.push(cardId);
  persistHubData();
  renderDeckDetail();
  renderHubStats(false);
  toast(t('toast_deck_card_added'), { type: 'success' });
}

async function removeDeckCard(cardId) {
  const deck = hubData.decks.find((entry) => entry.id === hub.deckId);
  if (!deck) return;

  deck.cardIds = deck.cardIds.filter((id) => id !== cardId);
  persistHubData();
  renderDeckDetail();
  renderHubStats(false);
  toast(t('toast_deck_card_removed'), { type: 'info' });
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

function openDeckDialog() {
  if (!hub.els.deckDialog) return;

  hub.els.deckName.value = '';
  hub.els.deckDesc.value = '';
  hub.deckCoverId = defaultFavoriteId() || (HUB_CATALOG.cards[0] ? HUB_CATALOG.cards[0].id : null);
  renderDeckCoverOptions();

  if (!hub.els.deckDialog.open) hub.els.deckDialog.showModal();
  setTimeout(() => {
    hub.els.deckName.focus();
    hub.els.deckName.select();
  }, 50);
}

function renderDeckCoverOptions() {
  if (!hub.els.deckCoverOptions) return;
  hub.els.deckCoverOptions.replaceChildren();

  HUB_CATALOG.cards.forEach((card) => {
    const label = document.createElement('label');
    label.className = 'deck-cover-option';
    label.title = card.name;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'deck-cover';
    input.value = card.id;
    input.checked = card.id === hub.deckCoverId;

    label.appendChild(input);
    label.appendChild(makeHubImage(thumbOf(card), card.name));
    label.addEventListener('change', () => {
      hub.deckCoverId = card.id;
    });
    hub.els.deckCoverOptions.appendChild(label);
  });
}

function createDeckFromForm() {
  const name = hub.els.deckName.value.trim().slice(0, 48);
  if (!name) {
    toast(t('deck_name_required'), { type: 'warning' });
    hub.els.deckName.focus();
    return;
  }

  const checked = hub.els.deckForm.querySelector('input[name="deck-cover"]:checked');
  const coverId = checked ? checked.value : hub.deckCoverId;

  const deck = {
    id: uid(),
    name,
    description: hub.els.deckDesc.value.trim().slice(0, 120),
    coverId: HUB_CATALOG.byId(coverId) ? coverId : defaultFavoriteId(),
    cardIds: [],
    createdAt: Date.now()
  };

  hubData.decks.unshift(deck);
  if (!persistHubData()) {
    hubData.decks.shift();
    return;
  }

  hub.els.deckDialog.close();
  renderHubStats(false);
  toast(t('toast_deck_created', { name: deck.name }), { type: 'success' });
  navigate(`collections/deck/${deck.id}`);
}

/* --------------------------------------------------------------------------
   Explorar (preparado)
   -------------------------------------------------------------------------- */
function renderExplore() {
  if (!hub.ready || !hub.els.explorePreview) return;
  const community = window.CardGramCommunity;

  if (community && community.isEnabled()) {
    community
      .fetchCards()
      .then((feed) => {
        if (!feed || !Array.isArray(feed.cards) || !feed.cards.length) return;
        const nodes = feed.cards.map((card) =>
          createMediaCard({
            kind: 'catalog',
            id: card.id,
            name: card.name,
            subtitle: card.creatorName || '',
            image: thumbOf(card),
            badge: t('explore_preview_label'),
            isFavorite: false,
            preview: true
          })
        );
        hub.els.explorePreview.replaceChildren(...nodes);
      })
      .catch(() => {});
    return;
  }

  const nodes = HUB_CATALOG.cards.map((card) => {
    const collection = HUB_CATALOG.collectionOf(card);
    return createMediaCard({
      kind: 'catalog',
      id: card.id,
      name: card.name,
      subtitle: `${collection ? collection.name : card.collectionName} · ${t('explore_preview_label')}`,
      image: card.thumbFront || card.front,
      badge: t('explore_preview_label'),
      isFavorite: hubProfile.favoriteCardId === card.id
    });
  });
  hub.els.explorePreview.replaceChildren(...nodes);
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
  Array.from(hub.root.querySelectorAll('[data-hub-lang]')).forEach((button) => {
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
  const target = HUB_PANELS.includes(panel) ? panel : 'home';
  hub.panel = target;

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

  if (hub.els.homeFab) hub.els.homeFab.hidden = target === 'home';

  if (target === 'home') {
    hub.homeVisits += 1;
    renderFavoriteCard();
    renderHubStats(options.animateStats === true);
    renderCollectionRail();
    renderCardExplorer();
  } else if (target === 'library') {
    renderLibrary();
  } else if (target === 'booster') {
    renderBooster();
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
  const clean = String(route || 'home').replace(/^#?\/*/, '');
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
  applyRoute();
}

function applyRoute() {
  const raw = (location.hash || '').replace(/^#\/?/, '').replace(/\/+$/, '');
  const parts = raw.split('/').filter(Boolean);
  const head = parts[0] || 'home';
  const key = parts.join('/') || 'home';

  if (key === hub.lastRoute) return;
  hub.lastRoute = key;

  if (head === 'studio') {
    openStudio(parts[1] || 'deck');
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
      openCatalogCard(card.id, 'canvas');
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

  const boosterSet = target.closest('[data-booster-set]');
  if (boosterSet) {
    event.preventDefault();
    if (hubBooster.claimed || hubBooster.picks.length) return;
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

  const removeCard = target.closest('[data-deck-remove-card]');
  if (removeCard) {
    removeDeckCard(removeCard.dataset.deckRemoveCard);
    return;
  }

  const addCard = target.closest('[data-deck-add]');
  if (addCard) {
    addSelectedDeckCard();
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
    if (!hub.els.viewer || hub.els.viewer.hidden) return;
    event.preventDefault();
    closeCardViewer();
  });

  window.setInterval(updateBoosterClock, 1000);
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
  els.viewerDetails = hubEl('card-viewer-details');
  els.viewerEdit = hubEl('card-viewer-edit');
  els.viewerClose = document.querySelector('.card-viewer-close');
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

  els.explorePreview = hubEl('explore-preview');

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
  els.deckDesc = hubEl('deck-desc');
  els.deckCoverOptions = hubEl('deck-cover-options');
  els.deckCancel = hubEl('deck-dialog-cancel');

  els.btnHomeHub = hubEl('btn-home-hub');
  els.btnHomeHubFloating = hubEl('btn-home-hub-floating');
  els.flowerMenu = hubEl('flower-menu');
}

function setupHub() {
  cacheHubDom();
  if (!hub.root) return;

  loadHubState();
  buildProfileFavoriteOptions();
  setupHubEvents();
  setupCardRatios();

  hub.ready = true;
  updateLangButtons();
  renderHubIdentity();
  renderFavoriteCard();
  renderHubStats(true);
  setupMobileData();
  renderCollectionRail();
  renderCardExplorer();
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
