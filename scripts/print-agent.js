import "../public/pricing.js";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const DEFAULT_SERVER_URL = "http://localhost:3000";
const SERVER_URL = String(process.env.MEGA_SERVER_URL || DEFAULT_SERVER_URL).replace(/\/+$/, "");
const INTERVAL_MS = Math.max(Number(process.env.PRINT_INTERVAL_MS || 3000), 1500);
const REQUEST_TIMEOUT_MS = Math.max(Number(process.env.PRINT_REQUEST_TIMEOUT_MS || 15000), 3000);
const PRINT_TOKEN = String(process.env.PRINT_TOKEN || process.env.PRINT_AGENT_TOKEN || "").trim();
const PRINT_INTERFACE = String(
  process.env.PRINT_INTERFACE || process.env.PRINTER_INTERFACE || "printer:Microsoft Print to PDF"
).trim();
const PRINT_TYPE_KEY = String(process.env.PRINT_TYPE || "EPSON").trim().toUpperCase();
const PRINT_DRIVER_MODULE = String(process.env.PRINT_DRIVER_MODULE || "printer").trim();
const VERBOSE = process.env.PRINT_VERBOSE === "1";

const IS_WINDOWS = process.platform === "win32";
const IS_SYSTEM_PRINTER = /^printer:/i.test(PRINT_INTERFACE);
const PRINTER_NAME = IS_SYSTEM_PRINTER ? PRINT_INTERFACE.replace(/^printer:/i, "").trim() : "";
const WINDOWS_PRINT_MODE = String(process.env.PRINT_WINDOWS_MODE || "notepad").trim().toLowerCase();
const PRINT_RAW_SCALE = Math.min(8, Math.max(1, Number(process.env.PRINT_RAW_SCALE || 1) || 1));
const PRINT_RAW_SCALE_X = Math.min(
  8,
  Math.max(1, Number(process.env.PRINT_RAW_SCALE_X || PRINT_RAW_SCALE) || PRINT_RAW_SCALE)
);
const PRINT_RAW_SCALE_Y = Math.min(
  8,
  Math.max(1, Number(process.env.PRINT_RAW_SCALE_Y || PRINT_RAW_SCALE) || PRINT_RAW_SCALE)
);
const PRINT_RAW_BOLD = process.env.PRINT_RAW_BOLD === "1";
const PRINT_RAW_ENCODING = String(process.env.PRINT_RAW_ENCODING || "860").trim();
const PRINT_RAW_CODEPAGE_TABLE = Math.min(
  255,
  Math.max(0, Number(process.env.PRINT_RAW_CODEPAGE_TABLE || 3) || 3)
);
const PRINT_MAX_COLS_BASE = Math.min(64, Math.max(16, Number(process.env.PRINT_MAX_COLS || 42) || 42));
const PRINT_LOCK_ENDPOINT = IS_WINDOWS
  ? "\\\\.\\pipe\\mega-lanches-print-agent-v2"
  : { host: "127.0.0.1", port: Math.max(1024, Number(process.env.PRINT_LOCK_PORT || 47831) || 47831) };
let printLockServer = null;

function adquirirTravaAgente() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err?.code === "EADDRINUSE") return resolve(false);
      reject(err);
    });
    server.listen(PRINT_LOCK_ENDPOINT, () => {
      printLockServer = server;
      resolve(true);
    });
  });
}

function liberarTravaAgente() {
  if (!printLockServer) return;
  try {
    printLockServer.close();
  } catch {}
  printLockServer = null;
}

