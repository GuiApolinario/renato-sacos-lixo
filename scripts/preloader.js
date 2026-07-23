// scripts/preloader.js — tela de carregamento com a marca (some assim que a página estiver pronta)

(function () {
    'use strict';

    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function hide() {
        if (prefersReducedMotion) {
            preloader.remove();
            return;
        }
        preloader.classList.add('is-hidden');
        preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
    }

    // Garante um mínimo de exibição (evita "piscar" em conexões muito rápidas)
    // e um teto máximo (nunca trava o site esperando algo que não carregou).
    const MIN_VISIBLE_MS = 500;
    const MAX_WAIT_MS = 4000;
    const shownAt = Date.now();

    function scheduleHide() {
        const elapsed = Date.now() - shownAt;
        const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(hide, remaining);
    }

    if (document.readyState === 'complete') {
        scheduleHide();
    } else {
        window.addEventListener('load', scheduleHide, { once: true });
    }

    // Rede de segurança: nunca deixa a tela de carregamento presa na tela.
    setTimeout(hide, MAX_WAIT_MS);
})();
