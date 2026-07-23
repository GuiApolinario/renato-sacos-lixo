// scripts/shipping.js — cálculo de frete por distância (BrasilAPI + Haversine)
//
// Regra de negócio: frete grátis em até 15km do CEP de origem (18117-131).
// Além disso, cobra-se uma taxa por km excedente. RATE_PER_KM é uma
// estimativa de mercado para entrega local (motoboy/courier) em cidades do
// interior de SP — não é uma cotação em tempo real. Ajuste esse valor com
// o Renato sempre que o custo real de entrega mudar.
//
// A distância é estimada via geocodificação de CEP (BrasilAPI, pública e
// gratuita). Nem todo CEP tem coordenadas cadastradas: quando a distância
// não pode ser calculada, o status retorna 'unknown' e o frete fica
// marcado como "a combinar", para o Renato confirmar manualmente.

window.Shipping = (function () {
    'use strict';

    const ORIGIN_CEP = '18117131';
    const FREE_RADIUS_KM = 15;
    const RATE_PER_KM = 2.00;
    const API_BASE = 'https://brasilapi.com.br/api/cep/v2/';

    let originCoordsPromise = null;

    function onlyDigits(value) {
        return (value || '').replace(/\D/g, '');
    }

    async function geocodeCep(cep) {
        const digits = onlyDigits(cep);
        if (digits.length !== 8) return null;

        const response = await fetch(API_BASE + digits);
        if (!response.ok) return null;

        const data = await response.json();
        const coords = data && data.location && data.location.coordinates;
        const lat = coords && parseFloat(coords.latitude);
        const lng = coords && parseFloat(coords.longitude);

        if (!lat || !lng) return null;
        return { lat, lng, city: data.city, state: data.state };
    }

    function getOriginCoords() {
        if (!originCoordsPromise) {
            originCoordsPromise = geocodeCep(ORIGIN_CEP);
        }
        return originCoordsPromise;
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

    // Retorna { status: 'free' | 'paid' | 'unknown', distanceKm, fee, city, state }
    async function calculate(destinationCep) {
        try {
            const [origin, destination] = await Promise.all([
                getOriginCoords(),
                geocodeCep(destinationCep),
            ]);

            if (!origin || !destination) {
                return { status: 'unknown', distanceKm: null, fee: 0 };
            }

            const distanceKm = haversineKm(origin, destination);

            if (distanceKm <= FREE_RADIUS_KM) {
                return { status: 'free', distanceKm, fee: 0, city: destination.city, state: destination.state };
            }

            const extraKm = distanceKm - FREE_RADIUS_KM;
            const fee = Math.ceil(extraKm * RATE_PER_KM * 2) / 2; // arredonda para R$ 0,50

            return { status: 'paid', distanceKm, fee, city: destination.city, state: destination.state };
        } catch (err) {
            return { status: 'unknown', distanceKm: null, fee: 0 };
        }
    }

    return { calculate, FREE_RADIUS_KM, RATE_PER_KM, ORIGIN_CEP };
})();
