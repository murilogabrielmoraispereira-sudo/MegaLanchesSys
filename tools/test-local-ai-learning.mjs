import assert from "node:assert/strict";
import {
  buildLocalOrderSignals,
  extractLocalAiTerms,
  incrementLocalAiCounter,
  localAiConfidence,
  normalizeLocalAiText,
  rankLocalAiCounter,
} from "../lib/local-ai-learning.js";

assert.equal(normalizeLocalAiText("Quero X-Tudo, por favor!"), "quero x tudo por favor");
const terms = extractLocalAiTerms("Oi, manda dois x tudo sem cebola e uma coca 2L");
assert.equal(terms.includes("cebola"), true);
assert.equal(terms.includes("coca"), true);
assert.equal(terms.includes("cebola coca"), true);
assert.equal(terms.includes("quero"), false);

const signals = buildLocalOrderSignals({
  created_at: "2026-08-12T20:00:00.000Z",
  carrinho: [{ id: 3, nome: "X-Tudo", qtd: 2, preco: 18, removidos: ["Cebola"], adicionais: [{ nome: "Bacon" }] }],
  pagamento: "Pix",
  tipoEntrega: "Entrega",
  taxa_entrega: 4,
});
assert.equal(signals.products[0]?.key, "id:3");
assert.equal(signals.products[0]?.quantity, 2);
assert.deepEqual(signals.removals, ["Cebola"]);
assert.deepEqual(signals.additions, ["Bacon"]);
assert.equal(signals.total, 40);

let counter = incrementLocalAiCounter({}, "X-Tudo", 2, "X-Tudo");
counter = incrementLocalAiCounter(counter, "x tudo", 1, "X Tudo");
assert.deepEqual(rankLocalAiCounter(counter, 1), [{ name: "X-Tudo", count: 3 }]);
assert.equal(localAiConfidence(3, 4), 75);

console.log("local ai learning: ok");