process.on("SIGINT", () => {
  liberarTravaAgente();
  process.exit(0);
});
process.on("SIGTERM", () => {
  liberarTravaAgente();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  console.error("[PRINT] uncaughtException:", err?.stack || err?.message || err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[PRINT] unhandledRejection:", reason?.stack || reason?.message || reason);
});

const backendEnv = String(process.env.PRINT_BACKEND || "").trim().toLowerCase();
let PRINT_BACKEND = backendEnv || (IS_WINDOWS && IS_SYSTEM_PRINTER ? "windows" : "thermal");
if (!["windows", "thermal"].includes(PRINT_BACKEND)) {
  PRINT_BACKEND = IS_WINDOWS && IS_SYSTEM_PRINTER ? "windows" : "thermal";
}

function getWrapColumns() {
  return Math.min(64, Math.max(16, PRINT_MAX_COLS_BASE));
}

function getScaledWrapColumns(scaleX = 1) {
  if (scaleX <= 1) return getWrapColumns();
  return Math.max(16, Math.floor(getWrapColumns() / scaleX) - 1);
}

let ThermalPrinter = null;
let PrinterTypes = null;
let PRINT_TYPE = null;
let PRINTER_DRIVER = null;

if (PRINT_BACKEND === "thermal") {
  try {
    ({ ThermalPrinter, PrinterTypes } = require("node-thermal-printer"));
  } catch (err) {
    console.error("[PRINT] Dependencia ausente: node-thermal-printer");
    console.error("[PRINT] Rode: npm install node-thermal-printer");
    process.exit(1);
  }

  PRINT_TYPE = PrinterTypes[PRINT_TYPE_KEY] || PrinterTypes.EPSON;

  if (IS_SYSTEM_PRINTER) {
    try {
      PRINTER_DRIVER = require(PRINT_DRIVER_MODULE);
    } catch (errA) {
      try {
        PRINTER_DRIVER = require("electron-printer");
      } catch (errB) {
        if (IS_WINDOWS) {
          console.warn("[PRINT] Driver thermal nao encontrado, usando backend windows.");
          PRINT_BACKEND = "windows";
        } else {
          console.error("[PRINT] Interface 'printer:' precisa de driver.");
          console.error("[PRINT] Instale: npm install printer");
          process.exit(1);
        }
      }
    }
  }
}

if (PRINT_BACKEND === "windows" && !IS_WINDOWS) {
  console.error("[PRINT] Backend windows so funciona no Windows.");
  process.exit(1);
}

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (!PRINT_TOKEN) return headers;
  headers["x-print-token"] = PRINT_TOKEN;
  headers.Authorization = `Bearer ${PRINT_TOKEN}`;
  return headers;
}

