import "../public/pricing.js";

export function isTotalAdditional(additional) {
  return String(additional?.escopo || "").trim().toLowerCase() === "total";
}

function normalizeAdditionalName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOrderLevelComplement(additional) {
  const name = normalizeAdditionalName(additional?.nome);
  return /\bmaionese\b/.test(name) || /\bketchup\b/.test(name);
}

export function separateOrderLevelComplements(items, complements = []) {
  const merged = new Map();
  const addComplement = (additional) => {
    const name = String(additional?.nome || "").trim();
    const quantity = Math.max(Number.parseInt(additional?.qtd, 10) || 0, 0);
    if (!name || !quantity) return;
    const key = normalizeAdditionalName(name);
    const current = merged.get(key);
    merged.set(key, {
      ...additional,
      nome: current?.nome || name,
      preco: Number(current?.preco ?? additional?.preco) || 0,
      qtd: (current?.qtd || 0) + quantity,
      escopo: "total",
    });
  };

  (Array.isArray(complements) ? complements : []).forEach(addComplement);
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) => {
    const kept = [];
    (Array.isArray(item?.adicionais) ? item.adicionais : []).forEach((additional) => {
      const scope = String(additional?.escopo || "").trim().toLowerCase();
      if (isOrderLevelComplement(additional) && scope !== "unidade") addComplement(additional);
      else kept.push(additional);
    });
    return { ...item, adicionais: kept };
  });

  return { items: normalizedItems, complements: Array.from(merged.values()) };
}

export function calculateCartSubtotal(cart) {
  return globalThis.MegaPricing.subtotal(cart);
}
