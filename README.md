# Renato Embalagens

Site institucional e de pedidos da **Renato Embalagens** — sacos de lixo reforçados, frete grátis em até 15km e entrega em 24-48h em Sorocaba e região. O pedido é montado no site e enviado via WhatsApp, que funciona como canal de atendimento e fechamento da compra.

🔗 **Site:** https://renato.ggsistemas.dev.br

> **Refatoração 2026 — foco em mobile e conversão.** O site foi reescrito com prioridade absoluta na experiência do celular: carrinho em *bottom sheet* (como app nativo), barra fixa de checkout, alvos de toque de 44px, teclado numérico nos campos certos e checkout em 3 passos com validação por etapa. A identidade passou a seguir a regra 60-30-10 com **azul marinho** de marca e **verde esmeralda exclusivo de ação**.

## Stack

- HTML5 semântico (`header`, `nav`, `main`, `section`, `article`, `footer`)
- CSS3 puro (custom properties, Grid, Flexbox) — zero dependências
- JavaScript vanilla (ES6+), sem frameworks nem bibliotecas externas
- Hospedado em GitHub Pages, com domínio próprio via CNAME

## Estrutura

```
renato-sacos-lixo/
├── index.html
├── CNAME
├── styles/
│   ├── global.css         # design system: tokens de cor/tipografia/espaço, reset, base
│   ├── components.css     # header, hero, vitrine, carrinho, wizard, footer
│   ├── animations.css     # keyframes e transições
│   └── responsive.css     # breakpoints e adaptações mobile
├── scripts/
│   ├── preloader.js              # tela de carregamento com a marca
│   ├── background-scenes.js      # fundo animado: folhas 3D + jardim noturno no rodapé
│   ├── main.js                   # navegação, header, filtros da vitrine
│   ├── cart.js                   # carrinho, bottom sheet e barra fixa de checkout
│   ├── checkout.js               # wizard de 3 passos, frete por CEP e envio
│   ├── shipping.js               # frete por distância (CEP → BrasilAPI → Haversine)
│   ├── animations.js             # scroll reveal, confete, micro-interações, estrelas
│   └── whatsapp-integration.js   # geração do link/mensagem do WhatsApp
└── assets/
    ├── favicon.png
    ├── apple-touch-icon.png
    ├── icons/
    ├── images/
    │   ├── logo-quokka.webp       # mascote — cabeçalho, hero, favicon, og:image
    │   └── renato-fundador.webp   # foto/caricatura do Renato (contato + tela de carregamento)
    └── videos/
```

## Identidade visual (regra 60-30-10)

Todas as cores são variáveis CSS em `styles/global.css` — trocar a marca inteira é editar meia dúzia de linhas:

| Papel | Variável | Cor | Uso |
|---|---|---|---|
| 60% — base | `--bg-color` / `--surface-color` | `#F8FAFC` / `#FFFFFF` | fundo e cards, para dar respiro |
| 30% — marca | `--primary-color` | `#1E3A8A` (azul marinho) | header, títulos, faixa de cobertura, rodapé |
| 10% — ação | `--action-color` | `#10B981` (verde esmeralda) | **só** CTA: comprar, checkout, frete grátis |

> **Regra de ouro:** o verde é exclusivo de ação. Se um elemento não é clicável e não é a oferta, ele não usa verde — é isso que faz o botão "Adicionar" saltar aos olhos no meio da página.

Tipografia: **Poppins** nos títulos (600–800) e **Inter** no corpo, com escala fluida (`clamp()`) que cresce do celular ao desktop sem quebras.

## Experiência mobile

- **Alvos de toque de 44×44px** em todos os controles (`--tap-target`). Em telas de toque (`pointer: coarse`) até os `+`/`−` do seletor sobem para 44px.
- **Carrinho em bottom sheet:** sobe da base da tela com puxador, cantos arredondados e fundo escurecido com `backdrop-filter: blur()`. No desktop o mesmo componente vira painel lateral.
- **Barra fixa de checkout:** aparece assim que há item no carrinho, com contador, total e "Finalizar pedido" — o cliente nunca precisa rolar para achar o carrinho. Respeita a área segura do iPhone (`env(safe-area-inset-bottom)`).
- **Adicionar não abre o carrinho.** Abrir um sheet por cima da vitrine a cada toque atrapalha quem quer somar vários produtos; o feedback vem da barra fixa atualizando na hora, com o badge pulando e uma vibração curta.
- **Teclado certo em cada campo:** `inputmode="numeric"` no CEP e no WhatsApp, `autocomplete` nativo e `enterkeyhint` para o botão de avançar do teclado.
- **Fonte de 16px nos inputs**, o que evita o zoom automático do iOS ao focar um campo.

## Checkout em 3 passos

1. **Seus dados** — nome e WhatsApp (com máscara automática).
2. **Entrega** — CEP dispara a busca de endereço e o cálculo de frete; rua e bairro vêm preenchidos.
3. **Pagamento** — revisão do pedido, PIX, selos de confiança e envio pelo WhatsApp.

Cada passo só libera o próximo quando os campos dele estão válidos, e o erro aparece **no campo**, não numa mensagem genérica no fim da página. Dá para voltar clicando num passo já concluído.

## Prova social (estrutura pronta, desligada)

Os cards aceitam `data-rating` e `data-reviews`; `scripts/animations.js` renderiza as estrelas a partir daí. **Sem esses atributos nada é exibido** — e eles estão propositalmente ausentes.

