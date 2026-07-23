# Renato Sacos para Lixo

Site institucional e de pedidos da **Renato Sacos para Lixo** — sacos de lixo reforçados, frete grátis e entrega em 24-48h em Sorocaba e região. O pedido é montado no site e enviado via WhatsApp, que funciona como canal de atendimento e fechamento da compra.

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
│   ├── animations.js             # animações de scroll (IntersectionObserver)
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
- **Frete:** grátis sempre · **Prazo:** 24-48h

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
