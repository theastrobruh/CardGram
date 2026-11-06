/* ==========================================================================
   CardGram — v0.5.5 · Aplicación
   Estado, persistencia, presets, cargas, interfaz, accesibilidad e inicio.
   ========================================================================== */
'use strict';

const APP_VERSION = '0.5.5';

const STORAGE = {
  settings: 'cardgram.settings.v1',
  presets: 'cardgram.presets.v2',
  scenes: 'cardgram.scenes.v1'
};

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_PRESETS = 30;
const MAX_TEXTURE_EDGE = 1400;
const MAX_PRESET_NAME = 40;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_SCENES = [
  { pos: [0, 0, 4.6], target: [0, 0, 0], cardY: 0 },
  { pos: [1.8, 1.2, 3.2], target: [0, 0.3, 0], cardY: 0.1 },
  { pos: [-1.4, -0.6, 2.6], target: [0, -0.2, 0], cardY: -0.1 }
];

const DEFAULTS = {
  corners: 'rounded',
  cardFormat: 'auto',
  edgeThickness: 0.016,
  bevel: 0.004,
  edgeColor: 'black',
  gloss: 0.25,
  exposure: 0.9,
  speed: 0.5,
  spinDir: 1,
  float: 'organic',
  camDistance: 6.8,
  posY: 0,
  posX: 0,
  fov: 38,
  lightIntensity: 1.0,
  lightWarmth: 0.0,
  tilt: 1,
  aspect: '9:16',
  scale: 100,
  bg: 'aqua',
  duration: 10,
  fullArtAnim: true,
  fabX: null,
  fabY: null
};

const state = { ...DEFAULTS, lang: 'en', sidebarCollapsed: false };

/* Catálogo segmentado por colecciones (assets/data/cards/catalog.js). */
const CATALOG = window.CardGramCatalog || null;
const CATALOG_CARDS =
  CATALOG && Array.isArray(CATALOG.cards) && CATALOG.cards.length
    ? CATALOG.cards
    : [
        {
          id: 'mew-tarot-00',
          name: 'The Fool',
          front: 'assets/data/cards/database/Mew Tarot/00 - The Fool.webp',
          back: 'assets/data/cards/database/_shared/BACK_CARDGRAM.webp',
          fullArt: null
        }
      ];

const DEFAULT_CARD = {
  id: CATALOG_CARDS[0].id,
  name: CATALOG_CARDS[0].name,
  front: CATALOG_CARDS[0].front,
  back: CATALOG_CARDS[0].back,
  fullArt: CATALOG_CARDS[0].fullArt || null
};

const BUILTIN_PRESETS = CATALOG_CARDS.map((card) => ({
  id: `builtin-${card.id}`,
  cardId: card.id,
  name: card.name,
  front: card.front,
  back: card.back,
  fullArt: card.fullArt || null,
  builtin: true
}));

/* El panel lateral usa miniaturas; el motor 3D sigue usando el original. */
const PREVIEW_FRONT = new Map(
  CATALOG_CARDS.map((card) => [card.front, card.thumbFront || card.front])
);
const PREVIEW_BACK = new Map(
  CATALOG_CARDS.map((card) => [card.back, card.thumbBack || card.back])
);
const PREVIEW_MICRO = new Map(
  CATALOG_CARDS.map((card) => [
    card.front,
    (card.thumbFront || card.front).replace('/thumbs/', '/micro/')
  ])
);

const CARD_TEMPLATES = [
  { id: 'E1', name: 'E1', src: 'assets/data/cards/database/templates/E1.webp', thumb: 'assets/data/cards/database/templates/thumbs/E1.webp' },
  { id: 'E2', name: 'E2', src: 'assets/data/cards/database/templates/E2.webp', thumb: 'assets/data/cards/database/templates/thumbs/E2.webp' },
  { id: 'E3', name: 'E3', src: 'assets/data/cards/database/templates/E3.webp', thumb: 'assets/data/cards/database/templates/thumbs/E3.webp' }
];

const templateState = {
  ready: false,
  templateId: 'E1',
  template: null,
  artwork: null,
  artZoom: 130,
  artX: 0,
  artY: 0,
  templateZoom: 100,
  templateX: 0,
  templateY: 0,
  textSize: 52,
  textX: 50,
  textY: 54,
  textColor: '#ffffff'
};

const currentCard = { front: DEFAULT_CARD.front, back: DEFAULT_CARD.back, fullArt: DEFAULT_CARD.fullArt };
const uploadTokens = { front: 0, back: 0 };

let presets = [];
let scenes = cloneScenes(DEFAULT_SCENES);
let activePresetId = BUILTIN_PRESETS[0] ? BUILTIN_PRESETS[0].id : 'default';
let textureStale = true;
let activeScene = 1;
let isSequencePlaying = false;
let exporting = false;
let exportCancelled = false;
let initialized = false;
let resizeRaf = 0;
let cinematicTipTimer = 0;
let storageWarned = false;
let settingsTimer = 0;
let fabDragged = false;

const el = {};

/* --------------------------------------------------------------------------
   Utilidades
   -------------------------------------------------------------------------- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const even = (value) => Math.max(2, Math.round(value / 2) * 2);
const uid = () => `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Llama a un método de Scene solo si existe. Evita que una versión antigua
 * cacheada del motor 3D bloquee el arranque de la interfaz.
 */
function sceneMethod(name, ...args) {
  if (typeof Scene === 'undefined' || !Scene) return undefined;
  if (typeof Scene[name] !== 'function') return undefined;
  return Scene[name](...args);
}

function cloneScenes(source) {
  return source.map((scene) => ({
    pos: [...scene.pos],
    target: [...scene.target],
    cardY: scene.cardY
  }));
}

function createIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.appendChild(use);
  return svg;
}

/* --------------------------------------------------------------------------
   Almacenamiento validado
   -------------------------------------------------------------------------- */
/* Prefijos de almacenamiento de versiones anteriores (solo migración). */
const LEGACY_STORAGE_PREFIXES = ['deckgram.', 'tcghub.'];
const STORAGE_MIGRATIONS = [
  ['cardgram.settings.v1', 'settings.v1'],
  ['cardgram.presets.v2', 'presets.v2'],
  ['cardgram.scenes.v1', 'scenes.v1'],
  ['cardgram.profile.v1', 'profile.v1'],
  ['cardgram.hub.v1', 'hub.v1'],
  ['cardgram.booster.v1', 'booster.v1']
];

const storage = {
  read(key, fallback) {
    try {
      let raw = localStorage.getItem(key);
      for (const prefix of LEGACY_STORAGE_PREFIXES) {
        if (raw) break;
        raw = localStorage.getItem(key.replace('cardgram.', prefix));
      }
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`[CardGram] No se pudo leer ${key}`, error);
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[CardGram] No se pudo guardar ${key}`, error);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      LEGACY_STORAGE_PREFIXES.forEach((prefix) => {
        localStorage.removeItem(key.replace('cardgram.', prefix));
      });
    } catch (error) {
      console.warn(`[CardGram] No se pudo borrar ${key}`, error);
    }
  }
};

/**
 * Copia los datos guardados con el nombre anterior a las claves actuales y
 * elimina las antiguas. Se ejecuta una sola vez, antes de loadState().
 */
function migrateLegacyStorage() {
  STORAGE_MIGRATIONS.forEach(([target, suffix]) => {
    try {
      const current = localStorage.getItem(target);
      if (!current) {
        for (const prefix of LEGACY_STORAGE_PREFIXES) {
          const legacy = localStorage.getItem(prefix + suffix);
          if (legacy) {
            localStorage.setItem(target, legacy);
            break;
          }
        }
      }
      LEGACY_STORAGE_PREFIXES.forEach((prefix) => {
        localStorage.removeItem(prefix + suffix);
      });
    } catch (error) {
      console.warn('[CardGram] No se pudieron migrar los datos anteriores', error);
    }
  });
}

/* Rutas anteriores a la estructura por colecciones: se redirigen a los sets
   activos para que los presets guardados no apunten a archivos retirados. */
const DB_CARDS = 'assets/data/cards/database';
const LEGACY_FRONT = `${DB_CARDS}/Mew Tarot/00 - The Fool.webp`;
const LEGACY_BACK = `${DB_CARDS}/_shared/BACK_CARDGRAM.webp`;
const LEGACY_IMAGE_PATHS = {
  'assets/card_front - base.png': LEGACY_FRONT,
  'assets/card_front - base - ALT-1.png': LEGACY_FRONT,
  'assets/card_front - base - ALT-2.png': `${DB_CARDS}/Mew Tarot/01 - The Magician.webp`,
  'assets/card_front - base - ALT-3.png': `${DB_CARDS}/Mew Tarot/02 - The High Priestess.webp`,
  'assets/card_back - base.png': LEGACY_BACK,
  'assets/card_back - ALT-1.png': LEGACY_BACK,
  'assets/card_back - ALT-2.png': LEGACY_BACK,
  'assets/card_back - ALT-3.png': LEGACY_BACK,
  'assets/data/cards/OG/SET-01/FRONT-01.png': LEGACY_FRONT,
  'assets/data/cards/OG/SET-01/BACK-BASE.png': LEGACY_BACK,
  'assets/data/cards/OG/SET-02/FRONT-01.png': `${DB_CARDS}/Mew Tarot/01 - The Magician.webp`,
  'assets/data/cards/OG/SET-02/BACK-BASE.png': LEGACY_BACK,
  'assets/data/cards/OG/SET-03/FRONT-01.png': `${DB_CARDS}/Mew Tarot/02 - The High Priestess.webp`,
  'assets/data/cards/OG/SET-03/BACK-BASE.png': LEGACY_BACK,
  'assets/data/cards/SET_01/FRONT_A_02_AZURA SS.png': `${DB_CARDS}/Mew Tarot/01 - The Magician.webp`,
  'assets/data/cards/SET_01/BACK_A_02.png': LEGACY_BACK,
  'assets/data/cards/YGO/FRONT-DMG_01.png': `${DB_CARDS}/YGO/FRONT_YGO_01.webp`,
  'assets/data/cards/YGO/FRONT-DMG_02 (FULL ART).png': `${DB_CARDS}/YGO/FRONT_YGO_01(FULL-ART).webp`,
  'assets/data/cards/YGO/BACK-BASE.png': `${DB_CARDS}/YGO/BACK_YGO_01.webp`
};

function safeImageUrl(value) {
  if (typeof value !== 'string' || value.length > 8_000_000) return null;

  // Normaliza rutas antiguas con espacios codificados (%20) a su forma legible.
  const normalized = value.replace(/%20/gi, ' ');
  if (LEGACY_IMAGE_PATHS[normalized]) return LEGACY_IMAGE_PATHS[normalized];
  if (/^assets\/card_front - base \(FULL ART\)\.png$/.test(normalized)) return null;
  if (
    /^assets\/[a-z0-9 _().\-/]+\.(png|jpe?g|webp|avif)$/i.test(normalized) &&
    !normalized.includes('..')
  ) {
    return normalized;
  }
  if (/^data:image\/(png|jpe?g|webp|avif|gif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  return null;
}

function sanitizeSettings(raw) {
  const result = { ...DEFAULTS, lang: 'en', sidebarCollapsed: false };
  if (!raw || typeof raw !== 'object') return result;

  const number = (value, min, max, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  };

  result.corners = ['rounded', 'sharp'].includes(raw.corners) ? raw.corners : DEFAULTS.corners;
  const cardFormats = Object.keys((typeof Scene !== 'undefined' && Scene.CARD_FORMATS) || {});
  result.cardFormat = cardFormats.includes(raw.cardFormat) ? raw.cardFormat : DEFAULTS.cardFormat;
  result.edgeThickness = number(raw.edgeThickness, 0.005, 0.05, DEFAULTS.edgeThickness);
  result.bevel = number(raw.bevel, 0.001, 0.012, DEFAULTS.bevel);
  result.edgeColor = ['black', 'gold', 'silver', 'white'].includes(raw.edgeColor) ? raw.edgeColor : DEFAULTS.edgeColor;
  result.gloss = number(raw.gloss, 0.05, 0.9, DEFAULTS.gloss);
  result.exposure = number(raw.exposure, 0.4, 1.4, DEFAULTS.exposure);
  result.speed = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5].includes(Number(raw.speed)) ? Number(raw.speed) : DEFAULTS.speed;
  result.spinDir = Number(raw.spinDir) === -1 ? -1 : 1;
  result.float = ['organic', 'subtle', 'breathe', 'dramatic', 'off'].includes(raw.float) ? raw.float : DEFAULTS.float;
  result.camDistance = number(raw.camDistance, 2, 14, DEFAULTS.camDistance);
  result.posY = number(raw.posY, -1.5, 1.5, DEFAULTS.posY);
  result.posX = number(raw.posX, -2.0, 2.0, DEFAULTS.posX);
  result.fov = number(raw.fov, 15, 90, DEFAULTS.fov);
  result.lightIntensity = number(raw.lightIntensity, 0.2, 2.5, DEFAULTS.lightIntensity);
  result.lightWarmth = number(raw.lightWarmth, -1.0, 1.0, DEFAULTS.lightWarmth);
  result.tilt = number(raw.tilt, 0, 2.5, DEFAULTS.tilt);
  result.aspect = ['9:16', '1:1', '16:9', 'fill'].includes(raw.aspect) ? raw.aspect : DEFAULTS.aspect;
  result.scale = number(raw.scale, 50, 100, DEFAULTS.scale);
  result.bg = ['aqua', 'studio', 'oled', 'sunset', 'cyber', 'transparent'].includes(raw.bg) ? raw.bg : DEFAULTS.bg;
  result.duration = [5, 10, 15].includes(Number(raw.duration)) ? Number(raw.duration) : DEFAULTS.duration;
  result.fullArtAnim = raw.fullArtAnim !== false;
  result.fabX = Number.isFinite(Number(raw.fabX)) ? clamp(Number(raw.fabX), 0, 10000) : null;
  result.fabY = Number.isFinite(Number(raw.fabY)) ? clamp(Number(raw.fabY), 0, 10000) : null;
  result.lang = ['es', 'de'].includes(raw.lang) ? raw.lang : 'en';
  result.sidebarCollapsed = Boolean(raw.sidebarCollapsed);
  return result;
}

function sanitizePresets(raw) {
  if (!Array.isArray(raw)) return [];
  const usedIds = new Set();

  return raw
    .slice(0, MAX_PRESETS)
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const front = safeImageUrl(item.front);
      const back = safeImageUrl(item.back);
      const fullArt = safeImageUrl(item.fullArt);
      if (!front || !back) return null;

      let name = String(item.name || '').trim().slice(0, MAX_PRESET_NAME);
      if (!name) name = `Deck #${index + 1}`;

      let id = typeof item.id === 'string' && /^[a-z0-9_-]{1,48}$/i.test(item.id) ? item.id : uid();
      while (usedIds.has(id)) id = uid();
      usedIds.add(id);

      return {
        id,
        name,
        front,
        back,
        fullArt: fullArt || null,
        createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
      };
    })
    .filter(Boolean);
}

