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
            return `${formatBRL(shipping.fee)} (~${shipping.distanceKm.toFixed(1)} km de Sorocaba)`;
        }
        return 'A CONFIRMAR — não foi possível calcular a distância automaticamente';
    }

    function buildOrderMessage(data, items, subtotal, shipping, total) {
        const itemsList = items
            .map((item) => `• ${item.quantity}x Saco ${item.size}L (30 un.) — R$ ${item.subtotal.toFixed(2).replace('.', ',')}`)
            .join('\n');

        const cityLine = (data.city || data.state)
            ? `${data.city || ''}${data.city && data.state ? '/' : ''}${data.state || ''}`
            : null;

        return [
            '🛒 NOVO PEDIDO — Renato Embalagens',
            '',
            `👤 CLIENTE: ${data.name}`,
            ...(data.phone ? [`📞 WHATSAPP: ${data.phone}`] : []),
            '',
            '📍 ENTREGA PARA:',
            `CEP: ${data.cep}`,
            `${data.address}, ${data.neighborhood}`,
            ...(cityLine ? [cityLine] : []),
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
