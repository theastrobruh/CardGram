/* ==========================================================================
   CardGram · Sonido
   Micro-diseño sonoro sintetizado con Web Audio (sin archivos, sin red).
   Toques de cristal, madera suave y campanillas acuáticas para acompañar
   cada gesto sin competir con la lectura. Se activa con el primer gesto del
   usuario (política de autoplay) y recuerda la preferencia.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'cardgram.sound.v1';
  const DEFAULTS = { enabled: true, volume: 0.8 };

  const MIN_GAP = {
    tap: 0.045,
    hover: 0.11,
    slider: 0.055,
    navigate: 0.06,
    tab: 0.05,
    open: 0.12,
    close: 0.12,
    flip: 0.18,
    success: 0.35,
    reward: 0.35,
    error: 0.3,
    primary: 0.1
  };

  let settings = loadSettings();
  let ctx = null;
  let master = null;
  let limiter = null;
  let noiseBuffer = null;
  let unlocked = false;
  let attached = false;
  const lastPlayed = Object.create(null);

  /* ------------------------------------------------------------------------
     Preferencia
     ---------------------------------------------------------------------- */
  function loadSettings() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && typeof stored === 'object') {
        return {
          enabled: stored.enabled !== false,
          volume: clamp(Number(stored.volume), 0, 1) || DEFAULTS.volume
        };
      }
    } catch (error) {
      /* localStorage bloqueado: seguimos con los valores por defecto. */
    }
    return { ...DEFAULTS };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      /* Sin persistencia: el sonido sigue funcionando en esta sesión. */
    }
  }

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  function masterLevel() {
    return settings.enabled ? 0.9 * settings.volume : 0;
  }

  /* ------------------------------------------------------------------------
     Contexto de audio
     ---------------------------------------------------------------------- */
  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;

    try {
      ctx = new AudioCtor();
    } catch (error) {
      return null;
    }

    master = ctx.createGain();
    master.gain.value = masterLevel();

    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -20;
    limiter.knee.value = 24;
    limiter.ratio.value = 3;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    master.connect(limiter);
    limiter.connect(ctx.destination);

    /* Ruido reutilizable para soplos de papel y aire. */
    const frames = Math.floor(ctx.sampleRate * 0.6);
    noiseBuffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < frames; i += 1) {
      const white = Math.random() * 2 - 1;
      /* Suavizado: evita el siseo áspero y acerca el ruido a "papel". */
      last = (last + 0.06 * white) / 1.06;
      data[i] = last * 1.6;
    }

    return ctx;
  }

  function unlock() {
    const context = ensureContext();
    unlocked = true;
    if (context && context.state === 'suspended') {
      context.resume().catch(() => {});
    }
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  /* ------------------------------------------------------------------------
     Primitivas de síntesis
     ---------------------------------------------------------------------- */
  function outputNode(pan) {
    if (!pan || typeof ctx.createStereoPanner !== 'function') return master;
    const panner = ctx.createStereoPanner();
    panner.pan.value = clamp(pan, -1, 1);
    panner.connect(master);
    return panner;
  }

  function tone(options) {
    if (!ctx) return;
    const {
      freq,
      to = freq,
      type = 'sine',
      dur = 0.14,
      gain = 0.05,
      attack = 0.005,
      delay = 0,
      pan = 0,
      detune = 0
    } = options;

    const start = now() + Math.max(0, delay);
    const end = start + dur;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (to && Math.abs(to - freq) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(env);
    env.connect(outputNode(pan));
    osc.start(start);
    osc.stop(end + 0.03);
  }

  function air(options) {
    if (!ctx || !noiseBuffer) return;
    const {
      from = 700,
      to = 2200,
      dur = 0.3,
      gain = 0.03,
      q = 0.9,
      delay = 0,
      pan = 0
    } = options;

    const start = now() + Math.max(0, delay);
    const end = start + dur;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    src.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), end);

    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    src.connect(filter);
    filter.connect(env);
    env.connect(outputNode(pan));
    src.start(start);
    src.stop(end + 0.03);
  }

  /* ------------------------------------------------------------------------
     Paleta
     ---------------------------------------------------------------------- */
  const palette = {
    /* Toque de cristal al pulsar. */
    tap() {
      tone({ freq: 1046.5, to: 880, type: 'sine', dur: 0.085, gain: 0.045 });
      tone({ freq: 2093, to: 1760, type: 'triangle', dur: 0.05, gain: 0.009 });
    },

    /* Chispa casi inaudible al pasar el puntero. */
    hover() {
      tone({ freq: 1760, to: 1568, type: 'sine', dur: 0.035, gain: 0.007 });
      tone({ freq: 2637, type: 'triangle', dur: 0.026, gain: 0.003 });
    },

    /* Cambio de vista: dos notas que suben. */
    navigate() {
      tone({ freq: 659.25, type: 'sine', dur: 0.085, gain: 0.03 });
      tone({ freq: 987.77, type: 'sine', dur: 0.12, gain: 0.022, delay: 0.055 });
    },

    /* Idioma: pequeña campana de dos tonos. */
    lang() {
      tone({ freq: 783.99, type: 'triangle', dur: 0.09, gain: 0.028 });
      tone({ freq: 1174.66, type: 'sine', dur: 0.13, gain: 0.018, delay: 0.06 });
    },

    /* Pestaña del estudio. */
    tab() {
      tone({ freq: 740, to: 988, type: 'triangle', dur: 0.075, gain: 0.024 });
    },

    /* Hoja o diálogo que se abre: aire que sube. */
    open() {
      air({ from: 480, to: 2600, dur: 0.3, gain: 0.026, q: 0.8 });
      tone({ freq: 392, to: 784, type: 'sine', dur: 0.24, gain: 0.02 });
      tone({ freq: 1568, type: 'triangle', dur: 0.12, gain: 0.007, delay: 0.1 });
    },

    /* Hoja o diálogo que se cierra: aire que baja. */
    close() {
      air({ from: 2200, to: 380, dur: 0.26, gain: 0.022, q: 0.8 });
      tone({ freq: 784, to: 392, type: 'sine', dur: 0.2, gain: 0.016 });
    },

    /* Interruptor encendido. */
    toggleOn() {
      tone({ freq: 587.33, type: 'sine', dur: 0.08, gain: 0.036 });
      tone({ freq: 880, type: 'sine', dur: 0.14, gain: 0.03, delay: 0.06 });
      tone({ freq: 1760, type: 'triangle', dur: 0.08, gain: 0.006, delay: 0.09 });
    },

    /* Interruptor apagado. */
    toggleOff() {
      tone({ freq: 659.25, type: 'triangle', dur: 0.08, gain: 0.03 });
      tone({ freq: 440, type: 'sine', dur: 0.12, gain: 0.022, delay: 0.055 });
    },

    /* La carta gira: papel y aire. */
    flip() {
      air({ from: 900, to: 3000, dur: 0.3, gain: 0.03, q: 1.1 });
      tone({ freq: 300, to: 680, type: 'triangle', dur: 0.16, gain: 0.01 });
    },

    /* Acción principal (exportar, guardar, estrenar). */
    primary() {
      tone({ freq: 523.25, type: 'sine', dur: 0.09, gain: 0.032 });
      tone({ freq: 783.99, type: 'sine', dur: 0.16, gain: 0.026, delay: 0.06 });
      tone({ freq: 1568, type: 'triangle', dur: 0.1, gain: 0.006, delay: 0.12 });
    },

    /* Aviso neutro. */
    info() {
      tone({ freq: 880, type: 'sine', dur: 0.09, gain: 0.02 });
      tone({ freq: 1174.66, type: 'sine', dur: 0.12, gain: 0.014, delay: 0.06 });
    },

    /* Confirmación: campanilla de tres notas. */
    success() {
      const notes = [1046.5, 1318.51, 1567.98];
      notes.forEach((freq, index) => {
        tone({ freq, type: 'sine', dur: 0.2, gain: 0.026, delay: index * 0.06 });
        tone({ freq: freq * 2, type: 'triangle', dur: 0.12, gain: 0.004, delay: index * 0.06 });
      });
      tone({ freq: 2093, type: 'sine', dur: 0.16, gain: 0.006, delay: 0.18 });
    },

    /* Recompensa (favorito, hito): arpegio de cuatro notas. */
    reward() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        tone({ freq, type: 'triangle', dur: 0.22, gain: 0.028, delay: index * 0.07 });
      });
      tone({ freq: 2637, type: 'sine', dur: 0.2, gain: 0.006, delay: 0.26 });
    },

    /* Error suave, nunca estridente. */
    error() {
      tone({ freq: 233.08, to: 196, type: 'triangle', dur: 0.16, gain: 0.03 });
      tone({ freq: 164.81, type: 'sine', dur: 0.2, gain: 0.022, delay: 0.08 });
    },

    /* Paso de control deslizante: tono según el valor. */
    slider(options) {
      const value = clamp(Number(options && options.value), 0, 1);
      const freq = 900 + value * 620;
      tone({ freq, type: 'sine', dur: 0.03, gain: 0.006 });
    }
  };

  /* ------------------------------------------------------------------------
     Reproducción
     ---------------------------------------------------------------------- */
  function play(name, options = {}) {
    if (!settings.enabled && !options.force) return false;
    if (!unlocked) return false;
    const context = ensureContext();
    if (!context) return false;
    if (context.state === 'suspended') context.resume().catch(() => {});

    const recipe = palette[name] || palette.tap;
    const stamp = now();
    const gap = MIN_GAP[name] || 0.05;
    if (lastPlayed[name] && stamp - lastPlayed[name] < gap) return false;
    lastPlayed[name] = stamp;

    try {
      recipe(options);
      return true;
    } catch (error) {
      return false;
    }
  }

  /* ------------------------------------------------------------------------
     Botones de sonido
     ---------------------------------------------------------------------- */
  function syncButtons() {
    const nodes = document.querySelectorAll('[data-sound-toggle]');
    nodes.forEach((node) => {
      node.classList.toggle('is-muted', !settings.enabled);
      node.setAttribute('aria-pressed', String(settings.enabled));
    });
  }

  function setEnabled(value) {
    const next = Boolean(value);
    if (next === settings.enabled) {
      syncButtons();
      return next;
    }

    if (next) {
      settings.enabled = true;
      saveSettings();
      unlock();
      if (master && ctx) {
        master.gain.cancelScheduledValues(now());
        master.gain.setTargetAtTime(masterLevel(), now(), 0.03);
      }
      play('toggleOn', { force: true });
    } else {
      unlock();
      play('toggleOff', { force: true });
      settings.enabled = false;
      saveSettings();
      if (master && ctx) {
        master.gain.cancelScheduledValues(now());
        /* Deja terminar la campanilla de apagado antes de silenciar. */
        master.gain.setTargetAtTime(0, now() + 0.16, 0.03);
      }
    }

    syncButtons();
    return settings.enabled;
  }

  function toggle() {
    return setEnabled(!settings.enabled);
  }

  /* ------------------------------------------------------------------------
     Delegación de gestos
     ---------------------------------------------------------------------- */
  const HIT_SELECTOR = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="tab"]',
    '[role="menuitemradio"]',
    '[data-hub-route]',
    '[data-open-studio]',
    '[data-open-favorite]',
    '[data-open-card]',
    '[data-fav-card]',
    'input[type="checkbox"]',
    'input[type="radio"]',
    '.switch',
    '[data-sound]'
  ].join(', ');

  function isDisabled(node) {
    return Boolean(
      node.disabled ||
      node.getAttribute('aria-disabled') === 'true' ||
      node.closest('[aria-disabled="true"]')
    );
  }

  function classify(node) {
    if (node.matches('[data-hub-lang], .lang-option')) return 'lang';

    if (node.closest('[data-open-studio], [data-new-deck]')) return 'open';

    if (node.closest('[data-hub-route], [data-open-favorite], [data-open-card], [data-fav-card]')) {
      return 'navigate';
    }

    if (node.matches('.tab-btn, [role="tab"]')) return 'tab';

    if (node.closest('.hub-card')) return 'flip';

    if (node.matches('input[type="checkbox"], input[type="radio"]') || node.closest('.switch')) {
      const input = node.matches('input')
        ? node
        : (node.control || node.querySelector('input'));
      return input && input.checked ? 'toggleOff' : 'toggleOn';
    }

    if (node.closest('.hub-menu-close, [data-menu-close]')) return 'close';

    if (node.matches('.btn-primary, .export-btn, #btn-record')) return 'primary';

    return 'tap';
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    unlock();
    if (!settings.enabled) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest(HIT_SELECTOR);
    if (!hit || isDisabled(hit)) return;

    const explicit = hit.getAttribute('data-sound');
    if (explicit === 'none') return;
    if (explicit) {
      play(explicit);
      return;
    }

    play(classify(hit));
  }

  function onPointerOver(event) {
    if (!settings.enabled) return;
    if (event.pointerType && event.pointerType !== 'mouse') return;
    if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest('button, a[href], [role="button"], [role="tab"], .hub-menu-item');
    if (!hit || isDisabled(hit)) return;
    if (hit.getAttribute('data-sound') === 'none' && !hit.hasAttribute('data-sound-toggle')) return;
    if (event.relatedTarget instanceof Element && hit.contains(event.relatedTarget)) return;

    /* Solo controles con presencia visual: evita un tick por cada nodo. */
    if (!hit.matches('.hub-nav-btn, .hub-menu-item, .hub-player-stat, .media-card, .collection-card, .icon-btn, .btn, .tab-btn, .hub-lang-btn, [data-sound-toggle], .seg-btn, .preset-chip')) {
      return;
    }

    play('hover');
  }

  function onKeyDown(event) {
    unlock();
    if (!settings.enabled) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    if (event.repeat) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest(HIT_SELECTOR);
    if (!hit || isDisabled(hit)) return;
    if (hit.hasAttribute('data-sound-toggle')) return;

    const explicit = hit.getAttribute('data-sound');
    if (explicit === 'none') return;
    play(explicit || classify(hit));
  }

  function onChange(event) {
    const target = event.target;
    if (!(target instanceof Element) || !settings.enabled) return;

    if (target.matches('input[type="range"]')) {
      const min = Number(target.min || 0);
      const max = Number(target.max || 100);
      const value = max > min ? (Number(target.value) - min) / (max - min) : 0;
      play('slider', { value });
      return;
    }

    if (target.matches('select')) play('tap');
  }

  function onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('[data-sound-toggle]');
    if (!button) return;
    event.preventDefault();
    toggle();
  }

  function attach() {
    if (attached) return;
    attached = true;

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('click', onClick, true);

    syncButtons();
  }

  /* ------------------------------------------------------------------------
     API pública
     ---------------------------------------------------------------------- */
  window.Sound = {
    play,
    toggle,
    setEnabled,
    isEnabled: () => settings.enabled,
    attach,
    syncButtons,
    get state() {
      return {
        enabled: settings.enabled,
        volume: settings.volume,
        unlocked,
        context: ctx ? ctx.state : 'none'
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
