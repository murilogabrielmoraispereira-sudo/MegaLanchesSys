# IA local da Mega Lanches

O motor local aprende sem chamar APIs externas. Ele roda dentro do servidor e grava a memoria no mesmo SQLite do projeto.

## Fontes de aprendizado

- Pedidos com status `entregue`: produtos, alteracoes, pagamento, entrega, horario e valor.
- Mensagens recebidas pelos webhooks WPPConnect, WATI e Z-API.
- Conversas pendentes antigas, importadas gradualmente quando ainda estao disponiveis.

Mensagens sao relacionadas somente a pedidos posteriores do mesmo telefone dentro de 24 horas. Termos repetidos na mesma conversa contam uma unica vez por pedido. Quando o carrinho tem varios produtos e nao existe relacao clara, o termo fica em espera em vez de ser associado a todos os itens.

## Previsoes e recencia

- Compras recentes recebem peso maior, com meia-vida de 45 dias.
- Pedidos que a versao anterior ja conhecia sao migrados gradualmente para o historico temporal, sem duplicar os totais.
- Cada conjunto de sugestoes exibido pelo app fica registrado por ate 7 dias.
- O proximo pedido entregue do cliente avalia a previsao como acerto ou erro.
- A confianca combina frequencia, recencia e a precisao ja observada para aquele cliente.
- O sistema compara o favorito historico com o comportamento recente e avisa quando detecta mudanca de habito.
- A confianca e reduzida quando existem poucos pedidos, mesmo que todos apontem para o mesmo produto.
- Cada recomendacao informa pedidos historicos, pedidos recentes, peso temporal e previsoes ja avaliadas.
- O modelo identificado nas respostas do app e `mega-local-v3`.

## Seguranca operacional

- O aprendizado nunca envia mensagem por conta propria.
- Sugestoes precisam ser confirmadas pelo atendente.
- Pedidos cancelados ou ainda em andamento nao treinam o motor.
- Eventos sao deduplicados e processados em lotes para nao pesar com muitos pedidos.
- O painel permite pausar, processar e reconstruir a memoria sem apagar pedidos ou conversas originais.

## Painel

Acesse `/adminn/ia-local.html`. A pagina mostra clientes consolidados, produtos, preferencias, termos relacionados, pares de produtos, previsoes recentes e a precisao medida.

O worker roda automaticamente a cada 20 segundos. O bot do WhatsApp pode estar pausado e, ainda assim, as mensagens recebidas continuam alimentando a memoria quando a IA local esta ativa.
