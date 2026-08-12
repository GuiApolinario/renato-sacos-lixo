// scripts/background-scenes.js — fundos animados em Canvas 2D (sem WebGL)
//
// São dois cenários, desenhados por um único requestAnimationFrame:
//
//   1. FOLHAS (canvas fixo, atrás do site inteiro)
//      Folhas verdes flutuando num volume 3D de verdade (eixo Z + projeção em
//      perspectiva), com desfoque (bokeh) nas mais próximas e uma grade sutil
//      em perspectiva ao fundo. Reage ao movimento do mouse.
//
//   2. JARDIM NOTURNO (canvas próprio dentro do rodapé de contato)
//      Vaga-lumes piscando entre folhas caindo devagar. Cada elemento tem seu
//      Z, então os da frente são maiores, mais brilhantes e levemente
//      desfocados. Escolhido no lugar de um efeito de cometas: meteoro remete
//      a espaço, e a marca fala de natureza/verde — o jardim à noite combina
//      com as folhas do resto do site. O rodapé tem fundo escuro sólido, por
//      isso a cena mora num canvas dele (o canvas fixo do site ficaria atrás).
//
// Cuidados de produto:
//   • Opacidade calibrada: no tema claro as folhas são ~40% mais discretas que
//     no escuro, para nunca competirem com o texto.
//   • Leve: menos elementos no mobile, DPR limitado a 2, o rodapé só anima
//     quando está visível (IntersectionObserver) e tudo pausa em aba oculta.
//   • Acessível: prefers-reduced-motion → quadro estático, sem loop.

