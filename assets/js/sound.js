/* ==========================================================================
   CardGram · Sonido
   Micro-diseño sonoro: cinco gestos usan muestras de audio locales
   (assets/data/sounds) y el resto sigue sintetizado con Web Audio.
   Se activa con el primer gesto del usuario (política de autoplay) y
   recuerda la preferencia.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'cardgram.sound.v1';
  const DEFAULTS = { enabled: true, volume: 0.44 };

  const MIN_GAP = {
    tap: 0.045,
    hover: 0.11,
    slider: 0.055,
    navigate: 0.06,
    tab: 0.05,
    open: 0.12,
    close: 0.12,
    flip: 0.18,
    cardSettle: 0.2,
    favorite: 0.25,
    success: 0.35,
    reward: 0.35,
    error: 0.3,
    primary: 0.1,
    nav: 0.08
  };

  /* Muestras puntuales: sustituyen únicamente al gesto con el mismo nombre.
     El resto de la paleta sigue siendo sintetizada. */
  const SAMPLES = {
    tap: { src: 'assets/data/sounds/click - tap.wav', gain: 0.55 },
    favorite: { src: 'assets/data/sounds/favorite-card-select.wav', gain: 0.6 },
    nav: { src: 'assets/data/sounds/options click.wav', gain: 0.45 },
    open: { src: 'assets/data/sounds/menu-button-select.wav', gain: 0.6 },
    error: { src: 'assets/data/sounds/warning-alert.wav', gain: 0.65 }
  };
  const samplePool = Object.create(null);

  let settings = loadSettings();
  let ctx = null;
  let master = null;
  let limiter = null;
  let echo = null;
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

    /* Eco corto y cálido: la firma "PSX" que une todos los gestos. */
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.135;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.24;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    const wet = ctx.createGain();
    wet.gain.value = 0.16;
    echo.connect(damp);
    damp.connect(feedback);
    feedback.connect(echo);
    echo.connect(wet);
    wet.connect(master);

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
      detune = 0,
      send = 0
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

    if (type === 'square' || type === 'sawtooth') {
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.setValueAtTime(4200, start);
      soft.frequency.exponentialRampToValueAtTime(2200, end);
      osc.connect(soft);
      soft.connect(env);
    } else {
      osc.connect(env);
    }

    env.connect(outputNode(pan));
    if (send > 0 && echo) {
      const sendGain = ctx.createGain();
      sendGain.gain.value = send;
      env.connect(sendGain);
      sendGain.connect(echo);
    }
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
  /* Arpegio de chip corto: la base del vocabulario PSX. */
  function chip(notes, options = {}) {
    const {
      type = 'square',
      step = 0.05,
      dur = 0.12,
      gain = 0.014,
      send = 0.12
    } = options;

    notes.forEach((freq, index) => {
      tone({
        freq,
        type,
        dur,
        gain,
        delay: index * step,
        attack: 0.004,
        send
      });
      tone({
        freq: freq * 2,
        type: 'triangle',
        dur: dur * 0.6,
        gain: gain * 0.18,
        delay: index * step + 0.005
      });
    });
  }

  const palette = {
    /* Blip de selección: madera + chispa de chip. */
    tap() {
      tone({ freq: 987.77, to: 880, type: 'triangle', dur: 0.06, gain: 0.03 });
      tone({ freq: 1975.53, type: 'square', dur: 0.03, gain: 0.006, send: 0.08 });
    },

    /* Tick casi inaudible al pasar el puntero. */
    hover() {
      tone({ freq: 1760, type: 'square', dur: 0.022, gain: 0.0035 });
    },

    /* Cambio de vista: arpegio ascendente de tres pasos. */
    navigate() {
      chip([523.25, 659.25, 783.99], { step: 0.042, dur: 0.09, gain: 0.012 });
      tone({ freq: 392, type: 'triangle', dur: 0.1, gain: 0.012 });
    },

    /* Idioma: campanilla de dos notas. */
    lang() {
      chip([659.25, 987.77], { type: 'triangle', step: 0.05, dur: 0.1, gain: 0.011 });
    },

    /* Pestaña del estudio: pequeño barrido. */
    tab() {
      tone({ freq: 740, to: 988, type: 'square', dur: 0.055, gain: 0.014 });
      tone({ freq: 1480, type: 'triangle', dur: 0.03, gain: 0.004 });
    },

    /* Diálogo que se abre: aire cálido + destello. */
    open() {
      air({ from: 480, to: 2600, dur: 0.3, gain: 0.024, q: 0.8 });
      tone({ freq: 392, to: 784, type: 'triangle', dur: 0.22, gain: 0.015 });
      chip([1046.5, 1567.98], { step: 0.05, dur: 0.1, gain: 0.009, send: 0.18 });
    },

    /* Diálogo que se cierra: el eco se apaga. */
    close() {
      air({ from: 2200, to: 380, dur: 0.26, gain: 0.02, q: 0.8 });
      tone({ freq: 784, to: 392, type: 'triangle', dur: 0.18, gain: 0.014 });
      tone({ freq: 523.25, type: 'square', dur: 0.06, gain: 0.008, delay: 0.1 });
    },

    /* Interruptor encendido: moneda de PSX. */
    toggleOn() {
      chip([1046.5, 1318.51, 1567.98], { step: 0.045, dur: 0.1, gain: 0.013, send: 0.16 });
    },

    /* Interruptor apagado. */
    toggleOff() {
      tone({ freq: 783.99, to: 523.25, type: 'square', dur: 0.12, gain: 0.014 });
      tone({ freq: 392, type: 'triangle', dur: 0.14, gain: 0.012, delay: 0.05 });
    },

    /* La carta gira: papel y un chirp de chip, deliberadamente suaves. */
    flip() {
      air({ from: 900, to: 3000, dur: 0.24, gain: 0.011, q: 1.1 });
      tone({ freq: 220, to: 660, type: 'square', dur: 0.07, gain: 0.003 });
      tone({ freq: 440, to: 330, type: 'triangle', dur: 0.1, gain: 0.004, delay: 0.04 });
    },

    /* La carta vuelve a su sitio: un roce apenas audible. */
    cardSettle() {
      air({ from: 1500, to: 420, dur: 0.2, gain: 0.007, q: 0.9 });
      tone({ freq: 240, type: 'triangle', dur: 0.1, gain: 0.005 });
      tone({ freq: 160, type: 'square', dur: 0.07, gain: 0.002 });
    },

    /* Acción principal: fanfarria breve de cuatro notas. */
    primary() {
      chip([523.25, 659.25, 783.99, 1046.5], { step: 0.05, dur: 0.14, gain: 0.015, send: 0.2 });
      tone({ freq: 261.63, type: 'triangle', dur: 0.12, gain: 0.014 });
    },

    /* Aviso neutro. */
    info() {
      chip([880, 1174.66], { type: 'triangle', step: 0.055, dur: 0.09, gain: 0.01 });
    },

    /* Confirmación: arpegio luminoso. */
    success() {
      chip([783.99, 987.77, 1174.66, 1567.98], { step: 0.055, dur: 0.16, gain: 0.014, send: 0.22 });
    },

    /* Recompensa: arpegio largo con cola. */
    reward() {
      chip([523.25, 659.25, 783.99, 1046.5, 1318.51], { step: 0.055, dur: 0.2, gain: 0.014, send: 0.26 });
      tone({ freq: 261.63, type: 'triangle', dur: 0.2, gain: 0.011 });
    },

    /* Error suave: caída de chip, nunca estridente. */
    error() {
      tone({ freq: 233.08, to: 174.61, type: 'square', dur: 0.14, gain: 0.018 });
      tone({ freq: 110, type: 'triangle', dur: 0.18, gain: 0.016 });
    },

    /* Paso de control deslizante. */
    slider(options) {
      const value = clamp(Number(options && options.value), 0, 1);
      const freq = 900 + value * 700;
      tone({ freq, type: 'square', dur: 0.022, gain: 0.005 });
    }
  };

  /* ------------------------------------------------------------------------
     Reproducción
     ---------------------------------------------------------------------- */
  /* Las muestras van por un elemento <audio> para funcionar también con
     file://, donde fetch/decodeAudioData no puede leer el archivo. */
  function playSample(name) {
    const sample = SAMPLES[name];
    if (!sample) return false;

    let audio = samplePool[name];
    if (!audio) {
      audio = new Audio();
      audio.src = sample.src;
      audio.preload = 'auto';
      samplePool[name] = audio;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = clamp(masterLevel() * sample.gain, 0, 1);
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      return true;
    } catch (error) {
      return false;
    }
  }

  function preloadSamples() {
    Object.keys(SAMPLES).forEach((name) => {
      if (samplePool[name]) return;
      const audio = new Audio();
      audio.src = SAMPLES[name].src;
      audio.preload = 'auto';
      samplePool[name] = audio;
    });
  }

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
      if (SAMPLES[name]) return playSample(name);
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

    /* Seleccionar la carta favorita tiene su propia muestra. */
    if (node.closest('[data-fav-card]')) return 'favorite';

    /* Menú de navegación (topbar y hoja móvil): única casa de "options click". */
    if (node.closest('.hub-nav-btn, .hub-menu-item')) return 'nav';

    if (node.closest('[data-hub-route], [data-open-favorite], [data-open-card]')) {
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

    preloadSamples();
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
