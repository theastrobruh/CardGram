/* ==========================================================================
   CardGram — Loading screen de bienvenida
   Precarga imágenes, presenta un carrusel y activa audio con Press Start.
   ========================================================================== */
'use strict';

(function () {
  const overlay = document.getElementById('boot-screen');
  if (!overlay) return;

  const start = document.getElementById('boot-start');
  const hint = document.getElementById('boot-hint');
  const progress = document.getElementById('boot-progress');
  const bar = document.getElementById('boot-bar');
  const bgA = document.getElementById('boot-bg-a');
  const bgB = document.getElementById('boot-bg-b');
  const realityTag = document.getElementById('boot-reality-tag');
  const fallback = [
    'assets/data/cards/database/Mew Tarot/00 - The Fool.webp',
    'assets/data/cards/database/Champion-Verse/S01_GOKU.webp',
    'assets/data/cards/database/Dungeons and History/DH_00_AZURA.webp',
    'assets/data/cards/database/YGO/FRONT_YGO_01.webp'
  ];
  const extra = [
    'assets/data/cards/database/_shared/BACK_CARDGRAM.webp',
    'assets/data/cards/database/templates/thumbs/E1.webp',
    'assets/data/cards/database/templates/thumbs/E2.webp',
    'assets/data/cards/database/templates/thumbs/E3.webp'
  ];

  let images = [];
  let carousel = [];
  let loaded = 0;
  let index = 0;
  let ready = false;
  let active = bgA;
  let carouselTimer = 0;

  function shopBackgroundForNow() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 'assets/data/shop_assets/dawn.webp';
    if (hour >= 9 && hour < 17) return 'assets/data/shop_assets/day.webp';
    if (hour >= 17 && hour < 20) return 'assets/data/shop_assets/afternoon.webp';
    return 'assets/data/shop_assets/night.webp';
  }

  function shuffled(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function setProgress() {
    const total = Math.max(1, images.length);
    const value = Math.min(100, Math.round((loaded / total) * 100));
    if (bar) bar.style.width = `${value}%`;
  }

  function updateRealityTag() {
    if (!realityTag) return;
    const total = Math.max(carousel.length, 1);
    const current = (index % total) + 1;
    realityTag.textContent = `REALITY ${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  }

  function showImage(src) {
    if (!src) return;
    const next = active === bgA ? bgB : bgA;
    /* Misma perspectiva, misma habitación: un empuje lento y constante. */
    next.style.backgroundImage = `url("${src}")`;
    next.style.setProperty('--kb-x', '0.9%');
    next.style.setProperty('--kb-y', '-0.9%');
    next.classList.remove('is-on');
    void next.offsetWidth;
    next.classList.add('is-on');
    active.classList.remove('is-on');
    active = next;
    updateRealityTag();

    overlay.classList.add('is-shifting');
    window.clearTimeout(showImage.shiftTimer);
    showImage.shiftTimer = window.setTimeout(() => {
      overlay.classList.remove('is-shifting');
    }, 1300);
  }

  function playCarousel() {
    if (carousel.length < 2) return;
    index = (index + 1) % carousel.length;
    showImage(carousel[index]);
  }

  function finish() {
    if (ready) return;
    ready = true;
    loaded = images.length;
    setProgress();
    if (progress) progress.hidden = true;
    if (hint) hint.textContent = 'Todo listo para comenzar';
    if (start) {
      start.hidden = false;
      start.focus({ preventScroll: true });
    }
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        loaded += 1;
        setProgress();
        resolve(src);
      };
      image.onerror = () => {
        loaded += 1;
        setProgress();
        resolve(null);
      };
      image.src = src;
    });
  }

  function begin() {
    if (ready) return;
    finish();
    if (progress) progress.hidden = true;
    hint.textContent = 'Todo listo para comenzar';
  }

  async function boot() {
    try {
      const response = await fetch('assets/data/loading/manifest.json', { cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      /* Mismo arte en desktop y responsivo: siempre las imágenes de escritorio. */
      const selected = data
        ? data.desktop || data.images || data.mobile || null
        : null;
      const custom = selected
        ? selected.filter((src) => typeof src === 'string')
        : [];
      /* Orden curado: el mismo salón visto desde realidades alternativas. */
      carousel.push(...(custom.length ? custom : fallback));
      images = carousel.concat(extra);
    } catch (error) {
      carousel = [...fallback, shopBackgroundForNow()];
      images = carousel.concat(extra);
    }

    const results = await Promise.all(images.map(loadImage));
    images = results.filter(Boolean);
    carousel = results.slice(0, carousel.length).filter(Boolean);
    if (carousel.length) {
      bgA.style.backgroundImage = `url("${carousel[0]}")`;
      bgA.style.setProperty('--kb-x', '0.9%');
      bgA.style.setProperty('--kb-y', '-0.9%');
      bgA.classList.add('is-on');
      active = bgA;
      index = 0;
      updateRealityTag();
      carouselTimer = window.setInterval(playCarousel, 7200);
    }
    finish();
  }

  start?.addEventListener('click', () => {
    start.disabled = true;
    overlay.classList.add('is-leaving');
    document.body.classList.remove('booting');
    if (window.Music && typeof window.Music.start === 'function') window.Music.start();
    if (window.Sound) window.Sound.play('success');
    window.setTimeout(() => {
      overlay.hidden = true;
      window.clearInterval(carouselTimer);
    }, 900);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !start.hidden && !start.disabled) {
      event.preventDefault();
      start.click();
    }
  });

  window.setTimeout(begin, 12000);
  boot().catch(begin);
})();
