# Alteracoes locais - 2026-06-26

Escopo: tudo foi feito somente em `D:\Usuario\Desktop\mega-lanches`.

## Regra da VPS

Nao houve SSH, SCP, deploy, PM2, Nginx, git push, publicacao ou escrita na VPS nesta tarefa.
A proibicao continua valida ate o usuario escrever exatamente: `pode atualizar a VPS agora`.

## Backups

- Backup tecnico antes das alteracoes: `backups/local-task-20260626-212646/arquivos-antes`
- Backup do layout atual: `backup-layout-atual`

Para restaurar o layout visual, copie de volta os arquivos dentro de `backup-layout-atual` para `public/`.
O arquivo `backup-layout-atual/COMO-RESTAURAR.md` tambem descreve o processo.

## Microfone do app atendente

O erro `Cannot find native module ExpoSpeechRecognition` acontece quando o app roda em um ambiente que nao tem o modulo nativo instalado/carregado, como Expo Go ou uma build antiga.
Agora o app nao quebra nesse caso: a tela usa `useSpeechInput`, que tenta carregar o modulo com seguranca e mostra mensagem clara se ele nao existir.

Arquivos:
- `atendente-app/src/services/speechRecognition.ts`
- `atendente-app/src/hooks/useSpeechInput.ts`
- `atendente-app/src/screens/NewOrderScreen.tsx`
- `atendente-app/src/services/speechRecognition.test.ts`

## Parser de pedidos

Melhorias locais:
- aliases dinamicos mais seguros a partir do cardapio;
- quantidade de adicionais, como `com 2 bacon e 3 ovo`;
- observacoes de corte/partir no item, como `partir ao meio`;
- preservacao dos testes ja existentes de unidade, retirada, telefone, endereco, obs e ambiguidade.

## Conferencia do atendente

A tela de conferencia agora permite ajustar a quantidade de adicionais ja selecionados, item por item, antes de confirmar.

## Adminn

Pedidos abertos e entregues sao renderizados do mais recente para o mais antigo.
A ordenacao e feita em copia local do array, sem regravar JSON nem mudar a fonte de dados.

## Tema Copa Brasil

Foi criado um tema reversivel no site:
- CSS: `public/themes/copa-brasil.css`
- guia: `public/themes/COMO-ATIVAR.md`
- botao no topo do site: `Tema Copa Brasil`

O estado fica salvo no navegador em `localStorage` com a chave `mega_lanches_theme`.

## Validacao local

Comandos executados:

```powershell
cd D:\Usuario\Desktop\mega-lanches\atendente-app
npm run typecheck
npm test -- --run

cd D:\Usuario\Desktop\mega-lanches
node --check server.js
node --check public/script.js
node --check public/adminn/app.js
```

Resultado final:
- TypeScript: passou
- Testes do atendente: 4 arquivos, 81 testes passaram
- Checks de sintaxe: passaram