function withTokenQuery(pathname) {
  const base = `${SERVER_URL}${pathname}`;
  if (!PRINT_TOKEN) return base;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}token=${encodeURIComponent(PRINT_TOKEN)}`;
}

async function fetchComTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNext() {
  const res = await fetchComTimeout(withTokenQuery("/adminn/print/next"), {
    method: "GET",
    headers: authHeaders(),
  });

  if (res.status === 401) {
    throw new Error("Token de impressao invalido (401 em /adminn/print/next).");
  }
  if (!res.ok) return null;

  const data = await res.json();
  return data?.job || null;
}

async function ack(id, status = "impresso") {
  const ackStatus = String(status || "impresso").trim().toLowerCase() === "erro" ? "erro" : "impresso";
  const res = await fetchComTimeout(withTokenQuery("/adminn/print/ack"), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id, status: ackStatus }),
  });
  if (res.status === 401) {
    throw new Error("Token de impressao invalido (401 em /adminn/print/ack).");
  }
  if (!res.ok) {
    throw new Error(`Falha no ack da impressao (HTTP ${res.status}).`);
  }
  const data = await res.json().catch(() => null);
  if (data && data.ok === false) {
    throw new Error("Ack recusado pelo servidor.");
  }
}

function formatarMoeda(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function quebrarLinhaPorPalavras(texto = "", maxCols = getWrapColumns()) {
  const limite = Math.min(120, Math.max(12, Number(maxCols) || getWrapColumns()));
  const linhas = [];
  const blocos = String(texto || "").replace(/\r/g, "").split("\n");

  blocos.forEach((bloco) => {
    const palavras = bloco.trim().split(/\s+/).filter(Boolean);
    if (!palavras.length) {
      linhas.push("");
      return;
    }

    let atual = "";
    const pushPalavraLonga = (palavra) => {
      for (let i = 0; i < palavra.length; i += limite) {
        const pedaco = palavra.slice(i, i + limite);
        if (pedaco.length === limite || i + limite < palavra.length) {
          linhas.push(pedaco);
        } else {
          atual = pedaco;
        }
      }
    };

    palavras.forEach((palavra) => {
      if (!atual) {
        if (palavra.length <= limite) {
          atual = palavra;
        } else {
          pushPalavraLonga(palavra);
        }
        return;
      }

      if (atual.length + 1 + palavra.length <= limite) {
        atual += ` ${palavra}`;
        return;
      }

      linhas.push(atual);
      atual = "";
      if (palavra.length <= limite) {
        atual = palavra;
      } else {
        pushPalavraLonga(palavra);
      }
    });

    if (atual) linhas.push(atual);
  });

  return linhas.length ? linhas : [""];
}

function quebrarListaLinhas(lista = []) {
  const saida = [];
  (Array.isArray(lista) ? lista : [lista]).forEach((linha) => {
    quebrarLinhaPorPalavras(linha).forEach((parte) => saida.push(parte));
  });
  return saida;
}

function printerPrintWrapped(printer, texto = "") {
  quebrarLinhaPorPalavras(texto).forEach((linha) => printer.println(linha));
}

function formatarOrigemPedido(origem) {
  const key = String(origem || "").trim().toLowerCase();
  if (key === "porta") return "Cliente na porta";
  if (key === "telefone") return "Telefone";
  if (key === "whatsapp") return "WhatsApp";
  if (key === "site") return "Site";
  if (key === "outro") return "Outro";
  return origem || "-";
}

function toArray(valor) {
  return Array.isArray(valor) ? valor : [];
}

function toArrayLoose(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor === null || typeof valor === "undefined" || valor === "") return [];
  return [valor];
}

function parseNumero(valor, fallback = 0) {
  if (typeof valor === "string") {
    const limpo = valor.replace(/[^\d,.-]/g, "").trim();
    if (!limpo) return fallback;
    const normalizado = limpo.includes(",")
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo;
    const num = Number(normalizado);
    return Number.isFinite(num) ? num : fallback;
  }
  const num = Number(valor);
  return Number.isFinite(num) ? num : fallback;
}

function parseNumeroOpcional(valor) {
  const num = parseNumero(valor, Number.NaN);
  return Number.isFinite(num) ? num : null;
}

function parseQtd(valor, fallback = 1) {
  return Math.max(parseNumero(valor, fallback) || fallback, 1);
}

function obterPrimeiroTexto(obj = {}, chaves = []) {
  for (const chave of chaves) {
    const valor = obj?.[chave];
    if (typeof valor === "string" && valor.trim()) return valor.trim();
    if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  }
  return "";
}

function assinaturaValor(valor) {
  if (valor === null || typeof valor === "undefined") return "";
  if (typeof valor === "string") return `s:${valor.trim().toLowerCase()}`;
  if (typeof valor === "number") return `n:${valor}`;
  if (typeof valor === "boolean") return `b:${valor ? 1 : 0}`;
  try {
    return `j:${JSON.stringify(valor)}`;
  } catch {
    return `x:${String(valor)}`;
  }
}

const OBS_ITEM_KEYS = ["obs", "observacao", "observacoes", "comentario", "comentarios", "nota", "note"];
const REMOVIDOS_ITEM_KEYS = ["removidos", "sem", "retirados", "ingredientesRemovidos"];
const ADICIONAIS_ITEM_KEYS = ["adicionais", "extras", "acrescimos", "complementos", "opcionais"];
const COMBO_COMPONENT_KEYS = [
  "itens",
  "itensCombo",
  "itens_combo",
  "comboItens",
  "combo_itens",
  "componentes",
  "opcoes",
  "opcoesSelecionadas",
  "opcoes_selecionadas",
  "escolhas",
  "selecionados",
  "produtos",
  "items",
];
const NOME_COMPONENTE_KEYS = ["nome", "item", "titulo", "label", "descricao", "description", "produto", "name", "sabor"];

function obterObsItem(item = {}) {
  const textoDireto = obterPrimeiroTexto(item, OBS_ITEM_KEYS);
  if (textoDireto) return textoDireto;
  if (Array.isArray(item?.observacoes)) {
    return item.observacoes.map((obs) => String(obs || "").trim()).filter(Boolean).join(" | ");
  }
  return "";
}

function obterListaRemovidos(item = {}) {
  const removidos = [];
  REMOVIDOS_ITEM_KEYS.forEach((chave) => {
    removidos.push(...toArrayLoose(item?.[chave]));
  });
  const unicos = new Set();
  return removidos
    .map((rem) => {
      if (!rem) return "";
      if (typeof rem === "string") return rem.trim();
      return String(rem.nome || rem.item || rem.ingrediente || "").trim();
    })
    .filter((nome) => {
      const chave = nome.toLowerCase();
      if (!nome || unicos.has(chave)) return false;
      unicos.add(chave);
      return true;
    });
}

function obterListaAdicionais(item = {}) {
  const candidatos = [];
  ADICIONAIS_ITEM_KEYS.forEach((chave) => {
    candidatos.push(...toArrayLoose(item?.[chave]));
  });
  const mapa = new Map();
  candidatos
    .map((add) => {
      if (!add) return null;
      if (typeof add === "string") return { nome: add.trim(), qtd: 1, preco: 0 };
      const addObj = add?.adicional && typeof add.adicional === "object" ? { ...add.adicional, ...add } : add;
      const nome = obterPrimeiroTexto(addObj, NOME_COMPONENTE_KEYS);
      const qtd = globalThis.MegaPricing.quantity(addObj?.qtd ?? addObj?.quantidade ?? addObj?.qty ?? addObj?.amount ?? 1);
      const preco = parseNumero(addObj?.preco ?? addObj?.valor ?? addObj?.price ?? addObj?.unitPrice, 0);
      return {
        nome: String(nome || "").trim(),
        qtd,
        preco,
        escopo: String(addObj?.escopo || addObj?.scope || "").trim(),
      };
    })
    .filter((add) => add && add.nome && add.qtd > 0)
    .forEach((add) => {
      const chave = `${add.nome.toLowerCase()}|${add.preco.toFixed(2)}|${add.escopo}`;
      const atual = mapa.get(chave);
      if (atual) {
        atual.qtd += add.qtd;
      } else {
        mapa.set(chave, { ...add });
      }
    });
  return Array.from(mapa.values());
}

function isAdicionalTotal(add = {}) {
  return String(add?.escopo || "").trim().toLowerCase() === "total";
}

function normalizarAlteracaoItemTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveRemocaoItem(valor) {
  return normalizarAlteracaoItemTexto(valor)
    .replace(/^(sem|tirar|retirar|remove|remover|nao colocar|nao poe)\s+/, "")
    .trim();
}

function chaveAdicionalItem(valor) {
  return normalizarAlteracaoItemTexto(valor)
    .replace(/^(mais|com|adicional de|adicional|adicionar|acrescentar|colocar)\s+/, "")
    .trim();
}

function dividirObsItem(valor) {
  return String(valor || "")
    .split(/\s*(?:,|;|\||\be\b)\s*/i)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

function formatarSemItem(nome) {
  const texto = String(nome || "")
    .trim()
    .replace(/[\u2013\u2014-]/g, " ")
    .replace(/\s+/g, " ");
  if (!texto) return "";
  return `Sem ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}

