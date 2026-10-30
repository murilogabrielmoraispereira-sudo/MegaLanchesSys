import { describe, expect, it } from "vitest";
import type { CatalogProduct, OrderItem, ParserRecognition } from "../types";
import { deriveReplacementLearning, normalizeParserLearningTerm } from "./parserLearning";

const item = (produtoId: string): OrderItem => ({
  produtoId,
  nome: produtoId,
  preco: 0,
  qtd: 1,
  adicionais: [],
  removidos: [],
  obs: "",
  tipo: "item",
  categoria: "lanches",
});
const products: CatalogProduct[] = [
  { id: "1", nome: "X-Tudo", preco: 0, categoria: "lanches", ingredientes: [], disponivel: true },
  { id: "2", nome: "X-Bacon", preco: 0, categoria: "lanches", ingredientes: [], disponivel: true },
  { id: "3", nome: "X-Egg", preco: 0, categoria: "lanches", ingredientes: [], disponivel: true },
];
const recognition: ParserRecognition = {
  termo: "xis bacam",
  produtoId: "1",
  produtoNome: "X-Tudo",
  source: "fuzzy",
};

describe("deriveReplacementLearning", () => {
  it("aprende uma substituicao inequivoca confirmada na revisao", () => {
    expect(deriveReplacementLearning([item("1")], [item("2")], [recognition], products)).toEqual([
      { termo: "xis bacam", produtoId: "2", produtoNome: "X-Bacon" },
    ]);
  });

  it("nao aprende quando mais de um produto novo pode ser a correcao", () => {
    expect(deriveReplacementLearning([item("1")], [item("2"), item("3")], [recognition], products)).toEqual([]);
  });

  it("aprende reconhecimento aproximado aceito sem exigir troca manual", () => {
    expect(deriveReplacementLearning([item("1")], [item("1")], [recognition], products)).toEqual([
      { termo: "xis bacam", produtoId: "1", produtoNome: "X-Tudo" },
    ]);
  });

  it("limpa quantidade e modificadores antes de salvar um apelido", () => {
    expect(normalizeParserLearningTerm("2 x frangoo sem pure + maionese")).toBe("frangoo");
  });
});
