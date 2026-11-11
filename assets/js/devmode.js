/* ==========================================================================
   CardGram · Modo Developer / Inspector Visual
   Módulo aislado (sin build, sin dependencias) que permite seleccionar
   cualquier elemento de la app y editar sus propiedades en vivo, exportando
   el resultado como JSON o CSS listo para pegar en el código base.

   API pública:
     window.CardGramDevMode.open() / close() / toggle()
     window.CardGramDevMode.select(element)
     window.CardGramDevMode.exportJSON()
     window.CardGramDevMode.exportCSS()
     window.CardGramDevMode.clear()
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'cardgram.devmode.v1';
  const ASSETS_KEY = 'cardgram.devmode.assets.v1';
  const AZURA_KEY = 'cardgram.devmode.azura.v1';
  const BG_KEY = 'cardgram.devmode.backgrounds.v1';
  const UNLOCK_KEY = 'cardgram.devmode.unlocked';
  const DEV_PASSWORD = '0412';
  const PANEL_ID = 'dev-panel';
  const STYLE_ID = 'devmode-style';

  const state = {
    active: false,
    picker: false,
    selected: null,
    selectedKey: null,
    edits: {},
    assets: {},
    azura: { slots: {}, auto: true, pace: 'normal' },
    backgrounds: { hub: null, hubVeil: 35, boot: [] },
    tab: 'inspector',
    hover: null
  };

  let panel;
  let panelBody;
  let tabsEl;
  let toggleBtn;
  let hoverBox;
  let selectedBox;
  let styleEl;
  let bgStyle;
  let lockEl;
  let lockInput;
  let lockError;
  let saveTimer = 0;
  let controls = [];

  /* ------------------------------------------------------------------ utils */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parsePx(value) {
    const match = /-?[\d.]+/.exec(String(value || ''));
    return match ? parseFloat(match[0]) : 0;
  }

  function parseAlpha(value, fallback) {
    const match = /rgba?\(([^)]+)\)/.exec(String(value || ''));
    if (!match) return fallback == null ? 1 : fallback;
    const parts = match[1].split(/[\s,/]+/).filter(Boolean);
    return parts.length >= 4 ? clamp(parseFloat(parts[3]), 0, 1) : 1;
  }

  function toHex(value, fallback) {
    const match = /rgba?\(([^)]+)\)/.exec(String(value || ''));
    if (!match) return fallback || '#000000';
    const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback || '#000000';
    return '#' + parts.slice(0, 3).map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');
  }

  function rgba(hex, alpha) {
    const clean = String(hex || '#000000').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const r = parseInt(full.slice(0, 2), 16) || 0;
    const g = parseInt(full.slice(2, 4), 16) || 0;
    const b = parseInt(full.slice(4, 6), 16) || 0;
    const a = clamp(Number(alpha), 0, 1);
    return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }

  function cssAttr(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /* --------------------------------------------------------------- dev keys */
  function devKey(node) {
    if (!node || node.nodeType !== 1) return null;
    if (node.dataset && node.dataset.devKey) return node.dataset.devKey;
    let key;
    if (node.id) {
      key = `#${node.id}`;
    } else {
      const steps = [];
      let current = node;
      while (current && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        if (current === document.body) {
          steps.unshift('body');
          break;
        }
        const parent = current.parentElement;
        let index = 1;
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
          index = siblings.indexOf(current) + 1;
        }
        steps.unshift(`${tag}:nth-of-type(${index})`);
        current = parent;
      }
      key = steps.join('>');
    }
    try {
      node.dataset.devKey = key;
    } catch (error) {
      /* Elementos sin dataset escribible: la clave sigue siendo válida. */
    }
    return key;
  }

  function describe(node) {
    if (!node) return '';
    const bits = [node.tagName.toLowerCase()];
    if (node.id) bits.push(`#${node.id}`);
    if (node.classList && node.classList.length) bits.push('.' + Array.from(node.classList).slice(0, 3).join('.'));
    return bits.join('');
  }

  /* --------------------------------------------------------- override sheet */
  function renderSheet() {
    if (!styleEl) return;
    const rules = Object.entries(state.edits).map(([key, props]) => {
      const body = Object.entries(props)
        .filter(([, value]) => value != null && value !== '')
        .map(([prop, value]) => `  ${prop}: ${value} !important;`)
        .join('\n');
      return body ? `[data-dev-key="${cssAttr(key)}"] {\n${body}\n}` : '';
    });
    styleEl.textContent = rules.filter(Boolean).join('\n\n');
  }

  /* Vuelve a marcar los elementos guardados tras un reload o un re-render. */
  function hydrateKeys() {
    Object.keys(state.edits).forEach((key) => {
      let nodes;
      try {
        nodes = document.querySelectorAll(key);
      } catch (error) {
        return;
      }
      nodes.forEach((node) => {
        if (!node.dataset.devKey) node.dataset.devKey = key;
      });
    });
  }

  function loadEdits() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (raw && typeof raw === 'object' && raw.edits && typeof raw.edits === 'object') {
        state.edits = raw.edits;
      }
    } catch (error) {
      state.edits = {};
    }
    hydrateKeys();
    renderSheet();
  }

  function saveEdits() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), edits: state.edits }));
      } catch (error) {
        /* Cuota llena o modo privado: los cambios siguen aplicados en vivo. */
      }
    }, 280);
  }

  /* ------------------------------------------------------- assets / imágenes */
  function loadAssets() {
    try {
      const raw = JSON.parse(localStorage.getItem(ASSETS_KEY) || 'null');
      if (raw && typeof raw === 'object') state.assets = raw;
    } catch (error) {
      state.assets = {};
    }
    applyAssets();
  }

  function saveAssets() {
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(state.assets));
    } catch (error) {
      /* Almacenamiento no disponible. */
    }
  }

  function applyAssets() {
    Object.entries(state.assets).forEach(([key, patch]) => {
      let nodes;
      try {
        nodes = document.querySelectorAll(key);
      } catch (error) {
        return;
      }
      nodes.forEach((node) => {
        if (node.closest('.dev-panel, .dev-outline')) return;
        const tag = node.tagName.toLowerCase();
        if (patch.src) {
          if (tag !== 'img') return;
          /* Cada copia recuerda a qué recurso pertenece, así dos cambios
             distintos no se pisan entre sí. */
          if (node.dataset.devAsset && node.dataset.devAsset !== key) return;
          if (node.getAttribute('src') !== patch.src) node.src = patch.src;
          if (node.dataset.devAsset !== key) node.dataset.devAsset = key;
        }
        if (patch.href) {
          if (tag !== 'use') return;
          if (node.dataset.devAsset && node.dataset.devAsset !== key) return;
          if (node.getAttribute('href') !== patch.href) {
            node.setAttribute('href', patch.href);
            node.setAttribute('xlink:href', patch.href);
          }
          if (node.dataset.devAsset !== key) node.dataset.devAsset = key;
        }
      });
    });
  }

  function setAssetOverride(key, kind, value, node) {
    const map = state.assets[key] || (state.assets[key] = {});
    if (map.original == null && node) {
      map.original = kind === 'src'
        ? node.getAttribute('src')
        : node.getAttribute('href') || node.getAttribute('xlink:href');
    }
    map[kind] = value;
    saveAssets();
    applyAssets();
  }

  /* Los nodos ya llevan el valor sustituido, así que el selector original ya
     no los encuentra: se marcan con data-dev-asset al aplicar. */
  function restoreAsset(key) {
    const map = state.assets[key];
    if (!map) return;
    const nodes = new Set();
    try {
      document.querySelectorAll(key).forEach((node) => nodes.add(node));
    } catch (error) {
      /* Selector inválido: seguimos con los nodos marcados. */
    }
    document.querySelectorAll('[data-dev-asset]').forEach((node) => {
      if (node.dataset.devAsset === key) nodes.add(node);
    });
    nodes.forEach((node) => {
      if (node.closest('.dev-panel, .dev-outline')) return;
      const tag = node.tagName.toLowerCase();
      if (tag === 'img' && map.original != null) {
        node.src = map.original;
        delete node.dataset.devAsset;
      }
      if (tag === 'use' && map.original != null) {
        node.setAttribute('href', map.original);
        node.setAttribute('xlink:href', map.original);
        delete node.dataset.devAsset;
      }
    });
    delete state.assets[key];
    saveAssets();
    applyAssets();
  }

  /* --------------------------------------------------------------- Azura */
  function azuraApi() {
    return window.CardGramAzura || null;
  }

  function loadAzura() {
    try {
      const raw = JSON.parse(localStorage.getItem(AZURA_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        state.azura.slots = raw.slots && typeof raw.slots === 'object' ? raw.slots : {};
        state.azura.auto = raw.auto !== false;
        state.azura.pace = raw.pace || 'normal';
      }
    } catch (error) {
      state.azura = { slots: {}, auto: true, pace: 'normal' };
    }
    const api = azuraApi();
    if (api) {
      Object.entries(state.azura.slots).forEach(([index, src]) => api.setSprite(Number(index), src));
      api.setAuto(state.azura.auto);
      api.setPace(state.azura.pace);
    }
  }

  function saveAzura() {
    try {
      localStorage.setItem(AZURA_KEY, JSON.stringify(state.azura));
    } catch (error) {
      /* Almacenamiento no disponible. */
    }
  }

  function replaceAzuraSlot(index, src) {
    state.azura.slots[index] = src;
    saveAzura();
    const api = azuraApi();
    if (api) api.setSprite(Number(index), src);
  }

  function resizeImageFile(file, maxSide) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('not-image'));
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const limit = maxSide || 512;
          const scale = Math.min(1, limit / Math.max(image.naturalWidth || limit, image.naturalHeight || limit));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((image.naturalWidth || limit) * scale));
          canvas.height = Math.max(1, Math.round((image.naturalHeight || limit) * scale));
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const isPng = /png/i.test(file.type);
          resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/webp', 0.86));
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('decode'));
      };
      image.src = url;
    });
  }

  /* -------------------------------------------------------------- fondos */
  function loadBackgrounds() {
    try {
      const raw = JSON.parse(localStorage.getItem(BG_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        state.backgrounds.hub = typeof raw.hub === 'string' ? raw.hub : null;
        state.backgrounds.hubVeil = Number.isFinite(Number(raw.hubVeil))
          ? clamp(Number(raw.hubVeil), 0, 100)
          : 35;
        state.backgrounds.boot = Array.isArray(raw.boot)
          ? raw.boot.filter((src) => typeof src === 'string').slice(0, 8)
          : [];
      }
    } catch (error) {
      state.backgrounds = { hub: null, hubVeil: 35, boot: [] };
    }
    applyBackgrounds();
  }

  function saveBackgrounds() {
    try {
      localStorage.setItem(BG_KEY, JSON.stringify(state.backgrounds));
      return true;
    } catch (error) {
      showDevNotice('Sin espacio en el navegador. Prueba con una imagen más ligera.');
      return false;
    }
  }

  function bootScreen() {
    return document.getElementById('boot-screen');
  }

  function applyBackgrounds() {
    const bg = state.backgrounds;

    /* Fondo del inicio: imagen propia + velo de cristal encima. */
    if (!bgStyle) {
      bgStyle = el('style');
      bgStyle.id = 'devmode-bg-style';
      document.head.appendChild(bgStyle);
    }
    if (bg.hub) {
      const veil = clamp(bg.hubVeil, 0, 100) / 100;
      const top = (0.22 + veil * 0.78).toFixed(2);
      const mid = (0.16 + veil * 0.7).toFixed(2);
      const bottom = (0.3 + veil * 0.7).toFixed(2);
      bgStyle.textContent = `body[data-view="hub"] {
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, ${top}) 0%, rgba(236, 252, 255, ${mid}) 48%, rgba(176, 231, 252, ${bottom}) 100%),
    url("${cssAttr(bg.hub)}") !important;
  background-size: cover, cover !important;
  background-position: center center, center center !important;
  background-repeat: no-repeat, no-repeat !important;
}`;
    } else {
      bgStyle.textContent = '';
    }

    /* Bienvenida: si hay diapositivas propias, mandan sobre el manifiesto. */
    const first = bg.boot[0];
    const a = document.getElementById('boot-bg-a');
    if (a && first) a.style.backgroundImage = `url("${cssAttr(first)}")`;
  }

  function setHubBackground(src) {
    state.backgrounds.hub = src || null;
    saveBackgrounds();
    applyBackgrounds();
  }

  function addBootSlide(src) {
    state.backgrounds.boot.push(src);
    saveBackgrounds();
    applyBackgrounds();
  }

  function removeBootSlide(index) {
    state.backgrounds.boot.splice(index, 1);
    saveBackgrounds();
    applyBackgrounds();
  }

  function showBootPreview(show) {
    const overlay = bootScreen();
    if (!overlay) return;
    if (show) {
      overlay.hidden = false;
      overlay.classList.remove('is-leaving');
      document.body.classList.add('booting');
      applyBackgrounds();
    } else {
      overlay.classList.add('is-leaving');
      document.body.classList.remove('booting');
      window.setTimeout(() => {
        if (overlay.classList.contains('is-leaving')) overlay.hidden = true;
      }, 900);
    }
  }

  function buildBackgroundsPanel() {
    panelBody.appendChild(
      el('p', 'dev-hint', 'Fondos del inicio y de la pantalla de bienvenida. Las imágenes se guardan en este navegador y se aplican al instante.')
    );

    /* --- Inicio --- */
    panelBody.appendChild(el('span', 'dev-subhead', 'Inicio · fondo'));

    const hubRow = el('div', 'dev-bg-row');
    const hubPreview = el('div', 'dev-bg-preview');
    if (state.backgrounds.hub) {
      const img = el('img');
      img.src = state.backgrounds.hub;
      img.alt = '';
      hubPreview.appendChild(img);
    } else {
      hubPreview.appendChild(el('span', 'dev-bg-empty', 'Fondo original'));
    }
    hubRow.appendChild(hubPreview);

    const hubActions = el('div', 'dev-bg-actions');
    hubActions.appendChild(
      filePickerButton('Cambiar', async (file) => {
        try {
          const data = await resizeImageFile(file, 1920);
          state.backgrounds.hub = data;
          if (saveBackgrounds()) {
            applyBackgrounds();
            renderTab();
          } else {
            state.backgrounds.hub = null;
          }
        } catch (error) {
          showDevNotice('No se pudo leer esa imagen.');
        }
      }, 'is-primary')
    );
    if (state.backgrounds.hub) {
      const reset = el('button', 'dev-btn dev-btn-mini is-danger', 'Quitar');
      reset.type = 'button';
      reset.addEventListener('click', () => {
        setHubBackground(null);
        renderTab();
      });
      hubActions.appendChild(reset);
    }
    hubRow.appendChild(hubActions);
    panelBody.appendChild(hubRow);

    const veilRow = el('div', 'dev-row');
    veilRow.appendChild(el('span', 'dev-label', 'Velo'));
    const veilRange = el('input', 'dev-range');
    veilRange.type = 'range';
    veilRange.min = '0';
    veilRange.max = '100';
    veilRange.step = '1';
    veilRange.value = String(state.backgrounds.hubVeil);
    veilRange.disabled = !state.backgrounds.hub;
    const veilNum = el('input', 'dev-num');
    veilNum.type = 'number';
    veilNum.min = '0';
    veilNum.max = '100';
    veilNum.value = String(Math.round(state.backgrounds.hubVeil));
    veilNum.disabled = !state.backgrounds.hub;
    const commitVeil = (value) => {
      const parsed = clamp(Number(value), 0, 100);
      state.backgrounds.hubVeil = parsed;
      veilRange.value = String(parsed);
      veilNum.value = String(Math.round(parsed));
      saveBackgrounds();
      applyBackgrounds();
    };
    veilRange.addEventListener('input', () => commitVeil(veilRange.value));
    veilNum.addEventListener('input', () => commitVeil(veilNum.value));
    veilRow.append(veilRange, veilNum);
    panelBody.appendChild(veilRow);

    /* --- Bienvenida --- */
    panelBody.appendChild(el('span', 'dev-subhead', 'Bienvenida · diapositivas'));

    const bootList = el('div', 'dev-bg-list');
    panelBody.appendChild(bootList);

    const renderBoot = () => {
      bootList.replaceChildren();
      if (!state.backgrounds.boot.length) {
        bootList.appendChild(el('p', 'dev-empty', 'Se usa el carrusel original de la bienvenida.'));
      }
      state.backgrounds.boot.forEach((src, index) => {
        const row = el('div', 'dev-bg-row is-compact');
        const preview = el('div', 'dev-bg-preview is-small');
        const img = el('img');
        img.src = src;
        img.alt = '';
        preview.appendChild(img);
        row.appendChild(preview);

        const copy = el('div', 'dev-asset-copy');
        copy.appendChild(el('span', 'dev-asset-name', `Diapositiva ${index + 1}`));
        copy.appendChild(el('span', 'dev-asset-path', 'imagen propia'));
        row.appendChild(copy);

        const actions = el('div', 'dev-bg-actions');
        const remove = el('button', 'dev-btn dev-btn-mini is-danger', 'Quitar');
        remove.type = 'button';
        remove.addEventListener('click', () => {
          removeBootSlide(index);
          renderBoot();
        });
        actions.appendChild(remove);
        row.appendChild(actions);
        bootList.appendChild(row);
      });
    };

    const bootActions = el('div', 'dev-actions');
    bootActions.appendChild(
      filePickerButton('Añadir diapositiva', async (file) => {
        try {
          const data = await resizeImageFile(file, 1440);
          state.backgrounds.boot.push(data);
          if (saveBackgrounds()) {
            applyBackgrounds();
            renderBoot();
          } else {
            state.backgrounds.boot.pop();
          }
        } catch (error) {
          showDevNotice('No se pudo leer esa imagen.');
        }
      }, 'is-primary')
    );
    if (state.backgrounds.boot.length) {
      const clear = el('button', 'dev-btn is-danger', 'Restaurar carrusel');
      clear.type = 'button';
      clear.addEventListener('click', () => {
        state.backgrounds.boot = [];
        saveBackgrounds();
        applyBackgrounds();
        renderBoot();
      });
      bootActions.appendChild(clear);
    }
    panelBody.appendChild(bootActions);
    renderBoot();

    /* --- Elementos de la bienvenida --- */
    panelBody.appendChild(el('span', 'dev-subhead', 'Bienvenida · elementos'));
    panelBody.appendChild(
      el('p', 'dev-hint', 'Abre la bienvenida para inspeccionar y editar sus textos, botones y capas con el inspector.')
    );

    const bootPreviewActions = el('div', 'dev-actions');
    const showBoot = el('button', 'dev-btn', 'Mostrar bienvenida');
    showBoot.type = 'button';
    showBoot.addEventListener('click', () => {
      showBootPreview(true);
      setTab('inspector');
      setPicker(true);
    });
    const hideBoot = el('button', 'dev-btn', 'Cerrar bienvenida');
    hideBoot.type = 'button';
    hideBoot.addEventListener('click', () => showBootPreview(false));
    bootPreviewActions.append(showBoot, hideBoot);
    panelBody.appendChild(bootPreviewActions);

    panelBody.appendChild(
      el('p', 'dev-hint', 'Consejo: usa el inspector (◎) para recolocar o retocar cualquier elemento del inicio y de la bienvenida; los cambios se guardan por elemento.')
    );
  }

  function applyProp(prop, value) {
    if (!state.selected || !state.selectedKey) return;
    const key = state.selectedKey;
    const map = state.edits[key] || (state.edits[key] = {});
    if (value == null || value === '') {
      delete map[prop];
      state.selected.style.removeProperty(prop);
    } else {
      map[prop] = value;
      state.selected.style.setProperty(prop, value, 'important');
    }
    if (!Object.keys(map).length) delete state.edits[key];
    renderSheet();
    saveEdits();
  }

  function resetSelected() {
    if (!state.selectedKey) return;
    delete state.edits[state.selectedKey];
    renderSheet();
    saveEdits();
    if (state.selected) {
      Array.from(state.selected.style).forEach((prop) => state.selected.style.removeProperty(prop));
    }
    select(state.selected);
  }

  /* --------------------------------------------------------------- overlays */
  function ensureOverlays() {
    if (!hoverBox) {
      hoverBox = el('div', 'dev-outline is-hover');
      hoverBox.hidden = true;
      document.body.appendChild(hoverBox);
    }
    if (!selectedBox) {
      selectedBox = el('div', 'dev-outline is-selected');
      const tag = el('span', 'dev-outline-tag');
      selectedBox.appendChild(tag);
      selectedBox.hidden = true;
      document.body.appendChild(selectedBox);
    }
  }

  function placeOverlay(box, node) {
    if (!box) return;
    if (!node || !node.isConnected) {
      box.hidden = true;
      return;
    }
    const rect = node.getBoundingClientRect();
    box.hidden = false;
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    const tag = box.querySelector('.dev-outline-tag');
    if (tag) {
      const label = describe(node);
      if (tag.textContent !== label) tag.textContent = label;
    }
  }

  function syncSelectedOverlay() {
    if (state.active) placeOverlay(selectedBox, state.selected);
    else if (selectedBox) selectedBox.hidden = true;
  }

  /* ----------------------------------------------------------------- panel */
  function makeSection(title, open) {
    const details = el('details', 'dev-section');
    if (open) details.open = true;
    const summary = el('summary', null, title);
    details.appendChild(summary);
    const body = el('div', 'dev-section-body');
    details.appendChild(body);
    return { details, body };
  }

  function makeRow(label) {
    const row = el('div', 'dev-row');
    row.appendChild(el('span', 'dev-label', label));
    return row;
  }

  function makeNumberField(value, onChange, opts) {
    const config = opts || {};
    const unit = config.unit || 'px';
    const range = el('input', 'dev-range');
    range.type = 'range';
    range.min = String(config.min != null ? config.min : -200);
    range.max = String(config.max != null ? config.max : 900);
    range.step = String(config.step != null ? config.step : 1);
    range.value = String(clamp(Number(value) || 0, Number(range.min), Number(range.max)));

    const num = el('input', 'dev-num');
    num.type = 'number';
    num.step = String(config.step != null ? config.step : 1);
    num.value = String(Math.round((Number(value) || 0) * 10) / 10);

    const commit = (raw) => {
      if (raw === '' || raw == null) {
        onChange(null);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      onChange(unit === 'ms' ? `${Math.round(parsed)}ms` : unit === '' ? String(parsed) : `${parsed}px`, parsed);
    };

    range.addEventListener('input', () => {
      num.value = range.value;
      commit(range.value);
    });
    num.addEventListener('input', () => {
      if (num.value === '') {
        onChange(null);
        return;
      }
      const parsed = Number(num.value);
      if (!Number.isFinite(parsed)) return;
      range.value = String(clamp(parsed, Number(range.min), Number(range.max)));
      commit(num.value);
    });

    return { range, num };
  }

  function addNumericControl(container, label, prop, computed, opts) {
    const config = opts || {};
    const row = makeRow(label);
    const value = computed == null ? 0 : parsePx(computed);
    const field = makeNumberField(value, (valueString) => applyProp(prop, valueString), {
      min: config.min != null ? config.min : Math.min(-100, Math.floor(value - 100)),
      max: config.max != null ? config.max : Math.max(900, Math.ceil(value + 300)),
      step: config.step || 1,
      unit: config.unit || 'px'
    });
    row.appendChild(field.range);
    row.appendChild(field.num);
    container.appendChild(row);
  }

  function addQuadControl(container, label, prefix, computed, suffix) {
    const wrap = el('div', 'dev-row is-wide');
    wrap.appendChild(el('span', 'dev-label', label));
    const quad = el('div', 'dev-quad');
    ['Top', 'Right', 'Bottom', 'Left'].forEach((side) => {
      const value = parsePx(computed[`${prefix}${side}`]);
      const num = el('input', 'dev-num');
      num.type = 'number';
      num.min = '0';
      num.step = '1';
      num.value = String(Math.round(value));
      num.title = side;
      num.setAttribute('aria-label', `${label} ${side}`);
      num.addEventListener('input', () => {
        if (num.value === '') {
          applyProp(`${prefix}${side}`.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), null);
          return;
        }
        const parsed = Number(num.value);
        if (!Number.isFinite(parsed)) return;
        applyProp(`${prefix}${side}`.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), `${parsed}${suffix || 'px'}`);
      });
      quad.appendChild(num);
    });
    wrap.appendChild(quad);
    container.appendChild(wrap);
  }

  function addColorControl(container, label, prop, computed, opts) {
    const config = opts || {};
    const row = el('div', 'dev-row');
    row.appendChild(el('span', 'dev-label', label));
    const color = el('input', 'dev-color');
    color.type = 'color';
    color.value = toHex(computed, config.fallback || '#ffffff');
    const alpha = el('input', 'dev-range');
    alpha.type = 'range';
    alpha.min = '0';
    alpha.max = '1';
    alpha.step = '0.01';
    alpha.value = String(parseAlpha(computed, 1));
    alpha.title = 'Opacidad';
    alpha.setAttribute('aria-label', `${label} opacity`);

    let alphaValue = parseAlpha(computed, 1);
    color.addEventListener('input', () => {
      applyProp(prop, rgba(color.value, alphaValue));
    });
    alpha.addEventListener('input', () => {
      alphaValue = Number(alpha.value);
      color.dispatchEvent(new Event('input'));
    });

    const cell = el('div');
    cell.style.display = 'grid';
    cell.style.gridTemplateColumns = '1fr 42px';
    cell.style.gap = '4px';
    cell.appendChild(color);
    cell.appendChild(alpha);
    row.appendChild(cell);
    container.appendChild(row);
  }

  function readShadow(computed) {
    const value = String(computed.boxShadow || '');
    if (!value || value === 'none') {
      return { x: 0, y: 12, blur: 24, spread: 0, color: '#000000', alpha: 0.22 };
    }
    const first = value.split(/,(?![^(]*\))/)[0];
    const nums = (first.match(/-?[\d.]+px/g) || []).map(parsePx);
    const colorMatch = /rgba?\([^)]+\)/.exec(first);
    const color = colorMatch ? colorMatch[0] : 'rgba(0, 0, 0, 0.35)';
    return {
      x: nums[0] || 0,
      y: nums[1] || 0,
      blur: nums[2] || 0,
      spread: nums[3] || 0,
      color: toHex(color, '#000000'),
      alpha: parseAlpha(color, 0.35)
    };
  }

  function addRangeField(container, label, min, max, step, value, onChange) {
    const row = makeRow(label);
    const range = el('input', 'dev-range');
    range.type = 'range';
    range.min = String(min);
    range.max = String(max);
    range.step = String(step);
    range.value = String(clamp(value, min, max));
    const num = el('input', 'dev-num');
    num.type = 'number';
    num.min = String(min);
    num.max = String(max);
    num.step = String(step);
    num.value = String(Math.round(value * 100) / 100);
    const commit = (raw) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      onChange(parsed);
    };
    range.addEventListener('input', () => {
      num.value = range.value;
      commit(range.value);
    });
    num.addEventListener('input', () => {
      const parsed = Number(num.value);
      if (!Number.isFinite(parsed)) return;
      range.value = String(clamp(parsed, min, max));
      commit(num.value);
    });
    row.appendChild(range);
    row.appendChild(num);
    container.appendChild(row);
  }

  function addTextControl(container, label, value, onChange, placeholder) {
    const row = el('div', 'dev-row is-wide');
    row.appendChild(el('span', 'dev-label', label));
    const input = el('input', 'dev-text');
    input.type = 'text';
    input.value = value || '';
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener('input', () => onChange(input.value.trim()));
    row.appendChild(input);
    container.appendChild(row);
  }

  function setTab(tab) {
    state.tab = ['azura', 'assets', 'backgrounds'].includes(tab) ? tab : 'inspector';
    renderTab();
  }

  function renderTab() {
    if (!panelBody) return;
    if (tabsEl) {
      tabsEl.querySelectorAll('[data-dev-tab]').forEach((button) => {
        const on = button.dataset.devTab === state.tab;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-selected', String(on));
      });
    }
    const pick = panel && panel.querySelector('#dev-pick');
    if (pick) pick.hidden = state.tab !== 'inspector';
    if (state.tab === 'inspector') {
      buildControls();
      return;
    }
    panelBody.replaceChildren();
    if (state.tab === 'azura') buildAzuraPanel();
    else if (state.tab === 'backgrounds') buildBackgroundsPanel();
    else buildAssetsPanel();
  }

  function filePickerButton(label, onFile, extraClass) {
    const wrap = el('label', `dev-btn dev-btn-mini${extraClass ? ' ' + extraClass : ''}`, label);
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) onFile(file);
      input.value = '';
    });
    wrap.appendChild(input);
    return wrap;
  }

  function buildAzuraPanel() {
    const api = azuraApi();
    if (!api) {
      panelBody.appendChild(el('p', 'dev-empty', 'Azura no está disponible en esta pantalla.'));
      return;
    }
    const intro = el('p', 'dev-hint', 'Cambia cualquier pose, sube versiones propias y controla el ritmo autónomo. Los cambios se guardan en este navegador.');
    panelBody.appendChild(intro);

    const autoRow = el('div', 'dev-toggle-row');
    autoRow.appendChild(el('span', 'dev-label', 'Poses automáticas'));
    const autoBtn = el('button', `dev-btn dev-btn-mini${state.azura.auto ? ' is-primary' : ''}`, state.azura.auto ? 'ON' : 'OFF');
    autoBtn.type = 'button';
    autoBtn.addEventListener('click', () => {
      state.azura.auto = !state.azura.auto;
      saveAzura();
      api.setAuto(state.azura.auto);
      renderTab();
    });
    autoRow.appendChild(autoBtn);
    panelBody.appendChild(autoRow);

    const paceRow = el('div', 'dev-toggle-row');
    paceRow.appendChild(el('span', 'dev-label', 'Ritmo'));
    const pace = el('select', 'dev-select');
    [
      ['slow', 'Lento'],
      ['normal', 'Normal'],
      ['fast', 'Rápido']
    ].forEach(([value, label]) => {
      const option = el('option', null, label);
      option.value = value;
      if (state.azura.pace === value) option.selected = true;
      pace.appendChild(option);
    });
    pace.addEventListener('change', () => {
      state.azura.pace = pace.value;
      saveAzura();
      api.setPace(pace.value);
    });
    paceRow.appendChild(pace);
    panelBody.appendChild(paceRow);

    const live = api.getState ? api.getState() : { index: 0 };
    const grid = el('div', 'dev-pose-grid');
    api.sprites.forEach((src, index) => {
      const cell = el('div', 'dev-pose');
      const thumb = el('button', 'dev-pose-thumb');
      thumb.type = 'button';
      thumb.title = `Usar la pose ${index + 1} ahora`;
      const image = el('img');
      image.src = src;
      image.alt = `Azura pose ${index + 1}`;
      image.loading = 'lazy';
      thumb.appendChild(image);
      thumb.addEventListener('click', () => {
        api.setPose(index);
        renderTab();
      });
      cell.appendChild(thumb);

      const meta = el('div', 'dev-pose-meta');
      meta.appendChild(el('span', 'dev-pose-label', `Pose ${index + 1}${live.index === index ? ' · viva' : ''}`));
      if (state.azura.slots[index]) meta.appendChild(el('span', 'dev-pose-tag', 'custom'));
      cell.appendChild(meta);

      const actions = el('div', 'dev-pose-actions');
      actions.appendChild(
        filePickerButton('Cambiar', async (file) => {
          try {
            const data = await resizeImageFile(file, 512);
            replaceAzuraSlot(index, data);
            renderTab();
          } catch (error) {
            showDevNotice('No se pudo leer esa imagen.');
          }
        })
      );
      if (state.azura.slots[index]) {
        const restore = el('button', 'dev-btn dev-btn-mini is-danger', 'Quitar');
        restore.type = 'button';
        restore.addEventListener('click', () => {
          delete state.azura.slots[index];
          saveAzura();
          api.restoreSprite(index);
          renderTab();
        });
        actions.appendChild(restore);
      }
      cell.appendChild(actions);
      grid.appendChild(cell);
    });
    panelBody.appendChild(grid);

    const actions = el('div', 'dev-actions');
    const reset = el('button', 'dev-btn is-danger', 'Restaurar Azura');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      state.azura.slots = {};
      state.azura.auto = true;
      state.azura.pace = 'normal';
      saveAzura();
      api.defaults.forEach((src, index) => api.restoreSprite(index));
      api.setAuto(true);
      api.setPace('normal');
      renderTab();
    });
    const show = el('button', 'dev-btn is-primary', 'Ir a la tienda');
    show.type = 'button';
    show.addEventListener('click', () => {
      const nav = document.querySelector('[data-hub-route="booster"]');
      if (nav) nav.click();
    });
    actions.append(reset, show);
    panelBody.appendChild(actions);
    panelBody.appendChild(el('p', 'dev-hint', 'Consejo: pulsa una miniatura para ver esa pose al instante; “Cambiar” sube una versión alternativa para ese slot.'));
  }

  function buildAssetsPanel() {
    const intro = el('p', 'dev-hint', 'Reemplaza las imágenes e iconos de la interfaz. Cada cambio se aplica a todas las apariciones de ese recurso y se guarda en este navegador.');
    panelBody.appendChild(intro);

    const search = el('input', 'dev-text dev-asset-search');
    search.type = 'search';
    search.placeholder = 'Buscar imagen o icono…';
    panelBody.appendChild(search);

    const summary = el('p', 'dev-hint');
    panelBody.appendChild(summary);

    const list = el('div', 'dev-assets');
    panelBody.appendChild(list);

    const symbols = Array.from(document.querySelectorAll('symbol[id^="i-"]')).map((symbol) => `#${symbol.id}`);

    /* Clave estable por recurso: no depende de la posición en el DOM, así el
       cambio sobrevive a los re-renderizados y vale para todas las copias. */
    const imageKey = (src) => `img[src="${cssAttr(src)}"]`;
    const iconKey = (href) => `use[href="${cssAttr(href)}"]`;

    const renderList = () => {
      const query = search.value.trim().toLowerCase();
      list.replaceChildren();
      let shown = 0;

      /* --- Imágenes: una fila por archivo distinto --- */
      const imageMap = new Map();
      Array.from(document.querySelectorAll('img')).forEach((node) => {
        if (node.closest('.dev-panel, .dev-outline')) return;
        let src = node.getAttribute('src') || '';
        if (!src) return;
        if (src.startsWith('data:')) {
          /* Ya sustituida: la fila se mantiene con su archivo original para
             poder cambiarla otra vez o restaurarla. */
          const found = Object.entries(state.assets).find(([, patch]) => patch && patch.src === src);
          if (!found || !found[1].original) return;
          src = found[1].original;
        }
        if (!imageMap.has(src)) imageMap.set(src, node);
      });

      if (imageMap.size) {
        list.appendChild(el('span', 'dev-asset-group', `Imágenes · ${imageMap.size}`));
        imageMap.forEach((node, src) => {
          const name = node.getAttribute('alt') || src.split('/').pop() || 'imagen';
          if (query && !(name + ' ' + src).toLowerCase().includes(query)) return;
          const key = imageKey(src);
          const patch = state.assets[key];
          shown += 1;
          const row = el('div', 'dev-asset-row');
          const thumb = el('img', 'dev-asset-thumb');
          thumb.src = patch && patch.src ? patch.src : src;
          thumb.alt = '';
          row.appendChild(thumb);
          const copy = el('div', 'dev-asset-copy');
          copy.appendChild(el('span', 'dev-asset-name', name));
          copy.appendChild(el('span', 'dev-asset-path', src.split('/').slice(-2).join('/')));
          row.appendChild(copy);
          const actions = el('div', 'dev-asset-actions');
          actions.appendChild(
            filePickerButton('Cambiar', async (file) => {
              try {
                const data = await resizeImageFile(file, 640);
                setAssetOverride(key, 'src', data, node);
                applyAssets();
                renderList();
              } catch (error) {
                showDevNotice('No se pudo leer esa imagen.');
              }
            })
          );
          if (patch && patch.src) {
            const reset = el('button', 'dev-btn dev-btn-mini is-danger', 'Quitar');
            reset.type = 'button';
            reset.addEventListener('click', () => {
              restoreAsset(key);
              renderList();
            });
            actions.appendChild(reset);
          }
          row.appendChild(actions);
          list.appendChild(row);
        });
      }

      /* --- Iconos: una fila por símbolo usado --- */
      const iconMap = new Map();
      Array.from(document.querySelectorAll('svg use')).forEach((node) => {
        if (node.closest('.dev-panel, .dev-outline')) return;
        let href = node.getAttribute('href') || node.getAttribute('xlink:href') || '';
        if (!href || !href.startsWith('#')) return;
        const found = Object.entries(state.assets).find(
          ([, patch]) => patch && patch.href === href && patch.original
        );
        if (found) href = found[1].original;
        if (!iconMap.has(href)) iconMap.set(href, node);
      });

      if (iconMap.size) {
        list.appendChild(el('span', 'dev-asset-group', `Iconos · ${iconMap.size}`));
        iconMap.forEach((node, href) => {
          const label = href.replace('#i-', '').replace(/-/g, ' ');
          if (query && !(label + ' ' + href).toLowerCase().includes(query)) return;
          const key = iconKey(href);
          const patch = state.assets[key];
          shown += 1;
          const row = el('div', 'dev-asset-row');
          const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          preview.setAttribute('viewBox', '0 0 24 24');
          preview.setAttribute('class', 'dev-asset-icon');
          const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          use.setAttribute('href', patch && patch.href ? patch.href : href);
          preview.appendChild(use);
          row.appendChild(preview);

          const copy = el('div', 'dev-asset-copy');
          copy.appendChild(el('span', 'dev-asset-name', label));
          copy.appendChild(el('span', 'dev-asset-path', href));
          row.appendChild(copy);

          const actions = el('div', 'dev-asset-actions');
          const select = el('select', 'dev-select dev-select-icon');
          symbols.forEach((symbol) => {
            const option = el('option', null, symbol.replace('#i-', ''));
            option.value = symbol;
            if (symbol === (patch && patch.href ? patch.href : href)) option.selected = true;
            select.appendChild(option);
          });
          select.addEventListener('change', () => {
            setAssetOverride(key, 'href', select.value, node);
            applyAssets();
            renderList();
          });
          actions.appendChild(select);
          if (patch && patch.href) {
            const reset = el('button', 'dev-btn dev-btn-mini is-danger', 'Quitar');
            reset.type = 'button';
            reset.addEventListener('click', () => {
              restoreAsset(key);
              renderList();
            });
            actions.appendChild(reset);
          }
          row.appendChild(actions);
          list.appendChild(row);
        });
      }

      summary.textContent = query ? `${shown} coincidencias` : 'Todo lo que aparece en la interfaz activa.';
      if (!shown) list.appendChild(el('p', 'dev-empty', 'No hay coincidencias en esta pantalla.'));
    };

    search.addEventListener('input', renderList);
    renderList();
  }

  function showDevNotice(message) {
    let notice = panelBody.querySelector('.dev-notice');
    if (!notice) {
      notice = el('p', 'dev-notice');
      panelBody.prepend(notice);
    }
    notice.textContent = message;
    window.setTimeout(() => notice.remove(), 2600);
  }

  function buildControls() {
    if (!panelBody) return;
    panelBody.replaceChildren();

    if (!state.selected) {
      panelBody.appendChild(
        el('p', 'dev-empty', 'Sin selección.\nPulsa el botón de la diana y haz clic en cualquier elemento de la app.')
      );
      return;
    }

    const node = state.selected;
    const computed = window.getComputedStyle(node);

    const target = el('div', 'dev-target');
    target.appendChild(el('span', 'dev-target-tag', describe(node)));
    target.appendChild(el('span', 'dev-target-path', devKey(node)));
    panelBody.appendChild(target);

    /* Layout ------------------------------------------------------------- */
    const layout = makeSection('Layout', true);
    addNumericControl(layout.body, 'Width', 'width', computed.width, { min: 0, max: 2400 });
    addNumericControl(layout.body, 'Height', 'height', computed.height, { min: 0, max: 2400 });

    const translate = String(computed.translate || 'none').split(/\s+/);
    addNumericControl(layout.body, 'X', 'translate', translate[0] === 'none' ? '0px' : translate[0], {
      min: -600,
      max: 600
    });
    addNumericControl(layout.body, 'Y', 'translate', translate[1] || '0px', { min: -600, max: 600 });
    /* X e Y comparten la propiedad translate: se componen al aplicar. */
    const xField = layout.body.querySelectorAll('.dev-row')[2];
    const yField = layout.body.querySelectorAll('.dev-row')[3];
    if (xField && yField) {
      const getValues = () => {
        const current = String(getComputedStyle(node).translate || 'none').split(/\s+/);
        return { x: current[0] === 'none' ? 0 : parsePx(current[0]), y: parsePx(current[1] || '0') };
      };
      const bind = (row, axis) => {
        const range = row.querySelector('.dev-range');
        const num = row.querySelector('.dev-num');
        const commit = (raw) => {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          const values = getValues();
          values[axis] = parsed;
          applyProp('translate', `${values.x}px ${values.y}px`);
        };
        range.addEventListener('input', () => commit(range.value));
        num.addEventListener('input', () => commit(num.value));
      };
      bind(xField, 'x');
      bind(yField, 'y');
    }

    addQuadControl(layout.body, 'Pad', 'padding', computed);
    addQuadControl(layout.body, 'Margin', 'margin', computed);
    panelBody.appendChild(layout.details);

    /* Box ---------------------------------------------------------------- */
    const box = makeSection('Caja', true);
    addNumericControl(box.body, 'Radius', 'border-radius', computed.borderTopLeftRadius, { min: 0, max: 400 });
    addNumericControl(box.body, 'Border', 'border-width', computed.borderTopWidth, { min: 0, max: 40 });
    addNumericControl(box.body, 'Z-index', 'z-index', computed.zIndex === 'auto' ? 0 : computed.zIndex, {
      min: 0,
      max: 9999,
      unit: ''
    });
    addNumericControl(box.body, 'Opacity', 'opacity', parseFloat(computed.opacity) * 100, {
      min: 0,
      max: 100,
      step: 1,
      unit: '%'
    });
    /* opacity se guarda en porcentaje: convertimos a fracción al aplicar. */
    const opacityRow = box.body.querySelectorAll('.dev-row')[3];
    if (opacityRow) {
      const range = opacityRow.querySelector('.dev-range');
      const num = opacityRow.querySelector('.dev-num');
      const commit = (raw) => {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        applyProp('opacity', String(clamp(parsed / 100, 0, 1)));
      };
      range.addEventListener('input', () => commit(range.value));
      num.addEventListener('input', () => commit(num.value));
    }
    panelBody.appendChild(box.details);

    /* Colors ------------------------------------------------------------- */
    const colors = makeSection('Color', true);
    addColorControl(colors.body, 'Fondo', 'background-color', computed.backgroundColor);
    addColorControl(colors.body, 'Borde', 'border-color', computed.borderTopColor);
    addColorControl(colors.body, 'Texto', 'color', computed.color);
    panelBody.appendChild(colors.details);

    /* Effects ------------------------------------------------------------ */
    const effects = makeSection('Efectos', false);
    const blurValue = (() => {
      const match = /blur\(([\d.]+)px\)/.exec(String(computed.backdropFilter || ''));
      return match ? parseFloat(match[1]) : 0;
    })();
    addRangeField(effects.body, 'Blur', 0, 40, 1, blurValue, (value) => {
      applyProp('backdrop-filter', value > 0 ? `blur(${value}px) saturate(140%)` : 'none');
      applyProp('-webkit-backdrop-filter', value > 0 ? `blur(${value}px) saturate(140%)` : 'none');
    });

    const shadow = readShadow(computed);
    addRangeField(effects.body, 'Sombra X', -100, 100, 1, shadow.x, (value) => {
      shadow.x = value;
      applyShadow(shadow);
    });
    addRangeField(effects.body, 'Sombra Y', -100, 100, 1, shadow.y, (value) => {
      shadow.y = value;
      applyShadow(shadow);
    });
    addRangeField(effects.body, 'Blur', 0, 160, 1, shadow.blur, (value) => {
      shadow.blur = value;
      applyShadow(shadow);
    });
    addRangeField(effects.body, 'Spread', -60, 60, 1, shadow.spread, (value) => {
      shadow.spread = value;
      applyShadow(shadow);
    });
    addRangeField(effects.body, 'Opacidad', 0, 1, 0.01, shadow.alpha, (value) => {
      shadow.alpha = value;
      applyShadow(shadow);
    });
    addColorControl(effects.body, 'Color', 'box-shadow-color', rgba(shadow.color, shadow.alpha), {
      fallback: shadow.color
    });
    panelBody.appendChild(effects.details);

    /* Motion ------------------------------------------------------------- */
    const motion = makeSection('Animación', false);
    const duration = /[\d.]+m?s/.test(computed.animationDuration)
      ? parseFloat(computed.animationDuration) * (computed.animationDuration.includes('ms') ? 1 : 1000)
      : 0;
    addRangeField(motion.body, 'Duración', 0, 20000, 50, duration, (value) => {
      applyProp('animation-duration', `${Math.round(value)}ms`);
    });
    addTextControl(
      motion.body,
      'Curva',
      computed.animationTimingFunction === 'ease' ? '' : computed.animationTimingFunction,
      (value) => applyProp('animation-timing-function', value || null),
      'cubic-bezier(.22,.61,.36,1)'
    );
    addTextControl(
      motion.body,
      'Nombre',
      computed.animationName === 'none' ? '' : computed.animationName,
      (value) => applyProp('animation-name', value || null),
      'cardHoloDrift'
    );
    panelBody.appendChild(motion.details);

    /* Actions ------------------------------------------------------------ */
    const actions = el('div', 'dev-actions');
    const reset = el('button', 'dev-btn is-danger', 'Reset');
    reset.type = 'button';
    reset.addEventListener('click', resetSelected);

    const exportJson = el('button', 'dev-btn', 'JSON');
    exportJson.type = 'button';
    exportJson.addEventListener('click', () => showOutput(exportJSON()));

    const exportCss = el('button', 'dev-btn', 'CSS');
    exportCss.type = 'button';
    exportCss.addEventListener('click', () => showOutput(exportCSS()));

    const copy = el('button', 'dev-btn is-primary', 'Copiar');
    copy.type = 'button';
    copy.addEventListener('click', () => {
      const output = panelBody.querySelector('.dev-output');
      if (output) copyText(output.value);
    });

    actions.append(reset, exportCss, exportJson, copy);
    panelBody.appendChild(actions);
    panelBody.appendChild(el('p', 'dev-hint', 'Los cambios se guardan en este navegador. Ctrl+Shift+D abre o cierra el modo.'));
  }

  function applyShadow(shadow) {
    applyProp('box-shadow', `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${rgba(shadow.color, shadow.alpha)}`);
  }

  function showOutput(text) {
    let output = panelBody.querySelector('.dev-output');
    if (!output) {
      output = el('textarea', 'dev-output');
      output.readOnly = true;
      output.spellcheck = false;
      panelBody.appendChild(output);
    }
    output.value = text;
    output.focus();
    output.select();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const area = el('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      /* Sin permiso de portapapeles. */
    }
    area.remove();
  }

  /* ------------------------------------------------------------- selection */
  function select(node) {
    if (!node || node.nodeType !== 1 || node === document.documentElement) return;
    state.selected = node;
    state.selectedKey = devKey(node);
    document.querySelectorAll('[data-dev-selected]').forEach((n) => n.removeAttribute('data-dev-selected'));
    node.setAttribute('data-dev-selected', 'true');
    buildControls();
    syncSelectedOverlay();
    if (state.selectedKey) {
      const heading = panelBody && panelBody.querySelector('.dev-target-tag');
      if (heading) heading.dataset.key = state.selectedKey;
    }
  }

  function clearSelection() {
    state.selected = null;
    state.selectedKey = null;
    if (selectedBox) selectedBox.hidden = true;
    document.querySelectorAll('[data-dev-selected]').forEach((n) => n.removeAttribute('data-dev-selected'));
    buildControls();
  }

  /* --------------------------------------------------------------- exports */
  function exportJSON() {
    const elements = Object.entries(state.edits).map(([key, styles]) => {
      const node = document.querySelector(`[data-dev-key="${cssAttr(key)}"]`);
      return {
        key,
        element: node ? describe(node) : null,
        styles: Object.assign({}, styles)
      };
    });
    return JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        elements
      },
      null,
      2
    );
  }

  function exportCSS() {
    return Object.entries(state.edits)
      .map(([key, styles]) => {
        const body = Object.entries(styles)
          .map(([prop, value]) => `  ${prop}: ${value};`)
          .join('\n');
        return `/* ${key} */\n[data-dev-key="${cssAttr(key)}"] {\n${body}\n}`;
      })
      .join('\n\n');
  }

  /* ------------------------------------------------------------ picker/UI */
  function setPicker(on) {
    state.picker = Boolean(on);
    document.body.classList.toggle('dev-picking', state.picker);
    const button = panel && panel.querySelector('#dev-pick');
    if (button) {
      button.classList.toggle('is-on', state.picker);
      button.setAttribute('aria-pressed', String(state.picker));
      button.title = state.picker ? 'Seleccionando… (Esc para salir)' : 'Seleccionar elemento';
    }
    if (!state.picker && hoverBox) hoverBox.hidden = true;
    if (state.picker) closePanelIfNeededForPicker();
  }

  function closePanelIfNeededForPicker() {
    /* El panel sigue visible: el picker ignora los clics dentro de él. */
  }

  function setActive(on) {
    state.active = Boolean(on);
    if (!panel) return;
    panel.hidden = !state.active;
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-pressed', String(state.active));
      toggleBtn.textContent = state.active ? 'DEV ON' : 'DEV';
    }
    if (!state.active) {
      setPicker(false);
      if (hoverBox) hoverBox.hidden = true;
      if (selectedBox) selectedBox.hidden = true;
    } else {
      syncSelectedOverlay();
    }
  }

  function buildPanel() {
    panel = el('aside', 'dev-panel');
    panel.id = PANEL_ID;
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Inspector visual CardGram');

    const head = el('div', 'dev-panel-head');
    head.appendChild(el('h2', 'dev-panel-title', 'Developer mode'));

    const headActions = el('div', 'dev-head-actions');
    const pick = el('button', 'dev-icon-btn', '◎');
    pick.type = 'button';
    pick.id = 'dev-pick';
    pick.title = 'Seleccionar elemento';
    pick.setAttribute('aria-pressed', 'false');
    pick.addEventListener('click', () => setPicker(!state.picker));

    const close = el('button', 'dev-icon-btn', '×');
    close.type = 'button';
    close.title = 'Cerrar (Ctrl+Shift+D)';
    close.setAttribute('aria-label', 'Cerrar modo developer');
    close.addEventListener('click', () => setActive(false));

    headActions.append(pick, close);
    head.appendChild(headActions);
    panel.appendChild(head);

    tabsEl = el('div', 'dev-tabs');
    tabsEl.setAttribute('role', 'tablist');
    [
      ['inspector', 'Inspector'],
      ['azura', 'Azura'],
      ['assets', 'Assets'],
      ['backgrounds', 'Fondos']
    ].forEach(([id, label]) => {
      const button = el('button', 'dev-tab', label);
      button.type = 'button';
      button.dataset.devTab = id;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => setTab(id));
      tabsEl.appendChild(button);
    });
    panel.appendChild(tabsEl);

    panelBody = el('div', 'dev-panel-body');
    panel.appendChild(panelBody);
    document.body.appendChild(panel);
    renderTab();

    /* Arrastre del panel. */
    let drag = null;
    head.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
      head.setPointerCapture(event.pointerId);
    });
    head.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const maxLeft = window.innerWidth - panel.offsetWidth - 6;
      const maxTop = window.innerHeight - 60;
      panel.style.left = `${clamp(event.clientX - drag.dx, 6, Math.max(6, maxLeft))}px`;
      panel.style.top = `${clamp(event.clientY - drag.dy, 6, Math.max(6, maxTop))}px`;
    });
    const endDrag = () => {
      drag = null;
    };
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);
  }

  /* -------------------------------------------------------------- candado */
  function isUnlocked() {
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function rememberUnlock() {
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch (error) {
      /* Sesión sin almacenamiento: se pedirá de nuevo. */
    }
  }

  function buildLock() {
    lockEl = el('div', 'dev-lock');
    lockEl.hidden = true;
    lockEl.setAttribute('role', 'dialog');
    lockEl.setAttribute('aria-modal', 'true');
    lockEl.setAttribute('aria-label', 'Acceso al modo developer');

    const card = el('form', 'dev-lock-card');
    card.appendChild(el('span', 'dev-lock-badge', 'Developer mode'));
    card.appendChild(el('h3', 'dev-lock-title', 'Introduce la contraseña'));
    card.appendChild(el('p', 'dev-lock-copy', 'El acceso queda desbloqueado durante esta sesión del navegador.'));

    lockInput = el('input', 'dev-lock-input');
    lockInput.type = 'password';
    lockInput.inputMode = 'numeric';
    lockInput.autocomplete = 'off';
    lockInput.placeholder = '••••';
    lockInput.setAttribute('aria-label', 'Contraseña');
    card.appendChild(lockInput);

    lockError = el('p', 'dev-lock-error', 'Contraseña incorrecta. Inténtalo de nuevo.');
    lockError.hidden = true;
    card.appendChild(lockError);

    const actions = el('div', 'dev-lock-actions');
    const cancel = el('button', 'dev-btn', 'Cancelar');
    cancel.type = 'button';
    cancel.addEventListener('click', hideLock);
    const submit = el('button', 'dev-btn is-primary', 'Entrar');
    submit.type = 'submit';
    actions.append(cancel, submit);
    card.appendChild(actions);

    card.addEventListener('submit', (event) => {
      event.preventDefault();
      if (lockInput.value.trim() === DEV_PASSWORD) {
        rememberUnlock();
        hideLock();
        setActive(true);
        return;
      }
      lockError.hidden = false;
      card.classList.remove('is-shaking');
      /* Reinicia la animación de error. */
      void card.offsetWidth;
      card.classList.add('is-shaking');
      lockInput.select();
    });

    lockEl.appendChild(card);
    lockEl.addEventListener('pointerdown', (event) => {
      if (event.target === lockEl) hideLock();
    });
    document.body.appendChild(lockEl);
  }

  function showLock() {
    if (!lockEl) return;
    setActive(false);
    lockEl.hidden = false;
    if (lockError) lockError.hidden = true;
    if (lockInput) {
      lockInput.value = '';
      window.setTimeout(() => lockInput.focus(), 30);
    }
  }

  function hideLock() {
    if (!lockEl) return;
    lockEl.hidden = true;
    if (lockError) lockError.hidden = true;
  }

  function requestOpen() {
    if (state.active) return;
    if (isUnlocked()) setActive(true);
    else showLock();
  }

  function requestToggle() {
    if (state.active) setActive(false);
    else if (isUnlocked()) setActive(true);
    else showLock();
  }

  function buildToggle() {
    toggleBtn = el('button', 'dev-toggle', 'DEV');
    toggleBtn.type = 'button';
    toggleBtn.title = 'Modo developer (Ctrl+Shift+D)';
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.addEventListener('click', requestToggle);
    document.body.appendChild(toggleBtn);
  }

  /* --------------------------------------------------------------- events */
  function bindGlobalEvents() {
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (!state.active || !state.picker) return;
        if (event.target.closest(`#${PANEL_ID}`) || event.target.closest('.dev-toggle')) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );

    document.addEventListener(
      'click',
      (event) => {
        if (!state.active || !state.picker) return;
        if (event.target.closest(`#${PANEL_ID}`) || event.target.closest('.dev-toggle')) return;
        event.preventDefault();
        event.stopPropagation();
        select(event.target);
      },
      true
    );

    document.addEventListener(
      'mousemove',
      (event) => {
        if (!state.active || !state.picker) return;
        if (event.target.closest(`#${PANEL_ID}`) || event.target.closest('.dev-toggle')) {
          if (hoverBox) hoverBox.hidden = true;
          return;
        }
        if (event.target === state.hover) return;
        state.hover = event.target;
        placeOverlay(hoverBox, event.target);
      },
      true
    );

    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && (event.key === 'D' || event.key === 'd')) {
        event.preventDefault();
        requestToggle();
        return;
      }
      if (event.key === 'Escape' && lockEl && !lockEl.hidden) {
        hideLock();
        return;
      }
      if (event.key === 'Escape' && state.active) {
        if (state.picker) setPicker(false);
        else setActive(false);
      }
    });

    window.addEventListener('resize', syncSelectedOverlay);
    window.addEventListener(
      'scroll',
      () => {
        if (state.active) syncSelectedOverlay();
      },
      true
    );

    /* Los paneles de la app se re-renderizan: mantenemos el overlay al día.
       Se ignora cualquier mutación dentro del propio inspector para no
       realimentar el observer (el overlay cambia su etiqueta). */
    let overlayRaf = 0;
    const scheduleOverlay = () => {
      if (overlayRaf) return;
      overlayRaf = window.requestAnimationFrame(() => {
        overlayRaf = 0;
        if (Object.keys(state.assets).length) applyAssets();
        if (!state.active) return;
        hydrateKeys();
        if (state.selected && !state.selected.isConnected) clearSelection();
        else syncSelectedOverlay();
      });
    };
    const observer = new MutationObserver((records) => {
      /* Sin inspector abierto ni recursos sustituidos no hay nada que rehacer. */
      if (!state.active && !Object.keys(state.assets).length) return;
      /* Solo nos interesa lo que pasa fuera del propio inspector. */
      const outside = records.some((record) => {
        const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        return !(node && node.closest && node.closest('.dev-panel, .dev-outline, .dev-toggle, .dev-lock'));
      });
      if (!outside) return;
      scheduleOverlay();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    if (panel) return;
    styleEl = el('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);

    buildToggle();
    buildLock();
    buildPanel();
    ensureOverlays();
    loadEdits();
    loadAssets();
    loadAzura();
    loadBackgrounds();
    bindGlobalEvents();

    window.CardGramDevMode = {
      state,
      open: requestOpen,
      close: () => setActive(false),
      toggle: requestToggle,
      lock: showLock,
      select,
      backgrounds: {
        setHub: setHubBackground,
        setVeil: (value) => {
          state.backgrounds.hubVeil = clamp(Number(value) || 0, 0, 100);
          saveBackgrounds();
          applyBackgrounds();
        },
        addBootSlide,
        clearBoot: () => {
          state.backgrounds.boot = [];
          saveBackgrounds();
          applyBackgrounds();
        },
        showBoot: () => showBootPreview(true),
        hideBoot: () => showBootPreview(false)
      },
      clear: () => {
        state.edits = {};
        renderSheet();
        saveEdits();
        clearSelection();
      },
      clearAssets: () => {
        Object.keys(state.assets).forEach((key) => restoreAsset(key));
        state.assets = {};
        saveAssets();
        loadAssets();
      },
      exportJSON,
      exportCSS
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