function sanitizeScenes(raw) {
  const fallback = cloneScenes(DEFAULT_SCENES);
  if (!Array.isArray(raw)) return fallback;

  return fallback.map((base, index) => {
    const item = raw[index];
    if (!item || typeof item !== 'object') return base;

    const readVector = (value, source) => {
      if (!Array.isArray(value) || value.length !== 3) return [...source];
      return value.map((entry, axis) => {
        const parsed = Number(entry);
        return Number.isFinite(parsed) ? clamp(parsed, -20, 20) : source[axis];
      });
    };

    const cardY = Number(item.cardY);
    return {
      pos: readVector(item.pos, base.pos),
      target: readVector(item.target, base.target),
      cardY: Number.isFinite(cardY) ? clamp(cardY, -3, 3) : base.cardY
    };
  });
}

function loadState() {
  Object.assign(state, sanitizeSettings(storage.read(STORAGE.settings, null)));
  presets = sanitizePresets(storage.read(STORAGE.presets, []));
  scenes = sanitizeScenes(storage.read(STORAGE.scenes, null));
}

function serializableState() {
  return {
    corners: state.corners,
    cardFormat: state.cardFormat,
    edgeThickness: state.edgeThickness,
    bevel: state.bevel,
    edgeColor: state.edgeColor,
    gloss: state.gloss,
    exposure: state.exposure,
    speed: state.speed,
    spinDir: state.spinDir,
    float: state.float,
    camDistance: state.camDistance,
    posY: state.posY,
    posX: state.posX,
    fov: state.fov,
    lightIntensity: state.lightIntensity,
    lightWarmth: state.lightWarmth,
    tilt: state.tilt,
    aspect: state.aspect,
    scale: state.scale,
    bg: state.bg,
    duration: state.duration,
    fullArtAnim: state.fullArtAnim,
    fabX: state.fabX,
    fabY: state.fabY,
    lang: currentLang,
    sidebarCollapsed: state.sidebarCollapsed
  };
}

function persistSettings() {
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(() => {
    const ok = storage.write(STORAGE.settings, serializableState());
    if (!ok && !storageWarned) {
      storageWarned = true;
      toast(t('storage_error'), { type: 'error', duration: 5000 });
    }
  }, 250);
}

function persistPresets() {
  const ok = storage.write(STORAGE.presets, presets);
  if (!ok) toast(t('quota_error'), { type: 'error', duration: 6500 });
  return ok;
}

function persistScenes() {
  storage.write(STORAGE.scenes, scenes);
}

/* --------------------------------------------------------------------------
   Toasts y diálogos
   -------------------------------------------------------------------------- */
function toast(message, options = {}) {
  if (!el.toastStack) return () => {};
  const { type = 'info', duration = 3600, actionLabel = '', onAction = null } = options;

  while (el.toastStack.children.length >= 3) {
    el.toastStack.lastElementChild.remove();
  }

  const node = document.createElement('div');
  node.className = `toast ${type}`;

  if (window.Sound) {
    window.Sound.play(
      type === 'success' ? 'success' : type === 'error' || type === 'warning' ? 'error' : 'info'
    );
  }

  const iconWrap = document.createElement('span');
  iconWrap.className = 'toast-icon';
  const iconName = type === 'success' ? 'check' : type === 'error' || type === 'warning' ? 'alert' : 'info';
  iconWrap.appendChild(createIcon(iconName));

  const messageNode = document.createElement('span');
  messageNode.className = 'toast-message';
  messageNode.textContent = message;

  node.append(iconWrap, messageNode);

  let timer = 0;
  const dismiss = () => {
    if (node.classList.contains('leaving')) return;
    clearTimeout(timer);
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 280);
  };

  if (actionLabel && typeof onAction === 'function') {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'toast-action';
    action.textContent = actionLabel;
    action.addEventListener('click', () => {
      dismiss();
      onAction();
    });
    node.appendChild(action);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', t('cancel'));
  close.appendChild(createIcon('close'));
  close.addEventListener('click', dismiss);
  node.appendChild(close);

  el.toastStack.prepend(node);
  if (duration > 0) timer = setTimeout(dismiss, duration);
  return dismiss;
}

function confirmAction({ title, message, confirmLabel }) {
  return new Promise((resolve) => {
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    el.confirmOk.textContent = confirmLabel || t('confirm');
    el.confirmDialog.returnValue = '';

    const onClose = () => {
      el.confirmDialog.removeEventListener('close', onClose);
      resolve(el.confirmDialog.returnValue === 'confirm');
    };

    el.confirmDialog.addEventListener('close', onClose);
    el.confirmDialog.showModal();
  });
}

function openPresetDialog() {
  el.presetNameInput.value = `Deck #${presets.length + 1}`;
  el.presetDialog.showModal();
  setTimeout(() => {
    el.presetNameInput.focus();
    el.presetNameInput.select();
  }, 40);
}

function openHelp() {
  if (!el.helpDialog.open) el.helpDialog.showModal();
}

/* --------------------------------------------------------------------------
   Idioma
   -------------------------------------------------------------------------- */
function applyLanguage(lang, options = {}) {
  const { persist = true } = options;
  currentLang = ['en', 'es', 'de'].includes(lang) ? lang : 'en';
  state.lang = currentLang;
  document.documentElement.lang = currentLang;

  $$('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (!key) return;
    node.textContent = t(key);
  });

  $$('[data-i18n-title]').forEach((node) => {
    node.title = t(node.getAttribute('data-i18n-title'));
  });

  $$('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.getAttribute('data-i18n-placeholder'));
  });

  $$('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria-label')));
  });

  $$('[data-i18n-alt]').forEach((node) => {
    node.alt = t(node.getAttribute('data-i18n-alt'));
  });

  $$('[data-i18n-tip]').forEach((node) => {
    node.dataset.tip = t(node.getAttribute('data-i18n-tip'));
  });

  $$('.lang-option').forEach((option) => {
    const active = option.getAttribute('data-lang') === currentLang;
    option.classList.toggle('active', active);
    option.setAttribute('aria-checked', String(active));
  });

  updateExportLabel();
  updateFullArtToggle();
  renderPresets();
  if (!exporting) setStatus(t('status_ready'), 'ready');
  if (typeof refreshHubLocale === 'function') refreshHubLocale();
  if (persist) persistSettings();
}

function setLangMenu(open) {
  if (!el.langDropdown || !el.langTrigger) return;

  el.langDropdown.hidden = !open;
  el.langTrigger.setAttribute('aria-expanded', String(open));

  if (open) {
    const active = el.langOptions.find((option) => option.classList.contains('active')) || el.langOptions[0];
    if (active) setTimeout(() => active.focus(), 0);
  }
}

