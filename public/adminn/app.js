const views = {
  pedidos: document.getElementById("view-pedidos"),
  cardapio: document.getElementById("view-cardapio"),
  notinha: document.getElementById("view-notinha"),
  entregues: document.getElementById("view-entregues"),
  mais: document.getElementById("view-mais"),
};

const tabs = Array.from(document.querySelectorAll(".tab-btn"));
const btnRefresh = document.getElementById("btn-refresh");
const btnLogout = document.getElementById("btn-logout");

const pedidoBusca = document.getElementById("pedido-busca");
const pedidosLista = document.getElementById("pedidos-lista");
const statAbertos = document.getElementById("stat-abertos");
const statPreparo = document.getElementById("stat-preparo");
const statEntrega = document.getElementById("stat-entrega");

const cardapioBusca = document.getElementById("cardapio-busca");
const cardapioLista = document.getElementById("cardapio-lista");
const btnPureBatata = document.getElementById("btn-pure-batata");

const notinhaTexto = document.getElementById("notinha-texto");
const btnInterpretar = document.getElementById("btn-interpretar");
const btnLimparNotinha = document.getElementById("btn-limpar-notinha");
const btnAplicarDraft = document.getElementById("btn-aplicar-draft");
const btnCriarPedido = document.getElementById("btn-criar-pedido");
const notinhaFeedback = document.getElementById("notinha-feedback");
const notinhaCliente = document.getElementById("notinha-cliente");
const notinhaTelefone = document.getElementById("notinha-telefone");
const notinhaTipo = document.getElementById("notinha-tipo");
const notinhaOrigem = document.getElementById("notinha-origem");
const notinhaPagamento = document.getElementById("notinha-pagamento");
const notinhaTroco = document.getElementById("notinha-troco");
const notinhaTaxa = document.getElementById("notinha-taxa");
const notinhaEndereco = document.getElementById("notinha-endereco");
const notinhaObs = document.getElementById("notinha-obs");
const notinhaItens = document.getElementById("notinha-itens");
const notinhaTotal = document.getElementById("notinha-total");

const entreguesBusca = document.getElementById("entregues-busca");
const entreguesLista = document.getElementById("entregues-lista");
const historicoPeriodo = document.getElementById("historico-periodo");
const historicoInicio = document.getElementById("historico-inicio");
const historicoFim = document.getElementById("historico-fim");
const historicoTipo = document.getElementById("historico-tipo");
const historicoStatus = document.getElementById("historico-status");
const btnSalvarTemaCardapio = document.getElementById("btn-salvar-tema-cardapio");
const temaCardapioFeedback = document.getElementById("tema-cardapio-feedback");

const state = {
  tab: "pedidos",
  pedidos: [],
  entregues: [],
  historico: [],
  cardapio: [],
  pure: { desativado: false, quantidade: 0, nomes: [] },
  temaCardapio: "original",
  notinhaDraft: null,
  loading: false,
  hojeSpKey: "",
  filtros: {
    pedidos: "",
    cardapio: "",
    entregues: "",
  },
};

const TEMAS_CARDAPIO_APP = {
  original: "Original",
  "copa-brasil": "Copa Brasil",
  "chapa-fogo": "Chapa & Fogo",
  "diner-retro": "Diner Retro",
  "neon-noturno": "Neon Noturno",
  "fliperama-90": "Fliperama 90",
  "rota-66": "Rota 66",
  "boteco-raiz": "Boteco Raiz",
  "aranha-urbana": "Homem-Aranha",
};

function normalizarTemaCardapio(tema) {
  return Object.hasOwn(TEMAS_CARDAPIO_APP, tema) ? tema : "original";
}

function nomeTemaCardapio(tema) {
  return TEMAS_CARDAPIO_APP[normalizarTemaCardapio(tema)];
}

function money(valor) {
  const n = Number(valor) || 0;
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizarAlteracaoItemTexto(valor) {
  return normalizeText(valor)
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
  const adicionaisKeys = new Set(adicionais.map((add) => normalizarAlteracaoItemTexto(add.nome)));
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
  return {
    obs: obsLivre,
    linhas: [...removidosFormatados, ...adicionaisFormatados, ...(obsLivre ? [`Obs: ${obsLivre}`] : [])],
  };
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

function partesDataSaoPaulo(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    key: `${byType.year}-${byType.month}-${byType.day}`,
  };
}

function dataKeySaoPaulo(value = new Date()) {
  return partesDataSaoPaulo(value)?.key || "";
}

function parsePtBrDateTime(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, d, m, y, hh = "0", mm = "0", ss = "0"] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
}

