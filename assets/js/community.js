/* ==========================================================================
   CardGram — v0.4.4 · Comunidad (preparado, aún no activo)
   Punto único de integración para el futuro feed de cartas y decks creados
   por otras personas. El hub ya consume isEnabled() para mostrar la vista
   "Explorar" como próxima funcionalidad.

   Para activarlo más adelante:
   1. Publica un endpoint que devuelva { cards: [], decks: [], creators: [] }.
   2. Cambia enabled a true y define endpoint.
   3. Implementa fetchCards/fetchDecks/publishCard contra ese endpoint.
   ========================================================================== */
'use strict';

(function () {
  const CONFIG = {
    enabled: false,
    endpoint: null,
    features: {
      browseCards: false,
      browseDecks: false,
      creators: false,
      publish: false,
      likes: false
    }
  };

  const emptyFeed = () => ({ cards: [], decks: [], creators: [], cursor: null });

  window.CardGramCommunity = {
    config: CONFIG,

    isEnabled() {
      return Boolean(CONFIG.enabled && CONFIG.endpoint);
    },

    async fetchCards() {
      if (!this.isEnabled()) return emptyFeed();
      return emptyFeed();
    },

    async fetchDecks() {
      if (!this.isEnabled()) return emptyFeed();
      return emptyFeed();
    },

    async fetchCreator() {
      return null;
    },

    async publishCard() {
      return { ok: false, reason: 'disabled' };
    },

    async publishDeck() {
      return { ok: false, reason: 'disabled' };
    }
  };
})();