function formatarAlteracoesItem(item = {}) {
  const removidos = obterListaRemovidos(item);
  const adicionais = obterListaAdicionais(item);
  const removidosKeys = new Set(removidos.map(chaveRemocaoItem));
  const adicionaisKeys = new Set(adicionais.map((add) => normalizarAlteracaoItemTexto(add.nome)));
  const obsLivre = dividirObsItem(obterObsItem(item)).filter((parte) => {
    if (removidosKeys.has(chaveRemocaoItem(parte))) return false;
    if (adicionaisKeys.has(chaveAdicionalItem(parte))) return false;
    return true;
  }).join("; ");
  const linhas = [
    ...removidos.map(formatarSemItem).filter(Boolean),
    ...adicionais.map((add) => {
      const sufixoQtd = add.qtd > 1 ? ` x${add.qtd}` : "";
      const sufixoPreco = add.preco > 0 ? ` (${formatarMoeda(add.preco * add.qtd)})` : "";
      return `Adicional: ${add.nome}${sufixoQtd}${sufixoPreco}`;
    }),
    ...(obsLivre ? [`Obs: ${obsLivre}`] : []),
  ];
  return { linhas, obs: obsLivre, removidos, adicionais };
}

function obterComponentesCombo(item = {}) {
  const resultado = [];
  const vistos = new Set();
  COMBO_COMPONENT_KEYS.forEach((chave) => {
    toArrayLoose(item?.[chave]).forEach((entrada) => {
      const assinatura = assinaturaValor(entrada);
      if (!assinatura || vistos.has(assinatura)) return;
      vistos.add(assinatura);
      resultado.push(entrada);
    });
  });
  return resultado;
}

function formatarLinhasComponente(item = {}) {
  if (!item) return [];
  if (typeof item === "string") return [`  * ${item.trim()}`];

  const nome = obterPrimeiroTexto(item, NOME_COMPONENTE_KEYS) || "Item do combo";
  const qtd = parseQtd(item?.qtd ?? item?.quantidade ?? item?.qty, 1);
  const prefixoQtd = qtd > 1 ? `${qtd}x ` : "";
  const linhas = [`  * ${prefixoQtd}${nome}`];

  formatarAlteracoesItem(item).linhas.forEach((linha) => linhas.push(`    ${linha}`));

  return linhas;
}

function calcularSubtotalItem(item = {}) {
  return globalThis.MegaPricing.itemSubtotal({ ...item, adicionais: obterListaAdicionais(item) });
}

function formatarLinhaItem(item = {}) {
  const qtd = parseQtd(item?.qtd, 1);
  const nome = String(item.nome || "Item").trim();
  const subtotal = calcularSubtotalItem(item);
  const texto = `${qtd}x ${nome}`.trim();
  const linha = subtotal > 0 ? `${texto} ${formatarMoeda(subtotal)}` : texto;
  const linhas = [linha];
  formatarAlteracoesItem(item).linhas.forEach((linhaAlt) => linhas.push(`  ${linhaAlt}`));
  const componentesCombo = obterComponentesCombo(item);
  componentesCombo.forEach((comp) => {
    formatarLinhasComponente(comp).forEach((linhaComp) => linhas.push(linhaComp));
  });
  return linhas;
}

function linhaDuasColunas(esquerda = "", direita = "", maxCols = getWrapColumns()) {
  const left = String(esquerda || "").trim();
  const right = String(direita || "").trim();
  if (!right) return left;
  const espacos = maxCols - left.length - right.length;
  if (espacos >= 1) return `${left}${" ".repeat(espacos)}${right}`;
  return `${left}\n${right.padStart(Math.min(maxCols, right.length + 2))}`;
}

