const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildWppWebhookUrl,
  syncSessionWebhookFile,
} = require("../lib/wpp-webhook.cjs");

assert.equal(
  buildWppWebhookUrl({
    PUBLIC_URL: "https://megalanches-cardapio.com.br/",
    WPP_WEBHOOK_TOKEN: "abc 123",
  }),
  "https://megalanches-cardapio.com.br/webhook/wppconnect?token=abc%20123"
);
assert.equal(
  buildWppWebhookUrl({
    WPP_WEBHOOK_URL: "https://example.com/custom",
    PUBLIC_URL: "https://ignored.example",
  }),
  "https://example.com/custom"
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "mega-wpp-webhook-"));
try {
  fs.mkdirSync(path.join(root, "tokens"));
  const file = path.join(root, "tokens", "sessao.data.json");
  fs.writeFileSync(file, JSON.stringify({ config: { waitQrCode: false, webhook: "https://antigo" }, keep: true }));

  const result = syncSessionWebhookFile({
    rootDir: root,
    session: "sessao",
    webhookUrl: "https://novo/webhook?token=seguro",
  });
  assert.equal(result.updated, true);

  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(saved.config.webhook, "https://novo/webhook?token=seguro");
  assert.equal(saved.config.waitQrCode, false);
  assert.equal(saved.keep, true);

  assert.equal(
    syncSessionWebhookFile({
      rootDir: root,
      session: "sessao",
      webhookUrl: "https://novo/webhook?token=seguro",
    }).reason,
    "already_synced"
  );
  assert.equal(
    syncSessionWebhookFile({ rootDir: root, session: "../fora", webhookUrl: "https://novo" }).reason,
    "invalid_session"
  );
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("Webhook WPPCONNECT: todos os testes passaram.");
