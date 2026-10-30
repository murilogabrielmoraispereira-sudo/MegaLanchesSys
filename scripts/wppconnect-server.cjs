const fs = require("fs");
const path = require("path");
const {
  buildWppWebhookUrl,
  syncSessionWebhookFile,
} = require("../lib/wpp-webhook.cjs");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const envPath = path.join(PROJECT_ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const { initServer } = require("@wppconnect/server/dist/index.js");
const WPP_WEBHOOK_READ_MESSAGE =
  String(process.env.WPP_WEBHOOK_READ_MESSAGE || "0").trim() === "1";
const WPP_ALL_UNREAD_ON_START =
  String(process.env.WPP_ALL_UNREAD_ON_START || "0").trim() === "1";
const WPP_WEBHOOK_URL = buildWppWebhookUrl(process.env);
const WPP_PORT = String(process.env.WPP_PORT || "21465").trim();
const WPP_HOST = String(process.env.WPP_HOST || "0.0.0.0").trim();
const WPP_PROTOCOL_TIMEOUT_MS = Number(
  process.env.WPP_PROTOCOL_TIMEOUT_MS || 180000
);

const webhookSync = syncSessionWebhookFile({
  rootDir: PROJECT_ROOT,
  session: process.env.WPP_SESSION,
  webhookUrl: WPP_WEBHOOK_URL,
});
if (webhookSync.updated) {
  console.log("[WPPCONNECT] Webhook da sessao sincronizado.");
}

function findChromiumExecutable() {
  const fromEnv = String(
    process.env.WPP_CHROME_PATH ||
      process.env.CHROME_PATH ||
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      ""
  ).trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return "";
}

const chromiumPath = findChromiumExecutable();
const launchArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-zygote",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-sync",
  "--metrics-recording-only",
];

const puppeteerOptions = {
  protocolTimeout: Number.isFinite(WPP_PROTOCOL_TIMEOUT_MS)
    ? Math.max(WPP_PROTOCOL_TIMEOUT_MS, 60000)
    : 180000,
  args: launchArgs,
};

if (chromiumPath) {
  puppeteerOptions.executablePath = chromiumPath;
}

// @wppconnect/server can read process.env.PORT before serverOptions.port.
// Force both to the same value to avoid random port mismatch.
process.env.PORT = WPP_PORT;

initServer({
  host: WPP_HOST,
  port: Number(WPP_PORT),
  secretKey: process.env.WPP_SECRET_KEY || "megaSecret2026",
  startAllSession: false,
  webhook: {
    // Keep inbound messages wired after a VPS or WPPCONNECT process restart.
    url: WPP_WEBHOOK_URL || null,
    // false = webhook receives message without marking as read automatically
    readMessage: WPP_WEBHOOK_READ_MESSAGE,
    allUnreadOnStart: WPP_ALL_UNREAD_ON_START,
  },
  createOptions: {
    autoClose: 0,
    headless: true,
    puppeteerOptions,
  },
});
