# Mega Lanches

Sistema do cardápio digital, painel administrativo, API de pedidos e aplicativo de atendimento.

## API e painel

Requisitos: Node.js 20 ou superior e npm.

```powershell
npm ci
npm start
```

Configure as credenciais de administração, serviços de mensagens, e-mail e impressão no ambiente local ou no gerenciador de segredos do servidor. Consulte `server.js` para os nomes das variáveis aceitas. Não coloque credenciais no código nem no Git.

O servidor cria o banco SQLite em `data/mega-lanches.db`. Esse banco contém dados operacionais e fica fora do repositório; use um backup separado para migrar os dados entre ambientes.

## App do atendente

O projeto Expo está em `atendente-app`:

```powershell
cd atendente-app
npm ci
npm start
```

Configure `EXPO_PUBLIC_API_URL` para apontar ao endereço da API. As instruções do aplicativo estão em `atendente-app/README.md`.

## Dados excluídos do Git

O `.gitignore` deixa fora do repositório bancos SQLite, credenciais, sessões do WhatsApp, uploads de clientes, arquivos de conversa, instaladores, arquivos de backup e dependências instaladas. Faça backup desses dados por um canal seguro, separado do código.
