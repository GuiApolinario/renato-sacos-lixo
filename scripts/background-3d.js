// scripts/background-3d.js — animação de fundo 3D (pétalas verdes em profundidade)
//
// Renderiza, num <canvas> fixo atrás de todo o conteúdo, um campo de
// pétalas/folhas distribuídas num volume 3D. Elas se movem em direção à
// câmera (eixo Z, projeção em perspectiva real) girando suavemente sobre
// si mesmas e balançando de leve, como folhas boiando no ar — dá uma
// sensação de profundidade real sem depender de nenhuma biblioteca externa.
//
// Cuidados de produto:
// - Opacidade baixa e tons de verde da marca: decora sem competir com o texto.
// - Projeção em perspectiva de verdade (foco/Z), não é só parallax 2D.
// - Leve: número de pétalas reduzido no mobile, DPR limitado a 2,
//   pausa quando a aba fica em segundo plano.
// - Acessível: respeita prefers-reduced-motion (mostra um quadro estático).

(function () {
    'use strict';

    const canvas = document.getElementById('bg-canvas');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Tons de verde da marca (do petróleo escuro ao menta claro)
    const PALETTE = ['#10B981', '#059669', '#1A4F52', '#0D3B3D', '#A7F3D0'];

    const FOCAL = 320;      // distância focal (perspectiva)
    const DEPTH = 900;      // profundidade máxima do volume
    const NEAR = 60;        // plano mais próximo (evita pétalas gigantes)

    let width = 0;
    let height = 0;
    let dpr = 1;
    let petals = [];
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let rafId = null;
    let elapsed = 0;

    function petalCount() {
        const area = window.innerWidth * window.innerHeight;
        // ~1 pétala a cada 26k px², limitada para não pesar
        const base = Math.round(area / 26000);
        const isSmall = window.innerWidth < 768;
        return Math.max(20, Math.min(base, isSmall ? 38 : 76));
    }

    function makePetal(randomZ) {
        const spread = Math.max(width, height) * 1.1;
        return {
            x: (Math.random() - 0.5) * spread,
            y: (Math.random() - 0.5) * spread,
            z: randomZ ? NEAR + Math.random() * (DEPTH - NEAR) : DEPTH,
            size: 10 + Math.random() * 15,
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            speed: 0.35 + Math.random() * 0.8,
            driftX: (Math.random() - 0.5) * 0.2,
            driftY: (Math.random() - 0.5) * 0.15,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.012,
            swayAmp: 0.4 + Math.random() * 0.5,
            swayFreq: 0.4 + Math.random() * 0.6,
            swayPhase: Math.random() * Math.PI * 2,
            curl: 0.55 + Math.random() * 0.35, // o quanto a pétala é "gorda" (largura relativa)
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

        const target = petalCount();
        petals = [];
        for (let i = 0; i < target; i += 1) {
            petals.push(makePetal(true));
        }
    }

    // Desenha uma pétala/folha: duas curvas em ogiva se encontrando numa
    // ponta, com uma nervura central — lê como folha em qualquer tamanho.
    function drawPetal(p) {
        const scale = FOCAL / p.z;
        const camX = mouseX * 0.04;
        const camY = mouseY * 0.04;
        const sway = Math.sin(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp * scale * 14;
        const sx = width / 2 + (p.x - camX * p.z * 0.06) * scale + sway;
        const sy = height / 2 + (p.y - camY * p.z * 0.06) * scale;
        const r = p.size * scale;

        if (sx < -r * 2 || sx > width + r * 2 || sy < -r * 2 || sy > height + r * 2) return;

        const depthFade = 1 - p.z / DEPTH;
        const nearFade = Math.min(1, (p.z - NEAR) / 160);
        const maxAlpha = 0.55;
        const alpha = Math.max(0, Math.min(maxAlpha, depthFade * nearFade * maxAlpha));
        if (alpha <= 0.01) return;

        const width2 = r * p.curl;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rotation);
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(width2, -r * 0.4, width2, r * 0.4, 0, r);
        ctx.bezierCurveTo(-width2, r * 0.4, -width2, -r * 0.4, 0, -r);
        ctx.closePath();
        ctx.fill();

        // nervura central, sutil
        ctx.strokeStyle = hexToRgba(p.color, Math.min(0.9, alpha + 0.15));
        ctx.lineWidth = Math.max(0.6, r * 0.05);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.85);
        ctx.lineTo(0, r * 0.85);
        ctx.stroke();

        ctx.restore();
    }

    function hexToRgba(hex, alpha) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255;
        const g = (n >> 8) & 255;
        const b = n & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function frame(timestamp) {
        elapsed = timestamp / 1000;
        ctx.clearRect(0, 0, width, height);

        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        for (let i = 0; i < petals.length; i += 1) {
            const p = petals[i];
            p.z -= p.speed;
            p.x += p.driftX;
            p.y += p.driftY;
            p.rotation += p.rotationSpeed;

            if (p.z <= NEAR) {
                petals[i] = makePetal(false); // recicla lá no fundo
                continue;
            }
            drawPetal(p);
        }

        rafId = requestAnimationFrame(frame);
    }

    function renderStaticFrame() {
        ctx.clearRect(0, 0, width, height);
        petals.forEach(drawPetal);
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
