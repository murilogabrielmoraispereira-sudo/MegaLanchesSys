module.exports = {
  apps: [
    {
      name: "atendente-expo",
      cwd: "/root/mega-lanches/atendente-app",
      script: "/root/mega-lanches/atendente-app/node_modules/.bin/expo",
      args: "start --tunnel --clear --port 8081",
      interpreter: "/root/.nvm/versions/node/v22.23.4/bin/node",
      cron_restart: "0 4 * * *",
      env: {
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "https://megalanches-cardapio.com.br",
      },
    },
  ],
};
