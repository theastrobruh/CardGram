/* ==========================================================================
   TCG:HUB — v0.4.2 · Aplicación
   Estado, persistencia, presets, cargas, interfaz, accesibilidad e inicio.
   ========================================================================== */
'use strict';

const APP_VERSION = '0.4.2';

const STORAGE = {
  settings: 'tcghub.settings.v1',
  presets: 'tcghub.presets.v2',
  scenes: 'tcghub.scenes.v1'
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
  edgeThickness: 0.016,
  bevel: 0.004,
  edgeColor: 'black',
  gloss: 0.25,
  speed: 0.5,
  spinDir: 1,
  float: 'organic',
  camDistance: 4.6,
  posY: 0,
  tilt: 1,
  aspect: '9:16',
  scale: 100,
  bg: 'aqua',
  duration: 10
};

const state = { ...DEFAULTS, lang: 'es', sidebarCollapsed: false };
const DEFAULT_CARD = {
  front: 'assets/card_front - base.png',
  back: 'assets/card_back - base.png'
};
const currentCard = { ...DEFAULT_CARD };
const uploadTokens = { front: 0, back: 0 };

let presets = [];
let scenes = cloneScenes(DEFAULT_SCENES);
let activePresetId = 'default';
let activeScene = 1;
let isSequencePlaying = false;
let exporting = false;
let exportCancelled = false;
let initialized = false;
let resizeRaf = 0;
let cinematicTipTimer = 0;
let storageWarned = false;
let settingsTimer = 0;

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
const storage = {
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn(`[TCG:HUB] No se pudo leer ${key}`, error);
      return fallback;
    }
  },
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[TCG:HUB] No se pudo guardar ${key}`, error);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[TCG:HUB] No se pudo borrar ${key}`, error);
    }
  }
};

