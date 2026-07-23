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

    // ===== Hero 3D: saco acompanha o cursor + parallax sutil no scroll =====
    const heroSection = document.getElementById('hero');
    const hero3d = document.querySelector('.hero-3d');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (heroSection && hero3d && !prefersReducedMotion && canHover) {
        let ticking = false;
        let targetRotX = 0;
        let targetRotY = 0;

        heroSection.addEventListener('mousemove', (event) => {
            const rect = heroSection.getBoundingClientRect();
            const relX = (event.clientX - rect.left) / rect.width - 0.5;
            const relY = (event.clientY - rect.top) / rect.height - 0.5;
            targetRotY = relX * 24;
            targetRotX = relY * -18;

            if (!ticking) {
                requestAnimationFrame(() => {
                    hero3d.style.setProperty('--tilt-x', `${targetRotX}deg`);
                    hero3d.style.setProperty('--tilt-y', `${targetRotY}deg`);
                    ticking = false;
                });
                ticking = true;
            }
        });

        heroSection.addEventListener('mouseleave', () => {
            hero3d.style.setProperty('--tilt-x', '0deg');
            hero3d.style.setProperty('--tilt-y', '0deg');
        });
    }

    if (heroSection && hero3d && !prefersReducedMotion) {
        let heroVisible = true;

        if ('IntersectionObserver' in window) {
            const heroObserver = new IntersectionObserver((entries) => {
                heroVisible = entries[0].isIntersecting;
            });
            heroObserver.observe(heroSection);
        }

        window.addEventListener('scroll', () => {
            if (!heroVisible) return;
            hero3d.style.setProperty('--parallax-y', `${window.scrollY * 0.12}px`);
        }, { passive: true });
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
