/* ==========================================================================
   CardGram — v0.5.5 · Ambiente reactivo
   Lee el arte de la carta en uso, extrae su paleta dominante y tiñe el fondo
   con un degradado pastel. Dos capas se funden entre sí al cambiar de carta,
   así el cambio se siente como una respiración y no como un salto.

   Sin dependencias ni red: el muestreo se hace en un canvas local, por lo que
   funciona igual con la app abierta desde el sistema de archivos.
   ========================================================================== */
'use strict';

(function () {
  const DEFAULT_ACCENTS = ['#7cebdd', '#4aa8e0', '#2ec4b6'];
  const SAMPLE_WIDTH = 44;
  const MIN_SATURATION = 0.12;
  const MIN_LIGHTNESS = 0.08;
  const MAX_LIGHTNESS = 0.95;
  const MAX_CACHE = 24;

  const root = document.documentElement;
  const cache = new Map();

  const state = {
    layers: [],
    activeLayer: -1,
    key: null,
    canvas: null,
    ctx: null,
    themeMeta: null
  };

  /* ------------------------------------------------------------------------
     Utilidades de color
     ------------------------------------------------------------------------ */
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function rgbToHsl(r, g, b) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    if (max === min) return [0, 0, lightness];

    const delta = max - min;
    const saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);
    let hue;

    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    return [hue * 60, saturation, lightness];
  }

  function hslToRgb(h, s, l) {
    const hue = ((h % 360) + 360) % 360;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = hue / 60;
    const second = chroma * (1 - Math.abs((section % 2) - 1));
    let rgb;

    if (section < 1) rgb = [chroma, second, 0];
    else if (section < 2) rgb = [second, chroma, 0];
    else if (section < 3) rgb = [0, chroma, second];
    else if (section < 4) rgb = [0, second, chroma];
    else if (section < 5) rgb = [second, 0, chroma];
    else rgb = [chroma, 0, second];

    const offset = l - chroma / 2;
    return rgb.map((channel) => clamp(Math.round((channel + offset) * 255), 0, 255));
  }

  function toHex(h, s, l) {
    return '#' + hslToRgb(h, s, l)
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('');
  }

  function fromHex(hex) {
    const clean = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(clean)) return null;
    const full = clean.length === 3
      ? clean.split('').map((char) => char + char).join('')
      : clean;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16)
    ];
  }

  /* ------------------------------------------------------------------------
     Paleta
     ------------------------------------------------------------------------ */
  function displayColor(hue, saturation, lightness, lift) {
    // La carta suele ser oscura: subimos la luz para que el fondo respire y el
    // texto oscuro de la interfaz siga teniendo contraste.
    const s = clamp(saturation * 100, 47, 88);
    const l = clamp(lightness * 100 + lift, 64, 84);
    return {
      hue: ((hue % 360) + 360) % 360,
      sat: s,
      light: l,
      triplet: `${Math.round(((hue % 360) + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%`,
      hex: toHex(hue, s / 100, l / 100)
    };
  }

  function buildPalette(entries) {
    const list = entries.filter(Boolean);
    const base = list[0] || { hue: 176, sat: 0.58, light: 0.7 };
    const second = list[1] || {
      hue: base.hue + 26,
      sat: Math.max(0.32, base.sat * 0.78),
      light: base.light + 0.02
    };
    const third = list[2] || {
      hue: base.hue - 22,
      sat: Math.max(0.3, base.sat * 0.62),
      light: Math.min(0.92, base.light + 0.05)
    };

    const a = displayColor(base.hue, base.sat, base.light, 16);
    const b = displayColor(second.hue, second.sat, second.light, 20);
    const c = displayColor(third.hue, third.sat, third.light, 12);

    return {
      a: a.triplet,
      b: b.triplet,
      c: c.triplet,
      shadow: `${Math.round(a.hue)} ${Math.round(clamp(a.sat * 0.9, 30, 72))}% 24%`,
      theme: toHex(a.hue, clamp(a.sat / 100 * 0.72, 0.28, 0.6), 0.9)
    };
  }

  function paletteFromAccents(accents) {
    const list = (Array.isArray(accents) ? accents : [])
      .map(fromHex)
      .filter(Boolean)
      .map((rgb) => rgbToHsl(rgb[0], rgb[1], rgb[2]));

    const entries = list.length ? list : DEFAULT_ACCENTS.map(fromHex).map((rgb) => rgbToHsl(rgb[0], rgb[1], rgb[2]));
    while (entries.length < 3) {
      const base = entries[entries.length - 1] || entries[0];
      entries.push([base[0] + 24, base[1] * 0.8, base[2]]);
    }
    return buildPalette(entries.map(([hue, sat, light]) => ({ hue, sat, light })));
  }

  function sampleImage(image) {
    const width = SAMPLE_WIDTH;
    const naturalWidth = image.naturalWidth || image.width || width;
    const naturalHeight = image.naturalHeight || image.height || width;
    const height = Math.max(1, Math.round(width * (naturalHeight / naturalWidth)));

    if (!state.canvas) {
      state.canvas = document.createElement('canvas');
      state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    }
    const canvas = state.canvas;
    const ctx = state.ctx;
    if (!ctx) throw new Error('canvas sin contexto 2D');

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);
    const bins = Array.from({ length: 12 }, () => ({ weight: 0, hue: 0, sat: 0, light: 0 }));

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const [hue, saturation, lightness] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (lightness < MIN_LIGHTNESS || lightness > MAX_LIGHTNESS) continue;
      if (saturation < MIN_SATURATION) continue;

      const weight = saturation * (1 - Math.abs(lightness - 0.5) * 0.85);
      if (weight <= 0) continue;

      const bin = bins[clamp(Math.floor(hue / 30), 0, 11)];
      bin.weight += weight;
      bin.hue += hue * weight;
      bin.sat += saturation * weight;
      bin.light += lightness * weight;
    }

    const ranked = bins
      .filter((bin) => bin.weight > 0)
      .map((bin) => ({
        weight: bin.weight,
        hue: bin.hue / bin.weight,
        sat: bin.sat / bin.weight,
        light: bin.light / bin.weight
      }))
      .sort((left, right) => right.weight - left.weight);

    if (!ranked.length) return null;

    // Solo los colores con presencia real: un destello de dos píxeles no debe
    // decidir el tono del fondo.
    const threshold = ranked[0].weight * 0.16;
    const ranked2 = ranked.filter((entry) => entry.weight >= threshold);

    const chosen = [ranked2[0]];
    for (let i = 1; i < ranked2.length && chosen.length < 3; i += 1) {
      const hueGap = Math.min(...chosen.map((color) => {
        const delta = Math.abs(color.hue - ranked2[i].hue) % 360;
        return Math.min(delta, 360 - delta);
      }));
      if (hueGap >= 28) chosen.push(ranked2[i]);
    }

    return buildPalette(chosen);
  }

  /* ------------------------------------------------------------------------
     Pintura
     ------------------------------------------------------------------------ */
  function cacheLayers() {
    if (state.layers.length) return state.layers;
    state.layers = Array.from(document.querySelectorAll('[data-ambient-layer]'));
    return state.layers;
  }

  function paint(palette) {
    if (!palette) return;

    root.style.setProperty('--ambient-a', palette.a);
    root.style.setProperty('--ambient-b', palette.b);
    root.style.setProperty('--ambient-c', palette.c);
    root.style.setProperty('--ambient-shadow', palette.shadow);

    if (!state.themeMeta) {
      state.themeMeta = document.querySelector('meta[name="theme-color"]');
    }
    if (state.themeMeta) {
      state.themeMeta.setAttribute('content', palette.theme);
    }

    const layers = cacheLayers();
    if (!layers.length) return;

    const nextIndex = (state.activeLayer + 1) % layers.length;
    const next = layers[nextIndex];
    const previous = state.activeLayer >= 0 ? layers[state.activeLayer] : null;

    next.style.setProperty('--amb-1', palette.a);
    next.style.setProperty('--amb-2', palette.b);
    next.style.setProperty('--amb-3', palette.c);
    next.classList.add('is-on');
    if (previous && previous !== next) previous.classList.remove('is-on');

    state.activeLayer = nextIndex;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('imagen no disponible'));
      image.src = src;
    });
  }

  /* ------------------------------------------------------------------------
     API
     ------------------------------------------------------------------------ */
  function apply(src, accents) {
    const fallback = paletteFromAccents(accents);

    if (!src) {
      if (state.key === '__fallback__') return;
      state.key = '__fallback__';
      paint(fallback);
      return;
    }

    if (src === state.key) return;
    const key = src;
    state.key = key;

    const cached = cache.get(key);
    if (cached) {
      paint(cached);
      return;
    }

    loadImage(key)
      .then((image) => {
        const palette = sampleImage(image) || fallback;
        cache.set(key, palette);
        if (cache.size > MAX_CACHE) {
          const oldest = cache.keys().next().value;
          cache.delete(oldest);
        }
        if (state.key !== key) return;
        paint(palette);
      })
      .catch((error) => {
        if (state.key !== key) return;
        console.warn('CardGram · ambiente: se usa la paleta de la colección.', error);
        paint(fallback);
      });
  }

  window.CardGramAmbient = { apply, paletteFromAccents };
})();
