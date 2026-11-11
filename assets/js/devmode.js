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
  const PANEL_ID = 'dev-panel';
  const STYLE_ID = 'devmode-style';

  const state = {
    active: false,
    picker: false,
    selected: null,
    selectedKey: null,
    edits: {},
    hover: null
  };

  let panel;
  let panelBody;
  let toggleBtn;
  let hoverBox;
  let selectedBox;
  let styleEl;
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

    panelBody = el('div', 'dev-panel-body');
    panel.appendChild(panelBody);
    document.body.appendChild(panel);

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

    buildControls();
  }

  function buildToggle() {
    toggleBtn = el('button', 'dev-toggle', 'DEV');
    toggleBtn.type = 'button';
    toggleBtn.title = 'Modo developer (Ctrl+Shift+D)';
    toggleBtn.setAttribute('aria-pressed', 'false');
    toggleBtn.addEventListener('click', () => setActive(!state.active));
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
        setActive(!state.active);
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
        if (!state.active) return;
        hydrateKeys();
        if (state.selected && !state.selected.isConnected) clearSelection();
        else syncSelectedOverlay();
      });
    };
    const observer = new MutationObserver((records) => {
      if (!state.active) return;
      if (records.some((record) => {
        const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
        return node && node.closest && node.closest('.dev-panel, .dev-outline, .dev-toggle');
      })) {
        return;
      }
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
    buildPanel();
    ensureOverlays();
    loadEdits();
    bindGlobalEvents();

    window.CardGramDevMode = {
      state,
      open: () => setActive(true),
      close: () => setActive(false),
      toggle: () => setActive(!state.active),
      select,
      clear: () => {
        state.edits = {};
        renderSheet();
        saveEdits();
        clearSelection();
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
