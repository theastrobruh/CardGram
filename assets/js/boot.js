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

  function showImage(src) {
    if (!src) return;
    const next = active === bgA ? bgB : bgA;
    next.style.backgroundImage = `url("${src}")`;
    next.classList.add('is-on');
    active.classList.remove('is-on');
    active = next;
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
        if (!index && !bgA.style.backgroundImage) {
          bgA.style.backgroundImage = `url("${src}")`;
          bgA.classList.add('is-on');
          active = bgA;
        }
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
      const desktop = window.matchMedia('(min-width: 981px)').matches;
      const selected = data && Array.isArray(desktop ? data.desktop : data.mobile)
        ? (desktop ? data.desktop : data.mobile)
        : null;
      const custom = selected
        ? selected.filter((src) => typeof src === 'string')
        : data && Array.isArray(data.images)
          ? data.images.filter((src) => typeof src === 'string')
          : [];
      carousel.push(shopBackgroundForNow());
      carousel.push(...shuffled(custom.length ? custom : fallback));
      images = carousel.concat(extra);
    } catch (error) {
      carousel = [shopBackgroundForNow(), ...shuffled(fallback)];
      images = carousel.concat(extra);
    }

    const results = await Promise.all(images.map(loadImage));
    images = results.filter(Boolean);
    carousel = results.slice(0, carousel.length).filter(Boolean);
    if (carousel.length) {
      showImage(carousel[0]);
      carouselTimer = window.setInterval(playCarousel, 4200);
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
