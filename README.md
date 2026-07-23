# Renato Sacos para Lixo

Site institucional e de pedidos da **Renato Sacos para Lixo** — sacos de lixo reforçados, frete grátis em até 15km e entrega em 24-48h em Sorocaba e região. O pedido é montado no site e enviado via WhatsApp, que funciona como canal de atendimento e fechamento da compra.

🔗 **Site:** https://renato.ggsistemas.dev.br

## Stack

- HTML5 semântico
- CSS3 puro (custom properties, Grid, Flexbox, animações)
- JavaScript vanilla (ES6+), sem frameworks ou dependências externas
- Hospedado em GitHub Pages, com domínio próprio via CNAME

## Estrutura

```
renato-sacos-lixo/
├── index.html
├── CNAME
├── styles/
│   ├── global.css        # variáveis, reset, tipografia, base
│   ├── components.css     # header, cards, formulário, footer
│   ├── animations.css     # keyframes e transições
│   └── responsive.css     # media queries (mobile-first)
├── scripts/
│   ├── main.js                   # inicialização e navegação
│   ├── form-handler.js           # carrinho, validação e checkout
│   ├── shipping.js               # frete por distância (CEP → BrasilAPI → Haversine)
│   ├── animations.js             # animações de scroll e 3D (IntersectionObserver, tilt do hero)
│   └── whatsapp-integration.js   # geração do link/mensagem do WhatsApp
└── assets/
    ├── logo.svg
    ├── icons/
    ├── images/
    └── videos/
```

## Rodando localmente

Não há build step. Basta abrir `index.html` no navegador, ou servir a pasta com um servidor estático:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Dados de negócio (editar em `scripts/form-handler.js` e `scripts/whatsapp-integration.js`)

- **WhatsApp:** `5515997742737`
- **Chave PIX:** placeholder `00000000000000` — **substituir pela chave real do Renato antes de publicar**
- **Preços:** 20L R$28 · 40L R$32 · 60L R$38 · 100L R$48 (30 unidades/pacote)
- **Prazo:** 24-48h

## Frete por distância (`scripts/shipping.js`)

O frete é calculado automaticamente a partir do CEP que o cliente digita no checkout:

1. O CEP de origem (`ORIGIN_CEP = '18117131'`) e o CEP do cliente são geocodificados via [BrasilAPI](https://brasilapi.com.br/) (pública, gratuita, sem chave de API).
2. A distância é calculada em linha reta (fórmula de Haversine) — não é rota real de entrega, é uma estimativa.
3. **Até 15km (`FREE_RADIUS_KM`): frete grátis.** Acima disso, cobra-se `RATE_PER_KM` por km excedente.
4. `RATE_PER_KM = 2.00` é uma **estimativa de mercado para entrega local (motoboy/courier) no interior de SP — não é uma cotação em tempo real.** Ajuste esse valor em `scripts/shipping.js` sempre que o custo real de entrega do Renato mudar.
5. Nem todo CEP tem coordenadas cadastradas na BrasilAPI. Quando a distância não pode ser calculada, o frete aparece como **"a combinar"** e o pedido é enviado normalmente — o Renato confirma o valor manualmente pelo WhatsApp.

## Deploy

Deploy automático via GitHub Pages a cada push na branch `main`:

```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

## Pendências para o cliente

- [ ] Substituir a chave PIX placeholder pela chave real
- [ ] Adicionar fotos reais de produto/entrega em `assets/images/`
- [ ] Adicionar depoimentos reais de clientes (quando disponíveis)
- [ ] Revisar o texto da seção "Nossa História" (`#history` em `index.html`) — hoje é um texto genérico baseado no brief; substituir por detalhes reais (ano de fundação, como começou, marcos importantes)
- [ ] Validar/ajustar `RATE_PER_KM` em `scripts/shipping.js` com o custo real de entrega além dos 15km
