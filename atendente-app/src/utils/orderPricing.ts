import type { Catalog, OrderDetails, OrderItem } from "../types";

function canonicalProductName(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\bpromocao\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isXtudo(item: Pick<OrderItem, "nome" | "tipo">) {
  return String(item?.tipo || "").toLowerCase() !== "combo" && canonicalProductName(item?.nome) === "x tudo";
}

export function localItemUnitPrice(item: OrderItem, items: OrderItem[], catalog: Catalog) {
  if (!isXtudo(item)) return Number(item.preco) || 0;
  const promo = (Array.isArray(catalog.cardapio) ? catalog.cardapio : [])
    .find((entry) => entry.tipo === "promocao" && canonicalProductName(entry.nome) === "x tudo" && entry.promocao);
  if (!promo?.promocao) return Number(item.preco) || 0;
  const totalXtudo = (Array.isArray(items) ? items : []).reduce((total, entry) => (
    isXtudo(entry) ? total + Math.max(Number.parseInt(String(entry.qtd), 10) || 0, 0) : total
  ), 0);
  const minimum = Math.max(Number(promo.promocao.min_qtd) || 1, 1);
  return totalXtudo >= minimum
    ? Math.max(Number(promo.promocao.preco_combo) || 0, 0)
    : Math.max(Number(promo.promocao.preco_unidade) || Number(item.preco) || 0, 0);
}

export function calculateLocalOrderSubtotal(
  items: OrderItem[],
  complements: OrderDetails["complementosPedido"],
  catalog: Catalog
) {
  const orderItems = Array.isArray(items) ? items : [];
  const itemTotal = orderItems.reduce((sum, item) => {
    const quantity = Math.max(Number.parseInt(String(item.qtd), 10) || 0, 0);
    const additions = (Array.isArray(item.adicionais) ? item.adicionais : []).reduce((total, additional) => {
      const multiplier = additional.escopo === "total" ? 1 : quantity;
      return total + (Number(additional.preco) || 0) * Math.max(Number(additional.qtd) || 0, 0) * multiplier;
    }, 0);
    return sum + localItemUnitPrice(item, orderItems, catalog) * quantity + additions;
  }, 0);
  const complementTotal = (Array.isArray(complements) ? complements : []).reduce(
    (sum, item) => sum + (Number(item.preco) || 0) * Math.max(Number(item.qtd) || 0, 0),
    0
  );
  return itemTotal + complementTotal;
}
