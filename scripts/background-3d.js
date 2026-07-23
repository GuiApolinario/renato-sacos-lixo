// scripts/background-3d.js — animação de fundo 3D (campo de partículas em profundidade)
//
// Renderiza, num <canvas> fixo atrás de todo o conteúdo, um campo de
// partículas distribuídas num volume 3D. As partículas se movem em direção
// à câmera (eixo Z), crescendo e ganhando nitidez conforme se aproximam —
// o clássico efeito "voando pelo espaço", que dá uma sensação real de
// profundidade sem depender de nenhuma biblioteca externa.
//
// Cuidados de produto:
// - Opacidade baixa e cores da marca: decora sem competir com o texto.
// - Projeção em perspectiva de verdade (foco/Z), não é só parallax 2D.
// - Leve: número de partículas reduzido no mobile, DPR limitado a 2,
//   pausa quando a aba fica em segundo plano.
// - Acessível: respeita prefers-reduced-motion (mostra um quadro estático).

(function () {
    'use strict';

    const canvas = document.getElementById('bg-canvas');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Paleta da marca (mais verdes, um toque de ouro pontual)
    const PALETTE = ['#10B981', '#0D3B3D', '#1A4F52', '#A7F3D0', '#D4AF37'];
    const GOLD_INDEX = 4;

    const FOCAL = 320;      // distância focal (perspectiva)
    const DEPTH = 900;      // profundidade máxima do volume
    const NEAR = 60;        // plano mais próximo (evita partículas gigantes)

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let rafId = null;

    function particleCount() {
        const area = window.innerWidth * window.innerHeight;
        // ~1 partícula a cada 22k px², limitada para não pesar
        const base = Math.round(area / 22000);
        const isSmall = window.innerWidth < 768;
        return Math.max(24, Math.min(base, isSmall ? 46 : 90));
    }

    function makeParticle(randomZ) {
        // x,y em torno da origem; z entre NEAR e DEPTH
        const spread = Math.max(width, height) * 1.1;
        return {
            x: (Math.random() - 0.5) * spread,
            y: (Math.random() - 0.5) * spread,
            z: randomZ ? NEAR + Math.random() * (DEPTH - NEAR) : DEPTH,
            radius: 6 + Math.random() * 16,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            speed: 0.4 + Math.random() * 0.9,
            driftX: (Math.random() - 0.5) * 0.25,
            driftY: (Math.random() - 0.5) * 0.25,
        };
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const target = particleCount();
        particles = [];
        for (let i = 0; i < target; i += 1) {
            particles.push(makeParticle(true));
        }
    }

    function drawParticle(p) {
        const scale = FOCAL / p.z;
        // Parallax de câmera: o mouse desloca sutilmente o ponto de fuga
        const camX = mouseX * 0.04;
        const camY = mouseY * 0.04;
        const sx = width / 2 + (p.x - camX * p.z * 0.06) * scale;
        const sy = height / 2 + (p.y - camY * p.z * 0.06) * scale;
        const r = p.radius * scale;

        if (sx < -r || sx > width + r || sy < -r || sy > height + r) return;

        // Alpha: fade-in quando distante, leve fade-out ao passar muito perto
        const depthFade = 1 - p.z / DEPTH;            // perto = mais forte
        const nearFade = Math.min(1, (p.z - NEAR) / 160); // some ao "atravessar"
        const isGold = p.color === PALETTE[GOLD_INDEX];
        const maxAlpha = isGold ? 0.35 : 0.5;
        const alpha = Math.max(0, Math.min(maxAlpha, depthFade * nearFade * maxAlpha));
        if (alpha <= 0.01) return;

        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        gradient.addColorStop(0, hexToRgba(p.color, alpha));
        gradient.addColorStop(0.6, hexToRgba(p.color, alpha * 0.35));
        gradient.addColorStop(1, hexToRgba(p.color, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function hexToRgba(hex, alpha) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function frame() {
        ctx.clearRect(0, 0, width, height);

        // suaviza o parallax do mouse
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            p.z -= p.speed;
            p.x += p.driftX;
            p.y += p.driftY;

            if (p.z <= NEAR) {
                particles[i] = makeParticle(false); // recicla lá no fundo
                continue;
            }
            drawParticle(p);
        }

        rafId = requestAnimationFrame(frame);
    }

    function renderStaticFrame() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(drawParticle);
    }

    function start() {
        if (rafId || prefersReducedMotion) return;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    // Parallax pelo movimento do mouse (apenas em ponteiros finos)
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        window.addEventListener('mousemove', (event) => {
            targetMouseX = event.clientX - window.innerWidth / 2;
            targetMouseY = event.clientY - window.innerHeight / 2;
        }, { passive: true });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            if (prefersReducedMotion) renderStaticFrame();
        }, 200);
    });

    // Economiza bateria/CPU quando a aba não está visível
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else start();
    });

    resize();
    if (prefersReducedMotion) {
        renderStaticFrame();
    } else {
        start();
    }
})();
