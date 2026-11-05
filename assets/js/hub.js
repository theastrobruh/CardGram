/* ==========================================================================
   CardGram — v0.4.5 · Hub / Lobby
   Vista de entrada, estadísticas, biblioteca, colecciones, decks, perfil y
   arranque perezoso del motor 3D. El editor solo se inicializa al entrar.
   ========================================================================== */
'use strict';

const HUB_STORAGE = {
  profile: 'cardgram.profile.v1',
  data: 'cardgram.hub.v1'
};

const HUB_PANELS = ['home', 'library', 'collections', 'explore', 'profile'];
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
  opening: false,
  lastRoute: '',
  activeSheet: null,
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

/** Convierte una ruta de catálogo en su miniatura si existe. */
function previewThumb(url) {
  if (typeof PREVIEW_FRONT === 'undefined' || !PREVIEW_FRONT) return url;
  return PREVIEW_FRONT.get(url) || url;
}

/* --------------------------------------------------------------------------
   Estado persistido
   -------------------------------------------------------------------------- */
function defaultFavoriteId() {
  if (HUB_CATALOG.featured && HUB_CATALOG.featured.id) return HUB_CATALOG.featured.id;
  if (HUB_CATALOG.cards.length) return HUB_CATALOG.cards[0].id;
  return null;
}

