import assert from "node:assert/strict";
import {
  gerarVariantesWhatsappBrasil,
  normalizarTelefoneBrasil,
  normalizePhoneNumber,
} from "../lib/telefone-brasil.js";

const options = { dddPadrao: "35" };

const casos = [
  ["celular atual com DDD 35", "35984658681", "35984658681", "5535984658681", "celular", false],
  ["celular atual formatado", "(35) 98465-8681", "35984658681", "5535984658681", "celular", false],
  ["celular antigo com DDD", "3584658681", "3584658681", "553584658681", "celular", false],
  ["celular de outro DDD", "11987654321", "11987654321", "5511987654321", "celular", false],
  ["outro DDD formatado", "(16) 99123-4567", "16991234567", "5516991234567", "celular", false],
  ["codigo do pais formatado", "+55 35 98465-8681", "35984658681", "5535984658681", "celular", false],
  ["codigo do pais sem formatacao", "5535984658681", "35984658681", "5535984658681", "celular", false],
  ["numero sem DDD", "98465-8681", "35984658681", "5535984658681", "celular", false],
  ["telefone fixo", "3535211234", "3535211234", "553535211234", "fixo", false],
  ["pontuacao no final", "35984658681!", "35984658681", "5535984658681", "celular", false],
  ["nono digito ja existente", "35984658681", "35984658681", "5535984658681", "celular", false],
  ["DDD diferente do padrao", "21987654321", "21987654321", "5521987654321", "celular", false],
];

for (const [nome, entrada, nacional, internacional, tipo, nonoInserido] of casos) {
  const resultado = normalizarTelefoneBrasil(entrada, options);
  assert.equal(resultado.valido, true, `${nome}: deveria ser valido (${resultado.erro})`);
  assert.equal(resultado.nacional, nacional, `${nome}: nacional`);
  assert.equal(resultado.internacional, internacional, `${nome}: internacional`);
  assert.equal(resultado.whatsapp, internacional, `${nome}: whatsapp`);
  assert.equal(resultado.tipo, tipo, `${nome}: tipo`);
  assert.equal(resultado.nonoInserido, nonoInserido, `${nome}: nonoInserido`);
  assert.equal(normalizePhoneNumber(entrada, options), internacional, `${nome}: normalizePhoneNumber`);
}

const dddInvalido = normalizarTelefoneBrasil("10987654321", options);
assert.equal(dddInvalido.valido, false, "DDD 10 deve ser invalido");
assert.equal(dddInvalido.erro, "ddd_invalido");

const semNono = normalizarTelefoneBrasil("3584168922", options);
assert.equal(semNono.valido, true, "numero sem nono digito deve ser aceito sem alterar");
assert.equal(semNono.nacional, "3584168922");
assert.equal(semNono.nonoInserido, false, "numero sem nono nao deve receber 9 automatico");

const comUmNove = normalizarTelefoneBrasil("35984168922", options);
assert.equal(comUmNove.valido, true, "numero com um 9 deve ser aceito sem duplicar");
assert.equal(comUmNove.nacional, "35984168922");

const comNoveExtra = normalizarTelefoneBrasil("359984168922", options);
assert.equal(comNoveExtra.valido, true, "numero com dois 9 deve ser aceito como informado");
assert.equal(comNoveExtra.nacional, "359984168922");

assert.deepEqual(
  gerarVariantesWhatsappBrasil("3584168922", options),
  ["553584168922", "5535984168922"],
  "sem nono digito deve checar sem 9 e com um 9, sem inventar dois 9"
);

assert.deepEqual(
  gerarVariantesWhatsappBrasil("35984168922", options),
  ["553584168922", "5535984168922"],
  "um nono digito deve checar sem 9 e com um 9, sem inventar dois 9"
);

assert.deepEqual(
  gerarVariantesWhatsappBrasil("359984168922", options),
  ["553584168922", "5535984168922", "55359984168922"],
  "dois 9 informados pelo cliente devem entrar apenas como tentativa original"
);

assert.deepEqual(
  gerarVariantesWhatsappBrasil("359884658681", options),
  ["5535884658681", "55359884658681"],
  "um 9 informado nao deve gerar automaticamente dois 9"
);

assert.deepEqual(
  gerarVariantesWhatsappBrasil("3599884658681", options),
  ["5535884658681", "55359884658681", "553599884658681"],
  "deve lidar com dois 9 informados pelo cliente"
);

console.log("Telefone Brasil: todos os testes passaram.");