function setupLangMenu() {
  if (!el.langMenu || !el.langTrigger || !el.langDropdown) return;

  el.langTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setLangMenu(el.langDropdown.hidden);
  });

  el.langOptions.forEach((option) => {
    option.addEventListener('click', () => {
      applyLanguage(option.getAttribute('data-lang'));
      setLangMenu(false);
      el.langTrigger.focus();
    });
  });

  el.langDropdown.addEventListener('keydown', (event) => {
    const options = el.langOptions;
    const index = options.indexOf(document.activeElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const next = (index + direction + options.length) % options.length;
      options[next].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      options[event.key === 'Home' ? 0 : options.length - 1].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setLangMenu(false);
      el.langTrigger.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!el.langMenu.contains(event.target)) setLangMenu(false);
  });
}

/* --------------------------------------------------------------------------
   Pestañas, panel y modo cinemático
   -------------------------------------------------------------------------- */
function isMobile() {
  return window.matchMedia('(max-width: 860px)').matches;
}

function activateTab(tabId, options = {}) {
  const { focus = false } = options;
  $$('.tab-btn').forEach((button) => {
    const active = button.getAttribute('data-tab') === tabId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });

  $$('.tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (el.scrollContent) el.scrollContent.scrollTop = 0;
}

function setSidebar(open, options = {}) {
  const { persist = true } = options;
  if (!el.sidebar) return;

  if (isMobile()) {
    el.sidebar.classList.toggle('open', open);
    document.body.classList.toggle('sidebar-open-mobile', open);
    el.backdrop.classList.toggle('active', open);
    el.sidebar.inert = !open;
    el.sidebar.setAttribute('aria-hidden', String(!open));
    el.toggleBtn.setAttribute('aria-expanded', String(open));
  } else {
    document.body.classList.toggle('sidebar-collapsed', !open);
    el.sidebar.inert = !open;
    el.sidebar.setAttribute('aria-hidden', String(!open));
    el.toggleBtn.setAttribute('aria-expanded', String(open));
    state.sidebarCollapsed = !open;
    if (persist) persistSettings();
    scheduleResize();
  }
}

function toggleSidebar() {
  if (isMobile()) {
    setSidebar(!el.sidebar.classList.contains('open'));
  } else {
    setSidebar(document.body.classList.contains('sidebar-collapsed'));
  }
}

function enterCinematic() {
  if (document.body.classList.contains('cinematic-mode')) return;
  if (isMobile() && el.sidebar.classList.contains('open')) setSidebar(false);
  setFlower(false);
  document.body.classList.add('cinematic-mode');
  el.exitTip.classList.add('visible');
  clearTimeout(cinematicTipTimer);
  cinematicTipTimer = setTimeout(() => el.exitTip.classList.remove('visible'), 4500);
  scheduleResize();
}

function exitCinematic() {
  if (!document.body.classList.contains('cinematic-mode')) return;
  document.body.classList.remove('cinematic-mode');
  el.exitTip.classList.remove('visible');
  clearTimeout(cinematicTipTimer);
  scheduleResize();
}

function toggleCinematic() {
  if (document.body.classList.contains('cinematic-mode')) exitCinematic();
  else enterCinematic();
}

/* --------------------------------------------------------------------------
   Cámara, escenas y movimiento
   -------------------------------------------------------------------------- */
function setActiveScene(index) {
  activeScene = index;
  $$('.scene-card').forEach((card) => {
    const isActive = Number(card.getAttribute('data-scene')) === index;
    card.classList.toggle('active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

function applyScene(index) {
  const pose = scenes[index - 1];
  if (!pose) return;

  const result = Scene.applyPose(pose);
  state.posY = pose.cardY;
  setRange(el.rangePosY, el.valPosY, pose.cardY, (value) => value.toFixed(2));
  setActiveScene(index);

  if (result) {
    state.camDistance = clamp(result.distance, 2, 8);
    setRange(el.rangeCamDist, el.valCamDist, state.camDistance, (value) => value.toFixed(1));
  }

  persistSettings();
}

function savePose(index) {
  const pose = Scene.getPose();
  if (!pose) return;

  scenes[index - 1] = pose;
  const card = $(`.scene-card[data-scene="${index}"]`);
  if (card) card.classList.add('saved');
  persistScenes();
  toast(t('pose_saved', { scene: t(`scene_${index}`) }), { type: 'success' });

  const button = $(`.btn-set-cam[data-set-scene="${index}"]`);
  if (button) {
    const label = button.querySelector('span');
    if (label) {
      label.textContent = t('saved_short');
      setTimeout(() => {
        label.textContent = t('save_pose');
      }, 1400);
    }
  }
}

async function playSequence() {
  if (isSequencePlaying) return;
  isSequencePlaying = true;
  el.btnPlayScenes.disabled = true;
  const label = el.btnPlayScenes.querySelector('span');
  if (label) label.textContent = t('sequence_playing');

  for (const index of [1, 2, 3]) {
    applyScene(index);
    await sleep(2300);
  }

  isSequencePlaying = false;
  el.btnPlayScenes.disabled = false;
  if (label) label.textContent = t('play_scenes');
  toast(t('sequence_done'), { type: 'success' });
}

/* --------------------------------------------------------------------------
   Presets
   -------------------------------------------------------------------------- */
function makePresetChip({ id, name, active, front, back, onSelect, onDelete }) {
  const chip = document.createElement('div');
  chip.className = `preset-chip${active ? ' active' : ''}`;
  if (id) chip.dataset.presetId = id;

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'preset-chip-main';
  main.title = name;
  main.setAttribute('aria-pressed', String(active));
  main.addEventListener('click', onSelect);

  if (front) {
    const thumbs = document.createElement('span');
    thumbs.className = 'preset-thumbs';
    thumbs.setAttribute('aria-hidden', 'true');

    const frontThumb = document.createElement('img');
    frontThumb.src = PREVIEW_MICRO.get(front) || PREVIEW_FRONT.get(front) || front;
    frontThumb.alt = '';
    frontThumb.width = 149;
    frontThumb.height = 200;
    frontThumb.loading = 'lazy';
    frontThumb.decoding = 'async';

    thumbs.appendChild(frontThumb);
    main.appendChild(thumbs);
  }

  const label = document.createElement('span');
  label.className = 'preset-chip-label';
  label.textContent = name;
  main.appendChild(label);

  chip.appendChild(main);

  if (onDelete) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'preset-chip-del';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `${t('delete_preset')}: ${name}`);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      onDelete();
    });
    chip.appendChild(remove);
  }

  return chip;
}

function renderPresets() {
  if (!el.presetsBar) return;
  /* El estudio es perezoso: la barra de presets no se construye (ni descarga
     sus miniaturas) hasta que la persona entra al estudio. */
  if (document.body.dataset.view !== 'studio') return;

  if (el.studioPicker) {
    el.studioPicker.replaceChildren();
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = t('studio_new_card_option');
    el.studioPicker.appendChild(empty);

    const collections = (CATALOG && CATALOG.collections) || [];
    collections.forEach((collection) => {
      const group = document.createElement('optgroup');
      group.label = collection.name;
      collection.cards.forEach((card) => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = `${card.name} · ${card.set}`;
        group.appendChild(option);
      });
      el.studioPicker.appendChild(group);
    });
  }

  el.presetsBar.replaceChildren();
  presets.forEach((preset) => {
    el.presetsBar.appendChild(
      makePresetChip({
        id: preset.id,
        name: preset.name,
        active: activePresetId === preset.id,
        front: preset.front,
        back: preset.back,
        onSelect: () => loadPreset(preset),
        onDelete: () => deletePreset(preset.id)
      })
    );
  });
  if (el.studioSaved) el.studioSaved.hidden = presets.length === 0;
  syncPresetActive();
}

function syncPresetActive() {
  if (el.presetsBar) {
    Array.from(el.presetsBar.querySelectorAll('.preset-chip')).forEach((chip) => {
      const active = chip.dataset.presetId === activePresetId;
      chip.classList.toggle('active', active);
      const main = chip.querySelector('.preset-chip-main');
      if (main) main.setAttribute('aria-pressed', String(active));
    });
  }

  if (el.studioPicker) {
    const builtin = BUILTIN_PRESETS.find((preset) => preset.id === activePresetId);
    el.studioPicker.value = builtin ? builtin.cardId : '';
  }
}

function onStudioPickerChange() {
  if (!el.studioPicker) return;
  const cardId = el.studioPicker.value;
  if (!cardId) {
    beginNewCard();
    if (el.uploadFront) el.uploadFront.focus();
    return;
  }
  const preset = BUILTIN_PRESETS.find((entry) => entry.cardId === cardId);
  if (preset) loadPreset(preset);
}

async function applyCardImages(front, back, fullArt) {
  currentCard.front = front;
  currentCard.back = back;
  currentCard.fullArt = fullArt || null;
  textureStale = true;
  el.frontPreview.src = PREVIEW_FRONT.get(front) || front;
  el.backPreview.src = PREVIEW_BACK.get(back) || back;
  updateFullArtToggle();

  if (!Scene.isReady()) return;

  const status = await Scene.loadCardImages(front, back, currentCard.fullArt);
  textureStale = false;
  if (!status.front || !status.back) {
    toast(t('texture_error'), { type: 'warning', duration: 5000 });
  }
}

function beginNewCard() {
  activePresetId = null;
  syncPresetActive();
}

function restoreDefaultCard() {
  const builtin = BUILTIN_PRESETS.find((preset) => preset.cardId === DEFAULT_CARD.id);
  activePresetId = builtin ? builtin.id : 'default';
  syncPresetActive();
  applyCardImages(DEFAULT_CARD.front, DEFAULT_CARD.back, DEFAULT_CARD.fullArt);
  toast(t('default_restored'), { type: 'success' });
}

function loadPreset(preset) {
  activePresetId = preset.id;
  syncPresetActive();
  applyCardImages(preset.front, preset.back, preset.fullArt);
  toast(t('preset_loaded', { name: preset.name }), { type: 'success' });
}

function deletePreset(id) {
  const index = presets.findIndex((preset) => preset.id === id);
  if (index < 0) return;

  const [removed] = presets.splice(index, 1);
  if (!persistPresets()) {
    presets.splice(index, 0, removed);
    return;
  }

  if (activePresetId === id) {
    activePresetId = null;
    renderPresets();
  } else {
    renderPresets();
  }

  toast(t('preset_deleted'), {
    type: 'info',
    duration: 7000,
    actionLabel: t('undo'),
    onAction: () => {
      presets.splice(index, 0, removed);
      if (persistPresets()) {
        renderPresets();
        if (typeof refreshHubData === 'function') refreshHubData();
        toast(t('preset_restored'), { type: 'success' });
      }
    }
  });

  if (typeof refreshHubData === 'function') refreshHubData();
}

