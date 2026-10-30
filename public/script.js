// ===================== VARIAVEIS GLOBAIS =====================
window.carrinho = [];
let menu = [];
let categoriaAtual = "hamburguer";
let itemSelecionado = null;
let qtdLanche = 1;
let taxaEntregaValor = 9.00;
let enviando = false;

// Adicionais dinamicos
let adicionaisDisponiveis = [];

// ===================== ELEMENTOS =====================
const menuDiv = document.getElementById("menu");
const modal = document.getElementById("modal");
const modalNome = document.getElementById("modal-nome");
const modalImg = document.getElementById("modal-img");
const modalIngredientes = document.getElementById("modal-ingredientes");
const modalAdicionais = document.getElementById("modal-adicionais");
const modalObs = document.getElementById("modal-obs");
const modalAdicionar = document.getElementById("modal-adicionar");
const modalProdutoContent = modal ? modal.querySelector(".modal-content") : null;
const modalScrollHint = document.getElementById("modal-scroll-hint");
const fecharModalBtn = document.getElementById("fechar-modal");

const btnCarrinho = document.getElementById("btn-carrinho");
const btnCarrinhoLabel = document.getElementById("btn-carrinho-label");
const btnCarrinhoResumo = document.getElementById("btn-carrinho-resumo");
const modalCarrinho = document.getElementById("modal-carrinho");
const fecharCarrinhoBtn = document.getElementById("fechar-carrinho");
const itensCarrinhoDiv = document.getElementById("itens-carrinho");
const upsellBebidasDiv = document.getElementById("upsell-bebidas");
const obsGeral = document.getElementById("obs-geral");
const prosseguir = document.getElementById("prosseguir");

const modalFinalizar = document.getElementById("modal-finalizar");
const fecharFinalizarBtn = document.getElementById("fechar-finalizar");
const modalSucesso = document.getElementById("modal-sucesso");
const fecharSucessoBtn = document.getElementById("fechar-sucesso");
const cupomCodigoInput = document.getElementById("cupom-codigo");
const aplicarCupomBtn = document.getElementById("aplicar-cupom");
const descontoFinal = document.getElementById("desconto-finalizar");

let descontoAplicado = 0;
let cupomAplicado = "";
const pedidoNumero = document.getElementById("pedido-numero");
const nomeCliente = document.getElementById("nome-cliente");
const telefoneCliente = document.getElementById("telefone-cliente");
const endereco = document.getElementById("endereco");
const pagamento = document.getElementById("pagamento");
const tipoEntrega = document.getElementById("tipo-entrega");
const chavePix = document.getElementById("chave-pix");
const troco = document.getElementById("troco");
const pagamentoDivididoToggle = document.getElementById("pagamento-dividido");
const pagamentoDivididoBox = document.getElementById("pagamento-dividido-box");
const pagamentosDivididosLista = document.getElementById("pagamentos-divididos-lista");
const addPagamentoDivididoBtn = document.getElementById("add-pagamento-dividido");
const pagamentoDivididoResumo = document.getElementById("pagamento-dividido-resumo");
const confirmar = document.getElementById("confirmar");

const subtotalFinal = document.getElementById("subtotal-finalizar");
const taxaFinal = document.getElementById("taxa-finalizar");
const totalFinal = document.getElementById("total-finalizar");

const toastContainer = document.getElementById("toast-container");
const buscaInput = document.getElementById("busca-cardapio");
const tempoEntregaPill = document.getElementById("tempo-entrega-pill");
const tempoRetiradaPill = document.getElementById("tempo-retirada-pill");
const pedidoAnteriorCard = document.getElementById("pedido-anterior-card");
const pedidoAnteriorTitulo = document.getElementById("pedido-anterior-titulo");
const pedidoAnteriorResumo = document.getElementById("pedido-anterior-resumo");
const pedidoAnteriorRepetirBtn = document.getElementById("pedido-anterior-repetir");
const pedidoAnteriorDadosBtn = document.getElementById("pedido-anterior-dados");
let pixAlert = document.getElementById("pix-alert");
const categoriasNav = document.querySelector(".categorias");
let categoriasCache = [];

let configPublic = {
  tempo_entrega_min: null,
  tempo_retirada_min: null,
  whatsapp: "",
  msg_pix: "",
  promo_xtudo_preco_unidade: 22,
  promo_xtudo_preco_combo: 20,
  promo_xtudo_min_qtd: 2,
  promo_tag_text: "Promocao",
  promo_destaque_text: "X-Tudo R$ {preco_unidade} cada",
  promo_sub_text: "{min_qtd}+ por R$ {preco_combo}",
  funcionamento_dias: [],
  funcionamento_abre: "",
  funcionamento_fecha: "",
  logo_url: "",
  tema_cardapio: "original",
  default_ddd: "35"
};

let buscaTexto = "";
const DADOS_CLIENTE_STORAGE_KEY = "mega_lanches_cliente_v1";
const CARRINHO_STORAGE_KEY = "mega_lanches_carrinho_v1";
const ULTIMO_PEDIDO_STORAGE_KEY = "mega_lanches_ultimo_pedido_v1";
const MARKETING_VISITOR_STORAGE_KEY = "mega_lanches_marketing_visitor_v1";

