// scripts/shipping.js — busca de CEP + cálculo de frete por distância (BrasilAPI + Haversine)
//
// A consulta ao CEP na BrasilAPI (pública e gratuita) devolve, numa única
// requisição, tanto o endereço (rua, bairro, cidade, estado) quanto as
// coordenadas. Usamos os dois:
//   - endereço → preenche automaticamente os campos do formulário;
//   - coordenadas → calculam a distância até a origem (frete).
//
// Regra de negócio: frete grátis em até 15km do CEP de origem (18117-131).
// Além disso, cobra-se RATE_PER_KM por km excedente. RATE_PER_KM é uma
// estimativa de mercado para entrega local (motoboy/courier) no interior de
// SP — não é cotação em tempo real. Ajuste com o Renato quando o custo mudar.
//
// Nem todo CEP tem coordenadas cadastradas: quando a distância não pode ser
// calculada, o status vira 'unknown' e o frete fica "a combinar" (o endereço
// ainda pode ter vindo preenchido, mesmo sem coordenadas).

window.Shipping = (function () {
    'use strict';

    const ORIGIN_CEP = '18117131';
    const FREE_RADIUS_KM = 15;
    const RATE_PER_KM = 2.00;
    const API_BASE = 'https://brasilapi.com.br/api/cep/v2/';

    let originPromise = null;

    function onlyDigits(value) {
        return (value || '').replace(/\D/g, '');
    }

    // Consulta o CEP e devolve endereço + coordenadas (coords podem ser null).
    // Retorna null apenas quando o CEP é inválido ou a consulta falha.
    async function fetchCep(cep) {
        const digits = onlyDigits(cep);
        if (digits.length !== 8) return null;

        const response = await fetch(API_BASE + digits);
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

    function getOrigin() {
        if (!originPromise) {
            originPromise = fetchCep(ORIGIN_CEP);
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
                fetchCep(destinationCep),
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