> Nota de responsabilidade: avaliação inventada em loja real é publicidade enganosa (CDC, art. 37). Assim que houver nota real de clientes, basta preencher os atributos no `index.html`:
> ```html
> <article class="product-card" data-size="40" data-rating="4.8" data-reviews="37">
> ```

## Rodando localmente

Não há build step. Basta abrir `index.html` no navegador, ou servir a pasta com um servidor estático:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Dados de negócio (editar em `scripts/cart.js`, `scripts/checkout.js` e `scripts/whatsapp-integration.js`)

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

A validação de frete acontece no **passo 2 do checkout (Entrega)** e é gamificada: conforme o CEP é digitado, uma barra de progresso preenche visualmente a distância até 25km, com uma marca no ponto dos 15km; ao entrar no raio grátis, um selo "Frete grátis desbloqueado!" aparece com uma animação de destrave (e uma vibração curta em celulares compatíveis). Além do raio, a barra vira âmbar e mostra o valor calculado.

## Faixa de cobertura

Logo no topo da página (acima do header) há uma faixa fixa e discreta com o aviso de cobertura: **"Sede em Sorocaba-SP. Atendemos Sorocaba e Região. Demais localidades: sujeito a cálculo de frete."** — deixa a área de atendimento clara antes mesmo do cliente rolar.

## Hero com mascote (sem WebGL)

O topo apresenta o mascote (quokka) com uma lixeira ao lado, ambos com profundidade/efeito "3D" feito só com CSS (sombra projetada, flutuação, brilho esmeralda e "chips" flutuantes de destaque). A cena 3D anterior em Three.js/WebGL foi **removida** para deixar o catálogo abrir instantaneamente no 4G/5G — o objetivo do redesign é velocidade e clareza, não peso gráfico.

## Fundos animados (`scripts/background-scenes.js`)

Dois cenários, desenhados por um único `requestAnimationFrame` em **Canvas 2D — sem WebGL e sem biblioteca**, ambos com matemática 3D de verdade (eixo Z + projeção em perspectiva):

**1. Folhas — no site inteiro** (canvas fixo, atrás de todo o conteúdo)
Folhas verdes grandes flutuando em profundidade, com **desfoque (bokeh) nas mais próximas**. O campo reage ao movimento do mouse.

**2. Jardim noturno — no rodapé de contato** (canvas próprio dentro do `<footer>`)
**Vaga-lumes piscando entre folhas caindo devagar.** Cada elemento tem seu Z: os da frente são maiores, mais brilhantes e levemente desfocados. Os vaga-lumes vagueiam de forma orgânica (soma de senoides nos dois eixos) e piscam cada um no seu ritmo, com um piso de brilho para sempre haver vários acesos.

> Antes havia um efeito de cometas aqui, trocado porque destoava: meteoro remete a espaço, e a marca fala de natureza/verde — o jardim à noite conversa com as folhas do resto do site. A cena mora num canvas do próprio rodapé porque o fundo verde escuro dele cobriria o canvas fixo do site.

Calibragem e performance: no tema claro as folhas são ~40% mais discretas que no escuro (para nunca competirem com o texto); menos elementos no mobile; DPR limitado a 2; o rodapé **só anima quando está visível** (IntersectionObserver); tudo pausa quando a aba fica oculta; e com `prefers-reduced-motion` os dois cenários viram um quadro estático, sem loop.

## Atendimento humanizado (`#orcamento`)

Entre a vitrine e o checkout há um bloco com a foto do Renato e o botão **"Solicitar orçamento com o Renato"**, que abre o WhatsApp com uma mensagem de orçamento já escrita. É a saída para quem não quer se servir sozinho: quantidade grande, dúvida de litragem, preço para condomínio/empresa.

Qualquer elemento com `data-whatsapp="mensagem"` vira um botão de WhatsApp — o `scripts/main.js` cuida do clique:

```html
<button type="button" data-whatsapp="Olá, Renato! Gostaria de um orçamento.">Falar com o Renato</button>
```

> **Cuidado com ordem de scripts:** o botão flutuante já quebrou por consultar `window.WA` no carregamento. Como os scripts usam `defer` (executam na ordem do documento), `main.js` rodava antes de `whatsapp-integration.js` e o listener nunca era registrado. Hoje a checagem acontece dentro do clique e ainda há um link de reserva — funciona independente da ordem.

## Tela de carregamento

Fundo **preto sólido** em qualquer plataforma e tema (os tokens de marca clareiam no modo escuro, então aqui a cor é fixa). No lugar da barra corrida, um **anel de progresso** gira ao redor da foto do Renato enquanto o traço estica e encolhe — movimento mais orgânico —, com o nome da marca, a assinatura da região e três pontinhos pulsando em sequência. Com `prefers-reduced-motion` tudo congela num quadro estático.

## Vitrine

- **Filtros rápidos por uso** (`Todos`, `Doméstico`, `Industrial`, `Condomínios`) filtram os cards via `data-use`. No celular viram um carrossel horizontal com *scroll snap*.
- Cada card tem **seletor de quantidade** e botão **"Adicionar"**, além de **preço por unidade** (ajuda a comparar litragens) e **badges** de destaque: "Mais vendido" no 40L e "Melhor custo-benefício" no 100L.

## Micro-interações

Feedback imediato a cada toque, tudo desativado com `prefers-reduced-motion`:

- **"Adicionar"** dá um pulo (`scale`) e vira "Adicionado ✓" por 1,3s; o card pisca junto.
- **Badge do carrinho** em vermelho, com animação de salto sempre que o número muda.
- **Vibração curta** (Vibration API) ao adicionar item e ao destravar o frete grátis.
- Botões encolhem no `:active` e têm rebote de mola ao soltar.

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
