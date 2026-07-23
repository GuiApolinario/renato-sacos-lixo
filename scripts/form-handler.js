// scripts/form-handler.js — carrinho, validação e envio do pedido

(function () {
    'use strict';

    const PRICES = { 20: 28.00, 40: 32.00, 60: 38.00, 100: 48.00 };
    const PIX_KEY = '+5515997742737';
    const STORAGE_KEY = 'renato-sacos-checkout-draft';

    const cart = new Map(); // size -> quantity
    let shipping = { status: 'idle', distanceKm: null, fee: 0 }; // idle | loading | free | paid | unknown

    const form = document.getElementById('checkout-form');
    const productsGrid = document.getElementById('products-grid');
    const summaryItemsEl = document.getElementById('summary-items');
    const totalPriceEl = document.getElementById('total-price');
    const shippingValueEl = document.getElementById('shipping-value');
    const summaryToggleTotalEl = document.getElementById('summary-toggle-total');
    const summaryToggleCountEl = document.getElementById('summary-toggle-count');
    const orderSummary = document.getElementById('order-summary');
    const summaryToggle = document.getElementById('summary-toggle');
    const summaryToggleCta = summaryToggle ? summaryToggle.querySelector('.summary-toggle-cta') : null;
    const summaryCta = document.getElementById('summary-cta');
    const formError = document.getElementById('form-error');
    const btnSubmit = document.getElementById('btn-submit');
    const pixKeyEl = document.getElementById('pix-key');
    const copyPixBtn = document.getElementById('copy-pix');
    const cepInput = document.getElementById('cep');
    const cepFeedback = document.getElementById('cep-feedback');

    if (pixKeyEl) pixKeyEl.textContent = PIX_KEY;

    function formatBRL(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    function vibrate(pattern) {
        if ('vibrate' in navigator) navigator.vibrate(pattern);
    }

    function calcSubtotal() {
        let total = 0;
        cart.forEach((qty, size) => {
            total += PRICES[size] * qty;
        });
        return total;
    }

    function calcTotal() {
        const freightFee = shipping.status === 'paid' ? shipping.fee : 0;
        return calcSubtotal() + freightFee;
    }

    function renderShippingLine() {
        if (!shippingValueEl) return;
        shippingValueEl.classList.remove('shipping-value--pending', 'shipping-value--paid', 'shipping-value--unknown');

        switch (shipping.status) {
            case 'loading':
                shippingValueEl.textContent = 'calculando…';
                shippingValueEl.classList.add('shipping-value--pending');
                break;
            case 'free':
                shippingValueEl.textContent = `GRÁTIS ✓ (~${shipping.distanceKm.toFixed(1)} km)`;
                break;
            case 'paid':
                shippingValueEl.textContent = `${formatBRL(shipping.fee)} (~${shipping.distanceKm.toFixed(1)} km)`;
                shippingValueEl.classList.add('shipping-value--paid');
                break;
            case 'unknown':
                shippingValueEl.textContent = 'a combinar com o Renato';
                shippingValueEl.classList.add('shipping-value--unknown');
                break;
            default:
                shippingValueEl.textContent = 'informe o CEP';
                shippingValueEl.classList.add('shipping-value--pending');
        }
    }

    function updateSummary() {
        const subtotal = calcSubtotal();
        const total = calcTotal();

        if (cart.size === 0) {
            summaryItemsEl.innerHTML = '<p class="summary-empty">Nenhum item selecionado ainda.</p>';
        } else {
            summaryItemsEl.innerHTML = '';
            cart.forEach((qty, size) => {
                const itemSubtotal = PRICES[size] * qty;
                const item = document.createElement('div');
                item.className = 'summary-item';
                item.innerHTML = `
                    <span>${qty}x Saco ${size}L (30 un.)</span>
                    <span class="summary-item-price">${formatBRL(itemSubtotal)}</span>
                `;
                summaryItemsEl.appendChild(item);
            });
        }

        renderShippingLine();
        totalPriceEl.textContent = formatBRL(total);
        summaryToggleTotalEl.textContent = formatBRL(total);

        const itemCount = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);
        if (summaryToggleCountEl) {
            summaryToggleCountEl.hidden = itemCount === 0;
            summaryToggleCountEl.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`;
        }

        return { subtotal, total };
    }

    // ===== CEP: máscara + cálculo de frete por distância =====
    function formatCep(value) {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    }

    // Guarda o último CEP já consultado para não repetir a mesma busca.
    let lastResolvedCep = '';

    async function resolveCep() {
        const digits = cepInput.value.replace(/\D/g, '');
        if (digits.length !== 8) {
            if (digits.length > 0 && cepFeedback) {
                cepFeedback.textContent = 'CEP incompleto';
                cepFeedback.classList.remove('is-valid', 'is-pending');
            }
            return;
        }

        if (digits === lastResolvedCep) return; // já resolvido, evita busca dupla
        lastResolvedCep = digits;

        shipping = { status: 'loading', distanceKm: null, fee: 0 };
        if (cepFeedback) {
            cepFeedback.textContent = 'Buscando endereço e calculando frete…';
            cepFeedback.classList.add('is-pending');
            cepFeedback.classList.remove('is-valid');
        }
        updateSummary();

        const result = await window.Shipping.calculate(cepInput.value);
        // Ignora a resposta se o usuário já mudou o CEP enquanto buscava
        if (cepInput.value.replace(/\D/g, '') !== digits) return;

        shipping = result;
        updateSummary();
        autofillAddress(result.address);

        if (cepFeedback) {
            cepFeedback.classList.remove('is-pending');
            if (result.status === 'free') {
                cepFeedback.textContent = `✓ ${result.city || 'Endereço'}/${result.state || ''} — frete grátis`;
                cepFeedback.classList.add('is-valid');
            } else if (result.status === 'paid') {
                cepFeedback.textContent = `✓ ${result.city || 'Endereço'}/${result.state || ''} — ${result.distanceKm.toFixed(1)} km do centro de distribuição`;
                cepFeedback.classList.add('is-valid');
            } else if (result.address && (result.address.street || result.address.city)) {
                // Endereço veio, mas sem coordenadas para o frete
                cepFeedback.textContent = `✓ ${result.city || 'Endereço encontrado'}/${result.state || ''} — frete a combinar pelo WhatsApp`;
                cepFeedback.classList.remove('is-valid');
            } else {
                cepFeedback.textContent = 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.';
                cepFeedback.classList.remove('is-valid');
                lastResolvedCep = ''; // permite tentar de novo
            }
        }
    }

    if (cepInput) {
        cepInput.addEventListener('input', () => {
            cepInput.value = formatCep(cepInput.value);
            const digits = cepInput.value.replace(/\D/g, '');

            if (digits.length < 8) {
                lastResolvedCep = '';
                shipping = { status: 'idle', distanceKm: null, fee: 0 };
                if (cepFeedback) {
                    cepFeedback.textContent = '';
                    cepFeedback.classList.remove('is-valid', 'is-pending');
                }
                updateSummary();
            } else if (digits.length === 8) {
                // Dispara assim que o CEP completa — mais confiável no celular
                // do que depender do blur.
                resolveCep();
            }
        });

        cepInput.addEventListener('blur', resolveCep);
    }

    // Preenche rua e bairro a partir do endereço retornado pelo CEP.
    // Só escreve em campos vazios ou que nós mesmos preenchemos antes — nunca
    // sobrescreve o que o cliente digitou manualmente. Na rua, deixa a vírgula
    // pronta para o cliente só completar o número.
    const addressField = document.getElementById('address');
    const neighborhoodField = document.getElementById('neighborhood');

    function autofillAddress(address) {
        if (!address) return;

        if (address.street && addressField &&
            (!addressField.value.trim() || addressField.dataset.autofilled === 'true')) {
            addressField.value = `${address.street}, `;
            addressField.dataset.autofilled = 'true';
            validateField(addressField);
        }

        if (address.neighborhood && neighborhoodField &&
            (!neighborhoodField.value.trim() || neighborhoodField.dataset.autofilled === 'true')) {
            neighborhoodField.value = address.neighborhood;
            neighborhoodField.dataset.autofilled = 'true';
            validateField(neighborhoodField);
        }

        saveDraft();
    }

    // Assim que o cliente edita manualmente, paramos de considerar o campo
    // como preenchido automaticamente (não será mais sobrescrito por outro CEP).
    [addressField, neighborhoodField].forEach((field) => {
        if (field) {
            field.addEventListener('input', () => { delete field.dataset.autofilled; });
        }
    });

    // ===== Seletores de quantidade nos cards de produto =====
    if (productsGrid) {
        productsGrid.addEventListener('click', (event) => {
            const btn = event.target.closest('.qty-btn');
            if (!btn) return;

            const card = btn.closest('.product-card');
            const size = Number(card.dataset.size);
            const qtyValueEl = card.querySelector('.qty-value');
            let qty = cart.get(size) || 0;

            if (btn.classList.contains('qty-plus')) {
                qty = Math.min(qty + 1, 20);
                vibrate(10);
            } else if (btn.classList.contains('qty-minus')) {
                qty = Math.max(qty - 1, 0);
                vibrate(10);
            }

            if (qty > 0) {
                cart.set(size, qty);
            } else {
                cart.delete(size);
            }

            qtyValueEl.textContent = qty;
            card.classList.toggle('is-selected', qty > 0);
            card.querySelector('.product-badge').hidden = qty === 0;

            updateSummary();
        });
    }

    // ===== Resumo do pedido: barra fixa expansível =====
    if (summaryToggle && orderSummary) {
        summaryToggle.addEventListener('click', () => {
            const isOpen = orderSummary.classList.toggle('is-open');
            summaryToggle.setAttribute('aria-expanded', String(isOpen));
            if (summaryToggleCta) {
                summaryToggleCta.textContent = isOpen ? 'Fechar ✕' : 'Ver resumo ↑';
            }
        });
    }

    if (summaryCta) {
        summaryCta.addEventListener('click', () => {
            orderSummary.classList.remove('is-open');
            summaryToggle.setAttribute('aria-expanded', 'false');
            if (summaryToggleCta) summaryToggleCta.textContent = 'Ver resumo ↑';
            const nameField = document.getElementById('name');
            if (nameField) {
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(() => nameField.focus({ preventScroll: true }), 400);
            }
        });
    }

    // ===== Copiar chave PIX =====
    if (copyPixBtn) {
        copyPixBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(PIX_KEY);
            } catch (err) {
                // Fallback para navegadores sem Clipboard API
                const helper = document.createElement('textarea');
                helper.value = PIX_KEY;
                helper.style.position = 'fixed';
                helper.style.opacity = '0';
                document.body.appendChild(helper);
                helper.select();
                document.execCommand('copy');
                document.body.removeChild(helper);
            }

            copyPixBtn.textContent = 'Chave copiada ✓';
            copyPixBtn.classList.add('is-copied');
            setTimeout(() => {
                copyPixBtn.textContent = 'Copiar chave PIX';
                copyPixBtn.classList.remove('is-copied');
            }, 2000);
        });
    }

    // ===== Validação de campos =====
    const requiredFields = ['name', 'address', 'neighborhood'];

    function validateField(field) {
        const feedback = form.querySelector(`.field-feedback[data-for="${field.id}"]`);
        const isValid = field.value.trim().length > 0;

        if (feedback) {
            feedback.textContent = isValid ? '✓ Válido' : '';
            feedback.classList.toggle('is-valid', isValid);
        }
        field.classList.toggle('is-invalid', !isValid);
        return isValid;
    }

    requiredFields.forEach((id) => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('blur', () => validateField(field));
        }
    });

    function validateForm() {
        let valid = true;
        requiredFields.forEach((id) => {
            const field = document.getElementById(id);
            if (!validateField(field)) valid = false;
        });

        const cepDigits = cepInput ? cepInput.value.replace(/\D/g, '') : '';
        const cepValid = cepDigits.length === 8;
        if (cepInput) cepInput.classList.toggle('is-invalid', !cepValid);
        if (!cepValid) {
            valid = false;
            if (cepFeedback && !cepFeedback.textContent) {
                cepFeedback.textContent = 'Informe um CEP válido (8 dígitos).';
            }
        }

        if (cart.size === 0) valid = false;
        return valid;
    }

    // ===== Rascunho em localStorage (modo offline gracioso) =====
    function saveDraft() {
        try {
            const draft = {
                name: form.name.value,
                cep: form.cep.value,
                address: form.address.value,
                neighborhood: form.neighborhood.value,
                complement: form.complement.value,
                notes: form.notes.value,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch (err) {
            /* localStorage indisponível — segue sem salvar rascunho */
        }
    }

    function restoreDraft() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            Object.keys(draft).forEach((key) => {
                if (form[key]) form[key].value = draft[key];
            });
            if (cepInput && cepInput.value.replace(/\D/g, '').length === 8) {
                cepInput.dispatchEvent(new Event('blur'));
            }
        } catch (err) {
            /* rascunho corrompido ou indisponível — ignora */
        }
    }

    function clearDraft() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            /* nada a fazer */
        }
    }

    if (form) {
        restoreDraft();
        form.addEventListener('input', saveDraft);
    }

    // ===== Modal de sucesso =====
    function showSuccessModal() {
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
                <p>O Renato vai confirmar em breve pelo WhatsApp.</p>
                <button type="button" class="btn-primary" id="modal-close">Fazer novo pedido</button>
            </div>
        `;
        document.body.appendChild(modal);

        function close() {
            modal.remove();
            document.removeEventListener('keydown', onKeydown);
        }
        function onKeydown(event) {
            if (event.key === 'Escape') close();
        }

        modal.querySelector('#modal-close').addEventListener('click', close);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', onKeydown);
    }

    // ===== Envio do pedido =====
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            formError.hidden = true;

            if (shipping.status === 'loading') {
                formError.textContent = 'Aguarde um instante — ainda estamos calculando o frete pelo CEP.';
                formError.hidden = false;
                return;
            }

            if (!validateForm()) {
                formError.textContent = cart.size === 0
                    ? 'Selecione pelo menos um tamanho de saco antes de enviar.'
                    : 'Preencha todos os campos obrigatórios (*).';
                formError.hidden = false;
                formError.classList.add('shake');
                vibrate([10, 30, 10]);
                setTimeout(() => formError.classList.remove('shake'), 400);
                formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            const data = {
                name: form.name.value.trim(),
                cep: form.cep.value.trim(),
                address: form.address.value.trim(),
                neighborhood: form.neighborhood.value.trim(),
                complement: form.complement.value.trim() || 'Nenhum',
                notes: form.notes.value.trim() || 'Nenhuma',
                alreadyPaid: form['already-paid'].checked,
            };

            const items = [];
            cart.forEach((qty, size) => {
                items.push({ size, quantity: qty, subtotal: PRICES[size] * qty });
            });
            const { subtotal, total } = updateSummary();

            btnSubmit.disabled = true;

            const message = window.WA.buildOrderMessage(data, items, subtotal, shipping, total);
            window.WA.openChat(message);

            vibrate([10, 20, 10]);
            showSuccessModal();
            if (window.launchConfetti) window.launchConfetti();
            clearDraft();

            form.reset();
            cart.clear();
            shipping = { status: 'idle', distanceKm: null, fee: 0 };
            if (cepFeedback) {
                cepFeedback.textContent = '';
                cepFeedback.classList.remove('is-valid', 'is-pending');
            }
            document.querySelectorAll('.product-card').forEach((card) => {
                card.classList.remove('is-selected');
                card.querySelector('.qty-value').textContent = '0';
                card.querySelector('.product-badge').hidden = true;
            });
            orderSummary.classList.remove('is-open');
            summaryToggle.setAttribute('aria-expanded', 'false');
            if (summaryToggleCta) summaryToggleCta.textContent = 'Ver resumo ↑';
            updateSummary();
            btnSubmit.disabled = false;
        });
    }

    updateSummary();
})();
