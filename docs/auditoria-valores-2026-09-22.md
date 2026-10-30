# Auditoria dos valores — 22/09/2026

**Atualização:** o pedido 3021 foi confirmado pelo proprietário e as correções foram publicadas. Veja [correções e validação](correcoes-valores-2026-09-22.md). O texto abaixo preserva os resultados anteriores à correção.

## Resultado

Foram encontradas divergências reproduzíveis nos cálculos e na preservação de adicionais. A auditoria não alterou preços, pedidos, banco de dados nem código de produção.

Os sete arquivos principais de cálculo locais foram comparados por SHA-256 com o VPS e são idênticos: `server.js`, `lib/cart-pricing.js`, `lib/promotion-pricing.js`, `public/script.js`, `public/adminn/adminscript.js`, `public/adminn/relatorio.js` e `scripts/print-agent.js`.

## Pedidos investigados

Horários abaixo convertidos para São Paulo (UTC−3).

| Pedido | Data/hora | Registro encontrado | Valor |
| --- | --- | --- | --- |
| 3021 | Sexta, 18/09, 20:15 | 2 Crispy de R$ 28,90; mussarela de R$ 4, quantidade 2 **por unidade**; entrega R$ 9 | R$ 82,80 |
| 3158 | Domingo, 20/09, 19:28 | 2 Crispy de R$ 28,90; 1 maionese de R$ 2 **no total**; retirada | R$ 59,80 |
| 2566 | Sábado, 05/09, 23:13 | 2 Crispy de R$ 28,90; 4 maioneses de R$ 2 **no total**; sem frete | R$ 65,80 calculados pelos itens gravados |

O pedido 3021 foi enviado à impressão duas vezes com total R$ 82,80. A conta gravada foi `2 × 28,90 + 2 × 2 × 4 + 9`. Se a intenção era somente duas mussarelas no pedido inteiro, o correto seria R$ 74,80 — diferença de R$ 8. Isso depende de confirmar a intenção do pedido: o registro diz mussarela, não maionese.

O pedido 3158 teve total R$ 59,80 enviado à impressão. O pedido 2566 é de um sábado anterior; não foi encontrada sua nota na consulta aos registros de impressão disponível para esta investigação. Nenhum desses casos deve ser considerado identificado definitivamente sem confirmação do usuário ou da nota física.

## Conferência do fim de semana

Período: 18/09/2026 00:00 até 21/09/2026 00:00, horário de São Paulo.

- 202 pedidos consultados em modo somente leitura.
- 218 registros de impressão recalculados a partir dos próprios itens, escopos, descontos e taxas de cada payload, usando aritmética decimal independente.
- Nenhuma divergência encontrada entre os totais desses payloads e os respectivos itens gravados.
- Um pedido com pagamento dividido; a soma confere com o total gravado.
- Nenhum pedido com desconto no período.
- Adicionais: 9 entradas com escopo por unidade e 11 com escopo total.

Essa conferência valida a aritmética dos dados persistidos. Ela não confirma se a quantidade digitada/interpretada era a desejada, se o papel corresponde ao payload ou se o cliente visualizou outro total antes de finalizar.

## Falhas reproduzidas

### 1. Editar pedido no painel perde o escopo do adicional

`public/adminn/adminscript.js`, função `normalizarItemBuilder`, reconstrói o adicional sem `escopo`. A função é usada ao abrir o editor e ao serializar o pedido. O cálculo considera adicionais sem escopo como adicionais por lanche.

Reprodução: 2 Crispy + 2 maioneses totais = R$ 61,80. Depois da normalização do editor, o mesmo conteúdo passa a R$ 65,80. Salvar uma edição pode persistir essa mudança involuntária. O editor também descarta metadados como `produtoId`, `tipo` e `categoria`.

### 2. API do atendente descarta escopo total em adicionais comuns

`server.js`, função `validarCarrinhoAtendente`, preserva explicitamente apenas `escopo: unidade`. Um adicional de mussarela com `escopo: total` perde a marcação e passa a ser multiplicado pela quantidade de lanches. Maionese/ketchup seguem outra regra, sendo separados como complementos do pedido.

Reprodução: 2 Crispy + 2 mussarelas totais deveriam somar R$ 65,80 sem frete; o validador produz R$ 73,80. Isso demonstra um erro no caminho de validação, mas não prova que o pedido 3021 entrou com escopo total.

### 3. Adicionar novamente o mesmo pedido personalizado perde extras

