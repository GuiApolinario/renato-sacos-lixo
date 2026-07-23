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

    // ===== Ripple effect no CTA e no botão de envio =====
    document.querySelectorAll('.cta-primary, .btn-submit').forEach((btn) => {
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
})();
