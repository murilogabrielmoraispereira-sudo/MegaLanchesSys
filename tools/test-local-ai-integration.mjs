import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const port = 3987;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mega-local-ai-"));
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

let serverOutput = "";
child.stdout.on("data", (chunk) => { serverOutput += chunk; });
child.stderr.on("data", (chunk) => { serverOutput += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor de teste nao iniciou.\n${serverOutput}`);
}

function responseCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") || ""];
  return values.flatMap((value) => value.split(/,(?=\s*[^;,]+=)/)).map((value) => value.split(";")[0].trim()).filter(Boolean);
}

async function request(url, { cookie = "", csrf = "", ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set("Cookie", cookie);
  if (csrf) headers.set("X-CSRF-Token", csrf);
  const response = await fetch(`http://127.0.0.1:${port}${url}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

try {
  await waitForServer();
  const registration = await request("/adminn/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Teste IA",
      email: "ia@example.com",
      senha: "SenhaLocal123!",
      confirmarSenha: "SenhaLocal123!",
      senhaAtual: "admin123",
    }),
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.data));
  const cookies = responseCookies(registration.response);
  const cookie = cookies.join("; ");
  const csrf = decodeURIComponent(cookies.find((item) => item.startsWith("admin_csrf="))?.split("=").slice(1).join("=") || "");
  assert.ok(cookie.includes("admin_session="));
  assert.ok(csrf);

  const db = new Database(path.join(dataDir, "mega-lanches.db"));
  const insertOrder = db.prepare(`
    INSERT INTO pedidos
      (id, cliente, telefone, endereco, tipoEntrega, pagamento, carrinho, status, created_at, desconto, taxa_entrega)
    VALUES (?, 'Cliente Teste', '35999990000', 'Rua Teste', 'Entrega', 'Pix', ?, 'entregue', ?, 0, 4)
  `);
  insertOrder.run(101, JSON.stringify([{ id: 1, nome: "X-Tudo", qtd: 1, preco: 20 }]), "2026-08-12T20:00:00.000Z");
  insertOrder.run(102, JSON.stringify([{ id: 1, nome: "X-Tudo", qtd: 1, preco: 20 }, { id: 2, nome: "Coca 2L", qtd: 1, preco: 12 }]), "2026-08-12T21:00:00.000Z");
  insertOrder.run(103, JSON.stringify([{ id: 1, nome: "X-Tudo", qtd: 1, preco: 20 }, { id: 2, nome: "Coca 2L", qtd: 1, preco: 12 }]), "2026-08-13T21:00:00.000Z");
  const insertMessage = db.prepare(`
    INSERT INTO local_ai_messages (source, source_id, telefone, nome, texto, received_at)
    VALUES ('test', ?, '5535999990000', 'Cliente Teste', 'manda o brutal', ?)
  `);
  insertMessage.run("m1", "2026-08-12T19:40:00.000Z");
  insertMessage.run("m2", "2026-08-12T19:45:00.000Z");
  insertMessage.run("m3", "2026-08-12T19:50:00.000Z");
  db.close();

  const processed = await request("/adminn/ia-local/processar", {
    method: "POST",
    cookie,
    csrf,
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(processed.response.status, 200, JSON.stringify(processed.data));
  assert.equal(processed.data.orders, 3);
  assert.equal(processed.data.messages, 3);

  const status = await request("/adminn/ia-local/status", { cookie });
  assert.equal(status.data.counts.pedidos, 3);
  assert.equal(status.data.counts.mensagens, 3);
  assert.equal(status.data.counts.clientes, 1);
  assert.equal(status.data.pending.pedidos, 0);

  const customers = await request("/adminn/ia-local/clientes", { cookie });
  assert.equal(customers.data.items[0]?.pedidos, 3);
  assert.equal(customers.data.items[0]?.mensagens, 3);
  assert.equal(customers.data.items[0]?.produtos[0]?.name, "X-Tudo");

  const learnings = await request("/adminn/ia-local/aprendizados", { cookie });
  const brutal = learnings.data.terms.find((item) => item.termo === "brutal" && item.produto === "X-Tudo");
  assert.equal(brutal?.ocorrencias, 3);
  assert.equal(brutal?.confiavel, true);
  assert.equal(learnings.data.pairs.some((item) => item.produtoA === "X-Tudo" && item.produtoB === "Coca 2L"), true);

  console.log("local ai integration: ok");
} finally {
  if (child.exitCode == null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
