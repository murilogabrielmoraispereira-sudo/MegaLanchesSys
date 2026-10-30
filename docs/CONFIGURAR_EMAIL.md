# Recuperacao de senha por e-mail

Configure estas variaveis no `.env` do servidor. Nao coloque credenciais SMTP no codigo, no painel ou no aplicativo.

```env
PUBLIC_URL=https://seu-dominio.com.br
SMTP_HOST=smtp.seu-provedor.com
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=usuario-smtp
SMTP_PASS=senha-ou-token-do-provedor
SMTP_FROM=Mega Lanches <nao-responda@seu-dominio.com.br>
ADMIN_PASSWORD_RESET_TTL_MS=1800000
ADMIN_PASSWORD_RESET_MAX_REQUESTS=3
```

- Porta `465`: use `SMTP_SECURE=1` para TLS desde o inicio.
- Porta `587`: use `SMTP_SECURE=0`; o servidor exige a atualizacao da conexao para TLS com STARTTLS.
- `PUBLIC_URL` precisa ser o endereco HTTPS publico do painel para o link do e-mail abrir corretamente.
- Prefira senha de aplicativo ou token SMTP. Nao use a senha principal da conta de e-mail quando o provedor oferecer uma credencial especifica.

Depois de reiniciar o servidor, abra `Configuracoes > Contas administrativas` e use `Testar e-mail`. O botao `Esqueci minha senha` aparece no login somente quando SMTP e URL publica estiverem configurados.

Os links de recuperacao:

- expiram em 30 minutos por padrao;
- podem ser usados somente uma vez;
- invalidam links anteriores da mesma conta;
- encerram todas as sessoes da conta depois da redefinicao;
- armazenam somente o hash do token no SQLite.