function criarLinha(texto = "", opcoes = {}) {
  return { texto: String(texto ?? ""), ...opcoes };
}

function criarLinhaColunas(esquerda = "", direita = "", opcoes = {}) {
  const escala = opcoes.grande || opcoes.destaque ? 2 : 1;
  return criarLinha(linhaDuasColunas(esquerda, direita, getScaledWrapColumns(escala)), { preformatted: true, ...opcoes });
}

function partesLinhaCupom(linha = {}) {
  const escala = linha.grande || linha.destaque ? 2 : 1;
  const limite = getScaledWrapColumns(escala);
  if (!linha.preformatted) return quebrarLinhaPorPalavras(linha.texto, limite);
  return String(linha.texto || "").split("\n").flatMap((parte) => {
    if (parte.length <= limite) return [parte];
    return quebrarLinhaPorPalavras(parte, limite);
  });
}

function formatarDataPedido(valor) {
  const data = valor ? new Date(valor) : new Date();
  const segura = Number.isNaN(data.getTime()) ? new Date() : data;
  return segura.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarPagamentoCurto(valor) {
  const texto = String(valor || "").trim().toUpperCase();
  const temPix = texto.includes("PIX");
  const temCartao = texto.includes("CART");
  const temDinheiro = texto.includes("DINHEIRO");
  if ([temPix, temCartao, temDinheiro].filter(Boolean).length > 1) return "MISTO";
  if (temCartao) return "CARTAO";
  if (temDinheiro) return "DINH.";
  if (temPix) return "PIX";
  return texto ? texto.slice(0, 6) : "N/I";
}

function montarCupomPedido(payload = {}) {
  const carrinho = Array.isArray(payload.carrinho) ? payload.carrinho : [];
  const totalItensCalculado = carrinho.reduce((sum, item) => sum + calcularSubtotalItem(item), 0);
  const taxaEntrega = parseNumero(payload.taxaEntrega ?? payload.taxa_entrega, 0);
  const desconto = Math.max(parseNumero(payload.desconto, 0), 0);
  const totalItensOficial = parseNumeroOpcional(payload.subtotal ?? payload.totalItens ?? payload.total_itens);
  const totalOficial = parseNumeroOpcional(payload.total ?? payload.totalFinal ?? payload.total_final);
  const totalItens = totalItensOficial !== null ? Math.max(totalItensOficial, 0) : totalItensCalculado;
  const total = totalOficial !== null ? Math.max(totalOficial, 0) : globalThis.MegaPricing.money(Math.max(totalItens - (totalItensOficial === null ? desconto : 0), 0) + taxaEntrega);
  const ocultarParciaisRecalculadas = (totalItensOficial !== null || totalOficial !== null)
    && Math.abs(totalItensCalculado - totalItens) > 0.05;
  const separador = "-".repeat(getWrapColumns());
  const tipo = String(payload.tipoEntrega || "Pedido").trim().toUpperCase();
  const obsPedido = String(
    payload.obsGeral || payload.observacao || payload.observacoes || payload.obs || ""
  ).trim();
  const linhas = [
    criarLinha("MEGA LANCHES", { align: "center", bold: true, destaque: true }),
    criarLinha(`PEDIDO #${payload.id || "-"}`, { align: "center", bold: true, grande: true }),
    criarLinha(tipo, { align: "center", bold: true, grande: true }),
    criarLinha(separador),
    criarLinha("CLIENTE", { bold: true }),
    criarLinha(payload.cliente || "Nao informado", { bold: true, grande: true }),
    criarLinha("TELEFONE", { bold: true }),
    criarLinha(payload.telefone || "Nao informado", { bold: true, grande: true }),
  ];

  if (payload.endereco) {
    linhas.push(
      criarLinha("ENDERECO", { bold: true }),
      criarLinha(payload.endereco, { bold: true, grande: true })
    );
  }
  if (payload.origemPedido || payload.origem_pedido) {
    linhas.push(criarLinha(`Origem: ${formatarOrigemPedido(payload.origemPedido || payload.origem_pedido)}`));
  }

  linhas.push(criarLinha(separador), criarLinha("ITENS DO PEDIDO", { align: "center", bold: true }));
  if (!carrinho.length) linhas.push(criarLinha("Nenhum item informado"));

  carrinho.forEach((item, index) => {
    const qtd = globalThis.MegaPricing.quantity(item?.qtd);
    if (!qtd) return;
    const nome = String(item?.nome || "Item").trim().toUpperCase();
    const subtotal = calcularSubtotalItem(item);
    linhas.push(criarLinhaColunas(
      `${qtd}x ${nome}`,
      !ocultarParciaisRecalculadas && subtotal > 0 ? formatarMoeda(subtotal) : "",
      { bold: true, grande: true }
    ));
    const alteracoes = formatarAlteracoesItem(item);
    alteracoes.removidos.forEach((nomeRemovido) => linhas.push(criarLinha(`- SEM ${String(nomeRemovido).toUpperCase()}`, { bold: true, grande: true })));
    alteracoes.adicionais.forEach((add) => {
      const quantidadeTotal = add.qtd * (isAdicionalTotal(add) ? 1 : qtd);
      const qtdAdd = ' x' + quantidadeTotal + ' TOTAL';
      const precoAdd = !ocultarParciaisRecalculadas && add.preco > 0 ? ' ' + formatarMoeda(add.preco * quantidadeTotal) : '';
      linhas.push(criarLinha(`+ ${String(add.nome).toUpperCase()}${qtdAdd}${precoAdd}`, { bold: true, grande: true }));
    });
    if (alteracoes.obs) linhas.push(criarLinha(`> OBS: ${alteracoes.obs.toUpperCase()}`, { bold: true, grande: true }));
    obterComponentesCombo(item).forEach((comp) => {
      formatarLinhasComponente(comp).forEach((linha) => linhas.push(criarLinha(linha)));
    });
    if (index < carrinho.length - 1) linhas.push(criarLinha(""));
  });

  if (obsPedido) {
    linhas.push(
      criarLinha(separador),
      criarLinha("ATENCAO / OBSERVACOES", { align: "center", bold: true }),
      criarLinha(`>>> ${obsPedido.toUpperCase()} <<<`, { bold: true, grande: true })
    );
  }

  const detalhesPagamento = Array.isArray(payload.pagamentosDetalhes) ? payload.pagamentosDetalhes : [];
  const troco = parseNumero(payload.troco, 0);
  if (detalhesPagamento.length || troco > 0) {
    linhas.push(criarLinha(separador), criarLinha("PAGAMENTO", { bold: true }));
    detalhesPagamento.forEach((item) => {
      const metodo = String(item?.metodo || "").trim();
      const valor = parseNumero(item?.valor, 0);
      if (metodo && valor > 0) linhas.push(criarLinhaColunas(metodo, formatarMoeda(valor)));
    });
    if (troco > 0) linhas.push(criarLinha(`TROCO: ${formatarMoeda(troco)}`, { bold: true, grande: true }));
  }

  linhas.push(criarLinha(separador));
  linhas.push(criarLinhaColunas("Subtotal", formatarMoeda(totalItensOficial !== null ? totalItens + desconto : totalItens)));
  if (taxaEntrega > 0) linhas.push(criarLinhaColunas("Taxa de entrega", formatarMoeda(taxaEntrega)));
  if (desconto > 0) linhas.push(criarLinhaColunas("Desconto", `- ${formatarMoeda(desconto)}`));
  if (payload.cupom) linhas.push(criarLinha(`Cupom: ${String(payload.cupom).toUpperCase()}`));
  const totalCompacto = formatarMoeda(total).replace("R$ ", "R$");
  const pagamentoCurto = formatarPagamentoCurto(payload.pagamento);
  linhas.push(
    criarLinha("TOTAL / PAGAMENTO", { align: "center", bold: true }),
    criarLinha(`${totalCompacto} ${pagamentoCurto}`, { align: "center", bold: true, grande: true }),
    criarLinha(separador),
    criarLinha(formatarDataPedido(payload.created_at), { align: "center" }),
    criarLinha("Obrigado!", { align: "center", bold: true }),
    criarLinha("")
  );
  return linhas;
}

function renderizarCupomTexto(payload = {}) {
  const linhas = [];
  montarCupomPedido(payload).forEach((linha) => {
    partesLinhaCupom(linha).forEach((parte) => linhas.push(parte));
  });
  return linhas.join(os.EOL);
}

function renderizarCupomEscPos(payload = {}) {
  const ESC = "\x1b";
  const GS = "\x1d";
  const saida = [];
  montarCupomPedido(payload).forEach((linha) => {
    const align = linha.align === "center" ? 1 : linha.align === "right" ? 2 : 0;
    // Nunca usa 1x2: isso deforma as letras. Destaques ficam quadrados em 2x2
    // e os dados secundarios permanecem proporcionais em 1x1.
    const escalaDestaque = Math.min(2, PRINT_RAW_SCALE_X, PRINT_RAW_SCALE_Y);
    const escalaX = linha.grande || linha.destaque ? escalaDestaque : 1;
    const escalaY = escalaX;
    const scaleByte = ((escalaX - 1) << 4) | (escalaY - 1);
    saida.push(`${ESC}a${String.fromCharCode(align)}`);
    saida.push(`${ESC}E${String.fromCharCode(linha.bold && PRINT_RAW_BOLD ? 1 : 0)}`);
    saida.push(`${GS}!${String.fromCharCode(scaleByte)}`);
    partesLinhaCupom(linha).forEach((parte) => saida.push(`${parte}\n`));
  });
  saida.push(`${ESC}a\x00${ESC}E\x00${GS}!\x00`);
  return saida.join("");
}

function gerarTextoPedido(payload = {}) {
  return renderizarCupomTexto(payload);
}

function psEscape(texto = "") {
  return String(texto).replace(/'/g, "''");
}

function runPowershell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true }
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(true);
      reject(new Error(stderr.trim() || `PowerShell finalizou com codigo ${code}`));
    });
  });
}

