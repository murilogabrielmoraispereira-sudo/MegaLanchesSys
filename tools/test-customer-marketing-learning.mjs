import assert from "node:assert/strict";
import {
  buildProductInterestReport,
  createCatalogProductResolver,
  resolveCatalogProduct,
  summarizeCustomerPreferences,
} from "../lib/customer-marketing-learning.js";

const catalog = [
  { id: 12, nome: "X-Tudo", categoria: "Lanches", img: "/x-tudo.webp" },
  { id: "beb-2", nome: "Coca-Cola 2L", categoria: "Bebidas" },
];
const resolver = createCatalogProductResolver(catalog);
assert.equal(resolveCatalogProduct({ produtoId: "12" }, resolver)?.nome, "X-Tudo");
assert.equal(resolveCatalogProduct({ nome: "x tudo" }, resolver)?.id, 12);

const report = buildProductInterestReport({
  catalog,
  interactions: [
    { produtoId: "12", produtoNome: "X-Tudo", visitanteId: "a", visualizacoes: 2, adicoesCarrinho: 1 },
    { produtoId: "id-antigo", produtoNome: "X Tudo", visitanteId: "a", visualizacoes: 1, adicoesCarrinho: 1 },
    { produtoId: "id-antigo", produtoNome: "X Tudo", visitanteId: "b", visualizacoes: 3, adicoesCarrinho: 0 },
    { produtoId: "combo-inativo-4", produtoNome: "Combo antigo", visitanteId: "c", visualizacoes: 1, adicoesCarrinho: 1 },
  ],
  orders: [
    { carrinho: JSON.stringify([{ nome: "X Tudo", qtd: 2 }]) },
    { carrinho: [{ produtoId: "12", nome: "X-Tudo", qtd: 1 }, { nome: "Coca-Cola 2L", qtd: 2 }] },
    { carrinho: [{ nome: "Taxa", qtd: 1, tipo: "complemento_pedido" }] },
    { carrinho: [{ nome: "Combo antigo", qtd: 1, tipo: "combo" }] },
  ],
});
const xtudo = report.find((item) => item.produtoId === "12");
assert.deepEqual(
  { views: xtudo?.visualizacoes, carts: xtudo?.adicoesCarrinho, visitors: xtudo?.visitantes, sold: xtudo?.vendidos },
  { views: 6, carts: 2, visitors: 2, sold: 3 }
);
assert.equal(report.find((item) => item.produtoId === "beb-2")?.vendidos, 2, "compra sem visualizacao deve aparecer");
const oldCombo = report.find((item) => item.produtoNome === "Combo antigo");
assert.equal(oldCombo?.vendidos, 1, "produto inativo deve reconciliar interacao e compra pelo nome");
assert.equal(oldCombo?.visualizacoes, 1);

const preferences = summarizeCustomerPreferences([
  { carrinho: [{ nome: "X-Tudo", qtd: 1, removidos: ["Cebola"], adicionais: [{ nome: "Bacon" }] }], pagamento: "pix", tipoEntrega: "Entrega" },
  { carrinho: [{ nome: "X-Tudo", qtd: 2, removidos: ["Cebola"], adicionais: [{ nome: "Bacon" }] }], pagamento: "pix", tipoEntrega: "Entrega" },
  { carrinho: [{ nome: "Coca-Cola 2L", qtd: 1 }], pagamento: "cartao", tipoEntrega: "Retirada" },
]);
assert.equal(preferences.produtosFavoritos[0]?.nome, "X-Tudo");
assert.equal(preferences.produtosFavoritos[0]?.qtd, 3);
assert.deepEqual(
  preferences.preferenciasRecorrentes.map((item) => [item.tipo, item.nome, item.ocorrencias]),
  [["adicionar", "Bacon", 2], ["remover", "Cebola", 2]]
);
assert.equal(preferences.formaPagamentoFavorita, "pix");
assert.equal(preferences.tipoEntregaFavorito, "Entrega");

console.log("customer marketing learning: ok");