function saveCurrentPreset(name) {
  let finalName = name.trim().slice(0, MAX_PRESET_NAME);
  if (!finalName) {
    toast(t('preset_name_required'), { type: 'warning' });
    return false;
  }

  let suffix = 2;
  const baseName = finalName;
  while (presets.some((preset) => preset.name === finalName)) {
    finalName = `${baseName} (${suffix})`;
    suffix += 1;
  }

  const preset = {
    id: uid(),
    name: finalName,
    front: currentCard.front,
    back: currentCard.back,
    fullArt: currentCard.fullArt || null,
    createdAt: Date.now()
  };

  presets.unshift(preset);
  if (!persistPresets()) {
    presets.shift();
    return false;
  }

  activePresetId = preset.id;
  renderPresets();
  if (typeof refreshHubData === 'function') refreshHubData();
  toast(t('preset_saved', { name: finalName }), { type: 'success' });
  return true;
}

/* --------------------------------------------------------------------------
   Cargas de imagen (validadas y re-codificadas)
   -------------------------------------------------------------------------- */
function imageError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function decodeImage(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => decodeWithElement(file));
  }
  return decodeWithElement(file);
}

function decodeWithElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(imageError('read'));
    };
    image.src = url;
  });
}

function encodeBitmap(bitmap, maxEdge, quality) {
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  if (!width || !height) throw imageError('read');

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw imageError('read');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  let dataUrl;
  try {
    dataUrl = canvas.toDataURL('image/webp', quality);
  } catch (error) {
    dataUrl = canvas.toDataURL('image/png');
  }

  if (!dataUrl.startsWith('data:image/')) throw imageError('read');
  return dataUrl;
}

async function optimizeImage(file) {
  if (!file || !file.type || !/^image\/(png|jpe?g|webp|avif|gif)$/i.test(file.type)) {
    throw imageError('type');
  }
  if (file.size > MAX_UPLOAD_BYTES) throw imageError('size');

  const bitmap = await decodeImage(file);
  try {
    let dataUrl = encodeBitmap(bitmap, MAX_TEXTURE_EDGE, 0.9);
    if (dataUrl.length > 3_500_000) {
      dataUrl = encodeBitmap(bitmap, 1000, 0.82);
    }
    return dataUrl;
  } finally {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

async function applyCardImage(side, dataUrl, fileName) {
  const token = uploadTokens[side] + 1;
  uploadTokens[side] = token;

  const preview = side === 'front' ? el.frontPreview : el.backPreview;
  preview.src = dataUrl;
  preview.alt = `${t(side === 'front' ? 'front_cover' : 'back_cover')}${fileName ? ` — ${fileName}` : ''}`;
  currentCard[side] = dataUrl;
  if (side === 'front') currentCard.fullArt = null;
  activePresetId = null;
  renderPresets();
  updateFullArtToggle();

  if (!Scene.isReady()) return;
  if (side === 'front') sceneMethod('clearFullArt');
  const ok = await Scene.loadCardImage(side, dataUrl);
  if (token !== uploadTokens[side]) return;
  if (!ok) toast(t('upload_failed'), { type: 'error' });
}

async function handleFile(file, side) {
  try {
    const dataUrl = await optimizeImage(file);
    await applyCardImage(side, dataUrl, file.name);
    toast(t('upload_ok'), { type: 'success' });
  } catch (error) {
    const code = error && error.code;
    const message = code === 'type' ? t('upload_type') : code === 'size' ? t('upload_size') : t('upload_read');
    toast(message, { type: 'error', duration: 5000 });
  }
}

function setupUploads() {
  const pairs = [
    { box: el.uploadFront, input: el.frontInput, side: 'front' },
    { box: el.uploadBack, input: el.backInput, side: 'back' }
  ];

  pairs.forEach(({ box, input, side }) => {
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        input.click();
      }
    });

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      if (file) handleFile(file, side);
    });

    ['dragenter', 'dragover'].forEach((name) => {
      box.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        box.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((name) => {
      box.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        box.classList.remove('dragover');
      });
    });

    box.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleFile(file, side);
    });
  });

  window.addEventListener('dragover', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.upload-box')) event.preventDefault();
  });

  window.addEventListener('drop', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.upload-box')) event.preventDefault();
  });
}

/* --------------------------------------------------------------------------
   Controles de la interfaz
   -------------------------------------------------------------------------- */
function updateRangeFill(input) {
  if (!input) return;
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value) || 0;
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${clamp(percent, 0, 100)}%`);
}

function setRange(input, output, value, formatter) {
  if (!input) return;
  input.value = String(value);
  if (output) output.textContent = formatter(value);
  updateRangeFill(input);
}

function setSegmented(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  $$('.seg-btn', group).forEach((button) => {
    const active = button.getAttribute('data-value') === String(value);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setSwatch(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  $$('.swatch, .bg-swatch', group).forEach((button) => {
    const active = button.getAttribute('data-value') === String(value);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function setupSegmented(groupId, handler) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.addEventListener('click', (event) => {
    const button = event.target.closest('.seg-btn');
    if (!button || !group.contains(button)) return;
    const value = button.getAttribute('data-value');
    setSegmented(groupId, value);
    handler(value);
  });
}

function setupSwatches(groupId, handler) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.addEventListener('click', (event) => {
    const button = event.target.closest('.swatch, .bg-swatch');
    if (!button || !group.contains(button)) return;
    const value = button.getAttribute('data-value');
    setSwatch(groupId, value);
    handler(value);
  });
}

function bindRange(input, output, key, formatter, onChange) {
  if (!input) return;
  input.addEventListener('input', () => {
    const value = Number(input.value);
    state[key] = value;
    if (output) output.textContent = formatter(value);
    updateRangeFill(input);
    if (onChange) onChange(value);
    persistSettings();
  });
}

function updateFullArtToggle() {
  if (!el.toggleFullArt) return;

  const available = Boolean(currentCard.fullArt);
  el.toggleFullArt.disabled = !available;
  el.toggleFullArt.checked = available && Boolean(state.fullArtAnim);

  if (el.fullArtRow) el.fullArtRow.classList.toggle('is-disabled', !available);
  if (el.fullArtState) {
    el.fullArtState.textContent = available
      ? state.fullArtAnim
        ? t('fullart_on')
        : t('fullart_off')
      : t('fullart_unavailable');
  }
}

function syncUI() {
  setSegmented('seg-corners', state.corners);
  setSegmented('seg-aspect', state.aspect);
  setSegmented('seg-duration', String(state.duration));
  setSwatch('edge-swatches', state.edgeColor);
  setSwatch('bg-grid', state.bg);

  if (el.selectCardFormat) el.selectCardFormat.value = state.cardFormat;

  setRange(el.rangeEdgeThickness, el.valEdgeThick, state.edgeThickness, (value) => value.toFixed(3));
  setRange(el.rangeBevel, el.valBevelInt, state.bevel, (value) => value.toFixed(3));
  setRange(el.rangeGloss, el.valGloss, state.gloss, (value) => value.toFixed(2));
  setRange(el.rangeExposure, el.valExposure, state.exposure, (value) => value.toFixed(2));
  setRange(el.rangeCamDist, el.valCamDist, state.camDistance, (value) => value.toFixed(1));
  setRange(el.rangePosY, el.valPosY, state.posY, (value) => value.toFixed(2));
  setRange(el.rangeTilt, el.valTilt, state.tilt, (value) => value.toFixed(1));
  setRange(el.rangeScale, el.valScale, state.scale, (value) => `${Math.round(value)}%`);

  el.selectSpeed.value = String(state.speed);
  el.selectSpinDir.value = String(state.spinDir);
  el.selectFloating.value = state.float;

  if (Scene.isReady()) {
    Scene.applySettings({
      corners: state.corners,
      cardFormat: state.cardFormat,
      edgeThickness: state.edgeThickness,
      bevel: state.bevel,
      edgeColor: state.edgeColor,
      gloss: state.gloss,
      exposure: state.exposure,
      speed: state.speed,
      spinDir: state.spinDir,
      float: state.float,
      camDistance: state.camDistance,
      posY: state.posY,
      tilt: state.tilt,
      bg: state.bg
    });
    sceneMethod('setFullArtEnabled', state.fullArtAnim);
  }

  updateFullArtToggle();
  scheduleResize();
  updateExportLabel();
}

function loadImageSource(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(imageError('read'));
    image.src = src;
  });
}

function renderTemplateCanvas() {
  const canvas = el.templateCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (templateState.artwork) {
    const image = templateState.artwork;
    const base = Math.max(width / image.width, height / image.height);
    const scale = base * (templateState.artZoom / 100);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (width - w) / 2 + (templateState.artX / 100) * width;
    const y = (height - h) / 2 + (templateState.artY / 100) * height;
    ctx.drawImage(image, x, y, w, h);
  }

  if (templateState.template) {
    const image = templateState.template;
    const scale = templateState.templateZoom / 100;
    const w = width * scale;
    const h = height * scale;
    const x = (width - w) / 2 + (templateState.templateX / 100) * width;
    const y = (height - h) / 2 + (templateState.templateY / 100) * height;
    ctx.drawImage(image, x, y, w, h);
  }

  const text = el.templateText ? el.templateText.value.trim() : '';
  if (text) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${templateState.textSize}px "Segoe UI Emoji", "Segoe UI", sans-serif`;
    ctx.fillStyle = templateState.textColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, (templateState.textX / 100) * width, (templateState.textY / 100) * height, width * 0.9);
    ctx.restore();
  }
}

function markTemplateChoice() {
  if (!el.templateGallery) return;
  Array.from(el.templateGallery.querySelectorAll('.template-choice')).forEach((button) => {
    button.classList.toggle('active', button.dataset.templateId === templateState.templateId);
  });
}

function setTemplateImage(image, id) {
  templateState.template = image;
  templateState.templateId = id || null;
  markTemplateChoice();
  renderTemplateCanvas();
}

async function ensureTemplateBuilder() {
  if (!el.templateBuilder || templateState.ready) return;
  templateState.ready = true;
  try {
    const [template, artwork] = await Promise.all([
      loadImageSource(CARD_TEMPLATES[0].src),
      loadImageSource(DEFAULT_CARD.front)
    ]);
    templateState.template = template;
    templateState.artwork = artwork;
    renderTemplateCanvas();
  } catch (error) {
    console.warn('[CardGram] No se pudo preparar el constructor de plantillas', error);
  }
}

