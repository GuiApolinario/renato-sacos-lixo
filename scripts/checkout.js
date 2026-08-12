// scripts/checkout.js — wizard de 3 passos, frete por CEP e envio do pedido
//
// Passo 1 · Seus dados   → nome + WhatsApp (teclado numérico)
// Passo 2 · Entrega      → CEP (teclado numérico) → frete gamificado + endereço
// Passo 3 · Pagamento    → revisão, PIX, selos de confiança e envio
//
// Cada passo só libera o próximo quando os campos dele estão válidos, e o erro
// já aparece no campo (não numa mensagem genérica no fim da página).

(function () {
    'use strict';

    const PIX_KEY = '+5515997742737';
    const DRAFT_KEY = 'renato-embalagens-draft';

    const form = document.getElementById('checkout-form');
    const wizard = document.getElementById('wizard');
    if (!form || !wizard || !window.Cart) return;

    const panels = Array.from(wizard.querySelectorAll('.panel'));
    const steps = Array.from(wizard.querySelectorAll('.step'));
    const TOTAL_STEPS = panels.length;
    let current = 1;

    const cepInput = document.getElementById('cep');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    const neighborhoodInput = document.getElementById('neighborhood');

    const freightEl = document.getElementById('freight');
    const freightFill = document.getElementById('freight-fill');
    const freightUnlock = document.getElementById('freight-unlock');

    const reviewItems = document.getElementById('review-items');
    const reviewSubtotal = document.getElementById('review-subtotal');
    const reviewFreight = document.getElementById('review-freight');
    const reviewTotal = document.getElementById('review-total');
    const reviewEdit = document.getElementById('review-edit');

    const formError = document.getElementById('form-error');
    const btnSubmit = document.getElementById('btn-submit');
    const copyPixBtn = document.getElementById('copy-pix');
    const pixKeyEl = document.getElementById('pix-key');

    if (pixKeyEl) pixKeyEl.textContent = PIX_KEY;

    // ==========================================================
    // Navegação entre passos
    // ==========================================================
    function render() {
        panels.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.panel) === current));
        steps.forEach((s) => {
            const n = Number(s.dataset.step);
            s.classList.toggle('is-active', n === current);
            s.classList.toggle('is-done', n < current);
        });
    }

    function goTo(step, opts) {
        current = Math.max(1, Math.min(TOTAL_STEPS, step));
        render();
        if (opts && opts.scroll) {
            wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // foca o primeiro campo do passo (ajuda no mobile)
        const active = panels.find((p) => Number(p.dataset.panel) === current);
        const first = active && active.querySelector('input:not([type="radio"]):not([type="checkbox"])');
        if (first && opts && opts.focus) setTimeout(() => first.focus({ preventScroll: true }), 380);
    }

    wizard.addEventListener('click', (event) => {
        const next = event.target.closest('[data-next]');
        if (next) {
            if (validateStep(current)) goTo(Number(next.dataset.next), { scroll: true, focus: true });
            return;
        }
        const prev = event.target.closest('[data-prev]');
        if (prev) goTo(Number(prev.dataset.prev), { scroll: true });
    });

    steps.forEach((s) => {
        s.addEventListener('click', () => {
            const n = Number(s.dataset.step);
            if (n < current) goTo(n, { scroll: true });
        });
    });

    // ==========================================================
    // Validação
    // ==========================================================
    function setMsg(field, text, state) {
        const msg = form.querySelector(`.field-msg[data-for="${field.id}"]`);
        if (msg) {
            msg.textContent = text || '';
            msg.classList.toggle('is-valid', state === 'valid');
            msg.classList.toggle('is-pending', state === 'pending');
        }
        field.classList.toggle('is-invalid', state === 'invalid');
    }

    function validateName() {
        const el = document.getElementById('name');
        const ok = el.value.trim().length >= 3;
        setMsg(el, ok ? '✓ Tudo certo' : 'Digite seu nome completo.', ok ? 'valid' : 'invalid');
        return ok;
    }

    function validatePhone() {
        const digits = phoneInput.value.replace(/\D/g, '');
        const ok = digits.length === 10 || digits.length === 11;
        setMsg(phoneInput, ok ? '✓ Tudo certo' : 'Informe um WhatsApp com DDD.', ok ? 'valid' : 'invalid');
        return ok;
    }

    function validateCep() {
        const digits = cepInput.value.replace(/\D/g, '');
        const ok = digits.length === 8;
        if (!ok) setMsg(cepInput, 'Informe um CEP válido (8 dígitos).', 'invalid');
        return ok;
    }

    function validateRequired(el, message) {
        const ok = el.value.trim().length > 0;
        setMsg(el, ok ? '✓ Tudo certo' : message, ok ? 'valid' : 'invalid');
        return ok;
    }

    function validateStep(step) {
        let ok = true;
        let firstBad = null;

        function check(fn, el) {
            if (!fn()) { ok = false; if (!firstBad) firstBad = el; }
        }

        if (step === 1) {
            check(validateName, document.getElementById('name'));
            check(validatePhone, phoneInput);
        } else if (step === 2) {
            check(validateCep, cepInput);
            check(() => validateRequired(addressInput, 'Informe a rua e o número.'), addressInput);
            check(() => validateRequired(neighborhoodInput, 'Informe o bairro.'), neighborhoodInput);
        }

        if (firstBad) {
            firstBad.focus({ preventScroll: true });
            firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return ok;
    }

    // Valida ao sair do campo (sem incomodar enquanto digita)
    document.getElementById('name').addEventListener('blur', validateName);
    phoneInput.addEventListener('blur', validatePhone);
    addressInput.addEventListener('blur', () => validateRequired(addressInput, 'Informe a rua e o número.'));
    neighborhoodInput.addEventListener('blur', () => validateRequired(neighborhoodInput, 'Informe o bairro.'));

    // ==========================================================
    // Máscaras (teclado numérico no celular via inputmode="numeric")
    // ==========================================================
    phoneInput.addEventListener('input', () => {
        const d = phoneInput.value.replace(/\D/g, '').slice(0, 11);
        let out = d;
        if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length > 6) {
            const split = d.length > 10 ? 7 : 6;
            out = `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
        }
        phoneInput.value = out;
        saveDraft();
    });

    // ==========================================================
    // CEP → endereço + frete
    // ==========================================================
    let lastCep = '';

    function renderFreightBar() {
        const f = window.Cart.getFreight();
        if (!freightEl || !freightFill) return;

        if (f.status === 'idle') {
            freightEl.hidden = true;
            freightEl.classList.remove('is-loading', 'is-beyond');
            if (freightUnlock) freightUnlock.hidden = true;
            return;
        }

        freightEl.hidden = false;

        if (f.status === 'loading') {
            freightEl.classList.add('is-loading');
            freightEl.classList.remove('is-beyond');
            return;
        }
        freightEl.classList.remove('is-loading');

        if (f.status === 'unknown') {
            freightEl.hidden = true;
            if (freightUnlock) freightUnlock.hidden = true;
            return;
        }

        const VISUAL_RANGE = 25; // 15km (grátis) cai em 60% da barra
        freightFill.style.width = `${Math.min(100, (f.distanceKm / VISUAL_RANGE) * 100)}%`;
        const isFree = f.status === 'free';
        freightEl.classList.toggle('is-beyond', !isFree);
        if (freightUnlock) freightUnlock.hidden = !isFree;
    }

    async function resolveCep() {
        const digits = cepInput.value.replace(/\D/g, '');
        if (digits.length !== 8) {
            if (digits.length > 0) setMsg(cepInput, 'CEP incompleto.', 'invalid');
            return;
        }
        if (digits === lastCep) return;
        lastCep = digits;

        window.Cart.setFreight({ status: 'loading', distanceKm: null, fee: 0 });
        setMsg(cepInput, 'Buscando endereço e calculando frete…', 'pending');
        renderFreightBar();

        const result = await window.Shipping.calculate(cepInput.value);
        if (cepInput.value.replace(/\D/g, '') !== digits) return; // o cliente mudou o CEP

        window.Cart.setFreight(result);
        renderFreightBar();
        autofill(result.address);

        if (result.status === 'free') {
            setMsg(cepInput, `✓ ${result.city || 'Endereço'}/${result.state || ''} — frete grátis`, 'valid');
            window.Cart.vibrate([10, 15, 10]);
        } else if (result.status === 'paid') {
            setMsg(cepInput, `✓ ${result.city || 'Endereço'}/${result.state || ''} — ${result.distanceKm.toFixed(1)} km de Sorocaba`, 'valid');
        } else if (result.address && (result.address.street || result.address.city)) {
            setMsg(cepInput, `✓ ${result.city || 'Endereço encontrado'} — frete a combinar pelo WhatsApp`, 'pending');
        } else {
            setMsg(cepInput, 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.', 'invalid');
            lastCep = '';
        }
    }

    cepInput.addEventListener('input', () => {
        const d = cepInput.value.replace(/\D/g, '').slice(0, 8);
        cepInput.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
        saveDraft();

        if (d.length < 8) {
            lastCep = '';
            window.Cart.setFreight({ status: 'idle', distanceKm: null, fee: 0 });
            setMsg(cepInput, '', null);
            renderFreightBar();
        } else {
            resolveCep(); // dispara assim que completa — mais confiável que o blur no celular
        }
    });
    cepInput.addEventListener('blur', resolveCep);

    // Preenche rua/bairro sem sobrescrever o que o cliente digitou
    function autofill(address) {
        if (!address) return;
        if (address.street && (!addressInput.value.trim() || addressInput.dataset.auto === '1')) {
            addressInput.value = `${address.street}, `;
            addressInput.dataset.auto = '1';
        }
        if (address.neighborhood && (!neighborhoodInput.value.trim() || neighborhoodInput.dataset.auto === '1')) {
            neighborhoodInput.value = address.neighborhood;
            neighborhoodInput.dataset.auto = '1';
        }
        saveDraft();
    }
    [addressInput, neighborhoodInput].forEach((el) => {
        el.addEventListener('input', () => { delete el.dataset.auto; });
    });

    // ==========================================================
    // Revisão (passo 3) — reflete o carrinho em tempo real
    // ==========================================================
    function renderReview() {
        const n = window.Cart.count();
        const f = window.Cart.getFreight();
        if (reviewItems) reviewItems.textContent = n === 1 ? '1 pacote' : `${n} pacotes`;
        if (reviewSubtotal) reviewSubtotal.textContent = window.Cart.formatBRL(window.Cart.subtotal());
        if (reviewTotal) reviewTotal.textContent = window.Cart.formatBRL(window.Cart.total());
        if (reviewFreight) {
            const map = {
                free: ['GRÁTIS ✓', 'freight-free'],
                paid: [`${window.Cart.formatBRL(f.fee)} (${f.distanceKm ? f.distanceKm.toFixed(1) : '?'} km)`, 'freight-paid'],
                unknown: ['a combinar', 'freight-unknown'],
                loading: ['calculando…', 'freight-pending'],
                idle: ['informe o CEP', 'freight-pending'],
            };
            const [text, cls] = map[f.status] || map.idle;
            reviewFreight.textContent = text;
            reviewFreight.className = cls;
        }
    }
    window.Cart.onChange(renderReview);
    renderReview();

    if (reviewEdit) reviewEdit.addEventListener('click', () => window.Cart.open());

    // ==========================================================
    // PIX
    // ==========================================================
    if (copyPixBtn) {
        copyPixBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(PIX_KEY);
            } catch (err) {
                const helper = document.createElement('textarea');
                helper.value = PIX_KEY;
                helper.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(helper);
                helper.select();
                try { document.execCommand('copy'); } catch (e) { /* sem suporte */ }
                document.body.removeChild(helper);
            }
            copyPixBtn.textContent = 'Copiado ✓';
            copyPixBtn.classList.add('is-copied');
            setTimeout(() => {
                copyPixBtn.textContent = 'Copiar chave PIX';
                copyPixBtn.classList.remove('is-copied');
            }, 2000);
        });
    }

    // ==========================================================
    // Rascunho
    // ==========================================================
    function saveDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                name: form.name.value,
                phone: phoneInput.value,
                cep: cepInput.value,
                address: addressInput.value,
                neighborhood: neighborhoodInput.value,
                complement: form.complement.value,
                notes: form.notes.value,
            }));
        } catch (err) { /* indisponível */ }
    }

    function restoreDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);
            ['name', 'complement', 'notes'].forEach((k) => { if (d[k] && form[k]) form[k].value = d[k]; });
            if (d.phone) phoneInput.value = d.phone;
            if (d.address) addressInput.value = d.address;
            if (d.neighborhood) neighborhoodInput.value = d.neighborhood;
            if (d.cep) {
                cepInput.value = d.cep;
                if (d.cep.replace(/\D/g, '').length === 8) resolveCep();
            }
        } catch (err) { /* rascunho inválido */ }
    }

    form.addEventListener('input', saveDraft);

    // ==========================================================
    // Modal de sucesso
    // ==========================================================
    function showSuccess() {
        const modal = document.createElement('div');
        modal.className = 'success-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <h3>Pedido enviado com sucesso!</h3>
                <p>O Renato vai confirmar em breve pelo seu WhatsApp.</p>
                <button type="button" class="btn btn-action btn-block" id="modal-close">Fazer novo pedido</button>
            </div>
        `;
        document.body.appendChild(modal);

        function close() {
            modal.remove();
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') close(); }

        modal.querySelector('#modal-close').addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.addEventListener('keydown', onKey);
        modal.querySelector('#modal-close').focus({ preventScroll: true });
    }

    // ==========================================================
    // Envio
    // ==========================================================
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        formError.hidden = true;

        if (window.Cart.isEmpty()) {
            formError.textContent = 'Seu carrinho está vazio. Adicione um produto na vitrine.';
            formError.hidden = false;
            formError.classList.add('shake');
            setTimeout(() => formError.classList.remove('shake'), 400);
            return;
        }

        if (window.Cart.getFreight().status === 'loading') {
            formError.textContent = 'Só um instante — ainda estamos calculando o frete pelo seu CEP.';
            formError.hidden = false;
            return;
        }

        // Revalida os passos anteriores antes de enviar
        if (!validateStep(1)) { goTo(1, { scroll: true }); return; }
        if (!validateStep(2)) { goTo(2, { scroll: true }); return; }

        const freight = window.Cart.getFreight();
        const data = {
            name: form.name.value.trim(),
            phone: phoneInput.value.trim(),
            cep: cepInput.value.trim(),
            address: addressInput.value.trim(),
            neighborhood: neighborhoodInput.value.trim(),
            complement: form.complement.value.trim() || 'Nenhum',
            notes: form.notes.value.trim() || 'Nenhuma',
            alreadyPaid: form['already-paid'].checked,
            city: freight.city || '',
            state: freight.state || '',
        };

        btnSubmit.disabled = true;

        const message = window.WA.buildOrderMessage(
            data, window.Cart.entries(), window.Cart.subtotal(), freight, window.Cart.total()
        );
        window.WA.openChat(message);

        window.Cart.vibrate([10, 20, 10]);
        showSuccess();
        if (window.launchConfetti) window.launchConfetti();

        // Limpa tudo para o próximo pedido
        try { localStorage.removeItem(DRAFT_KEY); } catch (err) { /* ok */ }
        form.reset();
        window.Cart.clear();
        lastCep = '';
        cepInput.value = '';
        setMsg(cepInput, '', null);
        renderFreightBar();
        document.querySelectorAll('[data-qty]').forEach((el) => { el.textContent = '1'; });
        goTo(1);
        btnSubmit.disabled = false;
    });

    restoreDraft();
    render();

    // API usada pelo carrinho ("Finalizar pedido" leva ao passo 1)
    window.Checkout = {
        start: () => goTo(1),
        goTo: (n) => goTo(n),
    };
})();
