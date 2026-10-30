module.exports = {
  apps: [
    {
      name: "mega-lanches",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