function getPedidoDate(pedido) {
  const candidates = [
    pedido?.createdAt,
    pedido?.created_at,
    pedido?.data,
    pedido?.timestamp,
    pedido?.saiuParaEntrega,
    pedido?.entregueEm,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const text = String(value);
    const parsedPt = parsePtBrDateTime(text);
    if (parsedPt && !Number.isNaN(parsedPt.getTime())) return parsedPt;
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.warn("[ADMINN] Pedido sem data valida para filtro diario:", pedido?.id);
  }
  return null;
}

function pedidoDiaKey(pedido) {
  const date = getPedidoDate(pedido);
  return date ? dataKeySaoPaulo(date) : "";
}

function isPedidoHojeSaoPaulo(pedido, now = new Date()) {
  const key = pedidoDiaKey(pedido);
  return Boolean(key && key === dataKeySaoPaulo(now));
}

function addDaysLocal(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function compararDataKey(key, start, end) {
  return key && (!start || key >= start) && (!end || key <= end);
}

function compactText(valor) {
  return normalizeText(valor).replace(/[^a-z0-9]+/g, "");
}

function isDeliveryType(tipo) {
  return normalizeText(tipo).includes("entrega");
}

function getCarrinhoResumo(carrinho = []) {
  return Array.isArray(carrinho)
    ? carrinho
        .map((item) => {
          const qtd = Number(item?.qtd || 0) || 1;
          const alteracoes = formatarAlteracoesItem(item).linhas;
          return `${qtd}x ${item?.nome || "Item"}${alteracoes.length ? ` (${alteracoes.join(" | ")})` : ""}`;
        })
        .join(" • ")
    : "";
}

function setFeedback(msg, type = "ok") {
  if (!notinhaFeedback) return;
  notinhaFeedback.textContent = msg;
  notinhaFeedback.classList.remove("ok", "err");
  notinhaFeedback.classList.add(type === "err" ? "err" : "ok");
}

function getPedidoTotal(pedido) {
  const subtotal = Array.isArray(pedido?.carrinho)
    ? pedido.carrinho.reduce((acc, item) => {
        const qtd = Number(item?.qtd || 0) || 1;
        const preco = Number(item?.preco || 0) || 0;
        const adicionais = Array.isArray(item?.adicionais)
          ? item.adicionais.reduce((sum, add) => {
              const mult = String(add?.escopo || "").toLowerCase() === "total" ? 1 : qtd;
              return sum + (Number(add?.preco || 0) || 0) * (Number(add?.qtd || 0) || 1) * mult;
            }, 0)
          : 0;
        return acc + (preco * qtd) + adicionais;
      }, 0)
    : 0;
  return subtotal + (Number(pedido?.taxaEntrega || pedido?.taxa_entrega || 0) || 0);
}

function getPedidoTimestamp(pedido) {
  return getPedidoDate(pedido)?.getTime() || 0;
}

function ordenarPedidosRecentes(pedidos) {
  return [...pedidos].sort((a, b) => {
    const byDate = getPedidoTimestamp(b) - getPedidoTimestamp(a);
    if (byDate) return byDate;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
}

function setActiveTab(tab) {
  state.tab = tab;
  tabs.forEach((btn) => btn.classList.toggle("ativo", btn.dataset.tab === tab));
  Object.entries(views).forEach(([key, view]) => {
    if (!view) return;
    view.classList.toggle("hidden", key !== tab);
  });
  if (tab === "pedidos") renderPedidos();
  if (tab === "cardapio") renderCardapio();
  if (tab === "entregues") renderEntregues();
  if (tab === "notinha" && state.notinhaDraft) renderNotinhaDraft();
}

function getStatusClass(status) {
  const s = normalizeText(status);
  if (s === "recebido") return "warn";
  if (s === "preparo" || s === "pronto" || s === "em_entrega") return "ok";
  if (s === "entregue") return "ok";
  if (s === "cancelado") return "bad";
  return "";
}

function statusLabel(status) {
  const s = normalizeText(status);
  if (s === "em_entrega") return "Em entrega";
  if (s === "cliente na porta") return "Na porta";
  if (s === "entregue") return "Entregue";
  if (s === "preparo") return "Preparo";
  if (s === "pronto") return "Pronto";
  if (s === "recebido") return "Recebido";
  if (s === "cancelado") return "Cancelado";
  return status || "Sem status";
}

function proximaAcaoPedido(pedido) {
  const status = normalizeText(pedido?.status);
  if (status === "recebido") return { label: "Preparo", status: "preparo" };
  if (status === "preparo") return { label: "Pronto", status: "pronto" };
  if (status === "pronto") {
    return isDeliveryType(pedido?.tipoEntrega) ? { label: "Entrega", status: "em_entrega" } : { label: "Entregue", status: "entregue" };
  }
  if (status === "em_entrega") return { label: "Entregue", status: "entregue" };
  return null;
}

async function carregarDados() {
  state.loading = true;
  try {
    const [pedidosRes, entreguesRes, cardapioRes, pureRes, temaRes, historicoRes] = await Promise.all([
      authFetch("/pedidos"),
      authFetch("/pedidos/entregues"),
      authFetch("/adminn/cardapio-completo"),
      authFetch("/adminn/cardapio/pure-batata"),
      authFetch("/adminn/cardapio/tema"),
      authFetch("/adminn/pedidos/historico?limit=300"),
    ]);

    const pedidosData = await pedidosRes.json();
    const entreguesData = await entreguesRes.json();
    const cardapioData = await cardapioRes.json();
    const pure = await pureRes.json();
    const tema = await temaRes.json();
    const historico = await historicoRes.json();
    state.pedidos = Array.isArray(pedidosData) ? pedidosData : [];
    state.entregues = Array.isArray(entreguesData) ? entreguesData : [];
    state.historico = Array.isArray(historico?.pedidos) ? historico.pedidos : [];
    state.cardapio = Array.isArray(cardapioData) ? cardapioData : [];
    state.temaCardapio = normalizarTemaCardapio(tema?.tema_cardapio);
    state.pure = {
      desativado: Boolean(pure?.desativado),
      quantidade: Number(pure?.quantidade || 0),
      nomes: Array.isArray(pure?.nomes) ? pure.nomes : [],
    };

    atualizarResumoPedidos();
    atualizarBotaoPure();
    atualizarControleTemaCardapio();
    renderCurrentTab();
  } catch (err) {
    console.error(err);
    if (state.tab === "notinha") {
      setFeedback("Nao foi possivel carregar os dados agora.", "err");
    }
  } finally {
    state.loading = false;
  }
}

function atualizarResumoPedidos() {
  const pedidos = pedidosOperacionaisHoje();
  const abertos = pedidos.filter((p) => normalizeText(p.status) !== "cancelado").length;
  const preparo = pedidos.filter((p) => normalizeText(p.status) === "preparo").length;
  const entrega = pedidos.filter((p) => normalizeText(p.status) === "em_entrega").length;
  if (statAbertos) statAbertos.textContent = String(abertos);
  if (statPreparo) statPreparo.textContent = String(preparo);
  if (statEntrega) statEntrega.textContent = String(entrega);
}

function pedidosOperacionaisHoje(now = new Date()) {
  return ordenarPedidosRecentes(Array.isArray(state.pedidos) ? state.pedidos : [])
    .filter((pedido) => isPedidoHojeSaoPaulo(pedido, now));
}

function atualizarControleTemaCardapio() {
  document.querySelectorAll('input[name="tema-cardapio"]').forEach((input) => {
    input.checked = input.value === state.temaCardapio;
  });
  if (temaCardapioFeedback) {
    temaCardapioFeedback.textContent = `Tema atual: ${nomeTemaCardapio(state.temaCardapio)}`;
  }
}

function atualizarBotaoPure() {
  if (!btnPureBatata) return;
  const qt = Number(state.pure?.quantidade || 0);
  if (state.pure?.desativado) {
    btnPureBatata.textContent = qt > 0 ? `Reativar pure (${qt})` : "Reativar pure";
    btnPureBatata.classList.add("primary-btn");
    return;
  }
  btnPureBatata.textContent = qt > 0 ? `Desativar pure (${qt})` : "Desativar pure";
  btnPureBatata.classList.add("primary-btn");
}

function renderCurrentTab() {
  if (state.tab === "pedidos") renderPedidos();
  if (state.tab === "cardapio") renderCardapio();
  if (state.tab === "notinha") renderNotinhaDraft();
  if (state.tab === "entregues") renderEntregues();
}

function renderPedidos() {
  if (!pedidosLista) return;
  const filtro = normalizeText(pedidoBusca?.value || state.filtros.pedidos || "");
  const pedidos = pedidosOperacionaisHoje();

  const filtrados = pedidos.filter((pedido) => {
    const texto = normalizeText([
      pedido?.cliente,
      pedido?.telefone,
      pedido?.id,
      pedido?.status,
      getCarrinhoResumo(pedido?.carrinho),
    ].join(" "));
    return !filtro || texto.includes(filtro);
  });

  if (!filtrados.length) {
    pedidosLista.innerHTML = `<div class="mini-card"><strong>Nenhum pedido aberto hoje</strong><div class="mini-meta">Pedidos de dias anteriores continuam no HistÃ³rico de pedidos.</div></div>`;
    return;
  }

  pedidosLista.innerHTML = filtrados.map((pedido) => {
    const next = proximaAcaoPedido(pedido);
    const status = normalizeText(pedido?.status);
    return `
      <article class="pedido-card">
        <div class="section-head" style="margin-bottom:8px;">
          <div>
            <p class="eyebrow">Pedido #${escapeHtml(pedido?.id)}</p>
            <h3 style="margin:0;">${escapeHtml(pedido?.cliente || "Cliente")}</h3>
            <div class="pedido-meta">${escapeHtml(pedido?.telefone || "")} ${pedido?.tipoEntrega ? `• ${escapeHtml(pedido.tipoEntrega)}` : ""}</div>
          </div>
          <span class="status-chip ${getStatusClass(status)}">${escapeHtml(statusLabel(status))}</span>
        </div>
        <div class="mini-meta">${escapeHtml(getCarrinhoResumo(pedido?.carrinho) || "-")}</div>
        <div class="pedido-meta">Pagamento: ${escapeHtml(pedido?.pagamento || "-")} ${pedido?.entregador ? `• Entregador: ${escapeHtml(pedido.entregador)}` : ""}</div>
        <div class="pedido-meta">Total: ${escapeHtml(money(getPedidoTotal(pedido)))}</div>
        <div class="pedido-actions">
          ${next ? `<button class="primary-btn" data-action="status" data-id="${pedido.id}" data-status="${next.status}">${escapeHtml(next.label)}</button>` : ""}
          ${status !== "entregue" ? `<button class="ghost-btn" data-action="cancelar" data-id="${pedido.id}">Cancelar</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderCardapio() {
  if (!cardapioLista) return;
  const filtro = normalizeText(cardapioBusca?.value || state.filtros.cardapio || "");
  const itens = Array.isArray(state.cardapio) ? state.cardapio : [];
  const filtrados = itens.filter((item) => {
    const texto = normalizeText([item?.nome, item?.categoria, item?.ingredientes, item?.preco].join(" "));
    return !filtro || texto.includes(filtro);
  });

  if (!filtrados.length) {
    cardapioLista.innerHTML = `<div class="mini-card"><strong>Nenhum item encontrado</strong></div>`;
    return;
  }

  cardapioLista.innerHTML = filtrados.map((item) => `
    <article class="item-card">
      <div class="section-head" style="margin-bottom:0;">
        <div>
          <h3>${escapeHtml(item?.nome || "")}</h3>
          <div class="mini-meta">${escapeHtml(item?.categoria || "")} • ${escapeHtml(item?.disponivel ? "Disponível" : "Indisponível")}</div>
        </div>
        <div class="price">${escapeHtml(money(item?.preco || 0))}</div>
      </div>
      ${item?.img ? `<img src="${escapeHtml(item.img)}" alt="${escapeHtml(item?.nome || "")}" style="width:100%;max-height:180px;object-fit:cover;border-radius:16px;border:1px solid rgba(255,255,255,.08);">` : ""}
      <p>${escapeHtml(Array.isArray(item?.ingredientes) ? item.ingredientes.join(", ") : (item?.ingredientes || ""))}</p>
      <div class="mini-meta">Ordem: ${escapeHtml(item?.order_index ?? "")}</div>
    </article>
  `).join("");
}

function renderEntreguesLegado() {
  if (!entreguesLista) return;
  const filtro = normalizeText(entreguesBusca?.value || state.filtros.entregues || "");
  const pedidos = ordenarPedidosRecentes(Array.isArray(state.entregues) ? state.entregues : []);
  const filtrados = pedidos.filter((pedido) => {
    const texto = normalizeText([
      pedido?.cliente,
      pedido?.telefone,
      pedido?.id,
      pedido?.pagamento,
      getCarrinhoResumo(pedido?.carrinho),
    ].join(" "));
    return !filtro || texto.includes(filtro);
  });

  if (!filtrados.length) {
    entreguesLista.innerHTML = `<div class="mini-card"><strong>Nenhum entregue encontrado</strong></div>`;
    return;
  }

  entreguesLista.innerHTML = filtrados.map((pedido) => `
    <article class="pedido-card">
      <div class="section-head" style="margin-bottom:8px;">
        <div>
          <p class="eyebrow">Pedido #${escapeHtml(pedido?.id)}</p>
          <h3 style="margin:0;">${escapeHtml(pedido?.cliente || "Cliente")}</h3>
          <div class="pedido-meta">${escapeHtml(pedido?.telefone || "")} ${pedido?.entregueEm ? `• ${escapeHtml(pedido.entregueEm)}` : ""}</div>
        </div>
        <span class="status-chip ok">${escapeHtml(statusLabel(pedido?.status || "entregue"))}</span>
      </div>
      <div class="mini-meta">${escapeHtml(getCarrinhoResumo(pedido?.carrinho) || "-")}</div>
      <div class="pedido-meta">Pagamento: ${escapeHtml(pedido?.pagamento || "-")} • Total: ${escapeHtml(money(getPedidoTotal(pedido)))}</div>
    </article>
  `).join("");
}

function renderEntregues() {
  if (!entreguesLista) return;
  const filtro = normalizeText(entreguesBusca?.value || state.filtros.entregues || "");
  const periodo = historicoPeriodo?.value || "hoje";
  const today = new Date();
  const todayKey = dataKeySaoPaulo(today);
  const yesterdayKey = dataKeySaoPaulo(addDaysLocal(today, -1));
  const sevenDaysKey = dataKeySaoPaulo(addDaysLocal(today, -6));
  const inicioKey = historicoInicio?.value || "";
  const fimKey = historicoFim?.value || "";
  const tipoFiltro = normalizeText(historicoTipo?.value || "");
  const statusFiltro = normalizeText(historicoStatus?.value || "");
  const pedidos = ordenarPedidosRecentes(Array.isArray(state.historico) ? state.historico : []);
  const filtrados = pedidos.filter((pedido) => {
    const dayKey = pedidoDiaKey(pedido);
    if (periodo === "hoje" && dayKey !== todayKey) return false;
    if (periodo === "ontem" && dayKey !== yesterdayKey) return false;
    if (periodo === "7dias" && !compararDataKey(dayKey, sevenDaysKey, todayKey)) return false;
    if (periodo === "personalizado" && !compararDataKey(dayKey, inicioKey, fimKey)) return false;
    if (tipoFiltro) {
      const tipoTexto = normalizeText(`${pedido?.tipoEntrega || ""} ${pedido?.origemPedido || ""}`);
      if (!tipoTexto.includes(tipoFiltro)) return false;
    }
    if (statusFiltro && normalizeText(pedido?.status) !== statusFiltro) return false;
    const texto = normalizeText([
      pedido?.cliente,
      pedido?.telefone,
      pedido?.id,
      pedido?.tipoEntrega,
      pedido?.status,
      pedido?.pagamento,
      getCarrinhoResumo(pedido?.carrinho),
    ].join(" "));
    return !filtro || texto.includes(filtro);
  });

  if (!filtrados.length) {
    entreguesLista.innerHTML = `<div class="mini-card"><strong>Nenhum pedido encontrado no historico</strong><div class="mini-meta">Ajuste o periodo, status, tipo ou busca.</div></div>`;
    return;
  }

  entreguesLista.innerHTML = filtrados.map((pedido) => `
    <article class="pedido-card">
      <div class="section-head" style="margin-bottom:8px;">
        <div>
          <p class="eyebrow">Pedido #${escapeHtml(pedido?.id)}</p>
          <h3 style="margin:0;">${escapeHtml(pedido?.cliente || "Cliente")}</h3>
          <div class="pedido-meta">${escapeHtml(pedido?.telefone || "")} ${pedido?.created_at ? `- ${escapeHtml(pedido.created_at)}` : ""}</div>
        </div>
        <span class="status-chip ${getStatusClass(pedido?.status)}">${escapeHtml(statusLabel(pedido?.status || "sem status"))}</span>
      </div>
      <div class="mini-meta">${escapeHtml(getCarrinhoResumo(pedido?.carrinho) || "-")}</div>
      <div class="pedido-meta">Tipo: ${escapeHtml(pedido?.tipoEntrega || "-")} - Pagamento: ${escapeHtml(pedido?.pagamento || "-")} - Total: ${escapeHtml(money(getPedidoTotal(pedido)))}</div>
    </article>
  `).join("");
}

function renderNotinhaDraft() {
  if (!state.notinhaDraft) {
    if (notinhaItens) {
      notinhaItens.innerHTML = `<div class="mini-card"><strong>Cole a notinha e toque em interpretar.</strong><div class="mini-meta">O sistema vai reconhecer lanches, nome, endereço, pagamento e troco.</div></div>`;
    }
    if (notinhaTotal) notinhaTotal.textContent = money(0);
    return;
  }

  const draft = state.notinhaDraft;
  if (notinhaCliente && document.activeElement !== notinhaCliente) notinhaCliente.value = draft.cliente || "";
  if (notinhaTelefone && document.activeElement !== notinhaTelefone) notinhaTelefone.value = draft.telefone || "";
  if (notinhaTipo && document.activeElement !== notinhaTipo) notinhaTipo.value = draft.tipoEntrega || "entrega";
  if (notinhaOrigem && document.activeElement !== notinhaOrigem) notinhaOrigem.value = draft.origemPedido || "outro";
  if (notinhaPagamento && document.activeElement !== notinhaPagamento) notinhaPagamento.value = draft.pagamento || "dinheiro";
  if (notinhaTroco && document.activeElement !== notinhaTroco) notinhaTroco.value = draft.troco || "";
  if (notinhaTaxa && document.activeElement !== notinhaTaxa) notinhaTaxa.value = String(draft.taxaEntrega || 0);
  if (notinhaEndereco && document.activeElement !== notinhaEndereco) notinhaEndereco.value = draft.endereco || "";
  if (notinhaObs && document.activeElement !== notinhaObs) notinhaObs.value = draft.obsGeral || "";

  const itens = Array.isArray(draft.carrinho) ? draft.carrinho : [];
  if (notinhaItens) {
    if (!itens.length) {
      notinhaItens.innerHTML = `<div class="mini-card"><strong>Nenhum item reconhecido ainda.</strong></div>`;
    } else {
      notinhaItens.innerHTML = itens.map((item) => `
        <article class="mini-card">
          <div class="section-head" style="margin-bottom:6px;">
            <div>
              <strong>${escapeHtml(item?.qtd || 1)}x ${escapeHtml(item?.nome || "")}</strong>
              <div class="mini-meta">${escapeHtml(item?.categoria || "")}</div>
            </div>
            <span class="status-chip">${escapeHtml(money(item?.preco || 0))}</span>
          </div>
          ${formatarAlteracoesItem(item).linhas.map((linha) => `<div class="mini-meta">${escapeHtml(linha)}</div>`).join("")}
        </article>
      `).join("");
    }
  }

  const total = itens.reduce((acc, item) => {
    const qtd = Number(item?.qtd || 0) || 1;
    const preco = Number(item?.preco || 0) || 0;
    const adicionais = Array.isArray(item?.adicionais)
      ? item.adicionais.reduce((sum, add) => {
          const mult = String(add?.escopo || "").toLowerCase() === "total" ? 1 : qtd;
          return sum + (Number(add?.preco || 0) || 0) * (Number(add?.qtd || 0) || 1) * mult;
        }, 0)
      : 0;
    return acc + (preco * qtd) + adicionais;
  }, 0) + (Number(draft.taxaEntrega || 0) || 0);

  if (notinhaTotal) notinhaTotal.textContent = money(total);
}

async function alternarPureBatata() {
  try {
    btnPureBatata.disabled = true;
    const res = await authFetch("/adminn/cardapio/pure-batata/toggle", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error("nao foi possivel alternar");
    state.pure = {
      desativado: Boolean(data?.desativado),
      quantidade: Number(data?.quantidade || 0),
      nomes: Array.isArray(data?.nomes) ? data.nomes : [],
    };
    atualizarBotaoPure();
    await carregarDados();
  } catch (err) {
    console.error(err);
    setFeedback("Nao foi possivel alternar o pure.", "err");
  } finally {
    btnPureBatata.disabled = false;
  }
}

async function salvarTemaCardapio() {
  const selected = document.querySelector('input[name="tema-cardapio"]:checked');
  const tema = selected?.value || "original";
  if (btnSalvarTemaCardapio) btnSalvarTemaCardapio.disabled = true;
  if (temaCardapioFeedback) temaCardapioFeedback.textContent = "Salvando tema...";
  try {
    const res = await authFetch("/adminn/cardapio/tema", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tema_cardapio: tema }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "tema_invalido");
    state.temaCardapio = normalizarTemaCardapio(data.tema_cardapio);
    atualizarControleTemaCardapio();
    if (temaCardapioFeedback) {
      temaCardapioFeedback.textContent = `Tema salvo: ${nomeTemaCardapio(state.temaCardapio)}`;
    }
  } catch (err) {
    console.error(err);
    if (temaCardapioFeedback) temaCardapioFeedback.textContent = "Nao foi possivel salvar o tema.";
  } finally {
    if (btnSalvarTemaCardapio) btnSalvarTemaCardapio.disabled = false;
  }
}

async function alterarStatusPedido(id, status) {
  try {
    const pedido = state.pedidos.find((p) => Number(p.id) === Number(id));
    const payload = { id: Number(id), status };
    if (status === "em_entrega" && !pedido?.entregador) {
      const nome = prompt("Nome do entregador:");
      if (!nome) return;
      payload.entregador = nome.trim();
    } else if (pedido?.entregador) {
      payload.entregador = pedido.entregador;
    }
    const res = await authFetch("/pedidos/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      alert(data?.message || "Nao foi possivel atualizar o pedido.");
      return;
    }
    await carregarDados();
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar o pedido.");
  }
}

async function cancelarPedido(id) {
  if (!confirm("Cancelar este pedido?")) return;
  try {
    const res = await authFetch(`/pedidos/cancelar/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      alert(data?.message || "Nao foi possivel cancelar.");
      return;
    }
    await carregarDados();
  } catch (err) {
    console.error(err);
    alert("Erro ao cancelar pedido.");
  }
}

async function interpretarNotinha() {
  const texto = String(notinhaTexto?.value || "").trim();
  if (!texto) {
    setFeedback("Cole ou digite a notinha primeiro.", "err");
    return;
  }
  try {
    setFeedback("Interpretando notinha...", "ok");
    const res = await authFetch("/adminn/notinha/interpretar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "falha");
    }
    state.notinhaDraft = data;
    if (notinhaCliente) notinhaCliente.value = data.cliente || "";
    if (notinhaTelefone) notinhaTelefone.value = data.telefone || "";
    if (notinhaTipo) notinhaTipo.value = data.tipoEntrega || "entrega";
    if (notinhaOrigem) notinhaOrigem.value = data.origemPedido || "outro";
    if (notinhaPagamento) notinhaPagamento.value = data.pagamento || "dinheiro";
    if (notinhaTroco) notinhaTroco.value = data.troco || "";
    if (notinhaTaxa) notinhaTaxa.value = String(data.taxaEntrega || 0);
    if (notinhaEndereco) notinhaEndereco.value = data.endereco || "";
    if (notinhaObs) notinhaObs.value = data.obsGeral || "";
    renderNotinhaDraft();
    setFeedback(`Interpretado com ${data.quantidadeItens || 0} item(ns).`, "ok");
    setActiveTab("notinha");
  } catch (err) {
    console.error(err);
    setFeedback("Nao consegui interpretar a notinha.", "err");
  }
}

function montarPayloadNotinha() {
  const draft = state.notinhaDraft;
  if (!draft || !Array.isArray(draft.carrinho) || !draft.carrinho.length) {
    return null;
  }
  const tipo = String(notinhaTipo?.value || draft.tipoEntrega || "entrega").trim();
  const endereco = String(notinhaEndereco?.value || draft.endereco || "").trim();
  const origemPedido = String(notinhaOrigem?.value || draft.origemPedido || "outro").trim();
  const pagamento = String(notinhaPagamento?.value || draft.pagamento || "dinheiro").trim();
  const troco = String(notinhaTroco?.value || draft.troco || "").trim();
  const taxaEntrega = Number(String(notinhaTaxa?.value || draft.taxaEntrega || 0).replace(",", ".")) || 0;
  const cliente = String(notinhaCliente?.value || draft.cliente || "Cliente do balcao").trim();
  const telefone = String(notinhaTelefone?.value || draft.telefone || "").trim();
  const obsGeral = String(notinhaObs?.value || draft.obsGeral || "").trim();

  const pagamentoDetalhes = pagamento === "dividido" ? [] : [];
  return {
    cliente: cliente || "Cliente do balcao",
    telefone,
    endereco: tipo === "entrega" ? endereco : (tipo === "cliente na porta" ? "Cliente aguardando na porta" : "Retirada no balcao"),
    tipoEntrega: tipo,
    origemPedido,
    pagamento,
    pagamentosDetalhes: pagamentoDetalhes,
    troco,
    chavePix: "",
    carrinho: draft.carrinho.map((item) => ({
      nome: item.nome,
      preco: item.preco,
      qtd: item.qtd,
      categoria: item.categoria,
      img: item.img,
      adicionais: Array.isArray(item.adicionais) ? item.adicionais : [],
      removidos: Array.isArray(item.removidos) ? item.removidos : [],
      obs: String(item.obs || "").trim(),
    })),
    obsGeral,
    taxaEntrega,
  };
}

async function criarPedidoDaNotinha() {
  const payload = montarPayloadNotinha();
  if (!payload) {
    setFeedback("Interprete a notinha antes de criar o pedido.", "err");
    return;
  }
  if (!payload.carrinho.length) {
    setFeedback("Nao reconheci nenhum item na notinha.", "err");
    return;
  }
  if (payload.tipoEntrega === "entrega" && !payload.endereco) {
    setFeedback("Para entrega, informe o endereco.", "err");
    return;
  }

  try {
    btnCriarPedido.disabled = true;
    const res = await authFetch("/pedidos/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || data?.error || "falha");
    }
    setFeedback(`Pedido #${data.pedidoId} criado com sucesso.`, "ok");
    state.notinhaDraft = null;
    if (notinhaTexto) notinhaTexto.value = "";
    if (notinhaItens) notinhaItens.innerHTML = "";
    if (notinhaTotal) notinhaTotal.textContent = money(0);
    await carregarDados();
    setActiveTab("pedidos");
  } catch (err) {
    console.error(err);
    setFeedback("Nao foi possivel criar o pedido.", "err");
  } finally {
    btnCriarPedido.disabled = false;
  }
}

function bindEvents() {
  tabs.forEach((btn) => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
  btnRefresh?.addEventListener("click", carregarDados);
  btnLogout?.addEventListener("click", async () => {
    try {
      await fetch("/adminn/logout", { method: "POST" });
    } catch (err) {
      console.warn(err);
    } finally {
      window.location.href = "/adminn/login.html";
    }
  });
  pedidoBusca?.addEventListener("input", () => renderPedidos());
  cardapioBusca?.addEventListener("input", () => renderCardapio());
  entreguesBusca?.addEventListener("input", () => renderEntregues());
  historicoPeriodo?.addEventListener("change", () => renderEntregues());
  historicoInicio?.addEventListener("change", () => renderEntregues());
  historicoFim?.addEventListener("change", () => renderEntregues());
  historicoTipo?.addEventListener("change", () => renderEntregues());
  historicoStatus?.addEventListener("change", () => renderEntregues());
  btnPureBatata?.addEventListener("click", alternarPureBatata);
  btnSalvarTemaCardapio?.addEventListener("click", salvarTemaCardapio);
  btnInterpretar?.addEventListener("click", interpretarNotinha);
  btnLimparNotinha?.addEventListener("click", () => {
    state.notinhaDraft = null;
    if (notinhaTexto) notinhaTexto.value = "";
    if (notinhaCliente) notinhaCliente.value = "";
    if (notinhaTelefone) notinhaTelefone.value = "";
    if (notinhaEndereco) notinhaEndereco.value = "";
    if (notinhaObs) notinhaObs.value = "";
    if (notinhaTroco) notinhaTroco.value = "";
    if (notinhaTaxa) notinhaTaxa.value = "0";
    if (notinhaItens) notinhaItens.innerHTML = "";
    if (notinhaTotal) notinhaTotal.textContent = money(0);
    setFeedback("Notinha limpa.", "ok");
  });
  btnAplicarDraft?.addEventListener("click", interpretarNotinha);
  btnCriarPedido?.addEventListener("click", criarPedidoDaNotinha);

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === "status") {
      alterarStatusPedido(id, btn.dataset.status);
    } else if (action === "cancelar") {
      cancelarPedido(id);
    }
  });
}

function startAutoRefresh() {
  setInterval(() => {
    if (document.hidden) return;
    const todayKey = dataKeySaoPaulo(new Date());
    if (state.hojeSpKey && state.hojeSpKey !== todayKey) {
      state.hojeSpKey = todayKey;
      renderPedidos();
      renderEntregues();
    } else {
      state.hojeSpKey = todayKey;
    }
    carregarDados();
  }, 20000);
}

function init() {
  state.hojeSpKey = dataKeySaoPaulo(new Date());
  bindEvents();
  setupLogout?.();
  setActiveTab("pedidos");
  carregarDados();
  startAutoRefresh();
}

window.addEventListener("load", init);
