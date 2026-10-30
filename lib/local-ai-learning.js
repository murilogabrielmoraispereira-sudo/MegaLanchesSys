const STOP_WORDS = new Set([
  "a", "ai", "ao", "aos", "as", "ate", "com", "como", "da", "das", "de", "do", "dos",
  "e", "ela", "ele", "em", "essa", "esse", "esta", "este", "eu", "favor", "ja", "la", "mais",
  "me", "meu", "minha", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela", "pelo",
  "por", "pra", "pro", "que", "quero", "se", "sem", "sim", "so", "tem", "um", "uma", "vai",
  "voce", "vcs", "ola", "oi", "bom", "boa", "dia", "tarde", "noite", "obrigado", "obrigada",
]);

export function normalizeLocalAiText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b\d{8,}\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function extractLocalAiTerms(text, { limit = 32 } = {}) {
  const tokens = normalizeLocalAiText(text)
    .split(" ")
    .filter((token) => token.length >= 3 && token.length <= 32 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
  const terms = [];
  const seen = new Set();
  const add = (term) => {
    if (!term || seen.has(term) || terms.length >= limit) return;
    seen.add(term);
    terms.push(term);
  };
  tokens.forEach(add);
  for (let index = 0; index < tokens.length - 1 && terms.length < limit; index += 1) {
    add(`${tokens[index]} ${tokens[index + 1]}`);
  }
  return terms;
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

function isComplement(item) {
  return normalizeLocalAiText(item?.tipo).includes("complemento");
}

function namesFromList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => String(item?.nome ?? item ?? "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

export function buildLocalOrderSignals(order = {}) {
  const products = [];
  const additions = [];
  const removals = [];
  let subtotal = 0;

  parseCart(order.carrinho).forEach((item) => {
    if (!item || isComplement(item)) return;
    const name = String(item.nome || "").trim();
    if (!name) return;
    const quantity = Math.min(Math.max(Number(item.qtd) || 1, 1), 99);
    const id = String(item.produtoId ?? item.produto_id ?? item.id ?? "").trim();
    const key = id ? `id:${id}` : `nome:${normalizeLocalAiText(name)}`;
    products.push({ key, id, name, quantity });
    subtotal += Math.max(Number(item.preco) || 0, 0) * quantity;
    namesFromList(item.adicionais).forEach((value) => additions.push(value));
    namesFromList(item.removidos).forEach((value) => removals.push(value));
  });

  const when = new Date(order.created_at || Date.now());
  const validDate = Number.isFinite(when.getTime()) ? when : new Date();
  const discount = Math.max(Number(order.desconto) || 0, 0);
  const deliveryFee = Math.max(Number(order.taxa_entrega) || 0, 0);
  return {
    products,
    additions,
    removals,
    payment: String(order.pagamento || "").trim(),
    fulfillment: String(order.tipoEntrega || "").trim(),
    hour: validDate.getHours(),
    weekday: validDate.getDay(),
    total: Math.max(subtotal - discount + deliveryFee, 0),
  };
}

export function incrementLocalAiCounter(source, key, amount = 1, displayName = "") {
  const normalizedKey = normalizeLocalAiText(key);
  if (!normalizedKey) return source || {};
  const target = source && typeof source === "object" && !Array.isArray(source) ? { ...source } : {};
  const current = target[normalizedKey] || { name: displayName || String(key), count: 0 };
  target[normalizedKey] = {
    name: String(current.name || displayName || key),
    count: Math.max(Number(current.count) || 0, 0) + Math.max(Number(amount) || 0, 0),
  };
  return target;
}

export function rankLocalAiCounter(source, limit = 5) {
  return Object.values(source && typeof source === "object" ? source : {})
    .map((item) => ({ name: String(item?.name || ""), count: Math.max(Number(item?.count) || 0, 0) }))
    .filter((item) => item.name && item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function localAiConfidence(hits, total) {
  const safeHits = Math.max(Number(hits) || 0, 0);
  const safeTotal = Math.max(Number(total) || 0, 0);
  return safeTotal ? Number(((safeHits / safeTotal) * 100).toFixed(1)) : 0;
}

export function localAiRecencyWeight(occurredAt, now = new Date(), halfLifeDays = 45) {
  const occurred = new Date(occurredAt);
  const reference = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(occurred.getTime()) || !Number.isFinite(reference.getTime())) return 0;
  const ageDays = Math.max((reference.getTime() - occurred.getTime()) / 86400000, 0);
  const halfLife = Math.max(Number(halfLifeDays) || 45, 1);
  return Number(Math.pow(0.5, ageDays / halfLife).toFixed(6));
}

export function scoreRecentLocalAiProducts(events, { now = new Date(), halfLifeDays = 45, limit = 8 } = {}) {
  const ranked = new Map();
  (Array.isArray(events) ? events : []).forEach((event) => {
    const key = String(event?.product_key || event?.key || "").trim();
    const name = String(event?.product_name || event?.name || "").trim();
    if (!key || !name) return;
    const weight = localAiRecencyWeight(event?.occurred_at || event?.occurredAt, now, halfLifeDays);
    if (!weight) return;
    const current = ranked.get(key) || { key, name, score: 0, quantity: 0, orders: 0, lastSeenAt: "" };
    current.name = name;
    current.score += weight * Math.max(Number(event?.quantity) || 1, 1);
    current.quantity += Math.max(Number(event?.quantity) || 1, 1);
    current.orders += 1;
    current.lastSeenAt = [current.lastSeenAt, event?.occurred_at || event?.occurredAt].filter(Boolean).sort().pop() || "";
    ranked.set(key, current);
  });
  return Array.from(ranked.values())
    .map((item) => ({ ...item, score: Number(item.score.toFixed(4)) }))
    .sort((a, b) => b.score - a.score || b.orders - a.orders || a.name.localeCompare(b.name))
    .slice(0, Math.max(Number(limit) || 1, 1));
}

export function localAiPredictionConfidence({ orderShare = 0, recentShare = 0, evaluated = 0, hits = 0, sampleSize = 0 } = {}) {
  const frequency = Math.min(Math.max((Number(recentShare) || 0) * 0.65 + (Number(orderShare) || 0) * 0.35, 0), 1);
  const evaluationCount = Math.max(Number(evaluated) || 0, 0);
  const precision = evaluationCount ? Math.min(Math.max((Number(hits) || 0) / evaluationCount, 0), 1) : 0.5;
  const reliability = evaluationCount >= 3 ? 0.65 + (precision * 0.35) : 0.85;
  const evidence = Math.max(Number(sampleSize) || 0, 0);
  const sampleReliability = evidence ? 0.35 + (Math.min(evidence, 8) / 8) * 0.65 : 0.35;
  return Math.min(Math.max(Math.round(frequency * reliability * sampleReliability * 100), frequency ? 1 : 0), 97);
}

export function detectLocalAiHabitChange(recentProducts, historicalProducts) {
  const recent = Array.isArray(recentProducts) ? recentProducts : [];
  const historical = Array.isArray(historicalProducts) ? historicalProducts : [];
  const recentTop = recent[0];
  const historicalTop = historical[0];
  if (!recentTop || !historicalTop || Number(recentTop.orders || 0) < 2) return null;
  if (normalizeLocalAiText(recentTop.name) === normalizeLocalAiText(historicalTop.name)) return null;
  return {
    changed: true,
    previous: historicalTop.name,
    current: recentTop.name,
    recentOrders: Number(recentTop.orders || 0),
    message: `Preferencia recente mudou de ${historicalTop.name} para ${recentTop.name}.`,
  };
}
