/* ==========================================================================
   CardGram — Bienvenida de nuevos usuarios
   Se muestra una sola vez (hasta que se abra de nuevo desde Sobre CardGram).
   ========================================================================== */
'use strict';

(function () {
  const overlay = document.getElementById('welcome-screen');
  if (!overlay) return;

  const card = overlay.querySelector('.welcome-card');
  const enter = document.getElementById('welcome-enter');
  const learn = document.getElementById('welcome-learn');
  const replay = document.getElementById('about-replay-welcome');
  const STORAGE_KEY = 'cardgram.welcome.v1';
  let leaving = false;

  function seen() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'seen';
    } catch (error) {
      return false;
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, 'seen');
    } catch (error) {
      /* Sin persistencia: se vuelve a mostrar en la próxima sesión. */
    }
  }

  function show() {
    if (!overlay.hidden && !leaving) return;
    leaving = false;
    overlay.hidden = false;
    overlay.classList.remove('is-leaving');
    document.body.classList.add('welcome-open');
    void overlay.offsetWidth;
    overlay.classList.add('is-on');
    if (card) card.focus({ preventScroll: true });
  }

  function hide(options = {}) {
    if (overlay.hidden || leaving) return;
    leaving = true;
    overlay.classList.add('is-leaving');
    overlay.classList.remove('is-on');
    document.body.classList.remove('welcome-open');
    const finish = () => {
      overlay.hidden = true;
      overlay.classList.remove('is-leaving');
      leaving = false;
    };
    if (options.mark !== false) markSeen();
    window.setTimeout(finish, 420);
  }

  enter?.addEventListener('click', () => {
    if (window.Sound) window.Sound.play('success');
    hide();
  });

  learn?.addEventListener('click', () => {
    if (window.Sound) window.Sound.play('nav');
    hide();
    try {
      location.hash = '#/about';
    } catch (error) {
      /* Navegación bloqueada en file:// */
    }
  });

  replay?.addEventListener('click', () => {
    if (window.Sound) window.Sound.play('open');
    show();
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  });

  overlay.querySelector('.welcome-backdrop')?.addEventListener('click', () => hide());

  if (!seen()) {
    show();
  }

  window.CardGramWelcome = { show, hide };
})();