function safeImageUrl(value) {
  if (typeof value !== 'string' || value.length > 8_000_000) return null;

  // Normaliza rutas antiguas con espacios codificados (%20) a su forma legible.
  const normalized = value.replace(/%20/gi, ' ');
  if (/^assets\/[a-z0-9 _.-]+\.(png|jpe?g|webp|avif)$/i.test(normalized)) return normalized;
  if (/^data:image\/(png|jpe?g|webp|avif|gif);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  return null;
}

function sanitizeSettings(raw) {
  const result = { ...DEFAULTS, lang: 'es', sidebarCollapsed: false };
  if (!raw || typeof raw !== 'object') return result;

  const number = (value, min, max, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
  };

  result.corners = ['rounded', 'sharp'].includes(raw.corners) ? raw.corners : DEFAULTS.corners;
  result.edgeThickness = number(raw.edgeThickness, 0.005, 0.05, DEFAULTS.edgeThickness);
  result.bevel = number(raw.bevel, 0.001, 0.012, DEFAULTS.bevel);
  result.edgeColor = ['black', 'gold', 'silver', 'white'].includes(raw.edgeColor) ? raw.edgeColor : DEFAULTS.edgeColor;
  result.gloss = number(raw.gloss, 0.05, 0.9, DEFAULTS.gloss);
  result.speed = [0, 0.5, 1, 1.5, 2.5].includes(Number(raw.speed)) ? Number(raw.speed) : DEFAULTS.speed;
  result.spinDir = Number(raw.spinDir) === -1 ? -1 : 1;
  result.float = ['organic', 'subtle', 'breathe', 'dramatic', 'off'].includes(raw.float) ? raw.float : DEFAULTS.float;
  result.camDistance = number(raw.camDistance, 2, 8, DEFAULTS.camDistance);
  result.posY = number(raw.posY, -1.5, 1.5, DEFAULTS.posY);
  result.tilt = number(raw.tilt, 0, 2.5, DEFAULTS.tilt);
  result.aspect = ['9:16', '1:1', '16:9', 'fill'].includes(raw.aspect) ? raw.aspect : DEFAULTS.aspect;
  result.scale = number(raw.scale, 50, 100, DEFAULTS.scale);
  result.bg = ['aqua', 'studio', 'oled', 'sunset', 'cyber', 'transparent'].includes(raw.bg) ? raw.bg : DEFAULTS.bg;
  result.duration = [5, 10, 15].includes(Number(raw.duration)) ? Number(raw.duration) : DEFAULTS.duration;
  result.lang = raw.lang === 'en' ? 'en' : 'es';
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
    edgeThickness: state.edgeThickness,
    bevel: state.bevel,
    edgeColor: state.edgeColor,
    gloss: state.gloss,
    speed: state.speed,
    spinDir: state.spinDir,
    float: state.float,
    camDistance: state.camDistance,
    posY: state.posY,
    tilt: state.tilt,
    aspect: state.aspect,
    scale: state.scale,
    bg: state.bg,
    duration: state.duration,
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
  currentLang = lang === 'en' ? 'en' : 'es';
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

  el.btnLangEs.classList.toggle('active', currentLang === 'es');
  el.btnLangEs.setAttribute('aria-pressed', String(currentLang === 'es'));
  el.btnLangEn.classList.toggle('active', currentLang === 'en');
  el.btnLangEn.setAttribute('aria-pressed', String(currentLang === 'en'));

  updateExportLabel();
  if (!exporting) setStatus(t('status_ready'), 'ready');
  if (persist) persistSettings();
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
  cinematicTipTimer = setTimeout(() => el.exitTip.classList.remove('visible'), 3200);
  scheduleResize();
}

function exitCinematic() {
  if (!document.body.classList.contains('cinematic-mode')) return;
  document.body.classList.remove('cinematic-mode');
  el.exitTip.classList.remove('visible');
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
function makePresetChip({ name, active, onSelect, onDelete }) {
  const chip = document.createElement('div');
  chip.className = `preset-chip${active ? ' active' : ''}`;

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'preset-chip-main';
  main.textContent = name;
  main.title = name;
  main.setAttribute('aria-pressed', String(active));
  main.addEventListener('click', onSelect);

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
  el.presetsBar.replaceChildren();

  el.presetsBar.appendChild(
    makePresetChip({
      name: t('default_preset_name'),
      active: activePresetId === 'default',
      onSelect: restoreDefaultCard
    })
  );

  presets.forEach((preset) => {
    el.presetsBar.appendChild(
      makePresetChip({
        name: preset.name,
        active: activePresetId === preset.id,
        onSelect: () => loadPreset(preset),
        onDelete: () => deletePreset(preset.id)
      })
    );
  });
}

async function applyCardImages(front, back) {
  currentCard.front = front;
  currentCard.back = back;
  el.frontPreview.src = front;
  el.backPreview.src = back;

  if (!Scene.isReady()) return;

  const status = await Scene.loadCardImages(front, back);
  if (!status.front || !status.back) {
    toast(t('texture_error'), { type: 'warning', duration: 5000 });
  }
}

function restoreDefaultCard() {
  activePresetId = 'default';
  renderPresets();
  applyCardImages(DEFAULT_CARD.front, DEFAULT_CARD.back);
  toast(t('default_restored'), { type: 'success' });
}

function loadPreset(preset) {
  activePresetId = preset.id;
  renderPresets();
  applyCardImages(preset.front, preset.back);
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
        toast(t('preset_restored'), { type: 'success' });
      }
    }
  });
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
    createdAt: Date.now()
  };

  presets.unshift(preset);
  if (!persistPresets()) {
    presets.shift();
    return false;
  }

  activePresetId = preset.id;
  renderPresets();
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
  activePresetId = null;
  renderPresets();

  if (!Scene.isReady()) return;
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

