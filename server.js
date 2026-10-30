// ===================== IMPORTS =====================
import express from "express";
import crypto from "crypto";
import fs from "fs";
import fse from "fs-extra";
import path from "path";
import multer from "multer";
import Database from "better-sqlite3";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import {
  mensagemErroTelefoneBrasil,
  gerarVariantesWhatsappBrasil,
  normalizarTelefoneBrasil as normalizarTelefoneBrasilCore,
  normalizeCustomerPhone as normalizeCustomerPhoneCore,
  normalizePhoneNumber as normalizePhoneNumberCore,
} from "./lib/telefone-brasil.js";
import { avaliarRespostaEnvioWpp } from "./lib/wpp-response.js";
import {
  chooseActiveAliasCandidate,
  PARSER_LEARNING_POLICY,
  summarizeParserObservation,
} from "./lib/parser-learning.js";
import {
  buildProductInterestReport,
  summarizeCustomerPreferences,
} from "./lib/customer-marketing-learning.js";
import {
  buildLocalOrderSignals,
  detectLocalAiHabitChange,
  extractLocalAiTerms,
  incrementLocalAiCounter,
  localAiConfidence,
  localAiPredictionConfidence,
  normalizeLocalAiText,
  rankLocalAiCounter,
  scoreRecentLocalAiProducts,
} from "./lib/local-ai-learning.js";
import { applyXtudoPromotionPricing } from "./lib/promotion-pricing.js";
import { calculateCartSubtotal, separateOrderLevelComplements } from "./lib/cart-pricing.js";
import { priceCheckoutCart, couponDiscount } from "./lib/checkout-pricing.js";

// Corrige __dirname no formato ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===================== ENV LOCAL =====================
function loadEnvFile() {
  if (String(process.env.MEGA_SKIP_ENV_FILE || "").trim() === "1") return;
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    // Sempre prioriza o .env do projeto para evitar variaveis "presas" no PM2.
    process.env[key] = value;
  });
}
loadEnvFile();

const PORT = process.env.PORT || 3000;
const TEST_MODE = String(process.env.MEGA_TEST_MODE || "").trim() === "1";
const PUBLIC_URL_ENV = process.env.PUBLIC_URL || "";
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || "";
const ZAPI_TOKEN = process.env.ZAPI_TOKEN || "";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";
const ZAPI_WEBHOOK_TOKEN = process.env.ZAPI_WEBHOOK_TOKEN || "";
const WATI_API_ENDPOINT = process.env.WATI_API_ENDPOINT || "";
const WATI_TOKEN = process.env.WATI_TOKEN || "";
const WATI_WEBHOOK_TOKEN = process.env.WATI_WEBHOOK_TOKEN || "";
const WATI_CHANNEL_NUMBER = process.env.WATI_CHANNEL_NUMBER || "";
const WPP_BASE_URL = process.env.WPP_BASE_URL || "";
const WPP_SESSION = process.env.WPP_SESSION || "";
const WPP_TOKEN = process.env.WPP_TOKEN || "";
const WPP_WEBHOOK_TOKEN = process.env.WPP_WEBHOOK_TOKEN || "";
const WPP_AUTO_RECONNECT = String(process.env.WPP_AUTO_RECONNECT || "1").trim() === "1";
const WPP_AUTO_RECONNECT_COOLDOWN_MS = Math.max(
  Number(process.env.WPP_AUTO_RECONNECT_COOLDOWN_MS || 45 * 1000),
  10 * 1000
);
const WPP_AUTO_RECONNECT_ALERT_EVERY_MS = Math.max(
  Number(process.env.WPP_AUTO_RECONNECT_ALERT_EVERY_MS || 5 * 60 * 1000),
  60 * 1000
);
const BOT_ALERT_ATTENDANT_PHONE = process.env.BOT_ALERT_ATTENDANT_PHONE || "";
const BOT_ALERT_ATTENDANT_GROUP = process.env.BOT_ALERT_ATTENDANT_GROUP || "";
const BOT_ALERT_COOLDOWN_MS = Number(process.env.BOT_ALERT_COOLDOWN_MS || 5 * 60 * 1000);
const BOT_AUTO_REPLY_COOLDOWN_MS = Number(process.env.BOT_AUTO_REPLY_COOLDOWN_MS || 2 * 60 * 1000);
const BOT_SAUDACAO_COOLDOWN_MS = Number(process.env.BOT_SAUDACAO_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const BOT_REENGAGE_COOLDOWN_MS = Number(process.env.BOT_REENGAGE_COOLDOWN_MS || 4 * 60 * 60 * 1000);
const BOT_INBOUND_DEDUPE_MS = Number(process.env.BOT_INBOUND_DEDUPE_MS || 90 * 1000);
const BOT_WPP_MAX_MESSAGE_AGE_MS = Number(process.env.BOT_WPP_MAX_MESSAGE_AGE_MS || 12 * 60 * 1000);
const WHATSAPP_OUTBOX_INTERVAL_MS = Math.max(
  Number(process.env.WHATSAPP_OUTBOX_INTERVAL_MS || 15 * 1000),
  5 * 1000
);
const WHATSAPP_OUTBOX_MAX_ATTEMPTS = Math.max(
  Number(process.env.WHATSAPP_OUTBOX_MAX_ATTEMPTS || 8),
  1
);
const WHATSAPP_OUTBOX_BOT_TTL_MS = Math.max(
  Number(process.env.WHATSAPP_OUTBOX_BOT_TTL_MS || 20 * 60 * 1000),
  60 * 1000
);
const WHATSAPP_OUTBOX_PEDIDO_TTL_MS = Math.max(
  Number(process.env.WHATSAPP_OUTBOX_PEDIDO_TTL_MS || 24 * 60 * 60 * 1000),
  10 * 60 * 1000
);
const DEFAULT_DDD = process.env.DEFAULT_DDD || process.env.DDD_PADRAO || "35";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const IMPORTAR_PEDIDOS_JSON = String(process.env.IMPORTAR_PEDIDOS_JSON || "0").trim() === "1";
const WPP_WEBHOOK_EVENTOS_PERMITIDOS = new Set([
  "message",
  "onmessage",
]);

// ===================== AUTH ADMIN =====================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
const ADMIN_PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "";
const ADMIN_PASSWORD_ITER = Number(process.env.ADMIN_PASSWORD_ITER || 120000);
const ADMIN_SESSION_TTL_MS = Math.min(
  Math.max(Number(process.env.ADMIN_SESSION_TTL_MS || 2 * 60 * 60 * 1000), 10 * 60 * 1000),
  8 * 60 * 60 * 1000
);
const ADMIN_SESSION_IDLE_MS = Math.min(
  Math.max(Number(process.env.ADMIN_SESSION_IDLE_MS || 20 * 60 * 1000), 5 * 60 * 1000),
  ADMIN_SESSION_TTL_MS
);
const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_CSRF_COOKIE_NAME = "admin_csrf";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ADMIN_COOKIE_SECURE = String(
  process.env.ADMIN_COOKIE_SECURE || (IS_PRODUCTION ? "1" : "0")
).trim() === "1";
const adminSessions = new Map();
const atendenteLoginAttempts = new Map();
const ATENDENTE_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ATENDENTE_LOGIN_MAX_ATTEMPTS = 8;
const loginRateLimitBuckets = new Map();
const ADMIN_LOGIN_WINDOW_MS = Number(process.env.ADMIN_LOGIN_WINDOW_MS || 15 * 60 * 1000);
const ADMIN_LOGIN_MAX_ATTEMPTS = Number(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || 8);
const ADMIN_PASSWORD_MIN_LENGTH = Math.max(Number(process.env.ADMIN_PASSWORD_MIN_LENGTH || 12), 10);
const ADMIN_SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Math.max(Number(process.env.SMTP_PORT || 587), 1);
const SMTP_SECURE = String(process.env.SMTP_SECURE || (SMTP_PORT === 465 ? "1" : "0")).trim() === "1";
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "");
const SMTP_FROM = String(process.env.SMTP_FROM || SMTP_USER).trim();
const SYNTAX_API_URL = String(process.env.SYNTAX_API_URL || "").trim().replace(/\/+$/, "");
const SYNTAX_API_TOKEN = String(process.env.SYNTAX_API_TOKEN || "").trim();
const ADMIN_PASSWORD_RESET_TTL_MS = Math.max(
  Number(process.env.ADMIN_PASSWORD_RESET_TTL_MS || 30 * 60 * 1000),
  5 * 60 * 1000
);
const ADMIN_PASSWORD_RESET_MAX_REQUESTS = Math.max(
  Number(process.env.ADMIN_PASSWORD_RESET_MAX_REQUESTS || 3),
  1
);

if (!process.env.ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  console.warn("[AUTH] ADMIN_PASSWORD nao configurada. Usando senha padrao.");
}

function hashPassword(senha, salt) {
  return crypto.pbkdf2Sync(senha, salt, ADMIN_PASSWORD_ITER, 32, "sha256").toString("hex");
}

function verificarSenha(senha) {
  if (!senha) return false;
  if (ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_SALT) {
    const hash = hashPassword(senha, ADMIN_PASSWORD_SALT);
    if (hash.length !== ADMIN_PASSWORD_HASH.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(ADMIN_PASSWORD_HASH));
  }
  return senha === ADMIN_PASSWORD;
}

function normalizarEmailAdmin(email) {
  const valor = String(email || "").trim().toLowerCase();
  if (!valor || valor.length > 254) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) return "";
  return valor;
}

function validarNovaSenhaAdmin(senha) {
  const valor = String(senha || "");
  if (valor.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${ADMIN_PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (valor.length > 128) return "A senha deve ter no maximo 128 caracteres.";
  if (!/[a-z]/.test(valor) || !/[A-Z]/.test(valor) || !/\d/.test(valor) || !/[^A-Za-z0-9]/.test(valor)) {
    return "Use letra maiuscula, minuscula, numero e caractere especial.";
  }
  return "";
}

function criarHashSenhaAdmin(senha, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .scryptSync(String(senha || ""), salt, 64, ADMIN_SCRYPT_OPTIONS)
    .toString("hex");
  return { hash, salt, algoritmo: "scrypt-v1" };
}

function verificarHashSenhaAdmin(senha, usuario) {
  if (!senha || !usuario?.password_hash || !usuario?.password_salt) return false;
  try {
    const calculado = criarHashSenhaAdmin(senha, usuario.password_salt).hash;
    return timingSafeEqualString(calculado, usuario.password_hash);
  } catch {
    return false;
  }
}

function totalUsuariosAdmin() {
  return Number(db.prepare("SELECT COUNT(*) AS total FROM admin_users WHERE ativo = 1").get()?.total || 0);
}

function buscarUsuarioAdminPorEmail(email) {
  const emailNorm = normalizarEmailAdmin(email);
  if (!emailNorm) return null;
  return db.prepare(`
    SELECT id, nome, email, login_id, password_hash, password_salt, password_algo,
           role, ativo, failed_attempts, locked_until, created_at, updated_at, last_login_at
    FROM admin_users
    WHERE email = ?
  `).get(emailNorm) || null;
}

function buscarUsuarioAdminPorLoginId(loginId) {
  const id = String(loginId || "").trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return null;
  return db.prepare(`
    SELECT id, nome, email, login_id, password_hash, password_salt, password_algo,
           role, ativo, failed_attempts, locked_until, created_at, updated_at, last_login_at
    FROM admin_users
    WHERE login_id = ?
  `).get(id) || null;
}

function registrarFalhaUsuarioAdmin(usuario) {
  if (!usuario?.id) return;
  const lockAnterior = Date.parse(String(usuario.locked_until || ""));
  const falhasAnteriores = lockAnterior && lockAnterior <= Date.now()
    ? 0
    : Number(usuario.failed_attempts || 0);
  const falhas = falhasAnteriores + 1;
  const lockedUntil = falhas >= 5
    ? new Date(Date.now() + ADMIN_LOGIN_WINDOW_MS).toISOString()
    : null;
  db.prepare(`
    UPDATE admin_users
    SET failed_attempts = ?, locked_until = ?, updated_at = ?
    WHERE id = ?
  `).run(falhas, lockedUntil, new Date().toISOString(), usuario.id);
}

function criarUsuarioAdmin({ nome = "", email, senha, role = "admin" } = {}) {
  const emailNorm = normalizarEmailAdmin(email);
  const erroSenha = validarNovaSenhaAdmin(senha);
  if (!emailNorm) return { ok: false, error: "invalid_email", message: "Informe um e-mail valido." };
  if (erroSenha) return { ok: false, error: "weak_password", message: erroSenha };
  if (buscarUsuarioAdminPorEmail(emailNorm)) {
    return { ok: false, error: "email_exists", message: "Este e-mail ja esta cadastrado." };
  }
  const credencial = criarHashSenhaAdmin(senha);
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO admin_users
      (nome, email, login_id, password_hash, password_salt, password_algo, role, ativo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    String(nome || "Administrador").trim().slice(0, 100) || "Administrador",
    emailNorm,
    crypto.randomBytes(18).toString("base64url"),
    credencial.hash,
    credencial.salt,
    credencial.algoritmo,
    String(role || "admin").trim().toLowerCase() === "admin" ? "admin" : "operador",
    now,
    now
  );
  return { ok: true, user: buscarUsuarioAdminPorEmail(emailNorm), id: Number(info.lastInsertRowid) };
}

function smtpConfigurado() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM && getPublicUrl());
}

let smtpTransporter = null;
function getSmtpTransporter() {
  if (!smtpConfigurado()) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      requireTLS: !SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      connectionTimeout: 10 * 1000,
      greetingTimeout: 10 * 1000,
      socketTimeout: 15 * 1000,
    });
  }
  return smtpTransporter;
}

function escaparHtmlEmail(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function criarTokenRecuperacaoSenha(usuario, ip = "") {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_PASSWORD_RESET_TTL_MS).toISOString();
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE admin_password_reset_tokens
      SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL
    `).run(now.toISOString(), usuario.id);
    db.prepare(`
      INSERT INTO admin_password_reset_tokens
        (user_id, token_hash, requested_ip, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(usuario.id, tokenHash, String(ip || "").slice(0, 100), expiresAt, now.toISOString());
  });
  tx();
  return { token, tokenHash, expiresAt };
}

async function enviarEmailRecuperacaoSenha(usuario, token) {
  const transporter = getSmtpTransporter();
  if (!transporter) return { ok: false, error: "smtp_not_configured" };
  const baseUrl = getPublicUrl();
  if (!baseUrl) return { ok: false, error: "public_url_not_configured" };
  const fragment = new URLSearchParams({ token, email: usuario.email }).toString();
  const link = `${baseUrl}/adminn/reset-password.html#${fragment}`;
  const nome = String(usuario.nome || "Administrador").trim() || "Administrador";
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: usuario.email,
      subject: "Recuperacao de senha - Mega Lanches",
      text: [
        `Ola, ${nome}.`,
        "",
        "Recebemos uma solicitacao para redefinir sua senha do Mega Lanches.",
        `Abra este link: ${link}`,
        "",
        `O link expira em ${Math.round(ADMIN_PASSWORD_RESET_TTL_MS / 60000)} minutos e so pode ser usado uma vez.`,
        "Se voce nao solicitou, ignore este e-mail.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.55;">
          <h2>Recuperacao de senha</h2>
          <p>Ola, ${escaparHtmlEmail(nome)}.</p>
          <p>Recebemos uma solicitacao para redefinir sua senha do Mega Lanches.</p>
          <p><a href="${escaparHtmlEmail(link)}" style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;">Criar nova senha</a></p>
          <p>O link expira em ${Math.round(ADMIN_PASSWORD_RESET_TTL_MS / 60000)} minutos e so pode ser usado uma vez.</p>
          <p style="color:#667085;">Se voce nao solicitou, ignore este e-mail.</p>
        </div>
      `,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err?.code || err?.message || "smtp_error").slice(0, 160) };
  }
}

function limparTokensRecuperacaoSenha() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    DELETE FROM admin_password_reset_tokens
    WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < ?)
  `).run(limite, limite);
}

function criarSessao(usuario = null) {
  const now = Date.now();
  const token = crypto.randomBytes(32).toString("hex");
  const sessao = {
    exp: now + ADMIN_SESSION_TTL_MS,
    csrf: crypto.randomBytes(24).toString("hex"),
    createdAt: now,
    lastSeenAt: now,
    lastUserCheckAt: now,
    userId: Number(usuario?.id || 0) || null,
    email: normalizarEmailAdmin(usuario?.email || ""),
    role: String(usuario?.role || "admin").trim().toLowerCase() || "admin",
  };
  adminSessions.set(token, sessao);
  db.prepare(`
    INSERT INTO admin_sessions
      (token_hash, user_id, email, role, csrf_token, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.createHash("sha256").update(token).digest("hex"),
    sessao.userId,
    sessao.email,
    sessao.role,
    sessao.csrf,
    new Date(sessao.exp).toISOString(),
    new Date(sessao.createdAt).toISOString(),
    new Date(sessao.lastSeenAt).toISOString()
  );
  return token;
}

function getSessao(token) {
  if (!token) return null;
  let sessao = adminSessions.get(token);
  if (!sessao) {
    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    const row = db.prepare(`
      SELECT sessions.user_id, sessions.email, sessions.role, sessions.csrf_token,
             sessions.expires_at, sessions.created_at, sessions.last_seen_at
      FROM admin_sessions sessions
      LEFT JOIN admin_users users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
        AND sessions.revoked_at IS NULL
        AND sessions.expires_at > ?
        AND (sessions.user_id IS NULL OR users.ativo = 1)
    `).get(tokenHash, new Date().toISOString());
    if (!row) return null;
    sessao = {
      exp: Date.parse(row.expires_at),
      csrf: row.csrf_token,
      createdAt: Date.parse(row.created_at),
      lastSeenAt: Date.parse(row.last_seen_at || row.created_at),
      lastUserCheckAt: Date.now(),
      userId: Number(row.user_id || 0) || null,
      email: String(row.email || ""),
      role: String(row.role || "admin"),
    };
    adminSessions.set(token, sessao);
  }
  if (typeof sessao === "number") return { exp: sessao, csrf: "" };
  return sessao;
}

function revogarSessao(token) {
  if (!token) return;
  adminSessions.delete(token);
  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
  db.prepare(`
    UPDATE admin_sessions SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), tokenHash);
}

function revogarSessoesUsuario(userId) {
  const id = Number(userId || 0);
  if (!id) return;
  for (const [token, sessao] of adminSessions.entries()) {
    if (Number(sessao?.userId || 0) === id) adminSessions.delete(token);
  }
  db.prepare(`
    UPDATE admin_sessions SET revoked_at = ?
    WHERE user_id = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), id);
}

function limparSessoes() {
  const agora = Date.now();
  for (const [token, sessao] of adminSessions.entries()) {
    const exp = typeof sessao === "number" ? sessao : sessao?.exp;
    if (!exp || exp <= agora) adminSessions.delete(token);
  }
  db.prepare(`
    DELETE FROM admin_sessions
    WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)
  `).run(new Date(agora).toISOString(), new Date(agora - 24 * 60 * 60 * 1000).toISOString());
}
if (!TEST_MODE) setInterval(limparSessoes, 30 * 60 * 1000);

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const key = parts.shift().trim();
    const value = decodeURIComponent(parts.join("="));
    cookies[key] = value;
  });
  return cookies;
}

function getAdminToken(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies[ADMIN_COOKIE_NAME];
}

function sessaoValida(token) {
  const sessao = getSessao(token);
  const now = Date.now();
  if (!sessao?.exp || sessao.exp <= now || !sessao.lastSeenAt || sessao.lastSeenAt + ADMIN_SESSION_IDLE_MS <= now) {
    if (token) revogarSessao(token);
    return false;
  }
  if (sessao.userId && now - Number(sessao.lastUserCheckAt || 0) >= 60 * 1000) {
    const active = db.prepare("SELECT 1 FROM admin_users WHERE id = ? AND ativo = 1").get(sessao.userId);
    if (!active) {
      revogarSessao(token);
      return false;
    }
    sessao.lastUserCheckAt = now;
  }
  if (now - sessao.lastSeenAt >= 60 * 1000) {
    sessao.lastSeenAt = now;
    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    db.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
      .run(new Date(now).toISOString(), tokenHash);
  }
  return true;
}

function getCsrfToken(token) {
  return getSessao(token)?.csrf || "";
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || "desconhecido";
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function csrfValido(req, token) {
  const method = String(req.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  const esperado = getCsrfToken(token);
  if (!esperado) return false;
  const recebido = String(req.headers["x-csrf-token"] || req.body?._csrf || req.query?._csrf || "");
  return timingSafeEqualString(recebido, esperado);
}

function loginRateLimitBloqueado(tipo, chave, windowMs, maxTentativas) {
  const agora = Date.now();
  const key = `${tipo}:${chave}`;
  const atual = loginRateLimitBuckets.get(key);
  if (!atual || atual.inicio + windowMs <= agora) {
    loginRateLimitBuckets.delete(key);
    return false;
  }
  return atual.tentativas >= maxTentativas;
}

function registrarFalhaRateLimit(tipo, chave, windowMs) {
  const agora = Date.now();
  const key = `${tipo}:${chave}`;
  const atual = loginRateLimitBuckets.get(key);
  if (!atual || atual.inicio + windowMs <= agora) {
    loginRateLimitBuckets.set(key, { inicio: agora, tentativas: 1 });
    return;
  }
  atual.tentativas += 1;
}

function limparRateLimit(tipo, chave) {
  loginRateLimitBuckets.delete(`${tipo}:${chave}`);
}

function buildCookie(name, value, { maxAge, httpOnly = true } = {}) {
  const attrs = [
    `${name}=${encodeURIComponent(value || "")}`,
    "Path=/",
    "SameSite=Strict",
  ];
  if (Number.isFinite(Number(maxAge))) attrs.push(`Max-Age=${Math.max(Number(maxAge), 0)}`);
  if (httpOnly) attrs.push("HttpOnly");
  if (ADMIN_COOKIE_SECURE) attrs.push("Secure");
  return attrs.join("; ");
}

function getBearerToken(req) {
  const header = String(req.headers.authorization || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireAtendente(req, res, next) {
  const token = getBearerToken(req);
  if (token && sessaoValida(token)) {
    req.authUser = getSessao(token);
    return next();
  }
  return res.status(401).json({ success: false, error: "unauthorized" });
}

function requireAtendenteAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (token && sessaoValida(token)) {
    req.authUser = getSessao(token);
    return next();
  }
  return res.status(403).json({ success: false, error: "permissao_cardapio" });
}

function atendenteLoginBloqueado(chave) {
  const agora = Date.now();
  const atual = atendenteLoginAttempts.get(chave);
  if (!atual || atual.inicio + ATENDENTE_LOGIN_WINDOW_MS <= agora) {
    atendenteLoginAttempts.delete(chave);
    return false;
  }
  return atual.tentativas >= ATENDENTE_LOGIN_MAX_ATTEMPTS;
}

function registrarFalhaLoginAtendente(chave) {
  const agora = Date.now();
  const atual = atendenteLoginAttempts.get(chave);
  if (!atual || atual.inicio + ATENDENTE_LOGIN_WINDOW_MS <= agora) {
    atendenteLoginAttempts.set(chave, { inicio: agora, tentativas: 1 });
    return;
  }
  atual.tentativas += 1;
}

function setAuthCookie(res, token) {
  res.setHeader("Set-Cookie", [
    buildCookie(ADMIN_COOKIE_NAME, token, { httpOnly: true }),
    buildCookie(ADMIN_CSRF_COOKIE_NAME, getCsrfToken(token), { httpOnly: false }),
  ]);
}

function clearAuthCookie(res) {
  res.setHeader("Set-Cookie", [
    buildCookie(ADMIN_COOKIE_NAME, "", { maxAge: 0, httpOnly: true }),
    buildCookie(ADMIN_CSRF_COOKIE_NAME, "", { maxAge: 0, httpOnly: false }),
  ]);
}

function requireAdmin(req, res, next) {
  const token = getAdminToken(req);
  if (token && sessaoValida(token)) {
    if (!csrfValido(req, token)) {
      return res.status(403).json({ success: false, error: "csrf_invalid" });
    }
    req.authUser = getSessao(token);
    return next();
  }
  if (token) clearAuthCookie(res);
  const accept = req.headers.accept || "";
  if (accept.includes("text/html")) return res.redirect(302, "/adminn/login.html");
  return res.status(401).json({ success: false, error: "unauthorized" });
}

function adminGate(req, res, next) {
  const routePath = String(req.originalUrl || req.baseUrl || req.path || req.url || "")
    .split("?")[0]
    .trim();
  const openPaths = new Set([
    "/login.html",
    "/login.js",
    "/reset-password.html",
    "/reset-password.js",
    "/indexadmin.css",
    "/login.css",
    "/neo-admin.css",
  ]);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  if (openPaths.has(req.path)) return next();
  if (req.path === "/login" && req.method === "POST") return next();
  if (req.path === "/register" && req.method === "POST") return next();
  if (req.path === "/auth/setup-status" && req.method === "GET") return next();
  if (req.path === "/auth/accounts" && req.method === "GET") return next();
  if (req.path === "/password/forgot" && req.method === "POST") return next();
  if (req.path === "/password/reset" && req.method === "POST") return next();
  if (routePath.endsWith("/adminn/print/next") && req.method === "GET") {
    if (checkPrintAgentAuth(req)) return next();
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
  if (routePath.endsWith("/adminn/print/ack") && req.method === "POST") {
    if (checkPrintAgentAuth(req)) return next();
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
  return requireAdmin(req, res, next);
}

// ===================== MIDDLEWARE =====================
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  next();
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    const duracao = Date.now() - inicio;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duracao}ms`);
  });
  next();
});

const ADMIN_LEGACY_REDIRECTS = new Map([
  ["/admin.html", "/adminn/admin.html"],
  ["/painel.html", "/adminn/painel.html"],
  ["/login.html", "/adminn/login.html"],
  ["/atendimento.html", "/adminn/atendimento.html"],
  ["/conversas.html", "/adminn/conversas.html"],
  ["/relatorio.html", "/adminn/relatorio.html"],
  ["/estoque.html", "/adminn/estoque.html"],
  ["/entregadores.html", "/adminn/entregadores.html"],
  ["/marketing.html", "/adminn/marketing.html"],
  ["/ia-local.html", "/adminn/ia-local.html"],
  ["/config.html", "/adminn/config.html"],
  ["/app.html", "/adminn/app.html"],
]);

app.get(["/adminn", "/adminn/"], (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(302, "/adminn/painel.html");
});

app.get(Array.from(ADMIN_LEGACY_REDIRECTS.keys()), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.redirect(302, ADMIN_LEGACY_REDIRECTS.get(req.path) || "/adminn/painel.html");
});

app.use("/adminn", adminGate);
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===================== CONFIGURACAO DO UPLOAD =====================
function sanitizeUploadFilename(filename) {
  const parsed = path.parse(path.basename(String(filename || "arquivo")));
  const base = parsed.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "arquivo";
  const ext = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 12);
  return `${Date.now()}-${base}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, sanitizeUploadFilename(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 8 * 1024 * 1024) },
});

// ===================== ARQUIVOS DE DADOS (LEGADO) =====================
const pedidosFile = path.join(__dirname, "pedidos.json");
const pedidosEntreguesFile = path.join(__dirname, "pedidosEntregues.json");
const cardapioFile = path.join(__dirname, "public", "cardapio.json");
const adicionaisFile = path.join(__dirname, "public", "adicionais.json");
const entregadoresFile = path.join(__dirname, "entregadores.json");
const TEMAS_CARDAPIO = new Set([
  "original",
  "copa-brasil",
  "chapa-fogo",
  "diner-retro",
  "neon-noturno",
  "fliperama-90",
  "rota-66",
  "boteco-raiz",
  "aranha-urbana",
]);

// ===================== BANCO DE DADOS =====================
const dataDir = process.env.MEGA_DATA_DIR
  ? path.resolve(process.env.MEGA_DATA_DIR)
  : path.join(__dirname, "data");
fse.ensureDirSync(dataDir);
const dbPath = path.join(dataDir, "mega-lanches.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

try { db.prepare("ALTER TABLE pedidos ADD COLUMN cupom TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE pedidos ADD COLUMN desconto REAL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE pedidos ADD COLUMN taxa_entrega REAL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE pedidos ADD COLUMN origem_pedido TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE pedidos ADD COLUMN pagamento_detalhes TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE combos ADD COLUMN img TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE print_jobs ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE print_jobs ADD COLUMN picked_at TEXT").run(); } catch {}
try { db.prepare("ALTER TABLE admin_users ADD COLUMN login_id TEXT").run(); } catch {}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cardapio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria TEXT NOT NULL,
      ingredientes TEXT,
      img TEXT,
      disponivel INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adicionais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entregadores (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_bloqueios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT NOT NULL UNIQUE,
      ativo INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT NOT NULL UNIQUE,
      ultimo_texto TEXT,
      last_msg_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_conversas_pendentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canal TEXT NOT NULL,
      telefone TEXT NOT NULL,
      nome TEXT,
      mensagem TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'novo',
      mensagens_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_bot_conversas_pendentes_status_updated
      ON bot_conversas_pendentes(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bot_conversas_pendentes_telefone
      ON bot_conversas_pendentes(telefone, status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS bot_mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      palavras_chave TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bot_mensagens_ativo_ordem
      ON bot_mensagens(ativo, ordem, id);

    CREATE TABLE IF NOT EXISTS bot_respostas_cooldown (
      telefone TEXT NOT NULL,
      tipo TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      PRIMARY KEY (telefone, tipo)
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY,
      cliente TEXT,
      telefone TEXT,
      endereco TEXT,
      tipoEntrega TEXT,
      origem_pedido TEXT,
      pagamento TEXT,
      pagamento_detalhes TEXT,
      troco TEXT,
      chavePix TEXT,
      carrinho TEXT,
      obsGeral TEXT,
      status TEXT NOT NULL,
      entregador TEXT,
      entregueEm TEXT,
      saiuParaEntrega TEXT,
      created_at TEXT NOT NULL,
      cupom TEXT,
      desconto REAL DEFAULT 0,
      taxa_entrega REAL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL,
      valor REAL NOT NULL,
      minimo REAL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      expira_em TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      itens TEXT NOT NULL,
      preco REAL NOT NULL,
      img TEXT,
      ativo INTEGER DEFAULT 0,
      sugestao INTEGER DEFAULT 1,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS produto_interacoes_diarias (
      data TEXT NOT NULL,
      produto_id TEXT NOT NULL,
      produto_nome TEXT NOT NULL,
      categoria TEXT,
      visitante_id TEXT NOT NULL,
      visualizacoes INTEGER NOT NULL DEFAULT 0,
      adicoes_carrinho INTEGER NOT NULL DEFAULT 0,
      primeira_interacao TEXT NOT NULL,
      ultima_interacao TEXT NOT NULL,
      PRIMARY KEY (data, produto_id, visitante_id)
    );
    CREATE INDEX IF NOT EXISTS idx_produto_interacoes_data
      ON produto_interacoes_diarias(data, produto_id);

    CREATE TABLE IF NOT EXISTS print_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      picked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS atendente_pedidos_idempotencia (
      request_id TEXT PRIMARY KEY,
      pedido_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedido_notificacoes_cliente (
      pedido_id INTEGER NOT NULL,
      etapa TEXT NOT NULL,
      canal TEXT NOT NULL DEFAULT 'whatsapp',
      telefone TEXT,
      sent_at TEXT NOT NULL,
      PRIMARY KEY (pedido_id, etapa)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dedupe_key TEXT NOT NULL UNIQUE,
      canal TEXT NOT NULL DEFAULT 'wppconnect',
      telefone TEXT NOT NULL,
      fallback_telefone TEXT,
      mensagem TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'auto',
      pedido_id INTEGER,
      etapa TEXT,
      cooldown_telefone TEXT,
      cooldown_tipo TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sent_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_processar
      ON whatsapp_outbox(status, next_attempt_at, id);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_pedido
      ON whatsapp_outbox(pedido_id, etapa);

    CREATE TABLE IF NOT EXISTS pedido_status_historico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      status_anterior TEXT,
      status_novo TEXT NOT NULL,
      ator TEXT NOT NULL DEFAULT 'sistema',
      canal TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pedido_status_historico_pedido
      ON pedido_status_historico(pedido_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ator TEXT NOT NULL DEFAULT 'admin',
      acao TEXT NOT NULL,
      entidade TEXT,
      entidade_id TEXT,
      ip TEXT,
      user_agent TEXT,
      detalhe TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
      ON admin_audit_log(created_at DESC);

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      login_id TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_algo TEXT NOT NULL DEFAULT 'scrypt-v1',
      role TEXT NOT NULL DEFAULT 'admin',
      ativo INTEGER NOT NULL DEFAULT 1,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_users_email
      ON admin_users(email);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      csrf_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_user
      ON admin_sessions(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
      ON admin_sessions(expires_at, revoked_at);

    CREATE TABLE IF NOT EXISTS admin_password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      requested_ip TEXT,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_admin_password_reset_user
      ON admin_password_reset_tokens(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_password_reset_expiry
      ON admin_password_reset_tokens(expires_at, used_at);

    CREATE TABLE IF NOT EXISTS atendente_parser_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      termo_normalizado TEXT NOT NULL,
      termo_exibicao TEXT NOT NULL,
      produto_id TEXT NOT NULL,
      produto_nome TEXT NOT NULL,
      confirmacoes INTEGER NOT NULL DEFAULT 0,
      usos INTEGER NOT NULL DEFAULT 0,
      acertos INTEGER NOT NULL DEFAULT 0,
      erros INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      ativo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (termo_normalizado, produto_id)
    );
    CREATE INDEX IF NOT EXISTS idx_parser_aliases_ativo_produto
      ON atendente_parser_aliases(ativo, produto_id, confirmacoes DESC);

    CREATE TABLE IF NOT EXISTS atendente_parser_observacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_hash TEXT NOT NULL UNIQUE,
      ator TEXT NOT NULL DEFAULT 'atendente',
      itens_iniciais TEXT NOT NULL,
      itens_finais TEXT NOT NULL,
      unidades_iniciais INTEGER NOT NULL DEFAULT 0,
      unidades_finais INTEGER NOT NULL DEFAULT 0,
      modificadores_iniciais INTEGER NOT NULL DEFAULT 0,
      modificadores_finais INTEGER NOT NULL DEFAULT 0,
      ambiguidades INTEGER NOT NULL DEFAULT 0,
      nao_identificados INTEGER NOT NULL DEFAULT 0,
      avisos INTEGER NOT NULL DEFAULT 0,
      corrigido INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_parser_observacoes_created
      ON atendente_parser_observacoes(created_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_orders (
      order_id INTEGER PRIMARY KEY,
      telefone TEXT,
      source_hash TEXT NOT NULL,
      processed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_orders_processed
      ON local_ai_orders(processed_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL UNIQUE,
      telefone TEXT NOT NULL,
      nome TEXT,
      texto TEXT NOT NULL,
      received_at TEXT NOT NULL,
      processed_at TEXT,
      linked_order_id INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_messages_pending
      ON local_ai_messages(processed_at, received_at);
    CREATE INDEX IF NOT EXISTS idx_local_ai_messages_phone
      ON local_ai_messages(telefone, received_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_customer_profiles (
      telefone TEXT PRIMARY KEY,
      nome TEXT,
      endereco TEXT,
      orders_count INTEGER NOT NULL DEFAULT 0,
      messages_count INTEGER NOT NULL DEFAULT 0,
      total_spent REAL NOT NULL DEFAULT 0,
      products_json TEXT NOT NULL DEFAULT '{}',
      additions_json TEXT NOT NULL DEFAULT '{}',
      removals_json TEXT NOT NULL DEFAULT '{}',
      payments_json TEXT NOT NULL DEFAULT '{}',
      fulfillment_json TEXT NOT NULL DEFAULT '{}',
      hours_json TEXT NOT NULL DEFAULT '{}',
      weekdays_json TEXT NOT NULL DEFAULT '{}',
      terms_json TEXT NOT NULL DEFAULT '{}',
      first_seen_at TEXT,
      last_seen_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_profiles_orders
      ON local_ai_customer_profiles(orders_count DESC, last_seen_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_product_stats (
      product_key TEXT PRIMARY KEY,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_ai_product_pairs (
      product_a_key TEXT NOT NULL,
      product_a_name TEXT NOT NULL,
      product_b_key TEXT NOT NULL,
      product_b_name TEXT NOT NULL,
      orders_count INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (product_a_key, product_b_key)
    );

    CREATE TABLE IF NOT EXISTS local_ai_term_products (
      term TEXT NOT NULL,
      product_key TEXT NOT NULL,
      product_name TEXT NOT NULL,
      hits INTEGER NOT NULL DEFAULT 0,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (term, product_key)
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_terms_hits
      ON local_ai_term_products(hits DESC, last_seen_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_customer_product_events (
      order_id INTEGER NOT NULL,
      telefone TEXT NOT NULL,
      product_key TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      occurred_at TEXT NOT NULL,
      PRIMARY KEY (order_id, product_key)
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_customer_product_events_phone
      ON local_ai_customer_product_events(telefone, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS local_ai_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT NOT NULL,
      source_hash TEXT NOT NULL UNIQUE,
      predicted_products TEXT NOT NULL,
      profile TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      evaluated_at TEXT,
      matched_products TEXT,
      hit INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_local_ai_predictions_pending
      ON local_ai_predictions(telefone, evaluated_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS caixa_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_caixa TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('abertura', 'reforco', 'sangria')),
      valor REAL NOT NULL,
      descricao TEXT,
      ator TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_data
      ON caixa_movimentos(data_caixa, created_at DESC);

    CREATE TABLE IF NOT EXISTS caixa_fechamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_caixa TEXT NOT NULL UNIQUE,
      saldo_informado REAL NOT NULL,
      observacao TEXT,
      fechado_por TEXT,
      fechado_em TEXT NOT NULL,
      reaberto_em TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS syntax_sync_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      external_id TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_syntax_jobs_status_updated
      ON syntax_sync_jobs(status, updated_at);

    CREATE TABLE IF NOT EXISTS estoque_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
      categoria TEXT NOT NULL DEFAULT 'ingrediente',
      unidade TEXT NOT NULL DEFAULT 'un',
      quantidade REAL NOT NULL DEFAULT 0,
      minimo REAL NOT NULL DEFAULT 0,
      auto_baixa INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_estoque_baixo ON estoque_itens(quantidade, minimo);

    CREATE TABLE IF NOT EXISTS estoque_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      quantidade REAL NOT NULL,
      motivo TEXT,
      referencia TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES estoque_itens(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_estoque_mov_item ON estoque_movimentos(item_id, created_at);
  `);
}

function slugify(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizarSlugCategoria(slug) {
  const valor = slugify(slug);
  if (["bebida", "bebidas", "refrigerantes"].includes(valor)) return "refrigerante";
  return valor;
}

function ensureCategorias() {
  const total = db.prepare("SELECT COUNT(*) as total FROM categorias").get().total;
  if (total > 0) return;
  const padrao = [
    { slug: "promocao", nome: "Promocao" },
    { slug: "hamburguer", nome: "Hamburguer" },
    { slug: "frango", nome: "Frango" },
    { slug: "lombo", nome: "Lombo" },
    { slug: "refrigerante", nome: "Bebidas" },
  ];
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO categorias (slug, nome, ativo, order_index, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  padrao.forEach((cat, idx) => {
    insert.run(cat.slug, cat.nome, 1, idx, now);
  });
}

function ensureCategoriaPromocao() {
  const existe = db.prepare("SELECT 1 FROM categorias WHERE slug = 'promocao'").get();
  if (existe) return;
  const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) as max FROM categorias").get().max;
  db.prepare(`
    INSERT INTO categorias (slug, nome, ativo, order_index, created_at)
    VALUES ('promocao', 'Promocao', 1, ?, ?)
  `).run(Math.max(0, max + 1), new Date().toISOString());
}

function ensureCategoriaBebidasNome() {
  const rows = db.prepare(`
    SELECT id, slug, order_index
    FROM categorias
    WHERE slug IN ('refrigerante', 'refrigerantes', 'bebida', 'bebidas')
    ORDER BY CASE WHEN slug = 'refrigerante' THEN 0 ELSE 1 END, order_index, id
  `).all();
  const tx = db.transaction(() => {
    let principal = rows[0] || null;
    if (!principal) {
      const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) AS max FROM categorias").get().max;
      const info = db.prepare(`
        INSERT INTO categorias (slug, nome, ativo, order_index, created_at)
        VALUES ('refrigerante', 'Bebidas', 1, ?, ?)
      `).run(max + 1, new Date().toISOString());
      principal = { id: Number(info.lastInsertRowid), slug: "refrigerante" };
    }
    rows.filter((row) => row.id !== principal.id).forEach((row) => {
      db.prepare("DELETE FROM categorias WHERE id = ?").run(row.id);
    });
    db.prepare("UPDATE categorias SET slug = 'refrigerante', nome = 'Bebidas', ativo = 1 WHERE id = ?")
      .run(principal.id);
    db.prepare(`
      UPDATE cardapio SET categoria = 'refrigerante'
      WHERE categoria IN ('bebida', 'bebidas', 'refrigerantes')
    `).run();
  });
  tx();
}

function ensureEstoqueSchema() {
  const cols = db.prepare("PRAGMA table_info(estoque_itens)").all().map((c) => c.name);
  if (!cols.includes("categoria")) {
    db.exec("ALTER TABLE estoque_itens ADD COLUMN categoria TEXT NOT NULL DEFAULT 'ingrediente'");
  }
}

function lerArquivo(arquivo) {
  if (!fs.existsSync(arquivo)) fs.writeFileSync(arquivo, "[]");
  try {
    return JSON.parse(fs.readFileSync(arquivo));
  } catch (err) {
    console.error(`Erro ao ler ${arquivo}:`, err);
    return [];
  }
}

function parseMaybeJson(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor !== "string") return valor;
  const texto = valor.trim();
  if (!texto) return valor;
  if (!texto.startsWith("[") && !texto.startsWith("{")) return valor;
  try {
    return JSON.parse(texto);
  } catch {
    return valor;
  }
}

function normalizarIngredientes(ingredientes) {
  if (ingredientes === null || ingredientes === undefined) return null;
  if (typeof ingredientes === "string") return ingredientes;
  return JSON.stringify(ingredientes);
}

function ensureAdminLoginIds() {
  const rows = db.prepare("SELECT id FROM admin_users WHERE login_id IS NULL OR trim(login_id) = ''").all();
  const update = db.prepare("UPDATE admin_users SET login_id = ?, updated_at = ? WHERE id = ?");
  const tx = db.transaction(() => {
    rows.forEach((row) => {
      update.run(crypto.randomBytes(18).toString("base64url"), new Date().toISOString(), row.id);
    });
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_login_id ON admin_users(login_id)");
  });
  tx();
}

function textoCardapioTemPureBatata(nome = "", ingredientes = "") {
  const textoIngredientes = Array.isArray(ingredientes)
    ? ingredientes.join(" ")
    : String(ingredientes || "");
  const combinado = normalizarTextoBusca(`${nome} ${textoIngredientes}`);
  if (!combinado) return false;
  return combinado.includes("pure de batata") || (combinado.includes("pure") && combinado.includes("batata"));
}

function listarItensPureBatata() {
  return db
    .prepare("SELECT id, nome, ingredientes, disponivel FROM cardapio")
    .all()
    .filter((row) => {
      const ingredientes = parseMaybeJson(row.ingredientes);
      return textoCardapioTemPureBatata(row.nome, ingredientes);
    });
}

function desativarPureBatata() {
  const itens = listarItensPureBatata();
  const update = db.prepare("UPDATE cardapio SET disponivel = 0 WHERE id = ?");
  const tx = db.transaction((lista) => {
    lista.forEach((item) => {
      update.run(item.id);
    });
  });
  tx(itens);
  setConfigValue("pure_batata_desativado", "1");
  return { desativado: true, alterados: itens.length, restaurados: 0 };
}

function reativarPureBatata() {
  const itens = listarItensPureBatata();
  const update = db.prepare("UPDATE cardapio SET disponivel = 1 WHERE id = ?");
  const tx = db.transaction((lista) => {
    lista.forEach((item) => {
      update.run(item.id);
    });
  });
  tx(itens);
  setConfigValue("pure_batata_desativado", "0");
  return { desativado: false, alterados: itens.length, restaurados: itens.length };
}

function sincronizarPureBatataAtivo() {
  if (!getConfigBoolean("pure_batata_desativado", false)) {
    return { desativado: false, alterados: 0 };
  }
  const itens = listarItensPureBatata();
  if (!itens.length) return { desativado: true, alterados: 0 };
  const update = db.prepare("UPDATE cardapio SET disponivel = 0 WHERE id = ?");
  const tx = db.transaction((lista) => {
    lista.forEach((item) => {
      update.run(item.id);
    });
  });
  tx(itens);
  return { desativado: true, alterados: itens.length };
}

function getEstadoPureBatata() {
  const itens = listarItensPureBatata();
  return {
    desativado: getConfigBoolean("pure_batata_desativado", false),
    quantidade: itens.length,
    nomes: itens.map((item) => String(item.nome || "").trim()).filter(Boolean),
  };
}

function normalizarCarrinho(carrinho) {
  if (!carrinho) return "[]";
  if (typeof carrinho === "string") return carrinho;
  return JSON.stringify(carrinho);
}

function toNumber(valor, fallback = 0) {
  if (typeof valor === "string") {
    const limpo = valor.replace(/[^\d,.-]/g, "").trim();
    if (!limpo) return fallback;
    const normalizado = limpo.includes(",")
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo;
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function temNumeroInformado(valor) {
  if (valor === null || typeof valor === "undefined") return false;
  if (typeof valor === "string") return valor.trim() !== "";
  return Number.isFinite(Number(valor));
}

function normalizarOrigemPedido(valor) {
  const origem = String(valor || "").trim().toLowerCase();
  if (!origem) return "";
  const validas = new Set(["porta", "telefone", "whatsapp", "site", "atendente_app", "outro"]);
  return validas.has(origem) ? origem : "outro";
}

function pedidoEhRetiradaLocal(tipoEntrega = "", origemPedido = "") {
  const tipo = normalizarTextoBusca(tipoEntrega);
  const origem = normalizarTextoBusca(origemPedido);
  return (
    tipo.includes("retirada") ||
    tipo.includes("porta") ||
    tipo.includes("balcao") ||
    origem.includes("porta")
  );
}

function pedidoEhEntrega(tipoEntrega = "", origemPedido = "") {
  const tipo = normalizarTextoBusca(tipoEntrega);
  if (pedidoEhRetiradaLocal(tipoEntrega, origemPedido)) return false;
  if (!tipo) return true;
  return tipo.includes("entrega");
}

function statusExigeEntregador(status = "") {
  const statusNorm = String(status || "").trim().toLowerCase();
  return statusNorm === "em_entrega" || statusNorm === "entregue";
}

function entregadorObrigatorioParaPedido({ tipoEntrega = "", origemPedido = "", status = "" } = {}) {
  return statusExigeEntregador(status) && pedidoEhEntrega(tipoEntrega, origemPedido);
}

function normalizarPagamentosDetalhes(entrada) {
  const listaBase = Array.isArray(entrada)
    ? entrada
    : Array.isArray(parseMaybeJson(entrada))
      ? parseMaybeJson(entrada)
      : [];
  const validos = new Set(["pix", "dinheiro", "cartao"]);
  return listaBase
    .map((item) => ({
      metodo: String(item?.metodo || "").trim(),
      valor: toNumber(item?.valor, 0),
    }))
    .filter((item) => {
      const m = item.metodo.toLowerCase();
      return validos.has(m) && item.valor > 0;
    });
}

function montarTextoPagamento(pagamentoPrincipal, detalhes = []) {
  const principal = String(pagamentoPrincipal || "").trim();
  if (!detalhes.length) return principal;
  if (detalhes.length === 1) return detalhes[0].metodo;
  const resumo = detalhes
    .map((item) => `${item.metodo} R$ ${formatarDinheiro(item.valor)}`)
    .join(" + ");
  return `Dividido (${resumo})`;
}

function somaPagamentosDetalhes(detalhes = []) {
  return (Array.isArray(detalhes) ? detalhes : []).reduce(
    (acc, item) => acc + toNumber(item?.valor, 0),
    0
  );
}

function obterAtorAdmin(req) {
  const sessao = req?.authUser || getSessao(getAdminToken(req)) || getSessao(getBearerToken(req));
  const base = String(sessao?.email || (sessao?.userId ? `usuario-${sessao.userId}` : "admin"));
  return base.slice(0, 80);
}

function aplicarPromocaoXtudoCarrinho(carrinho) {
  return applyXtudoPromotionPricing(Array.isArray(carrinho) ? carrinho : [], {
    minimum: getConfigValue("promo_xtudo_min_qtd", "2"),
    unitPrice: getConfigValue("promo_xtudo_preco_unidade", "22"),
    promotionalPrice: getConfigValue("promo_xtudo_preco_combo", "20"),
  });
}

function normalizarEscopoAdicionaisCarrinho(carrinho) {
  return (Array.isArray(carrinho) ? carrinho : []).map((item) => ({
    ...item,
    adicionais: (Array.isArray(item?.adicionais) ? item.adicionais : []).map((add) => {
      if (!add || typeof add !== "object") return add;
      const informado = String(add.escopo || "").trim().toLowerCase();
      return { ...add, escopo: informado === "total" ? "total" : "unidade" };
    }),
  }));
}

function registrarHistoricoStatusPedido(pedidoId, statusAnterior, statusNovo, ator = "sistema", canal = "admin") {
  const id = Number(pedidoId);
  if (!Number.isFinite(id) || id <= 0) return;
  const prev = String(statusAnterior || "").trim();
  const next = String(statusNovo || "").trim();
  if (!next || prev === next) return;
  db.prepare(`
    INSERT INTO pedido_status_historico (
      pedido_id, status_anterior, status_novo, ator, canal, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, prev || null, next, String(ator || "sistema"), String(canal || "admin"), new Date().toISOString());
}

function registrarAuditoriaAdmin(req, { acao, entidade = "", entidadeId = "", detalhe = null, ator = "" } = {}) {
  const acaoLimpa = String(acao || "").trim();
  if (!acaoLimpa) return;
  let detalheJson = null;
  if (detalhe !== null && typeof detalhe !== "undefined") {
    try {
      detalheJson = JSON.stringify(detalhe).slice(0, 4000);
    } catch {
      detalheJson = JSON.stringify({ erro: "detalhe_nao_serializavel" });
    }
  }
  try {
    db.prepare(`
      INSERT INTO admin_audit_log (
        ator, acao, entidade, entidade_id, ip, user_agent, detalhe, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(ator || obterAtorAdmin(req) || "admin").slice(0, 80),
      acaoLimpa.slice(0, 120),
      String(entidade || "").slice(0, 120),
      String(entidadeId || "").slice(0, 120),
      getClientIp(req),
      String(req?.headers?.["user-agent"] || "").slice(0, 250),
      detalheJson,
      new Date().toISOString()
    );
  } catch (err) {
    console.warn("[AUDIT] Falha ao registrar auditoria:", err?.message || err);
  }
}

function getConfigValue(chave, fallback = "") {
  const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave);
  if (!row) return fallback;
  return row.valor;
}

function setConfigValue(chave, valor) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO configuracoes (chave, valor, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at
  `).run(chave, String(valor), now);
}

function normalizarTemaCardapio(valor) {
  const tema = String(valor || "").trim().toLowerCase();
  return TEMAS_CARDAPIO.has(tema) ? tema : "original";
}

function normalizarTemaAdmin(valor) {
  return normalizarTemaCardapio(valor);
}

function parseConfigBoolean(valor, fallback = false) {
  if (typeof valor === "boolean") return valor;
  if (valor === null || typeof valor === "undefined") return fallback;
  const texto = String(valor).trim().toLowerCase();
  if (["1", "true", "sim", "yes", "on"].includes(texto)) return true;
  if (["0", "false", "nao", "não", "no", "off"].includes(texto)) return false;
  return fallback;
}

function getConfigBoolean(chave, fallback = false) {
  return parseConfigBoolean(getConfigValue(chave, fallback ? "1" : "0"), fallback);
}

function ensureConfigDefaults() {
  const defaults = {
    tempo_entrega_min: "45",
    tempo_retirada_min: "20",
    whatsapp: process.env.WHATSAPP_NUMBER || "5535997376001",
    msg_pix: "Mande o comprovante do Pix neste WhatsApp. Chave: 35367190000164.",
    public_url: PUBLIC_URL_ENV || "",
    promo_xtudo_preco_unidade: "22",
    promo_xtudo_preco_combo: "20",
    promo_xtudo_min_qtd: "2",
    promo_tag_text: "Promocao",
    promo_destaque_text: "X-Tudo R$ {preco_unidade} cada",
    promo_sub_text: "{min_qtd}+ por R$ {preco_combo}",
    logo_url: "",
    funcionamento_dias: JSON.stringify([0,1,2,3,4,5,6]),
    funcionamento_abre: "18:00",
    funcionamento_fecha: "23:30",
    bot_auto_reply_ativo: "1",
    auto_aceitar_pedidos: "0",
    auto_imprimir_preparo: "1",
    tema_cardapio: "original",
    tema_admin: "original",
    combos_inteligentes_ativo: "1",
    combos_ultima_geracao: "",
    syntax_integracao_ativo: "0",
    syntax_integracao_modo: "homologacao",
    pure_batata_desativado: "0",
    pure_batata_backup: "[]",
    print_agent_token: "",
    print_interface: "printer:POS80 Printer USB",
    print_windows_mode: "raw",
    print_raw_scale_x: "2",
    print_raw_scale_y: "2",
    print_raw_bold: "1",
    print_max_cols: "34"
  };
  Object.entries(defaults).forEach(([chave, valor]) => {
    const existe = db.prepare("SELECT 1 FROM configuracoes WHERE chave = ?").get(chave);
    if (!existe) setConfigValue(chave, valor);
  });
}

function ensureBotMensagensPadrao() {
  const total = db.prepare("SELECT COUNT(*) AS total FROM bot_mensagens").get()?.total || 0;
  if (total > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO bot_mensagens (palavras_chave, mensagem, ativo, ordem, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?, ?)
  `);

  BOT_MENSAGENS_SUGERIDAS.forEach((item, idx) => {
    insert.run(item.palavras_chave, item.mensagem, idx, now, now);
  });
}

function normalizePublicUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(withScheme);
    if (!parsed.hostname) return "";
    const normalized = `${parsed.origin}${parsed.pathname}`;
    return normalized.replace(/\/+$/, "");
  } catch (_) {
    return withScheme.replace(/\/+$/, "");
  }
}

function getPublicUrl() {
  const fromDb = normalizePublicUrl(getConfigValue("public_url", ""));
  const fromEnv = normalizePublicUrl(PUBLIC_URL_ENV || "");
  const base = fromDb || fromEnv;
  if (base) return base;
  if (String(process.env.NODE_ENV || "").toLowerCase() !== "production") {
    return `http://localhost:${PORT}`;
  }
  return "";
}

function isAbertoAgora() {
  const dias = parseMaybeJson(getConfigValue("funcionamento_dias", "[]")) || [];
  const abre = String(getConfigValue("funcionamento_abre", "") || "").trim();
  const fecha = String(getConfigValue("funcionamento_fecha", "") || "").trim();
  if (!Array.isArray(dias) || !dias.length || !abre || !fecha) return true;
  const now = new Date();
  const dia = now.getDay();
  if (!dias.map((d) => Number(d)).includes(dia)) return false;
  const [hA, mA] = abre.split(":").map((v) => parseInt(v, 10));
  const [hF, mF] = fecha.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(hA) || Number.isNaN(mA) || Number.isNaN(hF) || Number.isNaN(mF)) return true;
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const minsAbre = hA * 60 + mA;
  const minsFecha = hF * 60 + mF;
  if (minsFecha < minsAbre) {
    return minsNow >= minsAbre || minsNow <= minsFecha;
  }
  return minsNow >= minsAbre && minsNow <= minsFecha;
}

function getPrintAgentToken() {
  return String(process.env.PRINT_AGENT_TOKEN || getConfigValue("print_agent_token", "") || "").trim();
}

function botAutoReplyAtivo() {
  return getConfigBoolean("bot_auto_reply_ativo", true);
}

function normalizeAuthToken(value) {
  return String(value || "")
    .replace(/^bearer\s+/i, "")
    .trim();
}

function checkPrintAgentAuth(req) {
  const token = normalizeAuthToken(getPrintAgentToken());
  if (!token) return true;
  const candidates = [
    req.headers["x-print-token"],
    req.headers["x-print_token"],
    req.headers["authorization"],
    req.query && (req.query.token || req.query.print_token),
  ];

  for (const rawUrl of [req.originalUrl, req.url]) {
    try {
      const url = new URL(String(rawUrl || ""), "http://localhost");
      candidates.push(url.searchParams.get("token"));
      candidates.push(url.searchParams.get("print_token"));
    } catch (e) {}
  }

  return candidates.some((value) => normalizeAuthToken(value) === token);
}

function getNowInBrazil() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10)
  };
}

function gerarCombosSugestao() {
  const ativo = getConfigValue("combos_inteligentes_ativo", "1") === "1";
  if (!ativo) return { generated: 0, reason: "disabled" };
  const now = getNowInBrazil();
  const stamp = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
  const ultima = getConfigValue("combos_ultima_geracao", "");
  if (ultima === stamp) return { generated: 0, reason: "already_generated" };

  const itens = db.prepare("SELECT nome, preco, categoria, img FROM cardapio WHERE disponivel = 1").all();
  if (!itens.length) return { generated: 0, reason: "empty_menu" };

  const bebidas = itens.filter((i) => categoriaEhBebida(i.categoria));
  const lanches = itens.filter((i) => !categoriaEhBebida(i.categoria));
  if (!lanches.length) return { generated: 0, reason: "no_sandwiches" };

  const nowIso = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO combos (nome, itens, preco, img, ativo, sugestao, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, 1, ?, ?)
  `);

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const combos = [];
  for (let i = 0; i < 3; i++) {
    const lanche = pick(lanches);
    const bebida = bebidas.length ? pick(bebidas) : null;
    const itensCombo = bebida ? [lanche.nome, bebida.nome] : [lanche.nome];
    const preco = Math.max(0, (Number(lanche.preco) || 0) + (bebida ? Number(bebida.preco) || 0 : 0) - 2);
    combos.push({
      nome: `Combo ${lanche.nome}${bebida ? " + " + bebida.nome : ""}`,
      itens: itensCombo,
      preco,
      img: String(lanche.img || "").trim()
    });
  }

  combos.forEach((c) => {
    insert.run(c.nome, JSON.stringify(c.itens), c.preco, c.img, nowIso, nowIso);
  });

  setConfigValue("combos_ultima_geracao", stamp);
  return { generated: combos.length, reason: "generated" };
}

function agendarCombosDiarios() {
  setInterval(() => {
    const now = getNowInBrazil();
    if (now.hour === 19 && now.minute === 0) {
      gerarCombosSugestao();
    }
  }, 60 * 1000);
}

function getWatiBaseUrl() {
  if (!WATI_API_ENDPOINT) return "";
  let base = WATI_API_ENDPOINT.trim();
  if (!base) return "";
  if (!base.startsWith("http")) base = `https://${base}`;
  return base.replace(/\/+$/, "");
}

function getWppBaseUrl() {
  if (!WPP_BASE_URL) return "";
  let base = WPP_BASE_URL.trim();
  if (!base) return "";
  if (!base.startsWith("http")) base = `https://${base}`;
  return base.replace(/\/+$/, "");
}

function normalizarTelefoneBrasil(phone, options = {}) {
  return normalizarTelefoneBrasilCore(phone, { dddPadrao: DEFAULT_DDD, ...options });
}

function normalizePhoneNumber(phone) {
  return normalizePhoneNumberCore(phone, { dddPadrao: DEFAULT_DDD });
}

function normalizeCustomerPhone(phone) {
  return normalizeCustomerPhoneCore(phone, { dddPadrao: DEFAULT_DDD });
}

function getPhoneVariants(phone) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return [];

  const variants = new Set();
  const addVariant = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits) variants.add(digits);
  };

  addVariant(normalized);
  const local = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  addVariant(local);
  if (local.length === 10 || local.length === 11) addVariant(`55${local}`);

  // Uma mesma pessoa pode ser cadastrada com nenhum, um ou varios noves antes
  // da base do celular. Todas essas formas precisam apontar para o mesmo cliente.
  gerarVariantesWhatsappBrasil(normalized, { dddPadrao: DEFAULT_DDD }).forEach((value) => {
    addVariant(value);
    if (String(value).startsWith("55")) addVariant(String(value).slice(2));
  });

  return Array.from(variants);
}

function resolvePhoneForCustomerMessage(phone) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return "";
  return normalized;
}

function gerarVariantesWhatsappPorNono(phone) {
  return gerarVariantesWhatsappBrasil(phone, { dddPadrao: DEFAULT_DDD });
}

function formatarDinheiro(valor) {
  const num = toNumber(valor, 0);
  return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function calcularTotalCarrinho(carrinho, desconto = 0) {
  return globalThis.MegaPricing.netSubtotal(carrinho, desconto);
}

function normalizarAlteracaoItemTexto(valor) {
  return normalizarTextoBusca(valor)
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveRemocaoItem(valor) {
  return normalizarAlteracaoItemTexto(valor)
    .replace(/^(sem|tirar|retirar|remove|remover|nao colocar|nao poe)\s+/, "")
    .trim();
}

function chaveAdicionalItem(valor) {
  return normalizarAlteracaoItemTexto(valor)
    .replace(/^(mais|com|adicional de|adicional|adicionar|acrescentar|colocar)\s+/, "")
    .trim();
}

function dividirObsItem(valor) {
  return String(valor || "")
    .split(/\s*(?:,|;|\||\be\b)\s*/i)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

function formatarSemItem(nome) {
  const texto = String(nome || "")
    .trim()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/\s+/g, " ");
  if (!texto) return "";
  return `Sem ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}

function formatarAlteracoesItem(item = {}) {
  const removidos = Array.from(new Set(
    (Array.isArray(item?.removidos) ? item.removidos : Array.isArray(item?.ingredientesRemovidos) ? item.ingredientesRemovidos : [])
      .map((nome) => String(nome || "").trim())
      .filter(Boolean)
  ));
  const adicionais = (Array.isArray(item?.adicionais) ? item.adicionais : [])
    .map((add) => {
      if (!add) return null;
      if (typeof add === "string") return { nome: add.trim(), qtd: 1, preco: 0 };
      return {
        nome: String(add.nome || add.item || add.descricao || "").trim(),
        qtd: Math.max(parseInt(add.qtd ?? add.quantidade ?? 1, 10) || 1, 1),
        preco: toNumber(add.preco ?? add.valor, 0),
        escopo: String(add.escopo || add.scope || "").trim().toLowerCase() === "total" ? "total" : "unidade",
      };
    })
    .filter((add) => add?.nome);
  const removidosKeys = new Set(removidos.map(chaveRemocaoItem));
  const adicionaisKeys = new Set(adicionais.map((add) => normalizarAlteracaoItemTexto(add.nome)));
  const obsPartes = dividirObsItem(item?.obs || item?.observacao || "");
  const obsLivre = obsPartes.filter((parte) => {
    if (removidosKeys.has(chaveRemocaoItem(parte))) return false;
    if (adicionaisKeys.has(chaveAdicionalItem(parte))) return false;
    return true;
  });
  const removidosFormatados = removidos.map(formatarSemItem).filter(Boolean);
  const quantidadeItem = Math.max(parseInt(item?.qtd, 10) || 1, 1);
  const adicionaisFormatados = adicionais.map((add) => {
    const total = add.qtd * (add.escopo === "total" ? 1 : quantidadeItem);
    if (quantidadeItem > 1 && add.escopo !== "total") {
      return `Adicional: ${add.nome} x${add.qtd} por lanche (${total} no total)`;
    }
    return `Adicional: ${add.nome}${total > 1 ? ` x${total}${add.escopo === "total" ? " no total" : ""}` : ""}`;
  });
  const obs = obsLivre.join("; ");
  return {
    removidos: removidosFormatados,
    adicionais: adicionaisFormatados,
    obs,
    linhas: [...removidosFormatados, ...adicionaisFormatados, ...(obs ? [`Obs: ${obs}`] : [])],
  };
}

function formatarResumoCarrinho(carrinho) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) return "- Sem itens";
  return carrinho
    .map((item) => {
      const qtd = Math.max(parseInt(item?.qtd, 10) || 0, 0);
      const nome = String(item?.nome || "").trim() || "Item";
      const partes = [`${qtd || 1}x ${nome}`];
      partes.push(...formatarAlteracoesItem(item).linhas);
      return `- ${partes.join(" | ")}`;
    })
    .join("\n");
}

async function zapiSendText(phone, message, messageId = "") {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return { ok: false, error: "not_configured" };
  const numero = normalizePhoneNumber(phone);
  if (!numero) return { ok: false, error: "invalid_phone" };

  const payload = {
    phone: numero,
    message: String(message || "").trim(),
  };
  if (!payload.message) return { ok: false, error: "empty_message" };
  if (messageId) payload.messageId = messageId;

  const headers = { "Content-Type": "application/json" };
  if (ZAPI_CLIENT_TOKEN) headers["Client-Token"] = ZAPI_CLIENT_TOKEN;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function watiSendSessionMessage(phone, message) {
  const baseUrl = getWatiBaseUrl();
  if (!baseUrl || !WATI_TOKEN) return { ok: false, error: "not_configured" };
  const numero = normalizePhoneNumber(phone);
  if (!numero) return { ok: false, error: "invalid_phone" };

  const payload = {
    messageText: String(message || "").trim(),
    message: String(message || "").trim(),
  };
  if (WATI_CHANNEL_NUMBER) payload.channelPhoneNumber = String(WATI_CHANNEL_NUMBER).trim();
  if (!payload.messageText) return { ok: false, error: "empty_message" };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${WATI_TOKEN}`,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `${baseUrl}/api/v1/sendSessionMessage/${numero}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

function wppConfigured() {
  return Boolean(getWppBaseUrl() && WPP_SESSION);
}

function wppErroSessaoInativa(result) {
  if (!result || result.ok) return false;
  const status = Number(result.status || 0);
  const errorText = String(result.error || "").toLowerCase();
  const bodyText = String(
    typeof result.body === "string" ? result.body : JSON.stringify(result.body || {})
  ).toLowerCase();
  const joined = `${errorText} ${bodyText}`;

  return (
    status === 404 ||
    status === 409 ||
    status === 410 ||
    joined.includes("session not started") ||
    joined.includes("disconnected") ||
    joined.includes("sessao do whatsapp nao esta ativa") ||
    joined.includes("a sessao do whatsapp nao esta ativa") ||
    joined.includes("not connected") ||
    joined.includes("req.client.sendtext is not a function")
  );
}

function wppErroNumeroInexistente(result) {
  if (!result || result.ok) return false;
  const bodyText = String(
    typeof result.body === "string" ? result.body : JSON.stringify(result.body || {})
  ).toLowerCase();
  const errorText = String(result.error || "").toLowerCase();
  const joined = `${errorText} ${bodyText}`;
  return (
    /n.?o existe/.test(joined) ||
    joined.includes("does not exist") ||
    joined.includes("not exist") ||
    joined.includes("number does not exist") ||
    joined.includes("invalid number")
  );
}

function wppErroWidInvalido(result) {
  if (!result || result.ok) return false;
  const bodyText = String(
    typeof result.body === "string" ? result.body : JSON.stringify(result.body || {})
  ).toLowerCase();
  const errorText = String(result.error || "").toLowerCase();
  const joined = `${errorText} ${bodyText}`;
  return (
    joined.includes("invalid_wid") ||
    joined.includes("invalid wid") ||
    joined.includes("no lid for user") ||
    joined.includes("wid value")
  );
}

function extrairNumeroValidadoWpp(data, fallback = "") {
  const response = data?.response ?? data?.data?.response ?? data?.result ?? data;
  const candidates = [
    response?.id?._serialized,
    response?.id?.user,
    response?.wid?._serialized,
    response?.wid?.user,
    response?.number,
    response?.phone,
    response?.to,
    response?.user,
  ];
  for (const item of candidates) {
    const digits = String(item || "").replace(/\D/g, "");
    if (digits.length >= 12) return digits.startsWith("55") ? digits : `55${digits}`;
  }
  return fallback;
}

function checkNumberStatusIndicaExistente(data) {
  const response = data?.response ?? data?.data?.response ?? data?.result ?? data;
  if (!response) return false;
  if (response.numberExists === true) return true;
  if (response.canReceiveMessage === true) return true;
  if (response.isBusiness === true || response.isEnterprise === true) return true;
  if (response.status === 200 || response.status === "success") return true;
  if (response.id || response.wid || response.user) return true;
  return false;
}

async function wppCheckNumberStatus(numero) {
  const normalized = normalizePhoneNumber(numero);
  if (!normalized) return { ok: false, exists: false, error: "invalid_phone" };
  const res = await wppRequestJson(
    `/api/${encodeURIComponent(WPP_SESSION)}/check-number-status/${encodeURIComponent(normalized)}`,
    { timeoutMs: 3500 }
  );
  if (!res.ok) return { ok: false, exists: false, phone: normalized, ...res };
  const exists = checkNumberStatusIndicaExistente(res.data);
  return {
    ok: true,
    exists,
    phone: exists ? extrairNumeroValidadoWpp(res.data, normalized) : normalized,
    body: res.data,
  };
}

function wppCheckNumeroIndisponivel(check) {
  if (!check) return false;
  const texto = [
    check.error,
    check.body?.status,
    check.body?.message,
    check.body?.error,
    check.body?.data?.message,
    check.body?.response?.message,
    typeof check.body === "string" ? check.body : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    check.status === 401 ||
    check.status === 403 ||
    check.error === "fetch_error" ||
    check.error === "This operation was aborted" ||
    texto.includes("token is not present") ||
    texto.includes("unauthorized") ||
    texto.includes("session not started") ||
    texto.includes("disconnected") ||
    texto.includes("sessao do whatsapp nao esta ativa") ||
    texto.includes("a sessao do whatsapp nao esta ativa") ||
    texto.includes("not connected") ||
    texto.includes("timeout")
  );
}

async function resolverDestinoWhatsappPorNono(numero) {
  const variantes = gerarVariantesWhatsappPorNono(numero);
  if (!variantes.length) return { ok: false, phone: "", variants: [], error: "invalid_phone" };

  if (!wppConfigured()) return { ok: false, phone: variantes[0], variants: variantes, checked: false, error: "not_configured" };

  let ultimoErro = null;
  for (const variante of variantes) {
    const check = await wppCheckNumberStatus(variante);
    if (check.ok && check.exists) {
      return { ok: true, phone: check.phone || variante, variants: variantes, checked: true };
    }
    if (wppCheckNumeroIndisponivel(check)) {
      return {
        ok: false,
        phone: variantes[0],
        variants: variantes,
        checked: false,
        error: "check_unavailable",
        last: check,
      };
    }
    ultimoErro = check;
  }

  return {
    ok: false,
    phone: variantes[0],
    variants: variantes,
    checked: true,
    error: ultimoErro?.error || ultimoErro?.body?.message || "number_not_found",
    last: ultimoErro,
  };
}

async function wppSendText(phone, message) {
  const baseUrl = getWppBaseUrl();
  if (!baseUrl || !WPP_SESSION) return { ok: false, error: "not_configured" };
  const numeroBruto = String(phone || "").trim();
  const widExplicito = numeroBruto.endsWith("@c.us") || numeroBruto.endsWith("@lid");
  const numero = widExplicito ? "" : normalizePhoneNumber(numeroBruto);
  if (!widExplicito && !numero) return { ok: false, error: "invalid_phone" };
  if (!widExplicito) {
    const info = normalizarTelefoneBrasil(numeroBruto);
    if (!info.valido || info.nacional.length < 10 || info.nacional.length > 13) {
      return { ok: false, error: "invalid_phone_format", phone: numero };
    }
  }
  const messageText = String(message || "").trim();
  if (!messageText) return { ok: false, error: "empty_message" };

  const candidatos = [];
  const vistos = new Set();
  const addCandidato = (valor) => {
    const item = String(valor || "").trim();
    if (!item || vistos.has(item)) return;
    vistos.add(item);
    candidatos.push(item);
  };

  if (widExplicito) {
    // Quando o remetente ja vem com wid completo, envia somente para esse destino.
    addCandidato(numeroBruto);
  } else {
    // Confirma a melhor variacao primeiro e preserva as demais como fallback de falha real.
    const destinoResolvido = await resolverDestinoWhatsappPorNono(numeroBruto || numero);
    if (destinoResolvido.ok && destinoResolvido.phone) {
      const destino = normalizePhoneNumber(destinoResolvido.phone) || destinoResolvido.phone;
      if (destino !== numero) {
        console.log("[WHATSAPP] Telefone confirmado por check-number-status:", numero, "->", destino);
      }
      addCandidato(`${destino}@c.us`);
      for (const variante of destinoResolvido.variants || []) {
        const alternativa = normalizePhoneNumber(variante) || variante;
        if (alternativa) addCandidato(`${alternativa}@c.us`);
      }
    } else {
      console.warn("[WHATSAPP] Nenhuma variacao confirmada para o telefone:", {
        phone: numero,
        variants: destinoResolvido.variants,
        error: destinoResolvido.error,
      });
      if (destinoResolvido.checked) {
        return {
          ok: false,
          error: "number_not_found",
          phone: numero,
          variants: destinoResolvido.variants,
          detail: destinoResolvido.error,
        };
      }
      const variantesSemCheck = Array.isArray(destinoResolvido.variants)
        ? destinoResolvido.variants
        : [];
      for (const variante of variantesSemCheck) addCandidato(`${variante}@c.us`);
      addCandidato(`${numero}@c.us`);
    }
  }

  const attemptSend = async (target) => {
    const targetText = String(target || "").trim();
    const targetDigits = targetText.replace(/\D/g, "");
    const isLidTarget =
      targetText.endsWith("@lid") || (!targetText.includes("@") && targetDigits.length >= 14);
    const payload = {
      phone: [targetText],
      isGroup: false,
      isLid: isLidTarget,
      message: messageText,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(
        `${baseUrl}/api/${encodeURIComponent(WPP_SESSION)}/send-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(WPP_TOKEN ? { Authorization: `Bearer ${WPP_TOKEN}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: res.status, body: text };
      }
      const data = await res.json().catch(() => ({}));
      return avaliarRespostaEnvioWpp(data);
    } catch (err) {
      return { ok: false, error: err?.message || "fetch_error" };
    } finally {
      clearTimeout(timeout);
    }
  };

  let ultimoErro = { ok: false, error: "invalid_wid" };
  for (const candidato of candidatos) {
    const first = await attemptSend(candidato);
    if (first.ok) return first;
    const shouldRetry =
      first.error === "This operation was aborted" ||
      first.error === "fetch_error" ||
      (first.status && first.status >= 500);
    const result = shouldRetry
      ? (await new Promise((resolve) => setTimeout(resolve, 1200)), await attemptSend(candidato))
      : first;
    if (result.ok) return result;

    const bodyText =
      typeof result.body === "string" ? result.body : JSON.stringify(result.body || {});
    const lowerBody = String(bodyText || "").toLowerCase();
    const erroWidOuLid =
      result.error === "send_failure" ||
      lowerBody.includes("invalid_wid") ||
      lowerBody.includes("invalid wid") ||
      lowerBody.includes("no lid for user") ||
      lowerBody.includes("wid value");

    ultimoErro = result;
    const shouldTryNextCandidate =
      erroWidOuLid ||
      Number(result.status || 0) >= 500 ||
      result.error === "wpp_response_error" ||
      wppErroNumeroInexistente(result) ||
      lowerBody.includes("session not started") ||
      lowerBody.includes("disconnected");
    if (!shouldTryNextCandidate) {
      return result;
    }
  }

  if (wppErroSessaoInativa(ultimoErro)) {
    const rec = await tentarRecuperarSessaoWpp();
    if (rec.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      for (const candidato of candidatos) {
        const retry = await attemptSend(candidato);
        if (retry.ok) return retry;
        ultimoErro = retry;
        const bodyText =
          typeof retry.body === "string" ? retry.body : JSON.stringify(retry.body || {});
        if (!bodyText.includes("invalid_wid")) break;
      }
    } else {
      ultimoErro = { ...ultimoErro, recovery: rec };
    }
  }

  return ultimoErro;
}

async function wppSendGroupText(groupId, message) {
  const baseUrl = getWppBaseUrl();
  if (!baseUrl || !WPP_SESSION) return { ok: false, error: "not_configured" };
  const grupo = String(groupId || "").trim();
  if (!grupo || !grupo.endsWith("@g.us")) return { ok: false, error: "invalid_group" };

  const payload = {
    phone: [grupo],
    isGroup: true,
    message: String(message || "").trim(),
  };
  if (!payload.message) return { ok: false, error: "empty_message" };

  const attemptSend = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(
        `${baseUrl}/api/${encodeURIComponent(WPP_SESSION)}/send-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(WPP_TOKEN ? { Authorization: `Bearer ${WPP_TOKEN}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: res.status, body: text };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "fetch_error" };
    } finally {
      clearTimeout(timeout);
    }
  };

  const first = await attemptSend();
  if (first.ok) return first;
  const shouldRetry =
    first.error === "This operation was aborted" ||
    first.error === "fetch_error" ||
    (first.status && first.status >= 500);
  if (!shouldRetry) return first;

  await new Promise((resolve) => setTimeout(resolve, 1200));
  const retry = await attemptSend();
  if (retry.ok) return retry;

  if (wppErroSessaoInativa(retry)) {
    const rec = await tentarRecuperarSessaoWpp();
    if (rec.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const afterRecovery = await attemptSend();
      if (afterRecovery.ok) return afterRecovery;
      return { ...afterRecovery, recovery: rec };
    }
    return { ...retry, recovery: rec };
  }

  return retry;
}

function wppAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (WPP_TOKEN) headers.Authorization = `Bearer ${WPP_TOKEN}`;
  return headers;
}

async function wppRequestJson(pathname, options = {}) {
  const baseUrl = getWppBaseUrl();
  if (!baseUrl || !WPP_SESSION) return { ok: false, error: "not_configured" };
  const { timeoutMs = 10000, ...fetchOptions } = options || {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${pathname}`, {
      ...fetchOptions,
      headers: { ...wppAuthHeaders(), ...(fetchOptions.headers || {}) },
      signal: controller.signal,
    });
    const text = await res.text().catch(() => "");
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }
    if (!res.ok) return { ok: false, status: res.status, body: data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message || "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function wppRequestBuffer(pathname) {
  const base64ParaDataUrlImagem = (rawBase64) => {
    const compact = String(rawBase64 || "").replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/=]+$/.test(compact) || compact.length < 120) return "";
    let decoded;
    try {
      decoded = Buffer.from(compact, "base64");
    } catch {
      return "";
    }
    if (!decoded || !decoded.length) return "";

    const isPng =
      decoded.length > 8 &&
      decoded[0] === 0x89 &&
      decoded[1] === 0x50 &&
      decoded[2] === 0x4e &&
      decoded[3] === 0x47;
    const isJpeg =
      decoded.length > 3 &&
      decoded[0] === 0xff &&
      decoded[1] === 0xd8 &&
      decoded[2] === 0xff;
    const isGif =
      decoded.length > 6 &&
      decoded[0] === 0x47 &&
      decoded[1] === 0x49 &&
      decoded[2] === 0x46 &&
      decoded[3] === 0x38;
    const isWebp =
      decoded.length > 12 &&
      decoded.slice(0, 4).toString("ascii") === "RIFF" &&
      decoded.slice(8, 12).toString("ascii") === "WEBP";

    if (isPng) return `data:image/png;base64,${compact}`;
    if (isJpeg) return `data:image/jpeg;base64,${compact}`;
    if (isGif) return `data:image/gif;base64,${compact}`;
    if (isWebp) return `data:image/webp;base64,${compact}`;
    return "";
  };

  const baseUrl = getWppBaseUrl();
  if (!baseUrl || !WPP_SESSION) return { ok: false, error: "not_configured" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${baseUrl}${pathname}`, {
      method: "GET",
      headers: wppAuthHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const buffer = Buffer.from(await res.arrayBuffer());

    // WPPCONNECT can return binary image, JSON with base64, or plain base64 text.
    if (contentType.includes("application/json") || contentType.includes("text/plain")) {
      const text = buffer.toString("utf8").trim();

      if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(text)) {
        return { ok: true, dataUrl: text };
      }

      try {
        const parsed = JSON.parse(text);
        const qrCandidates = [
          parsed?.qrcode,
          parsed?.qr,
          parsed?.base64,
          parsed?.code,
          parsed?.urlcode,
          parsed?.urlCode,
          parsed?.data?.qrcode,
          parsed?.data?.qr,
          parsed?.data?.base64,
          parsed?.data?.code,
          parsed?.data?.urlcode,
          parsed?.data?.urlCode,
        ].filter((value) => typeof value === "string" && value.trim());

        for (const candidate of qrCandidates) {
          const raw = String(candidate).trim();

          if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) {
            return { ok: true, dataUrl: raw };
          }

          const rawAsImage = base64ParaDataUrlImagem(raw);
          if (rawAsImage) {
            return { ok: true, dataUrl: rawAsImage };
          }

          if (/^https?:\/\//i.test(raw)) {
            try {
              const dataUrl = await QRCode.toDataURL(raw, { margin: 1, width: 320 });
              return { ok: true, dataUrl, codeUrl: raw };
            } catch {
              return { ok: true, codeUrl: raw };
            }
          }
        }
      } catch {
        // not JSON; continue with plain base64 check
      }

      const rawText = text.replace(/^"+|"+$/g, "");
      const rawTextAsImage = base64ParaDataUrlImagem(rawText);
      if (rawTextAsImage) {
        return { ok: true, dataUrl: rawTextAsImage };
      }

      return { ok: false, error: "invalid_qr_response", body: text.slice(0, 400) };
    }

    return { ok: true, buffer };
  } catch (err) {
    return { ok: false, error: err?.message || "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

function construirMensagemPedido(pedido, etapa) {
  const nomeCliente = String(pedido?.cliente || "").trim();
  const tipoEntrega = String(pedido?.tipoEntrega || "").trim();
  const pagamento = String(pedido?.pagamento || "").trim();
  const taxaEntrega = toNumber(pedido?.taxaEntrega, 0);
  const isEntrega = tipoEntrega.toLowerCase().includes("entrega");
  const totalItensCalculado = calcularTotalCarrinho(pedido?.carrinho || [], pedido?.desconto || 0);
  const totalItensInformado = temNumeroInformado(pedido?.subtotal)
    ? toNumber(pedido.subtotal, totalItensCalculado)
    : totalItensCalculado;
  const totalFinalCalculado = Math.max(0, totalItensInformado + (isEntrega ? taxaEntrega : 0));
  const totalFinal = temNumeroInformado(pedido?.total)
    ? toNumber(pedido.total, totalFinalCalculado)
    : totalFinalCalculado;
  const totalItens = Math.max(0, totalItensInformado);
  const tempoEntrega = getConfigValue("tempo_entrega_min", "45");
  const tempoRetirada = getConfigValue("tempo_retirada_min", "20");
  const msgPix = "Pix: envie o comprovante neste WhatsApp. Chave: 35367190000164.";
  const whatsapp = normalizePhoneNumber(getConfigValue("whatsapp", ""));
  const tempo = tipoEntrega.toLowerCase().includes("retirada") ? tempoRetirada : tempoEntrega;
  const linhas = [];

  if (etapa === "recebido") {
    linhas.push(`Pedido confirmado${nomeCliente ? `, ${nomeCliente}` : ""}.`);
    linhas.push("Resumo do pedido:");
    linhas.push(formatarResumoCarrinho(pedido?.carrinho || []));
    if (pedido?.endereco) linhas.push(`Endereco: ${String(pedido.endereco).trim()}`);
    if (pedido?.obsGeral) linhas.push(`Obs do pedido: ${String(pedido.obsGeral).trim()}`);
    if (Number(pedido?.desconto) > 0) linhas.push(`Desconto: ${formatarDinheiro(pedido.desconto)}`);
    linhas.push(`Total (itens): ${formatarDinheiro(totalItens)}`);
    if (isEntrega && taxaEntrega > 0) linhas.push(`Taxa de entrega: ${formatarDinheiro(taxaEntrega)}`);
    linhas.push(`Total final: ${formatarDinheiro(totalFinal)}`);
    if (tipoEntrega) linhas.push(`Tipo: ${tipoEntrega}`);
    if (tempo) linhas.push(`Tempo estimado: ${tempo} min`);
    if (pagamento) linhas.push(`Pagamento: ${pagamento}`);
    if (pagamento.toLowerCase().includes("pix")) {
      linhas.push(msgPix);
    }
    linhas.push("");
    linhas.push("Mega Lanches agradece demais! 🙌");
    linhas.push("Aproveite sua noite e bom apetite! 😁");
    return linhas.join("\n");
  }

  if (etapa === "preparo") return "Seu pedido esta em preparo. Estamos caprichando!";
  if (etapa === "pronto") {
    if (pedidoEhRetiradaLocal(tipoEntrega, pedido?.origemPedido || pedido?.origem_pedido || "")) {
      return "Seu pedido esta prontinho para retirada. Pode vir buscar quando quiser. Obrigado pela preferencia!";
    }
    return "Seu pedido esta pronto e ja ja sai para entrega. Obrigado pela preferencia!";
  }
  if (etapa === "em_entrega") {
    const nomeEntregador = String(pedido?.entregador || "").trim();
    if (nomeEntregador) {
      return `Seu pedido ja ira sair com o entregador ${nomeEntregador}. Em instantes estara a caminho!`;
    }
    return "Seu pedido ja ira sair para entrega. Em instantes estara a caminho!";
  }
  if (etapa === "entregue") return "";
  if (etapa === "cancelado") {
    return "Seu pedido foi cancelado. Se precisar de ajuda, fale com a gente por aqui.";
  }
  return "";
}

function notificacaoClienteJaEnviada(pedidoId, etapa) {
  const id = Number(pedidoId || 0);
  const etapaNorm = String(etapa || "").trim().toLowerCase();
  if (!id || !etapaNorm) return false;
  return Boolean(
    db
      .prepare("SELECT 1 FROM pedido_notificacoes_cliente WHERE pedido_id = ? AND etapa = ?")
      .get(id, etapaNorm)
  );
}

function registrarNotificacaoClienteEnviada(pedidoId, etapa, canal, telefone) {
  const id = Number(pedidoId || 0);
  const etapaNorm = String(etapa || "").trim().toLowerCase();
  if (!id || !etapaNorm) return;
  db.prepare(`
    INSERT OR IGNORE INTO pedido_notificacoes_cliente (pedido_id, etapa, canal, telefone, sent_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    etapaNorm,
    String(canal || "whatsapp").trim().toLowerCase() || "whatsapp",
    String(telefone || "").trim(),
    new Date().toISOString()
  );
}

function resumirErroEnvio(resultado) {
  if (!resultado) return "erro_desconhecido";
  const resumo = {
    error: resultado.error || "send_failed",
    status: resultado.status || undefined,
    detail: resultado.detail || undefined,
    body:
      typeof resultado.body === "string"
        ? resultado.body.slice(0, 800)
        : resultado.body || undefined,
  };
  return JSON.stringify(resumo).slice(0, 2000);
}

function criarDedupeKeyOutbox(prefixo, partes = []) {
  const base = partes.map((item) => String(item ?? "")).join("|");
  const hash = crypto.createHash("sha256").update(base).digest("hex").slice(0, 32);
  return `${String(prefixo || "mensagem").slice(0, 40)}:${hash}`;
}

function enfileirarMensagemWhatsapp({
  dedupeKey,
  canal = "wppconnect",
  telefone,
  fallbackTelefone = "",
  mensagem,
  tipo = "auto",
  pedidoId = null,
  etapa = "",
  cooldownTelefone = "",
  cooldownTipo = "",
  ttlMs = WHATSAPP_OUTBOX_BOT_TTL_MS,
  erro = null,
} = {}) {
  const destino = String(telefone || "").trim();
  const texto = String(mensagem || "").trim();
  if (!destino || !texto) return null;

  const now = new Date();
  const chave = String(dedupeKey || criarDedupeKeyOutbox(tipo, [destino, texto])).slice(0, 180);
  const existente = db
    .prepare("SELECT id, status FROM whatsapp_outbox WHERE dedupe_key = ?")
    .get(chave);
  if (existente?.status === "enviado") return Number(existente.id);

  const values = [
    String(canal || "wppconnect").trim().toLowerCase(),
    destino,
    String(fallbackTelefone || "").trim(),
    texto,
    String(tipo || "auto").trim().toLowerCase(),
    Number(pedidoId || 0) || null,
    String(etapa || "").trim().toLowerCase(),
    String(cooldownTelefone || "").trim(),
    String(cooldownTipo || "").trim().toLowerCase(),
    now.toISOString(),
    new Date(now.getTime() + Math.max(Number(ttlMs || 0), 60 * 1000)).toISOString(),
    resumirErroEnvio(erro),
    now.toISOString(),
  ];

  if (existente) {
    db.prepare(`
      UPDATE whatsapp_outbox
      SET canal = ?, telefone = ?, fallback_telefone = ?, mensagem = ?, tipo = ?,
          pedido_id = ?, etapa = ?, cooldown_telefone = ?, cooldown_tipo = ?,
          status = 'pendente', attempts = 0, next_attempt_at = ?, expires_at = ?, last_error = ?,
          updated_at = ?
      WHERE id = ?
    `).run(...values, existente.id);
    return Number(existente.id);
  }

  const info = db.prepare(`
    INSERT INTO whatsapp_outbox
      (dedupe_key, canal, telefone, fallback_telefone, mensagem, tipo,
       pedido_id, etapa, cooldown_telefone, cooldown_tipo, status, attempts,
       next_attempt_at, expires_at, last_error, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', 0, ?, ?, ?, ?, ?)
  `).run(chave, ...values, now.toISOString());
  return Number(info.lastInsertRowid || 0);
}

function registrarMensagemWhatsappEnviada({
  dedupeKey,
  canal = "wppconnect",
  telefone,
  fallbackTelefone = "",
  mensagem,
  tipo = "auto",
  pedidoId = null,
  etapa = "",
  cooldownTelefone = "",
  cooldownTipo = "",
} = {}) {
  const destino = String(telefone || "").trim();
  const texto = String(mensagem || "").trim();
  if (!destino || !texto) return null;
  const now = new Date().toISOString();
  const chave = String(
    dedupeKey || criarDedupeKeyOutbox(tipo, [destino, texto, now])
  ).slice(0, 180);
  const info = db.prepare(`
    INSERT INTO whatsapp_outbox
      (dedupe_key, canal, telefone, fallback_telefone, mensagem, tipo,
       pedido_id, etapa, cooldown_telefone, cooldown_tipo, status, attempts,
       next_attempt_at, expires_at, last_error, created_at, updated_at, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enviado', 1, ?, ?, NULL, ?, ?, ?)
    ON CONFLICT(dedupe_key) DO UPDATE SET
      status = 'enviado', attempts = whatsapp_outbox.attempts + 1,
      last_error = NULL, sent_at = excluded.sent_at, updated_at = excluded.updated_at
  `).run(
    chave,
    String(canal || "wppconnect").trim().toLowerCase(),
    destino,
    String(fallbackTelefone || "").trim(),
    texto,
    String(tipo || "auto").trim().toLowerCase(),
    Number(pedidoId || 0) || null,
    String(etapa || "").trim().toLowerCase(),
    String(cooldownTelefone || "").trim(),
    String(cooldownTipo || "").trim().toLowerCase(),
    now,
    now,
    now,
    now,
    now
  );
  return Number(info.lastInsertRowid || 0);
}

async function enviarItemOutbox(item) {
  const canal = String(item?.canal || "wppconnect").toLowerCase();
  let resultado;
  if (canal === "wppconnect") {
    resultado = await wppSendText(item.telefone, item.mensagem);
    if (
      !resultado.ok &&
      item.fallback_telefone &&
      wppErroWidInvalido(resultado)
    ) {
      resultado = await wppSendText(item.fallback_telefone, item.mensagem);
    }
  } else if (canal === "wati") {
    resultado = await watiSendSessionMessage(item.telefone, item.mensagem);
  } else if (canal === "zapi") {
    resultado = await zapiSendText(item.telefone, item.mensagem, item.dedupe_key);
  } else {
    resultado = { ok: false, error: "invalid_channel" };
  }
  return resultado;
}

let processandoWhatsappOutbox = false;
async function processarWhatsappOutbox() {
  if (processandoWhatsappOutbox) return;
  processandoWhatsappOutbox = true;
  try {
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE whatsapp_outbox
      SET status = 'expirado', updated_at = ?
      WHERE status IN ('pendente', 'processando') AND expires_at <= ?
    `).run(nowIso, nowIso);

    const itens = db.prepare(`
      SELECT * FROM whatsapp_outbox
      WHERE status = 'pendente' AND next_attempt_at <= ? AND expires_at > ?
      ORDER BY next_attempt_at ASC, id ASC
      LIMIT 5
    `).all(nowIso, nowIso);

    for (const item of itens) {
      const lock = db.prepare(`
        UPDATE whatsapp_outbox
        SET status = 'processando', updated_at = ?
        WHERE id = ? AND status = 'pendente'
      `).run(new Date().toISOString(), item.id);
      if (!lock.changes) continue;

      const resultado = await enviarItemOutbox(item);
      const finishedAt = new Date();
      if (resultado.ok) {
        db.prepare(`
          UPDATE whatsapp_outbox
          SET status = 'enviado', attempts = attempts + 1, last_error = NULL,
              sent_at = ?, updated_at = ?
          WHERE id = ?
        `).run(finishedAt.toISOString(), finishedAt.toISOString(), item.id);
        if (item.pedido_id && item.etapa) {
          registrarNotificacaoClienteEnviada(
            item.pedido_id,
            item.etapa,
            item.canal,
            item.fallback_telefone || item.telefone
          );
        }
        if (item.cooldown_telefone && item.cooldown_tipo) {
          registrarCooldownRespostaAutomatica({
            telefone: item.cooldown_telefone,
            mensagem: item.mensagem,
            tipo: item.cooldown_tipo,
          });
        }
        console.log("[WHATSAPP-OUTBOX] Mensagem enviada:", { id: item.id, tipo: item.tipo });
        continue;
      }

      const attempts = Number(item.attempts || 0) + 1;
      const esgotado = attempts >= WHATSAPP_OUTBOX_MAX_ATTEMPTS;
      const atrasoMs = Math.min(30 * 1000 * 2 ** Math.max(attempts - 1, 0), 10 * 60 * 1000);
      db.prepare(`
        UPDATE whatsapp_outbox
        SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
        WHERE id = ?
      `).run(
        esgotado ? "falhou" : "pendente",
        attempts,
        new Date(finishedAt.getTime() + atrasoMs).toISOString(),
        resumirErroEnvio(resultado),
        finishedAt.toISOString(),
        item.id
      );
      console.warn("[WHATSAPP-OUTBOX] Tentativa falhou:", {
        id: item.id,
        tipo: item.tipo,
        attempts,
        error: resultado.error || resultado.status || "send_failed",
      });
    }
  } finally {
    processandoWhatsappOutbox = false;
  }
}

async function notificarCliente(pedido, etapa, options = {}) {
  const pedidoId = Number(pedido?.id || 0);
  const etapaNorm = String(etapa || "").trim().toLowerCase();
  const force = Boolean(options?.force);
  if (pedidoId && etapaNorm && !force && notificacaoClienteJaEnviada(pedidoId, etapaNorm)) {
    console.log("[WHATSAPP] Notificacao ja enviada, evitando duplicidade:", {
      pedidoId,
      etapa: etapaNorm,
    });
    return { ok: true, skipped: true, duplicate: true, error: "already_sent" };
  }
  const useWpp = wppConfigured();
  const useWati = Boolean(getWatiBaseUrl() && WATI_TOKEN);
  const useZapi = Boolean(ZAPI_INSTANCE_ID && ZAPI_TOKEN);
  if (!useWpp && !useWati && !useZapi) {
    return { ok: false, skipped: true, error: "not_configured" };
  }
  const telefoneBase = normalizePhoneNumber(pedido?.telefone || "");
  if (!telefoneBase) return { ok: false, skipped: true, error: "missing_phone" };
  const telefone = resolvePhoneForCustomerMessage(telefoneBase) || telefoneBase;
  if (telefone !== telefoneBase) {
    console.log("[WHATSAPP] Telefone ajustado para envio:", telefoneBase, "->", telefone);
  }
  const mensagem = construirMensagemPedido(pedido, etapa);
  if (!mensagem) return { ok: false, skipped: true, error: "empty_message" };
  const messageId = `pedido-${pedido?.id || "0"}-${etapa}`;
  const resultado = useWpp
    ? await wppSendText(telefone, mensagem)
    : useWati
    ? await watiSendSessionMessage(telefone, mensagem)
    : await zapiSendText(telefone, mensagem, messageId);
  if (!resultado.ok) {
    console.warn("[WHATSAPP] Falha ao enviar mensagem:", resultado);
    const canal = useWpp ? "wppconnect" : useWati ? "wati" : "zapi";
    const dedupeKey = force
      ? criarDedupeKeyOutbox("pedido-force", [pedidoId, etapaNorm, telefone, Date.now()])
      : `pedido:${pedidoId || "sem-id"}:${etapaNorm || etapa}`;
    const outboxId = enfileirarMensagemWhatsapp({
      dedupeKey,
      canal,
      telefone,
      mensagem,
      tipo: "pedido",
      pedidoId,
      etapa: etapaNorm,
      ttlMs: WHATSAPP_OUTBOX_PEDIDO_TTL_MS,
      erro: resultado,
    });
    return { ...resultado, queued: Boolean(outboxId), outboxId };
  } else {
    registrarMensagemWhatsappEnviada({
      dedupeKey: force
        ? criarDedupeKeyOutbox("pedido-force", [pedidoId, etapaNorm, telefone, Date.now()])
        : `pedido:${pedidoId || "sem-id"}:${etapaNorm || etapa}`,
      canal: useWpp ? "wppconnect" : useWati ? "wati" : "zapi",
      telefone,
      mensagem,
      tipo: "pedido",
      pedidoId,
      etapa: etapaNorm,
    });
    if (pedidoId && etapaNorm) {
      registrarNotificacaoClienteEnviada(
        pedidoId,
        etapaNorm,
        useWpp ? "wppconnect" : useWati ? "wati" : "zapi",
        telefone
      );
    }
    console.log("[WHATSAPP] Mensagem enviada:", {
      pedidoId: pedidoId || "",
      etapa: etapaNorm || etapa,
      telefone,
    });
  }
  return resultado;
}

const alertasAtendimentoCache = new Map();

function getNumeroAtendenteAlerta() {
  const fromEnv = normalizePhoneNumber(BOT_ALERT_ATTENDANT_PHONE);
  if (fromEnv) return fromEnv;
  const fromConfig = normalizePhoneNumber(getConfigValue("atendente_alerta_whatsapp", ""));
  if (fromConfig) return fromConfig;
  return "";
}

function getGrupoAtendenteAlerta() {
  return "";
}

async function alertarAtendenteConversaSemResposta({
  canal = "",
  telefone = "",
  nome = "",
  texto = ""
} = {}) {
  const numeroCliente = normalizeCustomerPhone(telefone);
  const textoCliente = String(texto || "").trim();
  const nomeCliente = String(nome || "").trim();
  if (!numeroCliente || !textoCliente) return;

  const numeroAtendente = getNumeroAtendenteAlerta();
  const grupoAtendente = getGrupoAtendenteAlerta();
  if (!grupoAtendente && (!numeroAtendente || numeroAtendente === numeroCliente)) return;

  const agora = Date.now();
  const ultimo = alertasAtendimentoCache.get(numeroCliente) || 0;
  if (agora - ultimo < BOT_ALERT_COOLDOWN_MS) return;
  alertasAtendimentoCache.set(numeroCliente, agora);

  if (alertasAtendimentoCache.size > 1500) {
    for (const [key, ts] of alertasAtendimentoCache.entries()) {
      if (agora - ts > BOT_ALERT_COOLDOWN_MS * 2) {
        alertasAtendimentoCache.delete(key);
      }
    }
  }

  const canalLabel = String(canal || "").trim().toUpperCase() || "WHATSAPP";
  const linkApp = `whatsapp://send?phone=${numeroCliente}`;
  const mensagem = [
    "ATENCAO: conversa para atendimento humano.",
    `Canal: ${canalLabel}`,
    ...(nomeCliente ? [`Cliente: ${nomeCliente}`] : []),
    `Cliente: ${numeroCliente}`,
    `Mensagem: ${textoCliente.slice(0, 500)}`,
    `Abrir no app: ${linkApp}`,
    "Abra essa conversa e responda manualmente."
  ].join("\n");

  const useWpp = wppConfigured();
  const useWati = Boolean(getWatiBaseUrl() && WATI_TOKEN);
  const useZapi = Boolean(ZAPI_INSTANCE_ID && ZAPI_TOKEN);
  if (!useWpp && !useWati && !useZapi) return;

  let resultado = { ok: false, error: "not_configured" };
  if (useWpp && grupoAtendente) {
    console.log("[BOT] Alerta humano -> grupo:", grupoAtendente, "cliente:", numeroCliente);
    resultado = await wppSendGroupText(grupoAtendente, mensagem);
    if (!resultado.ok && numeroAtendente) {
      console.warn("[BOT] Falha no grupo. Tentando numero atendente:", numeroAtendente);
      resultado = await wppSendText(numeroAtendente, mensagem);
    }
  } else if (numeroAtendente) {
    console.log("[BOT] Alerta humano -> numero:", numeroAtendente, "cliente:", numeroCliente);
    resultado = useWpp
      ? await wppSendText(numeroAtendente, mensagem)
      : useWati
      ? await watiSendSessionMessage(numeroAtendente, mensagem)
      : await zapiSendText(numeroAtendente, mensagem, `alerta-humano-${Date.now()}`);
  }

  if (!resultado.ok) {
    console.warn("[BOT] Falha ao alertar atendente:", resultado);
  }
}

async function telegramSendMessage(message) {
  const token = String(TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chatId) return { ok: false, error: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: String(message || "").trim() || "Alerta sem mensagem",
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || "fetch_error" };
  } finally {
    clearTimeout(timeout);
  }
}

async function enviarAlertaOperacional(mensagem) {
  const texto = String(mensagem || "").trim();
  if (!texto) return;

  const resultados = [];
  const tg = await telegramSendMessage(texto);
  resultados.push({ canal: "telegram", ...tg });

  const useWpp = wppConfigured();
  const grupoAtendente = getGrupoAtendenteAlerta();
  const numeroAtendente = getNumeroAtendenteAlerta();
  if (useWpp && grupoAtendente) {
    const res = await wppSendGroupText(grupoAtendente, texto);
    resultados.push({ canal: "wpp_group", ...res });
    if (!res.ok && numeroAtendente) {
      const fallback = await wppSendText(numeroAtendente, texto);
      resultados.push({ canal: "wpp_phone_fallback", ...fallback });
    }
  } else if (useWpp && numeroAtendente) {
    const res = await wppSendText(numeroAtendente, texto);
    resultados.push({ canal: "wpp_phone", ...res });
  }

  const ok = resultados.some((item) => item.ok);
  if (!ok) {
    console.warn("[ALERTA] Nenhum canal aceitou o alerta operacional:", resultados);
  }
}

const wppMonitorState = {
  enabled: Boolean(WPP_BASE_URL && WPP_SESSION),
  lastStatus: "unknown",
  lastError: "",
  lastCheckAt: null,
  lastChangeAt: null,
  lastAlertAt: null,
  lastReconnectAt: null,
  reconnecting: false,
  reconnectFailures: 0,
  lastReconnectError: "",
};

function normalizarStatusWpp(rawStatus) {
  if (rawStatus && typeof rawStatus === "object") {
    const candidato =
      rawStatus?.status ??
      rawStatus?.state ??
      rawStatus?.response ??
      rawStatus?.connected ??
      rawStatus?.isConnected ??
      rawStatus?.result ??
      rawStatus?.value;
    if (typeof candidato !== "undefined" && candidato !== rawStatus) {
      return normalizarStatusWpp(candidato);
    }
    return "unknown";
  }
  if (typeof rawStatus === "boolean") {
    return rawStatus ? "CONNECTED" : "DISCONNECTED";
  }
  const bruto = String(rawStatus || "").trim();
  if (!bruto) return "unknown";
  const lower = bruto.toLowerCase();
  if (
    lower === "true" ||
    lower === "1" ||
    lower === "connected" ||
    lower === "open" ||
    lower === "online" ||
    lower === "ready" ||
    lower === "authenticated"
  ) {
    return "CONNECTED";
  }
  if (
    lower === "false" ||
    lower === "0" ||
    lower === "disconnected" ||
    lower === "close" ||
    lower === "closed" ||
    lower === "offline"
  ) {
    return "DISCONNECTED";
  }
  if (lower === "syncing") return "SYNCING";
  return bruto;
}

function isWppStatusConnected(status) {
  const s = normalizarStatusWpp(status).toUpperCase();
  return s === "CONNECTED";
}

function isWppStatusTentandoConectar(status) {
  const s = normalizarStatusWpp(status).toUpperCase();
  return (
    s === "CONNECTING" ||
    s === "OPENING" ||
    s === "STARTING" ||
    s === "SYNCING" ||
    s === "PAIRING" ||
    s === "QRCODE"
  );
}

function montarWebhookWppPublico() {
  const publicUrl = getPublicUrl();
  if (!publicUrl) return "";
  const base = `${publicUrl}/webhook/wppconnect`;
  if (!WPP_WEBHOOK_TOKEN) return base;
  return `${base}?token=${encodeURIComponent(WPP_WEBHOOK_TOKEN)}`;
}

async function tentarRecuperarSessaoWpp() {
  if (!wppConfigured()) return { ok: false, error: "not_configured" };
  const session = encodeURIComponent(WPP_SESSION);
  const payload = {
    waitQrCode: false,
    autoClose: 0,
  };
  const webhook = montarWebhookWppPublico();
  if (webhook) payload.webhook = webhook;

  const start = await wppRequestJson(`/api/${session}/start-session`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (start.ok) return { ok: true, source: "start-session" };

  // Em algumas condicoes o start falha mas a sessao sobe poucos segundos depois.
  const statusApos = await consultarStatusWppMonitor();
  if (statusApos.ok && (isWppStatusConnected(statusApos.status) || isWppStatusTentandoConectar(statusApos.status))) {
    return { ok: true, source: "status-check", status: statusApos.status };
  }

  return {
    ok: false,
    error:
      start?.error ||
      start?.body?.message ||
      (start?.status ? `http_${start.status}` : "start_failed"),
  };
}

async function consultarStatusWppMonitor() {
  if (!wppConfigured()) return { status: "not_configured", ok: false };
  const session = encodeURIComponent(WPP_SESSION);

  // status-session reflects QR/UNPAIRED states better than check-connection-session,
  // which can report "Connected" while WhatsApp Web is already back on QR.
  const statusRes = await wppRequestJson(`/api/${session}/status-session`);
  if (statusRes.ok) {
    const statusSession = normalizarStatusWpp(
      statusRes?.data?.status ||
      statusRes?.data?.state ||
      statusRes?.data?.response ||
      statusRes?.data?.connected ||
      statusRes?.data?.isConnected ||
      statusRes?.data ||
      statusRes?.body?.status ||
      ""
    );
    if (statusSession) {
      return { status: statusSession, ok: true, source: "status-session" };
    }
  }

  const check = await wppRequestJson(`/api/${session}/check-connection-session`);
  let statusCheck = "";
  if (check.ok) {
    statusCheck = normalizarStatusWpp(
      check?.data?.status ||
      check?.data?.response ||
      check?.data?.state ||
      check?.data?.connected ||
      check?.data?.isConnected ||
      check?.data?.result ||
      check?.data ||
      check?.body?.status ||
      check?.body?.state ||
      check?.body?.connected ||
      check?.body?.isConnected ||
      ""
    );
    if (isWppStatusConnected(statusCheck)) {
      return { status: statusCheck, ok: true, source: "check-connection-session" };
    }
  }

  if (check.ok) {
    return { status: statusCheck || "unknown", ok: true, source: "check-connection-session" };
  }

  const err = check?.error || statusRes?.error || "fetch_failed";
  return { status: "error", ok: false, error: err };
}

async function monitorarSessaoWpp() {
  if (!wppMonitorState.enabled) return;
  const nowIso = new Date().toISOString();
  const consulta = await consultarStatusWppMonitor();
  const novoStatus = String(consulta.status || "unknown");
  const statusAnterior = wppMonitorState.lastStatus;

  wppMonitorState.lastCheckAt = nowIso;
  wppMonitorState.lastError = consulta.ok ? "" : String(consulta.error || "status_error");

  if (novoStatus !== statusAnterior) {
    wppMonitorState.lastStatus = novoStatus;
    wppMonitorState.lastChangeAt = nowIso;
  }

  const connectedBefore = isWppStatusConnected(statusAnterior);
  const connectedNow = isWppStatusConnected(novoStatus);
  const tentandoConectar = isWppStatusTentandoConectar(novoStatus);
  const acabouDesconectando = connectedBefore && !connectedNow;

  if (connectedNow) {
    wppMonitorState.reconnectFailures = 0;
    wppMonitorState.lastReconnectError = "";
    return;
  }

  if (tentandoConectar) {
    wppMonitorState.lastReconnectError = "";
    return;
  }

  if (WPP_AUTO_RECONNECT && !tentandoConectar && !wppMonitorState.reconnecting) {
    const lastReconnect = parseEpochMillis(wppMonitorState.lastReconnectAt);
    const podeTentar = !lastReconnect || Date.now() - lastReconnect >= WPP_AUTO_RECONNECT_COOLDOWN_MS;
    if (podeTentar) {
      wppMonitorState.reconnecting = true;
      wppMonitorState.lastReconnectAt = nowIso;
      try {
        const rec = await tentarRecuperarSessaoWpp();
        if (rec.ok) {
          wppMonitorState.reconnectFailures = 0;
          wppMonitorState.lastReconnectError = "";
          console.log(`[WPP-MONITOR] Reconexao acionada (${rec.source || "start-session"}).`);
        } else {
          wppMonitorState.reconnectFailures += 1;
          wppMonitorState.lastReconnectError = String(rec.error || "reconnect_failed");
          console.warn("[WPP-MONITOR] Falha ao tentar reconectar:", wppMonitorState.lastReconnectError);
        }
      } finally {
        wppMonitorState.reconnecting = false;
      }
    }
  }

  const now = Date.now();
  const lastAlert = parseEpochMillis(wppMonitorState.lastAlertAt);
  if (lastAlert && now - lastAlert < WPP_AUTO_RECONNECT_ALERT_EVERY_MS) return;

  const alertaPorFalhaPersistente = wppMonitorState.reconnectFailures >= 2;
  if (!acabouDesconectando && !alertaPorFalhaPersistente) return;

  const mensagem = [
    "ALERTA: sessao do WhatsApp desconectada.",
    `Sessao: ${WPP_SESSION}`,
    `Status atual: ${novoStatus}`,
    `Horario: ${nowIso}`,
    WPP_AUTO_RECONNECT
      ? `Auto-reconexao: ligada (${wppMonitorState.reconnectFailures} falhas recentes).`
      : "Auto-reconexao: desligada.",
    wppMonitorState.lastReconnectError
      ? `Ultimo erro: ${wppMonitorState.lastReconnectError}`
      : "",
    "Verifique o QR Code em /adminn/config.html."
  ]
    .filter(Boolean)
    .join("\n");
  await enviarAlertaOperacional(mensagem);
  wppMonitorState.lastAlertAt = nowIso;
}

function webhookAutorizado(req) {
  if (!ZAPI_WEBHOOK_TOKEN) return true;
  const token = String(req.query.token || req.headers["x-webhook-token"] || "");
  return token && token === ZAPI_WEBHOOK_TOKEN;
}

function extrairTextoWebhook(body) {
  const texto = body?.text?.message || body?.message || body?.body || body?.content || "";
  return String(texto || "").trim();
}

function extrairTelefoneWebhook(body) {
  const candidato =
    body?.phone ||
    body?.from ||
    body?.sender?.phone ||
    body?.sender?.id ||
    body?.sender?.phoneNumber ||
    "";
  return normalizePhoneNumber(candidato);
}

function extrairNomeWebhook(body) {
  const candidato =
    body?.sender?.name ||
    body?.sender?.pushName ||
    body?.senderName ||
    body?.name ||
    "";
  return String(candidato || "").trim();
}

function zapiMensagemEhFoto(body) {
  const tipo = String(
    body?.type ||
      body?.messageType ||
      body?.message?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.image?.mimeType ||
      body?.image?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("image") ||
    tipo.includes("photo") ||
    Boolean(body?.image || body?.photo) ||
    mime.startsWith("image/")
  );
}

function zapiMensagemEhAudio(body) {
  const tipo = String(
    body?.type ||
      body?.messageType ||
      body?.message?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.audio?.mimeType ||
      body?.audio?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("audio") ||
    tipo.includes("ptt") ||
    Boolean(body?.audio || body?.voice) ||
      mime.startsWith("audio/")
  );
}

function zapiMensagemEhDocumento(body) {
  const tipo = String(
    body?.type ||
      body?.messageType ||
      body?.message?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.document?.mimeType ||
      body?.document?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("document") ||
    tipo.includes("file") ||
    tipo.includes("attachment") ||
    Boolean(body?.document || body?.file) ||
    mime.startsWith("application/")
  );
}

function watiWebhookAutorizado(req) {
  if (!WATI_WEBHOOK_TOKEN) return true;
  const token = String(req.query.token || req.headers["x-webhook-token"] || "");
  return token && token === WATI_WEBHOOK_TOKEN;
}

function wppWebhookAutorizado(req) {
  if (!WPP_WEBHOOK_TOKEN) return true;
  const raw = String(
    req.query.token || req.headers["x-webhook-token"] || req.headers["authorization"] || ""
  ).trim();
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw;
  return token && token === WPP_WEBHOOK_TOKEN;
}

function extrairTextoWati(body) {
  const texto =
    body?.text ||
    body?.message?.text ||
    body?.message ||
    body?.body ||
    body?.data?.text ||
    "";
  return String(texto || "").trim();
}

function extrairTelefoneWati(body) {
  const candidato =
    body?.waId ||
    body?.waid ||
    body?.whatsappNumber ||
    body?.from ||
    body?.contact?.waId ||
    body?.data?.waId ||
    body?.data?.whatsappNumber ||
    "";
  return normalizePhoneNumber(candidato);
}

function extrairNomeWati(body) {
  const candidato =
    body?.senderName ||
    body?.contact?.name ||
    body?.contact?.profileName ||
    body?.data?.senderName ||
    body?.data?.contact?.name ||
    "";
  return String(candidato || "").trim();
}

function watiMensagemEhFoto(body) {
  const tipo = String(
    body?.messageType ||
      body?.type ||
      body?.message?.type ||
      body?.data?.messageType ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.message?.mimeType ||
      body?.message?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("image") ||
    tipo.includes("photo") ||
    Boolean(body?.image || body?.photo) ||
    mime.startsWith("image/")
  );
}

function watiMensagemEhAudio(body) {
  const tipo = String(
    body?.messageType ||
      body?.type ||
      body?.message?.type ||
      body?.data?.messageType ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.message?.mimeType ||
      body?.message?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("audio") ||
    tipo.includes("voice") ||
    tipo.includes("ptt") ||
      mime.startsWith("audio/")
  );
}

function watiMensagemEhDocumento(body) {
  const tipo = String(
    body?.messageType ||
      body?.type ||
      body?.message?.type ||
      body?.data?.messageType ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    body?.mimeType ||
      body?.mimetype ||
      body?.message?.mimeType ||
      body?.message?.mimetype ||
      body?.data?.mimeType ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("document") ||
    tipo.includes("file") ||
    tipo.includes("attachment") ||
    mime.startsWith("application/")
  );
}

function extrairTextoWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const texto =
    message?.body ||
    message?._data?.body ||
    message?.text ||
    message?._data?.text ||
    body?.text ||
    body?.message?.text?.body ||
    "";
  return String(texto || "").trim();
}

function extrairWppIdTexto(valor) {
  if (!valor) return "";
  if (typeof valor === "string" || typeof valor === "number") return String(valor).trim();
  if (typeof valor !== "object") return "";

  const server = String(valor.server || "").trim();
  const user = String(valor.user || "").trim();
  const candidatos = [
    valor._serialized,
    valor.serialized,
    valor.id,
    user && server ? `${user}@${server}` : "",
    user,
  ];
  for (const candidato of candidatos) {
    const texto = String(candidato || "").trim();
    if (texto && texto !== "[object Object]") return texto;
  }
  return "";
}

function extrairTelefoneWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const candidatos = [
    message?.sender?.id?._serialized,
    message?.sender?.id?.user,
    message?.sender?.id,
    body?.sender?.id?._serialized,
    body?.sender?.id?.user,
    body?.sender?.id,
    message?.id?.remote?._serialized,
    message?.id?.remote?.user,
    message?.author,
    message?._data?.author,
    message?.from,
    message?._data?.from,
    body?.from,
  ];
  let fallback = "";
  for (const candidato of candidatos) {
    const raw = extrairWppIdTexto(candidato).toLowerCase();
    if (!raw) continue;
    if (raw.endsWith("@lid")) continue;
    const numero = normalizeCustomerPhone(raw);
    if (!numero) continue;
    const local = numero.startsWith("55") ? numero.slice(2) : numero;
    if (local.length === 10 || local.length === 11) return numero;
    if (!fallback) fallback = numero;
  }
  return fallback;
}

function extrairDestinoRespostaWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const candidatos = [
    message?.sender?.id?._serialized,
    message?.sender?.id?.user,
    message?.sender?.id,
    body?.sender?.id?._serialized,
    body?.sender?.id?.user,
    body?.sender?.id,
    message?.id?.remote?._serialized,
    message?.id?.remote?.user,
    message?.from,
    message?._data?.from,
    message?.author,
    message?._data?.author,
    body?.from,
  ];
  let lidFallback = "";
  let numeroFallback = "";
  for (const candidato of candidatos) {
    const raw = extrairWppIdTexto(candidato);
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (lower.endsWith("@c.us")) return lower;
    if (lower.endsWith("@lid")) {
      if (!lidFallback) lidFallback = lower;
      continue;
    }
    if (lower.includes("@")) return lower;
    const digits = lower.replace(/\D/g, "");
    if (!digits) continue;
    if (digits.length >= 14) {
      if (!lidFallback) lidFallback = `${digits}@lid`;
      continue;
    }
    const numero = normalizeCustomerPhone(digits);
    if (!numero) continue;
    const local = numero.startsWith("55") ? numero.slice(2) : numero;
    if (local.length === 10 || local.length === 11) return numero;
    if (!numeroFallback) numeroFallback = numero;
  }
  return numeroFallback || lidFallback;
}

function extrairNomeWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const candidato =
    message?.sender?.pushname ||
    message?.sender?.name ||
    message?._data?.notifyName ||
    message?._data?.pushname ||
    body?.data?.sender?.pushname ||
    body?.sender?.pushname ||
    "";
  return String(candidato || "").trim();
}

function wppMensagemEhGrupo(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const remoto =
    message?.id?.remote ||
    message?._data?.id?.remote ||
    message?.from ||
    message?._data?.from ||
    "";
  return Boolean(
    message?.isGroupMsg ||
      message?._data?.isGroupMsg ||
      message?.isGroup ||
      message?._data?.isGroup ||
      (typeof remoto === "string" && remoto.includes("@g.us"))
  );
}

function wppMensagemFromMe(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const selfFlag = String(body?.self || body?.data?.self || "").toLowerCase().trim();
  return Boolean(
    message?.fromMe ||
      message?._data?.fromMe ||
      body?.fromMe ||
      body?.data?.fromMe ||
      message?.id?.fromMe ||
      message?._data?.id?.fromMe ||
      message?.isSentByMe ||
      message?._data?.isSentByMe ||
      selfFlag === "out"
  );
}

function wppMensagemEhFoto(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const tipo = String(
    message?.type ||
      message?._data?.type ||
      body?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    message?.mimetype ||
      message?._data?.mimetype ||
      body?.mimetype ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("image") ||
    tipo.includes("photo") ||
    mime.startsWith("image/")
  );
}

function wppMensagemEhAudio(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const tipo = String(
    message?.type ||
      message?._data?.type ||
      body?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    message?.mimetype ||
      message?._data?.mimetype ||
      body?.mimetype ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("audio") ||
    tipo.includes("ptt") ||
      mime.startsWith("audio/")
  );
}

function wppMensagemEhDocumento(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const tipo = String(
    message?.type ||
      message?._data?.type ||
      body?.type ||
      body?.data?.type ||
      ""
  )
    .toLowerCase()
    .trim();
  const mime = String(
    message?.mimetype ||
      message?._data?.mimetype ||
      body?.mimetype ||
      body?.data?.mimetype ||
      ""
  )
    .toLowerCase()
    .trim();
  return (
    tipo.includes("document") ||
    tipo.includes("file") ||
    tipo.includes("attachment") ||
    Boolean(message?.document || message?._data?.documentMessage) ||
    mime.startsWith("application/")
  );
}

function extrairTimestampWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const candidatos = [
    message?.timestamp,
    message?.t,
    message?._data?.timestamp,
    message?._data?.t,
    body?.timestamp,
    body?.ts,
    body?.eventTimestamp,
    body?.data?.timestamp,
    body?.data?.ts,
  ];
  for (const candidato of candidatos) {
    const ts = parseEpochMillis(candidato);
    if (ts > 0) return ts;
  }
  return 0;
}

function wppMensagemEhAntiga(body) {
  const ts = extrairTimestampWpp(body);
  if (!ts) return false;
  return Date.now() - ts > BOT_WPP_MAX_MESSAGE_AGE_MS;
}

function extrairIdMensagemWpp(body) {
  const message = body?.data?.message || body?.message || body?.data || body || {};
  const candidatos = [
    message?.id?._serialized,
    message?._data?.id?._serialized,
    message?.id?.id,
    message?._data?.id?.id,
    message?.id,
    message?._data?.id,
    body?.data?.id?._serialized,
    body?.id?._serialized,
    body?.data?.id?.id,
    body?.id?.id,
  ];
  for (const candidato of candidatos) {
    const valor = String(candidato || "").trim();
    if (!valor) continue;
    if (valor === "[object Object]") continue;
    return valor;
  }
  return "";
}

function deveIgnorarEventoWppDuplicado(body) {
  const eventId = extrairIdMensagemWpp(body);
  if (!eventId) return false;

  const chave = `wpp:${eventId}`;
  const agora = Date.now();
  const ultimo = botInboundWppEventCache.get(chave) || 0;
  if (agora - ultimo < 10 * 60 * 1000) {
    return true;
  }

  botInboundWppEventCache.set(chave, agora);
  if (botInboundWppEventCache.size > 12000) {
    for (const [k, ts] of botInboundWppEventCache.entries()) {
      if (agora - ts > 24 * 60 * 60 * 1000) {
        botInboundWppEventCache.delete(k);
      }
    }
  }
  return false;
}

const BOT_MENSAGEM_PLACEHOLDERS = Object.freeze({
  link_cardapio: "{{link_cardapio}}",
  tempo_entrega: "{{tempo_entrega}}",
  tempo_retirada: "{{tempo_retirada}}",
  taxa_entrega: "{{taxa_entrega}}",
  horario_atendimento: "{{horario_atendimento}}",
  msg_pix: "{{msg_pix}}",
});

const BOT_MENSAGENS_SUGERIDAS = Object.freeze([
  {
    titulo: "Saudacao + link do cardapio",
    palavras_chave: "oi,ola,opa,bom dia,boa tarde,boa noite,menu,cardapio,catalogo,link",
    mensagem: [
      "🍔 Mega Lanches",
      "",
      "✅ Para pedir AGORA, clique no cardapio:",
      "https://megalanches-cardapio.com.br",
      "",
      "Passo rapido:",
      "1) Adicione os itens",
      "2) Abra o CARRINHO",
      "3) Clique em Finalizar",
      "4) Coloque seus dados para entrega ou retirada",
      "",
      `💳 Pix: ${BOT_MENSAGEM_PLACEHOLDERS.msg_pix}`,
      `🕒 Horario: ${BOT_MENSAGEM_PLACEHOLDERS.horario_atendimento}`,
      `🚚 Taxa de entrega: R$ ${BOT_MENSAGEM_PLACEHOLDERS.taxa_entrega}`,
    ].join("\n"),
  },
  {
    titulo: "Tempo de entrega e retirada",
    palavras_chave: "quanto tempo,tempo de entrega,tempo da entrega,tempo de retirada,prazo,previsao,estimativa,quanto demora",
    mensagem: [
      `A entrega ja esta rolando: chega em ate ${BOT_MENSAGEM_PLACEHOLDERS.tempo_entrega} min.`,
      `Retirada: tempo medio de ${BOT_MENSAGEM_PLACEHOLDERS.tempo_retirada} min.`,
    ].join("\n"),
  },
  {
    titulo: "Pagamento Pix",
    palavras_chave: "pix,pagar,pagamento,chave pix",
    mensagem: [
      "Pagamento via Pix:",
      `${BOT_MENSAGEM_PLACEHOLDERS.msg_pix}`,
      "Depois envie o comprovante aqui no WhatsApp.",
    ].join("\n"),
  },
  {
    titulo: "Taxa e horario",
    palavras_chave: "taxa,frete,horario,funcionamento,abre,fecha",
    mensagem: [
      `Taxa de entrega: R$ ${BOT_MENSAGEM_PLACEHOLDERS.taxa_entrega}`,
      `Horario de atendimento: ${BOT_MENSAGEM_PLACEHOLDERS.horario_atendimento}`,
    ].join("\n"),
  },
  {
    titulo: "Endereco para entrega",
    palavras_chave: "endereco,entregar,minha rua,bairro,cep",
    mensagem: "Para entrega, envie endereco completo com numero e ponto de referencia.",
  },
]);

function splitPalavrasChave(valor) {
  return String(valor || "")
    .split(/[,\n;|]/g)
    .map((item) => normalizarTextoBusca(item))
    .filter(Boolean);
}

function montarHorarioAtendimento() {
  const abre = formatarHorarioHumano(getConfigValue("funcionamento_abre", "18:30"));
  const fecha = formatarHorarioHumano(getConfigValue("funcionamento_fecha", "23:30"));
  if (abre && fecha) return `${abre} as ${fecha}`;
  return "18h30 as 23h30";
}

function interpolarMensagemBot(mensagem) {
  let saida = String(mensagem || "");
  const substituicoes = {
    link_cardapio: getPublicUrl(),
    tempo_entrega: String(toNumber(getConfigValue("tempo_entrega_min", "45"), 45)),
    tempo_retirada: String(toNumber(getConfigValue("tempo_retirada_min", "20"), 20)),
    taxa_entrega: String(toNumber(getConfigValue("taxa_entrega", "9"), 9).toFixed(2)),
    horario_atendimento: montarHorarioAtendimento(),
    msg_pix: getConfigValue("msg_pix", "Envie o comprovante do Pix no WhatsApp."),
  };

  Object.entries(substituicoes).forEach(([chave, valor]) => {
    const rgx = new RegExp(`\\{\\{\\s*${chave}\\s*\\}\\}`, "gi");
    saida = saida.replace(rgx, String(valor || ""));
  });

  return saida.trim();
}

function construirRespostaPorPalavraChave(texto) {
  const textoBusca = normalizarTextoBusca(texto);
  if (!textoBusca) return { mensagem: "", tipo: "" };
  const fluxoPagamento = mensagemEhFluxoPagamento(textoBusca);
  const perguntouTempo = mensagemPerguntaTempoEntrega(textoBusca);
  const rows = db
    .prepare("SELECT palavras_chave, mensagem FROM bot_mensagens WHERE ativo = 1 ORDER BY ordem ASC, id ASC")
    .all();

  for (const row of rows) {
    const palavras = splitPalavrasChave(row.palavras_chave);
    if (!palavras.length) continue;
    const regraPagamento = palavras.some((palavra) =>
      ["pix", "pagamento", "comprovante", "chave", "transferencia", "deposito"].some((token) =>
        palavra.includes(token)
      )
    );
    const regraTempo = palavras.some((palavra) =>
      ["tempo", "demora", "prazo", "previsao", "estimativa"].some((token) =>
        palavra.includes(token)
      )
    );
    if (fluxoPagamento && !regraPagamento) continue;
    if (!fluxoPagamento && regraPagamento) continue;
    if (regraTempo && !perguntouTempo) continue;
    const palavrasComparacao = regraTempo
      ? palavras.filter((palavra) => palavra !== "entrega" && palavra !== "retirada")
      : palavras;
    const bateu = palavrasComparacao.some((palavra) => textoBusca.includes(palavra));
    if (bateu) {
      const regraSaudacao = !regraPagamento && palavras.some((palavra) => solicitouCardapioOuSaudacao(palavra));
      return {
        mensagem: interpolarMensagemBot(row.mensagem),
        tipo: regraPagamento ? "pix" : regraSaudacao ? "saudacao" : regraTempo ? "tempo" : "auto",
      };
    }
  }

  return { mensagem: "", tipo: "" };
}

function construirRespostaRapida(texto) {
  if (mensagemPerguntaTempoEntrega(texto)) {
    return construirMensagemTempoAtendimento();
  }

  return "";
}

function mensagemPerguntaTempoEntrega(texto) {
  const textoNormalizado = normalizarTextoBusca(texto);
  if (!textoNormalizado || mensagemEhFluxoPagamento(textoNormalizado)) return false;
  const padroes = [
    /\bquanto tempo\b/,
    /\bem quanto tempo\b/,
    /\bqual (e o |o )?tempo\b/,
    /\bqual (e a |a )?previsao\b/,
    /\bprevisao de entrega\b/,
    /\bestimativa de entrega\b/,
    /\bprazo de entrega\b/,
    /\btempo de entrega\b/,
    /\btempo da entrega\b/,
    /\btempo para entrega\b/,
    /\btempo pra entrega\b/,
    /\btempo de retirada\b/,
    /\btempo da retirada\b/,
    /\bquanto demora\b/,
    /\bvai demorar\b/,
    /\bdemora muito\b/,
    /\bquando fica pronto\b/,
    /\bquanto tempo pra ficar pronto\b/,
  ];
  return padroes.some((padrao) => padrao.test(textoNormalizado));
}

function mensagemPerguntaStatusPedido(texto) {
  const textoNormalizado = normalizarTextoBusca(texto);
  if (!textoNormalizado || mensagemEhFluxoPagamento(textoNormalizado)) return false;
  const padroes = [
    /\bstatus\b/,
    /\bja saiu\b/,
    /\bja esta saindo\b/,
    /\bja ta saindo\b/,
    /\besta saindo\b/,
    /\bta saindo\b/,
    /\bsaiu para entrega\b/,
    /\bem preparo\b/,
    /\besta em preparo\b/,
    /\bta em preparo\b/,
    /\besta pronto\b/,
    /\bta pronto\b/,
    /\bpronto para retirada\b/,
    /\bem entrega\b/,
    /\bta chegando\b/,
    /\besta chegando\b/,
  ];
  return padroes.some((padrao) => padrao.test(textoNormalizado));
}

function construirMensagemTempoAtendimento() {
  const tempoEntrega = toNumber(getConfigValue("tempo_entrega_min", "60"), 60);
  const tempoRetirada = toNumber(getConfigValue("tempo_retirada_min", "30"), 30);
  return [
    `A entrega ja esta rolando: segura ai que chega em ate ${tempoEntrega} min, mais ou menos! O motoboy ta voando. 🛵💨`,
    "",
    `Vai retirar? Relaxa, a gente te avisa quando estiver prontinho! Tempo medio de ${tempoRetirada} min. 😉`,
  ].join("\n");
}

function buscarUltimoPedidoPorTelefone(telefone) {
  const numero = normalizePhoneNumber(telefone);
  if (!numero) return null;
  const rows = db
    .prepare("SELECT * FROM pedidos ORDER BY created_at DESC LIMIT 40")
    .all();
  for (const row of rows) {
    const tel = normalizePhoneNumber(row.telefone || "");
    if (tel && tel === numero) {
      return {
        ...row,
        carrinho: parseMaybeJson(row.carrinho) || [],
      };
    }
  }
  return null;
}

function botBloqueado(telefone) {
  // Bloqueio manual de contatos desativado.
  return false;
}

function registrarContatoBot(telefone, texto) {
  const numero = getContactKey(telefone);
  if (!numero) return;
  const now = new Date().toISOString();
  const existente = db.prepare("SELECT id FROM bot_contatos WHERE telefone = ?").get(numero);
  if (existente) {
    db.prepare("UPDATE bot_contatos SET ultimo_texto = ?, last_msg_at = ? WHERE id = ?").run(
      String(texto || "").trim().slice(0, 280),
      now,
      existente.id
    );
  } else {
    db.prepare(`
      INSERT INTO bot_contatos (telefone, ultimo_texto, last_msg_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(numero, String(texto || "").trim().slice(0, 280), now, now);
  }
}

function obterContatoBot(telefone) {
  const numero = getContactKey(telefone);
  if (!numero) return null;
  return (
    db
      .prepare("SELECT id, telefone, last_msg_at, created_at FROM bot_contatos WHERE telefone = ?")
      .get(numero) || null
  );
}

function obterUltimoEnvioRespostaAutomatica(telefone, tipo = "auto") {
  const numero = getContactKey(telefone);
  const tipoNorm = String(tipo || "auto").trim().toLowerCase() || "auto";
  if (!numero) return 0;
  const row = db
    .prepare("SELECT last_sent_at FROM bot_respostas_cooldown WHERE telefone = ? AND tipo = ?")
    .get(numero, tipoNorm);
  return parseIsoMillis(row?.last_sent_at || "");
}

function registrarEnvioRespostaAutomatica(telefone, tipo = "auto", quando = new Date()) {
  const numero = getContactKey(telefone);
  const tipoNorm = String(tipo || "auto").trim().toLowerCase() || "auto";
  if (!numero) return;
  const sentAt = quando instanceof Date ? quando.toISOString() : new Date().toISOString();
  db.prepare(`
    INSERT INTO bot_respostas_cooldown (telefone, tipo, last_sent_at)
    VALUES (?, ?, ?)
    ON CONFLICT(telefone, tipo) DO UPDATE SET last_sent_at = excluded.last_sent_at
  `).run(numero, tipoNorm, sentAt);
}

function parseIsoMillis(valor) {
  const ts = Date.parse(String(valor || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function parseEpochMillis(valor) {
  if (valor === null || typeof valor === "undefined" || valor === "") return 0;
  const numero = Number(valor);
  if (Number.isFinite(numero) && numero > 0) {
    return numero < 1_000_000_000_000 ? Math.trunc(numero * 1000) : Math.trunc(numero);
  }
  return parseIsoMillis(valor);
}

function deveEnviarSaudacaoInicial({ telefone = "", texto = "", ehAudio = false, contatoAnterior = null } = {}) {
  if (!getContactKey(telefone)) return false;
  const textoLimpo = String(texto || "").trim();
  if (!textoLimpo && !ehAudio) return false;

  const pediuSaudacaoOuCardapio = solicitouCardapioOuSaudacao(textoLimpo);

  // Primeiro contato sempre recebe saudacao inicial, inclusive com audio.
  if (!contatoAnterior) return true;

  const ultimaSaudacaoMs = obterUltimoEnvioRespostaAutomatica(telefone, "saudacao");
  if (pediuSaudacaoOuCardapio) {
    if (!ultimaSaudacaoMs) return true;
    return Date.now() - ultimaSaudacaoMs >= BOT_SAUDACAO_COOLDOWN_MS;
  }

  // Em audio (sem texto), reengaja somente apos um intervalo grande para evitar flood.
  if (ehAudio) {
    const ultimaInteracaoMs = parseIsoMillis(contatoAnterior.last_msg_at || contatoAnterior.created_at);
    if (!ultimaInteracaoMs) return true;
    return Date.now() - ultimaInteracaoMs >= BOT_REENGAGE_COOLDOWN_MS;
  }

  // Cliente recorrente que manda pedido direto tambem recebe saudacao
  // quando passar o cooldown configurado (ex.: 1x por dia).
  if (!ultimaSaudacaoMs) return true;
  return Date.now() - ultimaSaudacaoMs >= BOT_SAUDACAO_COOLDOWN_MS;
}

function registrarConversaPendente({ canal = "", telefone = "", nome = "", texto = "" } = {}) {
  const numero = normalizePhoneNumber(telefone);
  const mensagem = String(texto || "").trim();
  if (!numero || !mensagem) return null;

  const canalNorm = String(canal || "").trim().toLowerCase() || "whatsapp";
  const nomeCliente = String(nome || "").trim();
  const now = new Date().toISOString();

  const aberta = db
    .prepare(
      `SELECT id, mensagens_count
       FROM bot_conversas_pendentes
       WHERE telefone = ?
         AND status IN ('novo', 'em_atendimento')
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get(numero);

  if (aberta) {
    db.prepare(
      `UPDATE bot_conversas_pendentes
       SET canal = ?, nome = ?, mensagem = ?, mensagens_count = ?, updated_at = ?
       WHERE id = ?`
    ).run(canalNorm, nomeCliente, mensagem.slice(0, 1000), Math.max((aberta.mensagens_count || 0) + 1, 1), now, aberta.id);
    return aberta.id;
  }

  const info = db
    .prepare(
      `INSERT INTO bot_conversas_pendentes
       (canal, telefone, nome, mensagem, status, mensagens_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'novo', 1, ?, ?)`
    )
    .run(canalNorm, numero, nomeCliente, mensagem.slice(0, 1000), now, now);
  return Number(info.lastInsertRowid || 0);
}

function construirRespostaStatusPedido(telefone, texto) {
  const perguntou = mensagemPerguntaStatusPedido(texto);
  if (!perguntou) return "";

  const pedido = buscarUltimoPedidoPorTelefone(telefone);

  if (!pedido) {
    return mensagemPerguntaTempoEntrega(texto) ? construirMensagemTempoAtendimento() : "";
  }

  const tipoEntrega = String(pedido.tipoEntrega || "").toLowerCase();
  switch (pedido.status) {
    case "recebido":
      return "Seu pedido foi recebido e logo vai para o preparo.";
    case "preparo":
      return "Seu pedido esta em preparo. Estamos caprichando.";
    case "pronto":
      if (tipoEntrega.includes("retirada")) {
        return "Seu pedido esta pronto para retirada.";
      }
      return "Seu pedido esta pronto e vai sair para entrega em instantes.";
    case "em_entrega":
      return "Seu pedido ja esta saindo para entrega.";
    case "entregue":
      return "Seu pedido ja foi entregue. Obrigado.";
    case "cancelado":
      return "Seu pedido foi cancelado. Se precisar, chama a gente por aqui.";
    default:
      return mensagemPerguntaTempoEntrega(texto) ? construirMensagemTempoAtendimento() : "";
  }
}


const CARDAPIO_GATILHOS = [
  "cardapio",
  "cardap",
  "menu",
  "link",
  "catalogo",
  "catologo",
  "catalog",
];
const SAUDACAO_GATILHOS = [
  "oi",
  "ola",
  "opa",
  "eai",
  "e ai",
  "blz",
  "beleza",
  "bom dia",
  "boa tarde",
  "boa noite",
];
const botRespostaCooldownCache = new Map();
const botInboundDedupeCache = new Map();
const botInboundWppEventCache = new Map();

function getContactKey(value = "") {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) {
    const [id, sufixo = ""] = raw.split("@");
    if (sufixo === "c.us" || sufixo === "s.whatsapp.net") {
      return normalizePhoneNumber(id);
    }
    return `${id}@${sufixo}`;
  }
  return normalizePhoneNumber(raw);
}

function normalizarTextoBusca(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function mensagemEhFluxoPagamento(texto) {
  const valor = normalizarTextoBusca(texto);
  if (!valor) return false;
  if (/\bpix\b/.test(valor)) return true;
  if (/\b(comprovante|paguei|pagamento|transferencia|deposito)\b/.test(valor)) return true;
  if (/\bchave\b/.test(valor) && /\b(pix|pagamento|transferencia|deposito|valor)\b/.test(valor)) {
    return true;
  }
  return false;
}

function solicitouCardapioOuSaudacao(texto) {
  const textoNormalizado = normalizarTextoBusca(texto);
  if (!textoNormalizado) return false;
  if (mensagemEhFluxoPagamento(textoNormalizado)) return false;
  const regexSaudacao = /(^|\s)(oi+|ola+|opa+|eai|e ai|blz|beleza|bom dia|boa tarde|boa noite)(\s|$)/;
  return (
    CARDAPIO_GATILHOS.some((k) => textoNormalizado.includes(k)) ||
    SAUDACAO_GATILHOS.some((k) => textoNormalizado === k) ||
    regexSaudacao.test(textoNormalizado)
  );
}

function deveIgnorarMensagemDuplicada({ telefone = "", texto = "", ehAudio = false } = {}) {
  const numero = getContactKey(telefone);
  if (!numero) return false;

  const base = ehAudio ? "[audio]" : normalizarTextoBusca(texto);
  if (!base) return false;

  const assinatura = crypto.createHash("sha1").update(`${numero}|${base}`).digest("hex").slice(0, 20);
  const chave = `${numero}:${assinatura}`;
  const agora = Date.now();
  const ultimo = botInboundDedupeCache.get(chave) || 0;
  if (agora - ultimo < BOT_INBOUND_DEDUPE_MS) {
    return true;
  }

  botInboundDedupeCache.set(chave, agora);
  if (botInboundDedupeCache.size > 5000) {
    for (const [k, ts] of botInboundDedupeCache.entries()) {
      if (agora - ts > BOT_INBOUND_DEDUPE_MS * 4) {
        botInboundDedupeCache.delete(k);
      }
    }
  }
  return false;
}

function deveBloquearRespostaAutomatica({
  telefone = "",
  texto = "",
  mensagem = "",
  deveEnviarInicial = false,
  tipo = "",
  registrar = true,
} = {}) {
  const numero = getContactKey(telefone);
  if (!numero) return false;

  const textoNormalizado = normalizarTextoBusca(texto);
  const mensagemNormalizada = normalizarTextoBusca(mensagem);
  let tipoResposta = String(tipo || "").trim().toLowerCase();

  if (!tipoResposta) {
    if (deveEnviarInicial || solicitouCardapioOuSaudacao(textoNormalizado)) {
      tipoResposta = "saudacao";
    } else if (
      mensagemEhFluxoPagamento(textoNormalizado) ||
      mensagemEhFluxoPagamento(mensagemNormalizada)
    ) {
      tipoResposta = "pix";
    } else {
      tipoResposta = "auto";
    }
  }

  const chave = `${tipoResposta}:${numero}`;
  const agora = Date.now();
  const ultimoEnvio = Math.max(
    botRespostaCooldownCache.get(chave) || 0,
    obterUltimoEnvioRespostaAutomatica(numero, tipoResposta) || 0
  );
  const cooldownMs =
    tipoResposta === "saudacao" ? BOT_SAUDACAO_COOLDOWN_MS : BOT_AUTO_REPLY_COOLDOWN_MS;

  if (agora - ultimoEnvio < cooldownMs) {
    return true;
  }

  if (!registrar) {
    return false;
  }

  botRespostaCooldownCache.set(chave, agora);
  registrarEnvioRespostaAutomatica(numero, tipoResposta, new Date(agora));

  const maxCooldownMs = Math.max(BOT_SAUDACAO_COOLDOWN_MS, BOT_AUTO_REPLY_COOLDOWN_MS);
  if (botRespostaCooldownCache.size > 3000) {
    for (const [k, ts] of botRespostaCooldownCache.entries()) {
      if (agora - ts > maxCooldownMs * 3) {
        botRespostaCooldownCache.delete(k);
      }
    }
  }

  return false;
}

function registrarCooldownRespostaAutomatica({
  telefone = "",
  texto = "",
  mensagem = "",
  deveEnviarInicial = false,
  tipo = "",
} = {}) {
  const numero = getContactKey(telefone);
  if (!numero) return;
  const textoNormalizado = normalizarTextoBusca(texto);
  const mensagemNormalizada = normalizarTextoBusca(mensagem);
  let tipoResposta = String(tipo || "").trim().toLowerCase();
  if (!tipoResposta) {
    if (deveEnviarInicial || solicitouCardapioOuSaudacao(textoNormalizado)) {
      tipoResposta = "saudacao";
    } else if (
      mensagemEhFluxoPagamento(textoNormalizado) ||
      mensagemEhFluxoPagamento(mensagemNormalizada)
    ) {
      tipoResposta = "pix";
    } else {
      tipoResposta = "auto";
    }
  }
  const agora = Date.now();
  botRespostaCooldownCache.set(`${tipoResposta}:${numero}`, agora);
  registrarEnvioRespostaAutomatica(numero, tipoResposta, new Date(agora));
}

function formatarHorarioHumano(hhmm) {
  const valor = String(hhmm || "").trim();
  const match = valor.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return valor;
  const h = match[1].padStart(2, "0");
  const m = match[2];
  return `${h}h${m}`;
}

function formatarDiasFuncionamento(dias) {
  const nomes = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const lista = Array.isArray(dias)
    ? Array.from(new Set(dias.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b)
    : [];
  if (!lista.length || lista.length === 7) return "todos os dias";
  return lista.map((d) => nomes[d]).join(", ");
}

function construirMensagemLojaFechada(baseUrl) {
  const link = String(baseUrl || "").trim() || getPublicUrl();
  const dias = parseMaybeJson(getConfigValue("funcionamento_dias", "[]")) || [];
  const abre = formatarHorarioHumano(getConfigValue("funcionamento_abre", "18:30"));
  const fecha = formatarHorarioHumano(getConfigValue("funcionamento_fecha", "23:30"));
  const diasTxt = formatarDiasFuncionamento(dias);
  const horarioTxt = abre && fecha ? `${abre} as ${fecha}` : "consulte nossos horarios no atendimento";
  const blocoLink = link
    ? [
        `Cardapio: ${link}`,
        "Se nao abrir ao tocar, copie e cole o link no navegador.",
      ]
    : [];

  return [
    "No momento estamos fechados.",
    `Funcionamento: ${diasTxt}.`,
    `Horario: ${horarioTxt}.`,
    abre ? `Abrimos a partir de ${abre}.` : "",
    ...blocoLink,
  ]
    .filter(Boolean)
    .join("\n");
}

function construirMensagemCardapio(baseUrl) {
  const link = String(baseUrl || "").trim() || getPublicUrl();
  const abre = formatarHorarioHumano(getConfigValue("funcionamento_abre", "18:30"));
  const fecha = formatarHorarioHumano(getConfigValue("funcionamento_fecha", "23:30"));
  const horarioAtendimento =
    abre && fecha ? `${abre} as ${fecha}` : "18h30 as 23h30";
  const taxaEntrega = Number(toNumber(getConfigValue("taxa_entrega", "9"), 9)).toFixed(2);
  const msgPix = getConfigValue("msg_pix", "Envie o comprovante do Pix no WhatsApp.");
  const blocoLink = link
    ? [
        "Para pedir AGORA, clique no link do cardapio:",
        link,
        "Se nao abrir ao tocar, copie e cole o link no navegador.",
      ]
    : ["Cardapio indisponivel no momento. Chame o atendimento para receber o link."];

  return [
    "Mega Lanches",
    "",
    ...blocoLink,
    "",
    "Passo rapido:",
    "1) Adicione os itens",
    "2) Abra o CARRINHO",
    "3) Clique em Finalizar",
    "4) Coloque seus dados para entrega ou retirada",
    "",
    `Pix: ${msgPix}`,
    `Horario: ${horarioAtendimento}`,
    `Taxa de entrega: R$ ${taxaEntrega}`,
  ].join("\n");
}

function categoriaEhBebida(categoria) {
  const texto = String(categoria || "").toLowerCase();
  return texto.includes("refriger") || texto.includes("bebida");
}

function deveIncluirPureBatata(nome) {
  const texto = String(nome || "").toLowerCase();
  return texto.includes("salada") || texto.includes("x tudo") || texto.includes("x-tudo") || texto.includes("especial");
}

function garantirPureBatataCardapio() {
  const rows = db.prepare("SELECT id, nome, ingredientes FROM cardapio").all();
  const update = db.prepare("UPDATE cardapio SET ingredientes = ? WHERE id = ?");
  rows.forEach((row) => {
    if (!deveIncluirPureBatata(row.nome)) return;
    const ingredientes = parseMaybeJson(row.ingredientes);
    const lista = Array.isArray(ingredientes)
      ? ingredientes.map((i) => String(i || "").trim()).filter(Boolean)
      : [];
    const jaTem = lista.some((i) => i.toLowerCase() === "pure de batata");
    if (jaTem) return;
    lista.push("Pure de batata");
    update.run(normalizarIngredientes(lista), row.id);
  });
}

function baixarEstoqueBebidas(carrinho, pedidoId) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) return;

  const estoqueAuto = db.prepare("SELECT id, nome FROM estoque_itens WHERE auto_baixa = 1").all();
  if (!estoqueAuto.length) return;

  const estoqueMap = new Map(
    estoqueAuto.map((item) => [String(item.nome || "").trim().toLowerCase(), item.id])
  );

  const cardapioRows = db
    .prepare("SELECT LOWER(nome) as nome, categoria FROM cardapio")
    .all();
  const cardapioMap = new Map(cardapioRows.map((row) => [row.nome, row.categoria]));

  const baixas = new Map();

  carrinho.forEach((item) => {
    const nome = String(item?.nome || "").trim().toLowerCase();
    if (!nome) return;

    const categoria = item?.categoria || cardapioMap.get(nome) || "";
    if (!categoriaEhBebida(categoria)) return;

    const estoqueId = estoqueMap.get(nome);
    if (!estoqueId) return;

    const qtd = Math.max(parseInt(item?.qtd, 10) || 0, 0);
    if (!qtd) return;

    baixas.set(estoqueId, (baixas.get(estoqueId) || 0) + qtd);
  });

  if (!baixas.size) return;

  const selectQtd = db.prepare("SELECT quantidade FROM estoque_itens WHERE id = ?");
  const updateQtd = db.prepare("UPDATE estoque_itens SET quantidade = ?, updated_at = ? WHERE id = ?");
  const insertMov = db.prepare(`
    INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, referencia, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    baixas.forEach((qtd, estoqueId) => {
      const atual = selectQtd.get(estoqueId);
      if (!atual) return;
      const atualQtd = toNumber(atual.quantidade, 0);
      const efetivo = Math.min(atualQtd, qtd);
      if (efetivo <= 0) return;
      const novaQtd = Math.max(atualQtd - efetivo, 0);
      updateQtd.run(novaQtd, now, estoqueId);
      insertMov.run(
        estoqueId,
        "venda",
        efetivo,
        `Venda pedido #${pedidoId}`,
        String(pedidoId || ""),
        now
      );
    });
  });

  tx();
}

function estornarEstoqueBebidas(carrinho, pedidoId) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) return;

  const estoqueAuto = db.prepare("SELECT id, nome FROM estoque_itens WHERE auto_baixa = 1").all();
  if (!estoqueAuto.length) return;

  const estoqueMap = new Map(
    estoqueAuto.map((item) => [String(item.nome || "").trim().toLowerCase(), item.id])
  );

  const cardapioRows = db
    .prepare("SELECT LOWER(nome) as nome, categoria FROM cardapio")
    .all();
  const cardapioMap = new Map(cardapioRows.map((row) => [row.nome, row.categoria]));

  const entradas = new Map();

  carrinho.forEach((item) => {
    const nome = String(item?.nome || "").trim().toLowerCase();
    if (!nome) return;

    const categoria = item?.categoria || cardapioMap.get(nome) || "";
    if (!categoriaEhBebida(categoria)) return;

    const estoqueId = estoqueMap.get(nome);
    if (!estoqueId) return;

    const qtd = Math.max(parseInt(item?.qtd, 10) || 0, 0);
    if (!qtd) return;

    entradas.set(estoqueId, (entradas.get(estoqueId) || 0) + qtd);
  });

  if (!entradas.size) return;

  const selectQtd = db.prepare("SELECT quantidade FROM estoque_itens WHERE id = ?");
  const updateQtd = db.prepare("UPDATE estoque_itens SET quantidade = ?, updated_at = ? WHERE id = ?");
  const insertMov = db.prepare(`
    INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, referencia, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    entradas.forEach((qtd, estoqueId) => {
      const atual = selectQtd.get(estoqueId);
      if (!atual) return;
      const atualQtd = toNumber(atual.quantidade, 0);
      const novaQtd = atualQtd + qtd;
      updateQtd.run(novaQtd, now, estoqueId);
      insertMov.run(
        estoqueId,
        "estorno",
        qtd,
        `Cancelamento pedido #${pedidoId}`,
        String(pedidoId || ""),
        now
      );
    });
  });

  tx();
}

function syncBebidasFromCardapio() {
  const bebidas = db
    .prepare("SELECT nome, categoria FROM cardapio ORDER BY nome ASC")
    .all()
    .filter((row) => categoriaEhBebida(row.categoria));

  if (!bebidas.length) return { created: 0, updated: 0 };

  const selectItem = db.prepare("SELECT id, categoria, auto_baixa FROM estoque_itens WHERE lower(nome) = lower(?)");
  const insertItem = db.prepare(`
    INSERT INTO estoque_itens (nome, categoria, unidade, quantidade, minimo, auto_baixa, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateItem = db.prepare(`
    UPDATE estoque_itens
    SET categoria = ?, auto_baixa = ?, updated_at = ?
    WHERE id = ?
  `);

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  const tx = db.transaction(() => {
    bebidas.forEach((bebida) => {
      const nome = String(bebida.nome || "").trim();
      if (!nome) return;
      const existente = selectItem.get(nome);
      if (!existente) {
        insertItem.run(nome, "bebida", "un", 0, 0, 1, now, now);
        created += 1;
        return;
      }
      if (existente.categoria !== "bebida" || existente.auto_baixa !== 1) {
        updateItem.run("bebida", 1, now, existente.id);
        updated += 1;
      }
    });
  });

  tx();
  return { created, updated };
}

function normalizarAutoBaixa() {
  db.prepare("UPDATE estoque_itens SET auto_baixa = 0 WHERE categoria != 'bebida' AND auto_baixa != 0").run();
}

function aplicarMovimentoEstoque({ itemId, delta, tipo, quantidade, motivo, referencia }) {
  const selectQtd = db.prepare("SELECT quantidade FROM estoque_itens WHERE id = ?");
  const updateQtd = db.prepare("UPDATE estoque_itens SET quantidade = ?, updated_at = ? WHERE id = ?");
  const insertMov = db.prepare(`
    INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, referencia, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const atual = selectQtd.get(itemId);
  if (!atual) return { ok: false, error: "not_found" };

  const atualQtd = toNumber(atual.quantidade, 0);
  const novaQtd = atualQtd + delta;
  if (novaQtd < 0) return { ok: false, error: "insuficiente", atual: atualQtd };

  const now = new Date().toISOString();
  updateQtd.run(novaQtd, now, itemId);
  insertMov.run(
    itemId,
    tipo,
    quantidade,
    motivo || "",
    referencia || "",
    now
  );
  return { ok: true, nova: novaQtd };
}

function migrateFromJson() {
  const countCardapio = db.prepare("SELECT COUNT(*) as total FROM cardapio").get().total;
  const countAdicionais = db.prepare("SELECT COUNT(*) as total FROM adicionais").get().total;
  const countEntregadores = db.prepare("SELECT COUNT(*) as total FROM entregadores").get().total;
  const countPedidos = db.prepare("SELECT COUNT(*) as total FROM pedidos").get().total;

  const agora = new Date().toISOString();

  if (countCardapio === 0) {
    const cardapio = lerArquivo(cardapioFile);
    const insert = db.prepare(`
      INSERT INTO cardapio (nome, preco, categoria, ingredientes, img, disponivel, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction((items) => {
      items.forEach((item, index) => {
        insert.run(
          item.nome || "",
          Number(item.preco) || 0,
          item.categoria || "",
          normalizarIngredientes(item.ingredientes),
          item.img || "",
          item.disponivel === false ? 0 : 1,
          index,
          agora
        );
      });
    });
    tx(cardapio);
  }

  if (countAdicionais === 0) {
    const adicionais = lerArquivo(adicionaisFile);
    const insert = db.prepare(`
      INSERT INTO adicionais (nome, preco, order_index, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const tx = db.transaction((items) => {
      items.forEach((item, index) => {
        insert.run(item.nome || "", Number(item.preco) || 0, index, agora);
      });
    });
    tx(adicionais);
  }

  if (countEntregadores === 0) {
    const entregadores = lerArquivo(entregadoresFile);
    const insert = db.prepare(`
      INSERT INTO entregadores (id, nome, ativo, created_at)
      VALUES (?, ?, ?, ?)
    `);
    const tx = db.transaction((items) => {
      items.forEach((item) => {
        insert.run(
          item.id || Date.now(),
          item.nome || "",
          item.ativo === false ? 0 : 1,
          agora
        );
      });
    });
    tx(entregadores);
  }

  if (countPedidos === 0 && IMPORTAR_PEDIDOS_JSON) {
    const pedidos = lerArquivo(pedidosFile);
    const entregues = lerArquivo(pedidosEntreguesFile);
    const insert = db.prepare(`
      INSERT INTO pedidos (
        id, cliente, telefone, endereco, tipoEntrega, pagamento, troco, chavePix,
        carrinho, obsGeral, status, entregador, entregueEm, saiuParaEntrega, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction((lista) => {
      lista.forEach((pedido) => {
        insert.run(
          pedido.id || Date.now(),
          pedido.cliente || "",
          pedido.telefone || "",
          pedido.endereco || "",
          pedido.tipoEntrega || "",
          pedido.pagamento || "",
          pedido.troco || "",
          pedido.chavePix || "",
          normalizarCarrinho(pedido.carrinho),
          pedido.obsGeral || "",
          pedido.status || "recebido",
          pedido.entregador || "",
          pedido.entregueEm || null,
          pedido.saiuParaEntrega || null,
          agora
        );
      });
    });
    tx(pedidos);
    tx(entregues.map((p) => ({ ...p, status: "entregue" })));
  } else if (countPedidos === 0 && !IMPORTAR_PEDIDOS_JSON) {
    console.warn("[MIGRACAO] Importacao de pedidos JSON desativada (IMPORTAR_PEDIDOS_JSON=0).");
  }
}

function backupDb() {
  const backupDir = path.join(__dirname, "backups");
  fse.ensureDirSync(backupDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(backupDir, `mega-lanches-${stamp}.db`);
  fse.copySync(dbPath, dest);
  console.log(`Backup criado: ${dest}`);
}

function rotateBackups(keep = 30) {
  const backupDir = path.join(__dirname, "backups");
  if (!fs.existsSync(backupDir)) return;
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  files.slice(keep).forEach((f) => {
    fs.unlinkSync(path.join(backupDir, f.name));
  });
}

initSchema();
try { db.prepare("ALTER TABLE combos ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0").run(); } catch {}
// Remove somente o cache legado do provedor externo. A memoria da IA local usa outras tabelas.
db.exec("DROP TABLE IF EXISTS cliente_ai_insights");
try { db.prepare("ALTER TABLE atendente_parser_aliases ADD COLUMN usos INTEGER NOT NULL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE atendente_parser_aliases ADD COLUMN acertos INTEGER NOT NULL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE atendente_parser_aliases ADD COLUMN erros INTEGER NOT NULL DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE atendente_parser_aliases ADD COLUMN last_used_at TEXT").run(); } catch {}
const adminSessionsHadLastSeen = db.prepare("PRAGMA table_info(admin_sessions)").all()
  .some((column) => column.name === "last_seen_at");
if (!adminSessionsHadLastSeen) {
  db.prepare("ALTER TABLE admin_sessions ADD COLUMN last_seen_at TEXT").run();
  db.prepare("UPDATE admin_sessions SET revoked_at = ? WHERE revoked_at IS NULL")
    .run(new Date().toISOString());
}
db.prepare("UPDATE admin_sessions SET last_seen_at = COALESCE(last_seen_at, created_at)").run();
ensureAdminLoginIds();
limparTokensRecuperacaoSenha();
db.prepare(`
  UPDATE whatsapp_outbox
  SET status = 'pendente', next_attempt_at = ?, updated_at = ?
  WHERE status = 'processando'
`).run(new Date().toISOString(), new Date().toISOString());
ensureEstoqueSchema();
ensureConfigDefaults();
ensureBotMensagensPadrao();
ensureCategorias();
ensureCategoriaBebidasNome();
ensureCategoriaPromocao();
if (!TEST_MODE) migrateFromJson();
syncBebidasFromCardapio();
normalizarAutoBaixa();
garantirPureBatataCardapio();
if (!TEST_MODE) {
  backupDb();
  rotateBackups(30);
  gerarCombosSugestao();
  agendarCombosDiarios();
  setInterval(backupDb, 6 * 60 * 60 * 1000);
  setInterval(() => rotateBackups(30), 6 * 60 * 60 * 1000);
  setInterval(limparTokensRecuperacaoSenha, 6 * 60 * 60 * 1000);
  setTimeout(() => {
    monitorarSessaoWpp().catch((err) => console.warn("[WPP-MONITOR] erro inicial:", err?.message || err));
  }, 7000);
  setInterval(() => {
    monitorarSessaoWpp().catch((err) => console.warn("[WPP-MONITOR] erro:", err?.message || err));
  }, 30 * 1000);
  setTimeout(() => {
    processarWhatsappOutbox().catch((err) =>
      console.warn("[WHATSAPP-OUTBOX] erro inicial:", err?.message || err)
    );
  }, 10 * 1000);
  setInterval(() => {
    processarWhatsappOutbox().catch((err) =>
      console.warn("[WHATSAPP-OUTBOX] erro:", err?.message || err)
    );
  }, WHATSAPP_OUTBOX_INTERVAL_MS);
  setTimeout(() => processarIaLocalBatch(), 12 * 1000);
  setInterval(() => processarIaLocalBatch(), 20 * 1000);
}

// ===================== AUTH ROTAS =====================
app.get("/adminn/auth/setup-status", (req, res) => {
  const possuiUsuarios = totalUsuariosAdmin() > 0;
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    setupRequired: !possuiUsuarios,
    emailRequired: possuiUsuarios,
    passwordMinLength: ADMIN_PASSWORD_MIN_LENGTH,
    passwordResetEnabled: smtpConfigurado(),
  });
});

app.get("/adminn/auth/accounts", (req, res) => {
  const items = db.prepare(`
    SELECT login_id AS id, nome
    FROM admin_users
    WHERE ativo = 1 AND login_id IS NOT NULL AND trim(login_id) <> ''
    ORDER BY nome COLLATE NOCASE, id
    LIMIT 30
  `).all().map((item) => ({
    id: item.id,
    name: String(item.nome || "Administrador").trim().slice(0, 100) || "Administrador",
  }));
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, items });
});

app.post("/adminn/password/forgot", (req, res) => {
  const email = normalizarEmailAdmin(req.body?.email);
  const ip = getClientIp(req);
  const ipBloqueado = loginRateLimitBloqueado(
    "password_forgot_ip",
    ip,
    ADMIN_LOGIN_WINDOW_MS,
    ADMIN_PASSWORD_RESET_MAX_REQUESTS
  );
  const emailKey = email || "invalid";
  const emailBloqueado = loginRateLimitBloqueado(
    "password_forgot_email",
    emailKey,
    ADMIN_LOGIN_WINDOW_MS,
    ADMIN_PASSWORD_RESET_MAX_REQUESTS
  );
  const resposta = {
    success: true,
    message: "Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao.",
  };
  if (ipBloqueado || emailBloqueado || !email || !smtpConfigurado()) {
    return res.status(202).json(resposta);
  }

  registrarFalhaRateLimit("password_forgot_ip", ip, ADMIN_LOGIN_WINDOW_MS);
  registrarFalhaRateLimit("password_forgot_email", emailKey, ADMIN_LOGIN_WINDOW_MS);
  const usuario = buscarUsuarioAdminPorEmail(email);
  res.status(202).json(resposta);
  if (!usuario?.id || usuario.ativo !== 1) return;

  setImmediate(async () => {
    const reset = criarTokenRecuperacaoSenha(usuario, ip);
    const envio = await enviarEmailRecuperacaoSenha(usuario, reset.token);
    if (!envio.ok) {
      db.prepare(`
        UPDATE admin_password_reset_tokens SET used_at = ? WHERE token_hash = ?
      `).run(new Date().toISOString(), reset.tokenHash);
      console.warn("[AUTH] Falha ao enviar recuperacao de senha:", {
        userId: usuario.id,
        error: envio.error,
      });
      return;
    }
    registrarAuditoriaAdmin(req, {
      acao: "recuperacao_senha_enviada",
      entidade: "admin_users",
      entidadeId: usuario.id,
      ator: usuario.email,
    });
  });
});

app.post("/adminn/password/reset", (req, res) => {
  const ip = getClientIp(req);
  if (loginRateLimitBloqueado("password_reset", ip, ADMIN_LOGIN_WINDOW_MS, ADMIN_LOGIN_MAX_ATTEMPTS)) {
    return res.status(429).json({ success: false, error: "too_many_attempts" });
  }
  const email = normalizarEmailAdmin(req.body?.email);
  const token = String(req.body?.token || "").trim();
  const novaSenha = String(req.body?.novaSenha || "");
  const confirmarSenha = String(req.body?.confirmarSenha || "");
  if (!email || token.length < 32 || token.length > 160) {
    registrarFalhaRateLimit("password_reset", ip, ADMIN_LOGIN_WINDOW_MS);
    return res.status(400).json({ success: false, error: "invalid_or_expired_token" });
  }
  if (novaSenha !== confirmarSenha) {
    return res.status(400).json({ success: false, error: "password_mismatch" });
  }
  const erroSenha = validarNovaSenhaAdmin(novaSenha);
  if (erroSenha) {
    return res.status(400).json({ success: false, error: "weak_password", message: erroSenha });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const reset = db.prepare(`
    SELECT t.id, t.user_id, t.expires_at, u.email, u.password_hash, u.password_salt
    FROM admin_password_reset_tokens t
    JOIN admin_users u ON u.id = t.user_id
    WHERE t.token_hash = ? AND u.email = ? AND u.ativo = 1 AND t.used_at IS NULL
  `).get(tokenHash, email);
  if (!reset || Date.parse(reset.expires_at) <= Date.now()) {
    registrarFalhaRateLimit("password_reset", ip, ADMIN_LOGIN_WINDOW_MS);
    return res.status(400).json({ success: false, error: "invalid_or_expired_token" });
  }
  if (verificarHashSenhaAdmin(novaSenha, reset)) {
    return res.status(400).json({ success: false, error: "password_reused" });
  }

  const credencial = criarHashSenhaAdmin(novaSenha);
  const now = new Date().toISOString();
  const concluirReset = db.transaction(() => {
    const consumido = db.prepare(`
      UPDATE admin_password_reset_tokens SET used_at = ?
      WHERE id = ? AND used_at IS NULL AND expires_at > ?
    `).run(now, reset.id, now);
    if (!consumido.changes) return false;
    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, password_salt = ?, password_algo = ?,
          failed_attempts = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?
    `).run(credencial.hash, credencial.salt, credencial.algoritmo, now, reset.user_id);
    db.prepare(`
      UPDATE admin_password_reset_tokens SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL
    `).run(now, reset.user_id);
    return true;
  });
  if (!concluirReset()) {
    return res.status(400).json({ success: false, error: "invalid_or_expired_token" });
  }
  limparRateLimit("password_reset", ip);
  revogarSessoesUsuario(reset.user_id);
  registrarAuditoriaAdmin(req, {
    acao: "senha_redefinida",
    entidade: "admin_users",
    entidadeId: reset.user_id,
    ator: reset.email,
  });
  res.json({ success: true });
});

app.post("/adminn/register", (req, res) => {
  const ip = getClientIp(req);
  if (loginRateLimitBloqueado("admin_setup", ip, ADMIN_LOGIN_WINDOW_MS, ADMIN_LOGIN_MAX_ATTEMPTS)) {
    return res.status(429).json({ success: false, error: "too_many_attempts" });
  }
  if (totalUsuariosAdmin() > 0) {
    return res.status(409).json({ success: false, error: "setup_completed" });
  }

  const { nome, email, senha, confirmarSenha, senhaAtual } = req.body || {};
  if (!verificarSenha(String(senhaAtual || ""))) {
    registrarFalhaRateLimit("admin_setup", ip, ADMIN_LOGIN_WINDOW_MS);
    registrarAuditoriaAdmin(req, {
      acao: "primeiro_usuario_falhou",
      entidade: "admin_users",
      detalhe: { motivo: "invalid_current_password" },
      ator: normalizarEmailAdmin(email) || "setup",
    });
    return res.status(401).json({ success: false, error: "invalid_current_password" });
  }
  if (String(senha || "") !== String(confirmarSenha || "")) {
    return res.status(400).json({ success: false, error: "password_mismatch" });
  }

  const criarPrimeiro = db.transaction(() => {
    if (totalUsuariosAdmin() > 0) return { ok: false, error: "setup_completed" };
    return criarUsuarioAdmin({ nome, email, senha, role: "admin" });
  });
  const resultado = criarPrimeiro();
  if (!resultado.ok) {
    const status = resultado.error === "setup_completed" || resultado.error === "email_exists" ? 409 : 400;
    return res.status(status).json({
      success: false,
      error: resultado.error,
      message: resultado.message || "Nao foi possivel criar a conta.",
    });
  }

  limparRateLimit("admin_setup", ip);
  const token = criarSessao(resultado.user);
  setAuthCookie(res, token);
  req.authUser = getSessao(token);
  registrarAuditoriaAdmin(req, {
    acao: "primeiro_usuario_criado",
    entidade: "admin_users",
    entidadeId: resultado.id,
    ator: resultado.user.email,
  });
  return res.status(201).json({ success: true });
});

app.post("/adminn/login", (req, res) => {
  const { email, loginId, senha } = req.body || {};
  const emailNorm = normalizarEmailAdmin(email);
  const loginIdNorm = String(loginId || "").trim();
  const possuiUsuarios = totalUsuariosAdmin() > 0;
  const chave = `${getClientIp(req)}:${loginIdNorm || emailNorm || "legacy"}`;
  if (loginRateLimitBloqueado("admin", chave, ADMIN_LOGIN_WINDOW_MS, ADMIN_LOGIN_MAX_ATTEMPTS)) {
    registrarAuditoriaAdmin(req, {
      acao: "login_bloqueado",
      entidade: "admin",
      detalhe: { motivo: "too_many_attempts" },
    });
    return res.status(429).json({
      success: false,
      error: "too_many_attempts",
      message: "Muitas tentativas. Aguarde alguns minutos.",
    });
  }

  const usuario = possuiUsuarios
    ? (loginIdNorm ? buscarUsuarioAdminPorLoginId(loginIdNorm) : buscarUsuarioAdminPorEmail(emailNorm))
    : null;
  const bloqueadoAte = Date.parse(String(usuario?.locked_until || ""));
  const credencialValida = possuiUsuarios
    ? Boolean(usuario?.ativo === 1 && (!bloqueadoAte || bloqueadoAte <= Date.now()) && verificarHashSenhaAdmin(senha, usuario))
    : verificarSenha(senha);
  if (!credencialValida) {
    registrarFalhaRateLimit("admin", chave, ADMIN_LOGIN_WINDOW_MS);
    registrarFalhaUsuarioAdmin(usuario);
    registrarAuditoriaAdmin(req, {
      acao: "login_falhou",
      entidade: "admin",
      detalhe: { motivo: "invalid_credentials", email: emailNorm || undefined },
      ator: emailNorm || "admin",
    });
    return res.status(401).json({ success: false, error: "invalid_credentials" });
  }

  limparRateLimit("admin", chave);
  if (usuario?.id) {
    db.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), usuario.id);
  }
  const token = criarSessao(usuario);
  setAuthCookie(res, token);
  req.authUser = getSessao(token);
  registrarAuditoriaAdmin(req, {
    acao: "login_ok",
    entidade: "admin",
    entidadeId: usuario?.id || "legacy",
    ator: usuario?.email || "admin",
  });
  res.json({ success: true });
});

app.post("/adminn/logout", (req, res) => {
  const token = getAdminToken(req);
  if (token) revogarSessao(token);
  clearAuthCookie(res);
  registrarAuditoriaAdmin(req, { acao: "logout", entidade: "admin" });
  res.json({ success: true });
});

app.get("/adminn/usuarios", (req, res) => {
  const items = db.prepare(`
    SELECT id, nome, email, role, ativo, last_login_at, created_at, updated_at
    FROM admin_users
    ORDER BY nome COLLATE NOCASE, email COLLATE NOCASE
  `).all().map((item) => ({ ...item, ativo: item.ativo === 1 }));
  res.json({ success: true, items });
});

app.get("/adminn/email/status", (req, res) => {
  res.json({
    success: true,
    configured: smtpConfigurado(),
    from: SMTP_FROM || "",
    publicUrlConfigured: Boolean(getPublicUrl()),
  });
});

app.get("/adminn/ia-clientes/status", (req, res) => {
  const local = db.prepare("SELECT COUNT(*) AS total, MAX(updated_at) AS ultimaAnalise FROM local_ai_customer_profiles").get() || {};
  res.json({
    success: true,
    enabled: localAiEnabled(),
    configured: true,
    provider: "local",
    model: "mega-local-v1",
    cacheItems: Number(local.total || 0),
    ultimaAnalise: local.ultimaAnalise || "",
    personalDataEnabled: true,
    privacy: "Pedidos e conversas sao processados somente no banco local; nenhuma API externa e chamada.",
  });
});

app.post("/adminn/email/test", async (req, res) => {
  const userId = Number(req.authUser?.userId || 0);
  const usuario = userId
    ? db.prepare("SELECT id, nome, email FROM admin_users WHERE id = ? AND ativo = 1").get(userId)
    : null;
  if (!usuario) return res.status(409).json({ success: false, error: "personal_account_required" });
  const transporter = getSmtpTransporter();
  if (!transporter) return res.status(409).json({ success: false, error: "smtp_not_configured" });
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: usuario.email,
      subject: "Teste de e-mail - Mega Lanches",
      text: "O envio de e-mail do Mega Lanches esta configurado corretamente.",
      html: "<p>O envio de e-mail do <strong>Mega Lanches</strong> esta configurado corretamente.</p>",
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    registrarAuditoriaAdmin(req, {
      acao: "email_teste_enviado",
      entidade: "admin_users",
      entidadeId: usuario.id,
      ator: usuario.email,
    });
    return res.json({ success: true });
  } catch (err) {
    console.warn("[EMAIL] Falha no teste SMTP:", String(err?.code || err?.message || "smtp_error"));
    return res.status(502).json({ success: false, error: "smtp_send_failed" });
  }
});

app.post("/adminn/usuarios", (req, res) => {
  const { nome, email, senha, confirmarSenha } = req.body || {};
  if (String(senha || "") !== String(confirmarSenha || "")) {
    return res.status(400).json({ success: false, error: "password_mismatch" });
  }
  const resultado = criarUsuarioAdmin({ nome, email, senha, role: "admin" });
  if (!resultado.ok) {
    return res.status(resultado.error === "email_exists" ? 409 : 400).json({
      success: false,
      error: resultado.error,
      message: resultado.message,
    });
  }
  registrarAuditoriaAdmin(req, {
    acao: "usuario_criado",
    entidade: "admin_users",
    entidadeId: resultado.id,
    detalhe: { email: resultado.user.email },
  });
  res.status(201).json({
    success: true,
    user: {
      id: resultado.user.id,
      nome: resultado.user.nome,
      email: resultado.user.email,
      role: resultado.user.role,
      ativo: true,
    },
  });
});

app.post("/adminn/conta/senha", (req, res) => {
  const userId = Number(req.authUser?.userId || 0);
  if (!userId) {
    return res.status(409).json({ success: false, error: "personal_account_required" });
  }
  const usuario = db.prepare(`
    SELECT id, email, password_hash, password_salt
    FROM admin_users
    WHERE id = ? AND ativo = 1
  `).get(userId);
  if (!usuario) return res.status(404).json({ success: false, error: "user_not_found" });

  const { senhaAtual, novaSenha, confirmarSenha } = req.body || {};
  if (!verificarHashSenhaAdmin(senhaAtual, usuario)) {
    return res.status(401).json({ success: false, error: "invalid_current_password" });
  }
  if (String(novaSenha || "") !== String(confirmarSenha || "")) {
    return res.status(400).json({ success: false, error: "password_mismatch" });
  }
  const erroSenha = validarNovaSenhaAdmin(novaSenha);
  if (erroSenha) {
    return res.status(400).json({ success: false, error: "weak_password", message: erroSenha });
  }
  if (verificarHashSenhaAdmin(novaSenha, usuario)) {
    return res.status(400).json({ success: false, error: "password_reused" });
  }

  const credencial = criarHashSenhaAdmin(novaSenha);
  db.prepare(`
    UPDATE admin_users
    SET password_hash = ?, password_salt = ?, password_algo = ?,
        failed_attempts = 0, locked_until = NULL, updated_at = ?
    WHERE id = ?
  `).run(credencial.hash, credencial.salt, credencial.algoritmo, new Date().toISOString(), userId);
  registrarAuditoriaAdmin(req, {
    acao: "senha_alterada",
    entidade: "admin_users",
    entidadeId: userId,
    ator: usuario.email,
  });
  revogarSessoesUsuario(userId);
  clearAuthCookie(res);
  res.json({ success: true, reauthRequired: true });
});

app.get("/api/atendente/accounts", (req, res) => {
  const items = db.prepare(`
    SELECT login_id AS id, nome
    FROM admin_users
    WHERE ativo = 1 AND login_id IS NOT NULL AND trim(login_id) <> ''
    ORDER BY nome COLLATE NOCASE, id
    LIMIT 30
  `).all().map((item) => ({
    id: item.id,
    name: String(item.nome || "Administrador").trim().slice(0, 100) || "Administrador",
  }));
  res.setHeader("Cache-Control", "no-store");
  return res.json({ success: true, setupRequired: totalUsuariosAdmin() === 0, items });
});

app.post("/api/atendente/public-login", (req, res) => {
  const token = criarSessao();
  return res.json({
    success: true,
    token,
    expiresIn: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    user: {
      role: "admin",
      email: "",
      name: "Atendimento",
      permissions: { orders: true, menu: true },
    },
  });
});

app.post("/api/atendente/login", (req, res) => {
  const { email, loginId, senha } = req.body || {};
  const emailNorm = normalizarEmailAdmin(email);
  const loginIdNorm = String(loginId || "").trim();
  const possuiUsuarios = totalUsuariosAdmin() > 0;
  const chave = `${getClientIp(req)}:${loginIdNorm || emailNorm || "legacy"}`;
  if (atendenteLoginBloqueado(chave)) {
    return res.status(429).json({
      success: false,
      error: "too_many_attempts",
      message: "Muitas tentativas. Aguarde alguns minutos.",
    });
  }

  const usuario = possuiUsuarios
    ? (loginIdNorm ? buscarUsuarioAdminPorLoginId(loginIdNorm) : buscarUsuarioAdminPorEmail(emailNorm))
    : null;
  const bloqueadoAte = Date.parse(String(usuario?.locked_until || ""));
  const credencialValida = possuiUsuarios
    ? Boolean(usuario?.ativo === 1 && (!bloqueadoAte || bloqueadoAte <= Date.now()) && verificarHashSenhaAdmin(senha, usuario))
    : verificarSenha(senha);
  if (!credencialValida) {
    registrarFalhaLoginAtendente(chave);
    registrarFalhaUsuarioAdmin(usuario);
    registrarAuditoriaAdmin(req, {
      acao: "login_app_falhou",
      entidade: "admin",
      ator: usuario?.email || emailNorm || loginIdNorm || "atendente",
      detalhe: { motivo: "invalid_credentials" },
    });
    return res.status(401).json({ success: false, error: "invalid_credentials" });
  }

  atendenteLoginAttempts.delete(chave);
  if (usuario?.id) {
    db.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), new Date().toISOString(), usuario.id);
  }
  const token = criarSessao(usuario);
  registrarAuditoriaAdmin(req, {
    acao: "login_app_ok",
    entidade: "admin",
    entidadeId: usuario?.id || "legacy",
    ator: usuario?.email || "atendente",
  });
  return res.json({
    success: true,
    token,
    expiresIn: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
    user: {
      role: usuario?.role || "admin",
      email: usuario?.email || "",
      name: usuario?.nome || "Administrador",
      permissions: { orders: true, menu: true },
    },
  });
});

app.post("/api/atendente/logout", requireAtendente, (req, res) => {
  const token = getBearerToken(req);
  if (token) revogarSessao(token);
  return res.json({ success: true });
});

app.get("/adminn/auditoria", requireAdmin, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const rows = db
    .prepare(`
      SELECT id, ator, acao, entidade, entidade_id, ip, user_agent, detalhe, created_at
      FROM admin_audit_log
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      ...row,
      detalhe: parseMaybeJson(row.detalhe),
    }));
  res.json({ success: true, items: rows });
});

app.get("/adminn/parser-aliases", requireAdmin, (req, res) => {
  const rawItems = db.prepare(`
    SELECT id, termo_exibicao AS termo, produto_id AS produtoId, produto_nome AS produtoNome,
           termo_normalizado AS termoNormalizado, confirmacoes, usos, acertos, erros, last_used_at AS ultimoUso,
           ativo, created_at AS criadoEm, updated_at AS atualizadoEm
    FROM atendente_parser_aliases
    ORDER BY ativo DESC, confirmacoes DESC, updated_at DESC
    LIMIT 300
  `).all();
  const decisions = new Map();
  rawItems.forEach((item) => {
    if (decisions.has(item.termoNormalizado)) return;
    const candidates = rawItems
      .filter((candidate) => candidate.termoNormalizado === item.termoNormalizado)
      .map((candidate) => ({
        produto_id: candidate.produtoId,
        confirmacoes: candidate.confirmacoes,
        usos: candidate.usos,
        acertos: candidate.acertos,
        erros: candidate.erros,
      }));
    decisions.set(item.termoNormalizado, chooseActiveAliasCandidate(candidates));
  });
  const items = rawItems.map((item) => ({
    ...item,
    ativo: item.ativo === 1,
    precisao: item.usos > 0 ? Number(((item.acertos / item.usos) * 100).toFixed(1)) : null,
    decisao: decisions.get(item.termoNormalizado)?.reason || "insufficient_confirmations",
  }));
  const observationStats = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(corrigido) AS corrigidas,
           SUM(ambiguidades) AS ambiguidades,
           SUM(nao_identificados) AS naoIdentificados,
           AVG(ABS(unidades_finais - unidades_iniciais)) AS mediaAjusteUnidades,
           MAX(created_at) AS ultimaObservacao
    FROM atendente_parser_observacoes
  `).get();
  res.json({
    success: true,
    items,
    learning: {
      observations: Number(observationStats?.total || 0),
      corrected: Number(observationStats?.corrigidas || 0),
      ambiguities: Number(observationStats?.ambiguidades || 0),
      unknown: Number(observationStats?.naoIdentificados || 0),
      averageUnitAdjustment: Number(Number(observationStats?.mediaAjusteUnidades || 0).toFixed(2)),
      lastObservation: observationStats?.ultimaObservacao || null,
      policy: PARSER_LEARNING_POLICY,
    },
  });
});

app.post("/adminn/parser-aliases/:id/ativar", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || typeof req.body?.ativo !== "boolean") {
    return res.status(400).json({ success: false, error: "invalid_alias_state" });
  }
  const alias = db.prepare("SELECT termo_normalizado FROM atendente_parser_aliases WHERE id = ?").get(id);
  if (!alias) return res.status(404).json({ success: false, error: "alias_not_found" });
  const now = new Date().toISOString();
  let info;
  const update = db.transaction(() => {
    if (req.body.ativo) {
      db.prepare("UPDATE atendente_parser_aliases SET ativo = 0, updated_at = ? WHERE termo_normalizado = ?")
        .run(now, alias.termo_normalizado);
    }
    info = db.prepare(`
      UPDATE atendente_parser_aliases SET ativo = ?, updated_at = ? WHERE id = ?
    `).run(req.body.ativo ? 1 : 0, now, id);
  });
  update();
  if (!info.changes) return res.status(404).json({ success: false, error: "alias_not_found" });
  registrarAuditoriaAdmin(req, {
    acao: req.body.ativo ? "interpretador_apelido_ativado" : "interpretador_apelido_desativado",
    entidade: "atendente_parser",
    entidadeId: id,
  });
  res.json({ success: true, ativo: req.body.ativo });
});

app.delete("/adminn/parser-aliases/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "invalid_alias_id" });
  const info = db.prepare("DELETE FROM atendente_parser_aliases WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ success: false, error: "alias_not_found" });
  registrarAuditoriaAdmin(req, {
    acao: "interpretador_apelido_excluido",
    entidade: "atendente_parser",
    entidadeId: id,
  });
  res.json({ success: true });
});

app.get("/adminn/integracoes/syntax/status", requireAdmin, (req, res) => {
  const credenciaisConfiguradas = Boolean(SYNTAX_API_URL && SYNTAX_API_TOKEN);
  const solicitadoAtivo = getConfigBoolean("syntax_integracao_ativo", false);
  const counts = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
      SUM(CASE WHEN status = 'erro' THEN 1 ELSE 0 END) AS erros,
      SUM(CASE WHEN status = 'sincronizado' THEN 1 ELSE 0 END) AS sincronizados
    FROM syntax_sync_jobs
  `).get() || {};
  res.json({
    success: true,
    ativo: solicitadoAtivo && credenciaisConfiguradas,
    solicitadoAtivo,
    credenciaisConfiguradas,
    modo: getConfigValue("syntax_integracao_modo", "homologacao"),
    etapa: credenciaisConfiguradas ? "aguardando_mapeamento_api" : "aguardando_documentacao_fornecedor",
    fila: {
      total: Number(counts.total || 0),
      pendentes: Number(counts.pendentes || 0),
      erros: Number(counts.erros || 0),
      sincronizados: Number(counts.sincronizados || 0),
    },
  });
});

// ===================== ROTAS PUBLICAS =====================
function listarItensCardapioBase() {
  const rows = db.prepare("SELECT * FROM cardapio ORDER BY order_index ASC").all();
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    preco: row.preco,
    categoria: row.categoria,
    ingredientes: parseMaybeJson(row.ingredientes),
    img: row.img,
    disponivel: row.disponivel === 1,
    order_index: row.order_index,
    tipo: "item",
  }));
}

function listarCombosAtivosCardapio() {
  return db
    .prepare(
      "SELECT id, nome, itens, preco, img, order_index FROM combos WHERE ativo = 1 OR lower(CAST(ativo AS TEXT)) IN ('true','sim') ORDER BY order_index ASC, updated_at DESC, id DESC"
    )
    .all()
    .map((row) => {
      const itensRaw = parseMaybeJson(row.itens);
      const itens = Array.isArray(itensRaw)
        ? itensRaw
        : String(itensRaw || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
      return {
        id: `combo-${row.id}`,
        combo_id: row.id,
        nome: row.nome,
        preco: Number(row.preco) || 0,
        categoria: "promocao",
        ingredientes: itens,
        img: row.img || "",
        disponivel: true,
        order_index: Number(row.order_index) || 0,
        tipo: "combo",
      };
    });
}

function criarItemPromocaoXtudo(baseCardapio = []) {
  const itemXtudo = (Array.isArray(baseCardapio) ? baseCardapio : []).find((item) => {
    const nome = normalizarTextoBusca(item?.nome || "");
    return (
      item?.disponivel !== false &&
      String(item?.tipo || "item").toLowerCase() !== "combo" &&
      (nome.includes("x-tudo") || nome.includes("x tudo"))
    );
  });
  if (!itemXtudo) return null;

  const precoPromo = Math.max(toNumber(getConfigValue("promo_xtudo_preco_unidade", "22"), 22), 0);
  const minQtdPromo = Math.max(toNumber(getConfigValue("promo_xtudo_min_qtd", "2"), 2), 1);
  const precoComboPromo = Math.max(toNumber(getConfigValue("promo_xtudo_preco_combo", "20"), 20), 0);
  return {
    id: `promo-xtudo-${itemXtudo.id || "base"}`,
    nome: `${itemXtudo.nome} (Promocao)`,
    preco: precoPromo,
    categoria: "promocao",
    ingredientes: Array.isArray(itemXtudo.ingredientes) ? itemXtudo.ingredientes : [],
    img: itemXtudo.img || "",
    disponivel: true,
    order_index: Number(getConfigValue("promo_xtudo_order_index", String(itemXtudo.order_index ?? 0))) || 0,
    tipo: "promocao",
    promocao: {
      preco_unidade: precoPromo,
      preco_combo: precoComboPromo,
      min_qtd: minQtdPromo,
    },
  };
}

function montarCardapioCompletoPublico({ incluirPromoXtudo = false } = {}) {
  const baseCardapio = listarItensCardapioBase();
  const combosAtivos = listarCombosAtivosCardapio();
  const promoXtudo = incluirPromoXtudo ? criarItemPromocaoXtudo(baseCardapio) : null;
  const topoPromocao = promoXtudo ? [promoXtudo, ...combosAtivos] : combosAtivos;
  return [...topoPromocao, ...baseCardapio];
}

function montarCatalogoAtendente() {
  const aliasesPorProduto = new Map();
  db.prepare(`
    SELECT produto_id, termo_exibicao
    FROM atendente_parser_aliases
    WHERE ativo = 1
    ORDER BY confirmacoes DESC, updated_at DESC
  `).all().forEach((row) => {
    const chave = String(row.produto_id);
    const lista = aliasesPorProduto.get(chave) || [];
    if (!lista.includes(row.termo_exibicao)) lista.push(row.termo_exibicao);
    aliasesPorProduto.set(chave, lista);
  });
  const cardapio = montarCardapioCompletoPublico({ incluirPromoXtudo: true }).map((produto) => ({
    ...produto,
    apelidos: aliasesPorProduto.get(String(produto.id)) || [],
  }));
  const adicionais = db
    .prepare("SELECT nome, preco FROM adicionais ORDER BY order_index ASC")
    .all()
    .map((row) => ({ nome: row.nome, preco: Number(row.preco) || 0 }));
  return {
    cardapio,
    adicionais,
    taxaEntrega: Math.max(toNumber(getConfigValue("taxa_entrega", "9"), 9), 0),
    atualizadoEm: new Date().toISOString(),
  };
}

function normalizarTipoEntregaAtendente(valor) {
  const tipo = normalizarTextoBusca(valor || "");
  if (tipo.includes("porta") || tipo.includes("balcao") || tipo.includes("presencial")) {
    return { tipoEntrega: "Na porta", origemPedido: "porta", isEntrega: false, isNaPorta: true };
  }
  if (tipo.includes("retirada") || tipo.includes("buscar") || tipo.includes("retirar")) {
    return { tipoEntrega: "Retirada", origemPedido: "atendente_app", isEntrega: false, isNaPorta: false };
  }
  return { tipoEntrega: "Entrega", origemPedido: "atendente_app", isEntrega: true, isNaPorta: false };
}

function serializarPedidoAtendente(row) {
  return {
    id: row.id,
    cliente: row.cliente || "",
    telefone: row.telefone || "",
    endereco: row.endereco || "",
    tipoEntrega: row.tipoEntrega || "",
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento || "",
    pagamentosDetalhes: parseMaybeJson(row.pagamento_detalhes) || [],
    troco: row.troco || "",
    chavePix: row.chavePix || "",
    carrinho: parseMaybeJson(row.carrinho) || [],
    obsGeral: row.obsGeral || "",
    status: row.status || "recebido",
    entregador: row.entregador || "",
    entregueEm: row.entregueEm || "",
    saiuParaEntrega: row.saiuParaEntrega || "",
    created_at: row.created_at || "",
    cupom: row.cupom || "",
    desconto: Number(row.desconto || 0),
    taxaEntrega: Number(row.taxa_entrega || 0),
  };
}

function normalizarNomeIngredienteAtendente(valor) {
  return normalizarTextoBusca(String(valor || "").replace(/^\d+\s+/, "").replace(/\s+x\d+$/i, ""));
}

function validarComplementosPedidoAtendente(complementosEntrada, adicionais) {
  if (!Array.isArray(complementosEntrada) || complementosEntrada.length === 0) return [];
  if (complementosEntrada.length > 20) throw new Error("limite_complementos");
  return complementosEntrada.map((entrada) => {
    const adicional = adicionais.get(normalizarTextoBusca(entrada?.nome));
    if (!adicional) throw new Error("complemento_invalido");
    const qtd = Math.max(parseInt(entrada?.qtd, 10) || 0, 0);
    if (qtd < 1 || qtd > 99) throw new Error("quantidade_complemento_invalida");
    return {
      nome: adicional.nome,
      preco: Number(adicional.preco || 0),
      qtd,
    };
  });
}

function validarCarrinhoAtendente(itensEntrada, complementosEntrada = []) {
  if (!Array.isArray(itensEntrada) || itensEntrada.length === 0) {
    throw new Error("carrinho_vazio");
  }
  if (itensEntrada.length > 50) throw new Error("limite_itens");

  const catalogo = montarCatalogoAtendente();
  const produtos = new Map(catalogo.cardapio.map((item) => [String(item.id), item]));
  const adicionais = new Map(
    catalogo.adicionais.map((item) => [normalizarTextoBusca(item.nome), item])
  );

  const produtoPromoXtudo = catalogo.cardapio.find((item) => item.tipo === "promocao" && item.promocao);
  const produtoEhXtudo = (produto) => {
    if (!produto || String(produto.tipo || "").toLowerCase() === "combo") return false;
    const nome = normalizarTextoBusca(produto.nome || "")
      .replace(/[()]/g, " ")
      .replace(/\s+promocao\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    return nome === "x-tudo" || nome === "x tudo";
  };
  const totalXtudo = itensEntrada.reduce((total, entrada) => {
    const produto = produtos.get(String(entrada?.produtoId ?? entrada?.id ?? ""));
    if (!produtoEhXtudo(produto)) return total;
    return total + Math.max(parseInt(entrada?.qtd, 10) || 0, 0);
  }, 0);
  const minimoPromoXtudo = Math.max(parseInt(produtoPromoXtudo?.promocao?.min_qtd, 10) || 1, 1);
  const aplicarPromoXtudo = Boolean(produtoPromoXtudo && totalXtudo >= minimoPromoXtudo);

  const complementosPedidoEntrada = validarComplementosPedidoAtendente(complementosEntrada, adicionais);

  const carrinho = itensEntrada.map((entrada) => {
    const produtoOriginal = produtos.get(String(entrada?.produtoId ?? entrada?.id ?? ""));
    if (!produtoOriginal || produtoOriginal.disponivel === false) throw new Error("produto_indisponivel");
    const produto = aplicarPromoXtudo && produtoEhXtudo(produtoOriginal)
      ? produtoPromoXtudo
      : produtoOriginal;

    const qtd = Math.max(parseInt(entrada?.qtd, 10) || 0, 0);
    if (qtd < 1 || qtd > 99) throw new Error("quantidade_invalida");

    let preco = Math.max(toNumber(produto.preco, 0), 0);
    if (produto.tipo === "promocao" && produto.promocao) {
      const minimo = Math.max(parseInt(produto.promocao.min_qtd, 10) || 1, 1);
      const quantidadePromocional = produtoEhXtudo(produto) ? totalXtudo : qtd;
      preco = quantidadePromocional >= minimo
        ? Math.max(toNumber(produto.promocao.preco_combo, preco), 0)
        : Math.max(toNumber(produto.promocao.preco_unidade, preco), 0);
    }

    const ingredientesProduto = new Map(
      (Array.isArray(produto.ingredientes) ? produto.ingredientes : [])
        .map((nome) => [normalizarNomeIngredienteAtendente(nome), String(nome || "").trim()])
        .filter(([chave]) => Boolean(chave))
    );
    const removidos = (Array.isArray(entrada?.removidos) ? entrada.removidos : []).map((nome) => {
      const ingrediente = ingredientesProduto.get(normalizarNomeIngredienteAtendente(nome));
      if (!ingrediente) throw new Error("ingrediente_invalido");
      return ingrediente.replace(/^\d+\s+/, "").replace(/\s+x\d+$/i, "").trim();
    });

    const adicionaisValidados = (Array.isArray(entrada?.adicionais) ? entrada.adicionais : []).map((add) => {
      const adicional = adicionais.get(normalizarTextoBusca(add?.nome));
      if (!adicional) throw new Error("adicional_invalido");
      const addQtd = Math.max(parseInt(add?.qtd, 10) || 0, 0);
      if (addQtd < 1 || addQtd > 20) throw new Error("quantidade_adicional_invalida");
      const escopoInformado = String(add?.escopo || "").trim().toLowerCase();
      return {
        nome: adicional.nome,
        preco: adicional.preco,
        qtd: addQtd,
        escopo: escopoInformado === "total" ? "total" : "unidade",
      };
    });

    return {
      produtoId: String(produtoOriginal.id),
      nome: String(produto.nome || "Item").trim(),
      preco,
      qtd,
      adicionais: adicionaisValidados,
      removidos: Array.from(new Set(removidos)),
      obs: formatarAlteracoesItem({
        removidos: Array.from(new Set(removidos)),
        adicionais: adicionaisValidados,
        obs: String(entrada?.obs || "").trim().slice(0, 300),
      }).obs,
      tipo: String(produto.tipo || "item"),
      categoria: String(produto.categoria || ""),
    };
  });

  const separados = separateOrderLevelComplements(carrinho, complementosPedidoEntrada);
  const complementosPedido = separados.complements;
  const carrinhoComComplementos = [
    ...separados.items,
    ...complementosPedido.map((item) => ({
      nome: item.nome,
      preco: item.preco,
      qtd: item.qtd,
      adicionais: [],
      removidos: [],
      obs: "Complemento do pedido",
      tipo: "complemento_pedido",
    })),
  ];

  return { carrinho: carrinhoComComplementos, itens: separados.items, complementosPedido, taxaEntregaPadrao: catalogo.taxaEntrega };
}

function construirResumoClientes() {
  const rows = db.prepare(`
    SELECT id, cliente, telefone, endereco, tipoEntrega, pagamento, carrinho,
           status, created_at, desconto, taxa_entrega
    FROM pedidos
    WHERE telefone IS NOT NULL AND trim(telefone) <> ''
      AND lower(COALESCE(status, '')) NOT LIKE 'cancel%'
    ORDER BY datetime(created_at) ASC, id ASC
  `).all();
  const clientes = new Map();
  const varianteParaChave = new Map();

  rows.forEach((row) => {
    const telefone = normalizeCustomerPhone(row.telefone || "");
    if (!telefone) return;
    const variantes = getPhoneVariants(telefone);
    const chaveExistente = variantes.map((item) => varianteParaChave.get(item)).find(Boolean);
    const chave = chaveExistente || telefone;
    variantes.forEach((item) => varianteParaChave.set(item, chave));

    let cliente = clientes.get(chave);
    if (!cliente) {
      cliente = {
        telefone: chave,
        nome: "",
        endereco: "",
        pedidosCount: 0,
        totalGasto: 0,
        primeiroPedido: "",
        ultimoPedido: "",
        ultimoPedidoId: 0,
        produtoFavorito: "",
        formaPagamentoFavorita: "",
        itens: new Map(),
        pagamentos: new Map(),
        pedidosParaAprendizado: [],
      };
      clientes.set(chave, cliente);
    }

    const carrinho = parseMaybeJson(row.carrinho) || [];
    cliente.pedidosParaAprendizado.push({
      carrinho: Array.isArray(carrinho) ? carrinho : [],
      pagamento: row.pagamento,
      tipoEntrega: row.tipoEntrega,
    });
    const totalItens = calcularTotalCarrinho(Array.isArray(carrinho) ? carrinho : [], row.desconto || 0);
    const entrega = normalizarTextoBusca(row.tipoEntrega).includes("entrega");
    const total = Math.max(0, totalItens + (entrega ? toNumber(row.taxa_entrega, 0) : 0));
    cliente.pedidosCount += 1;
    cliente.totalGasto += total;
    cliente.primeiroPedido = cliente.primeiroPedido || row.created_at || "";
    cliente.ultimoPedido = row.created_at || cliente.ultimoPedido;
    cliente.ultimoPedidoId = Number(row.id || 0);
    if (String(row.cliente || "").trim()) cliente.nome = String(row.cliente).trim();
    if (String(row.endereco || "").trim()) cliente.endereco = String(row.endereco).trim();

    (Array.isArray(carrinho) ? carrinho : []).forEach((item) => {
      const nome = String(item?.nome || "").trim();
      if (!nome || normalizarTextoBusca(item?.tipo).includes("complemento")) return;
      const chaveItem = normalizarTextoBusca(nome);
      const atual = cliente.itens.get(chaveItem) || { nome, qtd: 0 };
      atual.qtd += Math.max(parseInt(item?.qtd, 10) || 1, 1);
      cliente.itens.set(chaveItem, atual);
    });
    const pagamento = String(row.pagamento || "").trim();
    if (pagamento) {
      const chavePagamento = normalizarTextoBusca(pagamento);
      const atual = cliente.pagamentos.get(chavePagamento) || { nome: pagamento, qtd: 0 };
      atual.qtd += 1;
      cliente.pagamentos.set(chavePagamento, atual);
    }
  });

  const agora = Date.now();
  return Array.from(clientes.values()).map((cliente) => {
    const diasSemComprar = cliente.ultimoPedido
      ? Math.max(Math.floor((agora - (Date.parse(cliente.ultimoPedido) || agora)) / 86400000), 0)
      : null;
    const favorito = Array.from(cliente.itens.values()).sort((a, b) => b.qtd - a.qtd)[0];
    const pagamento = Array.from(cliente.pagamentos.values()).sort((a, b) => b.qtd - a.qtd)[0];
    const aprendizado = summarizeCustomerPreferences(cliente.pedidosParaAprendizado);
    let segmento = "ativo";
    if (cliente.pedidosCount === 1) segmento = "novo";
    else if (diasSemComprar !== null && diasSemComprar >= 30) segmento = "sumido";
    else if (cliente.pedidosCount >= 10 || cliente.totalGasto >= 500) segmento = "vip";
    else if (cliente.pedidosCount >= 3) segmento = "recorrente";
    return {
      telefone: cliente.telefone,
      nome: cliente.nome || "Cliente sem nome",
      endereco: cliente.endereco,
      pedidosCount: cliente.pedidosCount,
      totalGasto: Number(cliente.totalGasto.toFixed(2)),
      ticketMedio: Number((cliente.totalGasto / Math.max(cliente.pedidosCount, 1)).toFixed(2)),
      primeiroPedido: cliente.primeiroPedido,
      ultimoPedido: cliente.ultimoPedido,
      ultimoPedidoId: cliente.ultimoPedidoId,
      diasSemComprar,
      produtoFavorito: favorito?.nome || "",
      formaPagamentoFavorita: pagamento?.nome || "",
      aprendizado,
      segmento,
    };
  });
}

function buscarResumoClientePorTelefone(telefone) {
  const variantes = getPhoneVariants(normalizeCustomerPhone(telefone || ""));
  if (!variantes.length) return null;
  return construirResumoClientes().find((cliente) => {
    const variantesCliente = getPhoneVariants(cliente.telefone);
    return variantesCliente.some((item) => variantes.includes(item));
  }) || null;
}

async function obterInsightClienteIa(telefone, resumo) {
  const localInsight = obterInsightClienteIaLocal(telefone, resumo);
  if (localInsight) return localInsight;
  return localAiEnabled()
    ? { status: "insufficient_data", configured: true, source: "local", model: "mega-local-v3" }
    : { status: "disabled", configured: true, source: "local", model: "mega-local-v3" };
}

const localAiWorkerState = {
  running: false,
  lastRunAt: "",
  lastError: "",
  lastOrders: 0,
  lastMessages: 0,
};

const LOCAL_AI_STABLE_ORDER_MINUTES = 15;
const LOCAL_AI_ELIGIBLE_ORDER_STATUSES = new Set(["preparo", "pronto", "em_entrega", "entregue"]);

function localAiOrderEligible(order, now = Date.now()) {
  const status = String(order?.status || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!LOCAL_AI_ELIGIBLE_ORDER_STATUSES.has(status)) return false;
  if (status === "entregue") return true;
  const createdAt = new Date(order?.created_at || "").getTime();
  if (!Number.isFinite(createdAt)) return false;
  return createdAt <= Number(now) - (LOCAL_AI_STABLE_ORDER_MINUTES * 60 * 1000);
}

function localAiEnabled() {
  return getConfigValue("local_ai_enabled", "1") === "1";
}

function localAiJsonObject(value) {
  const parsed = parseMaybeJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function localAiEmptyProfile(phone, now) {
  return {
    telefone: phone,
    nome: "",
    endereco: "",
    orders_count: 0,
    messages_count: 0,
    total_spent: 0,
    products_json: "{}",
    additions_json: "{}",
    removals_json: "{}",
    payments_json: "{}",
    fulfillment_json: "{}",
    hours_json: "{}",
    weekdays_json: "{}",
    terms_json: "{}",
    first_seen_at: now,
    last_seen_at: now,
    updated_at: now,
  };
}

function localAiSaveProfile(profile) {
  db.prepare(`
    INSERT INTO local_ai_customer_profiles (
      telefone, nome, endereco, orders_count, messages_count, total_spent,
      products_json, additions_json, removals_json, payments_json, fulfillment_json,
      hours_json, weekdays_json, terms_json, first_seen_at, last_seen_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telefone) DO UPDATE SET
      nome = excluded.nome,
      endereco = excluded.endereco,
      orders_count = excluded.orders_count,
      messages_count = excluded.messages_count,
      total_spent = excluded.total_spent,
      products_json = excluded.products_json,
      additions_json = excluded.additions_json,
      removals_json = excluded.removals_json,
      payments_json = excluded.payments_json,
      fulfillment_json = excluded.fulfillment_json,
      hours_json = excluded.hours_json,
      weekdays_json = excluded.weekdays_json,
      terms_json = excluded.terms_json,
      first_seen_at = excluded.first_seen_at,
      last_seen_at = excluded.last_seen_at,
      updated_at = excluded.updated_at
  `).run(
    profile.telefone,
    profile.nome || "",
    profile.endereco || "",
    Number(profile.orders_count || 0),
    Number(profile.messages_count || 0),
    Number(profile.total_spent || 0),
    profile.products_json || "{}",
    profile.additions_json || "{}",
    profile.removals_json || "{}",
    profile.payments_json || "{}",
    profile.fulfillment_json || "{}",
    profile.hours_json || "{}",
    profile.weekdays_json || "{}",
    profile.terms_json || "{}",
    profile.first_seen_at || profile.updated_at,
    profile.last_seen_at || profile.updated_at,
    profile.updated_at
  );
}

function registrarMensagemIaLocal({ source = "wppconnect", sourceId = "", telefone = "", nome = "", texto = "", receivedAt = "" } = {}) {
  if (!localAiEnabled()) return { saved: false, reason: "disabled" };
  const phone = normalizeCustomerPhone(telefone || "");
  const message = String(texto || "").trim().slice(0, 2000);
  if (!phone || !message || message === "[audio]") return { saved: false, reason: "invalid" };
  const at = String(receivedAt || "").trim() || new Date().toISOString();
  const sourceKey = String(source || "local").trim().toLowerCase().slice(0, 30) || "local";
  const rawSourceId = String(sourceId || "").trim();
  const externalId = rawSourceId
    ? `${sourceKey}:${rawSourceId}`
    : crypto.createHash("sha256").update(`${sourceKey}|${phone}|${at}|${message}`).digest("hex");
  const info = db.prepare(`
    INSERT OR IGNORE INTO local_ai_messages
      (source, source_id, telefone, nome, texto, received_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sourceKey, externalId.slice(0, 180), phone, String(nome || "").trim().slice(0, 120), message, at);
  return { saved: info.changes > 0 };
}

function importarMensagensLegadasIaLocal() {
  if (!localAiEnabled()) return 0;
  const rows = db.prepare(`
    SELECT pending.id, pending.telefone, pending.nome, pending.mensagem,
           COALESCE(pending.updated_at, pending.created_at) AS received_at
    FROM bot_conversas_pendentes pending
    WHERE pending.telefone IS NOT NULL AND trim(pending.telefone) <> ''
      AND pending.mensagem IS NOT NULL AND trim(pending.mensagem) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM local_ai_messages learned
        WHERE learned.source_id = 'conversa_legada:legacy:' || pending.id
      )
    ORDER BY pending.id ASC
    LIMIT 2000
  `).all();
  let inserted = 0;
  rows.forEach((row) => {
    const result = registrarMensagemIaLocal({
      source: "conversa_legada",
      sourceId: `legacy:${row.id}`,
      telefone: row.telefone,
      nome: row.nome,
      texto: row.mensagem,
      receivedAt: row.received_at,
    });
    if (result.saved) inserted += 1;
  });

  const contatos = db.prepare(`
    SELECT id, telefone, ultimo_texto, COALESCE(last_msg_at, created_at) AS received_at
    FROM bot_contatos
    WHERE telefone IS NOT NULL AND trim(telefone) <> ''
      AND ultimo_texto IS NOT NULL AND trim(ultimo_texto) <> ''
      AND ultimo_texto NOT IN ('[audio]', '[sem_texto]')
      AND NOT EXISTS (
        SELECT 1 FROM local_ai_messages learned
        WHERE learned.source_id = 'contato_legado:legacy:' || bot_contatos.id
      )
    ORDER BY id ASC
    LIMIT 2000
  `).all();
  contatos.forEach((row) => {
    const phone = normalizeCustomerPhone(row.telefone || "");
    if (!phone) return;
    const alreadyTracked = db.prepare(`
      SELECT 1 FROM local_ai_messages
      WHERE telefone = ?
      LIMIT 1
    `).get(phone);
    if (alreadyTracked) return;
    const result = registrarMensagemIaLocal({
      source: "contato_legado",
      sourceId: `legacy:${row.id}`,
      telefone: phone,
      texto: row.ultimo_texto,
      receivedAt: row.received_at,
    });
    if (result.saved) inserted += 1;
  });
  return inserted;
}

function processarMensagemIaLocal(row) {
  const now = new Date().toISOString();
  const phone = normalizeCustomerPhone(row.telefone || "");
  if (!phone) {
    db.prepare("UPDATE local_ai_messages SET processed_at = ? WHERE id = ?").run(now, row.id);
    return;
  }
  const profile = db.prepare("SELECT * FROM local_ai_customer_profiles WHERE telefone = ?").get(phone)
    || localAiEmptyProfile(phone, row.received_at || now);
  let terms = localAiJsonObject(profile.terms_json);
  extractLocalAiTerms(row.texto).forEach((term) => {
    terms = incrementLocalAiCounter(terms, term, 1, term);
  });
  profile.nome = String(row.nome || "").trim() || profile.nome || "";
  profile.messages_count = Number(profile.messages_count || 0) + 1;
  profile.terms_json = JSON.stringify(terms);
  profile.first_seen_at = profile.first_seen_at || row.received_at || now;
  profile.last_seen_at = [profile.last_seen_at, row.received_at].filter(Boolean).sort().pop() || now;
  profile.updated_at = now;
  localAiSaveProfile(profile);
  db.prepare("UPDATE local_ai_messages SET processed_at = ? WHERE id = ?").run(now, row.id);
}

function localAiUpsertProduct(product, occurredAt) {
  db.prepare(`
    INSERT INTO local_ai_product_stats
      (product_key, product_id, product_name, quantity, orders_count, last_seen_at)
    VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT(product_key) DO UPDATE SET
      product_id = CASE WHEN excluded.product_id <> '' THEN excluded.product_id ELSE local_ai_product_stats.product_id END,
      product_name = excluded.product_name,
      quantity = local_ai_product_stats.quantity + excluded.quantity,
      orders_count = local_ai_product_stats.orders_count + 1,
      last_seen_at = excluded.last_seen_at
  `).run(product.key, product.id || "", product.name, product.quantity, occurredAt);
}

function localAiLearnPairs(products, occurredAt) {
  const unique = Array.from(new Map(products.map((product) => [product.key, product])).values())
    .sort((a, b) => a.key.localeCompare(b.key));
  for (let a = 0; a < unique.length; a += 1) {
    for (let b = a + 1; b < unique.length; b += 1) {
      db.prepare(`
        INSERT INTO local_ai_product_pairs
          (product_a_key, product_a_name, product_b_key, product_b_name, orders_count, last_seen_at)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(product_a_key, product_b_key) DO UPDATE SET
          product_a_name = excluded.product_a_name,
          product_b_name = excluded.product_b_name,
          orders_count = local_ai_product_pairs.orders_count + 1,
          last_seen_at = excluded.last_seen_at
      `).run(unique[a].key, unique[a].name, unique[b].key, unique[b].name, occurredAt);
    }
  }
}

function localAiProductsForTerm(term, products) {
  const normalizedTerm = normalizeLocalAiText(term);
  const direct = products.filter((product) => {
    const productName = normalizeLocalAiText(product.name);
    return productName.includes(normalizedTerm) || normalizedTerm.includes(productName);
  });
  if (direct.length) return direct;
  if (products.length === 1) return products;

  const learned = products.map((product) => ({
    product,
    hits: Number(db.prepare(`
      SELECT hits FROM local_ai_term_products WHERE term = ? AND product_key = ?
    `).get(term, product.key)?.hits || 0),
  })).sort((a, b) => b.hits - a.hits);
  if (learned[0]?.hits > 0 && learned[0].hits > Number(learned[1]?.hits || 0)) return [learned[0].product];
  return [];
}

function localAiLinkMessagesToOrder(phone, order, products) {
  if (!phone || !products.length) return 0;
  const messages = db.prepare(`
    SELECT id, texto
    FROM local_ai_messages
    WHERE telefone = ? AND linked_order_id IS NULL
      AND julianday(received_at) BETWEEN julianday(?) - 1 AND julianday(?) + (5.0 / 1440.0)
    ORDER BY received_at ASC
    LIMIT 30
  `).all(phone, order.created_at, order.created_at);
  const orderTerms = new Set(messages.flatMap((message) => extractLocalAiTerms(message.texto)));
  orderTerms.forEach((term) => {
    localAiProductsForTerm(term, products).forEach((product) => {
      db.prepare(`
        INSERT INTO local_ai_term_products (term, product_key, product_name, hits, last_seen_at)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT(term, product_key) DO UPDATE SET
          product_name = excluded.product_name,
          hits = local_ai_term_products.hits + 1,
          last_seen_at = excluded.last_seen_at
      `).run(term, product.key, product.name, order.created_at);
    });
  });
  messages.forEach((message) => {
    db.prepare("UPDATE local_ai_messages SET linked_order_id = ? WHERE id = ?").run(order.id, message.id);
  });
  return messages.length;
}

function localAiSaveProductEvents(orderId, phone, products, occurredAt) {
  if (!phone) return;
  const statement = db.prepare(`
    INSERT OR IGNORE INTO local_ai_customer_product_events
      (order_id, telefone, product_key, product_id, product_name, quantity, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  products.forEach((product) => {
    statement.run(orderId, phone, product.key, product.id || "", product.name, product.quantity, occurredAt);
  });
}

function localAiBackfillProductEvents(limit = 500) {
  const rows = db.prepare(`
    SELECT pedidos.*
    FROM pedidos
    JOIN local_ai_orders learned ON learned.order_id = pedidos.id
    WHERE NOT EXISTS (
      SELECT 1 FROM local_ai_customer_product_events events WHERE events.order_id = pedidos.id
    )
    ORDER BY pedidos.id ASC
    LIMIT ?
  `).all(Math.min(Math.max(Number(limit) || 1, 1), 1000));
  rows.forEach((order) => {
    const phone = normalizeCustomerPhone(order.telefone || "");
    const signals = buildLocalOrderSignals(order);
    localAiSaveProductEvents(order.id, phone, signals.products, String(order.created_at || new Date().toISOString()));
  });
  return rows.length;
}

function localAiEvaluatePrediction(phone, products, occurredAt) {
  if (!phone || !products.length) return null;
  const prediction = db.prepare(`
    SELECT * FROM local_ai_predictions
    WHERE telefone = ? AND evaluated_at IS NULL
      AND created_at <= ? AND expires_at >= ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(phone, occurredAt, occurredAt);
  if (!prediction) return null;
  const predicted = parseMaybeJson(prediction.predicted_products);
  const actualKeys = new Set(products.map((product) => product.key));
  const matched = (Array.isArray(predicted) ? predicted : []).filter((item) => actualKeys.has(String(item?.key || "")));
  db.prepare(`
    UPDATE local_ai_predictions
    SET evaluated_at = ?, matched_products = ?, hit = ?
    WHERE id = ?
  `).run(occurredAt, JSON.stringify(matched), matched.length ? 1 : 0, prediction.id);
  return { id: prediction.id, hit: matched.length > 0 };
}

function processarPedidoIaLocal(order) {
  const now = new Date().toISOString();
  const occurredAt = String(order.created_at || now);
  const phone = normalizeCustomerPhone(order.telefone || "");
  const signals = buildLocalOrderSignals(order);
  const sourceHash = crypto.createHash("sha256").update(JSON.stringify({
    cliente: order.cliente,
    telefone: phone,
    carrinho: order.carrinho,
    pagamento: order.pagamento,
    tipoEntrega: order.tipoEntrega,
    status: order.status,
  })).digest("hex");

  signals.products.forEach((product) => localAiUpsertProduct(product, occurredAt));
  localAiLearnPairs(signals.products, occurredAt);

  if (phone) {
    localAiEvaluatePrediction(phone, signals.products, occurredAt);
    localAiSaveProductEvents(order.id, phone, signals.products, occurredAt);
    const profile = db.prepare("SELECT * FROM local_ai_customer_profiles WHERE telefone = ?").get(phone)
      || localAiEmptyProfile(phone, occurredAt);
    let products = localAiJsonObject(profile.products_json);
    let additions = localAiJsonObject(profile.additions_json);
    let removals = localAiJsonObject(profile.removals_json);
    let payments = localAiJsonObject(profile.payments_json);
    let fulfillment = localAiJsonObject(profile.fulfillment_json);
    let hours = localAiJsonObject(profile.hours_json);
    let weekdays = localAiJsonObject(profile.weekdays_json);
    signals.products.forEach((product) => {
      products = incrementLocalAiCounter(products, product.key, product.quantity, product.name);
    });
    signals.additions.forEach((name) => { additions = incrementLocalAiCounter(additions, name, 1, name); });
    signals.removals.forEach((name) => { removals = incrementLocalAiCounter(removals, name, 1, name); });
    if (signals.payment) payments = incrementLocalAiCounter(payments, signals.payment, 1, signals.payment);
    if (signals.fulfillment) fulfillment = incrementLocalAiCounter(fulfillment, signals.fulfillment, 1, signals.fulfillment);
    hours = incrementLocalAiCounter(hours, String(signals.hour), 1, `${String(signals.hour).padStart(2, "0")}:00`);
    weekdays = incrementLocalAiCounter(weekdays, String(signals.weekday), 1, String(signals.weekday));
    profile.nome = String(order.cliente || "").trim() || profile.nome || "";
    profile.endereco = String(order.endereco || "").trim() || profile.endereco || "";
    profile.orders_count = Number(profile.orders_count || 0) + 1;
    profile.total_spent = Number(profile.total_spent || 0) + signals.total;
    profile.products_json = JSON.stringify(products);
    profile.additions_json = JSON.stringify(additions);
    profile.removals_json = JSON.stringify(removals);
    profile.payments_json = JSON.stringify(payments);
    profile.fulfillment_json = JSON.stringify(fulfillment);
    profile.hours_json = JSON.stringify(hours);
    profile.weekdays_json = JSON.stringify(weekdays);
    profile.first_seen_at = [profile.first_seen_at, occurredAt].filter(Boolean).sort()[0] || occurredAt;
    profile.last_seen_at = [profile.last_seen_at, occurredAt].filter(Boolean).sort().pop() || occurredAt;
    profile.updated_at = now;
    localAiSaveProfile(profile);
    localAiLinkMessagesToOrder(phone, order, signals.products);
  }

  db.prepare(`
    INSERT INTO local_ai_orders (order_id, telefone, source_hash, processed_at)
    VALUES (?, ?, ?, ?)
  `).run(order.id, phone, sourceHash, now);
}

function processarIaLocalBatch({ orderLimit = 300, messageLimit = 300 } = {}) {
  if (!localAiEnabled()) return { enabled: false, orders: 0, messages: 0 };
  if (localAiWorkerState.running) return { enabled: true, busy: true, orders: 0, messages: 0 };
  localAiWorkerState.running = true;
  let ordersProcessed = 0;
  let messagesProcessed = 0;
  try {
    importarMensagensLegadasIaLocal();
    localAiBackfillProductEvents();
    const messages = db.prepare(`
      SELECT * FROM local_ai_messages
      WHERE processed_at IS NULL
      ORDER BY received_at ASC, id ASC
      LIMIT ?
    `).all(Math.min(Math.max(Number(messageLimit) || 1, 1), 500));
    const processMessages = db.transaction(() => messages.forEach((row) => processarMensagemIaLocal(row)));
    processMessages();
    messagesProcessed = messages.length;

    const orderCandidates = db.prepare(`
      SELECT p.*
      FROM pedidos p
      LEFT JOIN local_ai_orders learned ON learned.order_id = p.id
      WHERE learned.order_id IS NULL
        AND lower(COALESCE(p.status, '')) IN ('preparo', 'pronto', 'em_entrega', 'entregue')
        AND (
          lower(COALESCE(p.status, '')) = 'entregue'
          OR datetime(p.created_at) <= datetime('now', '-' || ? || ' minutes')
        )
      ORDER BY p.id ASC
      LIMIT ?
    `).all(
      LOCAL_AI_STABLE_ORDER_MINUTES,
      Math.min(Math.max(Number(orderLimit) || 1, 1), 500) * 4
    );
    const orders = orderCandidates
      .filter((order) => localAiOrderEligible(order))
      .slice(0, Math.min(Math.max(Number(orderLimit) || 1, 1), 500));
    const processOrders = db.transaction(() => orders.forEach((row) => processarPedidoIaLocal(row)));
    processOrders();
    ordersProcessed = orders.length;
    localAiWorkerState.lastRunAt = new Date().toISOString();
    localAiWorkerState.lastError = "";
    localAiWorkerState.lastOrders = ordersProcessed;
    localAiWorkerState.lastMessages = messagesProcessed;
    return { enabled: true, orders: ordersProcessed, messages: messagesProcessed };
  } catch (err) {
    localAiWorkerState.lastError = String(err?.message || err).slice(0, 300);
    console.warn("[IA-LOCAL] Falha no aprendizado:", localAiWorkerState.lastError);
    return { enabled: true, orders: ordersProcessed, messages: messagesProcessed, error: localAiWorkerState.lastError };
  } finally {
    localAiWorkerState.running = false;
  }
}

function localAiProfileView(row) {
  const top = (column, limit = 5) => rankLocalAiCounter(localAiJsonObject(row[column]), limit);
  const historicalProducts = top("products_json");
  const recentProducts = scoreRecentLocalAiProducts(db.prepare(`
    SELECT product_key, product_name, quantity, occurred_at
    FROM local_ai_customer_product_events
    WHERE telefone = ?
    ORDER BY occurred_at DESC
    LIMIT 160
  `).all(row.telefone), { halfLifeDays: 45, limit: 5 });
  return {
    telefone: row.telefone,
    nome: row.nome || "Cliente sem nome",
    endereco: row.endereco || "",
    pedidos: Number(row.orders_count || 0),
    mensagens: Number(row.messages_count || 0),
    totalGasto: Number(Number(row.total_spent || 0).toFixed(2)),
    produtos: historicalProducts,
    produtosRecentes: recentProducts.map((item) => ({ name: item.name, count: item.orders, score: item.score })),
    mudancaHabito: detectLocalAiHabitChange(recentProducts, historicalProducts),
    adicionais: top("additions_json"),
    removidos: top("removals_json"),
    pagamentos: top("payments_json", 3),
    entregas: top("fulfillment_json", 3),
    horarios: top("hours_json", 3),
    termos: top("terms_json", 8),
    primeiroContato: row.first_seen_at,
    ultimoContato: row.last_seen_at,
    atualizadoEm: row.updated_at,
  };
}

function obterInsightClienteIaLocal(telefone, resumo) {
  if (!localAiEnabled() || !resumo) return null;
  const phone = normalizeCustomerPhone(telefone || resumo.telefone || "");
  const row = phone ? db.prepare("SELECT * FROM local_ai_customer_profiles WHERE telefone = ?").get(phone) : null;
  const orders = Math.max(Number(row?.orders_count ?? resumo.pedidosCount) || 0, 0);
  if (!orders) return null;
  const historicalProducts = row
    ? rankLocalAiCounter(localAiJsonObject(row.products_json), 4)
    : (Array.isArray(resumo?.aprendizado?.produtosFavoritos) ? resumo.aprendizado.produtosFavoritos : [])
      .slice(0, 4)
      .map((item) => ({ name: item.nome, count: Number(item.qtd || item.pedidos || 0) }));
  const recentEvents = phone ? db.prepare(`
    SELECT product_key, product_name, quantity, occurred_at
    FROM local_ai_customer_product_events
    WHERE telefone = ?
    ORDER BY occurred_at DESC
    LIMIT 240
  `).all(phone) : [];
  const recentProducts = scoreRecentLocalAiProducts(recentEvents, { halfLifeDays: 45, limit: 6 });
  const habitChange = detectLocalAiHabitChange(recentProducts, historicalProducts);
  const historicalByName = new Map(historicalProducts.map((item) => [normalizeLocalAiText(item.name), item]));
  const candidateProducts = recentProducts.length
    ? recentProducts.map((item) => ({ ...item, historicalCount: Number(historicalByName.get(normalizeLocalAiText(item.name))?.count || 0) }))
    : historicalProducts.map((item) => ({ key: `nome:${normalizeLocalAiText(item.name)}`, name: item.name, score: item.count, orders: item.count, historicalCount: item.count }));
  const totalRecentScore = candidateProducts.reduce((sum, item) => sum + Math.max(Number(item.score) || 0, 0), 0);
  const predictionStats = phone ? db.prepare(`
    SELECT COUNT(*) AS evaluated, COALESCE(SUM(hit), 0) AS hits
    FROM local_ai_predictions
    WHERE telefone = ? AND evaluated_at IS NOT NULL
  `).get(phone) : { evaluated: 0, hits: 0 };
  const catalog = montarCardapioCompletoPublico({ incluirPromoXtudo: true });
  const catalogByName = new Map(catalog.map((item) => [normalizeLocalAiText(item.nome), item]));
  const produtosProvaveisComChave = candidateProducts.map((item) => {
    const product = catalogByName.get(normalizeLocalAiText(item.name));
    if (!product || product.disponivel === false) return null;
    const recentShare = totalRecentScore ? Number(item.score || 0) / totalRecentScore : 0;
    const orderShare = Number(item.historicalCount || 0) / Math.max(orders, 1);
    return {
      key: item.key,
      produtoId: String(product.id),
      produtoNome: String(product.nome),
      motivo: recentProducts.length
        ? `Tem peso recente ${Number(item.score || 0).toFixed(1)} e apareceu em ${Number(item.orders || 0)} pedido(s) observado(s).`
        : `Apareceu ${Number(item.historicalCount || 0)} vez(es) no historico confirmado.`,
      confianca: localAiPredictionConfidence({
        orderShare,
        recentShare,
        evaluated: predictionStats.evaluated,
        hits: predictionStats.hits,
        sampleSize: Number(item.orders || orders),
      }),
      evidencias: {
        pedidosHistoricos: Number(item.historicalCount || 0),
        pedidosRecentes: Number(item.orders || 0),
        pesoRecente: Number(Number(item.score || 0).toFixed(2)),
        previsoesAvaliadas: Number(predictionStats.evaluated || 0),
      },
    };
  }).filter(Boolean).sort((a, b) => b.confianca - a.confianca).slice(0, 4);
  const produtosProvaveis = produtosProvaveisComChave.map(({ key, ...product }) => product);
  const removals = row ? rankLocalAiCounter(localAiJsonObject(row.removals_json), 3) : [];
  const additions = row ? rankLocalAiCounter(localAiJsonObject(row.additions_json), 3) : [];
  const preferencesFromSummary = Array.isArray(resumo?.aprendizado?.preferenciasRecorrentes)
    ? resumo.aprendizado.preferenciasRecorrentes.map((item) => `${item.tipo === "remover" ? "sem" : "adicionar"} ${item.nome}`)
    : [];
  const preferenciasConfirmar = [
    ...removals.map((item) => `sem ${item.name}`),
    ...additions.map((item) => `adicionar ${item.name}`),
    ...preferencesFromSummary,
  ].filter((item, index, list) => list.indexOf(item) === index).slice(0, 6);
  const daysInactive = Number(resumo.diasSemComprar);
  const profile = Number.isFinite(daysInactive) && daysInactive >= 30
    ? "inativo"
    : orders >= 10 ? "fiel" : orders >= 3 ? "recorrente" : orders >= 2 ? "ocasional" : "novo";
  const favorite = produtosProvaveis[0]?.produtoNome || historicalProducts[0]?.name || "";
  const payment = row ? rankLocalAiCounter(localAiJsonObject(row.payments_json), 1)[0]?.name : resumo?.aprendizado?.formaPagamentoFavorita;
  const fulfillment = row ? rankLocalAiCounter(localAiJsonObject(row.fulfillment_json), 1)[0]?.name : resumo?.aprendizado?.tipoEntregaFavorito;
  const serviceSuggestions = [
    habitChange ? `${habitChange.message} Confirmar a preferencia atual.` : "",
    favorite ? `Confirmar se deseja novamente ${favorite}.` : "Confirmar os itens antes de finalizar.",
    payment ? `Pagamento mais usado: ${payment}. Confirmar antes de aplicar.` : "",
    fulfillment ? `Modalidade mais usada: ${fulfillment}. Confirmar antes de aplicar.` : "",
  ].filter(Boolean).slice(0, 4);
  const marketingAction = profile === "inativo" ? "cupom_retorno" : favorite && orders >= 3 ? "oferta_favorito" : "nenhuma";
  const result = {
    status: "ready",
    configured: true,
    source: "local",
    model: "mega-local-v3",
    generatedAt: row?.updated_at || new Date().toISOString(),
    insight: {
      resumo: `Perfil calculado localmente com ${orders} pedido(s) confirmado(s)${row?.messages_count ? ` e ${Number(row.messages_count)} mensagem(ns)` : ""}.`,
      perfil: profile,
      sugestoesAtendimento: serviceSuggestions,
      produtosProvaveis,
      preferenciasConfirmar,
      mudancaHabito: habitChange,
      alertas: [
        habitChange?.message || "",
        orders < 3 ? "Historico curto: confianca reduzida ate existirem mais pedidos." : "",
        "Sugestoes estatisticas com peso de recencia: confirme com o cliente antes de aplicar.",
      ].filter(Boolean),
      oportunidadeMarketing: {
        acao: marketingAction,
        justificativa: marketingAction === "cupom_retorno"
          ? `Cliente sem comprar ha ${daysInactive} dias; qualquer contato deve respeitar consentimento e cooldown.`
          : marketingAction === "oferta_favorito"
            ? `${favorite} aparece com frequencia no historico; nao enviar oferta automaticamente.`
            : "Ainda nao ha evidencia suficiente para uma acao.",
      },
    },
  };
  if (phone && produtosProvaveisComChave.length) {
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (7 * 86400000)).toISOString();
    const predicted = produtosProvaveisComChave.map((item) => ({ key: item.key, name: item.produtoNome, confidence: item.confianca }));
    const sourceHash = crypto.createHash("sha256")
      .update(`${phone}|${resumo?.ultimoPedidoId || row?.last_seen_at || ""}|${predicted.map((item) => item.key).join(",")}`)
      .digest("hex");
    db.prepare(`
      INSERT OR IGNORE INTO local_ai_predictions
        (telefone, source_hash, predicted_products, profile, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(phone, sourceHash, JSON.stringify(predicted), profile, createdAt, expiresAt);
  }
  return result;
}

function mascararTelefoneAtendente(telefone) {
  const numero = normalizePhoneNumber(telefone);
  if (!numero) return "";
  const final = numero.slice(-4);
  const inicio = numero.length >= 4 ? numero.slice(0, 2) : "";
  return `${inicio}${"*".repeat(Math.max(numero.length - 6, 4))}${final}`;
}

function scoreNomeContatoAtendente(nomeBusca, row = {}) {
  const termo = normalizarTextoBusca(nomeBusca).replace(/\s+/g, " ").trim();
  if (!termo) return 0;
  const alvo = normalizarTextoBusca(`${row.nome || ""} ${row.mensagem || ""}`).replace(/\s+/g, " ").trim();
  if (!alvo) return 0;
  if (alvo === termo) return 100;
  if (alvo.includes(termo)) return 80;
  const partes = termo.split(/\s+/).filter((p) => p.length >= 2);
  if (!partes.length) return 0;
  const hits = partes.filter((p) => alvo.includes(p)).length;
  return hits ? Math.round((hits / partes.length) * 60) : 0;
}

function montarContatoAtendente(row, finalPreferido = "", nomeBusca = "") {
  const telefone = normalizeCustomerPhone(row.telefone || "");
  if (!telefone) return null;
  return {
    telefone,
    telefoneOculto: mascararTelefoneAtendente(telefone),
    finalTelefone: finalPreferido || telefone.slice(-4),
    nome: String(row.nome || "").trim(),
    ultimaMensagem: String(row.mensagem || "").trim().slice(0, 160),
    atualizadoEm: String(row.atualizado_em || row.created_at || ""),
    nomeScore: scoreNomeContatoAtendente(nomeBusca, row),
  };
}

function buscarContatosAtendente({ finalTelefone = "", nome = "", telefone = "" } = {}) {
  const final = String(finalTelefone || "").replace(/\D/g, "");
  const nomeBusca = String(nome || "").trim();
  const telefoneNormalizado = normalizeCustomerPhone(telefone);
  if (final && !/^\d{4}$/.test(final)) return [];
  if (!final && !nomeBusca && !telefoneNormalizado) return [];

  const telefoneVariants = telefoneNormalizado ? getPhoneVariants(telefoneNormalizado) : [];
  const contatos = db.prepare(`
    SELECT telefone, ultimo_texto AS mensagem, last_msg_at AS atualizado_em
    FROM bot_contatos
    ORDER BY COALESCE(last_msg_at, created_at) DESC
    LIMIT 160
  `).all();
  const pendentes = db.prepare(`
    SELECT telefone, nome, mensagem, updated_at AS atualizado_em
    FROM bot_conversas_pendentes
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 160
  `).all();
  const pedidosRecentes = db.prepare(`
    SELECT telefone, cliente AS nome, obsGeral AS mensagem, created_at AS atualizado_em
    FROM pedidos
    WHERE telefone IS NOT NULL AND telefone != ''
    ORDER BY id DESC
    LIMIT 160
  `).all();

  const porTelefone = new Map();
  [...pendentes, ...contatos, ...pedidosRecentes].forEach((row) => {
    const contato = montarContatoAtendente(row, final || "", nomeBusca);
    if (!contato) return;
    const variants = getPhoneVariants(contato.telefone);
    const matchTelefone = telefoneNormalizado
      ? variants.some((v) => telefoneVariants.includes(v))
      : true;
    const matchFinal = final ? contato.telefone.endsWith(final) : true;
    const matchNome = nomeBusca ? contato.nomeScore >= 30 : true;
    if (!matchTelefone || !matchFinal || !matchNome) return;

    const atual = porTelefone.get(contato.telefone);
    const dataAtual = Date.parse(String(atual?.atualizadoEm || "")) || 0;
    const dataNova = Date.parse(String(contato.atualizadoEm || "")) || 0;
    if (!atual || dataNova >= dataAtual || contato.nomeScore > (atual.nomeScore || 0)) {
      porTelefone.set(contato.telefone, contato);
    }
  });

  const resumoPorTelefone = new Map();
  construirResumoClientes().forEach((resumo) => {
    getPhoneVariants(resumo.telefone).forEach((variante) => resumoPorTelefone.set(variante, resumo));
  });

  return Array.from(porTelefone.values())
    .sort((a, b) =>
      (b.nomeScore || 0) - (a.nomeScore || 0) ||
      (Date.parse(b.atualizadoEm) || 0) - (Date.parse(a.atualizadoEm) || 0)
    )
    .slice(0, 10)
    .map(({ nomeScore, ...item }) => {
      const resumo = getPhoneVariants(item.telefone)
        .map((variante) => resumoPorTelefone.get(variante))
        .find(Boolean);
      return {
        ...item,
        pedidosCount: Number(resumo?.pedidosCount || 0),
        totalGasto: Number(resumo?.totalGasto || 0),
        ticketMedio: Number(resumo?.ticketMedio || 0),
        ultimoPedido: String(resumo?.ultimoPedido || ""),
        produtoFavorito: String(resumo?.produtoFavorito || ""),
        segmento: String(resumo?.segmento || (resumo ? "ativo" : "sem_pedido")),
      };
    });
}

function buscarContatosAtendentePorFinal(finalTelefone) {
  return buscarContatosAtendente({ finalTelefone });
}

function obterPedidoParaNotificacaoAtendente(pedidoId) {
  const row = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedidoId);
  if (!row) return null;
  return {
    id: row.id,
    cliente: row.cliente || "",
    telefone: row.telefone || "",
    endereco: row.endereco || "",
    tipoEntrega: row.tipoEntrega || "",
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento || "",
    troco: row.troco || "",
    carrinho: parseMaybeJson(row.carrinho) || [],
    obsGeral: row.obsGeral || "",
    status: row.status || "recebido",
    taxaEntrega: Number(row.taxa_entrega || 0),
    desconto: Number(row.desconto || 0),
    created_at: row.created_at || new Date().toISOString(),
  };
}

app.get("/api/atendente/catalogo", requireAtendente, (req, res) => {
  return res.json({ success: true, ...montarCatalogoAtendente() });
});

function termoSeguroParaAprendizado(termoNormalizado) {
  const termo = String(termoNormalizado || "").trim();
  if (termo.length < 2 || termo.length > 70 || !/[a-z]/.test(termo)) return false;
  if (/\d{5,}|@|https?:|www\./.test(termo)) return false;
  if (/\b(rua|avenida|av|travessa|bairro|numero|casa|apto|apartamento|quadra|cep|telefone|celular|whatsapp|observacao|troco|pix|cartao)\b/.test(termo)) return false;
  return termo.split(/\s+/).length <= 7;
}

function recalibrarAliasAprendido(termoNormalizado) {
  const termo = normalizarTextoBusca(termoNormalizado);
  if (!termo) return { productId: "", reason: "invalid_term" };
  const rows = db.prepare(`
    SELECT produto_id, confirmacoes, usos, acertos, erros
    FROM atendente_parser_aliases
    WHERE termo_normalizado = ?
  `).all(termo);
  const decision = chooseActiveAliasCandidate(rows);
  db.prepare(`
    UPDATE atendente_parser_aliases
    SET ativo = CASE WHEN produto_id = ? THEN 1 ELSE 0 END,
        updated_at = ?
    WHERE termo_normalizado = ?
  `).run(decision.productId || "__nenhum__", new Date().toISOString(), termo);
  return decision;
}

app.post("/api/atendente/parser/feedback", requireAtendente, (req, res) => {
  const entradas = Array.isArray(req.body?.associacoes) ? req.body.associacoes.slice(0, 12) : [];
  if (!entradas.length) return res.json({ success: true, accepted: 0, activated: 0 });

  const produtos = new Map(
    montarCatalogoAtendente().cardapio.map((produto) => [String(produto.id), produto])
  );
  const unicas = new Map();
  entradas.forEach((entrada) => {
    const produtoId = String(entrada?.produtoId || "").trim();
    const produto = produtos.get(produtoId);
    const termoExibicao = String(entrada?.termo || "").trim().replace(/\s+/g, " ").slice(0, 80);
    const termoNormalizado = normalizarTextoBusca(termoExibicao);
    if (!produto || !termoSeguroParaAprendizado(termoNormalizado)) return;
    unicas.set(`${termoNormalizado}:${produtoId}`, { termoNormalizado, termoExibicao, produto });
  });
  if (!unicas.size) return res.status(400).json({ success: false, error: "invalid_learning_feedback" });

  const now = new Date().toISOString();
  let activated = 0;
  const salvar = db.transaction(() => {
    unicas.forEach(({ termoNormalizado, termoExibicao, produto }) => {
      db.prepare(`
        INSERT INTO atendente_parser_aliases
          (termo_normalizado, termo_exibicao, produto_id, produto_nome, confirmacoes, ativo, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 0, ?, ?)
        ON CONFLICT(termo_normalizado, produto_id) DO UPDATE SET
          termo_exibicao = excluded.termo_exibicao,
          produto_nome = excluded.produto_nome,
          confirmacoes = atendente_parser_aliases.confirmacoes + 1,
          updated_at = excluded.updated_at
      `).run(termoNormalizado, termoExibicao, String(produto.id), String(produto.nome), now, now);
    });
    const termos = new Set(Array.from(unicas.values()).map((item) => item.termoNormalizado));
    termos.forEach((termo) => {
      const decision = recalibrarAliasAprendido(termo);
      if (decision.productId) activated += 1;
    });
  });
  salvar();
  registrarAuditoriaAdmin(req, {
    acao: "interpretador_feedback_registrado",
    entidade: "atendente_parser",
    detalhe: { associacoes: unicas.size, ativas: activated },
    ator: req.authUser?.email || "atendente_app",
  });
  return res.json({ success: true, accepted: unicas.size, activated });
});

app.post("/api/atendente/parser/usage", requireAtendente, (req, res) => {
  const entradas = Array.isArray(req.body?.usos) ? req.body.usos.slice(0, 20) : [];
  const produtosFinais = new Set(
    (Array.isArray(req.body?.produtosFinais) ? req.body.produtosFinais : [])
      .slice(0, 80)
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  if (!entradas.length) return res.json({ success: true, registered: 0 });

  const unicos = new Map();
  entradas.forEach((entrada) => {
    const produtoId = String(entrada?.produtoId || "").trim();
    const termo = normalizarTextoBusca(String(entrada?.termo || "").trim());
    if (!produtoId || !termoSeguroParaAprendizado(termo)) return;
    unicos.set(`${termo}:${produtoId}`, { termo, produtoId });
  });

  const now = new Date().toISOString();
  let registered = 0;
  const registrar = db.transaction(() => {
    const termosRecalibrar = new Set();
    unicos.forEach(({ termo, produtoId }) => {
      const correto = produtosFinais.has(produtoId) ? 1 : 0;
      const info = db.prepare(`
        UPDATE atendente_parser_aliases
        SET usos = usos + 1,
            acertos = acertos + ?,
            erros = erros + ?,
            last_used_at = ?,
            updated_at = ?
        WHERE termo_normalizado = ? AND produto_id = ? AND ativo = 1
      `).run(correto, correto ? 0 : 1, now, now, termo, produtoId);
      registered += info.changes;
      if (info.changes) termosRecalibrar.add(termo);
    });
    termosRecalibrar.forEach((termo) => recalibrarAliasAprendido(termo));
  });
  registrar();
  return res.json({ success: true, registered });
});

app.post("/api/atendente/parser/observation", requireAtendente, (req, res) => {
  const requestId = String(req.body?.requestId || "").trim();
  if (requestId.length < 8 || requestId.length > 160) {
    return res.status(400).json({ success: false, error: "invalid_observation_id" });
  }
  const summary = summarizeParserObservation({
    initialItems: req.body?.initialItems,
    finalItems: req.body?.finalItems,
    ambiguities: req.body?.ambiguities,
    unknown: req.body?.unknown,
    warnings: req.body?.warnings,
  });
  if (!summary.finalItems.length) {
    return res.status(400).json({ success: false, error: "empty_observation" });
  }
  const validProductIds = new Set(
    montarCatalogoAtendente().cardapio.map((produto) => String(produto.id))
  );
  if (summary.finalItems.some((item) => !validProductIds.has(item.produtoId))) {
    return res.status(400).json({ success: false, error: "invalid_observation_product" });
  }
  const requestHash = crypto.createHash("sha256").update(requestId).digest("hex");
  const info = db.prepare(`
    INSERT OR IGNORE INTO atendente_parser_observacoes
      (request_hash, ator, itens_iniciais, itens_finais, unidades_iniciais, unidades_finais,
       modificadores_iniciais, modificadores_finais, ambiguidades, nao_identificados, avisos,
       corrigido, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestHash,
    String(req.authUser?.email || "atendente_app").slice(0, 160),
    summary.initialJson,
    summary.finalJson,
    summary.initialUnits,
    summary.finalUnits,
    summary.initialModifiers,
    summary.finalModifiers,
    summary.ambiguities,
    summary.unknown,
    summary.warnings,
    summary.changed ? 1 : 0,
    new Date().toISOString()
  );
  return res.json({ success: true, registered: info.changes === 1, corrected: summary.changed });
});

app.get("/api/atendente/me", requireAtendente, (req, res) => {
  return res.json({
    success: true,
    user: {
      role: "admin",
      permissions: { orders: true, menu: true },
    },
  });
});

app.get("/api/atendente/pedidos", requireAtendente, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM pedidos ORDER BY id DESC LIMIT 160")
    .all();
  return res.json({ success: true, pedidos: rows.map(serializarPedidoAtendente) });
});

app.patch("/api/atendente/pedidos/:id/status", requireAtendente, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.status(404).json({ success: false, error: "pedido_nao_encontrado" });

  const statusValidos = new Set(["recebido", "preparo", "pronto", "em_entrega", "entregue", "cancelado"]);
  const statusReq = String(req.body?.status || "").trim().toLowerCase();
  if (!statusValidos.has(statusReq)) {
    return res.status(400).json({ success: false, error: "status_invalido" });
  }

  const entregadorAtualizado = String(req.body?.entregador || pedido.entregador || "").trim();
  if (
    entregadorObrigatorioParaPedido({
      tipoEntrega: pedido.tipoEntrega,
      origemPedido: pedido.origem_pedido,
      status: statusReq,
    }) &&
    !entregadorAtualizado
  ) {
    return res.status(400).json({
      success: false,
      error: "entregador_obrigatorio",
      message: "Selecione o entregador antes de enviar para entrega.",
    });
  }

  const statusAnterior = String(pedido.status || "").trim();
  const entregueEm = statusReq === "entregue" ? new Date().toLocaleString("pt-BR") : (pedido.entregueEm || null);
  const saiuParaEntrega = statusReq === "em_entrega" ? new Date().toLocaleString("pt-BR") : (pedido.saiuParaEntrega || null);
  const entregadorFinal = pedidoEhEntrega(pedido.tipoEntrega, pedido.origem_pedido) ? entregadorAtualizado : "";
  db.prepare(`
    UPDATE pedidos
    SET status = ?, entregador = ?, entregueEm = ?, saiuParaEntrega = ?
    WHERE id = ?
  `).run(statusReq, entregadorFinal, entregueEm, saiuParaEntrega, id);

  const pedidoAtualizado = serializarPedidoAtendente({
    ...pedido,
    status: statusReq,
    entregador: entregadorFinal,
    entregueEm,
    saiuParaEntrega,
  });
  registrarHistoricoStatusPedido(id, statusAnterior, statusReq, "atendente", "atendente_app");
  if (!normalizarTipoEntregaAtendente(pedido.tipoEntrega || pedido.origem_pedido).isNaPorta && statusReq !== "entregue" && statusReq !== "cancelado") {
    notificarCliente(pedidoAtualizado, statusReq).catch((err) =>
      console.warn("[ATENDENTE-APP] Erro ao notificar status:", err)
    );
  }
  if (
    statusReq === "preparo" &&
    statusAnterior !== "preparo" &&
    getConfigBoolean("auto_imprimir_preparo", true)
  ) {
    enfileirarImpressaoPedido(pedidoAtualizado);
  }
  return res.json({ success: true, pedido: pedidoAtualizado });
});

app.post("/api/atendente/pedidos/:id/imprimir", requireAtendente, (req, res) => {
  const pedidoId = parseInt(req.params.id, 10);
  if (!pedidoId) return res.status(400).json({ success: false, error: "id_invalido" });
  const pedido = obterPedidoParaNotificacaoAtendente(pedidoId);
  if (!pedido) return res.status(404).json({ success: false, error: "pedido_nao_encontrado" });
  enfileirarImpressaoPedido(pedido);
  return res.json({ success: true });
});

app.get("/api/atendente/entregadores", requireAtendente, (req, res) => {
  const rows = db
    .prepare("SELECT id, nome, ativo FROM entregadores ORDER BY ativo DESC, nome ASC")
    .all()
    .map((row) => ({
      id: row.id,
      nome: row.nome || "",
      ativo: row.ativo === 1,
    }));
  return res.json({ success: true, entregadores: rows });
});

app.get("/api/atendente/cardapio", requireAtendente, (req, res) => {
  const rows = db.prepare("SELECT * FROM cardapio ORDER BY order_index ASC").all();
  const itens = rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    preco: Number(row.preco || 0),
    categoria: row.categoria,
    ingredientes: parseMaybeJson(row.ingredientes) || [],
    img: row.img || "",
    disponivel: row.disponivel === 1,
    order_index: row.order_index,
  }));
  const adicionais = db
    .prepare("SELECT nome, preco FROM adicionais ORDER BY order_index ASC")
    .all()
    .map((row) => ({ nome: row.nome, preco: Number(row.preco || 0) }));
  const categorias = db
    .prepare("SELECT id, nome, slug, order_index FROM categorias ORDER BY order_index ASC, nome ASC")
    .all();
  return res.json({ success: true, itens, adicionais, categorias });
});

app.post("/api/atendente/cardapio", requireAtendenteAdmin, (req, res) => {
  const nome = String(req.body?.nome || "").trim();
  if (!nome) return res.status(400).json({ success: false, error: "nome_obrigatorio" });
  const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) as max FROM cardapio").get().max;
  const orderIndexReq = Number(req.body?.order_index);
  const orderIndex = Number.isFinite(orderIndexReq) && orderIndexReq >= 0 ? orderIndexReq : max + 1;
  db.prepare(`
    INSERT INTO cardapio (nome, preco, categoria, ingredientes, img, disponivel, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nome,
    Number(req.body?.preco) || 0,
    String(req.body?.categoria || "").trim(),
    normalizarIngredientes(req.body?.ingredientes),
    String(req.body?.img || "").trim(),
    req.body?.disponivel === false ? 0 : 1,
    orderIndex,
    new Date().toISOString()
  );
  syncBebidasFromCardapio();
  normalizarAutoBaixa();
  sincronizarPureBatataAtivo();
  return res.json({ success: true, message: "Produto atualizado com sucesso." });
});

app.put("/api/atendente/cardapio/:id", requireAtendenteAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const atual = db.prepare("SELECT * FROM cardapio WHERE id = ?").get(id);
  if (!atual) return res.status(404).json({ success: false, error: "produto_nao_encontrado" });
  const nome = String(req.body?.nome ?? atual.nome ?? "").trim();
  if (!nome) return res.status(400).json({ success: false, error: "nome_obrigatorio" });
  const orderIndexReq = Number(req.body?.order_index ?? atual.order_index);
  const orderIndex = Number.isFinite(orderIndexReq) && orderIndexReq >= 0 ? orderIndexReq : atual.order_index;
  db.prepare(`
    UPDATE cardapio
    SET nome = ?, preco = ?, categoria = ?, ingredientes = ?, img = ?, disponivel = ?, order_index = ?
    WHERE id = ?
  `).run(
    nome,
    Number(req.body?.preco ?? atual.preco) || 0,
    String(req.body?.categoria ?? atual.categoria ?? "").trim(),
    normalizarIngredientes(req.body?.ingredientes ?? parseMaybeJson(atual.ingredientes)),
    String(req.body?.img ?? atual.img ?? "").trim(),
    req.body?.disponivel === false ? 0 : 1,
    orderIndex,
    id
  );
  syncBebidasFromCardapio();
  normalizarAutoBaixa();
  sincronizarPureBatataAtivo();
  return res.json({ success: true, message: "Produto atualizado com sucesso." });
});

app.delete("/api/atendente/cardapio/:id", requireAtendenteAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });
  const atual = db.prepare("SELECT id FROM cardapio WHERE id = ?").get(id);
  if (!atual) return res.status(404).json({ success: false, error: "produto_nao_encontrado" });
  db.prepare("DELETE FROM cardapio WHERE id = ?").run(id);
  syncBebidasFromCardapio();
  normalizarAutoBaixa();
  sincronizarPureBatataAtivo();
  return res.json({ success: true, message: "Produto excluido com sucesso." });
});

app.get("/api/atendente/contatos", requireAtendente, (req, res) => {
  const final = String(req.query?.final || "").trim();
  const nome = String(req.query?.nome || "").trim();
  const telefone = String(req.query?.telefone || "").trim();
  if (final && !/^\d{4}$/.test(final)) {
    return res.status(400).json({ success: false, error: "final_telefone_invalido" });
  }
  if (!final && !nome && !telefone) {
    return res.status(400).json({ success: false, error: "busca_vazia" });
  }
  const contatos = buscarContatosAtendente({ finalTelefone: final, nome, telefone });
  return res.json({ success: true, finalTelefone: final, nome, telefone: normalizeCustomerPhone(telefone), contatos });
});

app.post("/api/atendente/pedidos/validar", requireAtendente, (req, res) => {
  try {
    const validado = validarCarrinhoAtendente(req.body?.itens, req.body?.complementosPedido);
    const tipoPedido = normalizarTipoEntregaAtendente(req.body?.tipoEntrega || "entrega");
    const taxaEntrega = tipoPedido.isEntrega ? validado.taxaEntregaPadrao : 0;
    const subtotal = calcularTotalCarrinho(validado.carrinho, 0);
    return res.json({
      success: true,
      itens: validado.itens,
      complementosPedido: validado.complementosPedido,
      subtotal,
      taxaEntrega,
      total: subtotal + taxaEntrega,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: String(err?.message || "carrinho_invalido"),
    });
  }
});

app.post("/api/atendente/pedidos", requireAtendente, async (req, res) => {
  try {
    const requestId = String(req.body?.requestId || "").trim();
    if (!/^[a-zA-Z0-9._-]{8,100}$/.test(requestId)) {
      return res.status(400).json({ success: false, error: "request_id_invalido" });
    }

    const cliente = String(req.body?.cliente || "").trim().slice(0, 120);
    const tipoPedido = normalizarTipoEntregaAtendente(req.body?.tipoEntrega || "entrega");
    const clienteSalvo = cliente || (tipoPedido.isNaPorta ? "Na porta" : "Cliente nao informado");
    const tipoEntrega = tipoPedido.tipoEntrega;
    const endereco = tipoPedido.isEntrega
      ? String(req.body?.endereco || "").trim().slice(0, 240)
      : "";
    if (tipoPedido.isEntrega && !endereco) {
      return res.status(400).json({ success: false, error: "endereco_obrigatorio" });
    }

    const pagamentos = {
      pix: "Pix",
      dinheiro: "Dinheiro",
      cartao: "Cartao",
    };
    const pagamentoChave = normalizarTextoBusca(req.body?.pagamento || "pix");
    const pagamento = pagamentos[pagamentoChave];
    if (!pagamento) {
      return res.status(400).json({ success: false, error: "pagamento_invalido" });
    }

    let validado;
    try {
      validado = validarCarrinhoAtendente(req.body?.itens, req.body?.complementosPedido);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: String(err?.message || "carrinho_invalido"),
      });
    }

    const taxaEntrega = tipoPedido.isEntrega ? validado.taxaEntregaPadrao : 0;
    const subtotal = calcularTotalCarrinho(validado.carrinho, 0);
    const total = subtotal + taxaEntrega;
    const agora = new Date().toISOString();
    const statusInicial = getConfigBoolean("auto_aceitar_pedidos", false) ? "preparo" : "recebido";
    const telefoneEntrada = String(req.body?.telefone || "").trim();
    const telefoneInfo = tipoPedido.isNaPorta ? null : normalizarTelefoneBrasil(telefoneEntrada);
    const telefone = tipoPedido.isNaPorta
      ? ""
      : (telefoneInfo?.valido ? telefoneInfo.nacional : String(telefoneInfo?.digits || telefoneEntrada).slice(0, 30));
    const troco = pagamentoChave === "dinheiro"
      ? String(req.body?.troco || "").trim().slice(0, 40)
      : "";
    const obsGeral = String(req.body?.obsGeral || "").trim().slice(0, 500);

    const criarPedido = db.transaction(() => {
      const repetido = db
        .prepare("SELECT pedido_id FROM atendente_pedidos_idempotencia WHERE request_id = ?")
        .get(requestId);
      if (repetido) return { pedidoId: Number(repetido.pedido_id), duplicado: true };

      const pedidoId = gerarProximoPedidoId();
      db.prepare(`
        INSERT INTO pedidos (
          id, cliente, telefone, endereco, tipoEntrega, origem_pedido, pagamento, pagamento_detalhes,
          troco, chavePix, carrinho, obsGeral, status, entregador, entregueEm, saiuParaEntrega,
          created_at, cupom, desconto, taxa_entrega
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pedidoId,
        clienteSalvo,
        telefone,
        endereco,
        tipoEntrega,
        tipoPedido.origemPedido,
        pagamento,
        "[]",
        troco,
        "",
        normalizarCarrinho(validado.carrinho),
        obsGeral,
        statusInicial,
        "",
        null,
        null,
        agora,
        "",
        0,
        taxaEntrega
      );
      db.prepare(
        "INSERT INTO atendente_pedidos_idempotencia (request_id, pedido_id, created_at) VALUES (?, ?, ?)"
      ).run(requestId, pedidoId, agora);
      return { pedidoId, duplicado: false };
    });

    const resultado = criarPedido.immediate();
    let mensagem = { enviada: false, motivo: resultado.duplicado ? "pedido_duplicado" : "sem_telefone" };
    if (!resultado.duplicado) {
      const pedido = {
        id: resultado.pedidoId,
        cliente: clienteSalvo,
        telefone,
        endereco,
        tipoEntrega,
        origemPedido: tipoPedido.origemPedido,
        pagamento,
        troco,
        carrinho: validado.carrinho,
        obsGeral,
        status: statusInicial,
        taxaEntrega,
        subtotal,
        total,
        created_at: agora,
      };
      baixarEstoqueBebidas(validado.carrinho, resultado.pedidoId);
      registrarHistoricoStatusPedido(resultado.pedidoId, null, statusInicial, "atendente", "atendente_app");
      if (statusInicial === "preparo" && getConfigBoolean("auto_imprimir_preparo", true)) {
        enfileirarImpressaoPedido(pedido);
      }
      if (telefone && !tipoPedido.isNaPorta) {
        try {
          const resultadoMensagem = await notificarCliente(pedido, "recebido");
          mensagem = {
            enviada: Boolean(resultadoMensagem?.ok),
            motivo: resultadoMensagem?.ok ? "" : String(resultadoMensagem?.error || "falha_envio"),
          };
        } catch (err) {
          mensagem = { enviada: false, motivo: String(err?.message || "falha_envio") };
          console.warn("[ATENDENTE-APP] Falha ao notificar cliente:", err?.message || err);
        }
      }
      console.log(`[ATENDENTE-APP] Pedido #${resultado.pedidoId} criado (${requestId}).`);
    }

    return res.status(resultado.duplicado ? 200 : 201).json({
      success: true,
      pedidoId: resultado.pedidoId,
      duplicado: resultado.duplicado,
      cliente: clienteSalvo,
      total,
      status: statusInicial,
      createdAt: agora,
      mensagem,
    });
  } catch (err) {
    console.error("[ATENDENTE-APP] Erro ao criar pedido:", err);
    return res.status(500).json({ success: false, error: "erro_interno" });
  }
});

app.post("/api/atendente/pedidos/:id/notificacao", requireAtendente, async (req, res) => {
  const pedidoId = parseInt(req.params.id, 10);
  if (!pedidoId) return res.status(400).json({ success: false, error: "id_invalido" });
  const pedido = obterPedidoParaNotificacaoAtendente(pedidoId);
  if (!pedido) return res.status(404).json({ success: false, error: "pedido_nao_encontrado" });
  if (normalizarTipoEntregaAtendente(pedido.tipoEntrega || pedido.origemPedido).isNaPorta) {
    return res.status(400).json({ success: false, error: "pedido_sem_whatsapp_automatico" });
  }
  if (!normalizePhoneNumber(pedido.telefone)) {
    return res.status(400).json({ success: false, error: "telefone_nao_informado" });
  }
  try {
    const resultado = await notificarCliente(pedido, "recebido");
    if (!resultado?.ok) {
      return res.status(502).json({
        success: false,
        error: String(resultado?.error || "falha_envio"),
        pedidoId,
      });
    }
    return res.json({ success: true, pedidoId, mensagem: { enviada: true, motivo: "" } });
  } catch (err) {
    console.warn(`[ATENDENTE-APP] Falha ao reenviar confirmacao #${pedidoId}:`, err?.message || err);
    return res.status(502).json({ success: false, error: "falha_envio", pedidoId });
  }
});

app.get("/cardapio", (req, res) => {
  res.json(montarCardapioCompletoPublico({ incluirPromoXtudo: false }));
});

const produtoInteracaoRate = new Map();
const produtoInteracaoCooldown = new Map();

function permitirInteracaoProduto(req, visitanteId, produtoId, evento) {
  const agora = Date.now();
  const ip = getClientIp(req);
  const bucket = produtoInteracaoRate.get(ip);
  if (!bucket || agora - bucket.inicio >= 60 * 1000) {
    produtoInteracaoRate.set(ip, { inicio: agora, total: 1 });
  } else {
    bucket.total += 1;
    if (bucket.total > 120) return false;
  }
  if (produtoInteracaoRate.size > 5000) {
    for (const [item, state] of produtoInteracaoRate) {
      if (agora - state.inicio > 5 * 60 * 1000) produtoInteracaoRate.delete(item);
    }
  }

  const chave = `${visitanteId}:${produtoId}:${evento}`;
  const ultimo = produtoInteracaoCooldown.get(chave) || 0;
  const intervalo = evento === "view" ? 15 * 1000 : 1500;
  if (agora - ultimo < intervalo) return false;
  produtoInteracaoCooldown.set(chave, agora);
  if (produtoInteracaoCooldown.size > 10000) {
    for (const [item, timestamp] of produtoInteracaoCooldown) {
      if (agora - timestamp > 60 * 60 * 1000) produtoInteracaoCooldown.delete(item);
    }
  }
  return true;
}

app.post("/marketing/interacao-produto", (req, res) => {
  const visitanteId = String(req.body?.visitanteId || "").trim();
  const produtoId = String(req.body?.produtoId || "").trim();
  const evento = String(req.body?.evento || "").trim().toLowerCase();
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(visitanteId) || !/^[A-Za-z0-9_-]{1,80}$/.test(produtoId)) {
    return res.status(400).json({ success: false, error: "invalid_identifier" });
  }
  if (!new Set(["view", "cart"]).has(evento)) {
    return res.status(400).json({ success: false, error: "invalid_event" });
  }

  const produto = montarCardapioCompletoPublico({ incluirPromoXtudo: true })
    .find((item) => String(item.id) === produtoId && item.disponivel !== false);
  if (!produto) return res.status(404).json({ success: false, error: "product_not_found" });
  if (!permitirInteracaoProduto(req, visitanteId, produtoId, evento)) {
    return res.json({ success: true, ignored: true });
  }

  const agora = new Date().toISOString();
  const brasil = getNowInBrazil();
  const data = `${brasil.year}-${String(brasil.month).padStart(2, "0")}-${String(brasil.day).padStart(2, "0")}`;
  const visualizacoes = evento === "view" ? 1 : 0;
  const adicoesCarrinho = evento === "cart" ? 1 : 0;
  db.prepare(`
    INSERT INTO produto_interacoes_diarias
      (data, produto_id, produto_nome, categoria, visitante_id, visualizacoes, adicoes_carrinho, primeira_interacao, ultima_interacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(data, produto_id, visitante_id) DO UPDATE SET
      produto_nome = excluded.produto_nome,
      categoria = excluded.categoria,
      visualizacoes = visualizacoes + excluded.visualizacoes,
      adicoes_carrinho = adicoes_carrinho + excluded.adicoes_carrinho,
      ultima_interacao = excluded.ultima_interacao
  `).run(
    data,
    produtoId,
    String(produto.nome || "Produto").slice(0, 160),
    String(produto.categoria || "").slice(0, 80),
    visitanteId,
    visualizacoes,
    adicoesCarrinho,
    agora,
    agora
  );
  return res.status(202).json({ success: true });
});

app.get("/adicionais", (req, res) => {
  const rows = db.prepare("SELECT * FROM adicionais ORDER BY order_index ASC").all();
  res.json(rows.map((row) => ({ nome: row.nome, preco: row.preco })));
});

app.get("/config", (req, res) => {
  res.json({
    taxa_entrega: globalThis.MegaPricing.money(getConfigValue("taxa_entrega", "9")),
    tempo_entrega_min: toNumber(getConfigValue("tempo_entrega_min", "45"), 45),
    tempo_retirada_min: toNumber(getConfigValue("tempo_retirada_min", "20"), 20),
    whatsapp: getConfigValue("whatsapp", "5535997376001"),
    default_ddd: DEFAULT_DDD,
    msg_pix: getConfigValue("msg_pix", "Envie o comprovante do Pix no WhatsApp."),
    public_url: getConfigValue("public_url", ""),
    promo_xtudo_preco_unidade: toNumber(getConfigValue("promo_xtudo_preco_unidade", "22"), 22),
    promo_xtudo_preco_combo: toNumber(getConfigValue("promo_xtudo_preco_combo", "20"), 20),
    promo_xtudo_min_qtd: toNumber(getConfigValue("promo_xtudo_min_qtd", "2"), 2),
    promo_tag_text: getConfigValue("promo_tag_text", "Promocao"),
    promo_destaque_text: getConfigValue("promo_destaque_text", "X-Tudo R$ {preco_unidade} cada"),
    promo_sub_text: getConfigValue("promo_sub_text", "{min_qtd}+ por R$ {preco_combo}"),
    logo_url: getConfigValue("logo_url", ""),
    funcionamento_dias: parseMaybeJson(getConfigValue("funcionamento_dias", "[]")) || [],
    funcionamento_abre: getConfigValue("funcionamento_abre", ""),
    funcionamento_fecha: getConfigValue("funcionamento_fecha", ""),
    tema_cardapio: normalizarTemaCardapio(getConfigValue("tema_cardapio", "original"))
  });
});

app.get("/categorias", (req, res) => {
  const rows = db
    .prepare("SELECT slug, nome FROM categorias WHERE ativo = 1 ORDER BY order_index ASC")
    .all();
  res.json(rows);
});

// ===================== WEBHOOK Z-API =====================
app.post("/webhook/zapi", async (req, res) => {
  if (!webhookAutorizado(req)) return res.status(401).json({ ok: false });

  const body = req.body || {};
  if (body?.fromMe || body?.sender?.fromMe) return res.json({ ok: true, ignored: true });
  if (body?.isGroup || body?.isGroupMessage) return res.json({ ok: true, ignored: true });
  if (zapiMensagemEhFoto(body)) return res.json({ ok: true, ignored: true, reason: "image_message" });
  if (zapiMensagemEhDocumento(body)) {
    return res.json({ ok: true, ignored: true, reason: "document_message" });
  }
  const ehAudio = zapiMensagemEhAudio(body);
  const texto = extrairTextoWebhook(body);
  const telefone = extrairTelefoneWebhook(body);
  const nome = extrairNomeWebhook(body);
  if (!telefone) return res.json({ ok: true, ignored: true });
  if (!texto && !ehAudio) return res.json({ ok: true, ignored: true, reason: "empty_message" });
  if (deveIgnorarMensagemDuplicada({ telefone, texto, ehAudio })) {
    return res.json({ ok: true, ignored: true, reason: "duplicate_message" });
  }
  registrarMensagemIaLocal({
    source: "zapi",
    sourceId: typeof body?.messageId === "string" ? body.messageId : (body?.messageId?.id || body?.id || ""),
    telefone,
    nome,
    texto: texto || (ehAudio ? "[audio]" : ""),
  });
  if (!botAutoReplyAtivo()) return res.json({ ok: true, ignored: true, reason: "bot_disabled" });
  const contatoAnterior = obterContatoBot(telefone);
  registrarContatoBot(telefone, texto || (ehAudio ? "[audio]" : "[sem_texto]"));
  if (botBloqueado(telefone)) return res.json({ ok: true, ignored: true });

  const deveEnviarInicial = deveEnviarSaudacaoInicial({
    telefone,
    texto,
    ehAudio,
    contatoAnterior,
  });

  if (!isAbertoAgora()) {
    const mensagemFechado = construirMensagemLojaFechada(getPublicUrl());
    if (
      deveBloquearRespostaAutomatica({
        telefone,
        texto: texto || (ehAudio ? "[audio]" : ""),
        mensagem: mensagemFechado,
        tipo: "fechado",
      })
    ) {
      return res.json({ ok: true, closed: true, throttled: true });
    }
    await zapiSendText(telefone, mensagemFechado, `fechado-${Date.now()}`);
    return res.json({ ok: true, closed: true });
  }

  const respostaPersonalizadaInfo = texto ? construirRespostaPorPalavraChave(texto) : { mensagem: "", tipo: "" };
  const respostaPersonalizada =
    respostaPersonalizadaInfo.tipo === "saudacao" && !deveEnviarInicial
      ? ""
      : respostaPersonalizadaInfo.mensagem;
  const respostaTempo = texto ? construirRespostaRapida(texto) : "";
  const respostaStatus = texto ? construirRespostaStatusPedido(telefone, texto) : "";
  if (!respostaPersonalizada && !respostaTempo && !respostaStatus && !deveEnviarInicial) {
    if (texto) {
      registrarConversaPendente({ canal: "zapi", telefone, nome, texto });
      await alertarAtendenteConversaSemResposta({ canal: "zapi", telefone, nome, texto });
    }
    return res.json({ ok: true, ignored: true });
  }

  const mensagem =
    respostaPersonalizada ||
    respostaTempo ||
    respostaStatus ||
    construirMensagemCardapio(getPublicUrl());
  const tipoResposta =
    respostaPersonalizada
      ? respostaPersonalizadaInfo.tipo || "auto"
      : deveEnviarInicial
        ? "saudacao"
        : "auto";
  if (
    deveBloquearRespostaAutomatica({
      telefone,
      texto: texto || (ehAudio ? "[audio]" : ""),
      mensagem,
      deveEnviarInicial,
      tipo: tipoResposta,
    })
  ) {
    return res.json({ ok: true, throttled: true });
  }
  await zapiSendText(telefone, mensagem, `cardapio-${Date.now()}`);
  res.json({ ok: true });
});

// ===================== WEBHOOK WATI =====================
app.post("/webhook/wati", async (req, res) => {
  if (!watiWebhookAutorizado(req)) return res.status(401).json({ ok: false });

  const body = req.body || {};
  const eventType = String(body?.eventType || body?.event || "").trim();
  if (eventType && eventType !== "messageReceived") {
    return res.json({ ok: true, ignored: true });
  }
  if (watiMensagemEhFoto(body)) return res.json({ ok: true, ignored: true, reason: "image_message" });
  if (watiMensagemEhDocumento(body)) {
    return res.json({ ok: true, ignored: true, reason: "document_message" });
  }
  const ehAudio = watiMensagemEhAudio(body);
  const texto = extrairTextoWati(body);
  const telefone = extrairTelefoneWati(body);
  const nome = extrairNomeWati(body);
  if (!telefone) return res.json({ ok: true, ignored: true });
  if (!texto && !ehAudio) return res.json({ ok: true, ignored: true, reason: "empty_message" });
  if (deveIgnorarMensagemDuplicada({ telefone, texto, ehAudio })) {
    return res.json({ ok: true, ignored: true, reason: "duplicate_message" });
  }
  registrarMensagemIaLocal({
    source: "wati",
    sourceId: typeof body?.messageId === "string" ? body.messageId : (body?.id || body?.messageId?.id || body?.data?.id || ""),
    telefone,
    nome,
    texto: texto || (ehAudio ? "[audio]" : ""),
  });
  if (!botAutoReplyAtivo()) return res.json({ ok: true, ignored: true, reason: "bot_disabled" });
  const contatoAnterior = obterContatoBot(telefone);
  registrarContatoBot(telefone, texto || (ehAudio ? "[audio]" : "[sem_texto]"));
  if (botBloqueado(telefone)) return res.json({ ok: true, ignored: true });

  const deveEnviarInicial = deveEnviarSaudacaoInicial({
    telefone,
    texto,
    ehAudio,
    contatoAnterior,
  });

  if (!isAbertoAgora()) {
    const mensagemFechado = construirMensagemLojaFechada(getPublicUrl());
    if (
      deveBloquearRespostaAutomatica({
        telefone,
        texto: texto || (ehAudio ? "[audio]" : ""),
        mensagem: mensagemFechado,
        tipo: "fechado",
      })
    ) {
      return res.json({ ok: true, closed: true, throttled: true });
    }
    const resultadoFechado = await watiSendSessionMessage(
      telefone,
      mensagemFechado
    );
    if (!resultadoFechado.ok) {
      console.warn("[WATI] Falha ao enviar mensagem de fechado:", resultadoFechado);
    }
    return res.json({ ok: true, closed: true });
  }

  const respostaPersonalizadaInfo = texto ? construirRespostaPorPalavraChave(texto) : { mensagem: "", tipo: "" };
  const respostaPersonalizada =
    respostaPersonalizadaInfo.tipo === "saudacao" && !deveEnviarInicial
      ? ""
      : respostaPersonalizadaInfo.mensagem;
  const respostaTempo = texto ? construirRespostaRapida(texto) : "";
  const respostaStatus = texto ? construirRespostaStatusPedido(telefone, texto) : "";
  if (!respostaPersonalizada && !respostaTempo && !respostaStatus && !deveEnviarInicial) {
    if (texto) {
      registrarConversaPendente({ canal: "wati", telefone, nome, texto });
      await alertarAtendenteConversaSemResposta({ canal: "wati", telefone, nome, texto });
    }
    return res.json({ ok: true, ignored: true });
  }

  const mensagem =
    respostaPersonalizada ||
    respostaTempo ||
    respostaStatus ||
    construirMensagemCardapio(getPublicUrl());
  const tipoResposta =
    respostaPersonalizada
      ? respostaPersonalizadaInfo.tipo || "auto"
      : deveEnviarInicial
        ? "saudacao"
        : "auto";
  if (
    deveBloquearRespostaAutomatica({
      telefone,
      texto: texto || (ehAudio ? "[audio]" : ""),
      mensagem,
      deveEnviarInicial,
      tipo: tipoResposta,
    })
  ) {
    return res.json({ ok: true, throttled: true });
  }
  const resultado = await watiSendSessionMessage(telefone, mensagem);
  if (!resultado.ok) {
    console.warn("[WATI] Falha ao responder webhook:", resultado);
  }
  res.json({ ok: true });
});

// ===================== WEBHOOK WPPCONNECT =====================
app.post("/webhook/wppconnect", async (req, res) => {
  if (!wppWebhookAutorizado(req)) return res.status(401).json({ ok: false });

  const body = req.body || {};
  const eventType = String(body?.event || body?.eventType || body?.type || "").toLowerCase().trim();
  const eventNorm = eventType.replace(/[^a-z]/g, "");
  if (eventNorm && !WPP_WEBHOOK_EVENTOS_PERMITIDOS.has(eventNorm)) {
    console.log("[WPPCONNECT] Webhook ignorado por evento:", { event: eventNorm });
    return res.json({ ok: true, ignored: true });
  }
  if (wppMensagemFromMe(body)) {
    console.log("[WPPCONNECT] Webhook ignorado fromMe");
    return res.json({ ok: true, ignored: true, reason: "from_me" });
  }
  if (wppMensagemEhGrupo(body)) {
    console.log("[WPPCONNECT] Webhook ignorado grupo");
    return res.json({ ok: true, ignored: true, reason: "group_message" });
  }
  if (wppMensagemEhAntiga(body)) {
    console.log("[WPPCONNECT] Webhook ignorado mensagem antiga:", {
      timestamp: extrairTimestampWpp(body),
    });
    return res.json({ ok: true, ignored: true, reason: "old_message" });
  }
  if (deveIgnorarEventoWppDuplicado(body)) {
    console.log("[WPPCONNECT] Webhook ignorado evento duplicado:", {
      id: extrairIdMensagemWpp(body),
    });
    return res.json({ ok: true, ignored: true, reason: "duplicate_event" });
  }
  if (wppMensagemEhFoto(body)) {
    console.log("[WPPCONNECT] Webhook ignorado foto");
    return res.json({ ok: true, ignored: true, reason: "image_message" });
  }
  if (wppMensagemEhDocumento(body)) {
    console.log("[WPPCONNECT] Webhook ignorado documento");
    return res.json({ ok: true, ignored: true, reason: "document_message" });
  }
  const ehAudio = wppMensagemEhAudio(body);
  const texto = extrairTextoWpp(body);
  const telefone = extrairTelefoneWpp(body);
  const destinoResposta = extrairDestinoRespostaWpp(body) || (telefone ? `${telefone}@c.us` : "");
  const chaveContato = getContactKey(telefone) || getContactKey(destinoResposta);
  const telefoneRegistro =
    normalizeCustomerPhone(telefone) ||
    (String(destinoResposta || "").toLowerCase().endsWith("@c.us") ? getContactKey(destinoResposta) : "") ||
    "";
  const chaveAlternativa = getContactKey(telefoneRegistro);
  const enviarRespostaWppComFallback = async (textoMensagem) => {
    let resultadoEnvio = await wppSendText(destinoResposta, textoMensagem);
    if (
      !resultadoEnvio.ok &&
      String(destinoResposta || "").toLowerCase().endsWith("@lid") &&
      telefoneRegistro &&
      wppErroWidInvalido(resultadoEnvio)
    ) {
      const fallbackNumero = normalizePhoneNumber(telefoneRegistro);
      if (fallbackNumero) {
        const retry = await wppSendText(fallbackNumero, textoMensagem);
        if (retry.ok) {
          console.log(
            `[WPPCONNECT] Resposta enviada via fallback c.us: ${destinoResposta} -> ${fallbackNumero}@c.us`
          );
          return retry;
        }
        resultadoEnvio = retry;
      }
    }
    return resultadoEnvio;
  };
  const criarDedupeResposta = (tipoResposta, textoMensagem) => {
    const tipoNorm = String(tipoResposta || "auto").trim().toLowerCase() || "auto";
    const eventoId = extrairIdMensagemWpp(body);
    if (tipoNorm === "pix" || tipoNorm === "tempo") {
      return criarDedupeKeyOutbox("bot", [
        tipoNorm,
        chaveContato,
        eventoId || extrairTimestampWpp(body) || Date.now(),
        textoMensagem,
      ]);
    }
    const cooldownMs =
      tipoNorm === "saudacao" ? BOT_SAUDACAO_COOLDOWN_MS : BOT_AUTO_REPLY_COOLDOWN_MS;
    const janela = Math.floor(Date.now() / Math.max(cooldownMs, 60 * 1000));
    return criarDedupeKeyOutbox("bot", [tipoNorm, chaveContato, janela, textoMensagem]);
  };
  const nome = extrairNomeWpp(body);
  if (!chaveContato) {
    console.warn("[WPPCONNECT] Webhook ignorado sem contato:", {
      texto: texto || "",
      destinoResposta,
      telefone,
      event: eventNorm || eventType || "",
    });
    return res.json({ ok: true, ignored: true, reason: "missing_contact" });
  }
  if (!texto && !ehAudio) {
    console.log("[WPPCONNECT] Webhook ignorado sem texto/audio:", {
      contato: chaveContato,
      destinoResposta,
      event: eventNorm || eventType || "",
    });
    return res.json({ ok: true, ignored: true, reason: "empty_message" });
  }
  const duplicadoPrimario = deveIgnorarMensagemDuplicada({ telefone: chaveContato, texto, ehAudio });
  const duplicadoAlternativo =
    chaveAlternativa && chaveAlternativa !== chaveContato
      ? deveIgnorarMensagemDuplicada({ telefone: chaveAlternativa, texto, ehAudio })
      : false;
  if (duplicadoPrimario || duplicadoAlternativo) {
    console.log("[WPPCONNECT] Webhook ignorado duplicado:", {
      contato: chaveContato,
      alternativo: chaveAlternativa || "",
      texto: texto || (ehAudio ? "[audio]" : ""),
    });
    return res.json({ ok: true, ignored: true, reason: "duplicate_message" });
  }
  registrarMensagemIaLocal({
    source: "wppconnect",
    sourceId: extrairIdMensagemWpp(body),
    telefone: telefoneRegistro || chaveContato,
    nome,
    texto: texto || (ehAudio ? "[audio]" : ""),
    receivedAt: new Date().toISOString(),
  });
  if (!botAutoReplyAtivo()) {
    console.log("[WPPCONNECT] Webhook registrado para IA local com bot desativado");
    return res.json({ ok: true, ignored: true, reason: "bot_disabled" });
  }
  const contatoAnterior = obterContatoBot(chaveContato) || (
    chaveAlternativa && chaveAlternativa !== chaveContato
      ? obterContatoBot(chaveAlternativa)
      : null
  );
  registrarContatoBot(chaveContato, texto || (ehAudio ? "[audio]" : "[sem_texto]"));
  if (chaveAlternativa && chaveAlternativa !== chaveContato) {
    registrarContatoBot(chaveAlternativa, texto || (ehAudio ? "[audio]" : "[sem_texto]"));
  }
  if (
    botBloqueado(chaveContato) ||
    (chaveAlternativa && chaveAlternativa !== chaveContato && botBloqueado(chaveAlternativa))
  ) {
    console.log("[WPPCONNECT] Webhook ignorado por bloqueio:", {
      contato: chaveContato,
      alternativo: chaveAlternativa || "",
    });
    return res.json({ ok: true, ignored: true, reason: "blocked_contact" });
  }

  const deveEnviarInicial = deveEnviarSaudacaoInicial({
    telefone: chaveContato,
    texto,
    ehAudio,
    contatoAnterior,
  });

  const respostaPersonalizadaInfo = texto ? construirRespostaPorPalavraChave(texto) : { mensagem: "", tipo: "" };
  const respostaPersonalizada = respostaPersonalizadaInfo.mensagem;
  const respostaTempo = texto ? construirRespostaRapida(texto) : "";
  const respostaStatus = texto ? construirRespostaStatusPedido(telefoneRegistro, texto) : "";
  const tipoPersonalizado = String(respostaPersonalizadaInfo.tipo || "").trim().toLowerCase();
  const respostaPermitidaForaHorario =
    tipoPersonalizado === "pix" || tipoPersonalizado === "tempo" || Boolean(respostaTempo);

  if (!isAbertoAgora() && !respostaPermitidaForaHorario) {
    const mensagemFechado = construirMensagemLojaFechada(getPublicUrl());
    if (
      deveBloquearRespostaAutomatica({
        telefone: chaveContato,
        texto: texto || (ehAudio ? "[audio]" : ""),
        mensagem: mensagemFechado,
        tipo: "fechado",
        registrar: false,
      })
    ) {
      console.log("[WPPCONNECT] Mensagem de fechado bloqueada por cooldown:", {
        contato: chaveContato,
        texto: texto || (ehAudio ? "[audio]" : ""),
      });
      return res.json({ ok: true, closed: true, throttled: true });
    }
    const resultadoFechado = await enviarRespostaWppComFallback(mensagemFechado);
    if (!resultadoFechado.ok) {
      console.warn("[WPPCONNECT] Falha ao enviar mensagem de fechado:", resultadoFechado);
      const dedupeKey = criarDedupeResposta("fechado", mensagemFechado);
      const outboxId = enfileirarMensagemWhatsapp({
        dedupeKey,
        canal: "wppconnect",
        telefone: destinoResposta,
        fallbackTelefone: telefoneRegistro,
        mensagem: mensagemFechado,
        tipo: "fechado",
        cooldownTelefone: chaveContato,
        cooldownTipo: "fechado",
        erro: resultadoFechado,
      });
      return res.json({ ok: true, closed: true, queued: Boolean(outboxId), outboxId });
    } else {
      registrarMensagemWhatsappEnviada({
        dedupeKey: criarDedupeResposta("fechado", mensagemFechado),
        canal: "wppconnect",
        telefone: destinoResposta,
        fallbackTelefone: telefoneRegistro,
        mensagem: mensagemFechado,
        tipo: "fechado",
        cooldownTelefone: chaveContato,
        cooldownTipo: "fechado",
      });
      registrarCooldownRespostaAutomatica({
        telefone: chaveContato,
        texto: texto || (ehAudio ? "[audio]" : ""),
        mensagem: mensagemFechado,
        tipo: "fechado",
      });
      console.log("[WPPCONNECT] Mensagem de fechado enviada:", {
        contato: chaveContato,
        destinoResposta,
      });
    }
    return res.json({ ok: true, closed: true });
  }

  if (!respostaPersonalizada && !respostaTempo && !respostaStatus && !deveEnviarInicial) {
    if (texto) {
      registrarConversaPendente({ canal: "wppconnect", telefone: telefoneRegistro, nome, texto });
      await alertarAtendenteConversaSemResposta({
        canal: "wppconnect",
        telefone: telefoneRegistro,
        nome,
        texto,
      });
    }
    console.log("[WPPCONNECT] Webhook sem resposta automatica correspondente:", {
      contato: chaveContato,
      texto,
      telefoneRegistro,
    });
    return res.json({ ok: true, ignored: true, reason: "no_auto_reply" });
  }

  const mensagem =
    respostaPersonalizada ||
    respostaTempo ||
    respostaStatus ||
    construirMensagemCardapio(getPublicUrl());
  const tipoResposta =
    respostaPersonalizada
      ? respostaPersonalizadaInfo.tipo || "auto"
      : deveEnviarInicial
        ? "saudacao"
        : "auto";
  if (
    tipoResposta !== "pix" &&
    tipoResposta !== "tempo" &&
    deveBloquearRespostaAutomatica({
      telefone: chaveContato,
      texto: texto || (ehAudio ? "[audio]" : ""),
      mensagem,
      deveEnviarInicial,
      tipo: tipoResposta,
      registrar: false,
    })
  ) {
    console.log("[WPPCONNECT] Resposta automatica bloqueada por cooldown:", {
      contato: chaveContato,
      tipo: tipoResposta,
      texto: texto || (ehAudio ? "[audio]" : ""),
    });
    return res.json({ ok: true, throttled: true });
  }
  const resultado = await enviarRespostaWppComFallback(mensagem);
  if (!resultado.ok) {
    console.warn("[WPPCONNECT] Falha ao responder webhook:", resultado);
    const dedupeKey = criarDedupeResposta(tipoResposta, mensagem);
    const outboxId = enfileirarMensagemWhatsapp({
      dedupeKey,
      canal: "wppconnect",
      telefone: destinoResposta,
      fallbackTelefone: telefoneRegistro,
      mensagem,
      tipo: tipoResposta,
      cooldownTelefone: chaveContato,
      cooldownTipo: tipoResposta,
      erro: resultado,
    });
    return res.json({ ok: true, queued: Boolean(outboxId), outboxId });
  } else {
    registrarMensagemWhatsappEnviada({
      dedupeKey: criarDedupeResposta(tipoResposta, mensagem),
      canal: "wppconnect",
      telefone: destinoResposta,
      fallbackTelefone: telefoneRegistro,
      mensagem,
      tipo: tipoResposta,
      cooldownTelefone: chaveContato,
      cooldownTipo: tipoResposta,
    });
    registrarCooldownRespostaAutomatica({
      telefone: chaveContato,
      texto: texto || (ehAudio ? "[audio]" : ""),
      mensagem,
      deveEnviarInicial,
      tipo: tipoResposta,
    });
    console.log("[WPPCONNECT] Resposta automatica enviada:", {
      contato: chaveContato,
      destinoResposta,
      telefoneRegistro,
      tipo: tipoResposta,
      texto: texto || (ehAudio ? "[audio]" : ""),
    });
  }
  res.json({ ok: true });
});

// ===================== ROTAS DO PAINEL ADMIN =====================
app.get("/adminn/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "adminn", "admin.html"));
});

app.get("/adminn/estoque.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "adminn", "estoque.html"));
});

app.get("/adminn/atendimento.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "adminn", "atendimento.html"));
});

app.get("/adminn/conversas.html", (req, res) => {
  res.redirect("/adminn/painel.html");
});

app.get("/adminn/cardapio", (req, res) => {
  const cardapio = montarCardapioCompletoPublico({ incluirPromoXtudo: true })
    .sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
  res.json(cardapio);
});

app.get("/adminn/cardapio-completo", (req, res) => {
  res.json(montarCardapioCompletoPublico({ incluirPromoXtudo: true }));
});

app.post("/adminn/cardapio/adicionar", (req, res) => {
  const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) as max FROM cardapio").get().max;
  const orderIndex = max + 1;
  db.prepare(`
    INSERT INTO cardapio (nome, preco, categoria, ingredientes, img, disponivel, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.body.nome || "",
    Number(req.body.preco) || 0,
    req.body.categoria || "",
    normalizarIngredientes(req.body.ingredientes),
    req.body.img || "",
    req.body.disponivel === false ? 0 : 1,
    orderIndex,
    new Date().toISOString()
  );
  syncBebidasFromCardapio();
  normalizarAutoBaixa();
  sincronizarPureBatataAtivo();
  res.json({ success: true });
});

app.put("/adminn/cardapio/editar/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const item = db.prepare("SELECT id FROM cardapio WHERE order_index = ?").get(index);
  if (!item) return res.status(404).json({ success: false });
  const antigo = db.prepare("SELECT nome, categoria, img FROM cardapio WHERE id = ?").get(item.id);
  const imagemAtualizada = String(req.body.img || "").trim() || String(antigo?.img || "").trim();
  db.prepare(`
    UPDATE cardapio
    SET nome = ?, preco = ?, categoria = ?, ingredientes = ?, img = ?, disponivel = ?
    WHERE id = ?
  `).run(
    req.body.nome || "",
    Number(req.body.preco) || 0,
    req.body.categoria || "",
    normalizarIngredientes(req.body.ingredientes),
    imagemAtualizada,
    req.body.disponivel === false ? 0 : 1,
    item.id
  );
  if (antigo && categoriaEhBebida(req.body.categoria)) {
    const antigoNome = String(antigo.nome || "").trim();
    const novoNome = String(req.body.nome || "").trim();
    if (antigoNome && novoNome && antigoNome.toLowerCase() !== novoNome.toLowerCase()) {
      const existente = db.prepare("SELECT id FROM estoque_itens WHERE lower(nome) = lower(?)").get(novoNome);
      if (!existente) {
        db.prepare(`
          UPDATE estoque_itens
          SET nome = ?, updated_at = ?
          WHERE lower(nome) = lower(?) AND categoria = 'bebida'
        `).run(novoNome, new Date().toISOString(), antigoNome);
      }
    }
  }
  syncBebidasFromCardapio();
  normalizarAutoBaixa();
  sincronizarPureBatataAtivo();
  res.json({ success: true });
});

app.delete("/adminn/cardapio/remover/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const item = db.prepare("SELECT id FROM cardapio WHERE order_index = ?").get(index);
  if (!item) return res.status(404).json({ success: false });
  db.prepare("DELETE FROM cardapio WHERE id = ?").run(item.id);
  db.prepare("UPDATE cardapio SET order_index = order_index - 1 WHERE order_index > ?").run(index);
  res.json({ success: true });
});

app.post("/adminn/cardapio/atualizar", (req, res) => {
  const { index, disponivel } = req.body;
  const item = db.prepare("SELECT id, nome, ingredientes FROM cardapio WHERE order_index = ?").get(index);
  if (!item) return res.json({ success: false });
  const ativo = getConfigBoolean("pure_batata_desativado", false);
  const ingredientes = parseMaybeJson(item.ingredientes);
  const ehPureBatata = textoCardapioTemPureBatata(item.nome, ingredientes);
  const novoDisponivel = ativo && ehPureBatata ? 0 : (disponivel ? 1 : 0);
  db.prepare("UPDATE cardapio SET disponivel = ? WHERE id = ?").run(novoDisponivel, item.id);
  res.json({ success: true });
});

app.get("/adminn/cardapio/pure-batata", (req, res) => {
  res.json({ success: true, ...getEstadoPureBatata() });
});

app.post("/adminn/cardapio/pure-batata/toggle", (req, res) => {
  const estadoAtual = getConfigBoolean("pure_batata_desativado", false);
  const resultado = estadoAtual ? reativarPureBatata() : desativarPureBatata();
  const estado = getEstadoPureBatata();
  res.json({ success: true, ...resultado, ...estado });
});

app.post("/adminn/cardapio/ordenar", (req, res) => {
  const itens = Array.isArray(req.body?.itens)
    ? req.body.itens
    : (Array.isArray(req.body?.ids) ? req.body.ids.map((id) => ({ tipo: "item", id })) : []);
  if (!itens.length) return res.json({ success: false, message: "Sem itens" });
  const stmtItem = db.prepare("UPDATE cardapio SET order_index = ? WHERE id = ?");
  const stmtCombo = db.prepare("UPDATE combos SET order_index = ?, updated_at = ? WHERE id = ?");
  const tx = db.transaction((lista) => {
    lista.forEach((entrada, idx) => {
      const tipo = String(entrada?.tipo || "item");
      const idTexto = String(entrada?.id || "");
      const id = Number(tipo === "combo" ? idTexto.replace(/^combo-/, "") : idTexto);
      if (tipo === "combo" && Number.isInteger(id)) {
        stmtCombo.run(idx, new Date().toISOString(), id);
      } else if (tipo === "item" && Number.isInteger(id)) {
        stmtItem.run(idx, id);
      } else if (tipo === "promocao" && String(entrada?.id || "").startsWith("promo-xtudo-")) {
        setConfigValue("promo_xtudo_order_index", String(idx));
      }
    });
  });
  tx(itens);
  res.json({ success: true });
});

// ===================== CONFIGURACOES =====================
app.get("/adminn/config", (req, res) => {
  res.json({
    tempo_entrega_min: toNumber(getConfigValue("tempo_entrega_min", "45"), 45),
    tempo_retirada_min: toNumber(getConfigValue("tempo_retirada_min", "20"), 20),
    whatsapp: getConfigValue("whatsapp", "5535997376001"),
    msg_pix: getConfigValue("msg_pix", "Envie o comprovante do Pix no WhatsApp."),
    public_url: normalizePublicUrl(getConfigValue("public_url", "")),
    promo_xtudo_preco_unidade: toNumber(getConfigValue("promo_xtudo_preco_unidade", "22"), 22),
    promo_xtudo_preco_combo: toNumber(getConfigValue("promo_xtudo_preco_combo", "20"), 20),
    promo_xtudo_min_qtd: toNumber(getConfigValue("promo_xtudo_min_qtd", "2"), 2),
    promo_tag_text: getConfigValue("promo_tag_text", "Promocao"),
    promo_destaque_text: getConfigValue("promo_destaque_text", "X-Tudo R$ {preco_unidade} cada"),
    promo_sub_text: getConfigValue("promo_sub_text", "{min_qtd}+ por R$ {preco_combo}"),
    logo_url: getConfigValue("logo_url", ""),
    funcionamento_dias: parseMaybeJson(getConfigValue("funcionamento_dias", "[]")) || [],
    funcionamento_abre: getConfigValue("funcionamento_abre", ""),
    funcionamento_fecha: getConfigValue("funcionamento_fecha", ""),
    bot_auto_reply_ativo: getConfigBoolean("bot_auto_reply_ativo", true),
    auto_aceitar_pedidos: getConfigBoolean("auto_aceitar_pedidos", false),
    auto_imprimir_preparo: getConfigBoolean("auto_imprimir_preparo", true),
    tema_cardapio: normalizarTemaCardapio(getConfigValue("tema_cardapio", "original")),
    tema_admin: normalizarTemaAdmin(getConfigValue("tema_admin", "original")),
    print_agent_token: getConfigValue("print_agent_token", ""),
    print_interface: getConfigValue("print_interface", "printer:POS80 Printer USB"),
    print_windows_mode: getConfigValue("print_windows_mode", "raw"),
    print_raw_scale_x: toNumber(getConfigValue("print_raw_scale_x", "2"), 2),
    print_raw_scale_y: toNumber(getConfigValue("print_raw_scale_y", "2"), 2),
    print_raw_bold: getConfigBoolean("print_raw_bold", true),
    print_max_cols: toNumber(getConfigValue("print_max_cols", "34"), 34)
  });
});

app.post("/adminn/config", (req, res) => {
  const entrega = Math.max(toNumber(req.body.tempo_entrega_min, 45), 0);
  const retirada = Math.max(toNumber(req.body.tempo_retirada_min, 20), 0);
  const whatsapp = String(req.body.whatsapp || "").trim() || "5535997376001";
  const msgPix = String(req.body.msg_pix || "").trim() || "Envie o comprovante do Pix no WhatsApp.";
  const publicUrl = normalizePublicUrl(req.body.public_url || "");
  const promoUnidade = Math.max(toNumber(req.body.promo_xtudo_preco_unidade, 22), 0);
  const promoCombo = Math.max(toNumber(req.body.promo_xtudo_preco_combo, 20), 0);
  const promoMinQtd = Math.max(toNumber(req.body.promo_xtudo_min_qtd, 2), 1);
  const promoTagText = String(req.body.promo_tag_text || "").trim() || "Promocao";
  const promoDestaqueText =
    String(req.body.promo_destaque_text || "").trim() || "X-Tudo R$ {preco_unidade} cada";
  const promoSubText =
    String(req.body.promo_sub_text || "").trim() || "{min_qtd}+ por R$ {preco_combo}";
  const logoUrl = String(req.body.logo_url || "").trim();
  const funcionamentoDias = Array.isArray(req.body.funcionamento_dias)
    ? req.body.funcionamento_dias.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
    : [];
  const funcionamentoAbre = String(req.body.funcionamento_abre || "").trim();
  const funcionamentoFecha = String(req.body.funcionamento_fecha || "").trim();
  const botAutoReplyAtivoReq = parseConfigBoolean(req.body.bot_auto_reply_ativo, true);
  const autoAceitarPedidos = parseConfigBoolean(req.body.auto_aceitar_pedidos, false);
  const autoImprimirPreparo = parseConfigBoolean(req.body.auto_imprimir_preparo, true);
  const temaCardapio = normalizarTemaCardapio(req.body.tema_cardapio || getConfigValue("tema_cardapio", "original"));
  const temaAdmin = normalizarTemaAdmin(req.body.tema_admin || getConfigValue("tema_admin", "original"));
  const printToken = String(req.body.print_agent_token || "").trim();
  const printInterface = String(req.body.print_interface || "printer:POS80 Printer USB").trim();
  const printWindowsMode = String(req.body.print_windows_mode || "raw").trim().toLowerCase();
  const printRawScaleX = Math.min(8, Math.max(1, toNumber(req.body.print_raw_scale_x, 2)));
  const printRawScaleY = Math.min(8, Math.max(1, toNumber(req.body.print_raw_scale_y, 2)));
  const printRawBold = parseConfigBoolean(req.body.print_raw_bold, true);
  const printMaxCols = Math.min(64, Math.max(16, toNumber(req.body.print_max_cols, 34)));

  setConfigValue("tempo_entrega_min", entrega);
  setConfigValue("tempo_retirada_min", retirada);
  setConfigValue("whatsapp", whatsapp);
  setConfigValue("msg_pix", msgPix);
  setConfigValue("public_url", publicUrl);
  setConfigValue("promo_xtudo_preco_unidade", promoUnidade);
  setConfigValue("promo_xtudo_preco_combo", promoCombo);
  setConfigValue("promo_xtudo_min_qtd", promoMinQtd);
  setConfigValue("promo_tag_text", promoTagText);
  setConfigValue("promo_destaque_text", promoDestaqueText);
  setConfigValue("promo_sub_text", promoSubText);
  setConfigValue("logo_url", logoUrl);
  setConfigValue("funcionamento_dias", JSON.stringify(funcionamentoDias));
  setConfigValue("funcionamento_abre", funcionamentoAbre);
  setConfigValue("funcionamento_fecha", funcionamentoFecha);
  setConfigValue("bot_auto_reply_ativo", botAutoReplyAtivoReq ? "1" : "0");
  setConfigValue("auto_aceitar_pedidos", autoAceitarPedidos ? "1" : "0");
  setConfigValue("auto_imprimir_preparo", autoImprimirPreparo ? "1" : "0");
  setConfigValue("tema_cardapio", temaCardapio);
  setConfigValue("tema_admin", temaAdmin);
  setConfigValue("print_agent_token", printToken);
  setConfigValue("print_interface", printInterface);
  setConfigValue("print_windows_mode", printWindowsMode);
  setConfigValue("print_raw_scale_x", printRawScaleX);
  setConfigValue("print_raw_scale_y", printRawScaleY);
  setConfigValue("print_raw_bold", printRawBold ? "1" : "0");
  setConfigValue("print_max_cols", printMaxCols);

  res.json({ success: true });
});

app.get("/adminn/cardapio/tema", (req, res) => {
  res.json({
    success: true,
    tema_cardapio: normalizarTemaCardapio(getConfigValue("tema_cardapio", "original")),
    temas: Array.from(TEMAS_CARDAPIO),
  });
});

app.post("/adminn/cardapio/tema", (req, res) => {
  const tema = String(req.body?.tema_cardapio || req.body?.tema || "").trim().toLowerCase();
  if (!TEMAS_CARDAPIO.has(tema)) {
    return res.status(400).json({
      success: false,
      error: "tema_invalido",
      temas: Array.from(TEMAS_CARDAPIO),
    });
  }
  setConfigValue("tema_cardapio", tema);
  return res.json({ success: true, tema_cardapio: tema });
});

app.get("/adminn/aparencia", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json({
    success: true,
    tema_admin: normalizarTemaAdmin(getConfigValue("tema_admin", "original")),
    temas: Array.from(TEMAS_CARDAPIO),
  });
});

app.post("/adminn/aparencia", (req, res) => {
  const tema = String(req.body?.tema_admin || req.body?.tema || "").trim().toLowerCase();
  if (!TEMAS_CARDAPIO.has(tema)) {
    return res.status(400).json({ success: false, error: "tema_admin_invalido", temas: Array.from(TEMAS_CARDAPIO) });
  }
  setConfigValue("tema_admin", tema);
  registrarAuditoriaAdmin(req, {
    acao: "tema_admin_alterado",
    entidade: "configuracoes",
    entidadeId: "tema_admin",
    detalhe: { tema },
  });
  return res.json({ success: true, tema_admin: tema });
});

app.get("/adminn/atendente-expo/status", async (req, res) => {
  try {
    let tunnels = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const tunnelRes = await fetch("http://127.0.0.1:4040/api/tunnels", { signal: controller.signal });
      tunnels = tunnelRes.ok ? await tunnelRes.json() : null;
    } catch {
      tunnels = null;
    } finally {
      clearTimeout(timeout);
    }

    const lista = Array.isArray(tunnels?.tunnels) ? tunnels.tunnels : [];
    const httpsTunnel = lista.find((item) => String(item?.public_url || "").startsWith("https://"));
    let publicUrl = String(httpsTunnel?.public_url || "").trim();
    let expoUrl = publicUrl
      ? publicUrl.replace(/^https?:\/\//i, "exp://")
      : "";

    let metroOk = false;
    try {
      const statusController = new AbortController();
      const statusTimeout = setTimeout(() => statusController.abort(), 1500);
      try {
        const statusRes = await fetch("http://127.0.0.1:8081/status", { signal: statusController.signal });
        const text = await statusRes.text().catch(() => "");
        metroOk = statusRes.ok && text.includes("packager-status:running");
      } finally {
        clearTimeout(statusTimeout);
      }
    } catch {
      metroOk = false;
    }

    // Prefer the live Metro manifest so a dead URL left in ngrok's inspector is never reused.
    if (metroOk) {
      const manifestController = new AbortController();
      const manifestTimeout = setTimeout(() => manifestController.abort(), 2500);
      try {
        const manifestRes = await fetch("http://127.0.0.1:8081/", {
          headers: {
            Accept: "application/expo+json,application/json",
            "Expo-Platform": "android",
            "Expo-Protocol-Version": "1",
          },
          signal: manifestController.signal,
        });
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          const host = String(
            manifest?.extra?.expoGo?.debuggerHost ||
              manifest?.expoGo?.debuggerHost ||
              manifest?.hostUri ||
              ""
          )
            .trim()
            .replace(/^https?:\/\//i, "");
          if (host) {
            const scheme = /\.(?:expo\.app|exp\.direct)(?::\d+)?$/i.test(host) ? "https" : "http";
            publicUrl = `${scheme}://${host}`;
            expoUrl = `exp://${host}`;
          }
        }
      } catch {
        // Keep the ngrok URL as a fallback for Expo CLI versions without manifest host data.
      } finally {
        clearTimeout(manifestTimeout);
      }
    }

    return res.json({
      success: true,
      running: Boolean(publicUrl && metroOk),
      publicUrl,
      expoUrl,
      qrData: expoUrl || publicUrl,
      metroOk,
    });
  } catch (err) {
    return res.json({
      success: false,
      running: false,
      error: String(err?.message || "expo_indisponivel"),
    });
  }
});

// ===================== CATEGORIAS (ADMIN) =====================
app.get("/adminn/categorias", (req, res) => {
  const rows = db
    .prepare("SELECT id, slug, nome, ativo, order_index FROM categorias ORDER BY order_index ASC")
    .all();
  res.json(rows);
});

// ===================== BOT BLOQUEIOS =====================
app.get("/adminn/bot-bloqueios", (req, res) => {
  const rows = db
    .prepare("SELECT id, telefone, ativo, expires_at FROM bot_bloqueios ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

app.post("/adminn/bot-bloqueios/adicionar", (req, res) => {
  const telefone = normalizePhoneNumber(req.body?.telefone || "");
  const minutos = Math.max(parseInt(req.body?.minutos, 10) || 5, 1);
  if (!telefone) return res.status(400).json({ success: false });
  const expiresAt = new Date(Date.now() + minutos * 60 * 1000).toISOString();
  const variants = getPhoneVariants(telefone);
  const placeholders = variants.map(() => "?").join(",");
  const existe = db
    .prepare(
      `SELECT id
       FROM bot_bloqueios
       WHERE telefone IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(...variants);
  if (existe) {
    db.prepare("UPDATE bot_bloqueios SET ativo = 1, expires_at = ? WHERE id = ?").run(
      expiresAt,
      existe.id
    );
    return res.json({ success: true });
  }
  db.prepare(`
    INSERT INTO bot_bloqueios (telefone, ativo, expires_at, created_at)
    VALUES (?, 1, ?, ?)
  `).run(telefone, expiresAt, new Date().toISOString());
  res.json({ success: true });
});

app.delete("/adminn/bot-bloqueios/remover/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false });
  db.prepare("DELETE FROM bot_bloqueios WHERE id = ?").run(id);
  res.json({ success: true });
});

app.get("/adminn/bot-contatos", (req, res) => {
  const rows = db
    .prepare(`
      SELECT telefone, ultimo_texto, last_msg_at
      FROM bot_contatos
      ORDER BY last_msg_at DESC
      LIMIT 30
    `)
    .all();
  res.json(rows);
});

app.get("/adminn/bot-conversas-pendentes", (req, res) => {
  const status = String(req.query?.status || "todos").trim().toLowerCase();
  const busca = normalizarTextoBusca(String(req.query?.q || "").trim());
  const queryStatus = status === "todos" ? null : status;
  const validos = new Set(["novo", "em_atendimento", "resolvido"]);
  if (queryStatus && !validos.has(queryStatus)) {
    return res.status(400).json({ ok: false, error: "status_invalido" });
  }

  const rows = queryStatus
    ? db.prepare(
        `SELECT id, canal, telefone, nome, mensagem, status, mensagens_count, created_at, updated_at, resolved_at
         FROM bot_conversas_pendentes
         WHERE status = ?
         ORDER BY
           CASE status
             WHEN 'novo' THEN 1
             WHEN 'em_atendimento' THEN 2
             WHEN 'resolvido' THEN 3
             ELSE 4
           END,
           updated_at DESC
         LIMIT 500`
      ).all(queryStatus)
    : db.prepare(
        `SELECT id, canal, telefone, nome, mensagem, status, mensagens_count, created_at, updated_at, resolved_at
         FROM bot_conversas_pendentes
         ORDER BY
           CASE status
             WHEN 'novo' THEN 1
             WHEN 'em_atendimento' THEN 2
             WHEN 'resolvido' THEN 3
             ELSE 4
           END,
           updated_at DESC
         LIMIT 500`
      ).all();

  const filtradas = busca
    ? rows.filter((item) => {
        const base = normalizarTextoBusca(
          `${item.nome || ""} ${item.telefone || ""} ${item.mensagem || ""} ${item.canal || ""}`
        );
        return base.includes(busca);
      })
    : rows;

  const resumo = {
    novo: filtradas.filter((x) => x.status === "novo").length,
    em_atendimento: filtradas.filter((x) => x.status === "em_atendimento").length,
    resolvido: filtradas.filter((x) => x.status === "resolvido").length,
  };

  res.json({ ok: true, items: filtradas, resumo });
});

app.put("/adminn/bot-conversas-pendentes/:id/status", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, error: "id_invalido" });
  const status = String(req.body?.status || "").trim().toLowerCase();
  const validos = new Set(["novo", "em_atendimento", "resolvido"]);
  if (!validos.has(status)) return res.status(400).json({ ok: false, error: "status_invalido" });

  const now = new Date().toISOString();
  const resolvedAt = status === "resolvido" ? now : null;
  const info = db
    .prepare(
      `UPDATE bot_conversas_pendentes
       SET status = ?, updated_at = ?, resolved_at = ?
       WHERE id = ?`
    )
    .run(status, now, resolvedAt, id);

  if (!info.changes) return res.status(404).json({ ok: false, error: "nao_encontrado" });
  const item = db
    .prepare(
      `SELECT id, canal, telefone, nome, mensagem, status, mensagens_count, created_at, updated_at, resolved_at
       FROM bot_conversas_pendentes WHERE id = ?`
    )
    .get(id);
  res.json({ ok: true, item });
});

app.get("/adminn/bot-mensagens", (req, res) => {
  const itens = db
    .prepare(`
      SELECT id, palavras_chave, mensagem, ativo, ordem, created_at, updated_at
      FROM bot_mensagens
      ORDER BY ordem ASC, id ASC
    `)
    .all()
    .map((row) => ({
      ...row,
      ativo: row.ativo === 1,
    }));

  res.json({
    itens,
    sugestoes: BOT_MENSAGENS_SUGERIDAS,
    placeholders: BOT_MENSAGEM_PLACEHOLDERS,
  });
});

app.post("/adminn/bot-mensagens", (req, res) => {
  const palavrasChave = String(req.body?.palavras_chave || "").trim();
  const mensagem = String(req.body?.mensagem || "").trim();
  const ativo = req.body?.ativo === false ? 0 : 1;
  if (!palavrasChave || !mensagem) {
    return res.status(400).json({ success: false, error: "dados_invalidos" });
  }

  const now = new Date().toISOString();
  const ordemAtual = db.prepare("SELECT COALESCE(MAX(ordem), -1) AS maxOrdem FROM bot_mensagens").get();
  const ordem = Number(ordemAtual?.maxOrdem || 0) + 1;
  const info = db.prepare(`
    INSERT INTO bot_mensagens (palavras_chave, mensagem, ativo, ordem, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(palavrasChave, mensagem, ativo, ordem, now, now);

  const item = db.prepare(`
    SELECT id, palavras_chave, mensagem, ativo, ordem, created_at, updated_at
    FROM bot_mensagens
    WHERE id = ?
  `).get(info.lastInsertRowid);

  res.json({
    success: true,
    item: { ...item, ativo: item.ativo === 1 },
  });
});

app.put("/adminn/bot-mensagens/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });

  const atual = db
    .prepare("SELECT id, palavras_chave, mensagem, ativo FROM bot_mensagens WHERE id = ?")
    .get(id);
  if (!atual) return res.status(404).json({ success: false, error: "nao_encontrado" });

  const palavrasChave = String(req.body?.palavras_chave ?? atual.palavras_chave).trim();
  const mensagem = String(req.body?.mensagem ?? atual.mensagem).trim();
  const ativo = req.body?.ativo === undefined ? atual.ativo : (req.body.ativo ? 1 : 0);
  if (!palavrasChave || !mensagem) {
    return res.status(400).json({ success: false, error: "dados_invalidos" });
  }

  db.prepare(`
    UPDATE bot_mensagens
    SET palavras_chave = ?, mensagem = ?, ativo = ?, updated_at = ?
    WHERE id = ?
  `).run(palavrasChave, mensagem, ativo, new Date().toISOString(), id);

  const item = db.prepare(`
    SELECT id, palavras_chave, mensagem, ativo, ordem, created_at, updated_at
    FROM bot_mensagens
    WHERE id = ?
  `).get(id);

  res.json({
    success: true,
    item: { ...item, ativo: item.ativo === 1 },
  });
});

app.delete("/adminn/bot-mensagens/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });

  const info = db.prepare("DELETE FROM bot_mensagens WHERE id = ?").run(id);
  if (!info.changes) return res.status(404).json({ success: false, error: "nao_encontrado" });
  res.json({ success: true });
});

app.post("/adminn/categorias/adicionar", (req, res) => {
  const nome = String(req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ success: false, error: "nome_obrigatorio" });
  const slug = normalizarSlugCategoria(nome);
  if (!slug) return res.status(400).json({ success: false, error: "slug_invalido" });
  const existe = db.prepare("SELECT 1 FROM categorias WHERE slug = ?").get(slug);
  if (existe) return res.status(409).json({ success: false, error: "ja_existe" });
  const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) as max FROM categorias").get().max;
  db.prepare(`
    INSERT INTO categorias (slug, nome, ativo, order_index, created_at)
    VALUES (?, ?, 1, ?, ?)
  `).run(slug, nome, max + 1, new Date().toISOString());
  res.json({ success: true, slug });
});

app.post("/adminn/categorias/ordenar", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ success: false });
  const update = db.prepare("UPDATE categorias SET order_index = ? WHERE id = ?");
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    ids.forEach((id, idx) => {
      update.run(idx, id);
    });
  });
  tx();
  db.prepare("UPDATE categorias SET created_at = created_at").run();
  res.json({ success: true, updated_at: now });
});

app.put("/adminn/categorias/editar/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const nome = String(req.body.nome || "").trim();
  const ativo = req.body.ativo === false ? 0 : 1;
  if (!id || !nome) return res.status(400).json({ success: false });
  const slug = normalizarSlugCategoria(nome);
  const existe = db.prepare("SELECT id FROM categorias WHERE slug = ?").get(slug);
  if (existe && existe.id !== id) return res.status(409).json({ success: false, error: "ja_existe" });
  db.prepare("UPDATE categorias SET nome = ?, slug = ?, ativo = ? WHERE id = ?").run(nome, slug, ativo, id);
  res.json({ success: true, slug });
});

app.delete("/adminn/categorias/remover/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false });
  db.prepare("DELETE FROM categorias WHERE id = ?").run(id);
  res.json({ success: true });
});

// ===================== WPPCONNECT (ADMIN) =====================
app.get("/adminn/wppconnect/status", async (req, res) => {
  if (!WPP_SESSION) return res.status(400).json({ ok: false, error: "not_configured" });
  const result = await consultarStatusWppMonitor();
  if (!result.ok) return res.status(502).json(result);
  const statusNorm = normalizarStatusWpp(result.status);
  const payload = {
    ok: true,
    data: {
      status: statusNorm,
      connected: isWppStatusConnected(statusNorm),
      source: result.source || "monitor",
    },
  };
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.json(payload);
});

app.get("/adminn/whatsapp/outbox", (req, res) => {
  const statusPermitidos = new Set(["pendente", "processando", "enviado", "falhou", "expirado"]);
  const status = String(req.query?.status || "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query?.limit || 100), 1), 300);
  const filtro = statusPermitidos.has(status) ? "WHERE status = ?" : "";
  const params = statusPermitidos.has(status) ? [status, limit] : [limit];
  const items = db.prepare(`
    SELECT id, dedupe_key, canal, telefone, tipo, pedido_id, etapa, status,
           attempts, next_attempt_at, expires_at, last_error, created_at,
           updated_at, sent_at, substr(mensagem, 1, 240) AS mensagem
    FROM whatsapp_outbox
    ${filtro}
    ORDER BY id DESC
    LIMIT ?
  `).all(...params);
  const counts = db.prepare(`
    SELECT status, COUNT(*) AS total
    FROM whatsapp_outbox
    GROUP BY status
  `).all();
  res.json({ success: true, items, counts });
});

app.post("/adminn/whatsapp/outbox/:id/retry", (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ success: false, error: "invalid_id" });
  const item = db.prepare("SELECT id, tipo FROM whatsapp_outbox WHERE id = ?").get(id);
  if (!item) return res.status(404).json({ success: false, error: "not_found" });
  const now = new Date();
  const ttlMs = item.tipo === "pedido" ? WHATSAPP_OUTBOX_PEDIDO_TTL_MS : WHATSAPP_OUTBOX_BOT_TTL_MS;
  db.prepare(`
    UPDATE whatsapp_outbox
    SET status = 'pendente', attempts = 0, next_attempt_at = ?, expires_at = ?,
        last_error = NULL, updated_at = ?
    WHERE id = ?
  `).run(
    now.toISOString(),
    new Date(now.getTime() + ttlMs).toISOString(),
    now.toISOString(),
    id
  );
  registrarAuditoriaAdmin(req, {
    acao: "whatsapp_retry",
    entidade: "whatsapp_outbox",
    entidadeId: id,
    detalhe: { tipo: item.tipo },
  });
  processarWhatsappOutbox().catch((err) =>
    console.warn("[WHATSAPP-OUTBOX] erro no reenvio manual:", err?.message || err)
  );
  res.json({ success: true });
});

app.post("/adminn/wppconnect/start", async (req, res) => {
  const session = encodeURIComponent(WPP_SESSION || "");
  if (!session) return res.status(400).json({ ok: false, error: "not_configured" });
  const publicUrl = getPublicUrl();
  const webhookToken = WPP_WEBHOOK_TOKEN
    ? `?token=${encodeURIComponent(WPP_WEBHOOK_TOKEN)}`
    : "";
  const payload = {
    waitQrCode: false,
    autoClose: 0,
  };
  if (publicUrl) {
    payload.webhook = `${publicUrl}/webhook/wppconnect${webhookToken}`;
  }
  let result = await wppRequestJson(`/api/${session}/start-session`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const statusTxt = normalizarTextoBusca(
    result?.data?.status || result?.data?.data?.status || result?.data?.message || ""
  );
  const sessionTxt = String(result?.data?.session || result?.data?.data?.session || "").trim();
  const precisaTentarDeNovo = result.ok && (statusTxt === "closed" || sessionTxt === "");
  if (precisaTentarDeNovo) {
    const retryPayload = { ...payload, waitQrCode: true };
    const retry = await wppRequestJson(`/api/${session}/start-session`, {
      method: "POST",
      body: JSON.stringify(retryPayload),
    });
    if (retry.ok) {
      result = retry;
    }
  }
  if (!result.ok) return res.status(502).json(result);
  res.json(result);
});

app.get("/adminn/wppconnect/qrcode", async (req, res) => {
  const session = encodeURIComponent(WPP_SESSION || "");
  if (!session) return res.status(400).json({ ok: false, error: "not_configured" });
  const publicUrl = getPublicUrl();
  const webhookToken = WPP_WEBHOOK_TOKEN
    ? `?token=${encodeURIComponent(WPP_WEBHOOK_TOKEN)}`
    : "";
  const startPayload = { waitQrCode: false, autoClose: 0 };
  if (publicUrl) {
    startPayload.webhook = `${publicUrl}/webhook/wppconnect${webhookToken}`;
  }

  const statusAtual = await consultarStatusWppMonitor();
  if (statusAtual.ok && isWppStatusConnected(statusAtual.status)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    return res.json({ ok: true, connected: true, pending: false, dataUrl: "" });
  }

  const shouldRetryStart = (result) => {
    const bodyText = String(
      typeof result?.body === "string" ? result.body : JSON.stringify(result?.body || {})
    ).toLowerCase();
    return (
      bodyText.includes("qrcode is not available") ||
      bodyText.includes("session not started") ||
      bodyText.includes("initializing") ||
      bodyText.includes("disconnected") ||
      bodyText.includes('"session":""')
    );
  };

  const readQr = async () => {
    let qr = await wppRequestBuffer(`/api/${session}/qrcode-session`);
    if (!qr.ok && qr.status === 404) {
      qr = await wppRequestBuffer(`/api/${session}/qrcode`);
    }
    return qr;
  };

  let result = await readQr();
  if (!result.ok && shouldRetryStart(result)) {
    await wppRequestJson(`/api/${session}/start-session`, {
      method: "POST",
      body: JSON.stringify(startPayload),
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));
    result = await readQr();
  }

  if (!result.ok && shouldRetryStart(result)) {
    return res.json({ ok: true, pending: true, dataUrl: "" });
  }
  if (!result.ok) {
    console.warn("[WPPCONNECT] Falha ao obter QR Code:", result);
    return res.status(502).json(result);
  }
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  let dataUrl = result.dataUrl || "";
  if (!dataUrl && result.buffer) {
    dataUrl = `data:image/png;base64,${result.buffer.toString("base64")}`;
  }
  if (!dataUrl && result.codeUrl) {
    try {
      dataUrl = await QRCode.toDataURL(result.codeUrl, { margin: 1, width: 320 });
    } catch {
      // fallback handled below with codeUrl
    }
  }
  if (!dataUrl) {
    if (result.codeUrl) {
      return res.json({ ok: true, pending: false, dataUrl: "", codeUrl: result.codeUrl });
    }
    return res.json({ ok: true, pending: true, dataUrl: "" });
  }
  res.json({ ok: true, dataUrl, codeUrl: result.codeUrl || null });
});

app.post("/adminn/wppconnect/logout", async (req, res) => {
  const session = encodeURIComponent(WPP_SESSION || "");
  if (!session) return res.status(400).json({ ok: false, error: "not_configured" });

  let result = await wppRequestJson(`/api/${session}/logout-session`, { method: "POST" });
  if (!result.ok) {
    result = await wppRequestJson(`/api/${session}/close-session`, { method: "POST" });
  }
  if (!result.ok) return res.status(502).json(result);
  res.json({ ok: true, data: result.data || null });
});

app.post("/adminn/upload", upload.single("imagem"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "Arquivo nao enviado" });
  const imageUrl = "/uploads/" + req.file.filename;
  registrarAuditoriaAdmin(req, {
    acao: "upload_arquivo",
    entidade: "uploads",
    entidadeId: req.file.filename,
    detalhe: { original: req.file.originalname, size: req.file.size, mime: req.file.mimetype },
  });
  res.json({ success: true, imageUrl });
});

app.post("/adminn/logo-upload", upload.single("imagem"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "Arquivo nao enviado" });
  const logoUrl = "/uploads/" + req.file.filename;
  setConfigValue("logo_url", logoUrl);
  registrarAuditoriaAdmin(req, {
    acao: "logo_upload",
    entidade: "configuracoes",
    entidadeId: "logo_url",
    detalhe: { arquivo: req.file.filename, original: req.file.originalname, size: req.file.size, mime: req.file.mimetype },
  });
  res.json({ success: true, logoUrl });
});

// ===================== ROTAS DE PEDIDOS =====================
app.use("/pedidos", requireAdmin);

// ===================== IA LOCAL =====================
app.get("/adminn/ia-local/status", requireAdmin, (req, res) => {
  const counts = {
    pedidos: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_orders").get()?.total || 0),
    mensagens: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_messages WHERE processed_at IS NOT NULL").get()?.total || 0),
    clientes: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_customer_profiles").get()?.total || 0),
    termosLigados: Number(db.prepare("SELECT COUNT(DISTINCT term) AS total FROM local_ai_term_products").get()?.total || 0),
    paresProdutos: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_product_pairs").get()?.total || 0),
    previsoes: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_predictions").get()?.total || 0),
  };
  const pending = {
    pedidos: Number(db.prepare(`
      SELECT COUNT(*) AS total FROM pedidos p
      LEFT JOIN local_ai_orders learned ON learned.order_id = p.id
      WHERE learned.order_id IS NULL
        AND lower(COALESCE(p.status, '')) IN ('preparo', 'pronto', 'em_entrega', 'entregue')
        AND (
          lower(COALESCE(p.status, '')) = 'entregue'
          OR datetime(p.created_at) <= datetime('now', '-' || ? || ' minutes')
        )
    `).get(LOCAL_AI_STABLE_ORDER_MINUTES)?.total || 0),
    estabilizando: Number(db.prepare(`
      SELECT COUNT(*) AS total FROM pedidos p
      LEFT JOIN local_ai_orders learned ON learned.order_id = p.id
      WHERE learned.order_id IS NULL
        AND lower(COALESCE(p.status, '')) IN ('preparo', 'pronto', 'em_entrega')
        AND datetime(p.created_at) > datetime('now', '-' || ? || ' minutes')
    `).get(LOCAL_AI_STABLE_ORDER_MINUTES)?.total || 0),
    mensagens: Number(db.prepare("SELECT COUNT(*) AS total FROM local_ai_messages WHERE processed_at IS NULL").get()?.total || 0),
  };
  const topProducts = db.prepare(`
    SELECT product_name AS nome, quantity AS quantidade, orders_count AS pedidos, last_seen_at AS ultimoRegistro
    FROM local_ai_product_stats
    ORDER BY quantity DESC, orders_count DESC, product_name COLLATE NOCASE
    LIMIT 8
  `).all();
  const predictionRow = db.prepare(`
    SELECT COUNT(*) AS avaliadas, COALESCE(SUM(hit), 0) AS acertos,
           SUM(CASE WHEN evaluated_at IS NULL THEN 1 ELSE 0 END) AS pendentes
    FROM local_ai_predictions
  `).get() || {};
  const predictions = {
    avaliadas: Number(predictionRow.avaliadas || 0) - Number(predictionRow.pendentes || 0),
    acertos: Number(predictionRow.acertos || 0),
    pendentes: Number(predictionRow.pendentes || 0),
  };
  predictions.precisao = localAiConfidence(predictions.acertos, predictions.avaliadas);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    success: true,
    enabled: localAiEnabled(),
    running: localAiWorkerState.running,
    counts,
    pending,
    topProducts,
    predictions,
    worker: { ...localAiWorkerState },
    mode: "local",
    model: "mega-local-v3",
    externalApi: false,
    policy: {
      statuses: Array.from(LOCAL_AI_ELIGIBLE_ORDER_STATUSES),
      stableAfterMinutes: LOCAL_AI_STABLE_ORDER_MINUTES,
      cancelledIgnored: true,
    },
  });
});

app.get("/adminn/ia-local/clientes", requireAdmin, (req, res) => {
  const search = String(req.query?.q || "").trim().slice(0, 80);
  const page = Math.max(parseInt(req.query?.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 30, 10), 100);
  const like = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const where = search ? "WHERE nome LIKE ? ESCAPE '\\' OR telefone LIKE ? ESCAPE '\\'" : "";
  const params = search ? [like, like] : [];
  const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM local_ai_customer_profiles ${where}`).get(...params)?.total || 0);
  const rows = db.prepare(`
    SELECT * FROM local_ai_customer_profiles
    ${where}
    ORDER BY orders_count DESC, messages_count DESC, last_seen_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);
  res.json({ success: true, items: rows.map(localAiProfileView), total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

app.get("/adminn/ia-local/aprendizados", requireAdmin, (req, res) => {
  const terms = db.prepare(`
    SELECT learned.term, learned.product_name AS produto, learned.hits,
           totals.total_hits AS totalTermo, learned.last_seen_at AS ultimoRegistro
    FROM local_ai_term_products learned
    JOIN (
      SELECT term, SUM(hits) AS total_hits
      FROM local_ai_term_products
      GROUP BY term
    ) totals ON totals.term = learned.term
    WHERE learned.hits >= 2
    ORDER BY learned.hits DESC, learned.last_seen_at DESC
    LIMIT 120
  `).all().map((row) => ({
    termo: row.term,
    produto: row.produto,
    ocorrencias: Number(row.hits || 0),
    confianca: localAiConfidence(row.hits, row.totalTermo),
    confiavel: Number(row.hits || 0) >= 3 && localAiConfidence(row.hits, row.totalTermo) >= 60,
    ultimoRegistro: row.ultimoRegistro,
  }));
  const pairs = db.prepare(`
    SELECT product_a_name AS produtoA, product_b_name AS produtoB,
           orders_count AS pedidos, last_seen_at AS ultimoRegistro
    FROM local_ai_product_pairs
    WHERE orders_count >= 2
    ORDER BY orders_count DESC, last_seen_at DESC
    LIMIT 80
  `).all();
  res.json({ success: true, terms, pairs });
});

app.get("/adminn/ia-local/eventos", requireAdmin, (req, res) => {
  const orders = db.prepare(`
    SELECT learned.order_id AS id, learned.telefone, learned.processed_at AS processadoEm,
           pedidos.cliente AS nome, pedidos.created_at AS ocorridoEm
    FROM local_ai_orders learned
    LEFT JOIN pedidos ON pedidos.id = learned.order_id
    ORDER BY learned.processed_at DESC
    LIMIT 40
  `).all();
  const messages = db.prepare(`
    SELECT id, telefone, nome, received_at AS ocorridoEm, processed_at AS processadoEm,
           linked_order_id AS pedidoLigado,
           substr(texto, 1, 180) AS resumo
    FROM local_ai_messages
    ORDER BY id DESC
    LIMIT 40
  `).all();
  const predictions = db.prepare(`
    SELECT id, telefone, predicted_products AS produtosPrevistos, matched_products AS produtosAcertados,
           profile AS perfil, created_at AS criadaEm, evaluated_at AS avaliadaEm, hit AS acertou
    FROM local_ai_predictions
    ORDER BY id DESC
    LIMIT 40
  `).all().map((row) => ({
    ...row,
    produtosPrevistos: parseMaybeJson(row.produtosPrevistos) || [],
    produtosAcertados: parseMaybeJson(row.produtosAcertados) || [],
  }));
  res.json({ success: true, orders, messages, predictions });
});

app.post("/adminn/ia-local/config", requireAdmin, (req, res) => {
  if (typeof req.body?.enabled !== "boolean") {
    return res.status(400).json({ success: false, error: "invalid_enabled_state" });
  }
  setConfigValue("local_ai_enabled", req.body.enabled ? "1" : "0");
  registrarAuditoriaAdmin(req, {
    acao: req.body.enabled ? "ia_local_ativada" : "ia_local_pausada",
    entidade: "ia_local",
    entidadeId: "worker",
  });
  return res.json({ success: true, enabled: localAiEnabled() });
});

app.post("/adminn/ia-local/processar", requireAdmin, (req, res) => {
  let orders = 0;
  let messages = 0;
  let result = {};
  for (let index = 0; index < 10; index += 1) {
    result = processarIaLocalBatch({ orderLimit: 200, messageLimit: 300 });
    orders += Number(result.orders || 0);
    messages += Number(result.messages || 0);
    if (result.busy || result.error || (!result.orders && !result.messages)) break;
  }
  registrarAuditoriaAdmin(req, {
    acao: "ia_local_processada",
    entidade: "ia_local",
    entidadeId: "worker",
    detalhe: { orders, messages, error: result.error || "" },
  });
  return res.status(result.error ? 500 : 200).json({ success: !result.error, ...result, orders, messages });
});

app.post("/adminn/ia-local/reconstruir", requireAdmin, (req, res) => {
  if (!localAiEnabled()) {
    return res.status(409).json({ success: false, error: "local_ai_disabled" });
  }
  if (req.body?.confirm !== "RECONSTRUIR") {
    return res.status(400).json({ success: false, error: "confirmation_required" });
  }
  const rebuild = db.transaction(() => {
    db.prepare("DELETE FROM local_ai_orders").run();
    db.prepare("DELETE FROM local_ai_customer_profiles").run();
    db.prepare("DELETE FROM local_ai_product_stats").run();
    db.prepare("DELETE FROM local_ai_product_pairs").run();
    db.prepare("DELETE FROM local_ai_term_products").run();
    db.prepare("DELETE FROM local_ai_customer_product_events").run();
    db.prepare("DELETE FROM local_ai_predictions").run();
    db.prepare("UPDATE local_ai_messages SET processed_at = NULL, linked_order_id = NULL").run();
  });
  rebuild();
  const result = processarIaLocalBatch({ orderLimit: 300, messageLimit: 500 });
  registrarAuditoriaAdmin(req, {
    acao: "ia_local_reconstruida",
    entidade: "ia_local",
    entidadeId: "worker",
  });
  return res.json({ success: true, ...result });
});

// ===================== MARKETING (CUPONS & COMBOS) =====================
app.get("/adminn/marketing/interesses", requireAdmin, (req, res) => {
  const periodoSolicitado = String(req.query?.periodo || "30").trim().toLowerCase();
  const periodosValidos = new Set(["7", "30", "90", "all"]);
  const periodo = periodosValidos.has(periodoSolicitado) ? periodoSolicitado : "30";
  let dataInicial = "";
  if (periodo !== "all") {
    const dias = Number(periodo);
    const brasil = getNowInBrazil();
    const inicio = new Date(Date.UTC(brasil.year, brasil.month - 1, brasil.day));
    inicio.setUTCDate(inicio.getUTCDate() - Math.max(dias - 1, 0));
    dataInicial = inicio.toISOString().slice(0, 10);
  }

  const where = dataInicial ? "WHERE data >= ?" : "";
  const rows = db.prepare(`
    SELECT produto_id AS produtoId,
           produto_nome AS produtoNome,
           categoria,
           visitante_id AS visitanteId,
           SUM(visualizacoes) AS visualizacoes,
           SUM(adicoes_carrinho) AS adicoesCarrinho,
           MAX(ultima_interacao) AS ultimaInteracao
    FROM produto_interacoes_diarias
    ${where}
    GROUP BY produto_id, produto_nome, categoria, visitante_id
  `).all(...(dataInicial ? [dataInicial] : []));

  const pedidos = db.prepare(`
    SELECT carrinho FROM pedidos
    WHERE lower(COALESCE(status, '')) NOT LIKE 'cancel%'
      ${dataInicial ? "AND date(created_at, '-3 hours') >= ?" : ""}
  `).all(...(dataInicial ? [dataInicial] : []));
  const items = buildProductInterestReport({
    catalog: montarCardapioCompletoPublico({ incluirPromoXtudo: true }),
    interactions: rows,
    orders: pedidos,
  }).slice(0, 100);
  const totalVisualizacoes = items.reduce((total, item) => total + item.visualizacoes, 0);
  const totalAdicoes = items.reduce((total, item) => total + item.adicoesCarrinho, 0);
  const maisVisto = items[0] || null;
  const maisAdicionado = [...items].sort((a, b) => b.adicoesCarrinho - a.adicoesCarrinho)[0] || null;
  const maisComprado = [...items].sort((a, b) => b.vendidos - a.vendidos)[0] || null;
  return res.json({
    success: true,
    periodo,
    dataInicial: dataInicial || null,
    stats: {
      produtos: items.length,
      visualizacoes: totalVisualizacoes,
      adicoesCarrinho: totalAdicoes,
      maisVisto: maisVisto?.produtoNome || "-",
      maisAdicionado: maisAdicionado?.adicoesCarrinho ? maisAdicionado.produtoNome : "-",
      vendidos: items.reduce((total, item) => total + item.vendidos, 0),
      maisComprado: maisComprado?.vendidos ? maisComprado.produtoNome : "-",
    },
    items,
  });
});

app.get("/adminn/marketing/clientes", requireAdmin, (req, res) => {
  const busca = normalizarTextoBusca(req.query?.busca || "");
  const segmento = String(req.query?.segmento || "todos").trim().toLowerCase();
  const pagina = Math.max(parseInt(req.query?.pagina, 10) || 1, 1);
  const limite = Math.min(Math.max(parseInt(req.query?.limite, 10) || 75, 25), 150);
  const segmentosValidos = new Set(["todos", "novo", "ativo", "recorrente", "vip", "sumido"]);
  const filtroSegmento = segmentosValidos.has(segmento) ? segmento : "todos";
  const todos = construirResumoClientes();
  const stats = {
    clientes: todos.length,
    pedidosAcumulados: todos.reduce((soma, item) => soma + item.pedidosCount, 0),
    recorrentes: todos.filter((item) => item.pedidosCount >= 3).length,
    vip: todos.filter((item) => item.segmento === "vip").length,
    sumidos: todos.filter((item) => item.segmento === "sumido").length,
    faturamentoIdentificado: Number(todos.reduce((soma, item) => soma + item.totalGasto, 0).toFixed(2)),
  };
  const filtrados = todos
    .filter((item) => filtroSegmento === "todos" || item.segmento === filtroSegmento)
    .filter((item) => {
      if (!busca) return true;
      const produtos = item.aprendizado?.produtosFavoritos?.map((produto) => produto.nome).join(" ") || "";
      const preferencias = item.aprendizado?.preferenciasRecorrentes?.map((preferencia) => preferencia.nome).join(" ") || "";
      return normalizarTextoBusca(`${item.nome} ${item.telefone} ${item.produtoFavorito} ${produtos} ${preferencias}`).includes(busca);
    })
    .sort((a, b) => b.totalGasto - a.totalGasto || b.pedidosCount - a.pedidosCount);
  const totalFiltrados = filtrados.length;
  const totalPaginas = Math.max(Math.ceil(totalFiltrados / limite), 1);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * limite;
  const items = filtrados.slice(inicio, inicio + limite);
  res.json({
    success: true,
    stats,
    items,
    pagination: { pagina: paginaAtual, limite, totalItems: totalFiltrados, totalPaginas },
  });
});

app.get("/api/atendente/clientes/historico", requireAtendente, (req, res) => {
  const telefone = normalizeCustomerPhone(req.query?.telefone || "");
  if (!telefone) return res.status(400).json({ success: false, error: "invalid_phone" });
  const variantes = getPhoneVariants(telefone);
  const resumo = buscarResumoClientePorTelefone(telefone);
  const pedidos = db.prepare(`
    SELECT * FROM pedidos
    WHERE telefone IS NOT NULL AND trim(telefone) <> ''
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 500
  `).all().filter((row) => {
    const rowVariants = getPhoneVariants(normalizeCustomerPhone(row.telefone || ""));
    return rowVariants.some((item) => variantes.includes(item));
  }).slice(0, 20).map(serializarPedidoAtendente);
  res.json({ success: true, resumo, pedidos });
});

app.get("/api/atendente/clientes/insight-ia", requireAtendente, async (req, res) => {
  const telefone = normalizeCustomerPhone(req.query?.telefone || "");
  if (!telefone) return res.status(400).json({ success: false, error: "invalid_phone" });
  const resumo = buscarResumoClientePorTelefone(telefone);
  const ia = await obterInsightClienteIa(telefone, resumo);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, ia });
});

app.get("/adminn/marketing/combos", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM combos ORDER BY created_at DESC")
    .all()
    .map((r) => {
      const itensRaw = parseMaybeJson(r.itens);
      const itens = Array.isArray(itensRaw)
        ? itensRaw
        : String(itensRaw || "")
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
      return {
        ...r,
        img: r.img || "",
        itens
      };
    });
  res.json(rows);
});

app.get("/adminn/marketing/combos-config", requireAdmin, (req, res) => {
  res.json({
    success: true,
    ativo: getConfigValue("combos_inteligentes_ativo", "1") === "1",
    ultimaGeracao: getConfigValue("combos_ultima_geracao", ""),
  });
});

app.post("/adminn/marketing/combos-config", requireAdmin, (req, res) => {
  if (typeof req.body?.ativo !== "boolean") {
    return res.status(400).json({ success: false, error: "invalid_active_state" });
  }
  const ativo = req.body.ativo;
  setConfigValue("combos_inteligentes_ativo", ativo ? "1" : "0");
  registrarAuditoriaAdmin(req, {
    acao: ativo ? "combos_automaticos_ativados" : "combos_automaticos_pausados",
    entidade: "marketing",
    entidadeId: "combos_inteligentes",
    detalhe: { ativo },
  });
  res.json({ success: true, ativo });
});

app.post("/adminn/marketing/combos", requireAdmin, (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const preco = Math.max(Number(req.body.preco) || 0, 0);
  const img = String(req.body.img || "").trim();
  if (!nome || !itens.length || !preco) return res.status(400).json({ success: false });
  const now = new Date().toISOString();
  const ativo = req.body.ativo === undefined ? 1 : (req.body.ativo ? 1 : 0);
  db.prepare(
    "INSERT INTO combos (nome, itens, preco, img, ativo, sugestao, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(nome, JSON.stringify(itens), preco, img, ativo, 0, now, now);
  res.json({ success: true });
});

app.put("/adminn/marketing/combos/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const nome = String(req.body.nome || "").trim();
  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  const preco = Math.max(Number(req.body.preco) || 0, 0);
  const img = String(req.body.img || "").trim();
  if (!id || !nome || !itens.length || !preco) return res.status(400).json({ success: false });
  db.prepare(
    "UPDATE combos SET nome = ?, itens = ?, preco = ?, img = ?, updated_at = ? WHERE id = ?"
  ).run(nome, JSON.stringify(itens), preco, img, new Date().toISOString(), id);
  res.json({ success: true });
});

app.post("/adminn/marketing/combos/:id/ativar", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ativo = req.body.ativo ? 1 : 0;
  db.prepare("UPDATE combos SET ativo = ?, updated_at = ? WHERE id = ?").run(
    ativo,
    new Date().toISOString(),
    id
  );
  res.json({ success: true });
});

app.delete("/adminn/marketing/combos/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare("DELETE FROM combos WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/adminn/marketing/gerar-sugestoes", requireAdmin, (req, res) => {
  const resultado = gerarCombosSugestao();
  if (resultado?.reason === "disabled") {
    return res.status(409).json({ success: false, error: "combo_generation_disabled" });
  }
  res.json({ success: true, ...resultado });
});

app.get("/adminn/marketing/cupons", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM cupons ORDER BY created_at DESC").all();
  res.json(rows);
});

app.post("/adminn/marketing/cupons", requireAdmin, (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const tipo = String(req.body.tipo || "").trim();
  const valor = Math.max(Number(req.body.valor) || 0, 0);
  const minimo = Math.max(Number(req.body.minimo) || 0, 0);
  const expira = String(req.body.expira_em || "").trim() || null;
  if (!codigo || !tipo || !valor) return res.status(400).json({ success: false });
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO cupons (codigo, tipo, valor, minimo, ativo, expira_em, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(codigo, tipo, valor, minimo, req.body.ativo ? 1 : 0, expira, now, now);
  res.json({ success: true });
});

app.put("/adminn/marketing/cupons/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const tipo = String(req.body.tipo || "").trim();
  const valor = Math.max(Number(req.body.valor) || 0, 0);
  const minimo = Math.max(Number(req.body.minimo) || 0, 0);
  const expira = String(req.body.expira_em || "").trim() || null;
  if (!id || !codigo || !tipo || !valor) return res.status(400).json({ success: false });
  db.prepare(
    "UPDATE cupons SET codigo = ?, tipo = ?, valor = ?, minimo = ?, expira_em = ?, updated_at = ? WHERE id = ?"
  ).run(codigo, tipo, valor, minimo, expira, new Date().toISOString(), id);
  res.json({ success: true });
});

app.post("/adminn/marketing/cupons/:id/ativar", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ativo = req.body.ativo ? 1 : 0;
  db.prepare("UPDATE cupons SET ativo = ?, updated_at = ? WHERE id = ?").run(
    ativo,
    new Date().toISOString(),
    id
  );
  res.json({ success: true });
});

app.delete("/adminn/marketing/cupons/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare("DELETE FROM cupons WHERE id = ?").run(id);
  res.json({ success: true });
});

// ===================== PRINT QUEUE =====================
const reservarProximoJobImpressao = db.transaction(() => {
  const job = db.prepare(
    "SELECT * FROM print_jobs WHERE status = 'pendente' ORDER BY datetime(created_at) ASC, id ASC LIMIT 1"
  ).get();
  if (!job) return null;

  const pickedAt = new Date().toISOString();
  db.prepare(
    "UPDATE print_jobs SET status = 'processando', picked_at = ?, attempts = COALESCE(attempts, 0) + 1 WHERE id = ?"
  ).run(pickedAt, job.id);

  return {
    ...job,
    status: "processando",
    picked_at: pickedAt,
    attempts: Number(job.attempts || 0) + 1,
  };
});

app.get("/adminn/print/next", (req, res) => {
  if (!checkPrintAgentAuth(req)) return res.status(401).json({ success: false, error: "unauthorized" });
  const job = reservarProximoJobImpressao();
  if (!job) return res.json({ ok: true, job: null });
  res.json({ ok: true, job: { id: job.id, pedido_id: job.pedido_id, payload: parseMaybeJson(job.payload) || {} } });
});

app.post("/adminn/print/ack", (req, res) => {
  if (!checkPrintAgentAuth(req)) return res.status(401).json({ success: false, error: "unauthorized" });
  const id = parseInt(req.body.id, 10);
  if (!id) return res.json({ ok: false });
  const statusReq = String(req.body.status || "impresso")
    .trim()
    .toLowerCase();
  const status = statusReq === "erro" ? "erro" : "impresso";
  const updated = db
    .prepare("UPDATE print_jobs SET status = ?, picked_at = NULL WHERE id = ?")
    .run(status, id);
  if (!updated.changes) return res.status(404).json({ ok: false, error: "nao_encontrado" });
  res.json({ ok: true });
});

app.post("/adminn/print/clear", requireAdmin, (req, res) => {
  const removed = db
    .prepare("DELETE FROM print_jobs WHERE status IN ('pendente', 'processando', 'erro')")
    .run();
  res.json({ ok: true, removed: removed.changes });
});

app.post("/adminn/print/test", requireAdmin, (req, res) => {
  const payload = {
    id: "TESTE",
    cliente: "Cliente de exemplo",
    telefone: "(35) 99999-9999",
    endereco: "Rua de exemplo, 123",
    tipoEntrega: "Entrega",
    origemPedido: "Painel",
    pagamento: "Dinheiro",
    troco: "100,00",
    taxaEntrega: 5,
    desconto: 4,
    cupom: "TESTE",
    carrinho: [
      {
        nome: "X-Tudo",
        qtd: 2,
        preco: 28,
        removidos: ["tomate", "milho"],
        adicionais: [{ nome: "Maionese caseira", qtd: 2, preco: 0 }],
      },
      { nome: "Coca-Cola 2L", qtd: 1, preco: 12 },
    ],
    obsGeral: "Partir os dois lanches",
    created_at: new Date().toISOString(),
  };
  db.prepare("INSERT INTO print_jobs (pedido_id, status, payload, created_at) VALUES (?, ?, ?, ?)").run(
    0,
    "pendente",
    JSON.stringify(payload),
    new Date().toISOString()
  );
  res.json({ ok: true });
});

app.post("/adminn/print/enqueue/:id", requireAdmin, (req, res) => {
  const pedidoId = parseInt(req.params.id, 10);
  if (!pedidoId) {
    return res.status(400).json({ ok: false, error: "id_invalido" });
  }

  const row = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(pedidoId);
  if (!row) {
    return res.status(404).json({ ok: false, error: "pedido_nao_encontrado" });
  }

  const carrinho = parseMaybeJson(row.carrinho);
  const pedido = {
    id: row.id,
    cliente: row.cliente || "",
    telefone: row.telefone || "",
    endereco: row.endereco || "",
    tipoEntrega: row.tipoEntrega || "",
    origem_pedido: row.origem_pedido || "",
    pagamento: row.pagamento || "",
    troco: row.troco || "",
    cupom: row.cupom || "",
    desconto: Number(row.desconto || 0) || 0,
    taxa_entrega: Number(row.taxa_entrega || 0) || 0,
    carrinho: Array.isArray(carrinho) ? carrinho : [],
    obsGeral: row.obsGeral || "",
    created_at: row.created_at || new Date().toISOString(),
  };

  enfileirarImpressaoPedido(pedido);
  return res.json({ ok: true, pedidoId });
});

function gerarProximoPedidoId() {
  const row = db.prepare("SELECT COALESCE(MAX(id), 0) AS maxId FROM pedidos").get();
  return Number(row?.maxId || 0) + 1;
}

function montarPayloadImpressaoPedido(pedido = {}) {
  const carrinho = Array.isArray(pedido.carrinho) ? pedido.carrinho : [];
  const desconto = Number(pedido.desconto || 0) || 0;
  const taxaEntrega = Number(pedido.taxaEntrega || pedido.taxa_entrega || 0) || 0;
  const subtotalCalculado = calcularTotalCarrinho(carrinho, desconto);
  const subtotal = temNumeroInformado(pedido.subtotal)
    ? Math.max(toNumber(pedido.subtotal, subtotalCalculado), 0)
    : subtotalCalculado;
  const total = temNumeroInformado(pedido.total)
    ? Math.max(toNumber(pedido.total, subtotal + taxaEntrega), 0)
    : Math.max(subtotal + taxaEntrega, 0);
  return {
    id: pedido.id,
    cliente: pedido.cliente || "",
    telefone: pedido.telefone || "",
    endereco: pedido.endereco || "",
    tipoEntrega: pedido.tipoEntrega || "",
    origemPedido: pedido.origemPedido || pedido.origem_pedido || "",
    pagamento: pedido.pagamento || "",
    pagamentosDetalhes: Array.isArray(pedido.pagamentosDetalhes)
      ? pedido.pagamentosDetalhes
      : normalizarPagamentosDetalhes(pedido.pagamento_detalhes || pedido.pagamentos || []),
    troco: pedido.troco || "",
    cupom: pedido.cupom || "",
    desconto,
    taxaEntrega,
    subtotal,
    total,
    carrinho,
    obsGeral: pedido.obsGeral || "",
    created_at: pedido.created_at || new Date().toISOString(),
  };
}

function enfileirarImpressaoPedido(pedido = {}) {
  const pedidoId = Number(pedido.id || 0);
  if (!pedidoId) return;
  const payload = montarPayloadImpressaoPedido(pedido);
  db.prepare("INSERT INTO print_jobs (pedido_id, status, payload, created_at) VALUES (?, ?, ?, ?)").run(
    pedidoId,
    "pendente",
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

app.post("/pedido", async (req, res) => {
  try {
    if (!isAbertoAgora()) {
      return res.status(403).json({
        success: false,
        error: "fechado",
        message: "Estamos fechados no momento. NÃ£o Ã© possÃ­vel finalizar pedidos agora."
      });
    }
    const proximoId = gerarProximoPedidoId();
    const autoAceitarPedidos = getConfigBoolean("auto_aceitar_pedidos", false);
    const autoImprimirPreparo = getConfigBoolean("auto_imprimir_preparo", true);
    const statusInicial = autoAceitarPedidos ? "preparo" : "recebido";
    const novoPedido = {
      id: proximoId,
      ...req.body,
      status: statusInicial,
    };
    const origemPedido = normalizarOrigemPedido(req.body.origemPedido || req.body.origem_pedido);
    let desconto = 0;
    const tipoEntregaTexto = String(novoPedido.tipoEntrega || "").trim();
    const isEntregaPedido = pedidoEhEntrega(tipoEntregaTexto, origemPedido);
    const enderecoPedido = isEntregaPedido ? String(novoPedido.endereco || "").trim() : "";
    const taxaEntregaInformada = globalThis.MegaPricing.money(getConfigValue("taxa_entrega", "9"));
    const taxaEntrega = isEntregaPedido ? taxaEntregaInformada : 0;
    const cupom = String(req.body.cupom || "").trim().toUpperCase();
    const pagamentosDetalhes = normalizarPagamentosDetalhes(req.body.pagamentosDetalhes || req.body.pagamentos);
    const carrinhoPedidoEntrada = Array.isArray(novoPedido.carrinho)
      ? novoPedido.carrinho
      : (Array.isArray(parseMaybeJson(novoPedido.carrinho)) ? parseMaybeJson(novoPedido.carrinho) : []);
    let carrinhoPedido;
    try {
      carrinhoPedido = aplicarPromocaoXtudoCarrinho(priceCheckoutCart(carrinhoPedidoEntrada, montarCatalogoAtendente()));
      if (cupom) desconto = couponDiscount(db.prepare("SELECT * FROM cupons WHERE codigo = ? AND ativo = 1").get(cupom), calcularTotalCarrinho(carrinhoPedido));
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message, message: "Confira os produtos e o cupom do pedido e tente novamente." });
    }
    const totalConfirmado = globalThis.MegaPricing.money(calcularTotalCarrinho(carrinhoPedido, desconto) + taxaEntrega);
    const totalExibido = globalThis.MegaPricing.money(calcularTotalCarrinho(normalizarEscopoAdicionaisCarrinho(carrinhoPedidoEntrada), req.body.desconto) + toNumber(req.body.taxaEntrega, 0));
    if (Math.abs(totalConfirmado - totalExibido) > 0.005) {
      return res.status(409).json({ success: false, error: "precos_atualizados", message: "Os valores foram atualizados. Confira o novo total e confirme novamente.", carrinho: carrinhoPedido, desconto, taxaEntrega, total: totalConfirmado });
    }
    novoPedido.desconto = desconto;
    novoPedido.carrinho = carrinhoPedido;
    if (pagamentosDetalhes.length) {
      const totalPedido = Math.max(0, calcularTotalCarrinho(carrinhoPedido, desconto) + taxaEntrega);
      const totalPagamentos = somaPagamentosDetalhes(pagamentosDetalhes);
      if (Math.abs(totalPedido - totalPagamentos) > 0.05) {
        return res.status(400).json({
          success: false,
          error: "pagamento_dividido_invalido",
          message: "A soma dos pagamentos divididos nao confere com o total do pedido."
        });
      }
    }
    const pagamentoTexto = montarTextoPagamento(req.body.pagamento || "", pagamentosDetalhes);
    const telefoneInfo = normalizarTelefoneBrasil(novoPedido.telefone || "");
    const telefonePedido = telefoneInfo.valido ? telefoneInfo.nacional : String(telefoneInfo.digits || novoPedido.telefone || "").slice(0, 30);
    if (!telefoneInfo.valido) {
      console.warn("[PEDIDO] Telefone invalido; pedido sera salvo sem notificacao WhatsApp:", {
        telefone: novoPedido.telefone || "",
        erro: telefoneInfo.erro,
        message: mensagemErroTelefoneBrasil(telefoneInfo),
      });
    }
    db.prepare(`
      INSERT INTO pedidos (
        id, cliente, telefone, endereco, tipoEntrega, origem_pedido, pagamento, pagamento_detalhes, troco, chavePix,
        carrinho, obsGeral, status, entregador, entregueEm, saiuParaEntrega, created_at, cupom, desconto, taxa_entrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      novoPedido.id,
      novoPedido.cliente || "",
      telefonePedido,
      enderecoPedido,
      tipoEntregaTexto,
      origemPedido,
      pagamentoTexto,
      JSON.stringify(pagamentosDetalhes),
      novoPedido.troco || "",
      novoPedido.chavePix || "",
      normalizarCarrinho(carrinhoPedido),
      novoPedido.obsGeral || "",
      novoPedido.status,
      novoPedido.entregador || "",
      novoPedido.entregueEm || null,
      novoPedido.saiuParaEntrega || null,
      new Date().toISOString(),
      cupom,
      desconto,
      taxaEntrega
    );
    novoPedido.pagamento = pagamentoTexto;
    novoPedido.pagamentosDetalhes = pagamentosDetalhes;
    novoPedido.telefone = telefonePedido;
    novoPedido.origemPedido = origemPedido;
    novoPedido.endereco = enderecoPedido;
    novoPedido.tipoEntrega = tipoEntregaTexto;
    novoPedido.taxaEntrega = taxaEntrega;
    novoPedido.subtotal = calcularTotalCarrinho(carrinhoPedido, desconto);
    novoPedido.total = Math.max(0, novoPedido.subtotal + taxaEntrega);
    novoPedido.created_at = new Date().toISOString();
    baixarEstoqueBebidas(novoPedido.carrinho, novoPedido.id);
    registrarHistoricoStatusPedido(novoPedido.id, null, statusInicial, "site", "site");
    if (statusInicial === "preparo" && autoImprimirPreparo) {
      enfileirarImpressaoPedido(novoPedido);
    }
    let mensagem = {
      enviada: false,
      motivo: telefoneInfo.valido ? "falha_envio" : "telefone_invalido",
    };
    if (telefoneInfo.valido) {
      try {
        const resultadoMensagem = await notificarCliente(novoPedido, "recebido");
        mensagem = {
          enviada: Boolean(resultadoMensagem?.ok),
          motivo: resultadoMensagem?.ok ? "" : String(resultadoMensagem?.error || "falha_envio"),
        };
      } catch (err) {
        mensagem = { enviada: false, motivo: String(err?.message || "falha_envio") };
        console.warn("[WHATSAPP] Erro ao notificar pedido recebido:", err?.message || err);
      }
    }
    res.json({ success: true, pedidoId: novoPedido.id, mensagem });
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    res.status(500).json({ success: false });
  }
});

app.post("/cupons/validar", (req, res) => {
  const codigo = String(req.body.codigo || "").trim().toUpperCase();
  const subtotal = toNumber(req.body.subtotal, 0);
  if (!codigo || subtotal <= 0) return res.status(400).json({ ok: false });
  const cupom = db.prepare("SELECT * FROM cupons WHERE codigo = ? AND ativo = 1").get(codigo);
  if (!cupom) return res.status(404).json({ ok: false, error: "invalido" });
  if (cupom.expira_em) {
    const hoje = new Date();
    const expira = new Date(cupom.expira_em + "T23:59:59");
    if (expira < hoje) return res.status(400).json({ ok: false, error: "expirado" });
  }
  if (subtotal < toNumber(cupom.minimo, 0)) {
    return res.status(400).json({ ok: false, error: "minimo" });
  }
  let desconto = 0;
  if (cupom.tipo === "percent") {
    desconto = Math.round((subtotal * toNumber(cupom.valor, 0) / 100) * 100) / 100;
  } else if (cupom.tipo === "valor") {
    desconto = toNumber(cupom.valor, 0);
  }
  desconto = Math.min(desconto, subtotal);
  res.json({ ok: true, desconto, tipo: cupom.tipo, valor: cupom.valor });
});

app.get("/pedidos", (req, res) => {
  const rows = db
    .prepare(`
      SELECT *
      FROM pedidos
      WHERE status NOT IN ('entregue', 'cancelado')
      ORDER BY
        CASE
          WHEN lower(COALESCE(tipoEntrega, '')) LIKE '%porta%' THEN 0
          ELSE 1
        END,
        created_at DESC
    `)
    .all();
  const pedidos = rows.map((row) => ({
    id: row.id,
    cliente: row.cliente,
    telefone: row.telefone,
    endereco: row.endereco,
    tipoEntrega: row.tipoEntrega,
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento,
    pagamentosDetalhes: parseMaybeJson(row.pagamento_detalhes) || [],
    troco: row.troco,
    chavePix: row.chavePix,
    carrinho: parseMaybeJson(row.carrinho) || [],
    obsGeral: row.obsGeral,
    status: row.status,
    entregador: row.entregador || undefined,
    entregueEm: row.entregueEm || undefined,
    saiuParaEntrega: row.saiuParaEntrega || undefined,
    created_at: row.created_at || undefined,
    cupom: row.cupom || "",
    desconto: row.desconto || 0,
    taxaEntrega: row.taxa_entrega || 0,
  }));
  res.json(pedidos);
});

app.get("/adminn/pedidos/historico", (req, res) => {
  const limit = Math.min(2000, Math.max(1, toNumber(req.query.limit, 500)));
  const params = [];
  const where = [];
  const status = String(req.query.status || "").trim().toLowerCase();
  const tipo = String(req.query.tipo || "").trim().toLowerCase();
  const busca = String(req.query.q || "").trim();
  const parseDataKey = (value) => {
    const key = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? key
      : "";
  };
  const addDaysToKey = (key, days) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  };
  const startKey = parseDataKey(req.query.data || req.query.inicio);
  const endKey = parseDataKey(req.query.data || req.query.fim);
  if (startKey) {
    const [year, month, day] = startKey.split("-").map(Number);
    const fromUtc = new Date(Date.UTC(year, month - 1, day, 3)).toISOString();
    where.push("datetime(created_at) >= datetime(?)");
    params.push(fromUtc);
  }
  if (endKey) {
    const [year, month, day] = addDaysToKey(endKey, 1).split("-").map(Number);
    const untilUtc = new Date(Date.UTC(year, month - 1, day, 3)).toISOString();
    where.push("datetime(created_at) < datetime(?)");
    params.push(untilUtc);
  }

  if (status) {
    where.push("lower(COALESCE(status, '')) = ?");
    params.push(status);
  }
  if (tipo) {
    where.push("lower(COALESCE(tipoEntrega, '') || ' ' || COALESCE(origem_pedido, '')) LIKE ?");
    params.push(`%${tipo}%`);
  }
  if (busca) {
    where.push(`(
      CAST(id AS TEXT) LIKE ?
      OR lower(COALESCE(cliente, '')) LIKE ?
      OR lower(COALESCE(telefone, '')) LIKE ?
      OR lower(COALESCE(tipoEntrega, '')) LIKE ?
      OR lower(COALESCE(status, '')) LIKE ?
    )`);
    const like = `%${busca.toLowerCase()}%`;
    params.push(like, like, like, like, like);
  }

  params.push(limit);
  const rows = db.prepare(`
    SELECT *
    FROM pedidos
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(...params);

  const pedidos = rows.map((row) => ({
    id: row.id,
    cliente: row.cliente,
    telefone: row.telefone,
    endereco: row.endereco,
    tipoEntrega: row.tipoEntrega,
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento,
    pagamentosDetalhes: parseMaybeJson(row.pagamento_detalhes) || [],
    troco: row.troco,
    carrinho: parseMaybeJson(row.carrinho) || [],
    obsGeral: row.obsGeral,
    status: row.status,
    entregador: row.entregador || undefined,
    entregueEm: row.entregueEm || undefined,
    saiuParaEntrega: row.saiuParaEntrega || undefined,
    created_at: row.created_at || undefined,
    cupom: row.cupom || "",
    desconto: row.desconto || 0,
    taxaEntrega: row.taxa_entrega || 0,
  }));
  res.json({ success: true, pedidos, limit });
});

app.get("/pedidos/:id/historico", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ ok: false, error: "id_invalido" });
  const rows = db.prepare(`
    SELECT id, pedido_id, status_anterior, status_novo, ator, canal, created_at
    FROM pedido_status_historico
    WHERE pedido_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(id);
  return res.json({ ok: true, items: rows });
});

app.post("/pedidos/manual", (req, res) => {
  try {
    const proximoId = gerarProximoPedidoId();
    const statusValidos = new Set(["recebido", "preparo", "pronto", "em_entrega", "entregue"]);
    const statusReq = String(req.body.status || "recebido").trim().toLowerCase();
    const status = statusValidos.has(statusReq) ? statusReq : "recebido";
    const tipoEntregaTexto = String(req.body.tipoEntrega || "entrega").trim();
    const origemPedido = normalizarOrigemPedido(
      req.body.origemPedido || req.body.origem_pedido || "outro"
    );
    const entregadorTexto = String(req.body.entregador || "").trim();
    if (
      entregadorObrigatorioParaPedido({
        tipoEntrega: tipoEntregaTexto,
        origemPedido,
        status,
      }) &&
      !entregadorTexto
    ) {
      return res.status(400).json({
        success: false,
        error: "entregador_obrigatorio",
        message: "Selecione o entregador antes de enviar para entrega.",
      });
    }
    const pagamentosDetalhes = normalizarPagamentosDetalhes(req.body.pagamentosDetalhes || req.body.pagamentos);
    const pagamentoTexto = montarTextoPagamento(req.body.pagamento || "", pagamentosDetalhes);
    const desconto = toNumber(req.body.desconto, 0);
    const taxaEntregaInformada = toNumber(req.body.taxaEntrega ?? req.body.taxa_entrega, 0);
    const taxaEntrega = pedidoEhEntrega(tipoEntregaTexto, origemPedido) ? taxaEntregaInformada : 0;
    const cupom = String(req.body.cupom || "").trim().toUpperCase();

    const carrinhoEntrada = req.body.carrinho;
    let carrinhoArray = [];
    if (Array.isArray(carrinhoEntrada)) carrinhoArray = carrinhoEntrada;
    else if (typeof carrinhoEntrada === "string") {
      const parsed = parseMaybeJson(carrinhoEntrada);
      if (Array.isArray(parsed)) carrinhoArray = parsed;
    }
    carrinhoArray = aplicarPromocaoXtudoCarrinho(carrinhoArray);
    const carrinho = normalizarCarrinho(carrinhoArray);
    if (pagamentosDetalhes.length) {
      const totalPedido = Math.max(0, calcularTotalCarrinho(carrinhoArray, desconto) + taxaEntrega);
      const totalPagamentos = somaPagamentosDetalhes(pagamentosDetalhes);
      if (Math.abs(totalPedido - totalPagamentos) > 0.05) {
        return res.status(400).json({
          success: false,
          error: "pagamento_dividido_invalido",
          message: "A soma dos pagamentos divididos nao confere com o total do pedido."
        });
      }
    }
    const entregueEm =
      status === "entregue" ? new Date().toLocaleString("pt-BR") : req.body.entregueEm || null;
    const saiuParaEntrega =
      status === "em_entrega"
        ? new Date().toLocaleString("pt-BR")
        : req.body.saiuParaEntrega || null;
    const telefoneInfo = normalizarTelefoneBrasil(req.body.telefone || "");
    const telefoneManual = telefoneInfo.valido
      ? telefoneInfo.nacional
      : String(telefoneInfo.digits || req.body.telefone || "").slice(0, 30);

    db.prepare(`
      INSERT INTO pedidos (
        id, cliente, telefone, endereco, tipoEntrega, origem_pedido, pagamento, pagamento_detalhes, troco, chavePix,
        carrinho, obsGeral, status, entregador, entregueEm, saiuParaEntrega, created_at, cupom, desconto, taxa_entrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      proximoId,
      String(req.body.cliente || "").trim(),
      telefoneManual,
      String(req.body.endereco || "").trim(),
      tipoEntregaTexto,
      origemPedido,
      pagamentoTexto,
      JSON.stringify(pagamentosDetalhes),
      String(req.body.troco || "").trim(),
      String(req.body.chavePix || "").trim(),
      carrinho,
      String(req.body.obsGeral || "").trim(),
      status,
      pedidoEhEntrega(tipoEntregaTexto, origemPedido) ? entregadorTexto : "",
      entregueEm,
      saiuParaEntrega,
      new Date().toISOString(),
      cupom,
      desconto,
      taxaEntrega
    );

    if (Array.isArray(carrinhoArray) && carrinhoArray.length > 0) {
      baixarEstoqueBebidas(carrinhoArray, proximoId);
    }

    registrarHistoricoStatusPedido(proximoId, null, status, obterAtorAdmin(req), "admin");
    if (status === "preparo" && getConfigBoolean("auto_imprimir_preparo", true)) {
      enfileirarImpressaoPedido({
        id: proximoId,
        cliente: String(req.body.cliente || "").trim(),
        telefone: telefoneManual,
        endereco: String(req.body.endereco || "").trim(),
        tipoEntrega: tipoEntregaTexto,
        origemPedido,
        pagamento: pagamentoTexto,
        troco: String(req.body.troco || "").trim(),
        cupom,
        desconto,
        taxaEntrega,
        carrinho: carrinhoArray,
        obsGeral: String(req.body.obsGeral || "").trim(),
        created_at: new Date().toISOString(),
      });
    }
    return res.json({ success: true, pedidoId: proximoId });
  } catch (err) {
    console.error("Erro ao criar pedido manual:", err);
    return res.status(500).json({ success: false, error: "erro_interno" });
  }
});

app.put("/pedidos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });

  const atual = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!atual) return res.status(404).json({ success: false, error: "nao_encontrado" });

  try {
    const statusValidos = new Set(["recebido", "preparo", "pronto", "em_entrega", "entregue"]);
    const statusReq = String(req.body.status || atual.status || "recebido").trim().toLowerCase();
    const status = statusValidos.has(statusReq) ? statusReq : (atual.status || "recebido");
    const tipoEntregaAtualizado = String(req.body.tipoEntrega ?? atual.tipoEntrega ?? "entrega").trim();
    const origemPedido = normalizarOrigemPedido(
      req.body.origemPedido ?? req.body.origem_pedido ?? atual.origem_pedido
    );
    const entregadorAtualizado = String(req.body.entregador ?? atual.entregador ?? "").trim();
    if (
      entregadorObrigatorioParaPedido({
        tipoEntrega: tipoEntregaAtualizado,
        origemPedido,
        status,
      }) &&
      !entregadorAtualizado
    ) {
      return res.status(400).json({
        success: false,
        error: "entregador_obrigatorio",
        message: "Selecione o entregador antes de enviar para entrega.",
      });
    }

    const carrinhoAtual = parseMaybeJson(atual.carrinho) || [];
    let carrinhoNovo = carrinhoAtual;
    if (Object.prototype.hasOwnProperty.call(req.body, "carrinho")) {
      const entrada = req.body.carrinho;
      if (Array.isArray(entrada)) carrinhoNovo = entrada;
      else if (typeof entrada === "string") {
        const parsed = parseMaybeJson(entrada);
        carrinhoNovo = Array.isArray(parsed) ? parsed : [];
      } else {
        carrinhoNovo = [];
      }
    }
    carrinhoNovo = aplicarPromocaoXtudoCarrinho(carrinhoNovo);
    const carrinho = normalizarCarrinho(carrinhoNovo);

    const entregueEm = status === "entregue"
      ? (atual.entregueEm || new Date().toLocaleString("pt-BR"))
      : (req.body.entregueEm ?? atual.entregueEm ?? null);
    const saiuParaEntrega = status === "em_entrega"
      ? (atual.saiuParaEntrega || new Date().toLocaleString("pt-BR"))
      : (req.body.saiuParaEntrega ?? atual.saiuParaEntrega ?? null);

    const desconto = toNumber(req.body.desconto ?? atual.desconto, 0);
    const taxaEntregaInformada = toNumber(
      req.body.taxaEntrega ?? req.body.taxa_entrega ?? atual.taxa_entrega,
      0
    );
    const taxaEntrega = pedidoEhEntrega(tipoEntregaAtualizado, origemPedido) ? taxaEntregaInformada : 0;
    const cupom = String(req.body.cupom ?? atual.cupom ?? "").trim().toUpperCase();
    const pagamentosDetalhes = normalizarPagamentosDetalhes(
      req.body.pagamentosDetalhes ?? req.body.pagamentos ?? atual.pagamento_detalhes
    );
    const pagamentoTexto = montarTextoPagamento(req.body.pagamento ?? atual.pagamento ?? "", pagamentosDetalhes);
    const telefoneInfo = normalizarTelefoneBrasil(req.body.telefone ?? atual.telefone ?? "");
    const telefoneAtualizado = telefoneInfo.valido
      ? telefoneInfo.nacional
      : String(telefoneInfo.digits || req.body.telefone || atual.telefone || "").slice(0, 30);
    if (pagamentosDetalhes.length) {
      const totalPedido = Math.max(0, calcularTotalCarrinho(carrinhoNovo, desconto) + taxaEntrega);
      const totalPagamentos = somaPagamentosDetalhes(pagamentosDetalhes);
      if (Math.abs(totalPedido - totalPagamentos) > 0.05) {
        return res.status(400).json({
          success: false,
          error: "pagamento_dividido_invalido",
          message: "A soma dos pagamentos divididos nao confere com o total do pedido."
        });
      }
    }

    const statusAnterior = String(atual.status || "").trim();

    db.prepare(`
      UPDATE pedidos
      SET cliente = ?, telefone = ?, endereco = ?, tipoEntrega = ?, origem_pedido = ?,
          pagamento = ?, pagamento_detalhes = ?, troco = ?, chavePix = ?, carrinho = ?, obsGeral = ?, status = ?,
          entregador = ?, entregueEm = ?, saiuParaEntrega = ?, cupom = ?, desconto = ?, taxa_entrega = ?
      WHERE id = ?
    `).run(
      String(req.body.cliente ?? atual.cliente ?? "").trim(),
      telefoneAtualizado,
      String(req.body.endereco ?? atual.endereco ?? "").trim(),
      tipoEntregaAtualizado,
      origemPedido,
      pagamentoTexto,
      JSON.stringify(pagamentosDetalhes),
      String(req.body.troco ?? atual.troco ?? "").trim(),
      String(req.body.chavePix ?? atual.chavePix ?? "").trim(),
      carrinho,
      String(req.body.obsGeral ?? atual.obsGeral ?? "").trim(),
      status,
      pedidoEhEntrega(tipoEntregaAtualizado, origemPedido) ? entregadorAtualizado : "",
      entregueEm,
      saiuParaEntrega,
      cupom,
      desconto,
      taxaEntrega,
      id
    );

    const mudouCarrinho = JSON.stringify(carrinhoAtual) !== JSON.stringify(carrinhoNovo);
    if (mudouCarrinho) {
      estornarEstoqueBebidas(carrinhoAtual, id);
      baixarEstoqueBebidas(carrinhoNovo, id);
    }

    registrarHistoricoStatusPedido(id, statusAnterior, status, obterAtorAdmin(req), "admin");

    return res.json({ success: true });
  } catch (err) {
    console.error("Erro ao atualizar pedido:", err);
    return res.status(500).json({ success: false, error: "erro_interno" });
  }
});

app.post("/pedidos/status", (req, res) => {
  const { id, status, entregador } = req.body;
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.json({ success: false });
  const statusValidos = new Set(["recebido", "preparo", "pronto", "em_entrega", "entregue", "cancelado"]);
  const statusReq = String(status || "").trim().toLowerCase();
  const novoStatus = statusValidos.has(statusReq) ? statusReq : String(pedido.status || "recebido");
  const entregadorAtualizado = String(entregador || pedido.entregador || "").trim();
  if (
    entregadorObrigatorioParaPedido({
      tipoEntrega: pedido.tipoEntrega,
      origemPedido: pedido.origem_pedido,
      status: novoStatus,
    }) &&
    !entregadorAtualizado
  ) {
    return res.status(400).json({
      success: false,
      error: "entregador_obrigatorio",
      message: "Selecione o entregador antes de enviar para entrega.",
    });
  }
  const statusAnterior = String(pedido.status || "").trim();
  const ator = obterAtorAdmin(req);
  const entregueEm = novoStatus === "entregue" ? new Date().toLocaleString("pt-BR") : (pedido.entregueEm || null);
  const entregadorFinal = pedidoEhEntrega(pedido.tipoEntrega, pedido.origem_pedido) ? entregadorAtualizado : "";
  db.prepare(`
    UPDATE pedidos
    SET status = ?, entregador = ?, entregueEm = ?
    WHERE id = ?
  `).run(novoStatus, entregadorFinal, entregueEm, id);
  const pedidoAtualizado = {
    ...pedido,
    status: novoStatus,
    entregador: entregadorFinal,
    entregueEm: entregueEm || pedido.entregueEm,
    carrinho: parseMaybeJson(pedido.carrinho) || [],
    origemPedido: pedido.origem_pedido || "",
    pagamentosDetalhes: parseMaybeJson(pedido.pagamento_detalhes) || [],
    taxaEntrega: pedido.taxa_entrega || 0
  };
  if (
    novoStatus &&
    novoStatus !== "entregue" &&
    !normalizarTipoEntregaAtendente(pedido.tipoEntrega || pedido.origem_pedido).isNaPorta
  ) {
    notificarCliente(pedidoAtualizado, novoStatus).catch((err) =>
      console.warn("[ZAPI] Erro ao notificar status:", err)
    );
  }

  if (
    novoStatus === "preparo" &&
    statusAnterior !== "preparo" &&
    getConfigBoolean("auto_imprimir_preparo", true)
  ) {
    enfileirarImpressaoPedido(pedidoAtualizado);
  }
  registrarHistoricoStatusPedido(id, statusAnterior, novoStatus, ator, "admin");
  res.json({ success: true });
});

app.post("/pedidos/atribuir-entregador", (req, res) => {
  const { id, entregador } = req.body;
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.json({ success: false, error: "Pedido nao encontrado" });
  const nomeEntregador = String(entregador || "").trim();
  if (!nomeEntregador) {
    return res.status(400).json({
      success: false,
      error: "entregador_obrigatorio",
      message: "Selecione um entregador valido.",
    });
  }
  if (!pedidoEhEntrega(pedido.tipoEntrega, pedido.origem_pedido)) {
    return res.status(400).json({
      success: false,
      error: "pedido_retirada",
      message: "Pedido de retirada nao precisa de entregador.",
    });
  }
  const statusAnterior = String(pedido.status || "").trim();
  db.prepare(`
    UPDATE pedidos
    SET entregador = ?, status = 'em_entrega', saiuParaEntrega = ?
    WHERE id = ?
  `).run(nomeEntregador, new Date().toLocaleString("pt-BR"), id);
  const pedidoAtualizado = {
    ...pedido,
    status: "em_entrega",
    entregador: nomeEntregador,
    carrinho: parseMaybeJson(pedido.carrinho) || [],
    origemPedido: pedido.origem_pedido || "",
    pagamentosDetalhes: parseMaybeJson(pedido.pagamento_detalhes) || [],
    taxaEntrega: pedido.taxa_entrega || 0
  };
  notificarCliente(pedidoAtualizado, "em_entrega").catch((err) =>
    console.warn("[ZAPI] Erro ao notificar entrega:", err)
  );
  registrarHistoricoStatusPedido(id, statusAnterior, "em_entrega", obterAtorAdmin(req), "admin");
  res.json({ success: true, pedido: { id, entregador: nomeEntregador } });
});

app.delete("/pedidos/cancelar/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.status(404).json({ success: false, error: "Pedido nao encontrado" });

  const statusAnterior = String(pedido?.status || "").trim();
  if (pedido?.carrinho && statusAnterior !== "cancelado") {
    estornarEstoqueBebidas(parseMaybeJson(pedido.carrinho) || [], id);
  }
  const info = db.prepare("UPDATE pedidos SET status = 'cancelado' WHERE id = ?").run(id);
  registrarHistoricoStatusPedido(id, statusAnterior, "cancelado", obterAtorAdmin(req), "admin");

  if (info.changes) return res.json({ success: true });
  return res.json({ success: false });
});

app.delete("/pedidos/abertos/todos", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT id, status, carrinho FROM pedidos WHERE status != 'entregue'")
      .all();

    if (!rows.length) return res.json({ success: true, removidos: 0 });

    const delPedido = db.prepare("DELETE FROM pedidos WHERE id = ?");
    const delHistorico = db.prepare("DELETE FROM pedido_status_historico WHERE pedido_id = ?");
    const delPrintJobs = db.prepare("DELETE FROM print_jobs WHERE pedido_id = ?");

    const tx = db.transaction(() => {
      let removidos = 0;
      rows.forEach((row) => {
        const id = Number(row.id);
        if (!id) return;

        const status = String(row.status || "").trim();
        if (row.carrinho && status !== "cancelado") {
          estornarEstoqueBebidas(parseMaybeJson(row.carrinho) || [], id);
        }

        delHistorico.run(id);
        delPrintJobs.run(id);
        removidos += delPedido.run(id).changes || 0;
      });
      return { removidos };
    });

    const resultado = tx();
    return res.json({ success: true, removidos: resultado.removidos || 0 });
  } catch (err) {
    console.error("Erro ao excluir todos os pedidos abertos:", err);
    return res.status(500).json({ success: false, error: "erro_excluir_todos_pedidos" });
  }
});

app.delete("/pedidos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });

  const pedido = db.prepare("SELECT id, status, carrinho FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.status(404).json({ success: false, error: "nao_encontrado" });

  if (String(pedido.status || "").trim() === "entregue") {
    return res.status(400).json({
      success: false,
      error: "pedido_entregue",
      message: "Use a aba Entregues para excluir pedidos ja entregues.",
    });
  }

  try {
    const tx = db.transaction(() => {
      const status = String(pedido.status || "").trim();
      if (pedido.carrinho && status !== "cancelado") {
        estornarEstoqueBebidas(parseMaybeJson(pedido.carrinho) || [], id);
      }

      db.prepare("DELETE FROM pedido_status_historico WHERE pedido_id = ?").run(id);
      db.prepare("DELETE FROM print_jobs WHERE pedido_id = ?").run(id);
      const info = db.prepare("DELETE FROM pedidos WHERE id = ?").run(id);
      return info.changes || 0;
    });

    const removidos = tx();
    if (!removidos) return res.status(500).json({ success: false, error: "falha_exclusao" });
    return res.json({ success: true, removidos });
  } catch (err) {
    console.error("Erro ao excluir pedido:", err);
    return res.status(500).json({ success: false, error: "erro_excluir_pedido" });
  }
});

app.post("/pedidos/mover-para-entregues", (req, res) => {
  const { id } = req.body;
  const pedido = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.json({ success: false, error: "Pedido nao encontrado" });
  if (
    entregadorObrigatorioParaPedido({
      tipoEntrega: pedido.tipoEntrega,
      origemPedido: pedido.origem_pedido,
      status: "entregue",
    }) &&
    !String(pedido.entregador || "").trim()
  ) {
    return res.status(400).json({
      success: false,
      error: "entregador_obrigatorio",
      message: "Selecione o entregador antes de finalizar a entrega.",
    });
  }
  const statusAnterior = String(pedido.status || "").trim();
  const entregueEm = new Date().toLocaleString("pt-BR");
  db.prepare(`
    UPDATE pedidos
    SET status = 'entregue', entregueEm = ?
    WHERE id = ?
  `).run(entregueEm, id);
  registrarHistoricoStatusPedido(id, statusAnterior, "entregue", obterAtorAdmin(req), "admin");
  res.json({ success: true });
});

app.get("/pedidos/entregues", (req, res) => {
  const rows = db.prepare("SELECT * FROM pedidos WHERE status = 'entregue' ORDER BY id DESC").all();
  const pedidos = rows.map((row) => ({
    id: row.id,
    cliente: row.cliente,
    telefone: row.telefone,
    endereco: row.endereco,
    tipoEntrega: row.tipoEntrega,
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento,
    pagamentosDetalhes: parseMaybeJson(row.pagamento_detalhes) || [],
    carrinho: parseMaybeJson(row.carrinho) || [],
    status: row.status,
    entregador: row.entregador || undefined,
    entregueEm: row.entregueEm || undefined,
    created_at: row.created_at || undefined,
    taxaEntrega: row.taxa_entrega || 0
  }));
  res.json(pedidos);
});

app.delete("/pedidos/entregues/todos", (req, res) => {
  const info = db.prepare("DELETE FROM pedidos WHERE status = 'entregue'").run();
  return res.json({ success: true, removidos: info.changes || 0 });
});

app.post("/adminn/relatorio/limpar-tudo", (req, res) => {
  try {
    const tx = db.transaction(() => {
      const entregues = db.prepare("DELETE FROM pedidos WHERE status = 'entregue'").run();
      const historico = db.prepare("DELETE FROM pedido_status_historico").run();
      const filaPrint = db.prepare("DELETE FROM print_jobs").run();
      return {
        entregues: entregues.changes || 0,
        historico: historico.changes || 0,
        printJobs: filaPrint.changes || 0,
      };
    });
    const resultado = tx();
    return res.json({ success: true, ...resultado });
  } catch (err) {
    console.error("Erro ao limpar dados do relatorio:", err);
    return res.status(500).json({ success: false, error: "erro_limpeza_relatorio" });
  }
});

app.delete("/pedidos/entregues/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false, error: "id_invalido" });

  const pedido = db.prepare("SELECT id, status FROM pedidos WHERE id = ?").get(id);
  if (!pedido) return res.status(404).json({ success: false, error: "nao_encontrado" });
  if (pedido.status !== "entregue") {
    return res.status(400).json({ success: false, error: "pedido_nao_entregue" });
  }

  const info = db.prepare("DELETE FROM pedidos WHERE id = ? AND status = 'entregue'").run(id);
  if (info.changes) return res.json({ success: true });
  return res.status(500).json({ success: false, error: "falha_exclusao" });
});

// ===================== ROTAS DE ADICIONAIS =====================
app.get("/adminn/adicionais", (req, res) => {
  const rows = db.prepare("SELECT * FROM adicionais ORDER BY order_index ASC").all();
  res.json(rows.map((row) => ({ nome: row.nome, preco: row.preco })));
});

app.post("/adminn/adicionais/adicionar", (req, res) => {
  const max = db.prepare("SELECT COALESCE(MAX(order_index), -1) as max FROM adicionais").get().max;
  const orderIndex = max + 1;
  db.prepare(`
    INSERT INTO adicionais (nome, preco, order_index, created_at)
    VALUES (?, ?, ?, ?)
  `).run(req.body.nome || "", Number(req.body.preco) || 0, orderIndex, new Date().toISOString());
  res.json({ success: true });
});

app.delete("/adminn/adicionais/remover/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const item = db.prepare("SELECT id FROM adicionais WHERE order_index = ?").get(index);
  if (!item) return res.json({ success: false });
  db.prepare("DELETE FROM adicionais WHERE id = ?").run(item.id);
  db.prepare("UPDATE adicionais SET order_index = order_index - 1 WHERE order_index > ?").run(index);
  res.json({ success: true });
});

// ===================== ROTAS DE ESTOQUE =====================
app.get("/adminn/estoque", (req, res) => {
  const rows = db.prepare("SELECT * FROM estoque_itens ORDER BY nome ASC").all();
  res.json(
    rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      categoria: row.categoria || "ingrediente",
      unidade: row.unidade,
      quantidade: row.quantidade,
      minimo: row.minimo,
      auto_baixa: row.auto_baixa === 1,
    }))
  );
});

app.get("/adminn/estoque/resumo", (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as total FROM estoque_itens").get().total || 0;
  const baixo = db
    .prepare("SELECT COUNT(*) as total FROM estoque_itens WHERE minimo > 0 AND quantidade <= minimo")
    .get().total || 0;
  const itensBaixo = db
    .prepare("SELECT nome, quantidade, minimo, unidade FROM estoque_itens WHERE minimo > 0 AND quantidade <= minimo ORDER BY nome ASC")
    .all();
  res.json({ total, baixo, itensBaixo });
});

app.post("/adminn/estoque/sincronizar-bebidas", (req, res) => {
  const resultado = syncBebidasFromCardapio();
  normalizarAutoBaixa();
  res.json({ success: true, ...resultado });
});

app.post("/adminn/estoque/importar", (req, res) => {
  const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
  if (!itens.length) return res.status(400).json({ success: false, error: "lista_vazia" });

  const selectItem = db.prepare("SELECT id, quantidade FROM estoque_itens WHERE lower(nome) = lower(?)");
  const insertItem = db.prepare(`
    INSERT INTO estoque_itens (nome, categoria, unidade, quantidade, minimo, auto_baixa, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateItem = db.prepare(`
    UPDATE estoque_itens
    SET categoria = ?, unidade = ?, minimo = ?, auto_baixa = ?, updated_at = ?
    WHERE id = ?
  `);
  const insertMov = db.prepare(`
    INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, referencia, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let ajustados = 0;

  const tx = db.transaction(() => {
    itens.forEach((item) => {
      const nome = String(item?.nome || "").trim();
      if (!nome) return;

      const categoriaRaw = String(item?.categoria || "ingrediente").trim().toLowerCase();
      const categoria = categoriaEhBebida(categoriaRaw) ? "bebida" : "ingrediente";
      const unidade = String(item?.unidade || "un").trim() || "un";
      const minimo = Math.max(toNumber(item?.minimo, 0), 0);
      const qtdEntrada = item?.quantidade === "" || item?.quantidade === null || item?.quantidade === undefined
        ? null
        : Math.max(toNumber(item?.quantidade, 0), 0);
      const autoBaixa = categoria === "bebida" ? 1 : (item?.auto_baixa ? 1 : 0);

      const existente = selectItem.get(nome);
      if (!existente) {
        const info = insertItem.run(nome, categoria, unidade, qtdEntrada || 0, minimo, autoBaixa, now, now);
        created += 1;
        if (qtdEntrada && qtdEntrada > 0) {
          insertMov.run(info.lastInsertRowid, "entrada", qtdEntrada, "Importacao CSV", "", now);
        }
        return;
      }

      updateItem.run(categoria, unidade, minimo, autoBaixa, now, existente.id);
      updated += 1;

      if (qtdEntrada !== null) {
        const atualQtd = toNumber(existente.quantidade, 0);
        const delta = qtdEntrada - atualQtd;
        if (delta !== 0) {
          insertMov.run(existente.id, "ajuste", delta, "Importacao CSV", "", now);
          db.prepare("UPDATE estoque_itens SET quantidade = ?, updated_at = ? WHERE id = ?")
            .run(qtdEntrada, now, existente.id);
          ajustados += 1;
        }
      }
    });
  });

  try {
    tx();
    res.json({ success: true, created, updated, ajustados });
  } catch (err) {
    console.error("Erro ao importar estoque:", err);
    res.status(500).json({ success: false, error: "erro_importacao" });
  }
});

app.get("/adminn/estoque/movimentos", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const rows = db.prepare(`
    SELECT m.id, m.item_id, m.tipo, m.quantidade, m.motivo, m.referencia, m.created_at, e.nome
    FROM estoque_movimentos m
    JOIN estoque_itens e ON e.id = m.item_id
    ORDER BY m.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

app.post("/adminn/estoque", (req, res) => {
  const nome = String(req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ success: false, error: "nome_obrigatorio" });

  const unidade = String(req.body.unidade || "un").trim() || "un";
  const quantidade = Math.max(toNumber(req.body.quantidade, 0), 0);
  const minimo = Math.max(toNumber(req.body.minimo, 0), 0);
  const categoriaRaw = String(req.body.categoria || "ingrediente").trim().toLowerCase();
  const categoria = categoriaEhBebida(categoriaRaw) ? "bebida" : "ingrediente";
  const autoBaixa = categoria === "bebida" ? 1 : (req.body.auto_baixa ? 1 : 0);
  const now = new Date().toISOString();

  try {
    const insertItem = db.prepare(`
      INSERT INTO estoque_itens (nome, categoria, unidade, quantidade, minimo, auto_baixa, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMov = db.prepare(`
      INSERT INTO estoque_movimentos (item_id, tipo, quantidade, motivo, referencia, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      const info = insertItem.run(nome, categoria, unidade, quantidade, minimo, autoBaixa, now, now);
      if (quantidade > 0) {
        insertMov.run(info.lastInsertRowid, "entrada", quantidade, "Cadastro inicial", "", now);
      }
      return info.lastInsertRowid;
    });

    const id = tx();
    res.json({ success: true, id });
  } catch (err) {
    console.error("Erro ao adicionar item de estoque:", err);
    if (String(err?.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ success: false, error: "item_existente" });
    }
    res.status(500).json({ success: false, error: "erro_estoque" });
  }
});

app.put("/adminn/estoque/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ success: false });

  const nome = String(req.body.nome || "").trim();
  if (!nome) return res.status(400).json({ success: false, error: "nome_obrigatorio" });
  const unidade = String(req.body.unidade || "un").trim() || "un";
  const minimo = Math.max(toNumber(req.body.minimo, 0), 0);
  const categoriaRaw = String(req.body.categoria || "ingrediente").trim().toLowerCase();
  const categoria = categoriaEhBebida(categoriaRaw) ? "bebida" : "ingrediente";
  const autoBaixa = categoria === "bebida" ? 1 : (req.body.auto_baixa ? 1 : 0);

  const info = db.prepare(`
    UPDATE estoque_itens
    SET nome = ?, categoria = ?, unidade = ?, minimo = ?, auto_baixa = ?, updated_at = ?
    WHERE id = ?
  `).run(nome, categoria, unidade, minimo, autoBaixa, new Date().toISOString(), id);

  if (info.changes) return res.json({ success: true });
  res.status(404).json({ success: false, error: "nao_encontrado" });
});

app.delete("/adminn/estoque/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const info = db.prepare("DELETE FROM estoque_itens WHERE id = ?").run(id);
  if (info.changes) return res.json({ success: true });
  res.status(404).json({ success: false, error: "nao_encontrado" });
});

app.post("/adminn/estoque/movimentar", (req, res) => {
  const id = parseInt(req.body.id, 10);
  const tipo = String(req.body.tipo || "").toLowerCase();
  const quantidade = Math.abs(toNumber(req.body.quantidade, 0));
  const motivo = String(req.body.motivo || "");

  if (!id || !quantidade) return res.status(400).json({ success: false, error: "dados_invalidos" });
  if (!["entrada", "saida"].includes(tipo)) {
    return res.status(400).json({ success: false, error: "tipo_invalido" });
  }

  const delta = tipo === "entrada" ? quantidade : -quantidade;
  const resultado = aplicarMovimentoEstoque({
    itemId: id,
    delta,
    tipo,
    quantidade,
    motivo,
    referencia: "",
  });

  if (resultado.ok) return res.json({ success: true, quantidade: resultado.nova });
  if (resultado.error === "insuficiente") {
    return res.status(400).json({ success: false, error: "estoque_insuficiente", atual: resultado.atual });
  }
  res.status(404).json({ success: false, error: "nao_encontrado" });
});

app.post("/adminn/estoque/definir", (req, res) => {
  const id = parseInt(req.body.id, 10);
  const quantidade = Math.max(toNumber(req.body.quantidade, 0), 0);
  const motivo = String(req.body.motivo || "Ajuste manual");
  if (!id) return res.status(400).json({ success: false, error: "dados_invalidos" });

  const atual = db.prepare("SELECT quantidade FROM estoque_itens WHERE id = ?").get(id);
  if (!atual) return res.status(404).json({ success: false, error: "nao_encontrado" });

  const atualQtd = toNumber(atual.quantidade, 0);
  const delta = quantidade - atualQtd;
  if (delta === 0) return res.json({ success: true, quantidade: quantidade });

  const resultado = aplicarMovimentoEstoque({
    itemId: id,
    delta,
    tipo: "ajuste",
    quantidade: delta,
    motivo,
    referencia: "",
  });

  if (resultado.ok) return res.json({ success: true, quantidade: resultado.nova });
  res.status(400).json({ success: false, error: "erro_ajuste" });
});

// ===================== ROTAS DE ENTREGADORES =====================
app.get("/adminn/entregadores", (req, res) => {
  const rows = db.prepare("SELECT * FROM entregadores ORDER BY created_at DESC").all();
  res.json(
    rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      ativo: row.ativo === 1,
    }))
  );
});

app.post("/adminn/entregadores/adicionar", (req, res) => {
  const novo = {
    id: Date.now(),
    nome: req.body.nome || "",
    ativo: true,
  };
  db.prepare(`
    INSERT INTO entregadores (id, nome, ativo, created_at)
    VALUES (?, ?, ?, ?)
  `).run(novo.id, novo.nome, novo.ativo ? 1 : 0, new Date().toISOString());
  res.json({ success: true, entregador: novo });
});

app.delete("/adminn/entregadores/remover/:id", (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare("DELETE FROM entregadores WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post("/adminn/entregadores/status", (req, res) => {
  const { id, ativo } = req.body;
  const info = db.prepare("UPDATE entregadores SET ativo = ? WHERE id = ?").run(ativo ? 1 : 0, id);
  if (info.changes) return res.json({ success: true });
  res.json({ success: false });
});

// ===================== RELATORIO =====================
app.get("/adminn/relatorio.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "adminn", "relatorio.html"));
});

function dataCaixaPedido(valor) {
  const texto = String(valor || "").trim();
  const iso = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const parsed = new Date(texto);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function metodoPagamentoCaixa(valor) {
  const texto = normalizarTextoBusca(valor);
  if (texto.includes("pix")) return "pix";
  if (texto.includes("dinheiro")) return "dinheiro";
  if (texto.includes("cartao")) return "cartao";
  return "outro";
}

function pagamentosPedidoCaixa(row, total) {
  const resumo = { pix: 0, dinheiro: 0, cartao: 0, outro: 0 };
  const detalhes = normalizarPagamentosDetalhes(row.pagamento_detalhes);
  if (detalhes.length) {
    const soma = somaPagamentosDetalhes(detalhes);
    const fator = soma > 0 ? total / soma : 1;
    detalhes.forEach((item) => {
      const metodo = metodoPagamentoCaixa(item.metodo);
      resumo[metodo] += Math.max(toNumber(item.valor, 0) * fator, 0);
    });
    return resumo;
  }
  resumo[metodoPagamentoCaixa(row.pagamento)] += total;
  return resumo;
}

function montarResumoCaixa(dataCaixa) {
  const pagamentos = { pix: 0, dinheiro: 0, cartao: 0, outro: 0, total: 0, pedidos: 0 };
  db.prepare("SELECT * FROM pedidos WHERE status = 'entregue'").all().forEach((row) => {
    if (dataCaixaPedido(row.entregueEm || row.created_at) !== dataCaixa) return;
    const subtotal = calcularTotalCarrinho(parseMaybeJson(row.carrinho) || [], row.desconto || 0);
    const total = Math.max(subtotal + toNumber(row.taxa_entrega, 0), 0);
    const porMetodo = pagamentosPedidoCaixa(row, total);
    pagamentos.pix += porMetodo.pix;
    pagamentos.dinheiro += porMetodo.dinheiro;
    pagamentos.cartao += porMetodo.cartao;
    pagamentos.outro += porMetodo.outro;
    pagamentos.total += total;
    pagamentos.pedidos += 1;
  });

  const movimentos = db.prepare(`
    SELECT id, data_caixa AS dataCaixa, tipo, valor, descricao, ator, created_at AS criadoEm
    FROM caixa_movimentos WHERE data_caixa = ? ORDER BY created_at DESC, id DESC
  `).all(dataCaixa);
  const totais = movimentos.reduce((acc, item) => {
    acc[item.tipo] = (acc[item.tipo] || 0) + Math.max(toNumber(item.valor, 0), 0);
    return acc;
  }, { abertura: 0, reforco: 0, sangria: 0 });
  const saldoEsperado = totais.abertura + totais.reforco + pagamentos.dinheiro - totais.sangria;
  const fechamento = db.prepare(`
    SELECT id, saldo_informado AS saldoInformado, observacao, fechado_por AS fechadoPor,
           fechado_em AS fechadoEm, reaberto_em AS reabertoEm
    FROM caixa_fechamentos WHERE data_caixa = ?
  `).get(dataCaixa) || null;
  const fechado = Boolean(fechamento && !fechamento.reabertoEm);
  return {
    dataCaixa,
    pagamentos,
    movimentos,
    totaisMovimentos: totais,
    saldoEsperado,
    fechamento: fechamento ? {
      ...fechamento,
      fechado,
      divergencia: fechado ? toNumber(fechamento.saldoInformado, 0) - saldoEsperado : null,
    } : null,
    fechado,
    syntax: { disponivel: false, mensagem: "Aguardando acesso oficial a integracao Syntax." },
  };
}

function validarDataCaixa(valor) {
  const data = String(valor || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : "";
}

app.get("/adminn/caixa", requireAdmin, (req, res) => {
  const dataCaixa = validarDataCaixa(req.query.data);
  if (!dataCaixa) return res.status(400).json({ success: false, error: "data_caixa_invalida" });
  return res.json({ success: true, ...montarResumoCaixa(dataCaixa) });
});

app.post("/adminn/caixa/movimentos", requireAdmin, (req, res) => {
  const dataCaixa = validarDataCaixa(req.body?.data);
  const tipo = String(req.body?.tipo || "").trim().toLowerCase();
  const valor = toNumber(req.body?.valor, 0);
  const descricao = String(req.body?.descricao || "").trim().slice(0, 180);
  if (!dataCaixa || !["abertura", "reforco", "sangria"].includes(tipo) || valor <= 0 || valor > 1000000) {
    return res.status(400).json({ success: false, error: "movimento_caixa_invalido" });
  }
  if (montarResumoCaixa(dataCaixa).fechado) {
    return res.status(409).json({ success: false, error: "caixa_fechado" });
  }
  if (tipo === "abertura" && db.prepare(`
    SELECT 1 FROM caixa_movimentos WHERE data_caixa = ? AND tipo = 'abertura' LIMIT 1
  `).get(dataCaixa)) {
    return res.status(409).json({ success: false, error: "abertura_ja_registrada" });
  }
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO caixa_movimentos (data_caixa, tipo, valor, descricao, ator, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(dataCaixa, tipo, valor, descricao || null, obterAtorAdmin(req), now);
  registrarAuditoriaAdmin(req, {
    acao: `caixa_${tipo}_registrado`, entidade: "caixa", entidadeId: info.lastInsertRowid,
    detalhe: { dataCaixa, valor, descricao },
  });
  return res.json({ success: true, id: info.lastInsertRowid, ...montarResumoCaixa(dataCaixa) });
});

app.delete("/adminn/caixa/movimentos/:id", requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movimento = id ? db.prepare("SELECT * FROM caixa_movimentos WHERE id = ?").get(id) : null;
  if (!movimento) return res.status(404).json({ success: false, error: "movimento_nao_encontrado" });
  if (montarResumoCaixa(movimento.data_caixa).fechado) {
    return res.status(409).json({ success: false, error: "caixa_fechado" });
  }
  db.prepare("DELETE FROM caixa_movimentos WHERE id = ?").run(id);
  registrarAuditoriaAdmin(req, {
    acao: "caixa_movimento_excluido", entidade: "caixa", entidadeId: id,
    detalhe: { dataCaixa: movimento.data_caixa, tipo: movimento.tipo, valor: movimento.valor },
  });
  return res.json({ success: true, ...montarResumoCaixa(movimento.data_caixa) });
});

app.post("/adminn/caixa/fechar", requireAdmin, (req, res) => {
  const dataCaixa = validarDataCaixa(req.body?.data);
  const saldoPreenchido = req.body?.saldoInformado !== "" && req.body?.saldoInformado != null;
  const saldoInformado = toNumber(req.body?.saldoInformado, -1);
  const observacao = String(req.body?.observacao || "").trim().slice(0, 300);
  if (!dataCaixa || !saldoPreenchido || saldoInformado < 0 || saldoInformado > 1000000) {
    return res.status(400).json({ success: false, error: "fechamento_caixa_invalido" });
  }
  if (montarResumoCaixa(dataCaixa).fechado) {
    return res.status(409).json({ success: false, error: "caixa_ja_fechado" });
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO caixa_fechamentos
      (data_caixa, saldo_informado, observacao, fechado_por, fechado_em, reaberto_em, updated_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(data_caixa) DO UPDATE SET
      saldo_informado = excluded.saldo_informado,
      observacao = excluded.observacao,
      fechado_por = excluded.fechado_por,
      fechado_em = excluded.fechado_em,
      reaberto_em = NULL,
      updated_at = excluded.updated_at
  `).run(dataCaixa, saldoInformado, observacao || null, obterAtorAdmin(req), now, now);
  registrarAuditoriaAdmin(req, {
    acao: "caixa_fechado", entidade: "caixa", entidadeId: dataCaixa,
    detalhe: { dataCaixa, saldoInformado },
  });
  return res.json({ success: true, ...montarResumoCaixa(dataCaixa) });
});

app.post("/adminn/caixa/reabrir", requireAdmin, (req, res) => {
  const dataCaixa = validarDataCaixa(req.body?.data);
  if (!dataCaixa) return res.status(400).json({ success: false, error: "data_caixa_invalida" });
  const now = new Date().toISOString();
  const info = db.prepare(`
    UPDATE caixa_fechamentos SET reaberto_em = ?, updated_at = ?
    WHERE data_caixa = ? AND reaberto_em IS NULL
  `).run(now, now, dataCaixa);
  if (!info.changes) return res.status(409).json({ success: false, error: "caixa_nao_esta_fechado" });
  registrarAuditoriaAdmin(req, { acao: "caixa_reaberto", entidade: "caixa", entidadeId: dataCaixa });
  return res.json({ success: true, ...montarResumoCaixa(dataCaixa) });
});

app.get("/adminn/relatorio/dados", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM pedidos WHERE status = 'entregue' ORDER BY entregueEm DESC").all();
  const pedidosEntregues = rows.map((row) => ({
    id: row.id,
    cliente: row.cliente,
    telefone: row.telefone,
    endereco: row.endereco,
    tipoEntrega: row.tipoEntrega,
    origemPedido: row.origem_pedido || "",
    pagamento: row.pagamento,
    pagamentosDetalhes: parseMaybeJson(row.pagamento_detalhes) || [],
    carrinho: parseMaybeJson(row.carrinho) || [],
    status: row.status,
    entregador: row.entregador || undefined,
    entregueEm: row.entregueEm || undefined,
    taxaEntrega: row.taxa_entrega || 0,
  }));
  res.json(pedidosEntregues);
});

app.get("/adminn/dashboard/metricas", async (req, res) => {
  try {
    const pedidosAbertos = db
      .prepare("SELECT COUNT(*) AS total FROM pedidos WHERE status != 'entregue'")
      .get()?.total || 0;
    const conversasNovas = db
      .prepare("SELECT COUNT(*) AS total FROM bot_conversas_pendentes WHERE status = 'novo'")
      .get()?.total || 0;
    const tempoMedioAbertosMin = Number(
      db.prepare(`
        SELECT AVG((julianday('now') - julianday(created_at)) * 24 * 60) AS media
        FROM pedidos
        WHERE status != 'entregue' AND created_at IS NOT NULL
      `).get()?.media || 0
    );

    const wppAtual = await consultarStatusWppMonitor();
    return res.json({
      ok: true,
      pedidosAbertos,
      conversasNovas,
      tempoMedioAbertosMin: Number.isFinite(tempoMedioAbertosMin)
        ? Math.max(Math.round(tempoMedioAbertosMin), 0)
        : 0,
      wppStatus: String(wppAtual?.status || "unknown").toUpperCase(),
      wppOk: Boolean(wppAtual?.ok),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Erro ao carregar metricas do dashboard:", err);
    return res.status(500).json({ ok: false, error: "erro_metricas_dashboard" });
  }
});

// ===================== HEALTHCHECK =====================
app.get("/health", async (req, res) => {
  const dbExists = fs.existsSync(dbPath);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((t) => t.name);
  const counts = {};
  tables.forEach((t) => {
    counts[t] = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
  });
  let wpp = {
    configured: wppConfigured(),
    session: WPP_SESSION || "",
    monitor: { ...wppMonitorState },
    current: { status: "not_checked", ok: false },
  };
  if (wpp.configured) {
    const current = await consultarStatusWppMonitor();
    wpp = {
      ...wpp,
      current,
    };
  }

  const pendentes = db.prepare(
    `SELECT status, COUNT(*) as total
     FROM bot_conversas_pendentes
     GROUP BY status`
  ).all();

  res.json({
    ok: true,
    dbExists,
    dbPath,
    tables,
    counts,
    pendentes,
    wpp,
    uptimeSec: Math.round(process.uptime()),
  });
});

// ===================== INICIAR SERVIDOR =====================
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
