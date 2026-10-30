import assert from "node:assert/strict";
import { avaliarRespostaEnvioWpp } from "../lib/wpp-response.js";

assert.equal(
  avaliarRespostaEnvioWpp({ status: "success", response: [{ id: "abc" }] }).ok,
  true,
  "resposta de sucesso deve ser aceita"
);

assert.equal(
  avaliarRespostaEnvioWpp({ status: "success", error: {}, response: { id: "abc" } }).ok,
  true,
  "objeto de erro vazio nao deve invalidar um envio confirmado"
);

assert.equal(
  avaliarRespostaEnvioWpp({ status: "Error", message: "Erro ao enviar a mensagem." }).ok,
  false,
  "HTTP 200 com status Error nao pode ser marcado como enviado"
);

assert.equal(
  avaliarRespostaEnvioWpp({ success: false, error: { message: "send failed" } }).ok,
  false,
  "success false deve entrar na fila"
);

assert.equal(
  avaliarRespostaEnvioWpp({ response: [{ isSendFailure: true, to: "5511999999999@c.us" }] }).error,
  "send_failure",
  "falha declarada por destinatario deve ser detectada"
);

assert.equal(
  avaliarRespostaEnvioWpp({ data: { status: "failed", response: [] } }).ok,
  false,
  "erro aninhado deve ser detectado"
);

console.log("Resposta WPPCONNECT: todos os testes passaram.");