function getRawEscPosScript(filePath, printerName) {
  const encLiteral = /^\d+$/.test(PRINT_RAW_ENCODING)
    ? PRINT_RAW_ENCODING
    : `'${psEscape(PRINT_RAW_ENCODING)}'`;

  return `
$ErrorActionPreference = 'Stop'
$file = '${psEscape(filePath)}'
$printer = '${psEscape(printerName)}'

$text = Get-Content -LiteralPath $file -Raw -Encoding UTF8
$enc = [System.Text.Encoding]::GetEncoding(${encLiteral})
$body = $enc.GetBytes($text)

$bytes = New-Object System.Collections.Generic.List[byte]
$bytes.AddRange([byte[]](0x1B,0x40)) | Out-Null
$bytes.AddRange([byte[]](0x1B,0x74,${PRINT_RAW_CODEPAGE_TABLE})) | Out-Null
$bytes.AddRange($body) | Out-Null
$bytes.AddRange([byte[]](0x1D,0x21,0x00,0x0A,0x0A,0x0A,0x1D,0x56,0x41,0x03)) | Out-Null
$data = $bytes.ToArray()

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPWStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)]
    public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, DOCINFOA di);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] bytes, int count, out int written);
}
"@

$hPrinter = [IntPtr]::Zero
if (-not [RawPrinterHelper]::OpenPrinter($printer, [ref]$hPrinter, [IntPtr]::Zero)) {
  throw "Falha ao abrir impressora: $printer"
}

try {
  $doc = New-Object RawPrinterHelper+DOCINFOA
  $doc.pDocName = "Mega Lanches"
  $doc.pDataType = "RAW"

  if (-not [RawPrinterHelper]::StartDocPrinter($hPrinter, 1, $doc)) {
    throw "StartDocPrinter falhou"
  }
  if (-not [RawPrinterHelper]::StartPagePrinter($hPrinter)) {
    throw "StartPagePrinter falhou"
  }
  $written = 0
  if (-not [RawPrinterHelper]::WritePrinter($hPrinter, $data, $data.Length, [ref]$written)) {
    throw "WritePrinter falhou"
  }
  [RawPrinterHelper]::EndPagePrinter($hPrinter) | Out-Null
  [RawPrinterHelper]::EndDocPrinter($hPrinter) | Out-Null
} finally {
  if ($hPrinter -ne [IntPtr]::Zero) {
    [RawPrinterHelper]::ClosePrinter($hPrinter) | Out-Null
  }
}
`.trim();
}

