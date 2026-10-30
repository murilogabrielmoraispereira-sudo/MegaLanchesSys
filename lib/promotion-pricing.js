function canonicalProductName(value) {
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

export function isXtudoPromotionItem(item) {
  if (!item || String(item.tipo || "").trim().toLowerCase() === "combo") return false;
  return canonicalProductName(item.nome) === "x tudo";
}

export function applyXtudoPromotionPricing(items, config = {}) {
  if (!Array.isArray(items)) return [];
  const minimum = Math.max(Number.parseInt(config.minimum, 10) || 1, 1);
  const unitPrice = Math.max(Number(config.unitPrice) || 0, 0);
  const promotionalPrice = Math.max(Number(config.promotionalPrice) || 0, 0);
  const totalXtudo = items.reduce((total, item) => (
    isXtudoPromotionItem(item)
      ? total + Math.max(Number.parseInt(item.qtd, 10) || 0, 0)
      : total
  ), 0);
  const price = totalXtudo >= minimum ? promotionalPrice : unitPrice;

  return items.map((item) => (
    isXtudoPromotionItem(item) ? { ...item, preco: price } : { ...item }
  ));
}
