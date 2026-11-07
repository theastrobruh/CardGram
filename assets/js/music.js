/* ==========================================================================
   CardGram — Música de ambiente
   Una pista por pantalla, modo secuencia y radios lo-fi.
   Las pistas se declaran en assets/audio/playlist.json.
   ========================================================================== */
'use strict';

(function () {
  const STORAGE_KEY = 'cardgram.music.v1';
  const AUDIO_ROOT = 'assets/audio/';
  const FADE_MS = 1400;

  const SCENES = [
    { id: 'home', label: 'Home' },
    { id: 'packs', label: 'Packs' },
    { id: 'my-cards', label: 'My Cards' },
    { id: 'explore', label: 'Explore' },
    { id: 'studio', label: 'eCard Studio' }
  ];

  const tr = (key, fallback) => (typeof window.t === 'function' ? window.t(key) : fallback);

  const RADIOS = [
    { id: 'lofi', name: 'Lofi Radio', src: 'https://stream.laut.fm/lofi' },
    { id: 'chillhop', name: 'Chillhop Radio', src: 'https://stream.laut.fm/chillhop' }
  ];

  const state = {
    playlist: {},
    scene: 'home',
    mode: 'scene',
    enabled: true,
    armed: false,
    current: null,
    players: new Set(),
    fadeId: 0,
    loading: false,
    radio: null,
    sequenceIndex: 0,
    sceneIndex: 0
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.enabled === 'boolean') state.enabled = saved.enabled;
      if (saved.mode === 'all' || saved.mode === 'scene') state.mode = saved.mode;
    }
  } catch (error) {
    /* Sin preferencia guardada. */
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: state.enabled, mode: state.mode }));
    } catch (error) {
      /* Almacenamiento no disponible. */
    }
  }

  function resolveTrack(track) {
    if (typeof track === 'string') {
      return /^https?:\/\/|^data:/.test(track) ? track : AUDIO_ROOT + track.replace(/^\/+/, '');
    }
    if (track && typeof track.src === 'string') return resolveTrack(track.src);
    return null;
  }

  function tracksFor(scene) {
    const list = state.playlist && state.playlist[scene];
    return Array.isArray(list) ? list.map(resolveTrack).filter(Boolean) : [];
  }

  function trackName(src) {
    try {
      const clean = decodeURIComponent(src.split('/').pop() || src);
      return clean.replace(/\.[a-z0-9]+$/i, '').replace(/ ~$/, '');
    } catch (error) {
      return src;
    }
  }

  function sequence() {
    return SCENES.flatMap((scene) =>
      tracksFor(scene.id).map((src, index) => ({ scene: scene.id, src, index }))
    );
  }

  function syncButtons() {
    document.querySelectorAll('[data-music-open]').forEach((button) => {
      const playing = Boolean(state.enabled && state.current && !state.current.player.paused);
      button.classList.toggle('is-playing', playing);
      button.classList.toggle('is-muted', !state.enabled);
      button.setAttribute('aria-pressed', String(playing));
    });
    document.querySelectorAll('[data-music-toggle]').forEach((button) => {
      button.classList.toggle('is-muted', !state.enabled);
      button.setAttribute('aria-pressed', String(state.enabled));
      button.textContent = state.enabled ? tr('music_on', 'Música activa') : tr('music_off', 'Música apagada');
    });
  }

  function renderPanel() {
    const panel = document.getElementById('music-panel');
    if (!panel) return;

    document.querySelectorAll('[data-music-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.musicMode === state.mode);
    });

    const tracks = document.getElementById('music-tracks');
    if (tracks) {
      tracks.replaceChildren();
      SCENES.forEach((scene) => {
        tracksFor(scene.id).forEach((src, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          const active =
            state.current &&
            state.current.scene === scene.id &&
            state.current.trackIndex === index;
          button.className = `music-track${active ? ' active' : ''}`;
          button.dataset.musicTrack = scene.id;
          button.dataset.musicTrackIndex = String(index);
          button.innerHTML = `<span>${tr(`music_scene_${scene.id.replace('-', '_')}`, scene.label)}</span><small>${trackName(src)}</small>`;
          tracks.appendChild(button);
        });
      });
    }

    const radios = document.getElementById('music-radios');
    if (radios) {
      radios.replaceChildren();
      RADIOS.forEach((radio) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `music-radio${state.radio === radio.id ? ' active' : ''}`;
        button.dataset.musicRadio = radio.id;
        button.textContent = radio.name;
        radios.appendChild(button);
      });
    }

    const now = document.getElementById('music-now');
    if (now) {
      if (!state.enabled) now.textContent = tr('music_off', 'Música apagada');
      else if (state.radio) now.textContent = `${tr('music_radio', 'Radio')} · ${RADIOS.find((r) => r.id === state.radio)?.name || ''}`;
      else if (state.current) now.textContent = trackName(state.current.src);
      else now.textContent = '—';
    }
    syncButtons();
  }

  function fadeTo(next, previous) {
    const fadeId = ++state.fadeId;
    const started = performance.now();
    const fromVolume = previous ? previous.volume : 0;

    state.players.forEach((player) => {
      if (player !== next && player !== previous) {
        player.pause();
        player.volume = 0;
      }
    });

    if (next) {
      next.volume = 0;
      const playPromise = next.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          next.pause();
          if (state.current && state.current.player === next) state.current = null;
          renderPanel();
        });
      }
    }

    const step = () => {
      if (fadeId !== state.fadeId) return;
      const progress = Math.min(1, (performance.now() - started) / FADE_MS);
      const eased = progress * progress * (3 - 2 * progress);
      if (next) next.volume = Math.min(1, eased);
      if (previous) previous.volume = Math.max(0, fromVolume * (1 - eased));
      if (progress < 1) requestAnimationFrame(step);
      else if (previous) previous.pause();
    };
    requestAnimationFrame(step);
  }

  function startTrack(src, options = {}) {
    if (!src) return;
    const previous = state.current ? state.current.player : null;
    const player = new Audio();
    player.src = src;
    player.loop = Boolean(options.loop);
    player.preload = 'auto';
    player.volume = 0;
    state.players.add(player);
    state.current = {
      player,
      src,
      scene: options.scene || null,
      radio: options.radio || null,
      trackIndex: Number.isInteger(options.trackIndex) ? options.trackIndex : null
    };
    state.radio = options.radio || null;
    fadeTo(player, previous);
    renderPanel();

    if (options.onEnded) player.addEventListener('ended', options.onEnded);
    return player;
  }

  function playSceneTrack(scene, index = 0, force = false) {
    const tracks = tracksFor(scene);
    if (!tracks.length) {
      stopMusic();
      return;
    }
    const trackIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    if (
      !force &&
      state.current &&
      state.current.scene === scene &&
      state.current.trackIndex === trackIndex &&
      !state.current.player.paused
    ) {
      return;
    }
    state.sceneIndex = trackIndex;
    startTrack(tracks[trackIndex], {
      scene,
      trackIndex,
      loop: false,
      onEnded: () => playSceneTrack(scene, trackIndex + 1, true)
    });
  }

  function playScene(scene, force = false) {
    if (!state.enabled) return;
    if (!state.armed && !force) return;
    if (state.mode === 'all') {
      if (state.current && !state.current.radio && !force) return;
      const list = sequence();
      if (!list.length) return;
      const index = Math.max(0, list.findIndex((entry) => entry.scene === scene));
      state.sequenceIndex = index;
      playSequenceIndex(index);
      return;
    }

    playSceneTrack(scene, 0, force);
  }

  function playSequenceIndex(index) {
    const list = sequence();
    if (!list.length) return;
    const entry = list[index % list.length];
    state.sequenceIndex = index % list.length;
    startTrack(entry.src, {
      scene: entry.scene,
      trackIndex: entry.index,
      loop: false,
      onEnded: () => playSequenceIndex((state.sequenceIndex + 1) % list.length)
    });
  }

  function stopMusic() {
    if (!state.current) return;
    const previous = state.current.player;
    state.current = null;
    state.radio = null;
    fadeTo(null, previous);
    renderPanel();
  }

  function playRadio(id) {
    const radio = RADIOS.find((entry) => entry.id === id);
    if (!radio) return;
    state.armed = true;
    state.radio = id;
    startTrack(radio.src, { radio: id, loop: false, scene: null });
    renderPanel();
  }

  function setMode(mode) {
    state.mode = mode === 'all' ? 'all' : 'scene';
    save();
    renderPanel();
    if (state.enabled) playScene(state.scene, true);
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    save();
    syncButtons();
    renderPanel();
    if (!state.enabled) {
      stopMusic();
      return;
    }
    state.armed = true;
    playScene(state.scene, true);
  }

  function openPanel() {
    const panel = document.getElementById('music-panel');
    if (!panel) return;
    const settings = document.getElementById('hub-layout-panel');
    const settingsToggle = document.getElementById('hub-layout-toggle');
    if (settings) settings.hidden = true;
    if (settingsToggle) settingsToggle.setAttribute('aria-expanded', 'false');
    renderPanel();
    panel.hidden = false;
    document.body.classList.add('music-open');
  }

  function closePanel() {
    const panel = document.getElementById('music-panel');
    if (panel) panel.hidden = true;
    document.body.classList.remove('music-open');
  }

  function loadPlaylist() {
    if (state.loading) return;
    state.loading = true;
    fetch(`${AUDIO_ROOT}playlist.json`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        state.playlist = data && typeof data === 'object' ? data : {};
        renderPanel();
        if (state.scene) playScene(state.scene);
      })
      .catch(() => {
        state.playlist = {};
      })
      .finally(() => {
        state.loading = false;
      });
  }

  function arm() {
    if (state.armed) return;
    state.armed = true;
    if (state.enabled) playScene(state.scene);
  }

  function unlockOnGesture() {
    if (state.armed) return;
    window.addEventListener('pointerdown', arm, { once: true, capture: true });
    window.addEventListener('keydown', arm, { once: true, capture: true });
  }

  function setScene(scene) {
    const next = SCENES.some((entry) => entry.id === scene) ? scene : 'home';
    if (state.scene === next) return;
    state.scene = next;
    if (state.radio) return;
    if (state.mode === 'all') return;
    playScene(next);
  }

  document.querySelectorAll('[data-music-open]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openPanel();
    });
  });

  document.querySelectorAll('[data-music-toggle]').forEach((button) => {
    button.addEventListener('click', () => setEnabled(!state.enabled));
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-music-close]')) {
      closePanel();
      return;
    }
    const mode = target.closest('[data-music-mode]');
    if (mode) {
      setMode(mode.dataset.musicMode);
      return;
    }
    const track = target.closest('[data-music-track]');
    if (track) {
      const scene = track.dataset.musicTrack;
      const index = Number(track.dataset.musicTrackIndex) || 0;
      state.scene = scene;
      state.armed = true;
      if (!state.enabled) {
        state.enabled = true;
        save();
      }
      if (state.mode === 'all') {
        const list = sequence();
        const position = list.findIndex((entry) => entry.scene === scene && entry.index === index);
        playSequenceIndex(Math.max(0, position));
      } else {
        playSceneTrack(scene, index, true);
      }
      syncButtons();
      return;
    }
    const radio = target.closest('[data-music-radio]');
    if (radio) playRadio(radio.dataset.musicRadio);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const panel = document.getElementById('music-panel');
    if (panel && !panel.hidden) closePanel();
  });

  syncButtons();
  unlockOnGesture();
  loadPlaylist();

  window.Music = {
    setScene,
    setEnabled,
    setMode,
    refresh: loadPlaylist,
    openPanel,
    closePanel,
    isEnabled: () => state.enabled
  };
})();
