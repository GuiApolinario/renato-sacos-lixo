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
│   ├── background-3d.js          # animação de fundo 3D (campo de partículas em Canvas)
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
- **Chave PIX:** `+5515997742737` (chave do tipo telefone, mesmo número do WhatsApp)
- **Preços:** 20L R$28 · 40L R$32 · 60L R$38 · 100L R$48 (30 unidades/pacote)
- **Prazo:** 24-48h

## Busca de CEP e frete por distância (`scripts/shipping.js`)

Quando o cliente digita o CEP no checkout (a busca dispara ao completar 8 dígitos), o site preenche o endereço automaticamente e calcula o frete, usando **duas fontes gratuitas em paralelo** para máxima confiabilidade:

- **[ViaCEP](https://viacep.com.br/)** — fonte principal do endereço (rua, bairro, cidade, estado). É o serviço de CEP mais estável do Brasil, sem chave de API.
- **[BrasilAPI](https://brasilapi.com.br/)** — fornece as coordenadas (latitude/longitude) para o cálculo de distância; também serve de reserva para o endereço.

As duas consultas falham de forma independente: se a BrasilAPI cair, o endereço ainda é preenchido pelo ViaCEP (o frete fica "a combinar"); se o ViaCEP cair, o endereço vem da BrasilAPI.

> **Por que não Google Maps?** A API de geocodificação do Google exige chave de API com cobrança (cartão no Google Cloud) e a chave ficaria exposta no código do site. ViaCEP + BrasilAPI resolvem o mesmo problema de graça e sem esse risco.

Cálculo do frete:

1. A distância é em linha reta (fórmula de Haversine) — estimativa, não rota real.
2. **Até 15km (`FREE_RADIUS_KM`): frete grátis.** Acima disso, `RATE_PER_KM` por km excedente.
3. `RATE_PER_KM = 2.00` é uma **estimativa de mercado para entrega local no interior de SP** — ajuste em `scripts/shipping.js` conforme o custo real do Renato.
4. Quando a distância não pode ser calculada (CEP sem coordenadas), o frete aparece como **"a combinar"** e o Renato confirma o valor pelo WhatsApp.

## Deploy

Deploy automático via GitHub Pages a cada push na branch `main`:

```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

## Pendências para o cliente

- [ ] Adicionar fotos reais de produto/entrega em `assets/images/`
- [ ] Adicionar depoimentos reais de clientes (quando disponíveis)
- [ ] Revisar o texto da seção "Nossa História" (`#history` em `index.html`) — hoje é um texto genérico baseado no brief; substituir por detalhes reais (ano de fundação, como começou, marcos importantes)
- [ ] Validar/ajustar `RATE_PER_KM` em `scripts/shipping.js` com o custo real de entrega além dos 15km
