function normalizeAnalyticsText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function productTypeIsComplement(item) {
  return normalizeAnalyticsText(item?.tipo).includes("complemento");
}

export function createCatalogProductResolver(catalog = []) {
  const byId = new Map();
  const byName = new Map();
  (Array.isArray(catalog) ? catalog : []).forEach((product) => {
    const id = String(product?.id ?? product?.produtoId ?? "").trim();
    const name = normalizeAnalyticsText(product?.nome);
    if (id) byId.set(id, product);
    if (name && !byName.has(name)) byName.set(name, product);
  });
  return { byId, byName };
}

export function resolveCatalogProduct(candidate, resolver) {
  const id = String(candidate?.produtoId ?? candidate?.produto_id ?? candidate?.id ?? "").trim();
  if (id && resolver?.byId?.has(id)) return resolver.byId.get(id);
  const name = normalizeAnalyticsText(candidate?.produtoNome ?? candidate?.produto_nome ?? candidate?.nome);
  return name ? resolver?.byName?.get(name) || null : null;
}

function parseCart(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildProductInterestReport({ catalog = [], interactions = [], orders = [] } = {}) {
  const resolver = createCatalogProductResolver(catalog);
  const buckets = new Map();

  const ensureBucket = (candidate) => {
    const current = resolveCatalogProduct(candidate, resolver);
    const fallbackName = String(candidate?.produtoNome ?? candidate?.produto_nome ?? candidate?.nome ?? "Produto").trim();
    const fallbackId = String(candidate?.produtoId ?? candidate?.produto_id ?? candidate?.id ?? "").trim();
    const nameKey = normalizeAnalyticsText(fallbackName) || "produto";
    const key = current ? `id:${String(current.id)}` : fallbackName ? `name:${nameKey}` : `legacy:${fallbackId}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        produtoId: current ? String(current.id) : fallbackId || `legacy_${nameKey.replace(/\s+/g, "_")}`,
        produtoNome: String(current?.nome || fallbackName || "Produto"),
        categoria: String(current?.categoria || candidate?.categoria || ""),
        img: String(current?.img || ""),
        visualizacoes: 0,
        adicoesCarrinho: 0,
        vendidos: 0,
        visitantesSet: new Set(),
        ultimaInteracao: "",
      });
    }
    return buckets.get(key);
  };

  (Array.isArray(interactions) ? interactions : []).forEach((row) => {
    const bucket = ensureBucket(row);
    bucket.visualizacoes += Math.max(Number(row?.visualizacoes) || 0, 0);
    bucket.adicoesCarrinho += Math.max(Number(row?.adicoesCarrinho ?? row?.adicoes_carrinho) || 0, 0);
    const visitor = String(row?.visitanteId ?? row?.visitante_id ?? "").trim();
    if (visitor) bucket.visitantesSet.add(visitor);
    const last = String(row?.ultimaInteracao ?? row?.ultima_interacao ?? "");
    if (last > bucket.ultimaInteracao) bucket.ultimaInteracao = last;
  });

  (Array.isArray(orders) ? orders : []).forEach((order) => {
    parseCart(order?.carrinho).forEach((item) => {
      if (!item || productTypeIsComplement(item) || !String(item.nome || "").trim()) return;
      ensureBucket(item).vendidos += Math.max(Number(item.qtd) || 1, 1);
    });
  });

  return Array.from(buckets.values())
    .map(({ visitantesSet, ...item }) => ({
      ...item,
      visitantes: visitantesSet.size,
      taxaInteresse: item.visualizacoes > 0
        ? Number(((item.adicoesCarrinho / item.visualizacoes) * 100).toFixed(1))
        : 0,
    }))
    .sort((a, b) => b.visualizacoes - a.visualizacoes || b.adicoesCarrinho - a.adicoesCarrinho || b.vendidos - a.vendidos || a.produtoNome.localeCompare(b.produtoNome));
}

function rankedValues(map, limit = 3) {
  return Array.from(map.values())
    .sort((a, b) => b.pedidos - a.pedidos || b.qtd - a.qtd || a.nome.localeCompare(b.nome))
    .slice(0, limit);
}

export function summarizeCustomerPreferences(orders = []) {
  const products = new Map();
  const additions = new Map();
  const removals = new Map();
  const payments = new Map();
  const fulfillment = new Map();
  const validOrders = Array.isArray(orders) ? orders : [];

  const incrementChoice = (map, rawName) => {
    const name = String(rawName || "").trim();
    const key = normalizeAnalyticsText(name);
    if (!key) return;
    const current = map.get(key) || { nome: name, pedidos: 0 };
    current.pedidos += 1;
    map.set(key, current);
  };

  validOrders.forEach((order) => {
    const seenProducts = new Set();
    const seenAdditions = new Set();
    const seenRemovals = new Set();
    parseCart(order?.carrinho).forEach((item) => {
      if (!item || productTypeIsComplement(item)) return;
      const name = String(item.nome || "").trim();
      const key = normalizeAnalyticsText(name);
      if (key) {
        const current = products.get(key) || { nome: name, qtd: 0, pedidos: 0 };
        current.qtd += Math.max(Number(item.qtd) || 1, 1);
        if (!seenProducts.has(key)) current.pedidos += 1;
        seenProducts.add(key);
        products.set(key, current);
      }
      (Array.isArray(item.adicionais) ? item.adicionais : []).forEach((addition) => {
        const additionName = String(addition?.nome ?? addition ?? "").trim();
        const additionKey = normalizeAnalyticsText(additionName);
        if (additionKey && !seenAdditions.has(additionKey)) {
          incrementChoice(additions, additionName);
          seenAdditions.add(additionKey);
        }
      });
      (Array.isArray(item.removidos) ? item.removidos : []).forEach((removal) => {
        const removalName = String(removal?.nome ?? removal ?? "").trim();
        const removalKey = normalizeAnalyticsText(removalName);
        if (removalKey && !seenRemovals.has(removalKey)) {
          incrementChoice(removals, removalName);
          seenRemovals.add(removalKey);
        }
      });
    });
    incrementChoice(payments, order?.pagamento);
    incrementChoice(fulfillment, order?.tipoEntrega);
  });

  const baseOrders = validOrders.length;
  const recurring = (map, type) => rankedValues(map, 5)
    .filter((item) => item.pedidos >= 2)
    .map((item) => ({
      tipo: type,
      nome: item.nome,
      ocorrencias: item.pedidos,
      confianca: baseOrders ? Number(((item.pedidos / baseOrders) * 100).toFixed(0)) : 0,
    }));
  return {
    pedidosAnalisados: baseOrders,
    produtosFavoritos: rankedValues(products, 3),
    preferenciasRecorrentes: [...recurring(removals, "remover"), ...recurring(additions, "adicionar")]
      .sort((a, b) => b.ocorrencias - a.ocorrencias || a.nome.localeCompare(b.nome))
      .slice(0, 6),
    formaPagamentoFavorita: rankedValues(payments, 1)[0]?.nome || "",
    tipoEntregaFavorito: rankedValues(fulfillment, 1)[0]?.nome || "",
  };
}

export { normalizeAnalyticsText };