async function imprimirWindows(job) {
  if (!PRINTER_NAME) {
    throw new Error("PRINT_INTERFACE invalida para backend windows.");
  }
  const payload = job?.payload || {};
  const texto = (WINDOWS_PRINT_MODE === "raw" ? renderizarCupomEscPos(payload) : gerarTextoPedido(payload)).replace(/\n/g, "\r\n");
  const tmp = path.join(os.tmpdir(), `mega-print-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);
  await fs.writeFile(tmp, texto, "utf8");
  try {
    if (WINDOWS_PRINT_MODE === "out-printer") {
      const cmd =
        `Get-Content -LiteralPath '${psEscape(tmp)}' -Raw -Encoding UTF8 ` +
        `| Out-Printer -Name '${psEscape(PRINTER_NAME)}'`;
      await runPowershell(cmd);
    } else if (WINDOWS_PRINT_MODE === "raw") {
      await runPowershell(
        getRawEscPosScript(tmp, PRINTER_NAME)
      );
    } else {
      const cmd = [
        `$file = '${psEscape(tmp)}'`,
        `$printer = '${psEscape(PRINTER_NAME)}'`,
        "$p = Start-Process -FilePath notepad.exe -ArgumentList @('/pt', $file, $printer) -WindowStyle Hidden -PassThru",
        "if ($p) {",
        "  $p.WaitForExit()",
        "  if ($p.ExitCode -ne 0) { exit $p.ExitCode }",
        "}",
      ].join("; ");
      await runPowershell(cmd);
    }
    return true;
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}

function criarPrinter() {
  const cfg = {
    type: PRINT_TYPE,
    interface: PRINT_INTERFACE,
    lineCharacter: "-",
    options: { timeout: 5000 },
  };
  if (PRINTER_DRIVER) cfg.driver = PRINTER_DRIVER;
  return new ThermalPrinter(cfg);
}

async function imprimirThermal(job) {
  const printer = criarPrinter();
  const payload = job?.payload || {};
  montarCupomPedido(payload).forEach((linha) => {
    if (linha.align === "center") printer.alignCenter();
    else if (linha.align === "right") printer.alignRight();
    else printer.alignLeft();
    printer.bold(Boolean(linha.bold));
    partesLinhaCupom(linha).forEach((parte) => printer.println(parte));
  });
  printer.bold(false);
  printer.newLine();
  printer.cut();
  return printer.execute();
}

async function imprimir(job) {
  if (PRINT_BACKEND === "windows") return imprimirWindows(job);
  return imprimirThermal(job);
}

async function loop() {
  while (true) {
    try {
      const job = await fetchNext();
      if (job) {
        try {
          const ok = await imprimir(job);
          if (ok) {
            await ack(job.id, "impresso");
            if (VERBOSE) console.log(`[PRINT] Pedido ${job.pedido_id || job.id} impresso.`);
          } else {
            await ack(job.id, "erro");
            console.error(`[PRINT] Falha ao imprimir job ${job.id}. Marcado como erro.`);
          }
        } catch (jobErr) {
          await ack(job.id, "erro").catch(() => {});
          throw jobErr;
        }
      }
    } catch (err) {
      console.error("[PRINT]", err?.message || err);
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

const EXECUTADO_DIRETAMENTE = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

async function iniciarAgente() {
  const travaAdquirida = await adquirirTravaAgente();
  if (!travaAdquirida) {
    console.error("[PRINT] O agente ja esta funcionando em segundo plano. Nao abra outro iniciador.");
    return;
  }

  // Remove o marcador usado pelas versoes antigas. A nova trava desaparece
  // automaticamente quando o processo realmente fecha.
  await fs.unlink(path.join(os.tmpdir(), "mega-lanches-print-agent.lock")).catch(() => {});

  console.log("[PRINT] Agente iniciado.");
  console.log(`[PRINT] Server: ${SERVER_URL}`);
  console.log(`[PRINT] Interface: ${PRINT_INTERFACE}`);
  console.log(`[PRINT] Backend: ${PRINT_BACKEND}`);
  if (PRINT_BACKEND === "windows") {
    console.log(`[PRINT] Modo Windows: ${WINDOWS_PRINT_MODE}`);
    if (WINDOWS_PRINT_MODE === "raw") {
      console.log(`[PRINT] RAW escala do cabecalho (LxA): ${PRINT_RAW_SCALE_X}x${PRINT_RAW_SCALE_Y}`);
      console.log(`[PRINT] RAW negrito: ${PRINT_RAW_BOLD ? "on" : "off"}`);
      console.log(`[PRINT] RAW encoding: ${PRINT_RAW_ENCODING}`);
      console.log(`[PRINT] RAW codepage table: ${PRINT_RAW_CODEPAGE_TABLE}`);
    }
  }
  console.log(`[PRINT] Colunas texto: ${getWrapColumns()}`);
  if (PRINT_BACKEND === "thermal") console.log(`[PRINT] Tipo: ${PRINT_TYPE_KEY}`);
  console.log(PRINT_TOKEN ? "[PRINT] Token: configurado" : "[PRINT] Token: vazio (aceitando sem token)");

  await loop();
}

if (EXECUTADO_DIRETAMENTE && process.argv.includes("--preview")) {
  console.log(gerarTextoPedido({
    id: 1489,
    cliente: "Daniel Vieira da Costa",
    telefone: "35992241045",
    endereco: "Rua das Flores, 120",
    tipoEntrega: "Entrega",
    origemPedido: "atendente",
    pagamento: "Dinheiro",
    troco: "100,00",
    taxaEntrega: 5,
    desconto: 4,
    cupom: "CLIENTE10",
    carrinho: [
      { nome: "X-Tudo", qtd: 2, preco: 28, removidos: ["tomate", "milho"], adicionais: [{ nome: "Maionese caseira", qtd: 2, preco: 0 }] },
      { nome: "Coca-Cola 2L", qtd: 1, preco: 12 },
    ],
    obsGeral: "Partir os dois lanches e mandar o refrigerante gelado",
    created_at: new Date().toISOString(),
  }));
} else if (EXECUTADO_DIRETAMENTE) {
  iniciarAgente().catch((err) => {
    console.error("[PRINT] Falha ao iniciar:", err?.message || err);
    process.exitCode = 1;
  });
}

export { calcularSubtotalItem, gerarTextoPedido, montarCupomPedido, parseNumero, renderizarCupomEscPos };
