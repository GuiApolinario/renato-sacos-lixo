// scripts/cart.js — carrinho, bottom sheet e barra fixa de checkout
//
// Estado central do pedido (itens + frete). Expõe window.Cart para o checkout
// (scripts/checkout.js) ler os totais e para a vitrine adicionar itens.
//
// Decisões de UX (mobile-first):
//   • Adicionar item NÃO abre o carrinho no mobile: abrir um sheet por cima da
//     vitrine a cada toque atrapalha quem quer somar vários produtos. Em vez
//     disso a barra fixa embaixo atualiza na hora (contador + total), com o
//     badge pulando — feedback imediato sem tirar o cliente do lugar.
//   • O carrinho abre por vontade do cliente: barra fixa (mobile) ou ícone do
//     header (desktop).

window.Cart = (function () {
    'use strict';

    const PRICES = { 20: 28.00, 40: 32.00, 60: 38.00, 100: 48.00 };
    const MAX_QTY = 20;
    const STORAGE_KEY = 'renato-embalagens-cart';

    const items = new Map(); // litragem -> quantidade
    let freight = { status: 'idle', distanceKm: null, fee: 0 }; // idle|loading|free|paid|unknown

    // ===== Elementos =====
    const grid = document.getElementById('products-grid');
    const sheet = document.getElementById('cart-sheet');
    const backdrop = document.getElementById('sheet-backdrop');
    const closeBtn = document.getElementById('cart-close');
    const openBtnHeader = document.getElementById('cart-button');
    const cartCount = document.getElementById('cart-count');

    const listEl = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const subtotalEl = document.getElementById('cart-subtotal');
    const freightEl = document.getElementById('cart-freight');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('cart-checkout');

    const stickyBar = document.getElementById('sticky-cta');
    const stickyOpen = document.getElementById('sticky-cta-open');
    const stickyCount = document.getElementById('sticky-cta-count');
    const stickyTotal = document.getElementById('sticky-cta-total');
    const stickyGo = document.getElementById('sticky-cta-checkout');

    const listeners = [];

    // ===== Utilidades =====
    function formatBRL(v) { return `R$ ${v.toFixed(2).replace('.', ',')}`; }

    function vibrate(pattern) {
        if ('vibrate' in navigator) {
            try { navigator.vibrate(pattern); } catch (err) { /* navegador bloqueou */ }
        }
    }

    function subtotal() {
        let sum = 0;
        items.forEach((qty, size) => { sum += PRICES[size] * qty; });
        return sum;
    }

    function total() {
        return subtotal() + (freight.status === 'paid' ? freight.fee : 0);
    }

    function count() {
        let n = 0;
        items.forEach((qty) => { n += qty; });
        return n;
    }

    function freightLabel() {
        switch (freight.status) {
            case 'loading': return { text: 'calculando…', cls: 'freight-pending' };
            case 'free': return { text: `GRÁTIS (${freight.distanceKm.toFixed(1)} km)`, cls: 'freight-free' };
            case 'paid': return { text: `${formatBRL(freight.fee)} (${freight.distanceKm.toFixed(1)} km)`, cls: 'freight-paid' };
            case 'unknown': return { text: 'a combinar', cls: 'freight-unknown' };
            default: return { text: 'informe o CEP', cls: 'freight-pending' };
        }
    }

    // ===== Persistência =====
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items.entries())));
        } catch (err) { /* localStorage indisponível */ }
    }

    function restore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            JSON.parse(raw).forEach(([size, qty]) => {
                if (PRICES[size] && qty > 0) items.set(Number(size), Math.min(qty, MAX_QTY));
            });
        } catch (err) { /* rascunho inválido */ }
    }

    // ===== Abrir/fechar o carrinho =====
    function isOpen() { return sheet && !sheet.hidden && sheet.classList.contains('is-open'); }

    function open() {
        if (!sheet || isOpen()) return;
        sheet.hidden = false;
        backdrop.hidden = false;
        // força reflow para a transição rodar a partir do estado fechado
        // eslint-disable-next-line no-unused-expressions
        sheet.offsetHeight;
        sheet.classList.add('is-open');
        backdrop.classList.add('is-open');
        document.body.classList.add('no-scroll');
        if (openBtnHeader) openBtnHeader.setAttribute('aria-expanded', 'true');
        if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    function close() {
        if (!sheet || !isOpen()) return;
        sheet.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        document.body.classList.remove('no-scroll');
        if (openBtnHeader) openBtnHeader.setAttribute('aria-expanded', 'false');
        const done = () => { sheet.hidden = true; backdrop.hidden = true; };
        // espera a animação terminar (ou aplica direto se não houver)
        const ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480;
        setTimeout(done, ms);
    }

    // ===== Render =====
    function itemRow(size, qty) {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.dataset.size = String(size);
        row.innerHTML = `
            <div class="cart-item-info">
                <span class="cart-item-name">${size} Litros</span>
                <span class="cart-item-meta">30 un. · ${formatBRL(PRICES[size])} cada</span>
            </div>
            <div class="stepper" role="group" aria-label="Quantidade de ${size} litros no carrinho">
                <button type="button" class="stepper-btn" data-cart-step="-1" aria-label="Diminuir ${size} litros">−</button>
                <span class="stepper-value num">${qty}</span>
                <button type="button" class="stepper-btn" data-cart-step="1" aria-label="Aumentar ${size} litros">+</button>
            </div>
            <span class="cart-item-price num">${formatBRL(PRICES[size] * qty)}</span>
            <button type="button" class="cart-item-remove" data-cart-remove aria-label="Remover ${size} litros do carrinho">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
        `;
        return row;
    }

    let lastCount = 0;

    function render() {
        const n = count();
        const sub = subtotal();
        const tot = total();
        const isEmpty = items.size === 0;
        const fr = freightLabel();

        // Lista do carrinho
        if (listEl) {
            listEl.innerHTML = '';
            items.forEach((qty, size) => listEl.appendChild(itemRow(size, qty)));
        }
        if (emptyEl) emptyEl.hidden = !isEmpty;

        // Totais
        if (subtotalEl) subtotalEl.textContent = formatBRL(sub);
        if (totalEl) totalEl.textContent = formatBRL(tot);
        if (freightEl) { freightEl.textContent = fr.text; freightEl.className = fr.cls; }
        if (checkoutBtn) checkoutBtn.disabled = isEmpty;

        // Badge do header
        if (cartCount) {
            cartCount.hidden = n === 0;
            cartCount.textContent = String(n);
            if (n !== lastCount && n > 0) {
                cartCount.classList.remove('is-bump');
                // eslint-disable-next-line no-unused-expressions
                cartCount.offsetWidth;
                cartCount.classList.add('is-bump');
            }
        }

        // Barra fixa (mobile): só existe quando há itens
        if (stickyBar) {
            stickyBar.hidden = isEmpty;
            document.body.classList.toggle('has-sticky-cta', !isEmpty);
            if (stickyCount) stickyCount.textContent = String(n);
            if (stickyTotal) stickyTotal.textContent = formatBRL(tot);
        }

        lastCount = n;
        save();
        listeners.forEach((fn) => fn());
    }

    // ===== Operações =====
    function add(size, qty) {
        const current = items.get(size) || 0;
        items.set(size, Math.min(current + qty, MAX_QTY));
        render();
    }

    function setQty(size, qty) {
        if (qty <= 0) items.delete(size);
        else items.set(size, Math.min(qty, MAX_QTY));
        render();
    }

    function remove(size) { items.delete(size); render(); }

    function clear() {
        items.clear();
        freight = { status: 'idle', distanceKm: null, fee: 0 };
        render();
    }

    function setFreight(next) { freight = next; render(); }

    // ===== Vitrine: stepper local + Adicionar =====
    if (grid) {
        grid.addEventListener('click', (event) => {
            const card = event.target.closest('.product-card');
            if (!card) return;
            const qtyEl = card.querySelector('[data-qty]');

            const stepBtn = event.target.closest('[data-step]');
            if (stepBtn) {
                const delta = Number(stepBtn.dataset.step);
                const next = Math.max(1, Math.min(Number(qtyEl.textContent) + delta, MAX_QTY));
                qtyEl.textContent = String(next);
                vibrate(8);
                return;
            }

            const addBtn = event.target.closest('[data-add]');
            if (addBtn) {
                const size = Number(card.dataset.size);
                add(size, Number(qtyEl.textContent) || 1);
                qtyEl.textContent = '1';

                // Feedback imediato: pulo do botão + card + vibração
                addBtn.classList.remove('btn-pop');
                // eslint-disable-next-line no-unused-expressions
                addBtn.offsetWidth;
                addBtn.classList.add('btn-pop', 'is-added');
                const original = addBtn.textContent;
                addBtn.textContent = 'Adicionado ✓';
                card.classList.remove('just-added');
                // eslint-disable-next-line no-unused-expressions
                card.offsetWidth;
                card.classList.add('just-added');
                vibrate([12, 14, 12]);

                setTimeout(() => {
                    addBtn.textContent = original;
                    addBtn.classList.remove('is-added', 'btn-pop');
                }, 1300);
            }
        });
    }

    // ===== Controles dentro do carrinho =====
    if (listEl) {
        listEl.addEventListener('click', (event) => {
            const row = event.target.closest('.cart-item');
            if (!row) return;
            const size = Number(row.dataset.size);

            const step = event.target.closest('[data-cart-step]');
            if (step) {
                setQty(size, (items.get(size) || 0) + Number(step.dataset.cartStep));
                vibrate(8);
                return;
            }
            if (event.target.closest('[data-cart-remove]')) {
                remove(size);
                vibrate([8, 10]);
            }
        });
    }

    // ===== Aberturas/fechamentos =====
    if (openBtnHeader) openBtnHeader.addEventListener('click', () => (isOpen() ? close() : open()));
    if (stickyOpen) stickyOpen.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isOpen()) close();
    });

    // "Finalizar pedido" leva ao checkout (barra fixa e rodapé do carrinho)
    function goToCheckout() {
        close();
        const target = document.getElementById('checkout');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.Checkout && typeof window.Checkout.start === 'function') {
            window.Checkout.start();
        }
    }
    if (checkoutBtn) checkoutBtn.addEventListener('click', goToCheckout);
    if (stickyGo) stickyGo.addEventListener('click', goToCheckout);

    restore();
    render();

    return {
        PRICES,
        add, setQty, remove, clear,
        open, close,
        setFreight,
        getFreight: () => freight,
        entries: () => Array.from(items.entries()).map(([size, qty]) => ({
            size, quantity: qty, subtotal: PRICES[size] * qty,
        })),
        count, subtotal, total, formatBRL, vibrate,
        isEmpty: () => items.size === 0,
        onChange: (fn) => { listeners.push(fn); },
    };
})();