(function () {
    'use strict';

    const canvas = document.getElementById('bg-canvas');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isSmall = () => window.innerWidth < 768;

    const GREENS_LIGHT = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#047857'];
    const GREENS_DARK = ['#6EE7B7', '#34D399', '#10B981', '#A7F3D0', '#2DD4BF'];
    const greens = () => (darkQuery.matches ? GREENS_DARK : GREENS_LIGHT);
    const intensity = () => (darkQuery.matches ? 1.0 : 0.62);

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function rgba(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }

    const supportsFilter = (function () {
        try {
            const probe = document.createElement('canvas').getContext('2d');
            probe.filter = 'blur(2px)';
            return probe.filter === 'blur(2px)';
        } catch (err) { return false; }
    })();

    let width = 0;
    let height = 0;
    let dpr = 1;
    let elapsed = 0;
    let rafId = null;
    let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;

    // Desenha uma folha (duas curvas em ogiva + nervura central) já centrada
    // na origem do contexto. Usada pelo fundo do site e pelo rodapé.
    function paintLeaf(c, r, curl, color, alpha) {
        const w2 = r * curl;
        c.fillStyle = rgba(color, alpha);
        c.beginPath();
        c.moveTo(0, -r);
        c.bezierCurveTo(w2, -r * 0.4, w2, r * 0.4, 0, r);
        c.bezierCurveTo(-w2, r * 0.4, -w2, -r * 0.4, 0, -r);
        c.closePath();
        c.fill();
        c.strokeStyle = rgba(color, Math.min(0.85, alpha + 0.12));
        c.lineWidth = Math.max(0.6, r * 0.045);
        c.beginPath();
        c.moveTo(0, -r * 0.85);
        c.lineTo(0, r * 0.85);
        c.stroke();
    }

    // ==========================================================
    // CENA 1 — FOLHAS FLUTUANTES (site inteiro)
    // ==========================================================
    const leaves = (function () {
        const FOCAL = 320, DEPTH = 900, NEAR = 60;
        let items = [];

        function make(randomZ) {
            const spread = Math.max(width, height) * 1.15;
            return {
                x: (Math.random() - 0.5) * spread,
                y: (Math.random() - 0.5) * spread,
                z: randomZ ? NEAR + Math.random() * (DEPTH - NEAR) : DEPTH,
                // Folhas grandes: é o efeito principal do site
                size: 26 + Math.random() * 46,
                color: greens()[Math.floor(Math.random() * greens().length)],
                speed: 0.35 + Math.random() * 0.85,
                driftX: (Math.random() - 0.5) * 0.22,
                driftY: (Math.random() - 0.5) * 0.16,
                rot: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.013,
                swayAmp: 0.4 + Math.random() * 0.55,
                swayFreq: 0.4 + Math.random() * 0.6,
                swayPhase: Math.random() * Math.PI * 2,
                curl: 0.55 + Math.random() * 0.35,
            };
        }

        function init() {
            const area = window.innerWidth * window.innerHeight;
            // menos folhas que antes porque agora são bem maiores
            const n = clamp(Math.round(area / 46000), 12, isSmall() ? 16 : 34);
            items = [];
            for (let i = 0; i < n; i += 1) items.push(make(true));
        }

        function update() {
            for (let i = 0; i < items.length; i += 1) {
                const p = items[i];
                p.z -= p.speed;
                p.x += p.driftX;
                p.y += p.driftY;
                p.rot += p.rotSpeed;
                if (p.z <= NEAR) items[i] = make(false);
            }
        }

        function draw() {
            let blurred = 0;
            for (let i = 0; i < items.length; i += 1) {
                const p = items[i];
                const scale = FOCAL / p.z;
                const camX = mouseX * 40;
                const camY = mouseY * 40;
                const sway = Math.sin(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp * scale * 14;
                const sx = width / 2 + (p.x - camX * p.z * 0.0016) * scale + sway;
                const sy = height / 2 + (p.y - camY * p.z * 0.0016) * scale;
                const r = p.size * scale;
                if (sx < -r * 2 || sx > width + r * 2 || sy < -r * 2 || sy > height + r * 2) continue;

                const depthFade = 1 - p.z / DEPTH;
                const nearFade = Math.min(1, (p.z - NEAR) / 170);
                const maxA = 0.46 * intensity();
                const a = clamp(depthFade * nearFade * maxA, 0, maxA);
                if (a <= 0.01) continue;

                // Bokeh: folhas bem próximas saem desfocadas
                const wantBlur = supportsFilter && p.z < NEAR + 210 && blurred < 4;
                if (wantBlur) { ctx.filter = `blur(${(1 - (p.z - NEAR) / 210) * 5 + 1}px)`; blurred += 1; }

                ctx.save();
                ctx.translate(sx, sy);
                ctx.rotate(p.rot);
                paintLeaf(ctx, r, p.curl, p.color, a);
                ctx.restore();

                if (wantBlur) ctx.filter = 'none';
            }
        }

        return { init, update, draw };
    })();

    // ==========================================================
    // CENA 2 — JARDIM NOTURNO NO RODAPÉ (vaga-lumes + folhas caindo)
    // ==========================================================
    const nightGarden = (function () {
        const footerCanvas = document.getElementById('footer-canvas');
        const footer = footerCanvas ? footerCanvas.closest('footer') : null;
        if (!footerCanvas || !footerCanvas.getContext || !footer) return null;

        const fx = footerCanvas.getContext('2d');
        if (!fx) return null;

        const FOCAL = 460, NEAR = 150, FAR = 900;
        // Verde-amarelado de vaga-lume, com menta para variar
        const GLOW_COLORS = ['#D9F99D', '#BEF264', '#A7F3D0', '#86EFAC'];
        const LEAF_COLORS = ['#34D399', '#6EE7B7', '#10B981', '#A7F3D0'];

        let fw = 0, fh = 0;
        let flies = [];
        let falling = [];

        function makeFly() {
            const z = NEAR + Math.random() * (FAR - NEAR);
            return {
                baseX: (Math.random() - 0.5) * fw * 1.7,
                baseY: (Math.random() - 0.5) * fh * 1.7,
                z,
                // vagueio orgânico: soma de duas senoides por eixo
                ax1: 26 + Math.random() * 48, fx1: 0.11 + Math.random() * 0.2, px1: Math.random() * 6.28,
                ax2: 12 + Math.random() * 26, fx2: 0.3 + Math.random() * 0.4, px2: Math.random() * 6.28,
                ay1: 20 + Math.random() * 40, fy1: 0.09 + Math.random() * 0.18, py1: Math.random() * 6.28,
                ay2: 9 + Math.random() * 20, fy2: 0.26 + Math.random() * 0.38, py2: Math.random() * 6.28,
                driftX: (Math.random() - 0.5) * 0.32,
                driftY: -(0.08 + Math.random() * 0.22), // sobem devagar
                size: 2 + Math.random() * 2.8,
                color: GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)],
                // piscar: pulsos curtos, cada um no seu ritmo
                blinkFreq: 0.5 + Math.random() * 1.1,
                blinkPhase: Math.random() * 6.28,
            };
        }

        function makeLeaf(initial) {
            const z = NEAR + Math.random() * (FAR - NEAR);
            return {
                x: (Math.random() - 0.5) * fw * 1.7,
                y: initial ? (Math.random() - 0.5) * fh * 1.7 : -fh * 0.95 - Math.random() * fh * 0.5,
                z,
                vy: 0.5 + Math.random() * 1.1,
                vx: -(0.12 + Math.random() * 0.4),
                size: 16 + Math.random() * 26,
                rot: Math.random() * 6.28,
                rotSpeed: (Math.random() - 0.5) * 0.012,
                swayAmp: 10 + Math.random() * 22,
                swayFreq: 0.3 + Math.random() * 0.5,
                swayPhase: Math.random() * 6.28,
                curl: 0.55 + Math.random() * 0.35,
                color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
            };
        }

        function resize() {
            const rect = footer.getBoundingClientRect();
            fw = Math.max(1, Math.round(rect.width));
            fh = Math.max(1, Math.round(footer.offsetHeight));
            footerCanvas.width = Math.floor(fw * dpr);
            footerCanvas.height = Math.floor(fh * dpr);
            footerCanvas.style.width = fw + 'px';
            footerCanvas.style.height = fh + 'px';
            fx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const nf = isSmall() ? 16 : 30;
            flies = [];
            for (let i = 0; i < nf; i += 1) flies.push(makeFly());

            const nl = isSmall() ? 5 : 10;
            falling = [];
            for (let i = 0; i < nl; i += 1) falling.push(makeLeaf(true));
        }

        function update() {
            for (let i = 0; i < flies.length; i += 1) {
                const f = flies[i];
                f.baseX += f.driftX;
                f.baseY += f.driftY;
                // recicla quando sai do volume
                if (f.baseY < -fh * 1.1) f.baseY = fh * 1.1;
                if (f.baseX < -fw * 1.1) f.baseX = fw * 1.1;
                else if (f.baseX > fw * 1.1) f.baseX = -fw * 1.1;
            }
            for (let i = 0; i < falling.length; i += 1) {
                const l = falling[i];
                l.y += l.vy;
                l.x += l.vx;
                l.rot += l.rotSpeed;
                const scale = FOCAL / Math.max(50, l.z);
                if (fh / 2 + l.y * scale > fh + 120) falling[i] = makeLeaf(false);
            }
        }

        function draw() {
            fx.clearRect(0, 0, fw, fh);

            // --- Folhas caindo (atrás dos vaga-lumes) ---
            for (let i = 0; i < falling.length; i += 1) {
                const l = falling[i];
                const scale = FOCAL / Math.max(50, l.z);
                const sway = Math.sin(elapsed * l.swayFreq + l.swayPhase) * l.swayAmp;
                const sx = fw / 2 + (l.x + sway) * scale;
                const sy = fh / 2 + l.y * scale;
                const r = l.size * scale;
                if (sx < -r * 3 || sx > fw + r * 3 || sy < -r * 3 || sy > fh + r * 3) continue;

                const depth = clamp((l.z - NEAR) / (FAR - NEAR), 0, 1);
                const a = (1 - depth) * 0.2 + 0.05;
                fx.save();
                fx.translate(sx, sy);
                fx.rotate(l.rot);
                paintLeaf(fx, r, l.curl, l.color, a);
                fx.restore();
            }

            // --- Vaga-lumes ---
            const ordered = flies.slice().sort((a, b) => b.z - a.z);
            let blurred = 0;

            for (let i = 0; i < ordered.length; i += 1) {
                const f = ordered[i];
                const scale = FOCAL / Math.max(50, f.z);
                const wx = f.baseX +
                    Math.sin(elapsed * f.fx1 + f.px1) * f.ax1 +
                    Math.sin(elapsed * f.fx2 + f.px2) * f.ax2;
                const wy = f.baseY +
                    Math.cos(elapsed * f.fy1 + f.py1) * f.ay1 +
                    Math.cos(elapsed * f.fy2 + f.py2) * f.ay2;

                const sx = fw / 2 + wx * scale;
                const sy = fh / 2 + wy * scale;
                if (sx < -60 || sx > fw + 60 || sy < -60 || sy > fh + 60) continue;

                // Piscar de vaga-lume: pulsos suaves, mas com um piso de brilho
                // para que sempre haja vários acesos na tela (não um seno puro,
                // senão metade sumiria a cada instante).
                const pulse = Math.max(0, Math.sin(elapsed * f.blinkFreq + f.blinkPhase));
                const glowT = 0.3 + Math.pow(pulse, 1.6) * 0.7;

                const depth = clamp((f.z - NEAR) / (FAR - NEAR), 0, 1);
                const a = glowT * ((1 - depth) * 0.85 + 0.15);
                if (a <= 0.02) continue;

                const r = clamp(f.size * scale, 0.7, 5);

                // os mais próximos saem levemente desfocados (mesma linguagem do site)
                const wantBlur = supportsFilter && depth < 0.16 && blurred < 3;
                if (wantBlur) { fx.filter = 'blur(2.5px)'; blurred += 1; }

                // halo
                const halo = fx.createRadialGradient(sx, sy, 0, sx, sy, r * 6);
                halo.addColorStop(0, rgba(f.color, a * 0.85));
                halo.addColorStop(0.35, rgba(f.color, a * 0.28));
                halo.addColorStop(1, rgba(f.color, 0));
                fx.fillStyle = halo;
                fx.beginPath();
                fx.arc(sx, sy, r * 6, 0, Math.PI * 2);
                fx.fill();

                // corpo luminoso
                fx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a * 0.95)})`;
                fx.beginPath();
                fx.arc(sx, sy, r * 0.8, 0, Math.PI * 2);
                fx.fill();

                if (wantBlur) fx.filter = 'none';
            }
        }

        let visible = false;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((e) => { visible = e.isIntersecting; });
            }, { rootMargin: '120px' }).observe(footer);
        } else {
            visible = true;
        }

        if ('ResizeObserver' in window) {
            let rt = null;
            new ResizeObserver(() => {
                clearTimeout(rt);
                rt = setTimeout(() => { resize(); if (prefersReducedMotion) draw(); }, 150);
            }).observe(footer);
        }

        return {
            resize,
            update: () => { if (visible) update(); },
            draw: () => { if (visible) draw(); },
            forceDraw: draw,
        };
    })();

    // ==========================================================
    // LOOP
    // ==========================================================
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        leaves.init();
        if (nightGarden) nightGarden.resize();
    }

    function frame(timestamp) {
        elapsed = timestamp / 1000;
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        ctx.clearRect(0, 0, width, height);
        leaves.update();
        leaves.draw();

        if (nightGarden) { nightGarden.update(); nightGarden.draw(); }

        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (rafId || prefersReducedMotion) return;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        leaves.draw();
        if (nightGarden) nightGarden.forceDraw();
    }

    if (finePointer) {
        window.addEventListener('mousemove', (event) => {
            targetMouseX = event.clientX / window.innerWidth - 0.5;
            targetMouseY = event.clientY / window.innerHeight - 0.5;
        }, { passive: true });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            if (prefersReducedMotion) drawStatic();
        }, 200);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
    });

    resize();
    if (prefersReducedMotion) drawStatic();
    else start();
})();
