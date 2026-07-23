// scripts/whatsapp-integration.js — geração de link e mensagem do WhatsApp

window.WA = (function () {
    'use strict';

    const NUMBER = '5515997742737';

    function openChat(message) {
        const url = `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener');
    }

    function formatBRL(value) {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    function shippingLine(shipping) {
        if (!shipping || shipping.status === 'free') {
            const km = shipping && shipping.distanceKm ? ` (~${shipping.distanceKm.toFixed(1)} km)` : '';
            return `GRÁTIS ✓${km}`;
        }
        if (shipping.status === 'paid') {
            return `${formatBRL(shipping.fee)} (~${shipping.distanceKm.toFixed(1)} km do CEP 18117-131)`;
        }
        return 'A CONFIRMAR — não foi possível calcular a distância automaticamente';
    }

    function buildOrderMessage(data, items, subtotal, shipping, total) {
        const itemsList = items
            .map((item) => `• ${item.quantity}x Saco ${item.size}L (30 un.) — R$ ${item.subtotal.toFixed(2).replace('.', ',')}`)
            .join('\n');

        return [
            '🛒 NOVO PEDIDO — Renato Sacos para Lixo',
            '',
            `👤 CLIENTE: ${data.name}`,
            '',
            '📍 ENTREGA PARA:',
            `CEP: ${data.cep}`,
            `${data.address}, ${data.neighborhood}`,
            `Complemento: ${data.complement}`,
            '',
            '📦 ITENS DO PEDIDO:',
            itemsList,
            `Subtotal: ${formatBRL(subtotal)}`,
            '',
            `🚚 FRETE: ${shippingLine(shipping)}`,
            `💰 VALOR TOTAL: ${formatBRL(total)}`,
            '',
            '💳 PAGAMENTO PIX:',
            `Status: ${data.alreadyPaid ? 'Já paguei' : 'Vou pagar na entrega'}`,
            '',
            '📝 OBSERVAÇÕES:',
            data.notes,
            '',
            '─────────────────────────────',
            'Pedido enviado via site',
            `Horário: ${new Date().toLocaleString('pt-BR')}`,
        ].join('\n');
    }

    return { number: NUMBER, openChat, buildOrderMessage };
})();