function resetTemplateBuilder() {
  templateState.templateId = 'E1';
  templateState.artZoom = 130;
  templateState.artX = 0;
  templateState.artY = 0;
  templateState.templateZoom = 100;
  templateState.templateX = 0;
  templateState.templateY = 0;
  templateState.textSize = 52;
  templateState.textX = 50;
  templateState.textY = 54;
  templateState.textColor = '#ffffff';
  if (el.templateText) el.templateText.value = '';
  const values = {
    'template-art-zoom': 130,
    'template-art-x': 0,
    'template-art-y': 0,
    'template-zoom': 100,
    'template-x': 0,
    'template-y': 0,
    'template-text-size': 52,
    'template-text-x': 50,
    'template-text-y': 54
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input) input.value = String(value);
  });
  const color = document.getElementById('template-text-color');
  if (color) color.value = '#ffffff';

  Promise.all([
    loadImageSource(CARD_TEMPLATES[0].src),
    loadImageSource(DEFAULT_CARD.front)
  ])
    .then(([template, artwork]) => {
      templateState.template = template;
      templateState.artwork = artwork;
      markTemplateChoice();
      renderTemplateCanvas();
    })
    .catch(() => {});
}

function applyTemplateToCard() {
  if (!el.templateCanvas) return;
  const dataUrl = el.templateCanvas.toDataURL('image/webp', 0.92);
  activePresetId = null;
  syncPresetActive();
  applyCardImages(dataUrl, currentCard.back, null);
  toast(t('template_applied'), { type: 'success' });
}

function setupTemplateBuilder() {
  if (!el.templateBuilder || !el.templateGallery) return;

  el.templateGallery.replaceChildren(
    ...CARD_TEMPLATES.map((template) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'template-choice';
      button.dataset.templateId = template.id;
      button.title = template.name;
      const img = document.createElement('img');
      img.src = template.thumb;
      img.alt = template.name;
      img.width = 300;
      img.height = 402;
      img.loading = 'lazy';
      button.appendChild(img);
      button.addEventListener('click', async () => {
        try {
          const image = await loadImageSource(template.src);
          setTemplateImage(image, template.id);
        } catch (error) {
          toast(t('upload_failed'), { type: 'error' });
        }
      });
      return button;
    })
  );
  markTemplateChoice();

  const bindRange = (id, key) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', () => {
      templateState[key] = Number(input.value);
      renderTemplateCanvas();
    });
  };
  bindRange('template-art-zoom', 'artZoom');
  bindRange('template-art-x', 'artX');
  bindRange('template-art-y', 'artY');
  bindRange('template-zoom', 'templateZoom');
  bindRange('template-x', 'templateX');
  bindRange('template-y', 'templateY');
  bindRange('template-text-size', 'textSize');
  bindRange('template-text-x', 'textX');
  bindRange('template-text-y', 'textY');

  const color = document.getElementById('template-text-color');
  if (color) {
    color.addEventListener('input', () => {
      templateState.textColor = color.value;
      renderTemplateCanvas();
    });
  }

  if (el.templateText) {
    el.templateText.addEventListener('input', renderTemplateCanvas);
  }

  const emojis = document.getElementById('template-emojis');
  if (emojis) {
    emojis.addEventListener('click', (event) => {
      const button = event.target.closest('[data-template-emoji]');
      if (!button || !el.templateText) return;
      el.templateText.value += button.dataset.templateEmoji;
      renderTemplateCanvas();
    });
  }

  if (el.templateFileInput) {
    el.templateFileInput.addEventListener('change', async () => {
      const file = el.templateFileInput.files && el.templateFileInput.files[0];
      el.templateFileInput.value = '';
      if (!file) return;
      try {
        const image = await decodeImage(file);
        setTemplateImage(image, null);
      } catch (error) {
        toast(t('upload_failed'), { type: 'error' });
      }
    });
  }

  if (el.templateArtworkInput) {
    el.templateArtworkInput.addEventListener('change', async () => {
      const file = el.templateArtworkInput.files && el.templateArtworkInput.files[0];
      el.templateArtworkInput.value = '';
      if (!file) return;
      try {
        templateState.artwork = await decodeImage(file);
        renderTemplateCanvas();
      } catch (error) {
        toast(t('upload_failed'), { type: 'error' });
      }
    });
  }

  if (el.templateApply) el.templateApply.addEventListener('click', applyTemplateToCard);
  if (el.templateReset) el.templateReset.addEventListener('click', resetTemplateBuilder);

  el.templateBuilder.addEventListener('toggle', () => {
    if (el.templateBuilder.open) {
      ensureTemplateBuilder();
      requestAnimationFrame(renderTemplateCanvas);
    }
  });
}

function setupControls() {
  setupTemplateBuilder();
  if (el.studioPicker) {
    el.studioPicker.addEventListener('change', onStudioPickerChange);
  }

  setupSegmented('seg-corners', (value) => {
    state.corners = value;
    if (Scene.isReady()) Scene.applySettings({ corners: value });
    persistSettings();
  });

  setupSwatches('edge-swatches', (value) => {
    state.edgeColor = value;
    if (Scene.isReady()) Scene.applySettings({ edgeColor: value });
    persistSettings();
  });

  if (el.selectCardFormat) {
    el.selectCardFormat.addEventListener('change', () => {
      state.cardFormat = el.selectCardFormat.value;
      if (Scene.isReady()) Scene.applySettings({ cardFormat: state.cardFormat });
      persistSettings();
    });
  }

  bindRange(el.rangeEdgeThickness, el.valEdgeThick, 'edgeThickness', (value) => value.toFixed(3), (value) => {
    if (Scene.isReady()) Scene.applySettings({ edgeThickness: value });
  });

  bindRange(el.rangeBevel, el.valBevelInt, 'bevel', (value) => value.toFixed(3), (value) => {
    if (Scene.isReady()) Scene.applySettings({ bevel: value });
  });

  bindRange(el.rangeGloss, el.valGloss, 'gloss', (value) => value.toFixed(2), (value) => {
    if (Scene.isReady()) Scene.applySettings({ gloss: value });
  });

  bindRange(el.rangeExposure, el.valExposure, 'exposure', (value) => value.toFixed(2), (value) => {
    if (Scene.isReady()) Scene.applySettings({ exposure: value });
  });

  el.selectSpeed.addEventListener('change', () => {
    state.speed = Number(el.selectSpeed.value);
    if (Scene.isReady()) Scene.applySettings({ speed: state.speed });
    persistSettings();
  });

  el.selectSpinDir.addEventListener('change', () => {
    state.spinDir = Number(el.selectSpinDir.value);
    if (Scene.isReady()) Scene.applySettings({ spinDir: state.spinDir });
    persistSettings();
  });

  el.selectFloating.addEventListener('change', () => {
    state.float = el.selectFloating.value;
    if (Scene.isReady()) Scene.applySettings({ float: state.float });
    persistSettings();
  });

  bindRange(el.rangeCamDist, el.valCamDist, 'camDistance', (value) => value.toFixed(1), (value) => {
    if (Scene.isReady()) Scene.applySettings({ camDistance: value });
  });

  bindRange(el.rangePosY, el.valPosY, 'posY', (value) => value.toFixed(2), (value) => {
    if (Scene.isReady()) Scene.applySettings({ posY: value });
  });

  bindRange(el.rangeTilt, el.valTilt, 'tilt', (value) => value.toFixed(1), (value) => {
    if (Scene.isReady()) Scene.applySettings({ tilt: value });
  });

  setupSegmented('seg-aspect', (value) => {
    state.aspect = value;
    scheduleResize();
    updateExportLabel();
    persistSettings();
  });

  bindRange(el.rangeScale, el.valScale, 'scale', (value) => `${Math.round(value)}%`, () => {
    scheduleResize();
    updateExportLabel();
  });

  setupSwatches('bg-grid', (value) => {
    state.bg = value;
    if (Scene.isReady()) Scene.applySettings({ bg: value });
    persistSettings();
  });

  setupSegmented('seg-duration', (value) => {
    state.duration = Number(value);
    updateExportLabel();
    persistSettings();
  });

  if (el.toggleFullArt) {
    el.toggleFullArt.addEventListener('change', () => {
      state.fullArtAnim = el.toggleFullArt.checked;
      if (Scene.isReady()) sceneMethod('setFullArtEnabled', state.fullArtAnim);
      updateFullArtToggle();
      persistSettings();
    });
  }

  el.btnReset3d.addEventListener('click', reset3D);
  el.btnResetCamera.addEventListener('click', resetCamera);
  el.btnResetSettings.addEventListener('click', resetAllSettings);
  el.btnSaveCardPreset.addEventListener('click', openPresetDialog);
  el.btnRestoreCard.addEventListener('click', restoreDefaultCard);
  el.btnPlayScenes.addEventListener('click', playSequence);

  if (el.btnQuickBg && el.quickBgPopup) {
    el.btnQuickBg.addEventListener('click', (e) => {
      e.stopPropagation();
      el.quickBgPopup.hidden = !el.quickBgPopup.hidden;
    });

    document.addEventListener('click', (e) => {
      if (!el.quickBgPopup.hidden && !el.quickBgPopup.contains(e.target) && !el.btnQuickBg.contains(e.target)) {
        el.quickBgPopup.hidden = true;
      }
    });

    $$('.quick-bg-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        const bg = opt.getAttribute('data-bg');
        state.bg = bg;
        setSwatch('bg-grid', bg);
        if (Scene.isReady()) Scene.applySettings({ bg });
        persistSettings();
        el.quickBgPopup.hidden = true;
        toast(`${t('sec_env')}: ${bg}`, { type: 'info' });
      });
    });
  }

  if (el.customBgInput) {
    el.customBgInput.addEventListener('change', () => {
      const file = el.customBgInput.files && el.customBgInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (Scene.isReady() && typeof Scene.applyCustomBackground === 'function') {
          Scene.applyCustomBackground(dataUrl);
        }
        if (el.quickBgPopup) el.quickBgPopup.hidden = true;
        toast(t('upload_ok'), { type: 'success' });
      };
      reader.readAsDataURL(file);
    });
  }
}

function setupScenes() {
  $$('.scene-card').forEach((card) => {
    const index = Number(card.getAttribute('data-scene'));
    card.addEventListener('click', (event) => {
      if (event.target.closest('.scene-save')) return;
      applyScene(index);
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        applyScene(index);
      }
    });
  });

  $$('.btn-set-cam').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      savePose(Number(button.getAttribute('data-set-scene')));
    });
  });
}

/* --------------------------------------------------------------------------
   Menú radial
   -------------------------------------------------------------------------- */
function setFlower(open) {
  if (!el.flowerMenu) return;
  el.flowerMenu.classList.toggle('open', open);
  el.flowerTrigger.setAttribute('aria-expanded', String(open));
}

function syncSpeedUI() {
  if (el.speedPills) {
    el.speedPills.forEach((pill) => {
      const pillSpeed = Number(pill.getAttribute('data-speed'));
      pill.classList.toggle('active', pillSpeed === state.speed);
    });
  }
  if (el.petalSpeed) {
    el.petalSpeed.setAttribute('data-tip', state.speed === 0 ? t('speed_off') : t('speed_label', { val: state.speed }));
  }
}