function sanitizeHubProfile(raw) {
  const fallbackFavorite = defaultFavoriteId();
  const base = {
    name: 'Card Creator',
    handle: 'cardcreator',
    bio: '',
    avatar: null,
    favoriteCardId: fallbackFavorite,
    joinedAt: Date.now()
  };

  if (!raw || typeof raw !== 'object') return base;

  const name = String(raw.name || '').trim().slice(0, 32);
  const bio = String(raw.bio || '').trim().slice(0, 160);
  const avatar = raw.avatar ? safeImageUrl(raw.avatar) : null;
  const favorite = HUB_CATALOG.byId(raw.favoriteCardId) ? raw.favoriteCardId : fallbackFavorite;
  const joined = Number(raw.joinedAt);

  return {
    name: name || base.name,
    handle: normalizeHandle(raw.handle || name || 'creator'),
    bio,
    avatar,
    favoriteCardId: favorite,
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

let hubProfile = sanitizeHubProfile(null);
let hubData = sanitizeHubData(null);

function loadHubState() {
  hubProfile = sanitizeHubProfile(storage.read(HUB_STORAGE.profile, null));
  hubData = sanitizeHubData(storage.read(HUB_STORAGE.data, null));
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

  renderProfileSummary(stats);
}

function renderProfileSummary(stats) {
  const values = stats || hubStats();
  if (hub.els.profileStatCards) hub.els.profileStatCards.textContent = String(values.cards);
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
}

function favoriteCard() {
  return HUB_CATALOG.byId(hubProfile.favoriteCardId) || HUB_CATALOG.cards[0] || null;
}

/* La vitrina adopta la proporción real del arte (5:7, 3:4, tarot…). */
function syncCardRatio(image) {
  const stage = hub.els.cardStage;
  if (!stage || !image) return;

  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) return;

  const ratio = width / height;
  const current = Number(stage.style.getPropertyValue('--card-ratio')) || 0;
  if (Math.abs(ratio - current) < 0.0005) return;

  stage.style.setProperty('--card-ratio', ratio.toFixed(4));
}

function renderFavoriteCard() {
  if (!hub.ready) return;
  const card = favoriteCard();
  if (!card) return;

  if (hub.els.cardFront) {
    hub.els.cardFront.src = thumbOf(card);
    hub.els.cardFront.alt = `${card.name} — ${card.type}`;

    if (hub.els.cardFront.complete) {
      syncCardRatio(hub.els.cardFront);
    } else {
      hub.els.cardFront.addEventListener(
        'load',
        () => syncCardRatio(hub.els.cardFront),
        { once: true }
      );
    }
  }
  if (hub.els.cardBack) {
    hub.els.cardBack.src = backThumbOf(card);
    hub.els.cardBack.alt = `${card.name} — ${t('back_cover')}`;
  }
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

  if (hub.els.cardSheetLore) {
    hub.els.cardSheetLore.textContent = card.lore || '';
    hub.els.cardSheetLore.hidden = !card.lore;
  }

  if (hub.els.card) {
    hub.els.card.classList.remove('is-flipped');
    hub.els.card.setAttribute('aria-pressed', 'false');
  }
}

function setFavoriteCard(cardId) {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return;
  const keepExplorerFocus = Boolean(
    hub.els.explorerTrack && hub.els.explorerTrack.contains(document.activeElement)
  );
  hubProfile.favoriteCardId = card.id;
  persistHubProfile();
  renderFavoriteCard();
  renderHubStats(false);
  renderCardExplorer({ focusCardId: keepExplorerFocus ? card.id : null });
  if (hub.panel === 'library') renderLibrary();
  if (hub.panel === 'collections') renderCollections();
  if (hub.panel === 'profile') renderProfileForm();
  toast(t('library_favorite') + ': ' + card.name, { type: 'success' });
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

function makeExplorerCard(card) {
  const item = makeNode('article', 'hub-explorer-item');
  const selected = hubProfile.favoriteCardId === card.id;

  const cardButton = makeNode('button', 'hub-explorer-card');
  cardButton.type = 'button';
  cardButton.dataset.favCard = card.id;
  cardButton.setAttribute('aria-pressed', String(selected));
  cardButton.setAttribute(
    'aria-label',
    `${card.name} · ${selected ? t('hub_explorer_selected') : t('hub_explorer_make_favorite')}`
  );

  const art = makeNode('span', 'hub-explorer-art');
  art.appendChild(makeHubImage(thumbOf(card), card.name));
  art.appendChild(
    makeNode('span', 'hub-explorer-badge', card.collectionShortName || card.set)
  );

  const selectedMark = makeNode('span', 'hub-explorer-selected');
  selectedMark.setAttribute('aria-hidden', 'true');
  selectedMark.appendChild(hubIcon('check'));
  art.appendChild(selectedMark);

  cardButton.appendChild(art);
  cardButton.appendChild(makeNode('span', 'hub-explorer-card-name', card.name));
  cardButton.appendChild(
    makeNode(
      'span',
      'hub-explorer-card-meta',
      [card.set, card.rarity].filter(Boolean).join(' · ')
    )
  );

  const openButton = makeNode('button', 'hub-explorer-open');
  openButton.type = 'button';
  openButton.dataset.openCard = card.id;
  openButton.setAttribute('aria-label', t('hub_explorer_open'));
  openButton.title = t('hub_explorer_open');
  openButton.appendChild(hubIcon('expand'));

  item.appendChild(cardButton);
  item.appendChild(openButton);
  return item;
}

function updateExplorerArrows() {
  const track = hub.els.explorerTrack;
  if (!track) return;

  const max = Math.max(0, track.scrollWidth - track.clientWidth);
  if (hub.els.explorerPrev) hub.els.explorerPrev.disabled = track.scrollLeft <= 2;
  if (hub.els.explorerNext) {
    hub.els.explorerNext.disabled = track.scrollLeft >= max - 2;
  }
}

function renderCardExplorer(options = {}) {
  const track = hub.els.explorerTrack;
  if (!track) return;

  renderExplorerFilters();

  const cards = HUB_CATALOG.cards.filter(
    (card) => hub.explorerFilter === 'all' || card.collectionId === hub.explorerFilter
  );

  if (!cards.length) {
    track.replaceChildren(
      makeNode('p', 'hub-explorer-empty', t('hub_explorer_empty'))
    );
  } else {
    track.replaceChildren(...cards.map((card) => makeExplorerCard(card)));
  }

  const targetScroll = options.resetScroll ? 0 : track.scrollLeft;
  track.scrollLeft = targetScroll;
  requestAnimationFrame(() => {
    track.scrollLeft = targetScroll;
    updateExplorerArrows();
    if (options.focusCardId) {
      const target = Array.from(track.querySelectorAll('[data-fav-card]')).find(
        (button) => button.dataset.favCard === options.focusCardId
      );
      if (target) target.focus({ preventScroll: true });
    }
  });
}

function setExplorerFilter(filterId) {
  if (filterId === hub.explorerFilter) return;
  hub.explorerFilter = filterId;
  renderCardExplorer({ resetScroll: true });
}

function scrollExplorer(direction) {
  const track = hub.els.explorerTrack;
  if (!track) return;

  const firstItem = track.querySelector('.hub-explorer-item');
  const step = firstItem
    ? firstItem.getBoundingClientRect().width + 9
    : Math.max(120, track.clientWidth * 0.6);

  track.scrollBy({
    left: step * direction,
    behavior: reduceMotion() ? 'auto' : 'smooth'
  });
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
  const open = makeHubButton('btn btn-primary btn-sm', t('library_open'));
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

  if (showSaved && Array.isArray(presets)) {
    presets.forEach((preset) => {
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
    HUB_CATALOG.cards.forEach((card) => {
      const collection = HUB_CATALOG.collectionOf(card);
      nodes.push(
        createMediaCard({
          kind: 'catalog',
          id: card.id,
          name: card.name,
          subtitle: `${collection ? collection.name : card.collectionName} · ${card.set}`,
          image: thumbOf(card),
          badge: collection ? collection.shortName : t('library_catalog_badge'),
          isFavorite: hubProfile.favoriteCardId === card.id
        })
      );
    });
  }

  hub.els.libraryGrid.replaceChildren(...nodes);

  if (hub.els.libraryCount) {
    hub.els.libraryCount.textContent = countLabel('library_count', nodes.length);
  }

  const isEmpty = nodes.length === 0;
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
    collection.thumbCover || collection.cover,
    ...collection.cards.map((entry) => thumbOf(entry))
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
    makeNode('span', null, countLabel('hub_collection_cards', collection.cards.length))
  );
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
    [collection.thumbCover || collection.cover, ...collection.cards.map((card) => thumbOf(card))]
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
  });
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

function openHubMenu() {
  openHubSheet(hub.els.menu, hub.els.menuBtn);
}

function closeHubMenu(options = {}) {
  closeHubSheet(options);
}

function openCardDetails() {
  openHubSheet(hub.els.cardSheet, hub.els.cardInfo);
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

  if (target === 'home') {
    hub.homeVisits += 1;
    renderFavoriteCard();
    renderHubStats(options.animateStats === true);
    renderCollectionRail();
    renderCardExplorer();
  } else if (target === 'library') {
    renderLibrary();
  } else if (target === 'collections') {
    renderCollections();
  } else if (target === 'explore') {
    renderExplore();
  } else if (target === 'profile') {
    renderProfileForm();
  }

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

  const firstOpen = !Scene.isReady();
  if (firstOpen) showStudioLoading();

  await nextFrame();

  if (firstOpen) {
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
}

/* --------------------------------------------------------------------------
   Acciones de biblioteca
   -------------------------------------------------------------------------- */
function openCatalogCard(cardId) {
  const card = HUB_CATALOG.byId(cardId);
  if (!card) return;

  const builtin = typeof BUILTIN_PRESETS !== 'undefined'
    ? BUILTIN_PRESETS.find((preset) => preset.cardId === card.id)
    : null;
  activePresetId = builtin ? builtin.id : null;
  renderPresets();
  applyCardImages(card.front, card.back, card.fullArt || null);
  navigate('studio/deck');
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

  const routeButton = target.closest('[data-hub-route]');
  if (routeButton) {
    event.preventDefault();
    closeHubMenu({ restoreFocus: false });
    navigate(routeButton.dataset.hubRoute);
    return;
  }

  const studioButton = target.closest('[data-open-studio]');
  if (studioButton) {
    event.preventDefault();
    closeHubMenu({ restoreFocus: false });
    navigate(`studio/${studioButton.dataset.openStudio || 'deck'}`);
    return;
  }

  if (target.closest('[data-open-favorite]')) {
    event.preventDefault();
    const card = favoriteCard();
    if (card) openCatalogCard(card.id);
    return;
  }

  const explorerArrow = target.closest('[data-explorer-nav]');
  if (explorerArrow) {
    event.preventDefault();
    scrollExplorer(Number(explorerArrow.dataset.explorerNav) || 1);
    return;
  }

  const explorerFilter = target.closest('[data-explorer-filter]');
  if (explorerFilter) {
    event.preventDefault();
    setExplorerFilter(explorerFilter.dataset.explorerFilter);
    return;
  }

  const langButton = target.closest('[data-hub-lang]');
  if (langButton) {
    applyLanguage(langButton.dataset.hubLang);
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

function setupShowcaseTilt() {
  if (!hub.els.showcase || reduceMotion()) return;
  let frame = 0;

  hub.els.showcase.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    if (frame) return;

    frame = requestAnimationFrame(() => {
      frame = 0;
      const rect = hub.els.showcase.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      hub.els.showcase.style.setProperty('--tilt-x', `${(-y * 9).toFixed(2)}deg`);
      hub.els.showcase.style.setProperty('--tilt-y', `${(x * 11).toFixed(2)}deg`);
    });
  });

  hub.els.showcase.addEventListener('pointerleave', () => {
    hub.els.showcase.style.setProperty('--tilt-x', '0deg');
    hub.els.showcase.style.setProperty('--tilt-y', '0deg');
  });
}

function setupHubEvents() {
  if (!hub.root) return;

  hub.root.addEventListener('click', onHubClick);

  if (hub.els.card) {
    hub.els.card.addEventListener('click', () => {
      const flipped = hub.els.card.classList.toggle('is-flipped');
      hub.els.card.setAttribute('aria-pressed', String(flipped));
    });
  }

  setupShowcaseTilt();

  if (hub.els.menuBtn) {
    hub.els.menuBtn.addEventListener('click', openHubMenu);
  }

  if (hub.els.cardInfo) {
    hub.els.cardInfo.addEventListener('click', openCardDetails);
  }

  Array.from(hub.root.querySelectorAll('[data-menu-close]')).forEach((node) => {
    node.addEventListener('click', () => closeHubSheet());
  });

  if (hub.els.explorerTrack) {
    hub.els.explorerTrack.addEventListener('scroll', updateExplorerArrows, { passive: true });
    hub.els.explorerTrack.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      scrollExplorer(event.key === 'ArrowLeft' ? -1 : 1);
    });
  }

  window.addEventListener('resize', updateExplorerArrows);

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
}

/* --------------------------------------------------------------------------
   Refresco externo (llamado desde app.js y export.js)
   -------------------------------------------------------------------------- */
function refreshHubData() {
  if (!hub.ready) return;
  renderHubStats(false);
  renderCardExplorer();
  if (hub.panel === 'library') renderLibrary();
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
  els.menuBtn = hubEl('hub-menu-btn');
  els.menu = hubEl('hub-menu-sheet');
  els.menuPanel = document.querySelector('.hub-menu-panel');
  els.menuClose = document.querySelector('.hub-menu-close');
  els.menuStatCards = hubEl('menu-stat-cards');
  els.menuStatCollections = hubEl('menu-stat-collections');
  els.menuStatDecks = hubEl('menu-stat-decks');
  els.menuStatRenders = hubEl('menu-stat-renders');

  els.cardInfo = hubEl('hub-card-info');
  els.cardSheet = hubEl('hub-card-sheet');
  els.cardSheetSub = hubEl('hub-card-sheet-sub');
  els.cardSheetChips = hubEl('hub-card-sheet-chips');
  els.cardSheetLore = hubEl('hub-card-sheet-lore');
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
  els.explorerTrack = hubEl('hub-explorer-track');
  els.explorerPrev = document.querySelector('[data-explorer-nav="-1"]');
  els.explorerNext = document.querySelector('[data-explorer-nav="1"]');

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

  hub.ready = true;
  updateLangButtons();
  renderHubIdentity();
  renderFavoriteCard();
  renderHubStats(true);
  renderCollectionRail();
  renderCardExplorer();
  setLibraryTab('all', { render: false });
  renderProfileForm();
  renderHubStats(false);
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
