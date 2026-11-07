/* ==========================================================================
   CardGram — Música de ambiente
   Crossfade suave entre la pista de Inicio y la de Mis cartas.
   Las pistas se declaran en assets/audio/playlist.json.
   ========================================================================== */
'use strict';

(function () {
  const STORAGE_KEY = 'cardgram.music.v1';
  const AUDIO_ROOT = 'assets/audio/';
  const FADE_MS = 1600;
  const TICK_MS = 40;

  const state = {
    playlist: null,
    scene: 'home',
    enabled: true,
    armed: false,
    current: null,
    players: new Set(),
    fadeId: 0,
    loading: false
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object' && typeof saved.enabled === 'boolean') {
      state.enabled = saved.enabled;
    }
  } catch (error) {
    /* Sin preferencia guardada. */
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: state.enabled }));
    } catch (error) {
      /* Almacenamiento no disponible. */
    }
  }

  function resolveTrack(track) {
    if (typeof track === 'string') {
      return /^https?:\/\/|^data:/.test(track) ? track : AUDIO_ROOT + track.replace(/^\/+/, '');
    }
    if (track && typeof track.src === 'string') {
      return resolveTrack(track.src);
    }
    return null;
  }

  function tracksFor(scene) {
    const list = state.playlist && state.playlist[scene];
    if (!Array.isArray(list)) return [];
    return list.map(resolveTrack).filter(Boolean);
  }

  function syncButtons() {
    document.querySelectorAll('[data-music-toggle]').forEach((button) => {
      button.classList.toggle('is-muted', !state.enabled);
      button.setAttribute('aria-pressed', String(state.enabled));
    });
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
        });
      }
    }

    const step = () => {
      if (fadeId !== state.fadeId) return;
      const progress = Math.min(1, (performance.now() - started) / FADE_MS);
      const eased = progress * progress * (3 - 2 * progress);
      if (next) next.volume = Math.min(1, eased);
      if (previous) previous.volume = Math.max(0, fromVolume * (1 - eased));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (previous) {
        previous.pause();
      }
    };
    requestAnimationFrame(step);
  }

  function stopMusic() {
    if (!state.current) return;
    const previous = state.current.player;
    state.current = null;
    fadeTo(null, previous);
  }

  function playScene() {
    if (!state.enabled) {
      stopMusic();
      return;
    }
    if (!state.armed) return;

    const tracks = tracksFor(state.scene);
    if (!tracks.length) {
      stopMusic();
      return;
    }
    if (state.current && state.current.scene === state.scene && !state.current.player.paused) {
      return;
    }

    const previous = state.current ? state.current.player : null;
    const player = new Audio();
    player.src = tracks[0];
    player.loop = true;
    player.preload = 'auto';
    player.volume = 0;
    state.players.add(player);

    state.current = { player, scene: state.scene };
    fadeTo(player, previous);
  }

  function loadPlaylist() {
    if (state.loading) return;
    state.loading = true;
    fetch(`${AUDIO_ROOT}playlist.json`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        state.playlist = data && typeof data === 'object' ? data : {};
        if (state.scene) playScene();
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
    if (state.enabled) playScene();
  }

  function unlockOnGesture() {
    if (state.armed) return;
    window.addEventListener('pointerdown', arm, { once: true, capture: true });
    window.addEventListener('keydown', arm, { once: true, capture: true });
  }

  function setScene(scene) {
    const next = scene === 'my-cards' ? 'my-cards' : 'home';
    if (state.scene === next) return;
    state.scene = next;
    playScene();
  }

  function setEnabled(value) {
    state.enabled = Boolean(value);
    save();
    syncButtons();
    if (state.enabled && !state.armed) arm();
    if (state.enabled) playScene();
    else stopMusic();
  }

  document.querySelectorAll('[data-music-toggle]').forEach((button) => {
    button.addEventListener('click', () => setEnabled(!state.enabled));
  });

  syncButtons();
  unlockOnGesture();
  loadPlaylist();

  window.Music = {
    setScene,
    setEnabled,
    refresh: loadPlaylist,
    isEnabled: () => state.enabled
  };
})();
