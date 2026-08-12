// scripts/animations.js — animações de scroll (IntersectionObserver) e confete de sucesso

(function () {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== Reveal ao rolar a página =====
    const revealEls = document.querySelectorAll('.reveal');

    if (revealEls.length && 'IntersectionObserver' in window && !prefersReducedMotion) {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
        );

        revealEls.forEach((el) => observer.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    }

    // Nota: o tilt/parallax do Hero antes vivia aqui como transform CSS no
    // container. Agora o Hero usa uma cena Three.js de verdade
    // (scripts/hero-3d-scene.js), que já cuida da reação ao mouse e ao
    // scroll dentro do próprio espaço 3D — nada a fazer aqui. Se o WebGL
    // não estiver disponível, o fallback é a imagem estática (.hero-bag),
    // que só flutua via CSS (sem necessidade de JS).

    // ===== Confete discreto ao concluir o pedido =====
    const colors = ['#10B981', '#0D3B3D', '#D4AF37'];

    function launchConfetti() {
        if (prefersReducedMotion) return;

        for (let i = 0; i < 24; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}vw`;
            piece.style.backgroundColor = colors[i % colors.length];
            piece.style.animationDelay = `${Math.random() * 0.3}s`;
            document.body.appendChild(piece);
            setTimeout(() => piece.remove(), 2200);
        }
    }

    window.launchConfetti = launchConfetti;

    // ===== Micro-interações: rebote de mola ao clicar =====
    // Física simples (overshoot) para dar sensação tátil aos botões.
    // O botão "Adicionar" já ganha o pulo no próprio cart.js — aqui cuidamos
    // do resto da interface.
    const SPRING_SELECTOR = [
        '.btn-action', '.btn-outline', '.icon-btn', '.stepper-btn',
        '.cart-button', '.chip',
    ].join(', ');

    document.addEventListener('click', (event) => {
        if (prefersReducedMotion) return;
        const btn = event.target.closest(SPRING_SELECTOR);
        if (!btn || btn.hasAttribute('data-add')) return; // o Adicionar tem o seu

        btn.classList.remove('btn-pop');
        // força reflow para permitir reiniciar a animação em cliques seguidos
        // eslint-disable-next-line no-unused-expressions
        btn.offsetWidth;
        btn.classList.add('btn-pop');
        btn.addEventListener('animationend', () => btn.classList.remove('btn-pop'), { once: true });
    });

    // ===== Ripple no botão de envio =====
    document.querySelectorAll('.btn-submit').forEach((btn) => {
        btn.addEventListener('click', function (event) {
            if (prefersReducedMotion) return;
            const rect = btn.getBoundingClientRect();
            const ripple = document.createElement('span');
            const size = Math.max(rect.width, rect.height);
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
            btn.style.position = btn.style.position || 'relative';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 650);
        });
    });

    // ===== Estrelas de avaliação (só com dados reais) =====
    // Renderiza a nota apenas se o card trouxer data-rating/data-reviews.
    // Sem esses atributos nada aparece — avaliação inventada é propaganda
    // enganosa, então isso só entra no ar com número real do cliente.
    document.querySelectorAll('.product-card[data-rating]').forEach((card) => {
        const slot = card.querySelector('[data-rating-slot]');
        const rating = parseFloat(card.dataset.rating);
        const reviews = parseInt(card.dataset.reviews, 10);
        if (!slot || !Number.isFinite(rating)) return;

        const full = Math.round(rating);
        const stars = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
        const count = Number.isFinite(reviews) ? ` (${reviews})` : '';
        slot.innerHTML = `<span class="stars" aria-hidden="true">${stars}</span><span>${rating.toFixed(1).replace('.', ',')}${count}</span>`;
        slot.setAttribute('aria-label', `Nota ${rating.toFixed(1)} de 5${Number.isFinite(reviews) ? `, ${reviews} avaliações` : ''}`);
    });
})();
