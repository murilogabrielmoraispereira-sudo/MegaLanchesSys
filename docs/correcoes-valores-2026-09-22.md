# Correções de valores publicadas em 22/09/2026

As falhas reproduzidas na auditoria foram corrigidas e publicadas no VPS.

## Pedido confirmado

O proprietário confirmou o pedido 3021. A quantidade de mussarela foi corrigida de duas por lanche para duas no total:

- 2 Crispy × R$ 28,90 = R$ 57,80.
- 2 mussarelas × R$ 4 = R$ 8.
- Entrega = R$ 9.
- Total corrigido = **R$ 74,80**; total anterior R$ 82,80; diferença R$ 8.

A correção foi feita em transação com conferência do conteúdo original. O histórico em `admin_audit_log` contém os itens antes/depois e os dois totais. Os registros de impressão anteriores foram preservados; nenhuma reimpressão, mensagem ou devolução foi efetuada.

## Comportamentos corrigidos

- Novo adicional no app do atendente é total para o grupo de lanches. A opção por lanche é explícita e a tela mostra a quantidade total.
- O interpretador reconhece a quantidade total informada, mantém pedidos explícitos por lanche e reconhece mussarela mesmo com palavras de entrega no final.
- Editor do painel preserva escopo, produto, tipo e categoria. API do atendente preserva escopo total e por unidade.
- União de itens repetidos acumula adicionais totais e distingue observações/escopos.
- Calculador compartilhado entre navegador, servidor e impressão trata decimais, centavos, quantidades zero e descontos de modo consistente.
- Painel e relatório deduzem descontos; o relatório preserva frete zero.
- Checkout valida os preços do catálogo, adicionais, cupom e frete no servidor. Diferença entre o total exibido e o atual retorna os novos valores sem criar pedido; o cliente confere e confirma novamente.
- Site recebe a taxa de entrega da configuração do servidor.
- Nota mostra a quantidade total cobrada de cada adicional. A impressão não desconta duas vezes um subtotal oficial já líquido.

## Verificações

- 20 cenários da auditoria sem divergências.
- 10 testes de regressão e impressão aprovados no Windows e na cópia de teste Linux.
- 151 testes do app aprovados, incluindo o caso Crispy/mussarela.
- TypeScript aprovado na cópia de teste com tipos Node explícitos e na pasta publicada com a configuração original.
- Integração HTTP com banco novo e isolado: preço desatualizado retorna 409 sem gravar; pedido correto preserva os adicionais; cupom inválido, pagamento dividido incorreto e quantidade zero são rejeitados.
- Comparação dos arquivos originais por hash antes da implantação, sem sobrescrever alterações concorrentes.
- Site, `/pricing.js` e `/config` responderam HTTP 200 após publicação.

Backup dos arquivos anteriores e cópia consistente do banco:
`/root/deploy-backups/pricing-20260922-235645`.

O servidor e o Expo foram reiniciados. Para uma tela ou agente de impressão que já estava aberto no computador, recarregar/reabrir para carregar a versão nova. A impressão física não foi disparada como teste.
