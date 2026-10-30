import assert from "node:assert/strict";
import { chooseActiveAliasCandidate, summarizeParserObservation } from "../lib/parser-learning.js";

assert.equal(chooseActiveAliasCandidate([{ produto_id: "1", confirmacoes: 2 }]).productId, "");
assert.equal(chooseActiveAliasCandidate([{ produto_id: "1", confirmacoes: 3 }]).productId, "1");
assert.equal(chooseActiveAliasCandidate([
  { produto_id: "1", confirmacoes: 4 },
  { produto_id: "2", confirmacoes: 3 },
]).reason, "conflicting_products");
assert.equal(chooseActiveAliasCandidate([
  { produto_id: "1", confirmacoes: 6, usos: 5, acertos: 2, erros: 3 },
]).reason, "low_accuracy");
assert.equal(chooseActiveAliasCandidate([
  { produto_id: "1", confirmacoes: 7, usos: 5, acertos: 4, erros: 1 },
  { produto_id: "2", confirmacoes: 3 },
]).productId, "1");

const observation = summarizeParserObservation({
  initialItems: [{ produtoId: "2", qtd: 1, removidos: [], adicionais: [] }],
  finalItems: [{ produtoId: "2", qtd: 2, removidos: ["Cebola"], adicionais: [{ nome: "Bacon", qtd: 1 }], obs: "nao guardar" }],
  ambiguities: 1,
});
assert.equal(observation.changed, true);
assert.equal(observation.finalUnits, 2);
assert.equal(observation.finalModifiers, 2);
assert.doesNotMatch(observation.finalJson, /nao guardar/);

console.log("Aprendizado do interpretador: todos os testes passaram.");
