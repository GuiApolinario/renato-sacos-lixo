// scripts/form-handler.js — carrinho, validação e envio do pedido

(function () {
    'use strict';

    const PRICES = { 20: 28.00, 40: 32.00, 60: 38.00, 100: 48.00 };
    const PIX_KEY = '00000000000000';
    const STORAGE_KEY = 'renato-sacos-checkout-draft';

    const cart = new Map(); // size -> quantity

    const form = document.getElementById('checkout-form');
    const productsGrid = document.getElementById('products-grid');
    const summaryItemsEl = document.getElementById('summary-items');
    const totalPriceEl = document.getElementById('total-price');
    const summaryToggleTotalEl = document.getElementById('summary-toggle-total');
    const orderSummary = document.getElementById('order-summary');
    const summaryToggle = document.getElementById('summary-toggle');
    const formError = document.getElementById('form-error');
    const btnSubmit = document.getElementById('btn-submit');
    const pixKeyEl = document.getElementById('pix-key');
    const copyPixBtn = document.getElementById('copy-pix');

    if (pixKeyEl) pixKeyEl.textContent = PIX_KEY;

    function formatBRL(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    function vibrate(pattern) {
        if ('vibrate' in navigator) navigator.vibrate(pattern);
    }

    function calcTotal() {
        let total = 0;
        cart.forEach((qty, size) => {
            total += PRICES[size] * qty;
        });
        return total;
    }

    function updateSummary() {
        const total = calcTotal();

        if (cart.size === 0) {
            summaryItemsEl.innerHTML = '<p class="summary-empty">Nenhum item selecionado ainda.</p>';
        } else {
            summaryItemsEl.innerHTML = '';
            cart.forEach((qty, size) => {
                const subtotal = PRICES[size] * qty;
                const item = document.createElement('div');
                item.className = 'summary-item';
                item.innerHTML = `
                    <span>${qty}x Saco ${size}L (30 un.)</span>
                    <span class="summary-item-price">${formatBRL(subtotal)}</span>
                `;
                summaryItemsEl.appendChild(item);
            });
        }

        totalPriceEl.textContent = formatBRL(total);
        summaryToggleTotalEl.textContent = formatBRL(total);
        return total;
    }

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

    // ===== Resumo do pedido: bottom sheet (mobile) =====
    if (summaryToggle && orderSummary) {
        summaryToggle.addEventListener('click', () => {
            const isOpen = orderSummary.classList.toggle('is-open');
            summaryToggle.setAttribute('aria-expanded', String(isOpen));
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
        if (cart.size === 0) valid = false;
        return valid;
    }

    // ===== Rascunho em localStorage (modo offline gracioso) =====
    function saveDraft() {
        try {
            const draft = {
                name: form.name.value,
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
            const total = calcTotal();

            btnSubmit.disabled = true;

            const message = window.WA.buildOrderMessage(data, items, total);
            window.WA.openChat(message);

            vibrate([10, 20, 10]);
            showSuccessModal();
            if (window.launchConfetti) window.launchConfetti();
            clearDraft();

            form.reset();
            cart.clear();
            document.querySelectorAll('.product-card').forEach((card) => {
                card.classList.remove('is-selected');
                card.querySelector('.qty-value').textContent = '0';
                card.querySelector('.product-badge').hidden = true;
            });
            updateSummary();
            btnSubmit.disabled = false;
        });
    }

    updateSummary();
})();
