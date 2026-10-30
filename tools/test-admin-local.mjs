import fs from "node:fs";
import assert from "node:assert/strict";

const SAO_PAULO_TZ = "America/Sao_Paulo";

function dataKeySaoPaulo(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function isPedidoHojeSaoPaulo(pedido, now) {
  return dataKeySaoPaulo(pedido.created_at) === dataKeySaoPaulo(now);
}

function ordenarPedidosRecentes(pedidos) {
  return [...pedidos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const now = new Date("2026-06-27T23:00:00.000Z"); // 20:00 em Sao Paulo
const pedidos = [
  { id: "26-2350", created_at: "2026-06-27T02:50:00.000Z" }, // 26/06 23:50 SP
  { id: "26-2359", created_at: "2026-06-27T02:59:00.000Z" }, // 26/06 23:59 SP
  { id: "27-0000", created_at: "2026-06-27T03:00:00.000Z" }, // 27/06 00:00 SP
  { id: "27-0010", created_at: "2026-06-27T03:10:00.000Z" }, // 27/06 00:10 SP
  { id: "27-2000", created_at: "2026-06-27T23:00:00.000Z" }, // 27/06 20:00 SP
];

const hoje = ordenarPedidosRecentes(pedidos.filter((pedido) => isPedidoHojeSaoPaulo(pedido, now)));
assert.deepEqual(hoje.map((pedido) => pedido.id), ["27-2000", "27-0010", "27-0000"]);

const virada = new Date("2026-06-28T03:00:00.000Z"); // 28/06 00:00 SP
assert.equal(dataKeySaoPaulo(now), "2026-06-27");
assert.equal(dataKeySaoPaulo(virada), "2026-06-28");
assert.equal(isPedidoHojeSaoPaulo({ created_at: "2026-06-27T23:59:00.000Z" }, virada), false);

const indexHtml = fs.readFileSync("public/index.html", "utf8");
assert.equal(indexHtml.includes("theme-toggle"), false);
assert.equal(indexHtml.includes("Tema Copa Brasil</button>"), false);

const copaCss = fs.readFileSync("public/themes/copa-brasil.css", "utf8");
["theme-copa-brasil", "bandeira-brasil-copa.png", "#ffd32a", "#1f64ff", "⚽"].forEach((term) => {
  assert.equal(copaCss.includes(term), true, `Tema Copa Brasil sem termo esperado: ${term}`);
});
assert.equal(fs.existsSync("public/img/bandeira-brasil-copa.png"), true);

const chapaFogoCss = fs.readFileSync("public/themes/chapa-fogo.css", "utf8");
["theme-chapa-fogo", "#ff5a1f", "CHAPA QUENTE", ".menu-item", ".modal-content"].forEach((term) => {
  assert.equal(chapaFogoCss.includes(term), true, `Tema Chapa & Fogo sem termo esperado: ${term}`);
});
assert.equal(indexHtml.includes("themes/chapa-fogo.css"), true);
assert.equal(indexHtml.includes("Tema Chapa & Fogo"), false, "cliente nao deve possuir seletor de tema");
const publicScript = fs.readFileSync("public/script.js", "utf8");
assert.equal(publicScript.includes('theme === "chapa-fogo"'), true);
const adminConfigHtml = fs.readFileSync("public/adminn/config.html", "utf8");
assert.equal(adminConfigHtml.includes('value="chapa-fogo"'), true);

console.log("Testes locais admin/cardapio OK");