function obterVisitanteMarketingId() {
  try {
    let value = localStorage.getItem(MARKETING_VISITOR_STORAGE_KEY) || "";
    if (/^[A-Za-z0-9_-]{16,80}$/.test(value)) return value;
    value = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replaceAll("-", "")
      : `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
    localStorage.setItem(MARKETING_VISITOR_STORAGE_KEY, value);
    return value;
  } catch {
    return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  }
}

function registrarInteracaoProduto(item, evento) {
  const produtoId = String(item?.id ?? item?.produtoId ?? "").trim();
  if (!produtoId || !["view", "cart"].includes(evento)) return;
  fetch("/marketing/interacao-produto", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitanteId: obterVisitanteMarketingId(), produtoId, evento }),
    keepalive: true,
  }).catch(() => {});
}
let salvarDadosClienteTimer = null;
let salvarCarrinhoTimer = null;

function aplicarTemaSite(theme) {
  const temas = ["copa-brasil", "chapa-fogo", "diner-retro", "neon-noturno", "fliperama-90", "rota-66", "boteco-raiz", "aranha-urbana"];
  const normalizado = temas.includes(theme) ? theme : "original";
  temas.forEach((value) => document.body.classList.toggle(`theme-${value}`, value === normalizado));
  document.body.dataset.temaCardapio = normalizado;
}

function atualizarIndicadorScrollModalProduto() {
  if (!modalProdutoContent || !modalScrollHint) return;
  const modalAberto = modal && modal.style.display === "flex";
  if (!modalAberto) {
    modalScrollHint.classList.add("oculto");
    return;
  }

  const overflow = modalProdutoContent.scrollHeight - modalProdutoContent.clientHeight;
  const restante = overflow - modalProdutoContent.scrollTop;
  const mostrar = overflow > 40 && restante > 120;
  modalScrollHint.classList.toggle("oculto", !mostrar);
}

function normalizarTextoBusca(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactarTextoBusca(texto) {
  return normalizarTextoBusca(texto).replace(/\s+/g, "");
}

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

function dddPadraoPublico() {
  const ddd = String(configPublic.default_ddd || "").replace(/\D/g, "").slice(-2);
  return DDDS_BRASIL_VALIDOS.has(ddd) ? ddd : "35";
}

function normalizarTelefoneBrasilPublico(valor) {
  const original = String(valor || "");
  let digits = original.replace(/\D/g, "");
  if (!digits) return { valido: false, erro: "telefone_vazio", digits: "", nacional: "", internacional: "", tipo: "" };

  if (digits.startsWith("0055")) digits = digits.slice(2);
  if (digits.startsWith("055")) digits = digits.slice(1);
  if (!digits.startsWith("55") && digits.startsWith("0")) {
    const semZero = digits.slice(1);
    const semOperadora = digits.slice(3);
    if (semZero.length === 10 || semZero.length === 11) digits = semZero;
    else if (semOperadora.length === 10 || semOperadora.length === 11) digits = semOperadora;
  }

  const tamanhoSemPais = digits.startsWith("55") ? digits.length - 2 : digits.length;
  let nacional = digits.startsWith("55") && tamanhoSemPais >= 10 && tamanhoSemPais <= 13
    ? digits.slice(2)
    : digits;
  if (nacional.length === 8 || nacional.length === 9) {
    nacional = `${dddPadraoPublico()}${nacional}`;
  }

  const ddd = nacional.slice(0, 2);
  if (!DDDS_BRASIL_VALIDOS.has(ddd)) {
    return { valido: false, erro: "ddd_invalido", digits, nacional: "", internacional: "", ddd, tipo: "" };
  }

  const local = nacional.slice(2);
  if (local.length === 8) {
    if (/^[2-5]/.test(local)) return { valido: true, erro: "", digits, nacional, internacional: `55${nacional}`, ddd, tipo: "fixo" };
    if (/^[6-9]/.test(local)) {
      return { valido: true, erro: "", digits, nacional, internacional: `55${nacional}`, ddd, tipo: "celular" };
    }
    return { valido: false, erro: "telefone_incompleto", digits, nacional: "", internacional: "", ddd, tipo: "" };
  }

  if (local.length === 9) {
    if (local[0] === "9") return { valido: true, erro: "", digits, nacional, internacional: `55${nacional}`, ddd, tipo: "celular" };
    if (/^[2-5]/.test(local)) return { valido: false, erro: "fixo_com_tamanho_invalido", digits, nacional, internacional: "", ddd, tipo: "" };
    return { valido: false, erro: "numero_celular_invalido", digits, nacional, internacional: "", ddd, tipo: "" };
  }

  if (local.length > 9 && /^9+/.test(local)) {
    return { valido: true, erro: "", digits, nacional, internacional: `55${nacional}`, ddd, tipo: "celular" };
  }

  return {
    valido: false,
    erro: nacional.length < 10 ? "telefone_incompleto" : "telefone_tamanho_invalido",
    digits,
    nacional: "",
    internacional: "",
    ddd,
    tipo: "",
  };
}

function mensagemErroTelefone(resultado) {
  if (resultado?.erro === "telefone_vazio") return "Informe um telefone com DDD.";
  if (resultado?.erro === "telefone_incompleto") return "Telefone incompleto.";
  if (resultado?.erro === "ddd_invalido") return "Confira o DDD informado.";
  if (resultado?.erro === "numero_celular_invalido") return "Numero de celular invalido.";
  if (resultado?.erro === "fixo_com_tamanho_invalido") return "Telefone fixo deve ter 8 digitos apos o DDD.";
  return "Confira o telefone informado.";
}

function chaveRemocaoItem(valor) {
  return normalizarTextoBusca(valor)
    .replace(/^(sem|tirar|retirar|remove|remover|nao colocar|nao poe)\s+/, "")
    .trim();
}

function chaveAdicionalItem(valor) {
  return normalizarTextoBusca(valor)
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
  const texto = String(nome || "").trim().replace(/[\u2013\u2014-]/g, " ").replace(/\s+/g, " ");
  return texto ? `Sem ${texto.charAt(0).toLowerCase()}${texto.slice(1)}` : "";
}

function formatarAlteracoesItem(item = {}) {
  const removidos = Array.from(new Set(
    (Array.isArray(item?.removidos) ? item.removidos : Array.isArray(item?.ingredientesRemovidos) ? item.ingredientesRemovidos : [])
      .map((nome) => String(nome || "").trim())
      .filter(Boolean)
  ));
  const adicionais = (Array.isArray(item?.adicionais) ? item.adicionais : [])
    .map((add) => ({
      nome: String(add?.nome || add?.item || add?.descricao || "").trim(),
      qtd: Math.max(parseInt(add?.qtd ?? add?.quantidade ?? 1, 10) || 1, 1),
      escopo: String(add?.escopo || "unidade").toLowerCase() === "total" ? "total" : "unidade",
    }))
    .filter((add) => add.nome);
  const removidosKeys = new Set(removidos.map(chaveRemocaoItem));
  const adicionaisKeys = new Set(adicionais.map((add) => normalizarTextoBusca(add.nome)));
  const obsLivre = dividirObsItem(item?.obs || item?.observacao || "").filter((parte) => {
    if (removidosKeys.has(chaveRemocaoItem(parte))) return false;
    if (adicionaisKeys.has(chaveAdicionalItem(parte))) return false;
    return true;
  }).join("; ");
  const removidosFormatados = removidos.map(formatarSemItem).filter(Boolean);
  const qtdItem = Math.max(Number(item?.qtd) || 1, 1);
  const adicionaisFormatados = adicionais.map((add) => {
    const total = add.qtd * (add.escopo === "total" ? 1 : qtdItem);
    if (qtdItem > 1 && add.escopo !== "total") {
      return `Adicional: ${add.nome} x${add.qtd} por lanche (${total} no total)`;
    }
    return `Adicional: ${add.nome}${total > 1 ? ` x${total}${add.escopo === "total" ? " no total" : ""}` : ""}`;
  });
  return [...removidosFormatados, ...adicionaisFormatados, ...(obsLivre ? [`Obs: ${obsLivre}`] : [])];
}

function normalizarSlugCategoria(slug) {
  const chave = String(slug || "").trim().toLowerCase();
  if (["bebida", "bebidas", "refrigerante", "refrigerantes"].includes(chave)) {
    return "refrigerante";
  }
  return chave;
}

function getNomeCategoria(slug) {
  const chave = normalizarSlugCategoria(slug);
  if (!chave) return "Outros";
  if (chave === "promocao") return "Promocao";
  if (chave === "refrigerante" || chave === "refrigerantes" || chave === "bebida" || chave === "bebidas") {
    return "Bebidas";
  }

  const encontrada = categoriasCache.find(
    (cat) => normalizarSlugCategoria(cat?.slug) === chave
  );
  if (encontrada?.nome) return encontrada.nome;

  return chave
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function getCategoriasOrdenadas() {
  const ordem = [];
  const add = (slug) => {
    const chave = normalizarSlugCategoria(slug);
    if (!chave || ordem.includes(chave)) return;
    ordem.push(chave);
  };

  add("promocao");
  categoriasCache.forEach((cat) => add(cat.slug));
  menu.forEach((item) => add(item.categoria));
  return ordem;
}

function montarBotoesCategorias() {
  if (!categoriasNav) return;

  categoriasNav.innerHTML = "";
  const categorias = getCategoriasOrdenadas();
  categorias.forEach((slug) => {
    const btn = document.createElement("button");
    btn.textContent = getNomeCategoria(slug);
    btn.dataset.categoria = slug;
    categoriasNav.appendChild(btn);
  });

  if (!categorias.length) return;
  if (!categorias.includes(categoriaAtual)) categoriaAtual = categorias[0];
  setCategoriaAtiva(categoriaAtual);
}

function montarTextoBuscaItem(item) {
  const ingredientesTexto = Array.isArray(item.ingredientes)
    ? item.ingredientes.join(" ")
    : String(item.ingredientes || "");
  return normalizarTextoBusca(`${item.nome || ""} ${ingredientesTexto} ${item.categoria || ""}`);
}

function itemCorrespondeBusca(item, termoNormalizado, termoCompacto) {
  if (!termoNormalizado) return true;
  const base = montarTextoBuscaItem(item);
  const baseCompacta = base.replace(/\s+/g, "");
  if (base.includes(termoNormalizado)) return true;
  if (termoCompacto && baseCompacta.includes(termoCompacto)) return true;

  const termos = termoNormalizado.split(" ").filter(Boolean);
  if (!termos.length) return true;
  return termos.every((token) => base.includes(token) || baseCompacta.includes(token));
}

function scrollParaCategoria(slug) {
  const alvo = document.getElementById(`secao-${getCategoriaAnchor(slug)}`);
  if (!alvo) return;
  alvo.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getCategoriaAnchor(slug) {
  return String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Quantidade lanche
const qtdLancheSpan = document.getElementById("qtd-lanche");
const btnMaisLanche = document.getElementById("mais-lanche");
const btnMenosLanche = document.getElementById("menos-lanche");

// ===================== FUNCOES AUXILIARES =====================
function showToast(msg) {
  const div = document.createElement("div");
  div.className = "toast";
  div.innerText = msg;
  toastContainer.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

function formatarMoeda(valor) {
  return Number(valor || 0).toFixed(2);
}

function getResumoCarrinho() {
  const itens = window.carrinho.reduce((acc, item) => acc + Number(item?.qtd || 0), 0);
  const subtotal = calcularSubtotalCarrinho();
  return { itens, subtotal };
}

function atualizarResumoBotaoCarrinho() {
  if (!btnCarrinho) return;
  const { itens, subtotal } = getResumoCarrinho();
  const itemLabel = itens === 1 ? "item" : "itens";
  if (btnCarrinhoLabel) {
    btnCarrinhoLabel.textContent = itens > 0 ? "Ver carrinho" : "Carrinho";
  }
  if (btnCarrinhoResumo) {
    btnCarrinhoResumo.textContent = `${itens} ${itemLabel} - R$ ${formatarMoeda(subtotal)}`;
  }
}

function limparCamposInvalidosCheckout() {
  [nomeCliente, telefoneCliente, tipoEntrega, endereco, pagamento]
    .filter(Boolean)
    .forEach((el) => el.classList.remove("campo-invalido"));
}

function marcarCampoInvalido(el) {
  if (!el) return;
  el.classList.add("campo-invalido");
}

function validarCheckoutBasico(isDividido) {
  limparCamposInvalidosCheckout();

  if (!nomeCliente.value.trim()) {
    marcarCampoInvalido(nomeCliente);
    nomeCliente.focus();
    showToast("Informe seu nome completo.");
    return false;
  }

  const telefoneInfo = normalizarTelefoneBrasilPublico(telefoneCliente.value);
  if (!telefoneInfo.valido) {
    marcarCampoInvalido(telefoneCliente);
    telefoneCliente.focus();
    showToast(mensagemErroTelefone(telefoneInfo));
    return false;
  }
  telefoneCliente.dataset.normalizado = telefoneInfo.nacional;

  if (!tipoEntrega.value) {
    marcarCampoInvalido(tipoEntrega);
    tipoEntrega.focus();
    showToast("Selecione retirada ou entrega.");
    return false;
  }

  const isEntrega = String(tipoEntrega.value || "").toLowerCase() === "entrega";
  if (isEntrega && !endereco.value.trim()) {
    marcarCampoInvalido(endereco);
    endereco.focus();
    showToast("Informe o endereco para entrega.");
    return false;
  }

  if (!isDividido && !pagamento.value) {
    marcarCampoInvalido(pagamento);
    pagamento.focus();
    showToast("Selecione a forma de pagamento.");
    return false;
  }

  return true;
}

function coletarDadosClienteForm() {
  return {
    cliente: String(nomeCliente?.value || "").trim(),
    telefone: String(telefoneCliente?.value || "").trim(),
    endereco: String(endereco?.value || "").trim(),
    tipoEntrega: String(tipoEntrega?.value || "").trim(),
    pagamento: String(pagamento?.value || "").trim(),
    pagamentoDividido: Boolean(pagamentoDivididoToggle?.checked),
    pagamentosDetalhes: coletarPagamentosDivididos(),
    troco: String(troco?.value || "").trim(),
    obsGeral: String(obsGeral?.value || "").trim()
  };
}

function salvarDadosClienteNoStorage(imediato = false) {
  const executar = () => {
    try {
      const payload = coletarDadosClienteForm();
      localStorage.setItem(DADOS_CLIENTE_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Falha ao salvar dados do cliente:", err);
    }
  };

  if (imediato) {
    if (salvarDadosClienteTimer) clearTimeout(salvarDadosClienteTimer);
    salvarDadosClienteTimer = null;
    executar();
    return;
  }

  if (salvarDadosClienteTimer) clearTimeout(salvarDadosClienteTimer);
  salvarDadosClienteTimer = setTimeout(() => {
    salvarDadosClienteTimer = null;
    executar();
  }, 250);
}

function restaurarDadosClienteDoStorage() {
  try {
    const bruto = localStorage.getItem(DADOS_CLIENTE_STORAGE_KEY);
    if (!bruto) return;
    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object") return;

    if (typeof dados.cliente === "string") nomeCliente.value = dados.cliente;
    if (typeof dados.telefone === "string") telefoneCliente.value = dados.telefone;
    if (typeof dados.endereco === "string") endereco.value = dados.endereco;
    if (typeof dados.tipoEntrega === "string") tipoEntrega.value = dados.tipoEntrega;
    if (typeof dados.pagamento === "string") pagamento.value = dados.pagamento;
    if (typeof dados.pagamentoDividido === "boolean" && pagamentoDivididoToggle) {
      pagamentoDivididoToggle.checked = dados.pagamentoDividido;
    }
    if (Array.isArray(dados.pagamentosDetalhes)) {
      renderPagamentosDivididos(dados.pagamentosDetalhes);
    }
    if (typeof dados.troco === "string") troco.value = dados.troco;
    if (typeof dados.obsGeral === "string") obsGeral.value = dados.obsGeral;

    if (typeof tipoEntrega.onchange === "function") tipoEntrega.onchange();
    if (typeof pagamento.onchange === "function") pagamento.onchange();
  } catch (err) {
    console.warn("Falha ao restaurar dados do cliente:", err);
  }
}

function salvarCarrinhoNoStorage(imediato = false) {
  const executar = () => {
    try {
      const payload = {
        carrinho: Array.isArray(window.carrinho) ? window.carrinho : [],
        obsGeral: String(obsGeral?.value || "").trim()
      };
      localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Falha ao salvar carrinho:", err);
    }
  };

  if (imediato) {
    if (salvarCarrinhoTimer) clearTimeout(salvarCarrinhoTimer);
    salvarCarrinhoTimer = null;
    executar();
    return;
  }

  if (salvarCarrinhoTimer) clearTimeout(salvarCarrinhoTimer);
  salvarCarrinhoTimer = setTimeout(() => {
    salvarCarrinhoTimer = null;
    executar();
  }, 250);
}

function restaurarCarrinhoDoStorage() {
  try {
    const bruto = localStorage.getItem(CARRINHO_STORAGE_KEY);
    if (!bruto) return false;
    const dados = JSON.parse(bruto);
    const carrinho = Array.isArray(dados?.carrinho) ? dados.carrinho : [];
    if (!carrinho.length) return false;
    window.carrinho = carrinho;
    if (typeof dados?.obsGeral === "string" && obsGeral) {
      obsGeral.value = dados.obsGeral;
    }
    return true;
  } catch (err) {
    console.warn("Falha ao restaurar carrinho:", err);
    return false;
  }
}

function limparCarrinhoDoStorage() {
  try {
    localStorage.removeItem(CARRINHO_STORAGE_KEY);
  } catch (err) {
    console.warn("Falha ao limpar carrinho salvo:", err);
  }
}

function salvarUltimoPedidoNoStorage(pedido = {}, pedidoId = "") {
  try {
    const payload = {
      pedidoId: pedidoId || "",
      salvoEm: new Date().toISOString(),
      cliente: String(pedido?.cliente || "").trim(),
      telefone: String(pedido?.telefone || "").trim(),
      endereco: String(pedido?.endereco || "").trim(),
      tipoEntrega: String(pedido?.tipoEntrega || "").trim(),
      pagamento: String(pedido?.pagamento || "").trim(),
      pagamentosDetalhes: Array.isArray(pedido?.pagamentosDetalhes) ? pedido.pagamentosDetalhes : [],
      troco: String(pedido?.troco || "").trim(),
      obsGeral: String(pedido?.obsGeral || "").trim(),
      taxaEntrega: Number(pedido?.taxaEntrega || 0),
      carrinho: Array.isArray(pedido?.carrinho) ? pedido.carrinho : []
    };
    localStorage.setItem(ULTIMO_PEDIDO_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Falha ao salvar ultimo pedido:", err);
  }
}

function obterUltimoPedidoSalvo() {
  try {
    const bruto = localStorage.getItem(ULTIMO_PEDIDO_STORAGE_KEY);
    if (!bruto) return null;
    const dados = JSON.parse(bruto);
    if (!dados || typeof dados !== "object" || !Array.isArray(dados.carrinho) || !dados.carrinho.length) {
      return null;
    }
    return dados;
  } catch (err) {
    console.warn("Falha ao ler ultimo pedido salvo:", err);
    return null;
  }
}

function aplicarDadosCliente(dados = {}) {
  if (typeof dados.cliente === "string" && nomeCliente) nomeCliente.value = dados.cliente;
  if (typeof dados.telefone === "string" && telefoneCliente) telefoneCliente.value = dados.telefone;
  if (typeof dados.endereco === "string" && endereco) endereco.value = dados.endereco;
  if (typeof dados.tipoEntrega === "string" && tipoEntrega) tipoEntrega.value = dados.tipoEntrega;
  if (typeof dados.pagamento === "string" && pagamento) pagamento.value = dados.pagamento;
  if (typeof dados.troco === "string" && troco) troco.value = dados.troco;
  if (typeof dados.obsGeral === "string" && obsGeral) obsGeral.value = dados.obsGeral;
  if (Array.isArray(dados.pagamentosDetalhes)) {
    renderPagamentosDivididos(dados.pagamentosDetalhes);
  }
  if (typeof tipoEntrega?.onchange === "function") tipoEntrega.onchange();
  if (typeof pagamento?.onchange === "function") pagamento.onchange();
  salvarDadosClienteNoStorage(true);
}

function formatarUltimoPedidoResumo(pedido = {}) {
  const itens = Array.isArray(pedido.carrinho)
    ? pedido.carrinho.reduce((acc, item) => acc + Number(item?.qtd || 0), 0)
    : 0;
  const tipo = String(pedido.tipoEntrega || "").trim() || "Pedido";
  const nome = String(pedido.cliente || "").trim() || "Cliente";
  return `${nome} • ${itens} ${itens === 1 ? "item" : "itens"} • ${tipo}`;
}

function renderPedidoAnterior() {
  if (!pedidoAnteriorCard) return;
  const ultimoPedido = obterUltimoPedidoSalvo();
  if (!ultimoPedido) {
    pedidoAnteriorCard.style.display = "none";
    return;
  }

  pedidoAnteriorCard.style.display = "grid";
  if (pedidoAnteriorTitulo) {
    pedidoAnteriorTitulo.textContent = ultimoPedido.pedidoId
      ? `Repetir pedido #${ultimoPedido.pedidoId}`
      : "Repetir seu ultimo pedido";
  }
  if (pedidoAnteriorResumo) {
    pedidoAnteriorResumo.textContent = formatarUltimoPedidoResumo(ultimoPedido);
  }
}

