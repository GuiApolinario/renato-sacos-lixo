// scripts/shipping.js — busca de CEP (endereço) + cálculo de frete por distância
//
// Estratégia de dupla fonte, para máxima confiabilidade:
//   - ViaCEP  → endereço (rua, bairro, cidade, estado). É o serviço de CEP
//               mais consolidado e estável do Brasil, gratuito e sem chave.
//               É a fonte PRINCIPAL do preenchimento automático.
//   - BrasilAPI → coordenadas (latitude/longitude), usadas só para calcular a
//               distância até a origem (frete). Também traz endereço, usado
//               como reserva caso o ViaCEP falhe.
//
// As duas consultas rodam em paralelo e falham de forma independente: se a
// BrasilAPI cair, o endereço ainda é preenchido pelo ViaCEP (o frete só fica
// "a combinar"); se o ViaCEP cair, o endereço vem da BrasilAPI.
//
// Regra de negócio: frete grátis em até 15km do CEP de origem (18117-131).
// Acima disso, cobra-se RATE_PER_KM por km excedente. RATE_PER_KM é uma
// estimativa de mercado para entrega local (motoboy/courier) no interior de
// SP — não é cotação em tempo real. Ajuste com o Renato quando o custo mudar.

window.Shipping = (function () {
    'use strict';

    const ORIGIN_CEP = '18117131';
    const FREE_RADIUS_KM = 15;
    const RATE_PER_KM = 2.00;
    const VIACEP_BASE = 'https://viacep.com.br/ws/';
    const BRASILAPI_BASE = 'https://brasilapi.com.br/api/cep/v2/';

    let originPromise = null;

    function onlyDigits(value) {
        return (value || '').replace(/\D/g, '');
    }

    // ViaCEP: endereço confiável, sem coordenadas.
    async function fetchViaCep(digits) {
        const response = await fetch(`${VIACEP_BASE}${digits}/json/`);
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || data.erro) return null;
        return {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
            lat: null,
            lng: null,
        };
    }

    // BrasilAPI: endereço + coordenadas (as coordenadas podem vir vazias).
    async function fetchBrasilApi(digits) {
        const response = await fetch(`${BRASILAPI_BASE}${digits}`);
        if (!response.ok) return null;
        const data = await response.json();
        const coords = (data && data.location && data.location.coordinates) || {};
        const lat = parseFloat(coords.latitude);
        const lng = parseFloat(coords.longitude);
        return {
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
        };
    }

    // Consulta as duas fontes em paralelo e mescla: endereço prioriza ViaCEP,
    // coordenadas vêm da BrasilAPI. Retorna null só se ambas falharem.
    async function lookup(cep) {
        const digits = onlyDigits(cep);
        if (digits.length !== 8) return null;

        const [viaResult, brasilResult] = await Promise.allSettled([
            fetchViaCep(digits),
            fetchBrasilApi(digits),
        ]);

        const via = viaResult.status === 'fulfilled' ? viaResult.value : null;
        const brasil = brasilResult.status === 'fulfilled' ? brasilResult.value : null;
        if (!via && !brasil) return null;

        return {
            street: (via && via.street) || (brasil && brasil.street) || '',
            neighborhood: (via && via.neighborhood) || (brasil && brasil.neighborhood) || '',
            city: (via && via.city) || (brasil && brasil.city) || '',
            state: (via && via.state) || (brasil && brasil.state) || '',
            lat: brasil ? brasil.lat : null,
            lng: brasil ? brasil.lng : null,
        };
    }

    function getOrigin() {
        if (!originPromise) {
            originPromise = lookup(ORIGIN_CEP);
        }
        return originPromise;
    }

    function haversineKm(a, b) {
        const R = 6371;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    // Retorna {
    //   status: 'free' | 'paid' | 'unknown',
    //   distanceKm, fee, city, state,
    //   address: { street, neighborhood, city, state } | null
    // }
    async function calculate(destinationCep) {
        try {
            const [origin, destination] = await Promise.all([
                getOrigin(),
                lookup(destinationCep),
            ]);

            if (!destination) {
                return { status: 'unknown', distanceKm: null, fee: 0, address: null };
            }

            const address = {
                street: destination.street,
                neighborhood: destination.neighborhood,
                city: destination.city,
                state: destination.state,
            };

            const hasCoords = origin && origin.lat != null && destination.lat != null;
            if (!hasCoords) {
                return { status: 'unknown', distanceKm: null, fee: 0, city: destination.city, state: destination.state, address };
            }

            const distanceKm = haversineKm(origin, destination);

            if (distanceKm <= FREE_RADIUS_KM) {
                return { status: 'free', distanceKm, fee: 0, city: destination.city, state: destination.state, address };
            }

            const extraKm = distanceKm - FREE_RADIUS_KM;
            const fee = Math.ceil(extraKm * RATE_PER_KM * 2) / 2; // arredonda para R$ 0,50

            return { status: 'paid', distanceKm, fee, city: destination.city, state: destination.state, address };
        } catch (err) {
            return { status: 'unknown', distanceKm: null, fee: 0, address: null };
        }
    }

    return { calculate, FREE_RADIUS_KM, RATE_PER_KM, ORIGIN_CEP };
})();