function setupFlower() {
  el.flowerTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    if (fabDragged) {
      fabDragged = false;
      return;
    }
    const willOpen = !el.flowerMenu.classList.contains('open');
    setFlower(willOpen);
    if (!willOpen && el.speedSubpopup) {
      el.speedSubpopup.hidden = true;
    }
  });

  document.addEventListener('click', (event) => {
    if (el.flowerMenu && el.flowerMenu.classList.contains('open') && !el.flowerMenu.contains(event.target)) {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
    }
  });

  // 1. Botón velocidad (abre/cierra subpopup de 8 velocidades, switch y OFF)
  if (el.petalSpeed) {
    el.petalSpeed.addEventListener('click', (event) => {
      event.stopPropagation();
      if (el.speedSubpopup) {
        el.speedSubpopup.hidden = !el.speedSubpopup.hidden;
        syncSpeedUI();
      }
    });
  }

  if (el.speedPills) {
    el.speedPills.forEach((pill) => {
      pill.addEventListener('click', (event) => {
        event.stopPropagation();
        state.speed = Number(pill.getAttribute('data-speed'));
        if (el.selectSpeed) el.selectSpeed.value = String(state.speed);
        if (Scene.isReady()) Scene.applySettings({ speed: state.speed });
        syncSpeedUI();
        persistSettings();
        toast(t('speed_label', { val: state.speed }), { type: 'info' });
      });
    });
  }

  if (el.speedDirBtn) {
    el.speedDirBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      state.spinDir *= -1;
      if (el.selectSpinDir) el.selectSpinDir.value = String(state.spinDir);
      if (Scene.isReady()) Scene.applySettings({ spinDir: state.spinDir });
      persistSettings();
      toast(state.spinDir === 1 ? t('speed_dir_cw') : t('speed_dir_ccw'), { type: 'info' });
    });
  }

  if (el.speedOffBtn) {
    el.speedOffBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      state.speed = 0;
      if (el.selectSpeed) el.selectSpeed.value = '0';
      if (Scene.isReady()) Scene.applySettings({ speed: 0 });
      syncSpeedUI();
      persistSettings();
      toast(t('speed_off'), { type: 'info' });
    });
  }

  // 2. Botón formato y tamaño de carta
  if (el.petalFormat) {
    el.petalFormat.addEventListener('click', () => {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
      activateTab('tab-3d');
      if (isMobile()) setSidebar(true);
      if (el.selectCardFormat) {
        el.selectCardFormat.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.selectCardFormat.focus();
      }
    });
  }

  // 3. Botón editar frontal y trasera
  if (el.petalArt) {
    el.petalArt.addEventListener('click', () => {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
      activateTab('tab-deck');
      if (isMobile()) setSidebar(true);
      const frontBox = $('#upload-front');
      if (frontBox) {
        frontBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        frontBox.focus();
      }
    });
  }

  // 4. Botón alternar animaciones de la carta
  if (el.petalAnim) {
    el.petalAnim.addEventListener('click', () => {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
      if (typeof playSceneSequence === 'function') {
        playSceneSequence();
      } else {
        const nextScene = (activeScene % 3) + 1;
        applyScene(nextScene);
      }
    });
  }

  // 5. Botón alternar gravedad / oscilación
  if (el.petalGravity) {
    el.petalGravity.addEventListener('click', () => {
      const order = ['organic', 'subtle', 'breathe', 'dramatic', 'off'];
      const currentIndex = order.indexOf(state.float);
      const nextFloat = order[(currentIndex + 1) % order.length];
      state.float = nextFloat;
      if (el.selectFloating) el.selectFloating.value = nextFloat;
      if (Scene.isReady()) Scene.applySettings({ float: nextFloat });
      persistSettings();
      toast(`${t('floating')}: ${t('float_' + nextFloat)}`, { type: 'info' });
    });
  }

  // 6. Botón hacer captura
  if (el.petalSnapshot) {
    el.petalSnapshot.addEventListener('click', () => {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
      exportSnapshot();
    });
  }

  // 7. Botón hacer captura de video
  if (el.petalRecord) {
    el.petalRecord.addEventListener('click', () => {
      setFlower(false);
      if (el.speedSubpopup) el.speedSubpopup.hidden = true;
      exportVideo();
    });
  }

  // Botón de cámara en la posición opuesta a cinemático
  if (el.btnCameraStage) {
    el.btnCameraStage.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!el.cameraDialog) return;
      if (el.cameraDialog.open) {
        el.cameraDialog.close();
      } else {
        syncCameraDialogUI();
        el.cameraDialog.show();
      }
    });

    document.addEventListener('click', (event) => {
      if (el.cameraDialog && el.cameraDialog.open && !el.cameraDialog.contains(event.target) && !el.btnCameraStage.contains(event.target)) {
        el.cameraDialog.close();
      }
    });
  }

  if (el.dlgCamClose) {
    el.dlgCamClose.addEventListener('click', () => {
      if (el.cameraDialog) el.cameraDialog.close();
    });
  }

  if (el.dlgCamReset) {
    el.dlgCamReset.addEventListener('click', () => {
      state.posX = 0;
      state.posY = 0;
      state.fov = 38;
      state.camDistance = 4.6;
      state.lightIntensity = 1.0;
      state.lightWarmth = 0.0;
      if (Scene.isReady()) {
        Scene.centerCamera();
        Scene.applySettings({
          posX: 0,
          posY: 0,
          fov: 38,
          camDistance: 6.8,
          lightIntensity: 1.0,
          lightWarmth: 0.0
        });
      }
      syncCameraDialogUI();
      persistSettings();
      toast(t('camera_centered'), { type: 'success' });
    });
  }

  setupCameraDialogControls();
}

function syncCameraDialogUI() {
  if (el.dlgPosY) {
    el.dlgPosY.value = String(state.posY || 0);
    if (el.valDlgPosY) el.valDlgPosY.textContent = Number(state.posY || 0).toFixed(2);
  }
  if (el.dlgPosX) {
    el.dlgPosX.value = String(state.posX || 0);
    if (el.valDlgPosX) el.valDlgPosX.textContent = Number(state.posX || 0).toFixed(2);
  }
  if (el.dlgFov) {
    el.dlgFov.value = String(state.fov || 38);
    if (el.valDlgFov) el.valDlgFov.textContent = `${Math.round(state.fov || 38)}°`;
  }
  if (el.dlgCamDist) {
    el.dlgCamDist.value = String(state.camDistance || 4.6);
    if (el.valDlgCamDist) el.valDlgCamDist.textContent = Number(state.camDistance || 4.6).toFixed(1);
  }
  if (el.dlgLightIntensity) {
    el.dlgLightIntensity.value = String(state.lightIntensity !== undefined ? state.lightIntensity : 1.0);
    if (el.valDlgLightIntensity) el.valDlgLightIntensity.textContent = `${Number(state.lightIntensity !== undefined ? state.lightIntensity : 1.0).toFixed(2)}x`;
  }
  if (el.dlgLightWarmth) {
    el.dlgLightWarmth.value = String(state.lightWarmth || 0);
    if (el.valDlgLightWarmth) el.valDlgLightWarmth.textContent = Number(state.lightWarmth || 0).toFixed(1);
  }
}

function setupCameraDialogControls() {
  if (el.dlgPosY) {
    el.dlgPosY.addEventListener('input', () => {
      state.posY = Number(el.dlgPosY.value);
      if (el.valDlgPosY) el.valDlgPosY.textContent = state.posY.toFixed(2);
      if (el.rangePosY) setRange(el.rangePosY, el.valPosY, state.posY, (v) => v.toFixed(2));
      if (Scene.isReady()) Scene.applySettings({ posY: state.posY });
      persistSettings();
    });
  }

  if (el.dlgPosX) {
    el.dlgPosX.addEventListener('input', () => {
      state.posX = Number(el.dlgPosX.value);
      if (el.valDlgPosX) el.valDlgPosX.textContent = state.posX.toFixed(2);
      if (Scene.isReady()) Scene.applySettings({ posX: state.posX });
      persistSettings();
    });
  }

  if (el.dlgFov) {
    el.dlgFov.addEventListener('input', () => {
      state.fov = Number(el.dlgFov.value);
      if (el.valDlgFov) el.valDlgFov.textContent = `${Math.round(state.fov)}°`;
      if (Scene.isReady()) Scene.applySettings({ fov: state.fov });
      persistSettings();
    });
  }

  if (el.dlgCamDist) {
    el.dlgCamDist.addEventListener('input', () => {
      state.camDistance = Number(el.dlgCamDist.value);
      if (el.valDlgCamDist) el.valDlgCamDist.textContent = state.camDistance.toFixed(1);
      if (el.rangeCamDist) setRange(el.rangeCamDist, el.valCamDist, state.camDistance, (v) => v.toFixed(1));
      if (Scene.isReady()) Scene.applySettings({ camDistance: state.camDistance });
      persistSettings();
    });
  }

  if (el.dlgLightIntensity) {
    el.dlgLightIntensity.addEventListener('input', () => {
      state.lightIntensity = Number(el.dlgLightIntensity.value);
      if (el.valDlgLightIntensity) el.valDlgLightIntensity.textContent = `${state.lightIntensity.toFixed(2)}x`;
      if (Scene.isReady()) Scene.applySettings({ lightIntensity: state.lightIntensity });
      persistSettings();
    });
  }

  if (el.dlgLightWarmth) {
    el.dlgLightWarmth.addEventListener('input', () => {
      state.lightWarmth = Number(el.dlgLightWarmth.value);
      if (el.valDlgLightWarmth) el.valDlgLightWarmth.textContent = state.lightWarmth.toFixed(1);
      if (Scene.isReady()) Scene.applySettings({ lightWarmth: state.lightWarmth });
      persistSettings();
    });
  }
}

function fabBounds() {
  const width = (el.viewport && el.viewport.clientWidth) || window.innerWidth;
  const height = (el.viewport && el.viewport.clientHeight) || window.innerHeight;
  const size = (el.flowerMenu && el.flowerMenu.offsetWidth) || 54;
  const margin = 10;

  return {
    width,
    height,
    size,
    margin,
    maxX: Math.max(margin, width - size - margin),
    maxY: Math.max(margin, height - size - margin)
  };
}

function updateFabOrientation(x, y) {
  if (!el.flowerMenu) return;
  const bounds = fabBounds();
  el.flowerMenu.classList.toggle('petals-right', x < bounds.width / 2);
  el.flowerMenu.classList.toggle('petals-down', y < bounds.height / 2);
}

function applyFabPosition() {
  if (!el.flowerMenu) return;

  if (!Number.isFinite(state.fabX) || !Number.isFinite(state.fabY)) {
    el.flowerMenu.style.left = '';
    el.flowerMenu.style.top = '';
    el.flowerMenu.style.right = '';
    el.flowerMenu.style.bottom = '';
    el.flowerMenu.classList.remove('petals-right', 'petals-down');
    return;
  }

  const bounds = fabBounds();
  const x = clamp(state.fabX, bounds.margin, bounds.maxX);
  const y = clamp(state.fabY, bounds.margin, bounds.maxY);

  state.fabX = x;
  state.fabY = y;
  el.flowerMenu.style.left = `${x}px`;
  el.flowerMenu.style.top = `${y}px`;
  el.flowerMenu.style.right = 'auto';
  el.flowerMenu.style.bottom = 'auto';
  updateFabOrientation(x, y);
}