function interpolarPromoTexto(template) {
  const modelo = String(template || "").trim();
  const textoBase = modelo || "";
  return textoBase
    .replaceAll("{preco_unidade}", formatarMoeda(configPublic.promo_xtudo_preco_unidade))
    .replaceAll("{preco_combo}", formatarMoeda(configPublic.promo_xtudo_preco_combo))
    .replaceAll("{min_qtd}", String(configPublic.promo_xtudo_min_qtd || 2));
}

async function carregarConfigPublic() {
  try {
    const res = await fetch("/config");
    if (!res.ok) throw new Error("Falha ao carregar config");
    const data = await res.json();
    taxaEntregaValor = MegaPricing.money(data.taxa_entrega ?? 9);
    configPublic = {
      tempo_entrega_min: data.tempo_entrega_min ?? null,
      tempo_retirada_min: data.tempo_retirada_min ?? null,
      whatsapp: data.whatsapp || "",
      msg_pix: data.msg_pix || "",
      promo_xtudo_preco_unidade: data.promo_xtudo_preco_unidade ?? 22,
      promo_xtudo_preco_combo: data.promo_xtudo_preco_combo ?? 20,
      promo_xtudo_min_qtd: data.promo_xtudo_min_qtd ?? 2,
      promo_tag_text: data.promo_tag_text || "Promocao",
      promo_destaque_text: data.promo_destaque_text || "X-Tudo R$ {preco_unidade} cada",
      promo_sub_text: data.promo_sub_text || "{min_qtd}+ por R$ {preco_combo}",
      funcionamento_dias: data.funcionamento_dias || [],
      funcionamento_abre: data.funcionamento_abre || "",
      funcionamento_fecha: data.funcionamento_fecha || "",
      logo_url: data.logo_url || "",
      tema_cardapio: ["copa-brasil", "chapa-fogo", "diner-retro", "neon-noturno", "fliperama-90", "rota-66", "boteco-raiz", "aranha-urbana"].includes(data.tema_cardapio) ? data.tema_cardapio : "original",
      default_ddd: String(data.default_ddd || "35").replace(/\D/g, "").slice(-2) || "35"
    };
    aplicarTemaSite(configPublic.tema_cardapio);
    const waBtn = document.querySelector(".btn-float.whats");
    if (waBtn && configPublic.whatsapp) {
      const link = formatarWhatsappLink(configPublic.whatsapp);
      if (link) waBtn.setAttribute("href", link);
    }
    atualizarCabecalho();
    atualizarTempoEstimado();
    atualizarPixAviso();
  } catch (err) {
    console.warn("Config não carregada", err);
  }
}