`public/script.js`, manipulador `modalAdicionar.onclick`, reúne linhas idênticas aumentando apenas a quantidade de lanches. A quantidade dos adicionais totais não é somada.

Reprodução: adicionar duas vezes 2 Crispy + 2 maioneses totais deveria resultar em 4 Crispy + 4 maioneses, R$ 123,60. O carrinho resulta em 4 Crispy + 2 maioneses, R$ 119,60. O critério de união também não compara observações.

### 4. Painel e relatório ignoram desconto em seus cálculos

`public/adminn/adminscript.js`, função `calcularTotalPedido`, soma itens e frete sem descontar `pedido.desconto`. `public/adminn/relatorio.js`, função de mesmo nome, calcula mercadorias sem desconto; a exportação CSV soma frete a esse valor.

Reprodução: mercadorias R$ 61,80, desconto R$ 10, entrega R$ 9. O servidor calcula R$ 60,80; o painel calcula R$ 70,80. O relatório mantém mercadorias em R$ 61,80 em vez de R$ 51,80 líquidos. Não houve descontos nos 202 pedidos auditados, portanto esta falha não explica a nota daquele período.

### 5. Relatório transforma frete explicitamente gratuito em R$ 9

`public/adminn/relatorio.js`, função `obterTaxaEntregaPedido`, usa a taxa padrão quando o valor informado é zero. Entrega com taxa zero passa a aparecer com R$ 9 no relatório/CSV. Zero explícito precisa ser distinguido de informação ausente.

### 6. Conversão numérica e quantidade zero divergem

Em entradas sintéticas, preço `"28,90"` vira zero em `lib/cart-pricing.js` (`Number`) e R$ 28 no painel (`parseFloat`). Na impressão é convertido corretamente para R$ 28,90. Quantidade zero é ignorada pelo servidor, mas vira uma unidade no painel. Os Crispy reais investigados estavam com preço numérico 28.9 e quantidade positiva; esses casos de borda não explicam os registros encontrados.

## Outras inconsistências observadas no código

- A taxa do site está fixa em R$ 9 (`public/script.js`), enquanto o atendente consulta a configuração do servidor. Atualmente a configuração `taxa_entrega` não está cadastrada e o servidor também usa R$ 9 como padrão. Se a configuração mudar, os canais podem divergir.
- A rota pública `POST /pedido` usa preços do carrinho, desconto e taxa recebidos do navegador. Não refaz a validação completa do catálogo e do cupom na finalização. A rota do atendente valida o catálogo. Assim, conferir apenas a soma não garante que o preço cobrado seja o preço oficial. Constatação por leitura de código; nenhum pedido adulterado foi enviado ao site.
- As regras de arredondamento não estão centralizadas em centavos. Nos registros auditados isso não produziu divergência monetária.
- A impressão prefere o `total` oficial, o que manteve os payloads auditados coerentes. Há um caminho alternativo que subtrai desconto de `subtotal` quando falta `total`, embora o servidor costume fornecer subtotal já líquido. Não observado nos casos reais analisados.
- Os componentes de combo têm tratamento próprio na impressão e não fazem parte do mesmo calculador do servidor. Combos, complementos e itens comuns merecem um contrato único de preços; não foi demonstrada falha em um pedido real de combo nesta auditoria.

## Validação executada

- `node tools/audit-pricing.mjs`: 20 cenários; 11 resultados coerentes e 9 divergências reproduzidas (algumas pertencem à mesma falha). O script executa funções extraídas dos arquivos reais com entradas sintéticas; não inicia o servidor nem envia pedidos.
- `node --test scripts/print-agent.test.js`: 4 testes existentes aprovados.
- Promoção X-Tudo: um item R$ 26; a partir de duas unidades, R$ 24 cada; quantidade mínima 2. A soma entre linhas separadas foi verificada e a promoção não alterou o preço do Crispy.
- Maionese total, adicionais por unidade, entrega, retirada e complementos separados tiveram suas fórmulas verificadas.

## Ordem recomendada de correção

1. Preservar o escopo e os metadados nas edições e na API do atendente.
2. Corrigir a união de itens repetidos para preservar adicionais e observações.
3. Unificar a definição de bruto, desconto, subtotal líquido, frete e total no painel, relatório e impressão.
4. Centralizar validação de catálogo/cupom/frete e conversão monetária na finalização, mantendo os preços históricos dos pedidos já concluídos.

É necessário confirmar a nota específica antes de alterar qualquer pedido histórico. Esta entrega é uma auditoria; as correções de produção ainda não foram aplicadas.
