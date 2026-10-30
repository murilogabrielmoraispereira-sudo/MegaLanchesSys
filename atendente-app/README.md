# Mega Lanches Atendente

Aplicativo Android em React Native com Expo para registrar pedidos recebidos no balcao, telefone ou WhatsApp. O pedido passa pelo backend e entra na mesma tabela, fila e notinha dos pedidos do cardapio digital.

O projeto usa Expo SDK 58 e React Native 0.88. O Expo Go e o projeto precisam usar o mesmo SDK. No Android, instale o Expo Go compatível com SDK 58; se a Play Store ainda não oferecer essa versão, use [expo.dev/go](https://expo.dev/go).

## O que foi implementado

- Login do atendente usando o backend, sem senha embutida no aplicativo.
- Token Bearer armazenado com `expo-secure-store`.
- Cardapio e adicionais carregados da API atual.
- Interpretador local e deterministico de texto em portugues.
- Conferencia obrigatoria antes do envio.
- Edicao de quantidade, observacao, ingredientes removidos e adicionais.
- Busca e inclusao manual de produtos.
- Entrega, retirada, pagamento e troco.
- Deteccao de produto ambiguo ou nao identificado.
- Nome e telefone opcionais; pedidos de entrega exigem somente o endereco.
- Identificacao de retirada por nome ou pelos quatro ultimos digitos do telefone.
- Pesquisa de contatos recentes do WhatsApp sem criar outra conexao.
- Contadores de unidades agrupados pelas categorias reais do cardapio.
- Promocao do X-Tudo aplicada pela configuracao real do backend ao atingir a quantidade minima.
- Personalizacoes separadas por unidade, com copia, aplicacao em todas e reagrupamento.
- Aviso quando retirada e endereco aparecem na mesma frase.
- Bloqueio do botao durante o envio.
- `requestId` reutilizado em tentativas, impedindo pedido duplicado.
- Tela de sucesso com numero, cliente, total, horario e status.

## Alteracoes no backend

Foram adicionadas ao `server.js`:

- `POST /api/atendente/login`: valida e-mail e senha da conta administrativa e devolve um token temporario.
- `POST /api/atendente/logout`: encerra o token.
- `GET /api/atendente/catalogo`: devolve produtos, adicionais e taxa de entrega.
- `GET /api/atendente/contatos?final=4587`: pesquisa conversas recentes pelo final do telefone.
- `POST /api/atendente/pedidos/validar`: devolve itens e valores recalculados para a conferencia.
- `POST /api/atendente/pedidos`: valida e cria o pedido.
- `POST /api/atendente/pedidos/:id/notificacao`: reenvia somente a confirmacao de um pedido existente.
- Tabela `atendente_pedidos_idempotencia`: impede duplicacao por `requestId`.

O backend ignora precos enviados pelo celular. Produto, disponibilidade, preco, adicionais, ingredientes e taxa de entrega sao conferidos novamente no SQLite. O pedido e salvo com `origem_pedido = "atendente_app"` e usa o mesmo formato de carrinho:

O nome pode ficar vazio. Nesse caso, o backend grava `Cliente nao informado` para manter a notinha legivel. Para retirada, os quatro ultimos digitos podem pesquisar `bot_contatos` e `bot_conversas_pendentes`; nenhum numero e inventado ou completado pelo aplicativo.

```json
{
  "nome": "X-Tudo",
  "preco": 22,
  "qtd": 2,
  "adicionais": [{ "nome": "Bacon", "preco": 3, "qtd": 1 }],
  "removidos": ["Cebola"],
  "obs": "Caprichar no molho",
  "tipo": "item"
}
```

## Instalar

Requisitos: Node.js 20 ou superior e o backend Mega Lanches funcionando.

```powershell
cd atendente-app
npm install
Copy-Item .env.example .env
```

Edite `.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

Use o IP da maquina que executa o backend. Em celular fisico, `localhost` aponta para o proprio celular e nao funciona. Celular e computador devem estar na mesma rede para o teste local. Em producao, use a URL HTTPS do Mega Lanches.

## Iniciar com Expo

No iPhone, entre na mesma conta Expo no aplicativo Expo Go e no Expo CLI deste computador. Se o CLI ainda não estiver autenticado, execute `npx expo login` antes de iniciar o projeto.

Inicie primeiro o backend na raiz:

```powershell
node server.js
```

Em outro terminal:

```powershell
cd atendente-app
npm start
```

No Android, instale o Expo Go compatível com SDK 58. Se a Play Store estiver em outra versão, selecione SDK 58 em [expo.dev/go](https://expo.dev/go) e instale a versão indicada. Depois, leia o QR Code exibido. Para abrir um emulador Android configurado:

```powershell
npm run android
```

## Testes

```powershell
npm test
npm run typecheck
npx expo-doctor
```

Os testes cobrem quantidade, promocao real do X-Tudo, personalizacoes por unidade, remocoes, adicionais, retirada, pagamento, cliente, endereco, troco, erros de digitacao, produto inexistente e produto ambiguo.

## Gerar APK Android

1. Instale e autentique o EAS CLI:

```powershell
npm install --global eas-cli
eas login
```

2. Configure `EXPO_PUBLIC_API_URL` no ambiente `preview` do projeto no painel Expo/EAS.

3. Gere um APK interno:

```powershell
eas build --platform android --profile preview
```

O perfil `preview` de `eas.json` usa `buildType: "apk"`. O perfil `production` gera o formato de publicacao da loja.

## Exemplos aceitos

- `2 x-tudo e 1 coca 2 litros`
- `1 x-bacon sem cebola e sem milho`
- `dois x-salada, um normal e outro sem tomate`
- `1 x-burguer com adicional de bacon e ovo`
- `3 coca lata para retirada, pagamento pix`
- `1 x-tudo para Joao, entrega na Rua das Flores 120, dinheiro, troco para 100`
- `retirada 4587 2 x-tudo sem milho`
- `dois x-salada e tres coca lata rua das flores 80 pix`
- `2 x-tudo 1 sem milho mais bacon 1 sem tomate mais catupiry`
- `4 x-tudo 2 sem milho 1 mais bacon e 1 normal`

## Limitacoes atuais

- A entrada de pedido e feita somente por texto digitado.
- Frases muito vagas geram opcoes para o atendente escolher; o app nao adivinha silenciosamente.
- Enderecos fora do padrao com nome da via e numero podem precisar de correcao na conferencia.
- A busca pelos quatro digitos depende de o contato ter passado anteriormente pelo webhook atual do WhatsApp.
- Ingredientes e adicionais com erro aproximado sao sugeridos para conferencia, sem aplicacao silenciosa.
- O interpretador nao depende de API paga ou conexao com inteligencia artificial.

## Seguranca

- Nunca coloque senha no `.env` do aplicativo.
- `EXPO_PUBLIC_API_URL` e uma configuracao publica, nao um segredo.
- Nao envie para o Git as pastas `tokens`, `userDataDir`, `data`, `uploads`, logs ou arquivos `.env` do backend.
- Antes do deploy, configure `ADMIN_PASSWORD_HASH` e `ADMIN_PASSWORD_SALT` no backend em vez de manter senha simples.