function horarioAbertoAgora() {
  const dias = Array.isArray(configPublic.funcionamento_dias)
    ? configPublic.funcionamento_dias.map((d) => Number(d))
    : [];
  const abre = String(configPublic.funcionamento_abre || "").trim();
  const fecha = String(configPublic.funcionamento_fecha || "").trim();
  if (!dias.length || !abre || !fecha) return true;
  const now = new Date();
  const dia = now.getDay();
  if (!dias.includes(dia)) return false;
  const [hA, mA] = abre.split(":").map((v) => parseInt(v, 10));
  const [hF, mF] = fecha.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(hA) || Number.isNaN(mA) || Number.isNaN(hF) || Number.isNaN(mF)) return true;
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const minsAbre = hA * 60 + mA;
  const minsFecha = hF * 60 + mF;
  if (minsFecha < minsAbre) {
    return minsNow >= minsAbre || minsNow <= minsFecha;
  }
  return minsNow >= minsAbre && minsNow <= minsFecha;
}

function atualizarCabecalho() {
  const entrega = document.getElementById("info-entrega");
  const retirada = document.getElementById("info-retirada");
  if (entrega) entrega.textContent = `Entrega a partir de ${configPublic.tempo_entrega_min || "--"} min`;
  if (retirada) retirada.textContent = `Retirada em ${configPublic.tempo_retirada_min || "--"} min`;

  const promoTag = document.getElementById("promo-tag");
  const promo = document.getElementById("promo-destaque");
  const promoSub = document.getElementById("promo-sub");
  if (promoTag) {
    promoTag.textContent = configPublic.promo_tag_text || "Promocao";
  }
  if (promo) {
    promo.textContent =
      interpolarPromoTexto(configPublic.promo_destaque_text) ||
      `X-Tudo R$ ${formatarMoeda(configPublic.promo_xtudo_preco_unidade)} cada`;
  }
  if (promoSub) {
    promoSub.textContent =
      interpolarPromoTexto(configPublic.promo_sub_text) ||
      `${configPublic.promo_xtudo_min_qtd}+ por R$ ${formatarMoeda(configPublic.promo_xtudo_preco_combo)}`;
  }

  const logo = document.getElementById("logo-img");
  if (logo && configPublic.logo_url) {
    logo.src = configPublic.logo_url;
  }

  const status = document.getElementById("status-aberto");
  if (status) {
    const aberto = horarioAbertoAgora();
    status.textContent = aberto ? "Aberto" : "Fechado";
    status.classList.toggle("aberto", aberto);
    status.classList.toggle("fechado", !aberto);
  }

  const banner = document.getElementById("status-banner");
  if (banner) {
    const aberto = horarioAbertoAgora();
    if (aberto) {
      banner.style.display = "none";
    } else {
      banner.style.display = "block";
      const abre = configPublic.funcionamento_abre || "--";
      const fecha = configPublic.funcionamento_fecha || "--";
      banner.textContent = `Estamos fechados agora. Funcionamos das ${abre} às ${fecha}.`;
    }
  }

  const rodape = document.getElementById("rodape-funcionamento");
  if (rodape) {
    const diasMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const dias = Array.isArray(configPublic.funcionamento_dias)
      ? configPublic.funcionamento_dias.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6)
      : [];
    const abre = configPublic.funcionamento_abre || "--";
    const fecha = configPublic.funcionamento_fecha || "--";
    if (!dias.length || !abre || !fecha) {
      rodape.textContent = "Consulte o horário de funcionamento.";
    } else {
      const diasTexto = dias.map((d) => diasMap[d]).join(", ");
      rodape.textContent = `${diasTexto}: ${abre} às ${fecha}`;
    }
  }

  const rodapeContato = document.getElementById("rodape-contato");
  if (rodapeContato && configPublic.whatsapp) {
    rodapeContato.textContent = formatarTelefone(configPublic.whatsapp);
  }
}

