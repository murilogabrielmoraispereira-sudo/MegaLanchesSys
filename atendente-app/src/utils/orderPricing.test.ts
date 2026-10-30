import { describe, expect, it } from "vitest";
import type { Catalog, OrderItem } from "../types";
import { calculateLocalOrderSubtotal, localItemUnitPrice } from "./orderPricing";

const catalog: Catalog = {
  taxaEntrega: 9,
  atualizadoEm: "",
  adicionais: [{ nome: "Maionese caseira", preco: 2 }],
  cardapio: [
    { id: 8, nome: "X-TUDO", preco: 26, categoria: "hamburguer", ingredientes: [], disponivel: true },
    {
      id: "promo-xtudo-8",
      nome: "X-TUDO (Promocao)",
      preco: 26,
      categoria: "promocao",
      ingredientes: [],
      disponivel: true,
      tipo: "promocao",
      promocao: { preco_unidade: 26, preco_combo: 24, min_qtd: 2 },
    },
  ],
};

const item: OrderItem = {
  produtoId: "8",
  nome: "X-TUDO",
  preco: 26,
  qtd: 2,
  adicionais: [],
  removidos: [],
  obs: "",
  tipo: "item",
  categoria: "hamburguer",
};

describe("preco local do pedido", () => {
  it("aplica a promocao ao aumentar manualmente para dois X-Tudo", () => {
    expect(localItemUnitPrice(item, [item], catalog)).toBe(24);
    expect(calculateLocalOrderSubtotal([item], [], catalog) + catalog.taxaEntrega).toBe(57);
  });

  it("mantem o preco unitario para apenas um X-Tudo", () => {
    const single = { ...item, qtd: 1 };
    expect(localItemUnitPrice(single, [single], catalog)).toBe(26);
  });

  it("soma complemento total sem multiplicar pelos lanches", () => {
    expect(calculateLocalOrderSubtotal(
      [item],
      [{ nome: "Maionese caseira", preco: 2, qtd: 2, escopo: "total" }],
      catalog
    )).toBe(52);
  });
});