function syncUI() {
  setSegmented('seg-corners', state.corners);
  setSegmented('seg-aspect', state.aspect);
  setSegmented('seg-duration', String(state.duration));
  setSwatch('edge-swatches', state.edgeColor);
  setSwatch('bg-grid', state.bg);

  setRange(el.rangeEdgeThickness, el.valEdgeThick, state.edgeThickness, (value) => value.toFixed(3));
  setRange(el.rangeBevel, el.valBevelInt, state.bevel, (value) => value.toFixed(3));
  setRange(el.rangeGloss, el.valGloss, state.gloss, (value) => value.toFixed(2));
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
      edgeThickness: state.edgeThickness,
      bevel: state.bevel,
      edgeColor: state.edgeColor,
      gloss: state.gloss,
      speed: state.speed,
      spinDir: state.spinDir,
      float: state.float,
      camDistance: state.camDistance,
      posY: state.posY,
      tilt: state.tilt,
      bg: state.bg
    });
  }

  scheduleResize();
  updateExportLabel();
}

function setupControls() {
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

  bindRange(el.rangeEdgeThickness, el.valEdgeThick, 'edgeThickness', (value) => value.toFixed(3), (value) => {
    if (Scene.isReady()) Scene.applySettings({ edgeThickness: value });
  });

  bindRange(el.rangeBevel, el.valBevelInt, 'bevel', (value) => value.toFixed(3), (value) => {
    if (Scene.isReady()) Scene.applySettings({ bevel: value });
  });

  bindRange(el.rangeGloss, el.valGloss, 'gloss', (value) => value.toFixed(2), (value) => {
    if (Scene.isReady()) Scene.applySettings({ gloss: value });
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

  el.btnReset3d.addEventListener('click', reset3D);
  el.btnResetCamera.addEventListener('click', resetCamera);
  el.btnResetSettings.addEventListener('click', resetAllSettings);
  el.btnSaveCardPreset.addEventListener('click', openPresetDialog);
  el.btnRestoreCard.addEventListener('click', restoreDefaultCard);
  el.btnPlayScenes.addEventListener('click', playSequence);
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

function setupFlower() {
  el.flowerTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setFlower(!el.flowerMenu.classList.contains('open'));
  });

  document.addEventListener('click', (event) => {
    if (el.flowerMenu.classList.contains('open') && !el.flowerMenu.contains(event.target)) {
      setFlower(false);
    }
  });

  el.petalCenter.addEventListener('click', () => {
    if (Scene.isReady()) Scene.centerCamera();
    state.posY = 0;
    setRange(el.rangePosY, el.valPosY, state.posY, (value) => value.toFixed(2));
    persistSettings();
    toast(t('camera_centered'), { type: 'success' });
    setFlower(false);
  });

  el.petalReverse.addEventListener('click', () => {
    state.spinDir *= -1;
    el.selectSpinDir.value = String(state.spinDir);
    if (Scene.isReady()) Scene.applySettings({ spinDir: state.spinDir });
    persistSettings();
    toast(t('spin_reversed'), { type: 'info' });
    setFlower(false);
  });

  el.petalLevel.addEventListener('click', () => {
    state.tilt = state.tilt === 0 ? 1 : 0;
    setRange(el.rangeTilt, el.valTilt, state.tilt, (value) => value.toFixed(1));
    if (Scene.isReady()) Scene.applySettings({ tilt: state.tilt });
    persistSettings();
    toast(t('tilt_leveled'), { type: 'info' });
    setFlower(false);
  });

  el.petalTurbo.addEventListener('click', () => {
    state.speed = state.speed === 0 ? 2.5 : 0;
    el.selectSpeed.value = String(state.speed);
    if (Scene.isReady()) Scene.applySettings({ speed: state.speed });
    persistSettings();
    toast(state.speed === 0 ? t('turbo_off') : t('turbo_on'), { type: 'info' });
    setFlower(false);
  });

  el.petalSavePose.addEventListener('click', () => {
    savePose(activeScene);
    setFlower(false);
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
  el.exitTip = $('#cinematic-exit-tip');
  el.navTabs = $('.nav-tabs');
  el.scrollContent = $('#scroll-content');

  el.btnLangEs = $('#btn-lang-es');
  el.btnLangEn = $('#btn-lang-en');
  el.btnHelp = $('#btn-help');
  el.helpDialog = $('#help-dialog');
  el.helpClose = $('#help-close');

  el.presetsBar = $('#card-presets-bar');
  el.uploadFront = $('#upload-front');
  el.uploadBack = $('#upload-back');
  el.frontInput = $('#front-file-input');
  el.backInput = $('#back-file-input');
  el.frontPreview = $('#front-preview-img');
  el.backPreview = $('#back-preview-img');
  el.btnSaveCardPreset = $('#btn-save-card-preset');
  el.btnRestoreCard = $('#btn-restore-card');

  el.rangeEdgeThickness = $('#range-edge-thickness');
  el.valEdgeThick = $('#val-edge-thick');
  el.rangeBevel = $('#range-bevel-intensity');
  el.valBevelInt = $('#val-bevel-int');
  el.rangeGloss = $('#range-gloss');
  el.valGloss = $('#val-gloss');

  el.selectSpeed = $('#select-speed');
  el.selectSpinDir = $('#select-spin-dir');
  el.selectFloating = $('#select-floating');
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
  el.petalCenter = $('#petal-center');
  el.petalReverse = $('#petal-reverse');
  el.petalLevel = $('#petal-level');
  el.petalTurbo = $('#petal-turbo');
  el.petalSavePose = $('#petal-save-pose');

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
  el.exitTip.addEventListener('click', exitCinematic);

  let pointerStart = { x: 0, y: 0 };
  el.viewport.addEventListener('pointerdown', (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    el.viewportHint.classList.add('hidden');
  });

  el.viewport.addEventListener('click', (event) => {
    if (!document.body.classList.contains('cinematic-mode')) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8) return;
    exitCinematic();
  });

  el.viewport.addEventListener('wheel', () => el.viewportHint.classList.add('hidden'), { passive: true });
  setTimeout(() => el.viewportHint.classList.add('hidden'), 9000);

  el.btnLangEs.addEventListener('click', () => applyLanguage('es'));
  el.btnLangEn.addEventListener('click', () => applyLanguage('en'));
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
  window.addEventListener('tcghub:contextlost', () => toast(t('webgl_lost'), { type: 'warning', duration: 6000 }));
  window.addEventListener('tcghub:contextrestored', () => toast(t('webgl_restored'), { type: 'success' }));
}

function init() {
  if (initialized) return;
  initialized = true;

  cacheDom();
  loadState();

  document.querySelectorAll('[data-version]').forEach((node) => {
    node.textContent = `v${APP_VERSION}`;
  });

  applyLanguage(state.lang, { persist: false });

  const ok = Scene.init();
  if (!ok) showWebglError();

  setupChrome();
  setupControls();
  setupScenes();
  setupFlower();
  setupUploads();
  setupKeyboard();

  renderPresets();
  syncUI();
  setActiveScene(1);

  if (isMobile()) setSidebar(false, { persist: false });
  else setSidebar(!state.sidebarCollapsed, { persist: false });

  scheduleResize();

  if (ok) {
    Scene.loadCardImages(currentCard.front, currentCard.back)
      .then((status) => {
        if (!status.front || !status.back) toast(t('texture_error'), { type: 'warning', duration: 5000 });
      })
      .finally(hideLoading);
  }

  if (location.protocol === 'file:') {
    setTimeout(() => toast(t('file_protocol'), { type: 'warning', duration: 9000 }), 1600);
  }

  console.info(
    `%c TCG:HUB v${APP_VERSION} %c Aqua Glass Studio · by theAstroBruh `,
    'background:linear-gradient(135deg,#7cebdd,#2f8fdd);color:#fff;font-weight:800;border-radius:6px 0 0 6px;padding:4px 8px',
    'background:#07333f;color:#b9f2e7;border-radius:0 6px 6px 0;padding:4px 8px'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