function setupFabDrag() {
  if (!el.flowerMenu || !el.flowerTrigger || !el.viewport) return;

  const trigger = el.flowerTrigger;
  const menu = el.flowerMenu;
  let drag = null;

  trigger.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const menuRect = menu.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - menuRect.left,
      offsetY: event.clientY - menuRect.top,
      moved: false
    };

    menu.classList.add('dragging');
    try {
      trigger.setPointerCapture(event.pointerId);
    } catch (error) {
      /* Captura de puntero no disponible en algunos navegadores. */
    }
  });

  trigger.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;

    drag.moved = true;
    event.preventDefault();

    const bounds = fabBounds();
    const viewportRect = el.viewport.getBoundingClientRect();
    const x = clamp(
      event.clientX - viewportRect.left - drag.offsetX,
      bounds.margin,
      bounds.maxX
    );
    const y = clamp(
      event.clientY - viewportRect.top - drag.offsetY,
      bounds.margin,
      bounds.maxY
    );

    state.fabX = x;
    state.fabY = y;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    updateFabOrientation(x, y);
  });

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;

    const moved = drag.moved;
    drag = null;
    menu.classList.remove('dragging');

    try {
      trigger.releasePointerCapture(event.pointerId);
    } catch (error) {
      /* La captura ya pudo haberse liberado. */
    }

    if (!moved) return;

    fabDragged = true;
    setTimeout(() => {
      fabDragged = false;
    }, 360);
    persistSettings();
  };

  trigger.addEventListener('pointerup', finishDrag);
  trigger.addEventListener('pointercancel', finishDrag);
  trigger.addEventListener('lostpointercapture', (event) => {
    if (!drag) return;
    finishDrag(event);
  });
}

/* --------------------------------------------------------------------------
   Reinicios
   -------------------------------------------------------------------------- */
function reset3D() {
  state.corners = DEFAULTS.corners;
  state.edgeThickness = DEFAULTS.edgeThickness;
  state.bevel = DEFAULTS.bevel;
  state.edgeColor = DEFAULTS.edgeColor;
  state.gloss = DEFAULTS.gloss;
  state.exposure = DEFAULTS.exposure;
  syncUI();
  persistSettings();
  toast(t('reset_3d_done'), { type: 'success' });
}

function resetCamera() {
  if (Scene.isReady()) Scene.centerCamera();
  state.posY = 0;
  state.tilt = DEFAULTS.tilt;
  setRange(el.rangePosY, el.valPosY, state.posY, (value) => value.toFixed(2));
  setRange(el.rangeTilt, el.valTilt, state.tilt, (value) => value.toFixed(1));
  if (Scene.isReady()) Scene.applySettings({ posY: state.posY, tilt: state.tilt });
  persistSettings();
  toast(t('camera_centered'), { type: 'success' });
}

async function resetAllSettings() {
  const confirmed = await confirmAction({
    title: t('reset_confirm_title'),
    message: t('reset_confirm_desc'),
    confirmLabel: t('confirm')
  });
  if (!confirmed) return;

  const lang = currentLang;
  storage.remove(STORAGE.settings);
  storage.remove(STORAGE.scenes);
  Object.assign(state, sanitizeSettings(null));
  state.lang = lang;
  scenes = cloneScenes(DEFAULT_SCENES);
  activeScene = 1;
  syncUI();
  setActiveScene(1);
  applyFabPosition();
  persistSettings();
  persistScenes();
  toast(t('reset_all_done'), { type: 'success' });
}

/* --------------------------------------------------------------------------
   Redimensionado y metadatos de exportación
   -------------------------------------------------------------------------- */
function scheduleResize() {
  if (resizeRaf) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0;
    resizeCanvas();
  });
}

function resizeCanvas() {
  const size = Scene.resize({
    aspect: state.aspect,
    scale: state.scale,
    cinematic: document.body.classList.contains('cinematic-mode')
  });
  if (size) updateStageChips(size.width, size.height);
  applyFabPosition();
}

function getStageRatio() {
  if (state.aspect === 'fill') {
    const width = el.wrapper.clientWidth || 1080;
    const height = el.wrapper.clientHeight || 1920;
    return width / height;
  }
  return ASPECTS[state.aspect] || ASPECTS['9:16'];
}

function getExportSize() {
  if (state.aspect === '9:16') return { width: 1080, height: 1920 };
  if (state.aspect === '1:1') return { width: 1080, height: 1080 };
  if (state.aspect === '16:9') return { width: 1920, height: 1080 };

  const ratio = getStageRatio();
  if (ratio >= 1) {
    const width = 1920;
    return { width, height: even(width / ratio) };
  }
  const height = 1920;
  return { width: even(height * ratio), height };
}

function resolutionLabel(width, height) {
  const shortSide = Math.min(width, height);
  if (shortSide >= 1080) return '1080p';
  if (shortSide >= 720) return '720p';
  return 'HD';
}

function updateStageChips(width, height) {
  const aspectText = state.aspect === 'fill' ? t('aspect_fill') : state.aspect;
  if (el.stageChipAspect) el.stageChipAspect.textContent = aspectText;
  if (el.stageChipRes) el.stageChipRes.textContent = resolutionLabel(width, height);
}

function updateExportLabel() {
  const size = getExportSize();
  const aspectText = state.aspect === 'fill' ? t('aspect_fill') : state.aspect;

  if (el.metaAspect) el.metaAspect.textContent = aspectText;
  if (el.metaResolution) el.metaResolution.textContent = resolutionLabel(size.width, size.height);
  if (el.metaDuration) el.metaDuration.textContent = `${state.duration}s`;
  if (el.resolutionLabel) el.resolutionLabel.textContent = `${size.width} × ${size.height}`;
  if (!exporting && el.recordBtnText) {
    el.recordBtnText.textContent = `${t('export_video')} · ${state.duration}s`;
  }

  updateStageChips(el.wrapper.clientWidth || size.width, el.wrapper.clientHeight || size.height);
}

function setStatus(message, stateName = 'ready') {
  if (!el.statusLabel) return;
  el.statusLabel.textContent = message;
  el.statusText.dataset.state = stateName;
}

function setProgress(percent, active) {
  if (!el.exportProgress) return;
  const value = clamp(percent, 0, 100);
  el.exportProgress.classList.toggle('active', Boolean(active));
  el.exportProgressFill.style.width = active ? `${value}%` : '0%';
  el.exportProgress.setAttribute('aria-valuenow', String(Math.round(value)));
}

function setBusyUI(busy) {
  el.recordBtn.disabled = busy;
  el.snapshotBtn.disabled = busy;
  el.recordBtn.setAttribute('aria-busy', String(busy));
  if (busy) {
    el.recordBtnText.textContent = t('exporting');
  } else {
    updateExportLabel();
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

function fileStamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/* --------------------------------------------------------------------------
   Atajos de teclado
   -------------------------------------------------------------------------- */
function setupKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (document.body.dataset.view !== 'studio') return;

    const target = event.target;
    const tagName = target && target.tagName ? target.tagName.toLowerCase() : '';
    const typing = tagName === 'input' || tagName === 'select' || tagName === 'textarea' || (target && target.isContentEditable);
    const dialogOpen = Boolean(document.querySelector('dialog[open]'));

    if (event.key === 'Escape') {
      if (dialogOpen) return;
      if (exporting) {
        event.preventDefault();
        cancelExport();
        return;
      }
      if (el.langDropdown && !el.langDropdown.hidden) {
        event.preventDefault();
        setLangMenu(false);
        el.langTrigger.focus();
        return;
      }
      if (el.flowerMenu.classList.contains('open')) {
        setFlower(false);
        return;
      }
      if (document.body.classList.contains('cinematic-mode')) {
        exitCinematic();
      }
      return;
    }

    if (typing || dialogOpen || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key >= '1' && event.key <= '4') {
      const ids = ['tab-deck', 'tab-3d', 'tab-anim', 'tab-canvas'];
      activateTab(ids[Number(event.key) - 1], { focus: true });
      return;
    }

    const key = event.key.toLowerCase();
    if (key === 'c') {
      toggleCinematic();
    } else if (key === 'r') {
      exportVideo();
    } else if (key === 's') {
      exportSnapshot();
    } else if (event.key === '?') {
      openHelp();
    }
  });
}

/* --------------------------------------------------------------------------
   Inicio
   -------------------------------------------------------------------------- */