function formatarWhatsappLink(numero) {
  const somenteNumeros = String(numero || "").replace(/\D/g, "");
  if (!somenteNumeros) return "";
  return `https://wa.me/${somenteNumeros}`;
}

function formatarTelefone(numero) {
  const digits = String(numero || "").replace(/\D/g, "");
  if (digits.length === 13) {
    return `(${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `(${digits.slice(2,4)}) ${digits.slice(4,8)}-${digits.slice(8)}`;
  }
  return numero || "";
}

function getPixAlertEl() {
  if (pixAlert) return pixAlert;
  const modalFinal = document.getElementById("modal-finalizar");
  if (!modalFinal) return null;
  const modalContent = modalFinal.querySelector(".modal-content");
  if (!modalContent) return null;
  const ref = document.getElementById("nome-cliente");
  const div = document.createElement("div");
  div.id = "pix-alert";
  div.className = "pix-alert";
  div.style.display = "none";
  if (ref && ref.parentNode) {
    ref.parentNode.insertBefore(div, ref);
  } else {
    modalContent.appendChild(div);
  }
  pixAlert = div;
  return pixAlert;
}

function atualizarTempoEstimado() {
  if (tempoEntregaPill) {
    const tempo = configPublic.tempo_entrega_min ?? "--";
    tempoEntregaPill.textContent = `Entrega: ${tempo} min`;
  }
  if (tempoRetiradaPill) {
    const tempo = configPublic.tempo_retirada_min ?? "--";
    tempoRetiradaPill.textContent = `Retirada: ${tempo} min`;
  }

  if (!tempoEntregaPill || !tempoRetiradaPill || !tipoEntrega) return;

  if (!tipoEntrega.value) {
    tempoEntregaPill.style.opacity = "0.8";
    tempoRetiradaPill.style.opacity = "0.8";
    return;
  }

  const escolha = tipoEntrega.value.toLowerCase();
  if (escolha.includes("entrega")) {
    tempoEntregaPill.style.opacity = "1";
    tempoRetiradaPill.style.opacity = "0.4";
  } else {
    tempoEntregaPill.style.opacity = "0.4";
    tempoRetiradaPill.style.opacity = "1";
  }
}

function atualizarTotaisFinalizar(subtotal, taxa) {
  const total = MegaPricing.money(Math.max(0, subtotal - (descontoAplicado || 0)) + taxa);
  subtotalFinal.innerText = `Subtotal: R$ ${subtotal.toFixed(2)}`;
  taxaFinal.innerText = `Taxa de entrega: R$ ${taxa.toFixed(2)}`;
  totalFinal.innerText = `Total: R$ ${total.toFixed(2)}`;
  if (descontoFinal) {
    if (descontoAplicado > 0) {
      descontoFinal.style.display = "block";
      descontoFinal.innerText = `Desconto: R$ ${descontoAplicado.toFixed(2)}`;
    } else {
      descontoFinal.style.display = "none";
    }
  }
  atualizarResumoPagamentoDividido();
}

function getTotalPedidoAtual() {
  const subtotal = calcularSubtotalCarrinho();
  const taxa = tipoEntrega.value === "Entrega" ? taxaEntregaValor : 0;
  return MegaPricing.money(Math.max(0, subtotal - (descontoAplicado || 0)) + taxa);
}

function parseValorPagamento(value) {
  if (value === null || value === undefined) return 0;
  const norm = String(value).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

function pagamentoDivididoAtivo() {
  return Boolean(pagamentoDivididoToggle?.checked);
}

function criarLinhaPagamentoDividido(metodo = "", valor = "") {
  if (!pagamentosDivididosLista) return;
  const row = document.createElement("div");
  row.className = "split-row";
  row.innerHTML = `
    <select class="split-metodo">
      <option value="">Forma</option>
      <option value="Pix">Pix</option>
      <option value="Dinheiro">Dinheiro</option>
      <option value="Cartao">Cartao</option>
    </select>
    <input type="text" class="split-valor" placeholder="Valor (R$)">
    <button type="button" class="split-remove-btn">Remover</button>
  `;
  pagamentosDivididosLista.appendChild(row);
  const metodoEl = row.querySelector(".split-metodo");
  const valorEl = row.querySelector(".split-valor");
  const removerEl = row.querySelector(".split-remove-btn");
  if (metodo && metodoEl) metodoEl.value = metodo;
  if (valor !== "" && valorEl) valorEl.value = String(valor);
  row.addEventListener("input", () => {
    atualizarPixAviso();
    atualizarResumoPagamentoDividido();
    salvarDadosClienteNoStorage();
  });
  if (removerEl) {
    removerEl.addEventListener("click", () => {
      row.remove();
      atualizarPixAviso();
      atualizarResumoPagamentoDividido();
      salvarDadosClienteNoStorage(true);
    });
  }
}

function renderPagamentosDivididos(items = []) {
  if (!pagamentosDivididosLista) return;
  pagamentosDivididosLista.innerHTML = "";
  const linhas = Array.isArray(items) ? items : [];
  if (!linhas.length) {
    criarLinhaPagamentoDividido();
    criarLinhaPagamentoDividido();
  } else {
    linhas.forEach((item) => {
      criarLinhaPagamentoDividido(item?.metodo || "", item?.valor || "");
    });
  }
  atualizarResumoPagamentoDividido();
}

function coletarPagamentosDivididos() {
  if (!pagamentosDivididosLista) return [];
  return Array.from(pagamentosDivididosLista.querySelectorAll(".split-row"))
    .map((row) => {
      const metodo = String(row.querySelector(".split-metodo")?.value || "").trim();
      const valor = parseValorPagamento(row.querySelector(".split-valor")?.value || "");
      return { metodo, valor };
    })
    .filter((x) => x.metodo && x.valor > 0);
}

function pagamentoDivididoTemMetodo(metodo) {
  const alvo = String(metodo || "").toLowerCase();
  return coletarPagamentosDivididos().some((x) => String(x.metodo || "").toLowerCase() === alvo);
}

function atualizarResumoPagamentoDividido() {
  if (!pagamentoDivididoResumo) return;
  if (!pagamentoDivididoAtivo()) {
    pagamentoDivididoResumo.textContent = "";
    return;
  }
  const total = getTotalPedidoAtual();
  const soma = coletarPagamentosDivididos().reduce((acc, x) => acc + Number(x.valor || 0), 0);
  const falta = total - soma;
  if (Math.abs(falta) < 0.01) {
    pagamentoDivididoResumo.textContent = `Valores conferem. Total: R$ ${total.toFixed(2)}`;
    return;
  }
  if (falta > 0) {
    pagamentoDivididoResumo.textContent = `Falta R$ ${falta.toFixed(2)} para fechar o total de R$ ${total.toFixed(2)}.`;
    return;
  }
  pagamentoDivididoResumo.textContent = `Passou R$ ${Math.abs(falta).toFixed(2)} do total de R$ ${total.toFixed(2)}.`;
}

function atualizarUIFormaPagamento() {
  const isDividido = pagamentoDivididoAtivo();
  if (pagamentoDivididoBox) pagamentoDivididoBox.style.display = isDividido ? "block" : "none";

  const precisaPix = isDividido ? pagamentoDivididoTemMetodo("Pix") : pagamento.value === "Pix";
  const precisaTroco = isDividido ? pagamentoDivididoTemMetodo("Dinheiro") : pagamento.value === "Dinheiro";

  if (chavePix) chavePix.style.display = precisaPix ? "block" : "none";
  if (troco) troco.style.display = precisaTroco ? "block" : "none";
}

function atualizarPixAviso() {
  const alertEl = getPixAlertEl();
  if (!alertEl || !pagamento) return;
  const precisaPix = pagamentoDivididoAtivo() ? pagamentoDivididoTemMetodo("Pix") : pagamento.value === "Pix";
  if (!precisaPix) {
    alertEl.style.display = "none";
    return;
  }

  const msg = configPublic.msg_pix || "Envie o comprovante do Pix no WhatsApp.";
  const link = formatarWhatsappLink(configPublic.whatsapp);
  alertEl.style.display = "block";
  alertEl.innerHTML = link
    ? `${msg} <a href="${link}" target="_blank" rel="noopener">Abrir WhatsApp</a>`
    : msg;
}

function isPromocao(item) {
  const categoria = String(item?.categoria || "").trim().toLowerCase();
  const nome = (item.nome || "").toLowerCase();
  return categoria === "promocao" || nome.includes("x-tudo");
}

function isPromoXtudo(item) {
  const tipo = String(item?.tipo || "").toLowerCase();
  if (tipo === "combo") return false;
  const nome = String(item?.nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\bpromocao\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return nome === "x tudo";
}

function aplicarPromocaoXtudoCarrinho() {
  const itens = Array.isArray(window.carrinho) ? window.carrinho : [];
  const totalXtudo = itens.reduce((total, item) => (
    isPromoXtudo(item) ? total + Math.max(parseInt(item.qtd, 10) || 0, 0) : total
  ), 0);
  const minQtd = Math.max(parseInt(configPublic.promo_xtudo_min_qtd, 10) || 1, 1);
  const preco = totalXtudo >= minQtd
    ? Number(configPublic.promo_xtudo_preco_combo || 0)
    : Number(configPublic.promo_xtudo_preco_unidade || 0);
  itens.forEach((item) => {
    if (isPromoXtudo(item)) item.preco = preco;
  });
}

function multiplicadorAdicional(item, adicional) {
  return String(adicional?.escopo || "").toLowerCase() === "total" ? 1 : Number(item?.qtd || 0);
}

function categoriaEhBebida(categoria) {
  const c = String(categoria || "").trim().toLowerCase();
  if (!c) return false;
  if (c.includes("bebida") || c.includes("refrigerante")) return true;
  return ["refrigerante", "bebida", "bebidas", "suco", "sucos", "agua", "cerveja"].includes(c);
}

function getItemImageSrc(item) {
  const raw = String(item?.img || "").trim();
  if (!raw) return "/logo.png";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:image/")) {
    return raw;
  }
  return raw.startsWith("/") ? raw : `/uploads/${raw}`;
}

function calcularSubtotalCarrinho() {
  aplicarPromocaoXtudoCarrinho();
  return MegaPricing.subtotal(window.carrinho);
}

function adicionarItemSimples(item) {
  if (!item) return;
  window.carrinho.push({
    nome: item.nome,
    preco: Number(item.preco) || 0,
    adicionais: [],
    removidos: [],
    obs: "",
    qtd: 1,
    tipo: item.tipo || "item"
  });
  renderCarrinho();
  showToast("Bebida adicionada!");
}

function renderUpsellBebidas() {
  if (!upsellBebidasDiv) return;
  const bebidas = menu.filter((item) =>
    categoriaEhBebida(item.categoria) &&
    item.disponivel !== false &&
    String(item.tipo || "").toLowerCase() !== "combo"
  );
  if (!bebidas.length) {
    upsellBebidasDiv.style.display = "none";
    return;
  }

  const carrinhoTemBebida = window.carrinho.some((item) =>
    bebidas.some((b) => (b.nome || "").toLowerCase() === (item.nome || "").toLowerCase())
  );

  if (carrinhoTemBebida) {
    upsellBebidasDiv.style.display = "none";
    return;
  }

  upsellBebidasDiv.style.display = "block";
  upsellBebidasDiv.innerHTML = "<h4>Que tal uma bebida?</h4>";
  bebidas.forEach((bebida) => {
    const div = document.createElement("div");
    div.className = "upsell-item";
    div.innerHTML = `
      <span>${bebida.nome}</span>
      <span class="preco">R$ ${formatarMoeda(bebida.preco)}</span>
      <button class="btn-compact" type="button">Adicionar</button>
    `;
    div.querySelector("button").onclick = () => adicionarItemSimples(bebida);
    upsellBebidasDiv.appendChild(div);
  });
}

// ===================== CARREGAR ADICIONAIS =====================
// ===================== CARREGAR ADICIONAIS (via API) =====================
async function carregarAdicionaisJSON() {
  try {
    const res = await fetch("/adicionais");
    if (!res.ok) throw new Error("Falha ao carregar adicionais");
    adicionaisDisponiveis = await res.json();

    // Ordena por nome so pra deixar organizado no modal
    adicionaisDisponiveis.sort((a, b) => a.nome.localeCompare(b.nome));

    console.log("Adicionais carregados:", adicionaisDisponiveis);
  } catch (err) {
    console.error("Erro ao carregar adicionais:", err);
    showToast("Erro ao carregar adicionais!");
    adicionaisDisponiveis = []; // Evita crash se der erro
  }
}
// ===================== CARREGAR CARDAPIO =====================
async function carregarCardapio() {
  try {
    const res = await fetch("/cardapio");
    menu = await res.json();
    montarBotoesCategorias();
    renderMenu();
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar cardápio!");
  }
}

// ===================== CARREGAR CATEGORIAS =====================
async function carregarCategorias() {
  if (!categoriasNav) return;
  try {
    const res = await fetch("/categorias");
    if (!res.ok) throw new Error("Falha ao carregar categorias");
    categoriasCache = await res.json();
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
    categoriasCache = [];
  }

  montarBotoesCategorias();
  renderMenu();
}

function setCategoriaAtiva(slug) {
  const categoria = normalizarSlugCategoria(slug);
  document.querySelectorAll(".categorias button").forEach((b) => {
    b.classList.toggle("ativo", normalizarSlugCategoria(b.dataset.categoria) === categoria);
  });
}

// ===================== RENDER MENU =====================
function renderMenu() {
  menuDiv.innerHTML = "";
  const termoNormalizado = normalizarTextoBusca(buscaTexto);
  const termoCompacto = compactarTextoBusca(buscaTexto);
  const categorias = getCategoriasOrdenadas();
  let totalRenderizado = 0;

  categorias.forEach((slug) => {
    const itensBase = slug === "promocao"
      ? menu.filter((item) => isPromocao(item))
      : menu.filter((item) => normalizarSlugCategoria(item.categoria) === slug);

    const itensFiltrados = itensBase.filter((item) => itemCorrespondeBusca(item, termoNormalizado, termoCompacto));
    if (!itensFiltrados.length) return;

    totalRenderizado += itensFiltrados.length;

    const secao = document.createElement("section");
    secao.className = "menu-secao";
    secao.id = `secao-${getCategoriaAnchor(slug)}`;

    const titulo = document.createElement("h2");
    titulo.className = "menu-secao-titulo";
    titulo.textContent = getNomeCategoria(slug);
    secao.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "menu-grid";
    itensFiltrados.forEach((item) => {
      grid.appendChild(criarCardMenuItem(item));
    });
    secao.appendChild(grid);

    menuDiv.appendChild(secao);
  });

  if (!totalRenderizado) {
    menuDiv.innerHTML = "<div class=\"menu-item\" style=\"justify-content:center;\">Nenhum item encontrado.</div>";
  }
}

function criarCardMenuItem(item) {
  const div = document.createElement("div");
  div.className = "menu-item";
  const imgSrc = getItemImageSrc(item);
  const promocional = isPromocao(item);
  const promoXtudo = isPromoXtudo(item);
  const badge = promocional ? '<span class="badge-promo">PROMO</span>' : "";
  const precoUnidade = promoXtudo ? configPublic.promo_xtudo_preco_unidade : item.preco;
  const precoPromo = configPublic.promo_xtudo_preco_combo;
  const minQtd = configPublic.promo_xtudo_min_qtd;
  const precoHtml = promoXtudo
    ? `<span class="preco-atual">R$ ${formatarMoeda(precoUnidade)}</span> <span class="preco-promo">${minQtd}+ por R$ ${formatarMoeda(precoPromo)}</span>`
    : `<span class="preco-atual">R$ ${formatarMoeda(item.preco)}</span>`;
  const ingredientesTexto = Array.isArray(item.ingredientes) ? item.ingredientes.join(", ") : (item.ingredientes || "");
  const descHtml = ingredientesTexto ? `<p class="desc">${ingredientesTexto}</p>` : "";

  if (item.disponivel === false) {
    div.innerHTML = `${badge}<img src="${imgSrc}" alt="${item.nome}" style="opacity:0.5;">
      <div class="info"><h3>${item.nome}</h3><p class="indisponivel">Indisponivel</p>${descHtml}</div>
      <button class="btn-adicionar" disabled style="opacity:0.5;cursor:not-allowed;">X</button>`;
    return div;
  }

  div.innerHTML = `${badge}<img src="${imgSrc}" alt="${item.nome}">
    <div class="info"><h3>${item.nome}</h3><p class="preco">${precoHtml}</p>${descHtml}</div>
    <button class="btn-adicionar">+</button>`;
  div.querySelector(".btn-adicionar").onclick = () => abrirModal(item);
  return div;
}

// ===================== ABRIR MODAL LANCHES =====================
function abrirModal(item) {
  itemSelecionado = JSON.parse(JSON.stringify(item));
  modalNome.innerText = item.nome;
  modalImg.src = getItemImageSrc(item);
  modal.style.display = "flex";
  registrarInteracaoProduto(item, "view");

  qtdLanche = 1;
  qtdLancheSpan.innerText = qtdLanche;

  // Ingredientes
  modalIngredientes.innerHTML = "";
  const ingredientesList = Array.isArray(item.ingredientes) ? item.ingredientes : (item.ingredientes ? item.ingredientes.split(",") : []);
  ingredientesList.forEach(ing => {
    ing = ing.trim();
    let nome = ing;
    const match = ing.match(/^(\d+)\s+(.*)$/);
    if(match){ nome = match[2]; }
    const div = document.createElement("div");
    div.className = "ingrediente-item";
    div.innerHTML = `<span>${nome}</span>`;
    modalIngredientes.appendChild(div);
  });

  // Adicionais dinamicos
  modalAdicionais.innerHTML = "";
  adicionaisDisponiveis.forEach(add => {
    const div = document.createElement("div");
    div.className = "ingrediente-item";
    div.innerHTML = `<span>${add.nome} + R$ ${Number(add.preco).toFixed(2)}</span>
                     <button class="menos">-</button>
                     <span class="quantidade">0</span>
                     <button class="mais">+</button>`;
    const qtdSpan = div.querySelector(".quantidade");
    div.querySelector(".menos").onclick = () => { if(parseInt(qtdSpan.innerText)>0) qtdSpan.innerText = parseInt(qtdSpan.innerText)-1; };
    div.querySelector(".mais").onclick = () => { qtdSpan.innerText = parseInt(qtdSpan.innerText)+1; };
    modalAdicionais.appendChild(div);
  });

  modalObs.value = "";

  requestAnimationFrame(() => {
    if (modalProdutoContent) modalProdutoContent.scrollTop = 0;
    atualizarIndicadorScrollModalProduto();
  });
}

// ===================== CONTROLE QUANTIDADE =====================
btnMaisLanche.onclick = () => { qtdLanche++; qtdLancheSpan.innerText = qtdLanche; };
btnMenosLanche.onclick = () => { if(qtdLanche>1){ qtdLanche--; qtdLancheSpan.innerText = qtdLanche; } };

// ===================== ADICIONAR AO CARRINHO =====================
modalAdicionar.onclick = () => {
  const adicionais = [];
  modalAdicionais.querySelectorAll(".ingrediente-item").forEach(div => {
    const qtd = parseInt(div.querySelector(".quantidade").innerText);
    if(qtd>0){
      const nome = div.querySelector("span").innerText.split(" + ")[0];
      const preco = parseFloat(div.querySelector("span").innerText.split("R$ ")[1]);
      adicionais.push({ nome, preco, qtd, escopo: "unidade" });
    }
  });

  const removidos = [];

  const promoAtivo = isPromoXtudo(itemSelecionado);
  let precoBase = promoAtivo ? configPublic.promo_xtudo_preco_unidade : itemSelecionado.preco;

  const existIndex = window.carrinho.findIndex(i =>
    i.nome===itemSelecionado.nome &&
    String(i.obs || "").trim()===String(modalObs.value || "").trim() &&
    JSON.stringify(i.adicionais)===JSON.stringify(adicionais) &&
    JSON.stringify(i.removidos || [])===JSON.stringify(removidos)
  );

  if(existIndex>-1){
    window.carrinho[existIndex].qtd += qtdLanche;
    window.carrinho[existIndex].adicionais = window.carrinho[existIndex].adicionais.map((add, index) =>
      String(add.escopo || '').toLowerCase() === 'total' ? { ...add, qtd: add.qtd + adicionais[index].qtd } : add
    );
    if (!window.carrinho[existIndex].produtoId) {
      window.carrinho[existIndex].produtoId = String(itemSelecionado.id ?? itemSelecionado.produtoId ?? "");
    }
  } else {
    window.carrinho.push({
      produtoId: String(itemSelecionado.id ?? itemSelecionado.produtoId ?? ""),
      nome: itemSelecionado.nome,
      preco: precoBase,
      adicionais,
      removidos,
      obs: modalObs.value,
      qtd: qtdLanche,
      tipo: itemSelecionado.tipo || "item"
    });
  }

  registrarInteracaoProduto(itemSelecionado, "cart");

  modal.style.display="none";
  atualizarIndicadorScrollModalProduto();
  renderCarrinho();
  showToast("Item adicionado ao carrinho!");
};

// ===================== FILTRO CATEGORIAS =====================
if (categoriasNav) {
  categoriasNav.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const categoria = btn.dataset.categoria;
    if (!categoria) return;
    categoriaAtual = categoria;
    setCategoriaAtiva(categoria);
    if (buscaInput && buscaInput.value.trim()) {
      buscaInput.value = "";
      buscaTexto = "";
      renderMenu();
    }
    scrollParaCategoria(categoria);
  });
}

if (buscaInput) {
  buscaInput.addEventListener("input", () => {
    buscaTexto = buscaInput.value || "";
    renderMenu();
  });
}

// ===================== RENDER CARRINHO =====================
function renderCarrinho(){
  itensCarrinhoDiv.innerHTML="";
  let subtotal = 0;
  aplicarPromocaoXtudoCarrinho();

  window.carrinho.forEach((item,index)=>{
    let subtotalItem = MegaPricing.itemSubtotal(item);
    subtotal += subtotalItem;

    const metaLinhas = formatarAlteracoesItem(item);
    const metaHtml = metaLinhas.length
      ? `<div class="cart-meta">${metaLinhas.map(l => `<div>${l}</div>`).join("")}</div>`
      : "";

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML=`
      <div class="cart-row">
        <div class="cart-title">${item.nome}</div>
        <div class="cart-price">R$ ${subtotalItem.toFixed(2)}</div>
      </div>
      ${metaHtml}
      <div class="cart-actions">
        <div class="qty-control">
          <button class="menos">-</button>
          <span class="quantidade">${item.qtd}</span>
          <button class="mais">+</button>
        </div>
        <button class="remover">Remover</button>
      </div>
    `;

    const qtdSpan = div.querySelector(".quantidade");
    div.querySelector(".menos").onclick=()=>{
      if(item.qtd>1) item.qtd-=1;
      renderCarrinho();
    };
    div.querySelector(".mais").onclick=()=>{
      item.qtd+=1;
      renderCarrinho();
    };
    div.querySelector(".remover").onclick=()=>{ window.carrinho.splice(index,1); renderCarrinho(); };
    itensCarrinhoDiv.appendChild(div);
  });

  renderUpsellBebidas();
  atualizarResumoBotaoCarrinho();
  salvarCarrinhoNoStorage();
}

// ===================== MODAIS E FINALIZACAO =====================
btnCarrinho.onclick=()=>{ modalCarrinho.style.display="flex"; renderCarrinho(); };
fecharCarrinhoBtn.onclick=()=>{ modalCarrinho.style.display="none"; };
fecharModalBtn.onclick=()=>{ modal.style.display="none"; atualizarIndicadorScrollModalProduto(); };
fecharFinalizarBtn.onclick=()=>{ modalFinalizar.style.display="none"; };
if (fecharSucessoBtn) {
  fecharSucessoBtn.onclick = () => {
    modalSucesso.style.display = "none";
  };
}

if (aplicarCupomBtn) {
  aplicarCupomBtn.onclick = async () => {
    const codigo = (cupomCodigoInput?.value || "").trim();
    if (!codigo) {
      showToast("Informe o cupom.");
      return;
    }
    const subtotal = calcularSubtotalCarrinho();
    try {
      const res = await fetch("/cupons/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, subtotal })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast("Cupom inválido.");
        return;
      }
      descontoAplicado = Number(data.desconto || 0);
      cupomAplicado = codigo.toUpperCase();
      const taxa = tipoEntrega.value==="Entrega" ? taxaEntregaValor : 0;
      atualizarTotaisFinalizar(subtotal, taxa);
      showToast("Cupom aplicado!");
    } catch (e) {
      showToast("Erro ao validar cupom.");
    }
  };
}

// Prosseguir pedido
prosseguir.onclick=()=>{
  if(!window.carrinho.length){ showToast("Carrinho vazio"); return; }
  if (!horarioAbertoAgora()) {
    showToast("Estamos fechados no momento. Não é possível finalizar pedidos agora.");
    return;
  }
  let subtotal = calcularSubtotalCarrinho();
  let taxa = tipoEntrega.value==="Entrega" ? taxaEntregaValor : 0;
  descontoAplicado = 0;
  cupomAplicado = "";
  if (cupomCodigoInput) cupomCodigoInput.value = "";
  atualizarTotaisFinalizar(subtotal, taxa);
  modalCarrinho.style.display="none";
  modalFinalizar.style.display="flex";
  if (pagamentoDivididoAtivo() && pagamentosDivididosLista && !pagamentosDivididosLista.children.length) {
    renderPagamentosDivididos();
  }
  carregarConfigPublic();
  atualizarTempoEstimado();
  atualizarUIFormaPagamento();
  atualizarPixAviso();
};

// Tipo entrega
tipoEntrega.onchange=()=>{
  tipoEntrega.classList.remove("campo-invalido");
  endereco.style.display=tipoEntrega.value==="Entrega"?"block":"none";
  if (tipoEntrega.value !== "Entrega") {
    endereco.classList.remove("campo-invalido");
  }
  if(modalFinalizar.style.display==="flex"){
    let subtotal = calcularSubtotalCarrinho();
    let taxa = tipoEntrega.value==="Entrega" ? taxaEntregaValor : 0;
    atualizarTotaisFinalizar(subtotal, taxa);
  }
  atualizarTempoEstimado();
  salvarDadosClienteNoStorage();
};

// Pagamento
pagamento.onchange=()=>{
  pagamento.classList.remove("campo-invalido");
  atualizarUIFormaPagamento();
  atualizarPixAviso();
  salvarDadosClienteNoStorage();
};

if (pagamentoDivididoToggle) {
  pagamentoDivididoToggle.onchange = () => {
    if (pagamentoDivididoAtivo() && pagamentosDivididosLista && !pagamentosDivididosLista.children.length) {
      renderPagamentosDivididos();
    }
    atualizarUIFormaPagamento();
    atualizarPixAviso();
    atualizarResumoPagamentoDividido();
    salvarDadosClienteNoStorage(true);
  };
}

if (addPagamentoDivididoBtn) {
  addPagamentoDivididoBtn.onclick = () => {
    criarLinhaPagamentoDividido();
    atualizarResumoPagamentoDividido();
    salvarDadosClienteNoStorage();
  };
}

[nomeCliente, telefoneCliente, endereco, troco, obsGeral].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => {
    el.classList.remove("campo-invalido");
    salvarDadosClienteNoStorage();
    if (el === obsGeral) salvarCarrinhoNoStorage();
  });
});

if (pedidoAnteriorRepetirBtn) {
  pedidoAnteriorRepetirBtn.addEventListener("click", () => {
    const ultimoPedido = obterUltimoPedidoSalvo();
    if (!ultimoPedido) {
      showToast("Nao encontramos um pedido anterior neste aparelho.");
      return;
    }
    window.carrinho = Array.isArray(ultimoPedido.carrinho)
      ? JSON.parse(JSON.stringify(ultimoPedido.carrinho))
      : [];
    aplicarDadosCliente(ultimoPedido);
    renderCarrinho();
    salvarCarrinhoNoStorage(true);
    showToast("Ultimo pedido carregado no carrinho.");
    if (modalCarrinho) modalCarrinho.style.display = "flex";
  });
}

if (pedidoAnteriorDadosBtn) {
  pedidoAnteriorDadosBtn.addEventListener("click", () => {
    const ultimoPedido = obterUltimoPedidoSalvo();
    if (!ultimoPedido) {
      showToast("Nao encontramos dados salvos neste aparelho.");
      return;
    }
    aplicarDadosCliente(ultimoPedido);
    showToast("Seus dados anteriores foram preenchidos.");
  });
}

if (modalProdutoContent) {
  modalProdutoContent.addEventListener("scroll", atualizarIndicadorScrollModalProduto, { passive: true });
}

window.addEventListener("resize", () => {
  atualizarIndicadorScrollModalProduto();
});

window.addEventListener("beforeunload", () => {
  salvarDadosClienteNoStorage(true);
  salvarCarrinhoNoStorage(true);
});

// Confirmar pedido
confirmar.onclick = async () => {
  if (enviando) return;

  const isDividido = pagamentoDivididoAtivo();
  const pagamentosDetalhes = isDividido ? coletarPagamentosDivididos() : [];
  const totalPedidoAtual = getTotalPedidoAtual();
  const somaDividido = pagamentosDetalhes.reduce((acc, x) => acc + Number(x.valor || 0), 0);

  if (!validarCheckoutBasico(isDividido)) {
    return;
  }

  if (isDividido) {
    if (pagamentosDetalhes.length < 2) {
      showToast("Informe pelo menos 2 formas de pagamento para dividir.");
      return;
    }
    if (Math.abs(somaDividido - totalPedidoAtual) > 0.05) {
      showToast("A soma dos pagamentos divididos precisa bater com o total.");
      return;
    }
  }

  const pedido = {
    cliente: nomeCliente.value,
    telefone: telefoneCliente.dataset.normalizado || normalizarTelefoneBrasilPublico(telefoneCliente.value).nacional || telefoneCliente.value,
    endereco: endereco.value,
    tipoEntrega: tipoEntrega.value,
    pagamento: isDividido ? "Dividido" : pagamento.value,
    pagamentosDetalhes,
    troco: troco.value,
    chavePix: chavePix.value,
    carrinho: window.carrinho,
    obsGeral: obsGeral.value,
    taxaEntrega: tipoEntrega.value==="Entrega" ? taxaEntregaValor : 0,
    cupom: cupomAplicado,
    desconto: descontoAplicado
  };

  salvarDadosClienteNoStorage(true);

  enviando = true;
  confirmar.disabled = true;
  confirmar.textContent = "Enviando...";

  try {
    const resposta = await fetch("/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido)
    });

    const data = await resposta.json();

    if (data.error === "precos_atualizados" && Array.isArray(data.carrinho)) {
      window.carrinho = data.carrinho;
      descontoAplicado = data.desconto;
      await carregarConfigPublic();
      salvarCarrinhoNoStorage();
      renderCarrinho();
      atualizarTotaisFinalizar(MegaPricing.subtotal(window.carrinho), data.taxaEntrega);
    }
    if (data.success) {
      showToast("Pedido enviado com sucesso!");
      salvarUltimoPedidoNoStorage(pedido, data.pedidoId || "");
      window.carrinho = [];
      renderCarrinho();
      limparCarrinhoDoStorage();
      renderPedidoAnterior();
      modalFinalizar.style.display = "none";
      if (modalSucesso) {
      if (pedidoNumero) {
        pedidoNumero.innerText = `Número do pedido: ${data.pedidoId || "-"}`;
      }
        modalSucesso.style.display = "flex";
      }
    } else {
      showToast(data?.message || "Erro ao enviar pedido!");
    }

  } catch (e) {
    console.error(e);
    showToast("Erro ao enviar pedido!");
  }

  enviando = false;
  confirmar.disabled = false;
  confirmar.textContent = "Confirmar Pedido";
};

// ===================== INICIALIZACAO =====================
const carrinhoRestaurado = restaurarCarrinhoDoStorage();
renderPedidoAnterior();
atualizarResumoBotaoCarrinho();

carregarConfigPublic()
  .then(() => restaurarDadosClienteDoStorage())
  .then(() => {
    renderCarrinho();
    if (carrinhoRestaurado) {
      showToast("Seu carrinho foi recuperado deste aparelho.");
    }
    if (pagamentoDivididoAtivo() && pagamentosDivididosLista && !pagamentosDivididosLista.children.length) {
      renderPagamentosDivididos();
    }
    atualizarUIFormaPagamento();
    atualizarResumoPagamentoDividido();
  })
  .then(() => carregarAdicionaisJSON())
  .then(() => carregarCategorias())
  .then(() => carregarCardapio());
