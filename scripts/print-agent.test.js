import test from "node:test";
import assert from "node:assert/strict";

import { gerarTextoPedido, parseNumero, renderizarCupomEscPos } from "./print-agent.js";

const pedido = {
  id: 1489,
  cliente: "Daniel Vieira da Costa",
  telefone: "35992241045",
  endereco: "Rua das Flores, 120",
  tipoEntrega: "Entrega",
  pagamento: "Dinheiro",
  troco: "100,00",
  taxaEntrega: 5,
  desconto: 4,
  cupom: "cliente10",
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
  created_at: "2026-08-25T23:00:00.000Z",
};

test("interpreta valores monetarios brasileiros", () => {
  assert.equal(parseNumero("R$ 1.234,56"), 1234.56);
  assert.equal(parseNumero("100,00"), 100);
});

test("monta cupom organizado com alteracoes, troco e total correto", () => {
  const texto = gerarTextoPedido(pedido);
  assert.match(texto, /PEDIDO #1489/);
  assert.match(texto, /2x X-TUDO/);
  assert.match(texto, /SEM TOMATE/);
  assert.match(texto, /MAIONESE\s+CASEIRA\s+x4 TOTAL/);
  assert.match(texto, /TROCO: R\$ 100,00/);
  assert.match(texto, /Desconto\s+- R\$ 4,00/);
  assert.match(texto, /TOTAL \/ PAGAMENTO/);
  assert.match(texto, /R\$69,00 DINH\./);
});

test("usa subtotal e total oficiais para nao divergir da confirmacao", () => {
  const texto = gerarTextoPedido({
    id: 1490,
    cliente: "Dionatan Franca de Souza",
    telefone: "35984168922",
    endereco: "Rua Joaquim Lopes 533",
    tipoEntrega: "Entrega",
    pagamento: "Pix",
    taxaEntrega: 9,
    subtotal: 50,
    total: 59,
    carrinho: [
      {
        nome: "X-TUDO",
        qtd: 2,
        preco: 25,
        adicionais: [{ nome: "Maionese caseira", qtd: 1, preco: 1, escopo: "total" }],
      },
    ],
    obsGeral: "Um x-tudo e sem pure",
  });

  assert.match(texto, /Subtotal\s+R\$ 50,00/);
  assert.match(texto, /Taxa de entrega\s+R\$ 9,00/);
  assert.match(texto, /R\$59,00 PIX/);
  assert.doesNotMatch(texto, /R\$ 51,00/);
  assert.doesNotMatch(texto, /R\$61,00/);
});

test("inclui comandos ESC-POS de alinhamento, negrito e destaque", () => {
  const raw = renderizarCupomEscPos(pedido);
  assert.ok(raw.includes("\x1ba\x01"));
  assert.ok(raw.includes("\x1bE"));
  assert.ok(raw.includes("\x1d!"));
  assert.ok(raw.includes("\x1d!\x00"));
  assert.ok(!raw.includes("\x1d!\x01"));
  assert.ok(raw.includes("MEGA LANCHES"));
});
