# E-mail, recuperacao de senha e 2FA

## O que existe hoje

O sistema ja possui recuperacao de senha por link de uso unico. Essa funcao depende de SMTP e nao e verificacao em duas etapas.

## Diferenca

- Recuperacao: usada somente quando a pessoa esquece a senha.
- Verificacao de e-mail: confirma que a conta realmente controla o endereco cadastrado.
- 2FA por e-mail: depois de acertar a senha, a pessoa precisa informar um codigo temporario recebido por e-mail.

## Ordem segura de implantacao

1. Configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`.
2. Configurar a URL publica correta do sistema.
3. Usar o botao "Testar envio" no painel e confirmar o recebimento.
4. Verificar o e-mail de cada conta administrativa.
5. Implementar e testar o desafio de codigo temporario, expiracao, limite de tentativas e codigos de recuperacao.
6. Somente depois habilitar o 2FA por conta.

Nunca deve ser usada a senha comum da caixa de e-mail no `.env`. Quando o provedor oferecer, deve ser usada uma senha de aplicativo ou credencial SMTP exclusiva.
