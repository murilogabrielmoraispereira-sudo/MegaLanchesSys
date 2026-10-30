import type {
  Catalog,
  CatalogAdditional,
  CatalogProduct,
  InterpretationResult,
  OrderAdditional,
  OrderComplement,
  OrderItem,
} from "../types";

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20,
};

const QUANTITY_WORDS = Object.keys(NUMBER_WORDS).join("|");
const RETIRADA_PATTERN = /\b(pegar\s+no\s+local|vai\s+buscar|retirada|retirar|retira|buscar|busca|pegar|pega)\b/;
const NA_PORTA_PATTERN = /\b(na\s+porta|porta|pedido\s+na\s+porta|cliente\s+na\s+porta|balcao|no\s+balcao|presencial|cliente\s+aqui|comer\s+aqui)\b/;
const ADDRESS_START = /\b(rua|r|avenida|av|travessa|praca|rodovia|estrada|bairro|numero|n|endereco|end)\b/;

export function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(^|\s)-\s*(?=[a-z])/g, "$1 sem ")
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/\+/g, " mais ")
    .replace(/n[º°]/g, "numero")
    .replace(/[^a-z0-9.,/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalText(value: unknown) {
  return normalizeText(value)
    .replace(/coca\s+cola/g, "coca")
    .replace(/dois\s+litros?/g, "2l")
    .replace(/um\s+litro/g, "1l")
    .replace(/(\d+)\s*lts?\b/g, "$1l")
    .replace(/(\d+)\s*litros?/g, "$1l")
    .replace(/(\d+)\s*l\b/g, "$1l")
    .replace(/porcao\s+de\s+/g, "")
    .replace(/\bx\s+(?=[a-z])/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingXAlias(value: string) {
  return canonicalText(value)
    .replace(/^x(?=[a-z])/, "")
    .replace(/^x\s+/, "")
    .trim();
}

function compact(value: unknown) {
  return canonicalText(value).replace(/\s+/g, "");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function levenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

function quantityFromChunk(chunk: string) {
  const text = canonicalText(chunk);
  const prefix = text.match(/^(\d+)\s*x?(?:\s+|$)/);
  if (prefix) return Math.max(parseInt(prefix[1], 10), 1);
  const units = text.match(/^(\d+)\s+unidades?\s+de\s+/);
  if (units) return Math.max(parseInt(units[1], 10), 1);
  const word = text.match(new RegExp(`^(${QUANTITY_WORDS})(?:\\s+(?:lanches?|unidades?)(?:\\s+de)?)?\\s+`));
  if (word) return NUMBER_WORDS[word[1]] || 1;
  const suffix = text.match(/\bx\s*(\d+)\b/);
  return suffix ? Math.max(parseInt(suffix[1], 10), 1) : 1;
}

function modificationVocabulary(products: CatalogProduct[], additionals: CatalogAdditional[]) {
  const terms = new Set<string>();
  products.forEach((product) => {
    (Array.isArray(product.ingredientes) ? product.ingredientes : []).forEach((ingredient) => {
      const name = canonicalText(ingredientName(String(ingredient || "")));
      if (!name) return;
      terms.add(name);
      const first = name.split(/\s+/)[0];
      if (first?.length >= 3) terms.add(first);
    });
  });
  additionals.forEach((additional) => {
    const name = canonicalText(additional.nome);
    if (name) terms.add(name);
  });
  return Array.from(terms).sort((a, b) => b.length - a.length);
}

function inferAddressWithoutStreetType(normalized: string, products: CatalogProduct[], additionals: CatalogAdditional[]) {
  let work = ` ${normalized} `;
  const hasAddressCue = /[,;]|\b(?:entrega|entregar)\s+(?:em|no|na)\b/.test(work);
  const productPattern = productRemovalPattern(products);
  if (productPattern) work = work.replace(productPattern, " ");
  work = work
    .replace(/\b(?:55\s*)?(?:\d[\s.-]*){10,13}\b/g, " ")
    .replace(/\b(?:pagamento\s+)?(?:pix|dinheiro|cartao)\b/g, " ")
    .replace(/\btroco\s+(?:(?:para|pra)\s+)?(?:r\s*)?\$?\s*[\d.,]+/g, " ")
    .replace(NA_PORTA_PATTERN, " ")
    .replace(RETIRADA_PATTERN, " ");

  const vocabulary = modificationVocabulary(products, additionals);
  if (vocabulary.length) {
    const known = vocabulary.map(escapeRegex).join("|");
    const commands = `${REMOVAL_COMMAND}|${ADDITION_COMMAND}`;
    work = work.replace(new RegExp(`\\b(?:${commands})\\s+(?:o\\s+|a\\s+|de\\s+)?(?:${known})\\b`, "g"), " ");
  }
  work = work
    .replace(/\b(?:entrega|entregar)\s+(?:em|no|na)\b/g, " ")
    .replace(/\b(?:sem|menos|mais|com|adicional)\b/g, " ")
    .replace(/[;,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const match = work.match(/(?:^|\s)([a-z][a-z ]{1,60}\s+\d{1,5}[a-z]?)(?=\s*$)/);
  if (!match) return "";
  const candidate = match[1]
    .replace(/^(?:entrega|endereco|end|local)\s+(?:em|no|na)?\s*/, "")
    .replace(/^(?:para|pra)\s+/, "")
    .trim();
  const addressWords = candidate.replace(/\s+\d{1,5}[a-z]?$/, "").trim().split(/\s+/).filter(Boolean);
  if (addressWords.length < (hasAddressCue ? 1 : 2) || !/[a-z]{2}/.test(candidate) || /\b(?:sem|mais|adicional|troco|normal)\b/.test(candidate)) return "";
  return candidate;
}

function extractAddress(normalized: string, products: CatalogProduct[], additionals: CatalogAdditional[]) {
  const start = normalized.search(ADDRESS_START);
  if (start < 0) {
    if (RETIRADA_PATTERN.test(normalized) || NA_PORTA_PATTERN.test(normalized)) {
      return { endereco: "", start: -1, end: -1 };
    }
    const inferred = inferAddressWithoutStreetType(normalized, products, additionals);
    return { endereco: inferred, start: -1, end: -1 };
  }
  const tail = normalized.slice(start);
  const boundary = /\s+(?=(?:pagamento\s+)?(?:pix|dinheiro|cartao)\b|troco\b|retirada\b|retirar\b|buscar\b|pegar\s+no\s+local\b|na\s+porta\b|balcao\b|cliente\b|nome\b|telefone\b|fone\b|whatsapp\b|obs\b|observacao\b)/;
  const match = boundary.exec(tail);
  const raw = (match ? tail.slice(0, match.index) : tail).replace(/[,.]+$/, "").trim();
  return { endereco: raw, start, end: start + raw.length };
}

function extractRetiradaIdentity(normalized: string) {
  const match = RETIRADA_PATTERN.exec(normalized);
  if (!match) return { cliente: "", telefoneFinal: "", trecho: "" };
  return { cliente: "", telefoneFinal: "", trecho: match[0] };
}

function extractFullPhone(text: string) {
  const candidates = Array.from(String(text || "").matchAll(/(?:^|[^\d])((?:\+?55[\s().-]*)?(?:\(?\d{2}\)?[\s.-]*)?\d{4,5}[\s.-]*\d{4})(?=$|[^\d])/g));
  for (const match of candidates) {
    const digits = String(match[1] || "").replace(/\D/g, "");
    if ([10, 11].includes(digits.length)) return digits;
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits.slice(2);
  }
  return "";
}

function productRemovalPattern(products: CatalogProduct[]) {
  const aliases = Array.from(
    new Set(
      products
        .filter((product) => product.disponivel !== false)
        .flatMap((product) => aliasesForProduct(product))
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);
  if (!aliases.length) return null;
  const quantity = `(?:\\d+|${QUANTITY_WORDS})`;
  const aliasAlternation = aliases.map(escapeRegex).join("|");
  return new RegExp(`\\b(?:${quantity}\\s*(?:x\\s*)?(?:(?:unidades?|lanches?)(?:\\s+de)?\\s+)?)?(?:${aliasAlternation})\\b(?:\\s*x\\s*\\d+)?`, "g");
}

function cleanRetiradaCandidateText(text: string, products: CatalogProduct[], addressText = "") {
  let work = ` ${canonicalText(text)} `;
  if (addressText) work = work.replace(` ${canonicalText(addressText)} `, " ");
  const productPattern = productRemovalPattern(products);
  if (productPattern) work = work.replace(productPattern, " ");
  work = work
    .replace(/\b(?:55\s*)?(?:\d[\s.-]*){10,13}\b/g, " ")
    .replace(/\b(?:pagamento\s+)?(?:pix|dinheiro|cartao)\b/g, " ")
    .replace(/\btroco\s+(?:(?:para|pra)\s+)?(?:r\s*)?\$?\s*[\d.,]+/g, " ")
    .replace(/\b(?:os dois|todos|todas|primeiro|primeira|segundo|segunda|terceiro|terceira|quarto|quarta|um|uma|dois|duas|tres|quatro)?\s*(?:sem|tirar|tira|remove|remover|nao colocar(?: no lanche)?|nao poe|com mais|mais|com adicional(?: de)?|adicional(?: de)?|adiciona|adicionar|acrescenta|coloca|colocar)\b(?:\s+[a-z0-9]+){0,6}/g, " ")
    .replace(NA_PORTA_PATTERN, " ")
    .replace(RETIRADA_PATTERN, " ")
    .replace(/\b(?:cliente|nome|telefone|fone|whatsapp|zap|final|ultimos|ultimo|termina|em|do|da|de|e)\b/g, " ")
    .replace(/\b(?:quero|pedido|pedir|por favor|para|pra)\b/g, " ")
    .replace(/[.,;:!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return work;
}

function extractRetiradaEntities(text: string, normalized: string, products: CatalogProduct[], addressText = "") {
  const match = RETIRADA_PATTERN.exec(normalized);
  if (!match) return { cliente: "", telefoneFinal: "", trecho: "" };

  const telefone = extractFullPhone(text);
  let work = cleanRetiradaCandidateText(text, products, addressText);
  let telefoneFinal = "";
  if (!telefone) {
    const explicitFinal = work.match(/\b(\d{4})\b/);
    if (explicitFinal) {
      telefoneFinal = explicitFinal[1];
      work = work.replace(new RegExp(`\\b${escapeRegex(telefoneFinal)}\\b`), " ");
    }
  }

  const cliente = work
    .replace(/\b\d+\b/g, " ")
    .replace(/["']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    cliente: /^(no local|local)$/.test(cliente) ? "" : cliente,
    telefoneFinal,
    trecho: match[0],
  };
}

function extractDetails(text: string, products: CatalogProduct[] = [], additionals: CatalogAdditional[] = []) {
  const normalized = normalizeText(text);
  const address = extractAddress(normalized, products, additionals);
  const retirada = extractRetiradaEntities(text, normalized, products, address.endereco);
  const isNaPorta = NA_PORTA_PATTERN.test(normalized);
  const isRetirada = RETIRADA_PATTERN.test(normalized);
  const troco = normalized.match(/\btroco\s+(?:(?:para|pra)\s+)?(?:r\s*)?\$?\s*([\d.,]+)/)?.[1] || "";
  const pagamento = /\bdinheiro\b/.test(normalized) || Boolean(troco)
    ? "dinheiro"
    : /\bcartao\b/.test(normalized)
      ? "cartao"
      : /\bpix\b/.test(normalized)
        ? "pix"
        : "";
  const telefone = extractFullPhone(text);
  const deliveryClient = normalized.match(/(?:entrega\s+)?para\s+([a-z][a-z\s]{1,50}?)(?=\s*(?:,|na\s+rua|no\s+endereco|rua|avenida|av\b|pagamento|dinheiro|pix|cartao|troco|$))/)?.[1]?.trim() || "";
  const cliente = retirada.cliente || (/^(retirada|entrega)$/.test(deliveryClient) ? "" : deliveryClient);
  const avisos = isRetirada && address.endereco
    ? ["O pedido foi identificado como retirada, mas tambem foi encontrado um endereco. Confira antes de enviar."]
    : [];
  return {
    cliente,
    telefone,
    telefoneFinal: retirada.telefoneFinal,
    endereco: address.endereco,
    enderecoRange: address,
    retiradaTrecho: retirada.trecho,
    tipoEntrega: (isNaPorta ? "Na porta" : isRetirada ? "Retirada" : "Entrega") as "Entrega" | "Retirada" | "Na porta",
    pagamento: pagamento as "pix" | "dinheiro" | "cartao",
    troco,
    avisos,
  };
}

function cleanProductText(text: string, details: ReturnType<typeof extractDetails>) {
  let cleaned = normalizeText(text);
  if (details.endereco) cleaned = cleaned.replace(details.endereco, " ");
  if (details.retiradaTrecho) cleaned = cleaned.replace(details.retiradaTrecho, " ");
  if (details.cliente) cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(canonicalText(details.cliente))}\\b`, "g"), " ");
  if (details.telefoneFinal) cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(details.telefoneFinal)}\\b`, "g"), " ");
  cleaned = cleaned
    .replace(NA_PORTA_PATTERN, " ")
    .replace(RETIRADA_PATTERN, " ")
    .replace(/\b(?:pagamento\s+)?(?:pix|dinheiro|cartao)\b/g, " ")
    .replace(/\btroco\s+(?:(?:para|pra)\s+)?(?:r\s*)?\$?\s*[\d.,]+/g, " ")
    .replace(/(?:telefone|fone|whatsapp)\s*[:\-]?\s*\d[\d\s()-]{7,}\d/g, " ")
    .replace(/\b(?:55\s*)?(?:\d[\s.-]*){10,13}\b/g, " ")
    .replace(/(?:entrega\s+)?para\s+[a-z][a-z\s]{1,50}(?=,|$)/g, " ")
    .replace(/\b(quero|pedido|pedir|por favor)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return canonicalText(cleaned);
}

function splitObservation(text: string) {
  const match = /(?:^|\s)(obs|observa[cç][aã]o)\s*:?\s*/i.exec(String(text || ""));
  if (!match || match.index === undefined) return { body: text, obsGeral: "" };
  const markerStart = match.index + (match[0].startsWith(" ") ? 1 : 0);
  const obsStart = (match.index || 0) + match[0].length;
  return {
    body: String(text || "").slice(0, markerStart).trim(),
    obsGeral: String(text || "").slice(obsStart).trim(),
  };
}

function ingredientName(value: string) {
  return String(value || "").replace(/^\d+\s+/, "").replace(/\s+x\d+$/i, "").trim();
}

const REMOVAL_COMMAND = "sem|s\\/?|menos|tir|tirar|tira|retirar|remove|remover|nao colocar(?: no lanche)?|nao poe";
const ADDITION_COMMAND = "com mais|com|mais|add|adc|com adicional(?: de)?|adicional(?: de)?|adiciona|adicionar|acrescenta|coloca|colocar";
const CUT_TARGET_COMMAND = "partir|parte|cortar|corta|dividir|divide";
const CUT_COMMAND = `${CUT_TARGET_COMMAND}|part|partido|partida|cort|cortado|cortada`;
const ANY_COMMAND = `${REMOVAL_COMMAND}|${ADDITION_COMMAND}|${CUT_COMMAND}`;

type KnownMatch<T> = { value?: T; suggestion?: T };

function findKnownTerm<T>(raw: string, values: T[], getName: (value: T) => string): KnownMatch<T> {
  const target = canonicalText(raw)
    .replace(/^(?:o|a|os|as|de)\s+/, "")
    .replace(/\s+(?:e|normal)$/, "")
    .trim();
  if (!target) return {};
  const scored = values.map((value) => {
    const name = canonicalText(getName(value));
    const exact = target === name || (target.length >= 3 && name.startsWith(target));
    const distance = levenshtein(compact(target), compact(name));
    const score = 1 - distance / Math.max(compact(target).length, compact(name).length, 1);
    return { value, exact, score };
  }).sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score);
  if (scored[0]?.exact) return { value: scored[0].value };
  if (scored[0]?.score >= 0.68) return { suggestion: scored[0].value };
  return {};
}

function commandTargets(segment: string, command: string) {
  const normalized = canonicalText(segment);
  const regex = new RegExp(
    `\\b(?:${command})\\s+(?:de\\s+)?(.+?)(?=\\s+(?:e\\s+)?(?:${ANY_COMMAND})\\b|$)`,
    "g"
  );
  return Array.from(normalized.matchAll(regex)).map((match) => match[1].trim());
}

function targetQuantity(target: string) {
  const text = canonicalText(target);
  const number = text.match(/^(\d+)\s+/);
  if (number) return Math.max(parseInt(number[1], 10), 1);
  const word = text.match(new RegExp(`^(${QUANTITY_WORDS})\\s+`));
  if (word) return NUMBER_WORDS[word[1]] || 1;
  return 1;
}

function cleanTargetQuantity(target: string) {
  return canonicalText(target)
    .replace(new RegExp(`^(?:\\d+|${QUANTITY_WORDS})\\s+`), "")
    .replace(/^(?:adicional|adicionais)\s+(?:de\s+)?/, "")
    .replace(/\b(?:dentro\s+do\s+lanche|no\s+lanche|na\s+unidade|nessa\s+unidade)\b/g, "")
    .replace(/\b(?:por\s+lanche|por\s+unidade|em\s+cada\s+lanche|em\s+cada|cada)\b/g, "")
    .replace(/\bmussarelas\b/g, "mussarela")
    .trim();
}

function singularizeComplementName(value: string) {
  return canonicalText(value)
    .replace(/\bmaioneses\b/g, "maionese")
    .replace(/\bketchups\b/g, "ketchup")
    .replace(/\bcaseiras\b/g, "caseira")
    .trim();
}

function isOrderComplementName(value: string) {
  const text = singularizeComplementName(value);
  return /\bmaion(?:ese)?\b/.test(text) || /\bketch(?:up)?\b/.test(text);
}

function isInsideSandwichContext(value: string) {
  return /\b(?:dentro\s+do\s+lanche|no\s+lanche|na\s+unidade|nessa\s+unidade)\b/.test(canonicalText(value));
}

function mergeComplements(items: OrderComplement[]) {
  const byName = new Map<string, OrderComplement>();
  items.forEach((item) => {
    const key = canonicalText(item.nome);
    const current = byName.get(key);
    byName.set(key, { ...item, qtd: (current?.qtd || 0) + item.qtd });
  });
  return Array.from(byName.values());
}

function findComplementTerm(raw: string, additionals: CatalogAdditional[]): KnownMatch<CatalogAdditional> {
  const complements = additionals.filter((additional) => isOrderComplementName(additional.nome));
  return findKnownTerm(singularizeComplementName(raw), complements, (value) => singularizeComplementName(value.nome));
}

function splitAdditionalTargets(target: string) {
  const text = canonicalText(target);
  if (!text.includes(" e ")) return [text];
  return text
    .split(/\s+e\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseOrderComplements(segment: string, additionals: CatalogAdditional[]) {
  const normalized = canonicalText(segment);
  if (!normalized || isInsideSandwichContext(normalized)) return { complementos: [] as OrderComplement[], cleaned: segment };
  const complementos: OrderComplement[] = [];
  const targets = commandTargets(normalized, ADDITION_COMMAND);
  const postfix = Array.from(normalized.matchAll(/\b((?:\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+[a-z][a-z0-9 ]{1,40}?)\s+extra\b/g))
    .map((match) => match[1]);
  targets.push(...postfix);

  targets.flatMap(splitAdditionalTargets).forEach((target) => {
    const qtd = targetQuantity(target);
    const cleanTarget = cleanTargetQuantity(target);
    if (!isOrderComplementName(cleanTarget)) return;
    const found = findComplementTerm(cleanTarget, additionals);
    if (found.value) complementos.push({ ...found.value, qtd });
  });

  if (!complementos.length) return { complementos, cleaned: segment };

  let cleaned = ` ${canonicalText(segment)} `;
  targets.forEach((target) => {
    const cleanTarget = cleanTargetQuantity(target);
    if (!isOrderComplementName(cleanTarget)) return;
    cleaned = cleaned.replace(new RegExp(`\\b(?:${ADDITION_COMMAND})\\s+(?:de\\s+)?${escapeRegex(target)}\\b`, "g"), " ");
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegex(target)}\\s+extra\\b`, "g"), " ");
  });
  return { complementos: mergeComplements(complementos), cleaned: cleaned.replace(/\s+/g, " ").trim() };
}

function parseCutObservations(segment: string) {
  const normalized = canonicalText(segment);
  const shorthand = /\b(?:part|partido|partida|cort|cortado|cortada)(?:\s+(?:ao\s+)?meio)?\b/.test(normalized);
  const targets = commandTargets(segment, CUT_TARGET_COMMAND);
  const observations = targets
    .map((target) => {
      const clean = canonicalText(target)
        .replace(/^(?:o|a|os|as|lanche|lanches)\s+/, "")
        .trim();
      if (!clean) return "Cortar/partir conforme solicitado";
      if (/\b(?:meio|metade)\b/.test(clean)) return "Partir ao meio";
      if (/\b4\b|\bquatro\b/.test(clean)) return "";
      if (/\b2\b|\bdois\b|\bduas\b/.test(clean)) return "Cortar em 2";
      return `Cortar/partir: ${clean}`;
    })
    .filter(Boolean);
  if (shorthand) observations.push("Partir ao meio");
  return Array.from(new Set(observations));
}

function parseModifications(
  segment: string,
  product: CatalogProduct,
  additionals: CatalogAdditional[],
  options: { allowOrderComplementsAsItemAdditions?: boolean } = {}
) {
  const ingredients = (Array.isArray(product.ingredientes) ? product.ingredientes : []).map(ingredientName);
  const removidos: string[] = [];
  const adicionaisSelecionados = new Map<string, OrderAdditional>();
  const suggestions: string[] = [];

  commandTargets(segment, REMOVAL_COMMAND).forEach((target) => {
    const contained = ingredients.filter((name) => new RegExp(`\\b${escapeRegex(canonicalText(name))}\\b`).test(canonicalText(target)));
    if (contained.length) {
      removidos.push(...contained);
      return;
    }
    const found = findKnownTerm(target, ingredients, (value) => value);
    if (found.value) removidos.push(found.value);
    else if (found.suggestion) suggestions.push(`Voce quis dizer "sem ${found.suggestion}"?`);
    else suggestions.push(`Ingrediente para remocao nao reconhecido: "${target}".`);
  });

  const additionScope: "unidade" | "total" = /\b(no total|ao todo|total do pedido|pedido inteiro|entre os lanches|para todos juntos)\b/.test(canonicalText(segment)) ? "total" : "unidade";
  const additionalTargets = commandTargets(segment, ADDITION_COMMAND);
  const postfixExtra = canonicalText(segment).match(/\b([a-z][a-z0-9 ]{1,40}?)\s+extra\b/)?.[1];
  if (postfixExtra) additionalTargets.push(postfixExtra);
  additionalTargets.flatMap(splitAdditionalTargets).forEach((target) => {
    const qtd = targetQuantity(target);
    const cleanTarget = cleanTargetQuantity(target);
    if (isOrderComplementName(cleanTarget) && !options.allowOrderComplementsAsItemAdditions) return;
    const contained = additionals.filter((additional) =>
      new RegExp(`\\b${escapeRegex(canonicalText(additional.nome))}\\b`).test(cleanTarget)
    );
    if (contained.length >= 1) {
      contained.forEach((additional) => {
        const key = canonicalText(additional.nome);
        const previous = adicionaisSelecionados.get(key);
        adicionaisSelecionados.set(key, { ...additional, qtd: (previous?.qtd || 0) + qtd, escopo: additionScope });
      });
      return;
    }
    const found = findKnownTerm(cleanTarget, additionals, (value) => value.nome);
    if (found.value) {
      const key = canonicalText(found.value.nome);
      const previous = adicionaisSelecionados.get(key);
      adicionaisSelecionados.set(key, { ...found.value, qtd: (previous?.qtd || 0) + qtd, escopo: additionScope });
    }
    else if (found.suggestion) suggestions.push(`Voce quis dizer adicional de "${found.suggestion.nome}"?`);
    else suggestions.push(`Adicional nao reconhecido: "${cleanTarget || target}".`);
  });

  return {
    removidos: Array.from(new Set(removidos)),
    adicionais: Array.from(adicionaisSelecionados.values()),
    obs: parseCutObservations(segment),
    suggestions,
  };
}

function toOrderItem(product: CatalogProduct, chunk: string, additionals: CatalogAdditional[]): OrderItem {
  const modifications = parseModifications(chunk, product, additionals);
  return {
    produtoId: String(product.id),
    nome: product.nome,
    preco: Number(product.preco) || 0,
    qtd: quantityFromChunk(chunk),
    adicionais: modifications.adicionais,
    removidos: modifications.removidos,
    obs: modifications.obs.join("; "),
    tipo: product.tipo || "item",
    categoria: product.categoria || "",
  };
}

function aliasForProduct(product: CatalogProduct) {
  return canonicalText(product.nome).replace(/\s+promocao$/, "").trim();
}

function aliasesForProduct(product: CatalogProduct) {
  const alias = aliasForProduct(product);
  const aliases = new Set([alias]);
  (Array.isArray(product.apelidos) ? product.apelidos : []).forEach((apelido) => {
    const normalizado = canonicalText(apelido);
    if (normalizado) aliases.add(normalizado);
  });
  const noX = stripLeadingXAlias(alias);
  if (noX && noX !== alias) aliases.add(noX);
  aliases.add(alias.replace(/\bx\s+(?=[a-z])/g, "x").trim());
  const genericWords = /^(com|sem|de|da|do|das|dos|promocao|mega|lanche|lanches|burguer|burger)$/;
  const words = noX.split(/\s+/).filter((word) => word.length >= 3 && !genericWords.test(word));
  if (words.length >= 2) aliases.add(words.slice(0, 2).join(" "));
  const variantFamilyCategory = /\b(frango|lombo)\b/.test(canonicalText(product.categoria));
  if (words.length === 1 || (noX === alias && !variantFamilyCategory)) aliases.add(words[0]);
  const sandwichCategory = /\b(frango|lombo|hamburguer|hamburger|lanche|lanches)\b/.test(canonicalText(product.categoria));
  if (sandwichCategory && noX && !/^x/.test(noX)) {
    aliases.add(`x${noX}`);
    aliases.add(`lanche de ${noX}`);
  }
  return Array.from(aliases).filter(Boolean);
}

function normalizeCutPlacement(text: string, products: CatalogProduct[]) {
  let normalized = canonicalText(text);
  const aliases = Array.from(new Set(
    products
      .filter((product) => product.disponivel !== false)
      .flatMap(aliasesForProduct)
      .filter(Boolean)
  )).sort((a, b) => b.length - a.length);
  if (!aliases.length) return normalized;

  const aliasPattern = aliases.map(escapeRegex).join("|");
  const quantityPattern = `(?:\\d+|${QUANTITY_WORDS})`;
  const shorthandPattern = "(?:part|partido|partida|cort|cortado|cortada)(?:\\s+(?:ao\\s+)?meio)?";

  normalized = normalized.replace(
    new RegExp(`\\b(${shorthandPattern})\\s+(${quantityPattern})\\s+(${aliasPattern})\\b`, "g"),
    (_full, cut, quantity, alias) => `${quantity} ${alias} ${cut}`
  );
  normalized = normalized.replace(
    new RegExp(`\\b(${quantityPattern})\\s+(${shorthandPattern})\\s+(${aliasPattern})\\b`, "g"),
    (_full, quantity, cut, alias) => `${quantity} ${alias} ${cut}`
  );
  normalized = normalized.replace(
    new RegExp(`\\b(${shorthandPattern})\\s+(${aliasPattern})\\b`, "g"),
    (_full, cut, alias) => `${alias} ${cut}`
  );
  return normalized.replace(/\s+/g, " ").trim();
}

function recognitionTerm(text: string) {
  return canonicalText(text)
    .replace(new RegExp(`^(?:\\d+|${QUANTITY_WORDS})\\s*(?:x\\s*)?`), "")
    .split(new RegExp(`\\s+(?:${ANY_COMMAND})\\b`))[0]
    .replace(/\b(?:entrega|retirada|pix|dinheiro|cartao)\b.*$/, "")
    .trim();
}

function learnedAliasesForProduct(product: CatalogProduct) {
  return (Array.isArray(product.apelidos) ? product.apelidos : [])
    .map(canonicalText)
    .filter(Boolean);
}

function exactProductSegments(text: string, products: CatalogProduct[]) {
  const aliasBuckets = new Map<string, CatalogProduct[]>();
  products.filter((item) => item.disponivel !== false).forEach((product) => {
    aliasesForProduct(product).forEach((alias) => {
      const bucket = aliasBuckets.get(alias) || [];
      if (!bucket.some((item) => String(item.id) === String(product.id))) bucket.push(product);
      aliasBuckets.set(alias, bucket);
    });
  });
  const aliasMap = new Map<string, CatalogProduct>();
  aliasBuckets.forEach((bucket, alias) => {
    const nonPromo = bucket.filter((product) => product.tipo !== "promocao");
    const comparable = nonPromo.length ? nonPromo : bucket;
    const uniqueIds = new Set(comparable.map((product) => String(product.id)));
    if (uniqueIds.size === 1) aliasMap.set(alias, comparable[0]);
  });
  const aliases = Array.from(aliasMap.keys()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!aliases.length) return [];
  const quantity = `(?:\\d+|${QUANTITY_WORDS})`;
  const aliasAlternation = aliases.map(escapeRegex).join("|");
  const regex = new RegExp(`(?:\\b${quantity}\\s*(?:x\\s*)?(?:(?:unidades?|lanches?)(?:\\s+de)?\\s+)?)?\\b(${aliasAlternation})\\b(?:\\s*x\\s*\\d+)?`, "g");
  const modifierBefore = new RegExp(`(?:^|\\s)(?:(?:\\d+|${QUANTITY_WORDS})\\s+)?(?:${ANY_COMMAND})\\s+(?:de\\s+)?(?:[a-z0-9]+\\s+e\\s+)?$`);
  const matches = Array.from(text.matchAll(regex)).filter((match) => {
    const start = match.index || 0;
    const before = text.slice(Math.max(0, start - 60), start);
    return !modifierBefore.test(before);
  });
  return matches.map((match, index) => {
    const alias = match[1];
    const start = match.index || 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index || text.length) : text.length;
    return { product: aliasMap.get(alias)!, chunk: text.slice(start, end).trim(), alias };
  });
}

function scoreProduct(chunk: string, product: CatalogProduct) {
  const candidate = canonicalText(chunk).replace(new RegExp(`^(?:\\d+|${QUANTITY_WORDS})\\s+`), "").replace(/\bsem\b.*$/, "").trim();
  const candidateCompact = compact(candidate);
  if (!candidateCompact) return 0;
  const aliasScores = aliasesForProduct(product).map((productName) => {
    const productCompact = compact(productName);
    if (!productCompact) return 0;
    if (candidateCompact.includes(productCompact)) return 1;
    return 1 - levenshtein(candidateCompact, productCompact) / Math.max(candidateCompact.length, productCompact.length, 1);
  });
  const similarity = Math.max(...aliasScores, 0);
  const genericBeverage = /\b(refri|refrigerante|bebida|coca)\b/.test(candidate);
  if (genericBeverage && /bebida|refrigerante|coca|guarana|fanta|sprite|suco/.test(canonicalText(`${product.categoria} ${product.nome}`))) {
    return Math.max(0.76, similarity);
  }
  return similarity;
}

function fallbackMatch(text: string, products: CatalogProduct[]) {
  const unique = new Map<string, CatalogProduct>();
  products.filter((product) => product.disponivel !== false).forEach((product) => {
    const alias = aliasForProduct(product);
    const current = unique.get(alias);
    if (!current || (current.tipo === "promocao" && product.tipo !== "promocao")) unique.set(alias, product);
  });
  return Array.from(unique.values())
    .map((product) => ({ product, score: scoreProduct(text, product) }))
    .filter((entry) => entry.score >= 0.6)
    .sort((a, b) => b.score - a.score);
}

function promotionalProduct(product: CatalogProduct, quantity: number, products: CatalogProduct[]) {
  if (aliasForProduct(product) !== "xtudo") return product;
  const promo = products.find((entry) => entry.tipo === "promocao" && aliasForProduct(entry) === "xtudo" && entry.promocao);
  if (!promo) return product;
  return quantity >= Math.max(Number(promo.promocao?.min_qtd) || 1, 1) ? promo : product;
}

function removeAmbiguousTwoProductChunks(text: string, products: CatalogProduct[]) {
  const activeProducts = products.filter((product) => product.disponivel !== false);
  const aliasMap = new Map<string, CatalogProduct>();
  activeProducts.forEach((product) => {
    aliasesForProduct(product).forEach((alias) => {
      if (!aliasMap.has(alias)) aliasMap.set(alias, product);
    });
  });
  const singleAliases = Array.from(aliasMap.keys())
    .filter((alias) => /^[a-z0-9]+$/.test(alias) && alias.length >= 3)
    .sort((a, b) => b.length - a.length);
  if (!singleAliases.length) return { text, ambiguidades: [] as InterpretationResult["ambiguidades"] };

  let cleaned = ` ${text} `;
  const ambiguidades: InterpretationResult["ambiguidades"] = [];
  const quantity = `\\d+|${QUANTITY_WORDS}`;
  const aliasAlternation = singleAliases.map(escapeRegex).join("|");
  const regex = new RegExp(`(^|\\s)((${quantity})\\s+(${aliasAlternation})\\s+(${aliasAlternation}))(?=\\s+(?:\\d+|${QUANTITY_WORDS})\\s+|\\s*$)`, "g");

  cleaned = cleaned.replace(regex, (full, prefix, trecho, _qtd, firstAlias, secondAlias) => {
    const combinedAliases = new Set([
      `${firstAlias} ${secondAlias}`,
      `${secondAlias} ${firstAlias}`,
      `x${firstAlias} ${secondAlias}`,
      `x${secondAlias} ${firstAlias}`,
    ].map(canonicalText));
    const combinedExists = activeProducts.some((product) => aliasesForProduct(product).some((alias) => combinedAliases.has(alias)));
    if (combinedExists) return full;

    const first = aliasMap.get(firstAlias);
    const second = aliasMap.get(secondAlias);
    if (!first || !second || String(first.id) === String(second.id)) return full;
    ambiguidades.push({ trecho: canonicalText(trecho), sugestoes: [first, second] });
    return prefix || " ";
  });

  return { text: cleaned.replace(/\s+/g, " ").trim(), ambiguidades };
}

function modifierTail(chunk: string, product: CatalogProduct) {
  const normalized = canonicalText(chunk);
  const match = aliasesForProduct(product)
    .sort((a, b) => b.length - a.length)
    .map((alias) => ({ alias, index: normalized.indexOf(alias) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)[0];
  if (!match) return "";
  return normalized.slice(match.index + match.alias.length).replace(/^\s+promocao\b/, "").trim();
}

function markerTarget(marker: string, cursor: number, total: number) {
  const value = canonicalText(marker);
  if (/^(os dois|todos|todas)$/.test(value)) return { indexes: Array.from({ length: total }, (_, index) => index), cursor: total };
  const ordinals: Record<string, number> = {
    primeiro: 0, primeira: 0, segundo: 1, segunda: 1,
    terceiro: 2, terceira: 2, quarto: 3, quarta: 3,
  };
  if (value in ordinals) return { indexes: [ordinals[value]].filter((index) => index < total), cursor };
  if (/^(um deles|uma delas)$/.test(value)) return { indexes: cursor < total ? [cursor] : [], cursor: cursor + 1 };
  if (/^(o outro|a outra|outro|outra)$/.test(value)) return { indexes: cursor < total ? [cursor] : [], cursor: cursor + 1 };
  const count = NUMBER_WORDS[value] || parseInt(value, 10) || 1;
  const indexes = Array.from({ length: Math.min(count, Math.max(total - cursor, 0)) }, (_, index) => cursor + index);
  return { indexes, cursor: cursor + count };
}

function splitConfiguredUnits(item: OrderItem, chunk: string, product: CatalogProduct, additionals: CatalogAdditional[]) {
  if (item.qtd < 2) {
    const orderComplements = parseOrderComplements(chunk, additionals);
    const parsed = parseModifications(orderComplements.cleaned, product, additionals, {
      allowOrderComplementsAsItemAdditions: isInsideSandwichContext(chunk),
    });
    return {
      items: [{ ...item, removidos: parsed.removidos, adicionais: parsed.adicionais, obs: parsed.obs.join("; ") }],
      complementos: orderComplements.complementos,
      suggestions: parsed.suggestions,
    };
  }
  const tail = modifierTail(chunk, product);
  const markerRegex = new RegExp(
    `\\b(os dois|todos|todas|primeiro|primeira|segundo|segunda|terceiro|terceira|quarto|quarta|um deles|uma delas|o outro|a outra|outro|outra|\\d+|um|uma|dois|duas|tres|quatro)\\b(?=\\s+(?:normal\\b|${ANY_COMMAND}\\b))`,
    "g"
  );
  const markers = Array.from(tail.matchAll(markerRegex));
  if (!markers.length) {
    const orderComplements = parseOrderComplements(tail, additionals);
    const parsed = parseModifications(orderComplements.cleaned, product, additionals, {
      allowOrderComplementsAsItemAdditions: isInsideSandwichContext(tail),
    });
    return {
      items: [{ ...item, removidos: parsed.removidos, adicionais: parsed.adicionais, obs: parsed.obs.join("; ") }],
      complementos: orderComplements.complementos,
      suggestions: parsed.suggestions,
    };
  }

  const units = Array.from({ length: item.qtd }, () => ({ removidos: [] as string[], adicionais: [] as OrderItem["adicionais"], obs: "" }));
  const suggestions: string[] = [];
  const complementos: OrderComplement[] = [];
  let cursor = 0;
  markers.forEach((match, index) => {
    const bodyStart = (match.index || 0) + match[0].length;
    const bodyEnd = index + 1 < markers.length ? (markers[index + 1].index || tail.length) : tail.length;
    const body = tail.slice(bodyStart, bodyEnd).replace(/^\s+|\s+(?:e|,)+\s*$/g, "").trim();
    const target = markerTarget(match[1], cursor, item.qtd);
    cursor = target.cursor;
    if (/^normal\b/.test(body)) return;
    const orderComplements = parseOrderComplements(body, additionals);
    complementos.push(...orderComplements.complementos);
    const parsed = parseModifications(orderComplements.cleaned, product, additionals, {
      allowOrderComplementsAsItemAdditions: isInsideSandwichContext(body),
    });
    suggestions.push(...parsed.suggestions);
    target.indexes.forEach((unitIndex) => {
      units[unitIndex] = { removidos: parsed.removidos, adicionais: parsed.adicionais, obs: parsed.obs.join("; ") };
    });
  });
  return {
    items: units.map((unit) => ({ ...item, qtd: 1, removidos: unit.removidos, adicionais: unit.adicionais, obs: unit.obs })),
    complementos: mergeComplements(complementos),
    suggestions: Array.from(new Set(suggestions)),
  };
}

export function interpretOrder(text: string, catalog: Catalog): InterpretationResult {
  const separated = splitObservation(text);
  const products = Array.isArray(catalog.cardapio) ? catalog.cardapio : [];
  const additionals = Array.isArray(catalog.adicionais) ? catalog.adicionais : [];
  const details = extractDetails(separated.body, products, additionals);
  const cleanedProductText = normalizeCutPlacement(cleanProductText(separated.body, details), products);
  const ambiguousSplit = removeAmbiguousTwoProductChunks(cleanedProductText, products);
  const productText = ambiguousSplit.text;
  const exact = exactProductSegments(productText, products);
  const itens: OrderItem[] = [];
  const complementosPedido: OrderComplement[] = [];
  const ambiguidades: InterpretationResult["ambiguidades"] = [...ambiguousSplit.ambiguidades];
  const naoIdentificados: string[] = [];
  const modificationSuggestions: string[] = [];
  const aprendizadosUsados: InterpretationResult["aprendizadosUsados"] = [];
  const reconhecimentos: InterpretationResult["reconhecimentos"] = [];
  const registrarAprendizadoUsado = (termo: string, product: CatalogProduct) => {
    if (!learnedAliasesForProduct(product).includes(canonicalText(termo))) return;
    if (aprendizadosUsados.some((item) => item.termo === canonicalText(termo) && item.produtoId === String(product.id))) return;
    aprendizadosUsados.push({ termo: canonicalText(termo), produtoId: String(product.id), produtoNome: product.nome });
  };

  if (exact.length) {
    exact.forEach(({ product, chunk, alias }) => {
      registrarAprendizadoUsado(alias, product);
      const quantity = quantityFromChunk(chunk);
      const effectiveProduct = promotionalProduct(product, quantity, products);
      const item = toOrderItem(effectiveProduct, chunk, additionals);
      const split = splitConfiguredUnits(item, chunk, effectiveProduct, additionals);
      itens.push(...split.items);
      complementosPedido.push(...split.complementos);
      modificationSuggestions.push(...split.suggestions);
    });
  } else if (productText) {
    const matches = fallbackMatch(productText, products);
    const top = matches[0];
    const close = top ? matches.filter((entry) => top.score - entry.score <= 0.06) : [];
    if (!top) naoIdentificados.push(productText);
    else if (top.score < 0.72 || close.length > 1) {
      ambiguidades.push({ trecho: productText, sugestoes: close.slice(0, 5).map((entry) => entry.product) });
    } else {
      const learnedAlias = learnedAliasesForProduct(top.product)
        .sort((a, b) => b.length - a.length)
        .find((alias) => canonicalText(productText).includes(alias));
      if (learnedAlias) registrarAprendizadoUsado(learnedAlias, top.product);
      const quantity = quantityFromChunk(productText);
      reconhecimentos.push({
        termo: recognitionTerm(productText),
        produtoId: String(top.product.id),
        produtoNome: top.product.nome,
        source: "fuzzy",
      });
      const effectiveProduct = promotionalProduct(top.product, quantity, products);
      const item = toOrderItem(effectiveProduct, productText, additionals);
      const split = splitConfiguredUnits(item, productText, effectiveProduct, additionals);
      itens.push(...split.items);
      complementosPedido.push(...split.complementos);
      modificationSuggestions.push(...split.suggestions);
    }
  }

  return {
    pedido: {
      cliente: details.cliente,
      telefone: details.telefone,
      telefoneFinal: details.telefoneFinal,
      endereco: details.endereco,
      tipoEntrega: details.tipoEntrega,
      pagamento: details.pagamento,
      troco: details.troco,
      obsGeral: separated.obsGeral,
      itens,
      complementosPedido: mergeComplements(complementosPedido),
    },
    ambiguidades,
    naoIdentificados,
    avisos: [...details.avisos, ...Array.from(new Set(modificationSuggestions))],
    aprendizadosUsados,
    reconhecimentos,
  };
}
