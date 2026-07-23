// scripts/main.js — inicialização, navegação e header

(function () {
    'use strict';

    const header = document.getElementById('header');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const yearEl = document.getElementById('current-year');
    const whatsappFab = document.getElementById('whatsapp-fab');

    // Ano no rodapé
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // Header muda de aparência ao rolar
    function onScroll() {
        if (window.scrollY > 12) {
            header.classList.add('is-scrolled');
        } else {
            header.classList.remove('is-scrolled');
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Menu hamburger (mobile)
    function closeMenu() {
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
    }

    function toggleMenu() {
        const isOpen = navMenu.classList.toggle('is-open');
        hamburger.classList.toggle('is-active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
    }

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', toggleMenu);

        navMenu.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });
    }

    // Botão flutuante de WhatsApp: leva direto ao chat
    if (whatsappFab && window.WA) {
        whatsappFab.addEventListener('click', () => {
            window.WA.openChat('Olá! Gostaria de saber mais sobre os sacos de lixo reforçados.');
        });
    }
})();
