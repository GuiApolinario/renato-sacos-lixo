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
    //
    // O menu fechado fica em translateX(100%), ou seja, com a caixa fora da
    // tela à direita. Isso sozinho faz o navegador expandir a viewport de
    // layout e criar rolagem horizontal no celular (visibility:hidden não
    // resolve — só display:none tira o elemento do overflow). Por isso ele
    // nasce com .is-collapsed (display:none, só no mobile) e a classe sai um
    // quadro antes de animar, para a transição continuar acontecendo.
    let collapseTimer = null;

    function closeMenu() {
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
        clearTimeout(collapseTimer);
        collapseTimer = setTimeout(() => {
            if (!navMenu.classList.contains('is-open')) navMenu.classList.add('is-collapsed');
        }, 320);
    }

    function openMenu() {
        clearTimeout(collapseTimer);
        navMenu.classList.remove('is-collapsed');
        // força reflow para a transição sair do estado fechado
        // eslint-disable-next-line no-unused-expressions
        navMenu.offsetWidth;
        navMenu.classList.add('is-open');
        hamburger.classList.add('is-active');
        hamburger.setAttribute('aria-expanded', 'true');
    }

    function toggleMenu() {
        if (navMenu.classList.contains('is-open')) closeMenu();
        else openMenu();
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

    // Botões que abrem o WhatsApp.
    //
    // A checagem de window.WA fica DENTRO do clique, não aqui fora: como os
    // scripts usam defer (executam na ordem do documento), consultar window.WA
    // no carregamento fazia o listener nunca ser registrado se este arquivo
    // rodasse antes do whatsapp-integration.js — que foi exatamente o bug do
    // botão flutuante. Assim o botão funciona independente da ordem.
    const WA_FALLBACK = 'https://wa.me/5515997742737';

    function openWhatsApp(message) {
        if (window.WA && typeof window.WA.openChat === 'function') {
            window.WA.openChat(message);
            return;
        }
        // Reserva: se por algum motivo o módulo não carregou, ainda leva ao chat
        window.open(`${WA_FALLBACK}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    }

    document.querySelectorAll('[data-whatsapp]').forEach((btn) => {
        btn.addEventListener('click', () => {
            openWhatsApp(btn.dataset.whatsapp || 'Olá! Gostaria de falar sobre os sacos de lixo reforçados.');
        });
    });

    if (whatsappFab) {
        whatsappFab.addEventListener('click', () => {
            openWhatsApp('Olá, Renato! Gostaria de tirar uma dúvida sobre os sacos de lixo reforçados.');
        });
    }

    // ===== Filtros rápidos da vitrine (por uso) =====
    const filters = document.getElementById('filters');
    const productsGrid = document.getElementById('products-grid');
    const productsEmpty = document.getElementById('products-empty');

    function applyFilter(value) {
        if (!productsGrid) return;
        const cards = productsGrid.querySelectorAll('.product-card');
        let visible = 0;

        cards.forEach((card) => {
            const uses = (card.dataset.use || '').split(/\s+/);
            const show = value === 'all' || uses.includes(value);
            card.classList.toggle('is-hidden', !show);
            if (show) visible += 1;
        });

        if (productsEmpty) productsEmpty.hidden = visible > 0;
    }

    function selectChip(chip) {
        if (!filters) return;
        filters.querySelectorAll('.chip').forEach((c) => {
            const isActive = c === chip;
            c.classList.toggle('is-active', isActive);
            c.setAttribute('aria-selected', String(isActive));
        });
        applyFilter(chip.dataset.filter);
    }

    if (filters) {
        filters.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip');
            if (chip) selectChip(chip);
        });
    }

    // Botão "Ver todos" do estado vazio
    document.querySelectorAll('[data-filter-reset]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const allChip = filters && filters.querySelector('.chip[data-filter="all"]');
            if (allChip) selectChip(allChip);
        });
    });
})();
