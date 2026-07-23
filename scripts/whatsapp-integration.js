// scripts/whatsapp-integration.js — geração de link e mensagem do WhatsApp

window.WA = (function () {
    'use strict';

    const NUMBER = '5515997742737';

    function openChat(message) {
        const url = `https://wa.me/${NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener');
    }

    function buildOrderMessage(data, items, total) {
        const itemsList = items
            .map((item) => `• ${item.quantity}x Saco ${item.size}L (30 un.) — R$ ${item.subtotal.toFixed(2).replace('.', ',')}`)
            .join('\n');

        return [
            '🛒 NOVO PEDIDO — Renato Sacos para Lixo',
            '',
            `👤 CLIENTE: ${data.name}`,
            '',
            '📍 ENTREGA PARA:',
            `${data.address}, ${data.neighborhood}`,
            `Complemento: ${data.complement}`,
            '',
            '📦 ITENS DO PEDIDO:',
            itemsList,
            '',
            '🚚 FRETE: GRÁTIS ✓',
            `💰 VALOR TOTAL: R$ ${total.toFixed(2).replace('.', ',')}`,
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
