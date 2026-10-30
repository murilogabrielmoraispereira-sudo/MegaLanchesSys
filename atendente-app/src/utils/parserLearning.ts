import type { CatalogProduct, OrderItem, ParserLearningAssociation, ParserRecognition } from "../types";

export function normalizeParserLearningTerm(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/^\s*(?:\d+|um|uma|dois|duas|tres|quatro)\s*(?:x\s*)?/, "")
    .split(/\s+(?:sem|menos|tirar|retirar|com|mais|adicional|partir|partido|cortar|cortado)\b/)[0]
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);
}

export function deriveReplacementLearning(
  initialItems: OrderItem[],
  finalItems: OrderItem[],
  recognitions: ParserRecognition[],
  products: CatalogProduct[]
): ParserLearningAssociation[] {
  const initialProductIds = new Set((Array.isArray(initialItems) ? initialItems : []).map((item) => String(item.produtoId)));
  const finalProductIds = new Set((Array.isArray(finalItems) ? finalItems : []).map((item) => String(item.produtoId)));
  const newlyAddedProducts = (Array.isArray(products) ? products : []).filter((product) =>
    finalProductIds.has(String(product.id)) && !initialProductIds.has(String(product.id))
  );
  const associations = (Array.isArray(recognitions) ? recognitions : []).flatMap((recognition) => {
    const term = normalizeParserLearningTerm(recognition.termo);
    if (!term) return [];
    if (finalProductIds.has(String(recognition.produtoId))) {
      return [{ termo: term, produtoId: String(recognition.produtoId), produtoNome: recognition.produtoNome }];
    }
    if (newlyAddedProducts.length !== 1) return [];
    return [{ termo: term, produtoId: String(newlyAddedProducts[0].id), produtoNome: newlyAddedProducts[0].nome }];
  });
  return associations.filter((item, index, all) => all.findIndex((candidate) =>
    candidate.termo === item.termo && candidate.produtoId === item.produtoId
  ) === index);
}
