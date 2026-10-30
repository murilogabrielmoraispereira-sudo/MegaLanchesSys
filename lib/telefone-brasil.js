const DDDS_BRASIL_VALIDOS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarDddPadrao(valor) {
  const ddd = somenteDigitos(valor).slice(-2);
  return DDDS_BRASIL_VALIDOS.has(ddd) ? ddd : "35";
}

function limparPrefixosDiscagemBrasil(telefone) {
  let digits = somenteDigitos(telefone);
  if (!digits) return "";

  if (digits.startsWith("0055")) digits = digits.slice(2);
  if (digits.startsWith("055")) digits = digits.slice(1);

  if (!digits.startsWith("55") && digits.startsWith("0")) {
    const semZero = digits.slice(1);
    if (semZero.length === 10 || semZero.length === 11) return semZero;

    const semOperadora = digits.slice(3);
    if (semOperadora.length === 10 || semOperadora.length === 11) return semOperadora;
  }

  return digits;
}

function criarResultado({ original, digits, nacional = "", ddd = "", tipo = "", valido = false, erro = "", nonoInserido = false }) {
  return {
    original: String(original || ""),
    digits,
    nacional,
    internacional: nacional ? `55${nacional}` : "",
    whatsapp: nacional ? `55${nacional}` : "",
    ddd,
    valido,
    tipo,
    erro,
    nonoInserido,
  };
}

export function normalizarTelefoneBrasil(telefone, options = {}) {
  const original = String(telefone || "");
  const dddPadrao = normalizarDddPadrao(options.dddPadrao || process.env.DEFAULT_DDD || process.env.DDD_PADRAO || "35");
  const digits = limparPrefixosDiscagemBrasil(original);
  if (!digits) {
    return criarResultado({ original, digits, erro: "telefone_vazio" });
  }

  let nacional = digits;
  const tamanhoSemPais = digits.startsWith("55") ? digits.length - 2 : digits.length;
  const tinhaCodigoPais = digits.startsWith("55") && tamanhoSemPais >= 10 && tamanhoSemPais <= 13;
  if (tinhaCodigoPais) nacional = digits.slice(2);

  if (nacional.length === 8 || nacional.length === 9) {
    nacional = `${dddPadrao}${nacional}`;
  }

  let ddd = nacional.slice(0, 2);
  if (!DDDS_BRASIL_VALIDOS.has(ddd)) {
    return criarResultado({ original, digits, nacional: "", ddd, erro: "ddd_invalido" });
  }

  const local = nacional.slice(2);
  if (local.length === 8) {
    const primeiro = local[0];
    if (/[2-5]/.test(primeiro)) {
      return criarResultado({ original, digits, nacional, ddd, tipo: "fixo", valido: true });
    }
    if (/[6-9]/.test(primeiro)) {
      return criarResultado({ original, digits, nacional, ddd, tipo: "celular", valido: true });
    }
    return criarResultado({ original, digits, ddd, erro: "telefone_incompleto" });
  }

  if (local.length === 9) {
    if (local[0] === "9") {
      return criarResultado({ original, digits, nacional, ddd, tipo: "celular", valido: true });
    }
    if (/[2-5]/.test(local[0])) {
      return criarResultado({ original, digits, nacional, ddd, erro: "fixo_com_tamanho_invalido" });
    }
    return criarResultado({ original, digits, nacional, ddd, erro: "numero_celular_invalido" });
  }

  if (local.length > 9 && /^9+/.test(local)) {
    return criarResultado({ original, digits, nacional, ddd, tipo: "celular", valido: true });
  }

  return criarResultado({
    original,
    digits,
    ddd,
    erro: nacional.length < 10 ? "telefone_incompleto" : "telefone_tamanho_invalido",
  });
}

export function normalizePhoneNumber(telefone, options = {}) {
  const normalizado = normalizarTelefoneBrasil(telefone, options);
  return normalizado.valido ? normalizado.internacional : "";
}

export function normalizeCustomerPhone(telefone, options = {}) {
  const normalizado = normalizarTelefoneBrasil(telefone, options);
  return normalizado.valido && normalizado.tipo === "celular" ? normalizado.internacional : "";
}

export function gerarVariantesWhatsappBrasil(telefone, options = {}) {
  const info = normalizarTelefoneBrasil(telefone, options);
  if (!info.valido || !info.nacional) return [];
  const ddd = info.nacional.slice(0, 2);
  const local = info.nacional.slice(2);
  if (!ddd || !local || !/^9*[6-9]/.test(local)) return [info.internacional];

  const semNovesIniciais = local.replace(/^9+/, "");
  const novesInformados = local.length - semNovesIniciais.length;
  const maxNoves = Math.max(novesInformados, 1);
  const variantes = [];
  const add = (nacional) => {
    if (nacional.length < 10 || nacional.length > 13) return;
    const internacional = `55${nacional}`;
    if (!variantes.includes(internacional)) variantes.push(internacional);
  };

  add(`${ddd}${semNovesIniciais}`);
  for (let quantidade = 1; quantidade <= Math.min(maxNoves, 4); quantidade += 1) {
    add(`${ddd}${"9".repeat(quantidade)}${semNovesIniciais}`);
  }
  add(info.nacional);
  return variantes;
}

export function mensagemErroTelefoneBrasil(resultado) {
  const erro = typeof resultado === "string" ? resultado : String(resultado?.erro || "");
  if (erro === "telefone_vazio") return "Informe um telefone com DDD.";
  if (erro === "telefone_incompleto") return "Telefone incompleto.";
  if (erro === "ddd_invalido") return "Confira o DDD informado.";
  if (erro === "numero_celular_invalido") return "Numero de celular invalido.";
  if (erro === "fixo_com_tamanho_invalido") return "Telefone fixo deve ter 8 digitos apos o DDD.";
  if (erro === "telefone_tamanho_invalido") return "Confira o telefone informado.";
  return "Telefone invalido.";
}
