# Temas do cardapio

O tema foi adicionado de forma local, reversivel e controlado pelo painel adminn.

- O cliente nao possui botao para trocar tema.
- O administrador altera em `adminn` na secao `Tema do cardapio`.
- O backend salva a chave `tema_cardapio` na tabela `configuracoes`.
- O cardapio publico le o valor em `/config` e aplica `body.theme-copa-brasil` quando o valor for `copa-brasil`.

Valores aceitos:

- `original`
- `copa-brasil`
- `chapa-fogo`

Para consultar no banco local:

```sql
SELECT valor FROM configuracoes WHERE chave = 'tema_cardapio';
```

Para voltar pelo painel, escolha `Tema original` e salve.
