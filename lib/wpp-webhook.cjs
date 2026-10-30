const fs = require("fs");
const path = require("path");

function buildWppWebhookUrl(env = process.env) {
  const explicit = String(env.WPP_WEBHOOK_URL || "").trim();
  if (explicit) return explicit;

  const publicUrl = String(env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!publicUrl) return "";

  const token = String(env.WPP_WEBHOOK_TOKEN || "").trim();
  return `${publicUrl}/webhook/wppconnect${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

function syncSessionWebhookFile({ rootDir = process.cwd(), session, webhookUrl } = {}) {
  const sessionName = String(session || "").trim();
  const url = String(webhookUrl || "").trim();
  if (!sessionName || !url) return { updated: false, reason: "missing_config" };
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
    return { updated: false, reason: "invalid_session" };
  }

  const file = path.join(rootDir, "tokens", `${sessionName}.data.json`);
  if (!fs.existsSync(file)) return { updated: false, reason: "file_not_found", file };

  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { updated: false, reason: "invalid_json", file };
  }

  if (!data || typeof data !== "object") data = {};
  if (!data.config || typeof data.config !== "object" || Array.isArray(data.config)) {
    data.config = {};
  }
  if (String(data.config.webhook || "") === url) {
    return { updated: false, reason: "already_synced", file };
  }

  data.config.webhook = url;
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporary, file);
  return { updated: true, reason: "synced", file };
}

module.exports = { buildWppWebhookUrl, syncSessionWebhookFile };
