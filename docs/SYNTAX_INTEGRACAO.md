# Inicio da integracao com o Syntax

## Fornecedor confirmado

- Empresa: Syntax Tecnologia, de Passos-MG.
- Site: https://www.syntaxti.com.br/
- Contato comercial: comercial@syntaxtecnologia.com.br
- Telefone informado no site: (16) 3112-4812
- Produtos relacionados: Syntax Plus, Food Service, Syntax Multi e aplicativo Syntax ePlus.

O aplicativo Syntax ePlus e descrito publicamente como capaz de criar pedidos sincronizados com o ERP Syntax e consultar produtos pelo codigo interno. Isso e um forte indicio de que existe um servico de sincronizacao, mesmo que a documentacao nao seja publica. O suporte deve confirmar se esse servico pode ser contratado ou liberado para integracoes de terceiros.

## Objetivo

Transformar um pedido confirmado no Mega Lanches em uma pre-venda ou venda no Syntax, acompanhar o resultado e guardar a referencia da NFC-e sem duplicar lancamentos.

## Fluxo planejado

1. Pedido e confirmado no Mega Lanches.
2. Uma fila local cria um evento com identificador unico do pedido.
3. O conector envia produtos, quantidades, descontos, entrega e pagamentos ao ambiente de homologacao do Syntax.
4. O Syntax devolve o identificador da pre-venda ou venda.
5. Depois da emissao, o Mega Lanches registra status, chave da NFC-e e eventual mensagem de erro.
6. Reenvios usam o mesmo identificador para impedir venda ou nota duplicada.

## Informacoes que devem ser solicitadas ao fornecedor

- Nome e versao exatos do produto Syntax contratado.
- Documentacao da API ou do modulo de integracao.
- URL do ambiente de homologacao.
- Forma de autenticacao e credencial de teste.
- Endpoint para cadastrar ou consultar produtos.
- Endpoint para criar pre-venda ou venda.
- Endpoint ou webhook para consultar NFC-e, cancelamento e erros.
- Regra de identificador externo/idempotencia.
- Codigos internos dos produtos, formas de pagamento, taxa de entrega e descontos.
- Caso nao exista API: leiaute oficial de importacao por arquivo e um arquivo real de exemplo sem dados sensiveis.
- Possibilidade de usar oficialmente o mesmo web service de sincronizacao utilizado pelo aplicativo Syntax ePlus.

## O que nao deve ser feito

- Escrever diretamente no banco de dados do Syntax sem autorizacao e documentacao do fornecedor.
- Automatizar cliques na tela do PDV como integracao definitiva.
- Emitir NFC-e diretamente em producao antes de homologacao e validacao do contador.
- Guardar token, certificado ou senha dentro de JavaScript publico ou do aplicativo celular.

## Proximo artefato necessario

Assim que a documentacao ou um exemplo oficial for fornecido, sera criado um adaptador isolado em `lib/integrations/syntax/`, com fila, idempotencia, modo de homologacao, logs e testes de contrato.
