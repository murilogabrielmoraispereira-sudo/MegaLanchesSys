import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = 3988;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mega-admin-security-"));
const child = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MEGA_DATA_DIR: dataDir,
    MEGA_TEST_MODE: "1",
    MEGA_SKIP_ENV_FILE: "1",
    ADMIN_PASSWORD: "admin123",
    NODE_ENV: "development",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor nao iniciou.\n${output}`);
}

function setCookies(response) {
  return typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") || ""];
}

try {
  await waitForServer();

  const root = await fetch(`http://127.0.0.1:${port}/adminn`, {
    redirect: "follow",
    headers: { Accept: "text/html" },
  });
  assert.equal(root.status, 200);
  assert.equal(new URL(root.url).pathname, "/adminn/login.html");

  const protectedHtml = await fetch(`http://127.0.0.1:${port}/adminn/painel.html`, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  assert.equal(protectedHtml.status, 302);
  assert.equal(protectedHtml.headers.get("location"), "/adminn/login.html");
  assert.match(protectedHtml.headers.get("cache-control") || "", /no-store/);

  const protectedScript = await fetch(`http://127.0.0.1:${port}/adminn/config.js`, { redirect: "manual" });
  assert.equal(protectedScript.status, 401);
  const protectedApi = await fetch(`http://127.0.0.1:${port}/adminn/ia-local/status`);
  assert.equal(protectedApi.status, 401);

  const fakeCookie = await fetch(`http://127.0.0.1:${port}/adminn/painel.html`, {
    redirect: "manual",
    headers: { Accept: "text/html", Cookie: "admin_session=falso" },
  });
  assert.equal(fakeCookie.status, 302);
  assert.equal(setCookies(fakeCookie).some((cookie) => cookie.includes("admin_session=") && cookie.includes("Max-Age=0")), true);

  const registration = await fetch(`http://127.0.0.1:${port}/adminn/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Admin Teste",
      email: "admin@example.com",
      senhaAtual: "admin123",
      senha: "SenhaSegura123!",
      confirmarSenha: "SenhaSegura123!",
    }),
  });
  assert.equal(registration.status, 201);
  const rawCookies = setCookies(registration);
  assert.equal(rawCookies.some((cookie) => /Max-Age=[1-9]/i.test(cookie)), false, "cookie nao pode sobreviver ao fechamento do navegador");
  assert.equal(rawCookies.every((cookie) => /SameSite=Strict/i.test(cookie)), true);
  assert.equal(rawCookies.find((cookie) => cookie.startsWith("admin_session="))?.includes("HttpOnly"), true);
  const cookie = rawCookies.map((value) => value.split(";")[0]).join("; ");
  const csrf = decodeURIComponent(rawCookies.find((value) => value.startsWith("admin_csrf="))?.split(";")[0].split("=").slice(1).join("=") || "");

  const authenticated = await fetch(`http://127.0.0.1:${port}/adminn/painel.html`, { headers: { Cookie: cookie } });
  assert.equal(authenticated.status, 200);
  const rejectedWithoutCsrf = await fetch(`http://127.0.0.1:${port}/adminn/ia-local/config`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(rejectedWithoutCsrf.status, 403);
  const acceptedWithCsrf = await fetch(`http://127.0.0.1:${port}/adminn/ia-local/config`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(acceptedWithCsrf.status, 200);

  const themeUpdate = await fetch(`http://127.0.0.1:${port}/adminn/cardapio/tema`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify({ tema: "chapa-fogo" }),
  });
  assert.equal(themeUpdate.status, 200);
  assert.equal((await themeUpdate.json()).tema_cardapio, "chapa-fogo");
  const publicConfig = await fetch(`http://127.0.0.1:${port}/config`);
  assert.equal(publicConfig.status, 200);
  assert.equal((await publicConfig.json()).tema_cardapio, "chapa-fogo");

  console.log("admin route security: ok");
} finally {
  if (child.exitCode == null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
