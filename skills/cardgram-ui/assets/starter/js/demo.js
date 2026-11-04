/* ==========================================================================
   CardGram UI — starter interactions
   Everything is progressive enhancement: the page still reads without JS.
   ========================================================================== */

(() => {
  'use strict';

  const body = document.body;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* Theme preview: index.html?theme=sunset|cyber|oled --------------------- */
  const theme = new URLSearchParams(location.search).get('theme');
  if (['sunset', 'cyber', 'oled'].includes(theme)) {
    document.documentElement.dataset.theme = theme;
  }

  /* Shell switching ------------------------------------------------------- */
  function setView(view) {
    body.dataset.view = view === 'studio' ? 'studio' : 'hub';
    if (body.dataset.view === 'hub') {
      closeDrawer();
      closeFab();
      window.scrollTo(0, 0);
      $('.hub-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
    }
    $('[data-shell="studio"]')?.setAttribute('aria-hidden', body.dataset.view !== 'studio');
    $('[data-shell="hub"]')?.setAttribute('aria-hidden', body.dataset.view !== 'hub');
  }

  $$('[data-view-link]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.viewLink));
  });

  /* Hub panels ------------------------------------------------------------ */
  function setPanel(panel) {
    const next = panel || 'home';
    $$('[data-panel]').forEach((section) => {
      const active = section.dataset.panel === next;
      section.hidden = !active;
      section.classList.toggle('active', active);
    });
    $$('.hub-nav-btn, .mobile-btn').forEach((button) => {
      const active = button.dataset.panelLink === next;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('.hub-scroll')?.scrollTo({ top: 0, behavior: 'auto' });
  }

  $$('[data-panel-link]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setPanel(button.dataset.panelLink);
    });
  });

  /* Studio tabs ----------------------------------------------------------- */
  function setTab(name) {
    const next = name || 'deck';
    $$('.tab-btn').forEach((button) => {
      const active = button.dataset.tab === next;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $$('.tab-pane').forEach((pane) => {
      const active = pane.id === `pane-${next}`;
      pane.hidden = !active;
      pane.classList.toggle('active', active);
    });
    $('.scroll-content')?.scrollTo({ top: 0, behavior: 'auto' });
  }

  $$('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
  });

  /* Tabs keyboard: left/right/up/down ------------------------------------ */
  $('.nav-tabs')?.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const tabs = $$('.tab-btn');
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    next.focus();
    setTab(next.dataset.tab);
  });

  /* Segmented controls ---------------------------------------------------- */
  $$('[data-seg]').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.seg-btn');
      if (!button || !group.contains(button)) return;
      $$('.seg-btn', group).forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        if (item.getAttribute('role') === 'tab') item.setAttribute('aria-selected', String(active));
      });
    });
  });

  /* Presets, scenes, backgrounds, swatches -------------------------------- */
  $$('.preset-strip').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.preset');
      if (!button) return;
      $$('.preset', group).forEach((item) => item.classList.toggle('active', item === button));
    });
  });

  $$('.scene-grid').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.scene-card');
      if (!button) return;
      $$('.scene-card', group).forEach((item) => item.classList.toggle('active', item === button));
    });
  });

  $$('.bg-grid').forEach((group) => {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('.bg-swatch');
      if (!button) return;
      $$('.bg-swatch', group).forEach((item) => item.classList.toggle('active', item === button));
      const preview = getComputedStyle($('.bg-preview', button)).backgroundImage;
      const stage = $('.stage');
      if (stage && preview && preview !== 'none') {
        stage.style.backgroundImage = preview;
      }
    });
  });

  document.addEventListener('click', (event) => {
    const dot = event.target.closest('.swatch-dot');
    if (!dot) return;
    $$('.swatch-dot').forEach((item) => {
      item.classList.toggle('is-active', item === dot);
      item.setAttribute('aria-pressed', String(item === dot));
    });
  });

  /* Ranges ---------------------------------------------------------------- */
  const formatters = {
    thickness: (v) => Number(v).toFixed(3),
    bevel: (v) => Number(v).toFixed(3),
    gloss: (v) => Number(v).toFixed(2),
    exposure: (v) => Number(v).toFixed(2),
    distance: (v) => Number(v).toFixed(1),
    scale: (v) => `${Math.round(Number(v))}%`
  };

  function updateRange(input) {
    const min = Number(input.min) || 0;
    const max = Number(input.max) || 100;
    const value = Number(input.value);
    const pct = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${Math.max(0, Math.min(100, pct))}%`);
    const output = $(`[data-output="${input.dataset.range}"]`);
    if (output) {
      output.textContent = (formatters[input.dataset.range] || ((v) => v))(value);
    }
    const stageCard = $('.stage .card-stage');
    if (stageCard && input.dataset.range === 'scale') {
      stageCard.style.width = `${68 * (value / 100)}%`;
    }
  }

  $$('input[type="range"]').forEach((input) => {
    updateRange(input);
    input.addEventListener('input', () => updateRange(input));
  });

  /* Card flip and pointer tilt ------------------------------------------- */
  $$('[data-flip]').forEach((button) => {
    button.addEventListener('click', () => {
      const flipped = button.classList.toggle('is-flipped');
      button.setAttribute('aria-pressed', String(flipped));
    });
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  $$('[data-tilt]').forEach((stage) => {
    stage.addEventListener('pointermove', (event) => {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--tilt-x', `${(-y * 12).toFixed(2)}deg`);
      stage.style.setProperty('--tilt-y', `${(x * 14).toFixed(2)}deg`);
    });
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--tilt-x', '0deg');
      stage.style.setProperty('--tilt-y', '0deg');
    });
  });

  /* Mobile drawer --------------------------------------------------------- */
  const drawerOpenBtn = $('[data-drawer-open]');
  const backdrop = $('.drawer-backdrop');

  function openDrawer() {
    body.classList.add('drawer-open');
    backdrop?.classList.add('active');
    drawerOpenBtn?.setAttribute('aria-expanded', 'true');
    $('.sidebar-toggle')?.focus();
  }

  function closeDrawer() {
    body.classList.remove('drawer-open');
    backdrop?.classList.remove('active');
    drawerOpenBtn?.setAttribute('aria-expanded', 'false');
  }

  drawerOpenBtn?.addEventListener('click', () => {
    if (body.classList.contains('drawer-open')) closeDrawer();
    else openDrawer();
  });
  backdrop?.addEventListener('click', closeDrawer);

  /* Radial FAB ------------------------------------------------------------ */
  const fabWrap = $('#fab-wrap');
  const fabButton = $('[data-fab]');

  function closeFab() {
    fabWrap?.classList.remove('open');
    fabButton?.setAttribute('aria-expanded', 'false');
  }

  fabButton?.addEventListener('click', () => {
    const open = fabWrap?.classList.toggle('open');
    fabButton.setAttribute('aria-expanded', String(Boolean(open)));
  });

  /* Toast ----------------------------------------------------------------- */
  const toast = $('#toast');
  const toastText = $('#toast-text');
  let toastTimer = 0;

  function showToast(message) {
    if (!toast) return;
    if (toastText) toastText.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  $('#btn-record')?.addEventListener('click', () => showToast('Demo: video export is disabled in the starter.'));
  $('#btn-snapshot')?.addEventListener('click', () => showToast('Demo: snapshot export is disabled in the starter.'));

  /* Escape closes overlays, never traps the user ------------------------- */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (body.classList.contains('drawer-open')) {
      closeDrawer();
      return;
    }
    if (fabWrap?.classList.contains('open')) {
      closeFab();
      fabButton?.focus();
      return;
    }
    if (toast?.classList.contains('show')) toast.classList.remove('show');
  });

  closeDrawer();
})();
