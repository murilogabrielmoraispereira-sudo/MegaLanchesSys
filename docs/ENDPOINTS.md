# Endpoints (resumo)

## Publicos
- `GET /cardapio` Lista completa do cardapio (inclui disponibilidade).
- `GET /adicionais` Lista adicionais com nome e preco.
- `GET /config` Configuracoes publicas (tempo, Pix e URL publica).
- `POST /webhook/zapi` Webhook do Z-API (requer HTTPS).
- `POST /webhook/wati` Webhook do WATI (requer HTTPS).
- `POST /webhook/wppconnect` Webhook do WPPConnect (mensagens recebidas).

## Auth admin
- `POST /adminn/login` Corpo JSON: `{ "senha": "..." }` cria sessao admin via cookie.
- `POST /adminn/logout` Encerra sessao admin.

## Admin (protegidos)
- `GET /adminn/config`
- `POST /adminn/config`
- `GET /adminn/cardapio`
- `POST /adminn/cardapio/adicionar`
- `PUT /adminn/cardapio/editar/:index`
- `DELETE /adminn/cardapio/remover/:index`
- `POST /adminn/cardapio/atualizar`
- `GET /adminn/adicionais`
- `POST /adminn/adicionais/adicionar`
- `DELETE /adminn/adicionais/remover/:index`
- `GET /adminn/estoque`
- `GET /adminn/estoque/resumo`
- `GET /adminn/estoque/movimentos`
- `POST /adminn/estoque`
- `PUT /adminn/estoque/:id`
- `DELETE /adminn/estoque/:id`
- `POST /adminn/estoque/movimentar`
- `POST /adminn/estoque/definir`
- `POST /adminn/estoque/importar`
- `POST /adminn/estoque/sincronizar-bebidas`
- `GET /adminn/entregadores`
- `POST /adminn/entregadores/adicionar`
- `DELETE /adminn/entregadores/remover/:id`
- `POST /adminn/entregadores/status`
- `GET /adminn/relatorio/dados`
- `GET /pedidos`
- `POST /pedidos/status`
- `POST /pedidos/atribuir-entregador`
- `DELETE /pedidos/cancelar/:id`
- `POST /pedidos/mover-para-entregues`
- `GET /pedidos/entregues`