function cacheDom() {
  el.sidebar = $('#sidebar');
  el.backdrop = $('#sidebar-backdrop');
  el.toggleBtn = $('#sidebar-toggle-btn');
  el.btnCloseDrawer = $('#btn-close-drawer');
  el.btnCinematic = $('#btn-cinematic');
  el.btnCinematicExit = $('#btn-cinematic-exit');
  el.exitTip = $('#cinematic-exit-tip');
  el.navTabs = $('.nav-tabs');
  el.scrollContent = $('#scroll-content');

  el.langMenu = $('#lang-menu');
  el.langTrigger = $('#btn-lang');
  el.langDropdown = $('#lang-dropdown');
  el.langOptions = $$('.lang-option');
  el.btnHelp = $('#btn-help');
  el.helpDialog = $('#help-dialog');
  el.helpClose = $('#help-close');

  el.presetsBar = $('#card-presets-bar');
  el.studioPicker = $('#studio-card-picker');
  el.studioSaved = $('#studio-saved');
  el.uploadFront = $('#upload-front');
  el.templateBuilder = $('#template-builder');
  el.templateGallery = $('#template-gallery');
  el.templateCanvas = $('#template-canvas');
  el.templateFileInput = $('#template-file-input');
  el.templateArtworkInput = $('#template-artwork-input');
  el.templateText = $('#template-text');
  el.templateApply = $('#template-apply');
  el.templateReset = $('#template-reset');
  el.uploadBack = $('#upload-back');
  el.frontInput = $('#front-file-input');
  el.backInput = $('#back-file-input');
  el.frontPreview = $('#front-preview-img');
  el.backPreview = $('#back-preview-img');
  el.btnSaveCardPreset = $('#btn-save-card-preset');
  el.btnRestoreCard = $('#btn-restore-card');
  el.fullArtRow = $('#fullart-row');
  el.toggleFullArt = $('#toggle-fullart');
  el.fullArtState = $('#fullart-state');

  el.rangeEdgeThickness = $('#range-edge-thickness');
  el.valEdgeThick = $('#val-edge-thick');
  el.rangeBevel = $('#range-bevel-intensity');
  el.valBevelInt = $('#val-bevel-int');
  el.rangeGloss = $('#range-gloss');
  el.valGloss = $('#val-gloss');
  el.rangeExposure = $('#range-exposure');
  el.valExposure = $('#val-exposure');

  el.selectSpeed = $('#select-speed');
  el.selectSpinDir = $('#select-spin-dir');
  el.selectFloating = $('#select-floating');
  el.selectCardFormat = $('#select-card-format');
  el.rangeCamDist = $('#range-cam-dist');
  el.valCamDist = $('#val-cam-dist');
  el.rangePosY = $('#range-pos-y');
  el.valPosY = $('#val-pos-y');
  el.rangeTilt = $('#range-tilt-intensity');
  el.valTilt = $('#val-tilt-intensity');
  el.btnPlayScenes = $('#btn-play-scenes');

  el.rangeScale = $('#range-canvas-scale');
  el.valScale = $('#val-canvas-scale');
  el.resolutionLabel = $('#resolution-label');
  el.btnReset3d = $('#btn-reset-3d');
  el.btnResetCamera = $('#btn-reset-camera');
  el.btnResetSettings = $('#btn-reset-settings');

  el.viewport = $('#viewport-container');
  el.wrapper = $('#canvas-window-wrapper');
  el.stageChipAspect = $('#stage-chip-aspect');
  el.stageChipRes = $('#stage-chip-res');
  el.viewportHint = $('#viewport-hint');
  el.loadingVeil = $('#loading-veil');
  el.loadingTitle = $('#loading-title');
  el.loadingText = $('#loading-text');

  el.flowerMenu = $('#flower-menu');
  el.flowerTrigger = $('#flower-trigger');
  el.petalSpeed = $('#petal-speed');
  el.petalFormat = $('#petal-format');
  el.petalArt = $('#petal-art');
  el.petalAnim = $('#petal-anim');
  el.petalGravity = $('#petal-gravity');
  el.petalSnapshot = $('#petal-snapshot');
  el.petalRecord = $('#petal-record');

  el.speedSubpopup = $('#speed-subpopup');
  el.speedDirBtn = $('#speed-dir-btn');
  el.speedOffBtn = $('#speed-off-btn');
  el.speedPills = $$('.speed-pill-btn');

  el.btnCameraStage = $('#btn-camera-stage');
  el.cameraDialog = $('#camera-dialog');
  el.dlgPosY = $('#dlg-pos-y');
  el.valDlgPosY = $('#val-dlg-pos-y');
  el.dlgPosX = $('#dlg-pos-x');
  el.valDlgPosX = $('#val-dlg-pos-x');
  el.dlgFov = $('#dlg-fov');
  el.valDlgFov = $('#val-dlg-fov');
  el.dlgCamDist = $('#dlg-cam-dist');
  el.valDlgCamDist = $('#val-dlg-cam-dist');
  el.dlgLightIntensity = $('#dlg-light-intensity');
  el.valDlgLightIntensity = $('#val-dlg-light-intensity');
  el.dlgLightWarmth = $('#dlg-light-warmth');
  el.valDlgLightWarmth = $('#val-dlg-light-warmth');
  el.dlgCamReset = $('#dlg-cam-reset');
  el.dlgCamClose = $('#dlg-cam-close');
  el.btnQuickBg = $('#btn-quick-bg');
  el.quickBgPopup = $('#quick-bg-popup');
  el.customBgInput = $('#custom-bg-input');

  el.toastStack = $('#toast-stack');
  el.presetDialog = $('#preset-dialog');
  el.presetForm = $('#preset-form');
  el.presetNameInput = $('#preset-name-input');
  el.presetCancel = $('#preset-dialog-cancel');
  el.presetSave = $('#preset-dialog-save');
  el.confirmDialog = $('#confirm-dialog');
  el.confirmTitle = $('#confirm-title');
  el.confirmMessage = $('#confirm-message');
  el.confirmOk = $('#confirm-ok');
  el.confirmCancel = $('#confirm-cancel');

  el.recordBtn = $('#btn-record');
  el.recordBtnText = $('#record-btn-text');
  el.snapshotBtn = $('#btn-snapshot');
  el.statusText = $('#status-text');
  el.statusLabel = $('#status-label');
  el.exportProgress = $('#export-progress');
  el.exportProgressFill = $('#export-progress-fill');
  el.metaAspect = $('#meta-aspect');
  el.metaResolution = $('#meta-resolution');
  el.metaDuration = $('#meta-duration');
}

function hideLoading() {
  if (!el.loadingVeil) return;
  setTimeout(() => {
    el.loadingVeil.classList.add('hidden');
    el.loadingVeil.setAttribute('aria-hidden', 'true');
  }, 420);
}

function showWebglError() {
  if (el.loadingVeil) {
    el.loadingVeil.classList.add('is-error');
    el.loadingVeil.setAttribute('aria-hidden', 'false');
    el.loadingTitle.textContent = t('webgl_error');
    el.loadingText.textContent = t('webgl_error_desc');
  }
  el.recordBtn.disabled = true;
  el.snapshotBtn.disabled = true;
  setStatus(t('webgl_error'), 'error');
}

function setupChrome() {
  $$('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => activateTab(button.getAttribute('data-tab')));
  });

  el.navTabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = $$('.tab-btn');
    const currentIndex = buttons.indexOf(document.activeElement);
    let nextIndex = currentIndex;

    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = buttons.length - 1;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    else nextIndex = (currentIndex + 1) % buttons.length;

    activateTab(buttons[nextIndex].getAttribute('data-tab'), { focus: true });
  });

  el.toggleBtn.addEventListener('click', toggleSidebar);
  el.btnCloseDrawer.addEventListener('click', () => setSidebar(false));
  el.backdrop.addEventListener('click', () => setSidebar(false));

  el.btnCinematic.addEventListener('click', enterCinematic);
  if (el.btnCinematicExit) {
    el.btnCinematicExit.addEventListener('click', (e) => {
      e.stopPropagation();
      exitCinematic();
    });
  }
  el.exitTip.addEventListener('click', (e) => {
    e.stopPropagation();
    exitCinematic();
  });

  let pointerStart = { x: 0, y: 0, time: 0 };
  let lastCinematicTap = { x: 0, y: 0, time: 0 };

  el.viewport.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY, time: performance.now() };
    el.viewportHint.classList.add('hidden');
  });

  el.viewport.addEventListener('pointerup', (event) => {
    if (!document.body.classList.contains('cinematic-mode')) return;
    const dist = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    const duration = performance.now() - pointerStart.time;
    const now = performance.now();

    // Detección de doble tap o doble click para salir del modo cinemático
    if (dist < 25 && duration < 350) {
      const doubleTapDist = Math.hypot(event.clientX - lastCinematicTap.x, event.clientY - lastCinematicTap.y);
      const timeDiff = now - lastCinematicTap.time;
      if (timeDiff > 40 && timeDiff < 450 && doubleTapDist < 40) {
        lastCinematicTap = { x: 0, y: 0, time: 0 };
        exitCinematic();
        return;
      }
      lastCinematicTap = { x: event.clientX, y: event.clientY, time: now };
    }
  });

  el.viewport.addEventListener('dblclick', (event) => {
    if (!document.body.classList.contains('cinematic-mode')) return;
    exitCinematic();
  });

  el.viewport.addEventListener('wheel', () => el.viewportHint.classList.add('hidden'), { passive: true });
  setTimeout(() => el.viewportHint.classList.add('hidden'), 9000);

  setupLangMenu();
  el.btnHelp.addEventListener('click', openHelp);
  el.helpClose.addEventListener('click', () => el.helpDialog.close());

  [el.presetDialog, el.confirmDialog, el.helpDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  el.presetCancel.addEventListener('click', () => el.presetDialog.close());
  el.presetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = el.presetNameInput.value.trim().slice(0, MAX_PRESET_NAME);
    if (!name) {
      toast(t('preset_name_required'), { type: 'warning' });
      el.presetNameInput.focus();
      return;
    }
    if (saveCurrentPreset(name)) el.presetDialog.close();
  });

  el.recordBtn.addEventListener('click', exportVideo);
  el.snapshotBtn.addEventListener('click', exportSnapshot);

  let lastMobile = isMobile();
  window.addEventListener('resize', () => {
    const mobile = isMobile();
    if (mobile !== lastMobile) {
      lastMobile = mobile;
      if (mobile) {
        document.body.classList.remove('sidebar-collapsed');
        setSidebar(false, { persist: false });
      } else {
        el.sidebar.classList.remove('open');
        el.backdrop.classList.remove('active');
        document.body.classList.remove('sidebar-open-mobile');
        setSidebar(!state.sidebarCollapsed, { persist: false });
      }
    }
    scheduleResize();
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => scheduleResize());
    observer.observe(el.viewport);
  }

  window.addEventListener('orientationchange', () => setTimeout(scheduleResize, 120));
  window.addEventListener('cardgram:contextlost', () => toast(t('webgl_lost'), { type: 'warning', duration: 6000 }));
  window.addEventListener('cardgram:contextrestored', () => toast(t('webgl_restored'), { type: 'success' }));
}

function init() {
  if (initialized) return;
  initialized = true;

  cacheDom();
  migrateLegacyStorage();
  loadState();

  document.querySelectorAll('[data-version]').forEach((node) => {
    node.textContent = `v${APP_VERSION}`;
  });

  /* El lobby se monta primero y el motor 3D no arranca aquí: se inicializa
     solo cuando la persona entra al estudio (ver hub.js · openStudio). */
  if (typeof setupHub === 'function') setupHub();

  applyLanguage(state.lang, { persist: false });

  setupChrome();
  setupControls();
  setupScenes();
  setupFlower();
  setupFabDrag();
  setupUploads();
  setupKeyboard();

  syncUI();
  setActiveScene(1);

  if (isMobile()) setSidebar(false, { persist: false });
  else setSidebar(!state.sidebarCollapsed, { persist: false });

  scheduleResize();

  if (typeof applyRoute === 'function') applyRoute();

  if (location.protocol === 'file:') {
    setTimeout(() => toast(t('file_protocol'), { type: 'warning', duration: 9000 }), 1600);
  }

  console.info(
    `%c CardGram v${APP_VERSION} %c Aqua Glass Studio · by theAstroBruh `,
    'background:linear-gradient(135deg,#7cebdd,#2f8fdd);color:#fff;font-weight:800;border-radius:6px 0 0 6px;padding:4px 8px',
    'background:#07333f;color:#b9f2e7;border-radius:0 6px 6px 0;padding:4px 8px'
  );
}

/* Red de seguridad: un error de arranque nunca debe dejar el velo de carga eterno. */
window.addEventListener('error', () => {
  const veil = document.getElementById('loading-veil');
  if (!veil || veil.classList.contains('hidden')) return;
  veil.classList.add('hidden');
  veil.setAttribute('aria-hidden', 'true');
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
