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
    mode: 'immersive',
    enabled: true,
    armed: false,
    shuffle: true,
    expanded: false,
    current: null,
    players: new Set(),
    fadeId: 0,
    loading: false,
    radio: null,
    sequenceIndex: 0,
    sceneIndex: 0,
    volume: 0.7
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.enabled === 'boolean') state.enabled = saved.enabled;
      if (saved.mode === 'chill' || saved.mode === 'immersive') state.mode = saved.mode;
      else if (saved.mode === 'all') state.mode = 'chill';
      else if (saved.mode === 'scene') state.mode = 'immersive';
      if (typeof saved.shuffle === 'boolean') state.shuffle = saved.shuffle;
      if (Number.isFinite(saved.volume)) state.volume = Math.min(1, Math.max(0, saved.volume));
    }
  } catch (error) {
    /* Sin preferencia guardada. */
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: state.enabled, mode: state.mode, shuffle: state.shuffle, volume: state.volume }));
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

    const modeHint = document.getElementById('music-mode-hint');
    if (modeHint) {
      modeHint.textContent = state.mode === 'chill'
        ? tr('music_mode_chill_hint', 'Reproducción aleatoria continua en toda la app.')
        : tr('music_mode_immersive_hint', 'La música cambia según la pantalla. En eCard Studio suena una pista aleatoria.');
    }

    const player = document.getElementById('music-player');
    if (player) player.hidden = state.mode !== 'chill';
    const explanation = document.getElementById('music-explanation');
    if (explanation) explanation.hidden = state.mode === 'chill';
    const tracksSection = document.getElementById('music-tracks-section');
    if (tracksSection) tracksSection.hidden = state.mode === 'immersive' || !state.expanded;
    const shuffle = document.querySelector('[data-music-shuffle]');
    if (shuffle) {
      shuffle.classList.toggle('active', state.shuffle);
      shuffle.setAttribute('aria-pressed', String(state.shuffle));
    }
    const expand = document.querySelector('[data-music-expand]');
    if (expand) {
      expand.setAttribute('aria-expanded', String(state.expanded));
      expand.textContent = state.expanded ? tr('music_collapse', 'Ocultar') : tr('music_expand', 'Ver todas');
    }

    const volume = document.getElementById('music-volume');
    if (volume) volume.value = String(Math.round(state.volume * 100));
    const volumeVal = document.getElementById('music-volume-val');
    if (volumeVal) volumeVal.textContent = `${Math.round(state.volume * 100)}%`;

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
      if (next) next.volume = Math.min(1, eased) * state.volume;
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
    if (state.mode === 'chill') {
      if (state.current && !state.current.radio && !force) return;
      if (state.shuffle) playRandomTrack();
      else playSequenceIndex(state.sequenceIndex);
      return;
    }
    if (scene === 'studio') {
      if (state.current && !state.current.radio && !force) return;
      playRandomTrack();
      return;
    }
    playSceneTrack(scene, 0, force);
  }

  function playRandomTrack() {
    const list = sequence();
    if (!list.length) return;
    const current = state.current ? state.current.src : null;
    const candidates = list.length > 1 ? list.filter((entry) => entry.src !== current) : list;
    const entry = candidates[Math.floor(Math.random() * candidates.length)];
    state.sequenceIndex = list.indexOf(entry);
    startTrack(entry.src, {
      scene: entry.scene,
      trackIndex: entry.index,
      loop: false,
      onEnded: () => (state.shuffle ? playRandomTrack() : playSequenceIndex((state.sequenceIndex + 1) % list.length))
    });
  }

  function nextChill(direction) {
    const list = sequence();
    if (!list.length) return;
    if (state.shuffle && direction > 0) {
      playRandomTrack();
      return;
    }
    const currentIndex = state.current
      ? list.findIndex((entry) => entry.src === state.current.src)
      : state.sequenceIndex;
    const nextIndex = (Math.max(0, currentIndex) + direction + list.length) % list.length;
    playSequenceIndex(nextIndex);
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
    state.mode = mode === 'chill' ? 'chill' : 'immersive';
    save();
    renderPanel();
    if (!state.enabled) return;
    state.armed = true;
    if (state.mode === 'chill') {
      if (state.shuffle) playRandomTrack();
      else playSequenceIndex(state.sequenceIndex);
    } else playScene(state.scene, true);
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
    if (next === 'studio' && state.scene !== 'studio') {
      state.scene = 'studio';
      save();
      if (state.enabled && state.armed) playScene('studio', true);
      renderPanel();
      return;
    }
    if (state.scene === next) {
      if (!state.current && state.armed && state.enabled) playScene(next, true);
      return;
    }
    state.scene = next;
    if (state.radio) return;
    if (state.mode === 'chill') return;
    playScene(next);
  }

  function start() {
    state.armed = true;
    if (state.enabled) playScene(state.scene, true);
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
      if (state.mode === 'chill') {
        state.sequenceIndex = sequence().findIndex((entry) => entry.src === tracksFor(scene)[index]);
        startTrack(tracksFor(scene)[index], {
          scene,
          trackIndex: index,
          loop: false,
          onEnded: () => (state.shuffle ? playRandomTrack() : playSequenceIndex((state.sequenceIndex + 1) % sequence().length))
        });
      } else {
        playSceneTrack(scene, index, true);
      }
      syncButtons();
      return;
    }
    if (target.closest('[data-music-prev]')) {
      nextChill(-1);
      renderPanel();
      return;
    }
    if (target.closest('[data-music-next]')) {
      nextChill(1);
      renderPanel();
      return;
    }
    if (target.closest('[data-music-shuffle]')) {
      state.shuffle = !state.shuffle;
      save();
      renderPanel();
      return;
    }
    if (target.closest('[data-music-expand]')) {
      state.expanded = !state.expanded;
      renderPanel();
      return;
    }
    const radio = target.closest('[data-music-radio]');
    if (radio) playRadio(radio.dataset.musicRadio);
  });

  const musicVolume = document.getElementById('music-volume');
  if (musicVolume) {
    musicVolume.addEventListener('input', () => {
      state.volume = Math.min(1, Math.max(0, Number(musicVolume.value) / 100));
      const volumeVal = document.getElementById('music-volume-val');
      if (volumeVal) volumeVal.textContent = `${Math.round(state.volume * 100)}%`;
      if (state.current) state.current.player.volume = state.volume;
      save();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const panel = document.getElementById('music-panel');
    if (panel && !panel.hidden) closePanel();
  });

  const musicPanel = document.getElementById('music-panel');
  if (musicPanel && musicPanel.parentElement !== document.body) {
    document.body.appendChild(musicPanel);
  }

  syncButtons();
  loadPlaylist();

  window.Music = {
    setScene,
    setEnabled,
    setMode,
    refresh: loadPlaylist,
    openPanel,
    closePanel,
    start,
    isEnabled: () => state.enabled,
    getVolume: () => state.volume,
    setVolume(value) {
      state.volume = Math.min(1, Math.max(0, Number(value)));
      if (state.current) state.current.player.volume = state.volume;
      renderPanel();
      save();
    }
  };
})();
