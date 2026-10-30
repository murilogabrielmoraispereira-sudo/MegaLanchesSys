// ===================== SELETORES =====================
const btnPedidos = document.getElementById("btn-pedidos");
const btnCardapio = document.getElementById("btn-cardapio");
const btnPedidosEntregues = document.getElementById("btn-pedidos-entregues");
const btnPureBatata = document.getElementById("btn-pure-batata");

const painelPedidos = document.getElementById("painel-pedidos");
const painelCardapio = document.getElementById("painel-cardapio");
const painelEntregues = document.getElementById("painel-entregues");

const listaLanches = document.getElementById("lista-lanches");
const aviso = document.getElementById("aviso");

// Modal cardápio
const modal = document.getElementById("modal-lanche");
const fecharModal = document.getElementById("fechar-modal-lanche");
const btnAdicionarLanche = document.getElementById("btn-adicionar-lanche");
const salvarLancheBtn = document.getElementById("salvar-lanche");

// Campos do modal
const novoNome = document.getElementById("novo-nome");
const novoPreco = document.getElementById("novo-preco");
const novaCategoria = document.getElementById("nova-categoria");
const novosIngredientes = document.getElementById("novos-ingredientes");
const novaImg = document.getElementById("nova-img");
const ingredientesCustom = document.getElementById("ingredientes-custom");

let editIndex = null;
let editImgAtual = "";
let pureBatataEstado = { desativado: false, quantidade: 0, nomes: [] };

// Pedidos
const pedidosRecebidosDiv = document.getElementById("pedidos-recebidos");
const pedidosPreparoDiv = document.getElementById("pedidos-preparo");
const pedidosProntoDiv = document.getElementById("pedidos-pronto");
const pedidosEntregaDiv = document.getElementById("pedidos-entrega");
const pedidosEntreguesDiv = document.getElementById("pedidos-entregues");

// ADICIONAIS (elementos)
const adicionaisContainer = document.getElementById("adicionais-container");
const novoAdicionalInput = document.getElementById("novo-adicional");
const valorAdicionalInput = document.getElementById("valor-adicional");
const btnAdicionarAdicional = document.getElementById("btn-adicionar-adicional");

// Categorias
const novaCategoriaNome = document.getElementById("nova-categoria-nome");
const btnAdicionarCategoria = document.getElementById("btn-adicionar-categoria");
const listaCategorias = document.getElementById("lista-categorias");
let categoriasCache = [];

// Filtros e resumo
const filtroBusca = document.getElementById("filtro-busca");
const filtroStatus = document.getElementById("filtro-status");
const btnLimparFiltro = document.getElementById("btn-limpar-filtro");
const resumoAberto = document.getElementById("resumo-aberto");
const resumoRecebido = document.getElementById("resumo-recebido");
const resumoPreparo = document.getElementById("resumo-preparo");
const resumoEntrega = document.getElementById("resumo-entrega");
const btnNovoPedidoManual = document.getElementById("btn-novo-pedido-manual");
const btnExcluirTodosPedidos = document.getElementById("btn-excluir-todos-pedidos");
const audioAlertsPedidos = document.getElementById("audio-alerts-pedidos");
const audioAlertsVolume = document.getElementById("audio-alerts-volume");
const audioAlertsVolumeLabel = document.getElementById("audio-alerts-volume-label");
const btnTestarSomPedidos = document.getElementById("btn-testar-som-pedidos");
const filtroEntreguesBusca = document.getElementById("filtro-entregues-busca");
const filtroEntreguesPeriodo = document.getElementById("filtro-entregues-periodo");
const filtroEntreguesInicio = document.getElementById("filtro-entregues-inicio");
const filtroEntreguesFim = document.getElementById("filtro-entregues-fim");
const filtroEntreguesStatus = document.getElementById("filtro-entregues-status");
const filtroEntreguesTipo = document.getElementById("filtro-entregues-tipo");
const filtroEntreguesPagamento = document.getElementById("filtro-entregues-pagamento");
const filtroEntreguesEntregador = document.getElementById("filtro-entregues-entregador");
const filtroEntreguesValor = document.getElementById("filtro-entregues-valor");
const btnLimparFiltroEntregues = document.getElementById("btn-limpar-filtro-entregues");
const resumoEntreguesInfo = document.getElementById("resumo-entregues-info");

// Modal pedidos
const modalPedido = document.getElementById("modal-pedido");
const fecharModalPedido = document.getElementById("fechar-modal-pedido");
const fecharModalPedidoTopo = document.getElementById("fechar-modal-pedido-topo");
const salvarPedidoManualBtn = document.getElementById("salvar-pedido-manual");
const pedidoModalTitulo = document.getElementById("pedido-modal-titulo");
const pedidoEditIdInput = document.getElementById("pedido-edit-id");
const pedidoClienteInput = document.getElementById("pedido-cliente");
const pedidoTelefoneInput = document.getElementById("pedido-telefone");
const pedidoEnderecoInput = document.getElementById("pedido-endereco");
const pedidoTipoEntregaInput = document.getElementById("pedido-tipo-entrega");
const pedidoPagamentoInput = document.getElementById("pedido-pagamento");
const pedidoPagamentoDivididoInput = document.getElementById("pedido-pagamento-dividido");
const pedidoPagamentoDivididoBox = document.getElementById("pedido-pagamento-dividido-box");
const pedidoPagamentosDivididosLista = document.getElementById("pedido-pagamentos-divididos-lista");
const pedidoAddPagamentoDivididoBtn = document.getElementById("pedido-add-pagamento-dividido");
const pedidoPagamentoDivididoResumo = document.getElementById("pedido-pagamento-dividido-resumo");
const pedidoStatusInput = document.getElementById("pedido-status");
const pedidoTaxaEntregaInput = document.getElementById("pedido-taxa-entrega");
const pedidoEntregadorInput = document.getElementById("pedido-entregador");
const pedidoOrigemInput = document.getElementById("pedido-origem");
const pedidoObsInput = document.getElementById("pedido-obs");
const pedidoItensLinhasInput = document.getElementById("pedido-itens-linhas");
const pedidoItemBuscaInput = document.getElementById("pedido-item-busca");
const pedidoItemResultados = document.getElementById("pedido-item-resultados");
const pedidoItensBuilderEl = document.getElementById("pedido-itens-builder");
const pedidoAbrirCatalogoBtn = document.getElementById("pedido-abrir-catalogo");
const pedidoGerenciarItensBtn = document.getElementById("pedido-gerenciar-itens");
const modalPedidoItem = document.getElementById("modal-pedido-item");
const pedidoItemModalNome = document.getElementById("pedido-item-modal-nome");
const pedidoItemModalQtd = document.getElementById("pedido-item-modal-qtd");
const pedidoItemModalPreco = document.getElementById("pedido-item-modal-preco");
const pedidoItemModalObs = document.getElementById("pedido-item-modal-obs");
const pedidoItemModalCancelar = document.getElementById("pedido-item-modal-cancelar");
const pedidoItemModalConfirmar = document.getElementById("pedido-item-modal-confirmar");
const modalPedidoCatalogo = document.getElementById("modal-pedido-catalogo");
const pedidoCatalogoFecharBtn = document.getElementById("pedido-catalogo-fechar");
const pedidoCatalogoBuscaInput = document.getElementById("pedido-catalogo-busca");
const pedidoCatalogoListaEl = document.getElementById("pedido-catalogo-lista");
const pedidoCatalogoVazioEl = document.getElementById("pedido-catalogo-vazio");
const pedidoCatalogoFormEl = document.getElementById("pedido-catalogo-form");
const pedidoCatalogoNomeEl = document.getElementById("pedido-catalogo-nome");
const pedidoCatalogoQtdInput = document.getElementById("pedido-catalogo-qtd");
const pedidoCatalogoPrecoInput = document.getElementById("pedido-catalogo-preco");
const pedidoCatalogoObsInput = document.getElementById("pedido-catalogo-obs");
const pedidoCatalogoRemovidosEl = document.getElementById("pedido-catalogo-removidos");
const pedidoCatalogoSelectAdicional = document.getElementById("pedido-catalogo-select-adicional");
const pedidoCatalogoAddAdicionalBtn = document.getElementById("pedido-catalogo-add-adicional");
const pedidoCatalogoAdicionaisEl = document.getElementById("pedido-catalogo-adicionais");
const pedidoCatalogoSalvarBtn = document.getElementById("pedido-catalogo-salvar");

let pedidosCache = [];
let entreguesCache = [];
let ultimoPedidoId = null;
let primeiroLoadPedidos = true;
const novosPedidos = new Map();
const TEMPO_NOVO_MS = 2 * 60 * 1000;
let idsPedidosAtual = new Set();
let alertaIniciado = false;
let cardapioPedidoCache = [];
let adicionaisPedidoCache = [];
let pedidoItensBuilder = [];
let historicoPedidoCache = new Map();
let audioPedidoAtivo = localStorage.getItem("admin_alert_audio_pedidos") !== "0";
let skeletonPedidosMostrado = false;
let pedidosRenderToken = 0;
let carregandoPedidos = false;
let pedidosLastSignature = "";
let pedidoItemModalSelecionado = null;
let pedidoCatalogoSelecionado = null;
let pedidoCatalogoEditandoIndex = -1;
let pedidoCatalogoDraft = null;
let audioPedidoVolume = Number(localStorage.getItem("admin_alert_audio_pedidos_vol") || 120);
let hojeSaoPauloKey = "";

// ===================== AVISO =====================
function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 3000);
}

function atualizarBotaoPureBatata() {
  if (!btnPureBatata) return;
  const qt = Number(pureBatataEstado?.quantidade || 0);
  if (pureBatataEstado.desativado) {
    btnPureBatata.textContent = qt > 0
      ? `Reativar lanches com pure (${qt})`
      : "Reativar lanches com pure";
    btnPureBatata.classList.remove("outline");
    btnPureBatata.classList.add("primary");
    return;
  }
  btnPureBatata.textContent = qt > 0
    ? `Desativar lanches com pure (${qt})`
    : "Desativar lanches com pure";
  btnPureBatata.classList.remove("primary");
  btnPureBatata.classList.add("outline");
}

async function carregarEstadoPureBatata() {
  try {
    const res = await authFetch("/adminn/cardapio/pure-batata");
    const data = await res.json();
    pureBatataEstado = {
      desativado: Boolean(data?.desativado),
      quantidade: Number(data?.quantidade || 0),
      nomes: Array.isArray(data?.nomes) ? data.nomes : [],
    };
    atualizarBotaoPureBatata();
  } catch (err) {
    console.error("Erro ao carregar estado do pure:", err);
  }
}

async function alternarPureBatata() {
  if (!btnPureBatata) return;
  btnPureBatata.disabled = true;
  try {
    const acao = pureBatataEstado.desativado ? "reativar" : "desativar";
    const ok = confirm(
      pureBatataEstado.desativado
        ? `Reativar ${pureBatataEstado.quantidade} lanche(s) com pure?`
        : `Desativar ${pureBatataEstado.quantidade} lanche(s) com pure?`
    );
    if (!ok) return;
    const res = await authFetch("/adminn/cardapio/pure-batata/toggle", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      mostrarAviso("Nao foi possivel alternar os lanches com pure.");
      return;
    }
    pureBatataEstado = {
      desativado: Boolean(data?.desativado),
      quantidade: Number(data?.quantidade || 0),
      nomes: Array.isArray(data?.nomes) ? data.nomes : [],
    };
    atualizarBotaoPureBatata();
    mostrarAviso(
      pureBatataEstado.desativado
        ? `Lanches com pure desativados (${pureBatataEstado.quantidade}).`
        : `Lanches com pure reativados (${pureBatataEstado.quantidade}).`
    );
    carregarCardapio();
  } catch (err) {
    console.error("Erro ao alternar pure:", err);
    mostrarAviso("Erro ao alternar lanches com pure.");
  } finally {
    if (btnPureBatata) btnPureBatata.disabled = false;
  }
}

function capturarScrollPagina() {
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function restaurarScrollPagina(scrollY = 0) {
  const alvo = Math.max(Number(scrollY) || 0, 0);
  requestAnimationFrame(() => {
    window.scrollTo({ top: alvo, left: 0, behavior: "auto" });
  });
  setTimeout(() => {
    const atual = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    if (Math.abs(atual - alvo) > 2) window.scrollTo(0, alvo);
  }, 80);
}

function normalizarTexto(valor) {
  return String(valor || "").toLowerCase().trim();
}

const SAO_PAULO_TZ = "America/Sao_Paulo";

function dataKeySaoPaulo(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
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
    pedido?.criadoEm,
    pedido?.data,
    pedido?.timestamp,
    pedido?.saiuParaEntrega,
    pedido?.entregueEm,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const parsedPt = parsePtBrDateTime(value);
    if (parsedPt && !Number.isNaN(parsedPt.getTime())) return parsedPt;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.warn("[ADMINN] Pedido sem data valida para filtro diario:", pedido?.id);
  }
  return null;
}

function getPedidoTimestamp(pedido) {
  return getPedidoDate(pedido)?.getTime() || 0;
}

function ordenarPedidosRecentes(lista) {
  return [...(Array.isArray(lista) ? lista : [])].sort((a, b) => {
    const byDate = getPedidoTimestamp(b) - getPedidoTimestamp(a);
    if (byDate) return byDate;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
}

function pedidosDoDiaAtual(lista, now = new Date()) {
  const hoje = dataKeySaoPaulo(now);
  return ordenarPedidosRecentes(lista).filter((pedido) => {
    const key = dataKeySaoPaulo(getPedidoDate(pedido));
    return Boolean(key && key === hoje);
  });
}

function addDaysLocal(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function compararDataKey(key, start, end) {
  return key && (!start || key >= start) && (!end || key <= end);
}

function normalizarTipoEntrega(valor) {
  const tipo = normalizarTexto(valor);
  if (!tipo) return "outro";
  if (tipo.includes("balcao")) return "porta";
  if (tipo.includes("porta")) return "porta";
  if (tipo.includes("retirada")) return "retirada";
  if (tipo.includes("entrega")) return "entrega";
  return "outro";
}

function normalizarTipoEntregaFormulario(valor, origem = "") {
  const tipo = normalizarTexto(valor);
  const origemNorm = normalizarTexto(origem);
  if (tipo.includes("porta") || tipo.includes("balcao") || origemNorm.includes("porta")) {
    return "cliente na porta";
  }
  if (tipo.includes("retirada")) return "retirada";
  return "entrega";
}

function normalizarPagamentoCategoria(pedido) {
  const pagamento = normalizarTexto(pedido?.pagamento || "");
  const detalhes = Array.isArray(pedido?.pagamentosDetalhes) ? pedido.pagamentosDetalhes : [];
  if (detalhes.length > 1 || pagamento.includes("dividido")) return "dividido";
  if (pagamento.includes("pix")) return "pix";
  if (pagamento.includes("dinheiro")) return "dinheiro";
  if (pagamento.includes("cartao")) return "cartao";
  return "outro";
}

function normalizarFaixaValor(total) {
  const valor = Math.max(Number(total) || 0, 0);
  if (valor <= 30) return "ate_30";
  if (valor <= 60) return "de_30_a_60";
  if (valor <= 100) return "de_60_a_100";
  return "acima_100";
}

function atualizarOpcoesFiltroEntregadorEntregues() {
  if (!filtroEntreguesEntregador) return;
  const atual = filtroEntreguesEntregador.value || "todos";
  const nomes = Array.from(
    new Set(
      entreguesCache
        .map((p) => String(p?.entregador || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
    )
  );
  filtroEntreguesEntregador.innerHTML = `
    <option value="todos">Todos os entregadores</option>
    ${nomes.map((nome) => `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`).join("")}
  `;
  if (atual && Array.from(filtroEntreguesEntregador.options).some((op) => op.value === atual)) {
    filtroEntreguesEntregador.value = atual;
  }
}

function formatarTempoDecorrido(dataISO) {
  if (!dataISO) return "-";
  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return "-";
  const diffMs = Date.now() - data.getTime();
  const minutos = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `ha ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `ha ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `ha ${dias}d`;
}

function normalizarVolumePedido(valor) {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 120;
  return Math.min(Math.max(Math.round(num), 20), 200);
}

function atualizarLabelVolumePedido() {
  if (audioAlertsVolumeLabel) {
    audioAlertsVolumeLabel.textContent = `${audioPedidoVolume}%`;
  }
  if (audioAlertsVolume) {
    audioAlertsVolume.value = String(audioPedidoVolume);
  }
}

function tocarSequenciaSomPedido(sequencia = []) {
  if (!audioPedidoAtivo) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    let inicio = ctx.currentTime + 0.01;
    const volumeBase = Math.min(0.9, 0.2 * (audioPedidoVolume / 100));

    sequencia.forEach((passo) => {
      const freq = Number(passo?.freq) || 880;
      const duracaoMs = Math.max(Number(passo?.duracaoMs) || 160, 60);
      const pausaMs = Math.max(Number(passo?.pausaMs) || 40, 0);
      const ganhoRelativo = Math.max(Number(passo?.ganho) || 1, 0.1);
      const duracao = duracaoMs / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const ganhoFinal = Math.min(volumeBase * ganhoRelativo, 0.95);
      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.exponentialRampToValueAtTime(Math.max(ganhoFinal, 0.0002), inicio + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + duracao);
      inicio += duracao + pausaMs / 1000;
    });

    const totalMs = Math.max((inicio - ctx.currentTime) * 1000, 200);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, totalMs + 200);
  } catch (err) {
    // ignore
  }
}

function tocarSomNovoPedido() {
  tocarSequenciaSomPedido([
    { freq: 920, duracaoMs: 150, pausaMs: 35, ganho: 1.15 },
    { freq: 1120, duracaoMs: 180, pausaMs: 0, ganho: 1.3 },
  ]);
}

function renderSkeletonPedidos() {
  const skeletonCard = '<div class="pedido"><strong class="skeleton-text"> </strong><p class="skeleton-text"> </p><p class="skeleton-text"> </p><p class="skeleton-text"> </p></div>';
  if (pedidosRecebidosDiv) pedidosRecebidosDiv.innerHTML = skeletonCard.repeat(2);
  if (pedidosPreparoDiv) pedidosPreparoDiv.innerHTML = skeletonCard.repeat(1);
  if (pedidosProntoDiv) pedidosProntoDiv.innerHTML = skeletonCard.repeat(1);
  if (pedidosEntregaDiv) pedidosEntregaDiv.innerHTML = skeletonCard.repeat(1);
}

async function carregarHistoricoPedido(id) {
  if (!id) return [];
  if (historicoPedidoCache.has(id)) return historicoPedidoCache.get(id) || [];
  try {
    const res = await authFetch(`/pedidos/${id}/historico`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    historicoPedidoCache.set(id, items);
    return items;
  } catch (err) {
    console.error("Erro ao carregar historico do pedido:", err);
    return [];
  }
}

function formatarHistoricoPedido(hist = []) {
  if (!Array.isArray(hist) || !hist.length) {
    return '<div class="pedido-historico"><details><summary>Historico de status</summary><ul><li>Sem alteracoes registradas.</li></ul></details></div>';
  }
  const linhas = hist
    .slice(0, 8)
    .map((item) => {
      const de = item.status_anterior ? String(item.status_anterior) : "novo";
      const para = String(item.status_novo || "-");
      const ator = String(item.ator || "sistema");
      const quando = formatarTempoDecorrido(item.created_at);
      return `<li><strong>${de}</strong> -> <strong>${para}</strong> por ${ator} (${quando})</li>`;
    })
    .join("");
  return `<div class="pedido-historico"><details><summary>Historico de status</summary><ul>${linhas}</ul></details></div>`;
}

function marcarNovosPedidos(pedidos) {
  const ids = pedidos.map((p) => p.id).filter(Boolean);
  if (!ids.length) return;
  const maxId = Math.max(...ids);

  if (primeiroLoadPedidos) {
    ultimoPedidoId = maxId;
    primeiroLoadPedidos = false;
    return;
  }

  const novos = ids.filter((id) => id > (ultimoPedidoId || 0));
  if (novos.length) {
    tocarSomNovoPedido();
    mostrarAviso(novos.length === 1 ? `Novo pedido #${novos[0]}` : `${novos.length} novos pedidos`);
    const agora = Date.now();
    novos.forEach((id) => novosPedidos.set(id, agora));
  }

  ultimoPedidoId = Math.max(ultimoPedidoId || 0, maxId);
}

function aplicarFiltroPedidos(lista) {
  let filtrados = pedidosDoDiaAtual(lista);
  const termo = normalizarTexto(filtroBusca && filtroBusca.value);
  const status = (filtroStatus && filtroStatus.value) || "todos";

  if (status !== "todos") {
    filtrados = filtrados.filter((p) => p.status === status);
  }

  if (termo) {
    filtrados = filtrados.filter((p) => {
      const alvo = `${p.id || ""} ${p.cliente || ""} ${p.telefone || ""}`.toLowerCase();
      return alvo.includes(termo);
    });
  }

  return filtrados;
}

function aplicarFiltroEntregues(lista) {
  let filtrados = ordenarPedidosRecentes(lista);
  const termo = normalizarTexto(
    (filtroEntreguesBusca && filtroEntreguesBusca.value) || (filtroBusca && filtroBusca.value) || ""
  );
  const periodoSelecionado = String(filtroEntreguesPeriodo?.value || "hoje");
  const statusSelecionado = String(filtroEntreguesStatus?.value || "todos");
  const tipoSelecionado = String(filtroEntreguesTipo?.value || "todos");
  const pagamentoSelecionado = String(filtroEntreguesPagamento?.value || "todos");
  const entregadorSelecionado = String(filtroEntreguesEntregador?.value || "todos");
  const faixaValorSelecionada = String(filtroEntreguesValor?.value || "todos");

  const hoje = new Date();
  const hojeKey = dataKeySaoPaulo(hoje);
  const ontemKey = dataKeySaoPaulo(addDaysLocal(hoje, -1));
  const seteDiasKey = dataKeySaoPaulo(addDaysLocal(hoje, -6));
  const inicioKey = filtroEntreguesInicio?.value || "";
  const fimKey = filtroEntreguesFim?.value || "";

  filtrados = filtrados.filter((p) => {
    const key = dataKeySaoPaulo(getPedidoDate(p));
    if (periodoSelecionado === "hoje") return key === hojeKey;
    if (periodoSelecionado === "ontem") return key === ontemKey;
    if (periodoSelecionado === "7dias") return compararDataKey(key, seteDiasKey, hojeKey);
    if (periodoSelecionado === "personalizado") return compararDataKey(key, inicioKey, fimKey);
    return true;
  });

  if (termo) {
    filtrados = filtrados.filter((p) => {
      const alvo = `${p.id || ""} ${p.cliente || ""} ${p.telefone || ""} ${p.entregador || ""}`.toLowerCase();
      return alvo.includes(termo);
    });
  }

  if (statusSelecionado !== "todos") {
    filtrados = filtrados.filter((p) => normalizarTexto(p?.status) === statusSelecionado);
  }

  if (tipoSelecionado !== "todos") {
    filtrados = filtrados.filter((p) => normalizarTipoEntrega(p?.tipoEntrega) === tipoSelecionado);
  }

  if (pagamentoSelecionado !== "todos") {
    filtrados = filtrados.filter((p) => normalizarPagamentoCategoria(p) === pagamentoSelecionado);
  }

  if (entregadorSelecionado !== "todos") {
    filtrados = filtrados.filter(
      (p) => String(p?.entregador || "").trim().toLowerCase() === entregadorSelecionado.toLowerCase()
    );
  }

  if (faixaValorSelecionada !== "todos") {
    filtrados = filtrados.filter(
      (p) => normalizarFaixaValor(calcularTotalPedido(p)) === faixaValorSelecionada
    );
  }

  return filtrados;
}

function atualizarResumoEntregues(pedidosFiltrados) {
  if (!resumoEntreguesInfo) return;
  const lista = Array.isArray(pedidosFiltrados) ? pedidosFiltrados : [];
  const totalGeral = Array.isArray(entreguesCache) ? entreguesCache.length : 0;
  const totalValor = lista.reduce((sum, p) => sum + calcularTotalPedido(p), 0);
  resumoEntreguesInfo.textContent = `HistÃ³rico: mostrando ${lista.length} de ${totalGeral} | Total filtrado: R$ ${totalValor.toFixed(2)}`;
}

function atualizarResumo(pedidos) {
  const totalRecebido = pedidos.filter((p) => p.status === "recebido").length;
  const totalPreparo = pedidos.filter((p) => p.status === "preparo").length;
  const totalPronto = pedidos.filter((p) => p.status === "pronto").length;
  const totalEntrega = pedidos.filter((p) => p.status === "em_entrega").length;
  const aberto = totalRecebido + totalPreparo + totalPronto + totalEntrega;

  if (resumoAberto) resumoAberto.textContent = aberto;
  if (resumoRecebido) resumoRecebido.textContent = totalRecebido;
  if (resumoPreparo) resumoPreparo.textContent = totalPreparo;
  if (resumoEntrega) resumoEntrega.textContent = totalEntrega;
}

async function renderPedidosLista(pedidos, token = 0) {
  pedidosRecebidosDiv.innerHTML = "";
  pedidosPreparoDiv.innerHTML = "";
  pedidosProntoDiv.innerHTML = "";
  if (pedidosEntregaDiv) pedidosEntregaDiv.innerHTML = "";

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    pedidosRecebidosDiv.innerHTML = "<p>Nenhum pedido de hoje no momento. Pedidos antigos ficam no HistÃ³rico.</p>";
    return;
  }

  const historicos = await Promise.all(
    pedidos.map(async (pedido) => [pedido.id, await carregarHistoricoPedido(pedido.id)])
  );
  if (token && token !== pedidosRenderToken) return;
  const historicoPorPedido = new Map(historicos);

  pedidos.forEach((pedido) => {
    const div = document.createElement("div");
    const marcado = novosPedidos.get(pedido.id);
    const isNovo = marcado && Date.now() - marcado < TEMPO_NOVO_MS;
    const tipoEntregaTexto = String(pedido.tipoEntrega || "").toLowerCase();
    const isEntregaTipo = tipoEntregaTexto.includes("entrega");
    const isPortaTipo = tipoEntregaTexto.includes("porta");
    if (marcado && !isNovo) novosPedidos.delete(pedido.id);
    div.className = isNovo ? "pedido novo" : "pedido";

    const total = calcularTotalPedido(pedido);
    const taxaEntrega = (isEntregaTipo ? Number(pedido.taxaEntrega || 0) : 0);
    const listaItensHtml = gerarListaItensHtml(pedido.carrinho);
    const criadoEmTexto = formatarTempoDecorrido(pedido.created_at || pedido.criadoEm);
    const badgeNovo = isNovo ? "<span class=\"badge-novo\">NOVO</span>" : "";
    const badgePrioridade = isPortaTipo
      ? "<span style=\"margin-left:8px;padding:2px 8px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;\">PRIORIDADE PORTA</span>"
      : "";

    const historicoHtml = formatarHistoricoPedido(historicoPorPedido.get(pedido.id) || []);

    let html = `
      <h3>Pedido #${pedido.id} ${badgeNovo}</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente || "Nao informado"}</p>
      <p><strong>Telefone:</strong> ${pedido.telefone || "-"}</p>
      <p><strong>Endereco:</strong> ${pedido.endereco || "-"}</p>
      <p><strong>Tipo:</strong> ${pedido.tipoEntrega || "-"} ${badgePrioridade}</p>
      <p><strong>Pagamento:</strong> ${pedido.pagamento || "-"}</p>
      ${taxaEntrega > 0 ? `<p><strong>Taxa de entrega:</strong> R$ ${taxaEntrega.toFixed(2)}</p>` : ""}
      <p><strong>Recebido:</strong> ${criadoEmTexto}</p>
      ${pedido.entregador ? `<p><strong>Entregador:</strong> ${pedido.entregador}</p>` : ""}
      <ul>
        ${listaItensHtml}
      </ul>
      <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
      ${historicoHtml}
    `;

    if (pedido.status === "recebido") {
      html += `<button onclick="mudarStatus(${pedido.id}, 'preparo')">Iniciar preparo</button>`;
    } else if (pedido.status === "preparo") {
      html += `<button onclick="mudarStatus(${pedido.id}, 'pronto')">Marcar pronto</button>`;
    } else if (pedido.status === "pronto") {
      if (!isEntregaTipo) {
        html += `<button onclick="mudarStatus(${pedido.id}, 'entregue')">Pedido retirado</button>`;
      } else {
        html += `<button onclick="atribuirEntregador(${pedido.id})">Saiu para entrega</button>`;
      }
    } else if (pedido.status === "em_entrega") {
      html += `<button onclick="mudarStatus(${pedido.id}, 'entregue')">Entregue</button>`;
    } else if (pedido.status === "entregue") {
      html += "<small>Entregue</small>";
    }

    html += `<button style="background:#0f766e;color:#fff;margin-left:8px" onclick="imprimirPedido(${pedido.id})">Imprimir</button>`;
    html += `<button style="background:#334155;color:#fff;margin-left:8px" onclick="abrirEdicaoPedido(${pedido.id})">Editar</button>`;
    html += `<button style="background:#e63946;color:#fff;margin-left:8px" onclick="cancelarPedido(${pedido.id})">Cancelar</button>`;
    html += `<button style="background:#7f1d1d;color:#fff;margin-left:8px" onclick="excluirPedido(${pedido.id})">Excluir</button>`;

    div.innerHTML = html;

    if (pedido.status === "recebido") pedidosRecebidosDiv.appendChild(div);
    else if (pedido.status === "preparo") pedidosPreparoDiv.appendChild(div);
    else if (pedido.status === "pronto") pedidosProntoDiv.appendChild(div);
    else if (pedido.status === "em_entrega") pedidosEntregaDiv && pedidosEntregaDiv.appendChild(div);
    else if (pedido.status === "entregue") pedidosEntreguesDiv.appendChild(div);
  });
}

function renderEntreguesLista(entregues) {
  if (!Array.isArray(entregues) || entregues.length === 0) {
    pedidosEntreguesDiv.innerHTML = "<p>Nenhum pedido entregue ainda.</p>";
    return;
  }

  pedidosEntreguesDiv.innerHTML = "";

  entregues.forEach((pedido) => {
    const total = calcularTotalPedido(pedido);
    const taxaEntrega = String(pedido.tipoEntrega || "").toLowerCase().includes("entrega")
      ? Math.max(Number(pedido.taxaEntrega || 0), 0)
      : 0;
    const categoriaTipo = normalizarTipoEntrega(pedido.tipoEntrega);
    const categoriaPagamento = normalizarPagamentoCategoria(pedido);
    const categoriaValor = normalizarFaixaValor(total).replaceAll("_", " ");
    const entregadorNome = categoriaTipo === "entrega"
      ? (String(pedido.entregador || "").trim() || "Nao informado")
      : "Retirada no local";
    const listaItensHtml = gerarListaItensHtml(pedido.carrinho);
    const criadoEmTexto = formatarTempoDecorrido(pedido.created_at || pedido.criadoEm);
    const div = document.createElement("div");
    div.className = "pedido pedido-entregue";
    div.innerHTML = `
      <h3>Pedido #${pedido.id}</h3>
      <p><strong>Cliente:</strong> ${pedido.cliente || "Nao informado"}</p>
      <p><strong>Tipo:</strong> ${pedido.tipoEntrega || "-"}</p>
      <p><strong>Pagamento:</strong> ${pedido.pagamento || "-"}</p>
      ${taxaEntrega > 0 ? `<p><strong>Taxa de entrega:</strong> R$ ${taxaEntrega.toFixed(2)}</p>` : ""}
      <p><strong>Entregador:</strong> ${entregadorNome}</p>
      <p><strong>Categorias:</strong> tipo=${categoriaTipo} | pagamento=${categoriaPagamento} | valor=${categoriaValor}</p>
      <p><strong>Entregue em:</strong> ${pedido.entregueEm || "-"}</p>
      <p><strong>Criado:</strong> ${criadoEmTexto}</p>
      <ul>
        ${listaItensHtml}
      </ul>
      <p><strong>Total:</strong> R$ ${total.toFixed(2)}</p>
      <button style="background:#0f766e;color:#fff;margin-top:8px" onclick="imprimirPedido(${pedido.id})">Imprimir</button>
      <button style="background:#334155;color:#fff;margin-top:8px" onclick="abrirEdicaoPedido(${pedido.id})">Editar entregue</button>
      <button style="background:#7f1d1d;color:#fff;margin-top:8px" onclick="excluirPedidoEntregue(${pedido.id})">Excluir entregue</button>
    `;
    pedidosEntreguesDiv.appendChild(div);
  });
}

function renderPedidosFiltrados() {
  const filtrados = aplicarFiltroPedidos(pedidosCache);
  atualizarResumo(filtrados);
  const token = ++pedidosRenderToken;
  renderPedidosLista(filtrados, token).catch((err) => {
    console.error("Erro ao renderizar pedidos:", err);
  });
}

function renderEntreguesFiltrados() {
  const filtrados = aplicarFiltroEntregues(entreguesCache);
  atualizarResumoEntregues(filtrados);
  renderEntreguesLista(filtrados);
}

function calcularTotalAdicionais(item) {
  if (!Array.isArray(item?.adicionais)) return 0;
  return item.adicionais.reduce((sum, add) => {
    if (!add || typeof add === "string") return sum;
    const preco = Math.max(parseFloat(add.preco) || 0, 0);
    const qtd = Math.max(parseInt(add.qtd, 10) || 0, 0);
    const multiplicador = String(add?.escopo || "").toLowerCase() === "total"
      ? 1
      : Math.max(parseInt(item?.qtd, 10) || 1, 1);
    return sum + preco * qtd * multiplicador;
  }, 0);
}

function calcularTotalPedido(pedido) {
  if (!Array.isArray(pedido?.carrinho)) return 0;
  const subtotal = pedido.carrinho.reduce((sum, item) => {
    const preco = Math.max(parseFloat(item?.preco) || 0, 0);
    const qtd = Math.max(parseInt(item?.qtd, 10) || 0, 0) || 1;
    const adicionaisTotal = (Array.isArray(item?.adicionais) ? item.adicionais : []).reduce((total, add) => {
      if (!add || typeof add === "string") return total;
      const multiplicador = String(add?.escopo || "").toLowerCase() === "total" ? 1 : qtd;
      return total + Math.max(parseFloat(add.preco) || 0, 0)
        * Math.max(parseInt(add.qtd, 10) || 0, 0) * multiplicador;
    }, 0);
    return sum + (preco * qtd) + adicionaisTotal;
  }, 0);
  const taxaEntrega = String(pedido?.tipoEntrega || "").toLowerCase().includes("entrega")
    ? Math.max(Number(pedido?.taxaEntrega) || 0, 0)
    : 0;
  return subtotal + taxaEntrega;
}

function formatarAdicionais(item) {
  if (!Array.isArray(item?.adicionais) || item.adicionais.length === 0) return "";
  return item.adicionais
    .map((add) => {
      if (!add) return "";
      if (typeof add === "string") return add;
      const nome = add.nome || "Adicional";
      const qtd = add.qtd || 1;
      return `${nome} x${qtd}`;
    })
    .filter(Boolean)
    .join(", ");
}

function formatarRemovidos(item) {
  if (!Array.isArray(item?.removidos) || item.removidos.length === 0) return "";
  return item.removidos.join(", ");
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

function formatarAlteracoesItem(item) {
  const removidos = Array.isArray(item?.removidos)
    ? Array.from(new Set(item.removidos.map((nome) => String(nome || "").trim()).filter(Boolean)))
    : [];
  const adicionais = Array.isArray(item?.adicionais) ? item.adicionais.filter((add) => add?.nome) : [];
  const removidosKeys = new Set(removidos.map(chaveRemocaoItem));
  const adicionaisKeys = new Set(adicionais.map((add) => normalizarAlteracaoItemTexto(add.nome)));
  const obsLivre = dividirObsItem(item?.obs || item?.observacao || "").filter((parte) => {
    if (removidosKeys.has(chaveRemocaoItem(parte))) return false;
    if (adicionaisKeys.has(chaveAdicionalItem(parte))) return false;
    return true;
  }).join("; ");
  const removidosFormatados = removidos.map((nome) => {
    const texto = String(nome || "").trim().replace(/[\u2013\u2014-]/g, " ").replace(/\s+/g, " ");
    return texto ? `Sem ${texto.charAt(0).toLowerCase()}${texto.slice(1)}` : "";
  }).filter(Boolean);
  const adicionaisFormatados = adicionais.map((add) => {
    const qtd = Math.max(parseInt(add.qtd, 10) || 1, 1);
    return `Adicional: ${add.nome}${qtd > 1 ? ` x${qtd}` : ""}`;
  });
  return {
    removidos: removidosFormatados,
    adicionais: adicionaisFormatados,
    obs: obsLivre,
    linhas: [...removidosFormatados, ...adicionaisFormatados, ...(obsLivre ? [`Obs: ${obsLivre}`] : [])],
  };
}

function gerarListaItensHtml(carrinho) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) {
    return "<li>Itens nao informados</li>";
  }
  return carrinho
    .map((item) => {
      const nome = item?.nome || "Item";
      const preco = Math.max(parseFloat(item?.preco) || 0, 0);
      const qtd = Math.max(parseInt(item?.qtd, 10) || 0, 0) || 1;
      const extras = formatarAlteracoesItem(item).linhas;
      const extrasHtml = extras.length ? `<div class="pedido-extra">${extras.map(escapeHtml).join(" | ")}</div>` : "";
      const subtotal = (preco * qtd) + calcularTotalAdicionais(item);
      return `<li>${qtd}x ${nome} - R$ ${subtotal.toFixed(2)}${extrasHtml}</li>`;
    })
    .join("");
}

function carrinhoParaLinhasTexto(carrinho) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) return "";
  return carrinho
    .map((item) => {
      const nome = String(item?.nome || "").trim();
      const qtd = Math.max(parseInt(item?.qtd, 10) || 1, 1);
      const preco = Math.max(parseFloat(item?.preco) || 0, 0);
      const obs = String(item?.obs || "").trim();
      return `${nome}|${qtd}|${preco.toFixed(2)}${obs ? `|${obs}` : ""}`;
    })
    .join("\n");
}

function linhasTextoParaCarrinho(texto) {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const itens = [];
  linhas.forEach((linha) => {
    const partes = linha.split("|").map((p) => p.trim());
    if (!partes[0]) return;
    const nome = partes[0];
    const qtd = Math.max(parseInt((partes[1] || "1").replace(",", "."), 10) || 1, 1);
    const preco = Math.max(parseFloat((partes[2] || "0").replace(",", ".")) || 0, 0);
    const obs = String(partes.slice(3).join(" | ") || "").trim();
    itens.push({
      nome,
      qtd,
      preco,
      adicionais: [],
      removidos: [],
      obs,
    });
  });

  return itens;
}

function normalizarTextoBusca(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarItemBuilder(item = {}) {
  const adicionais = Array.isArray(item.adicionais)
    ? item.adicionais
        .map((add) => {
          if (!add) return null;
          if (typeof add === "string") {
            const nome = String(add || "").trim();
            if (!nome) return null;
            return { nome, preco: 0, qtd: 1 };
          }
          const nome = String(add.nome || "").trim();
          if (!nome) return null;
          return {
            nome,
            preco: Math.max(parseFloat(add.preco) || 0, 0),
            qtd: Math.max(parseInt(add.qtd, 10) || 1, 1),
          };
        })
        .filter(Boolean)
    : [];

  return {
    nome: String(item.nome || "").trim(),
    qtd: Math.max(parseInt(item.qtd, 10) || 1, 1),
    preco: Math.max(parseFloat(item.preco) || 0, 0),
    obs: String(item.obs || "").trim(),
    adicionais,
    removidos: Array.isArray(item.removidos) ? item.removidos : [],
  };
}

function serializarPedidoItensBuilder() {
  return (Array.isArray(pedidoItensBuilder) ? pedidoItensBuilder : [])
    .map(normalizarItemBuilder)
    .filter((item) => item.nome);
}

function parseValorSplitPedido(valor) {
  const n = Number(String(valor ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function pedidoSplitAtivo() {
  return Boolean(pedidoPagamentoDivididoInput?.checked);
}

function getTotalPedidoModal() {
  const subtotal = serializarPedidoItensBuilder().reduce((sum, item) => {
    const base = Number(item.preco || 0) * Number(item.qtd || 1);
    const adds = Array.isArray(item.adicionais)
      ? item.adicionais.reduce((a, b) => {
          const multiplicador = String(b?.escopo || "").toLowerCase() === "total" ? 1 : Number(item.qtd || 1);
          return a + (Number(b.preco || 0) * Number(b.qtd || 1) * multiplicador);
        }, 0)
      : 0;
    return sum + base + adds;
  }, 0);
  const taxa = String(pedidoTipoEntregaInput?.value || "").toLowerCase().includes("entrega")
    ? Math.max(Number(pedidoTaxaEntregaInput?.value || 0), 0)
    : 0;
  return Math.max(0, subtotal + taxa);
}

function coletarPagamentosDivididosPedido() {
  if (!pedidoPagamentosDivididosLista) return [];
  return Array.from(pedidoPagamentosDivididosLista.querySelectorAll(".pedido-split-row"))
    .map((row) => ({
      metodo: String(row.querySelector(".pedido-split-metodo")?.value || "").trim(),
      valor: parseValorSplitPedido(row.querySelector(".pedido-split-valor")?.value || ""),
    }))
    .filter((x) => x.metodo && x.valor > 0);
}

function atualizarResumoPagamentoDivididoPedido() {
  if (!pedidoPagamentoDivididoResumo) return;
  if (!pedidoSplitAtivo()) {
    pedidoPagamentoDivididoResumo.textContent = "";
    return;
  }
  const total = getTotalPedidoModal();
  const soma = coletarPagamentosDivididosPedido().reduce((acc, x) => acc + x.valor, 0);
  const dif = total - soma;
  if (Math.abs(dif) < 0.01) {
    pedidoPagamentoDivididoResumo.textContent = `Valores conferem. Total R$ ${total.toFixed(2)}.`;
    return;
  }
  if (dif > 0) {
    pedidoPagamentoDivididoResumo.textContent = `Falta R$ ${dif.toFixed(2)} para fechar o total.`;
    return;
  }
  pedidoPagamentoDivididoResumo.textContent = `Passou R$ ${Math.abs(dif).toFixed(2)} do total.`;
}

function atualizarUIFormaPagamentoPedido() {
  if (pedidoPagamentoDivididoBox) {
    pedidoPagamentoDivididoBox.style.display = pedidoSplitAtivo() ? "block" : "none";
  }
}

function adicionarLinhaPagamentoDivididoPedido(metodo = "", valor = "") {
  if (!pedidoPagamentosDivididosLista) return;
  const row = document.createElement("div");
  row.className = "pedido-split-row";
  row.innerHTML = `
    <select class="pedido-split-metodo">
      <option value="">Forma</option>
      <option value="pix">Pix</option>
      <option value="dinheiro">Dinheiro</option>
      <option value="cartao">Cartao</option>
    </select>
    <input type="text" class="pedido-split-valor" placeholder="Valor (R$)">
    <button type="button" class="pedido-split-remove">x</button>
  `;
  pedidoPagamentosDivididosLista.appendChild(row);
  const metodoEl = row.querySelector(".pedido-split-metodo");
  const valorEl = row.querySelector(".pedido-split-valor");
  if (metodo && metodoEl) metodoEl.value = String(metodo).toLowerCase();
  if (valor !== "" && valorEl) valorEl.value = String(valor);
  row.addEventListener("input", atualizarResumoPagamentoDivididoPedido);
  row.querySelector(".pedido-split-remove")?.addEventListener("click", () => {
    row.remove();
    atualizarResumoPagamentoDivididoPedido();
  });
}

function renderPagamentosDivididosPedido(lista = []) {
  if (!pedidoPagamentosDivididosLista) return;
  pedidoPagamentosDivididosLista.innerHTML = "";
  const arr = Array.isArray(lista) ? lista : [];
  if (!arr.length) {
    adicionarLinhaPagamentoDivididoPedido();
    adicionarLinhaPagamentoDivididoPedido();
  } else {
    arr.forEach((item) => adicionarLinhaPagamentoDivididoPedido(item.metodo, item.valor));
  }
  atualizarResumoPagamentoDivididoPedido();
}

async function carregarCatalogosPedido() {
  async function fetchArrayPossiveisRotas(rotas = []) {
    for (const rota of rotas) {
      try {
        const res = await authFetch(rota);
        if (!res.ok) continue;
        const texto = await res.text();
        if (!texto) continue;
        let dados;
        try {
          dados = JSON.parse(texto);
        } catch (errJson) {
          continue;
        }
        if (Array.isArray(dados)) return dados;
        if (Array.isArray(dados?.itens)) return dados.itens;
        if (Array.isArray(dados?.data)) return dados.data;
      } catch (err) {
        // tenta a proxima rota
      }
    }
    return [];
  }

  try {
    if (!cardapioPedidoCache.length) {
      cardapioPedidoCache = await fetchArrayPossiveisRotas([
        "/adminn/cardapio-completo",
        "/adminn/cardapio",
        "/cardapio",
      ]);
    }
    if (!adicionaisPedidoCache.length) {
      adicionaisPedidoCache = await fetchArrayPossiveisRotas(["/adminn/adicionais", "/adicionais"]);
    }
  } catch (err) {
    console.error("Erro ao carregar catalogos do modal de pedido:", err);
  }
}

function renderResultadosBuscaPedido() {
  if (!pedidoItemResultados) return;
  const termo = normalizarTextoBusca(pedidoItemBuscaInput?.value);
  const fonte = Array.isArray(cardapioPedidoCache) ? cardapioPedidoCache : [];
  if (!fonte.length) {
    pedidoItemResultados.innerHTML = `<p class="pedido-item-vazio">Cardapio indisponivel agora. Recarregue a pagina.</p>`;
    return;
  }
  const filtrados = fonte
    .filter((item) => {
      if (item?.disponivel === false) return false;
      if (!termo) return true;
      const nome = normalizarTextoBusca(item?.nome);
      const categoria = normalizarTextoBusca(item?.categoria);
      return nome.includes(termo) || categoria.includes(termo);
    })
    .slice(0, 25);

  if (!filtrados.length) {
    pedidoItemResultados.innerHTML = `<p class="pedido-item-vazio">Nenhum item encontrado.</p>`;
    return;
  }

  pedidoItemResultados.innerHTML = filtrados
    .map(
      (item, idx) => `
        <div class="pedido-item-result">
          <div>
            <strong>${escapeHtml(item.nome || "Item")}</strong>
            <div style="color:#64748b;font-size:12px;">${escapeHtml(item.categoria || "-")} • R$ ${Number(item.preco || 0).toFixed(2)}</div>
          </div>
          <button class="btn primary" type="button" data-action="add-cardapio-item" data-cardapio-index="${idx}">Adicionar</button>
        </div>
      `
    )
    .join("");
  pedidoItemResultados.dataset.currentIds = JSON.stringify(
    filtrados.map((item) => item?.id ?? item?.order_index ?? item?.nome ?? null)
  );
}

function abrirModalPedidoItem(item) {
  if (!item || !modalPedidoItem) return;
  pedidoItemModalSelecionado = item;
  if (pedidoItemModalNome) pedidoItemModalNome.textContent = String(item.nome || "Item");
  if (pedidoItemModalQtd) pedidoItemModalQtd.value = "1";
  if (pedidoItemModalPreco) pedidoItemModalPreco.value = Number(item.preco || 0).toFixed(2);
  if (pedidoItemModalObs) pedidoItemModalObs.value = "";
  modalPedidoItem.style.display = "flex";
}

function fecharModalPedidoItem() {
  pedidoItemModalSelecionado = null;
  if (modalPedidoItem) modalPedidoItem.style.display = "none";
}

function obterIngredientesDoItemCatalogo(item) {
  if (!item) return [];
  const categoria = String(item.categoria || "").toLowerCase().trim();
  const base = Array.isArray(categoriasIngredientes?.[categoria]) ? categoriasIngredientes[categoria] : [];
  if (base.length) return base.map((x) => String(x).trim()).filter(Boolean);
  if (Array.isArray(item.ingredientes)) return item.ingredientes.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

function resetCatalogoDraft() {
  pedidoCatalogoSelecionado = null;
  pedidoCatalogoEditandoIndex = -1;
  pedidoCatalogoDraft = null;
}

function abrirModalPedidoCatalogo() {
  if (!modalPedidoCatalogo) return;
  resetCatalogoDraft();
  if (pedidoCatalogoBuscaInput) pedidoCatalogoBuscaInput.value = "";
  renderListaCatalogoPedido();
  renderEditorCatalogoPedido();
  modalPedidoCatalogo.style.display = "flex";
}

function fecharModalPedidoCatalogo() {
  resetCatalogoDraft();
  if (modalPedidoCatalogo) modalPedidoCatalogo.style.display = "none";
}

function renderListaCatalogoPedido() {
  if (!pedidoCatalogoListaEl) return;
  const termo = normalizarTextoBusca(pedidoCatalogoBuscaInput?.value || "");
  const fonte = Array.isArray(cardapioPedidoCache) ? cardapioPedidoCache : [];
  const itens = fonte
    .filter((item) => item?.disponivel !== false)
    .filter((item) => {
      if (!termo) return true;
      return normalizarTextoBusca(item?.nome).includes(termo) || normalizarTextoBusca(item?.categoria).includes(termo);
    })
    .slice(0, 120);

  if (!itens.length) {
    pedidoCatalogoListaEl.innerHTML = `<p class="pedido-item-vazio">Nenhum item encontrado.</p>`;
    return;
  }

  pedidoCatalogoListaEl.innerHTML = itens
    .map((item, idx) => {
      const active = pedidoCatalogoSelecionado && String(pedidoCatalogoSelecionado.nome) === String(item.nome);
      return `
        <div class="pedido-catalogo-item ${active ? "active" : ""}" data-catalogo-idx="${idx}">
          <strong>${escapeHtml(item.nome || "Item")}</strong>
          <div style="font-size:12px;color:#64748b;">${escapeHtml(item.categoria || "-")} • R$ ${Number(item.preco || 0).toFixed(2)}</div>
        </div>
      `;
    })
    .join("");
  pedidoCatalogoListaEl.dataset.ids = JSON.stringify(itens.map((item) => item?.id ?? item?.nome ?? null));
}

function renderAdicionaisCatalogoPedido() {
  if (!pedidoCatalogoAdicionaisEl) return;
  const lista = Array.isArray(pedidoCatalogoDraft?.adicionais) ? pedidoCatalogoDraft.adicionais : [];
  if (!lista.length) {
    pedidoCatalogoAdicionaisEl.innerHTML = `<p class="pedido-item-vazio">Sem adicionais.</p>`;
    return;
  }
  pedidoCatalogoAdicionaisEl.innerHTML = lista
    .map(
      (add, idx) => `
        <div class="pedido-item-adicional" data-catalogo-add-idx="${idx}">
          <span>${escapeHtml(add.nome || "Adicional")}</span>
          <input type="number" min="1" value="${Math.max(parseInt(add.qtd, 10) || 1, 1)}" data-catalogo-add-field="qtd" data-catalogo-add-idx="${idx}">
          <input type="number" min="0" step="0.01" value="${Number(add.preco || 0).toFixed(2)}" data-catalogo-add-field="preco" data-catalogo-add-idx="${idx}">
          <button type="button" class="btn danger small" data-action="catalogo-remove-adicional" data-catalogo-add-idx="${idx}">x</button>
        </div>
      `
    )
    .join("");
}

function renderRemovidosCatalogoPedido() {
  if (!pedidoCatalogoRemovidosEl) return;
  const ingredientes = obterIngredientesDoItemCatalogo(pedidoCatalogoSelecionado);
  if (!ingredientes.length) {
    pedidoCatalogoRemovidosEl.innerHTML = `<p class="pedido-item-vazio">Sem ingredientes base mapeados para este item.</p>`;
    return;
  }
  const removidosSet = new Set((pedidoCatalogoDraft?.removidos || []).map((x) => String(x).trim().toLowerCase()));
  pedidoCatalogoRemovidosEl.innerHTML = ingredientes
    .map((nome) => {
      const checked = removidosSet.has(String(nome).trim().toLowerCase()) ? "checked" : "";
      return `
        <label class="pedido-removidos-item">
          <input type="checkbox" value="${escapeHtml(nome)}" data-catalogo-removido ${checked}>
          ${escapeHtml(nome)}
        </label>
      `;
    })
    .join("");
}

function renderEditorCatalogoPedido() {
  const tem = Boolean(pedidoCatalogoSelecionado && pedidoCatalogoDraft);
  if (pedidoCatalogoVazioEl) pedidoCatalogoVazioEl.style.display = tem ? "none" : "block";
  if (pedidoCatalogoFormEl) pedidoCatalogoFormEl.style.display = tem ? "block" : "none";
  if (!tem) return;

  if (pedidoCatalogoNomeEl) pedidoCatalogoNomeEl.textContent = String(pedidoCatalogoDraft.nome || "Item");
  if (pedidoCatalogoQtdInput) pedidoCatalogoQtdInput.value = String(Math.max(parseInt(pedidoCatalogoDraft.qtd, 10) || 1, 1));
  if (pedidoCatalogoPrecoInput) pedidoCatalogoPrecoInput.value = Number(pedidoCatalogoDraft.preco || 0).toFixed(2);
  if (pedidoCatalogoObsInput) pedidoCatalogoObsInput.value = String(pedidoCatalogoDraft.obs || "");

  if (pedidoCatalogoSelectAdicional) {
    const options = (Array.isArray(adicionaisPedidoCache) ? adicionaisPedidoCache : [])
      .map((ad) => `<option value="${escapeHtml(ad.nome || "")}">${escapeHtml(ad.nome || "")} (R$ ${Number(ad.preco || 0).toFixed(2)})</option>`)
      .join("");
    pedidoCatalogoSelectAdicional.innerHTML = `<option value="">Selecionar adicional...</option>${options}`;
  }

  if (pedidoCatalogoSalvarBtn) {
    pedidoCatalogoSalvarBtn.textContent = pedidoCatalogoEditandoIndex >= 0 ? "Salvar alteracoes no item" : "Adicionar ao pedido";
  }

  renderRemovidosCatalogoPedido();
  renderAdicionaisCatalogoPedido();
}

function selecionarItemCatalogoPedido(item) {
  if (!item) return;
  pedidoCatalogoSelecionado = item;
  pedidoCatalogoEditandoIndex = -1;
  pedidoCatalogoDraft = normalizarItemBuilder({
    nome: item.nome || "Item",
    qtd: 1,
    preco: Number(item.preco || 0),
    obs: "",
    adicionais: [],
    removidos: [],
  });
  renderListaCatalogoPedido();
  renderEditorCatalogoPedido();
}

function abrirEditorItemExistente(idx) {
  const item = pedidoItensBuilder[idx];
  if (!item) return;
  const baseCatalogo = (Array.isArray(cardapioPedidoCache) ? cardapioPedidoCache : []).find((x) => String(x.nome || "").trim().toLowerCase() === String(item.nome || "").trim().toLowerCase()) || {
    nome: item.nome,
    preco: item.preco,
    categoria: "",
    ingredientes: [],
  };
  pedidoCatalogoSelecionado = baseCatalogo;
  pedidoCatalogoEditandoIndex = idx;
  pedidoCatalogoDraft = normalizarItemBuilder(item);
  renderListaCatalogoPedido();
  renderEditorCatalogoPedido();
  if (modalPedidoCatalogo) modalPedidoCatalogo.style.display = "flex";
}

function adicionarItemBuilderDoCardapio(item, overrides = {}) {
  if (!item) return;
  const precoBase = overrides.preco ?? item.preco ?? 0;
  pedidoItensBuilder.push(
    normalizarItemBuilder({
      nome: item.nome || "Item",
      qtd: Math.max(parseInt(overrides.qtd, 10) || 1, 1),
      preco: Math.max(Number(precoBase) || 0, 0),
      obs: String(overrides.obs || "").trim(),
      adicionais: [],
      removidos: [],
    })
  );
  renderPedidoItensBuilder();
}

function renderPedidoItensBuilder() {
  if (!pedidoItensBuilderEl) return;
  if (!Array.isArray(pedidoItensBuilder) || !pedidoItensBuilder.length) {
    pedidoItensBuilderEl.innerHTML = `<p class="pedido-item-vazio">Nenhum item adicionado.</p>`;
    if (pedidoItensLinhasInput) pedidoItensLinhasInput.value = "";
    return;
  }

  pedidoItensBuilderEl.innerHTML = pedidoItensBuilder
    .map((item, idx) => {
      const qtd = Math.max(parseInt(item.qtd, 10) || 1, 1);
      const preco = Math.max(parseFloat(item.preco) || 0, 0);
      const removidos = Array.isArray(item.removidos) ? item.removidos : [];
      const adicionais = Array.isArray(item.adicionais) ? item.adicionais : [];
      const alteracoes = formatarAlteracoesItem(item);
      const subtotalItem = (preco * qtd) + adicionais.reduce((acc, add) => {
        const addPreco = Math.max(parseFloat(add.preco) || 0, 0);
        const addQtd = Math.max(parseInt(add.qtd, 10) || 1, 1);
        const multiplicador = String(add?.escopo || "").toLowerCase() === "total" ? 1 : qtd;
        return acc + (addPreco * addQtd * multiplicador);
      }, 0);

      return `
        <div class="pedido-item-card" data-index="${idx}">
          <div class="pedido-item-top">
            <strong>${escapeHtml(item.nome || "Item")}</strong>
            <div style="display:flex;gap:6px;">
              <button type="button" class="btn outline small" data-action="open-editor-item">Editar item</button>
              <button type="button" class="btn danger small" data-action="remove-item">Remover</button>
            </div>
          </div>
          <div class="pedido-item-vazio">Qtd: ${qtd} • Unitário: R$ ${preco.toFixed(2)} • Subtotal: R$ ${subtotalItem.toFixed(2)}</div>
          ${alteracoes.linhas.length
            ? alteracoes.linhas.map((linha) => `<div class="pedido-item-vazio">${escapeHtml(linha)}</div>`).join("")
            : `<div class="pedido-item-vazio">Sem alteracoes</div>`
          }
          <div class="pedido-item-vazio" style="font-size:12px;opacity:.8;">
            Clique em <strong>Editar item</strong> para alterar quantidade, adicionais, removidos e observação.
          </div>
        </div>
      `;
    })
    .join("");

  if (pedidoItensLinhasInput) {
    pedidoItensLinhasInput.value = carrinhoParaLinhasTexto(serializarPedidoItensBuilder());
  }
  atualizarResumoPagamentoDivididoPedido();
}

function fecharModalPedidoUI() {
  fecharModalPedidoItem();
  fecharModalPedidoCatalogo();
  if (modalPedido) modalPedido.style.display = "none";
}

async function abrirModalPedido(pedido = null) {
  if (!modalPedido) return;
  await carregarCatalogosPedido();

  const editando = Boolean(pedido && pedido.id);
  if (pedidoModalTitulo) {
    pedidoModalTitulo.textContent = editando ? `Editar pedido #${pedido.id}` : "Novo pedido manual";
  }

  if (pedidoEditIdInput) pedidoEditIdInput.value = editando ? String(pedido.id) : "";
  if (pedidoClienteInput) pedidoClienteInput.value = editando ? (pedido.cliente || "") : "";
  if (pedidoTelefoneInput) pedidoTelefoneInput.value = editando ? (pedido.telefone || "") : "";
  if (pedidoEnderecoInput) pedidoEnderecoInput.value = editando ? (pedido.endereco || "") : "";
  if (pedidoTipoEntregaInput) {
    pedidoTipoEntregaInput.value = editando
      ? normalizarTipoEntregaFormulario(pedido.tipoEntrega, pedido.origemPedido)
      : "entrega";
  }
  const pagamentosDetalhes = editando && Array.isArray(pedido?.pagamentosDetalhes) ? pedido.pagamentosDetalhes : [];
  const pagamentoTexto = String(editando ? (pedido.pagamento || "pix") : "pix").toLowerCase();
  const pagamentoBase = pagamentoTexto.includes("dinheiro")
    ? "dinheiro"
    : pagamentoTexto.includes("cartao")
      ? "cartao"
      : "pix";
  if (pedidoPagamentoInput) pedidoPagamentoInput.value = pagamentoBase;
  if (pedidoPagamentoDivididoInput) {
    pedidoPagamentoDivididoInput.checked = pagamentosDetalhes.length > 1 || pagamentoTexto.includes("dividido");
  }
  atualizarUIFormaPagamentoPedido();
  renderPagamentosDivididosPedido(pagamentosDetalhes);
  if (pedidoStatusInput) pedidoStatusInput.value = editando ? (pedido.status || "recebido") : "recebido";
  if (pedidoTaxaEntregaInput) {
    const taxa = editando ? Number(pedido.taxaEntrega || 0) : 0;
    pedidoTaxaEntregaInput.value = Number.isFinite(taxa) ? taxa.toFixed(2) : "0.00";
  }
  if (pedidoEntregadorInput) pedidoEntregadorInput.value = editando ? (pedido.entregador || "") : "";
  if (pedidoOrigemInput) {
    const origem = editando ? (pedido.origemPedido || "") : "outro";
    pedidoOrigemInput.value = origem || "outro";
  }
  if (pedidoObsInput) pedidoObsInput.value = editando ? (pedido.obsGeral || "") : "";

  pedidoItensBuilder = editando && Array.isArray(pedido?.carrinho)
    ? pedido.carrinho.map((item) => normalizarItemBuilder(item))
    : [];

  if (pedidoItensLinhasInput) {
    pedidoItensLinhasInput.value = editando ? carrinhoParaLinhasTexto(pedido.carrinho) : "";
  }
  if (pedidoItemBuscaInput) pedidoItemBuscaInput.value = "";
  renderResultadosBuscaPedido();
  renderPedidoItensBuilder();

  modalPedido.style.display = "flex";
}

function abrirEdicaoPedido(id) {
  const pedido = [...pedidosCache, ...entreguesCache].find((p) => Number(p.id) === Number(id));
  if (!pedido) {
    mostrarAviso("Pedido nao encontrado.");
    return;
  }
  abrirModalPedido(pedido).catch((err) => {
    console.error("Erro ao abrir edicao de pedido:", err);
    mostrarAviso("Erro ao abrir pedido para edicao.");
  });
}

async function salvarPedidoManual() {
  try {
    const pedidoId = Number(pedidoEditIdInput?.value || 0);
    const tipoEntrega = normalizarTipoEntregaFormulario(
      String(pedidoTipoEntregaInput?.value || "entrega").trim(),
      String(pedidoOrigemInput?.value || "").trim()
    );
    const pagamento = String(pedidoPagamentoInput?.value || "pix").trim();
    const status = String(pedidoStatusInput?.value || "recebido").trim();
    const taxaEntrega = Math.max(Number(pedidoTaxaEntregaInput?.value || 0), 0);
    const ehEntrega = tipoEntrega === "entrega";
    const entregadorNome = String(pedidoEntregadorInput?.value || "").trim();
    if ((status === "em_entrega" || status === "entregue") && ehEntrega && !entregadorNome) {
      mostrarAviso("Selecione o entregador para pedidos de entrega.");
      return;
    }
    const carrinhoBuilder = serializarPedidoItensBuilder();
    const carrinho = carrinhoBuilder.length
      ? carrinhoBuilder
      : linhasTextoParaCarrinho(pedidoItensLinhasInput?.value || "");
    if (!carrinho.length) {
      mostrarAviso("Informe pelo menos 1 item no pedido.");
      return;
    }
    const pagamentosDetalhes = pedidoSplitAtivo() ? coletarPagamentosDivididosPedido() : [];
    if (pedidoSplitAtivo()) {
      if (pagamentosDetalhes.length < 2) {
        mostrarAviso("Pagamento dividido precisa de pelo menos 2 formas.");
        return;
      }
      const totalPedido = getTotalPedidoModal();
      const somaPagamentos = pagamentosDetalhes.reduce((acc, x) => acc + Number(x.valor || 0), 0);
      if (Math.abs(totalPedido - somaPagamentos) > 0.05) {
        mostrarAviso("A soma do pagamento dividido precisa bater com o total do pedido.");
        return;
      }
    }

    let origemEscolhida = String(
      pedidoOrigemInput?.value || (tipoEntrega.toLowerCase().includes("porta") ? "porta" : "outro")
    ).trim();
    if (tipoEntrega === "cliente na porta") origemEscolhida = "porta";

    const payload = {
      cliente: String(pedidoClienteInput?.value || "").trim(),
      telefone: String(pedidoTelefoneInput?.value || "").trim(),
      endereco: String(pedidoEnderecoInput?.value || "").trim(),
      tipoEntrega,
      pagamento: pedidoSplitAtivo() ? "dividido" : pagamento,
      pagamentosDetalhes,
      status,
      taxaEntrega: ehEntrega ? taxaEntrega : 0,
      entregador: ehEntrega ? entregadorNome : "",
      origemPedido: origemEscolhida,
      obsGeral: String(pedidoObsInput?.value || "").trim(),
      carrinho,
    };

    const url = pedidoId ? `/pedidos/${pedidoId}` : "/pedidos/manual";
    const method = pedidoId ? "PUT" : "POST";

    const res = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarAviso("Nao foi possivel salvar o pedido.");
      return;
    }

    mostrarAviso(pedidoId ? "Pedido atualizado." : `Pedido #${data.pedidoId} criado.`);
    fecharModalPedidoUI();
    await carregarPedidos();
    if (painelEntregues && painelEntregues.style.display !== "none") {
      await carregarPedidosEntregues();
    }
  } catch (err) {
    console.error("Erro ao salvar pedido manual:", err);
    mostrarAviso("Erro ao salvar pedido.");
  }
}

// ===================== TROCA DE ABAS =====================
function mostrarPainel(painelAtivo, atualizarHash = true) {
  // Esconde todos
  painelPedidos.style.display = "none";
  painelCardapio.style.display = "none";
  painelEntregues.style.display = "none";

  // Mostra o escolhido
  painelAtivo.style.display = "block";

  // Atualiza botoes ativos
  [btnPedidos, btnCardapio, btnPedidosEntregues].forEach((btn) => {
    if (btn) btn.classList.remove("ativo");
  });
  if (painelAtivo === painelPedidos && btnPedidos) btnPedidos.classList.add("ativo");
  if (painelAtivo === painelCardapio && btnCardapio) btnCardapio.classList.add("ativo");
  if (painelAtivo === painelEntregues && btnPedidosEntregues) btnPedidosEntregues.classList.add("ativo");

  if (atualizarHash) {
    if (painelAtivo === painelCardapio) {
      window.location.hash = "cardapio";
    } else if (painelAtivo === painelEntregues) {
      window.location.hash = "entregues";
    } else {
      window.location.hash = "pedidos";
    }
  }

  // Garante que o painel se atualiza no momento certo
  if (painelAtivo === painelPedidos) carregarPedidos();
  else if (painelAtivo === painelCardapio) carregarCardapio();
  else if (painelAtivo === painelEntregues) carregarPedidosEntregues();
}

function abrirPainelPorHash() {
  const hash = String(window.location.hash || "").replace("#", "").toLowerCase();
  if (hash === "cardapio") {
    mostrarPainel(painelCardapio, false);
    return;
  }
  if (hash === "entregues") {
    mostrarPainel(painelEntregues, false);
    return;
  }
  mostrarPainel(painelPedidos, false);
}

btnPedidos.addEventListener("click", () => mostrarPainel(painelPedidos));
btnCardapio.addEventListener("click", () => mostrarPainel(painelCardapio));
btnPedidosEntregues.addEventListener("click", () => mostrarPainel(painelEntregues));
window.addEventListener("hashchange", abrirPainelPorHash);

// ===================== MODAL CARDÁPIO =====================
btnAdicionarLanche.onclick = () => {
  modal.style.display = "flex";
  editIndex = null;
  editImgAtual = "";
  salvarLancheBtn.innerText = "Salvar";
  novoNome.value = "";
  novoPreco.value = "";
  novaCategoria.value = "";
  novosIngredientes.innerHTML = "";
  novaImg.value = "";
  carregarIngredientesModal();
};
if (fecharModal) fecharModal.onclick = () => (modal.style.display = "none");
if (btnNovoPedidoManual) {
  btnNovoPedidoManual.onclick = () => {
    abrirModalPedido(null).catch((err) => {
      console.error("Erro ao abrir modal de novo pedido:", err);
      mostrarAviso("Erro ao abrir modal de pedido.");
    });
  };
}
if (fecharModalPedido) fecharModalPedido.onclick = fecharModalPedidoUI;
if (fecharModalPedidoTopo) fecharModalPedidoTopo.onclick = fecharModalPedidoUI;
if (salvarPedidoManualBtn) salvarPedidoManualBtn.onclick = salvarPedidoManual;
if (pedidoPagamentoDivididoInput) {
  pedidoPagamentoDivididoInput.addEventListener("change", () => {
    if (pedidoSplitAtivo() && pedidoPagamentosDivididosLista && !pedidoPagamentosDivididosLista.children.length) {
      renderPagamentosDivididosPedido();
    }
    atualizarUIFormaPagamentoPedido();
    atualizarResumoPagamentoDivididoPedido();
  });
}
if (pedidoAddPagamentoDivididoBtn) {
  pedidoAddPagamentoDivididoBtn.addEventListener("click", () => {
    adicionarLinhaPagamentoDivididoPedido();
    atualizarResumoPagamentoDivididoPedido();
  });
}
if (pedidoTipoEntregaInput) pedidoTipoEntregaInput.addEventListener("change", atualizarResumoPagamentoDivididoPedido);
if (pedidoTaxaEntregaInput) pedidoTaxaEntregaInput.addEventListener("input", atualizarResumoPagamentoDivididoPedido);

if (pedidoAbrirCatalogoBtn) {
  pedidoAbrirCatalogoBtn.addEventListener("click", () => {
    abrirModalPedidoCatalogo();
  });
}
if (pedidoGerenciarItensBtn) {
  pedidoGerenciarItensBtn.addEventListener("click", () => {
    abrirModalPedidoCatalogo();
  });
}
if (pedidoCatalogoFecharBtn) {
  pedidoCatalogoFecharBtn.addEventListener("click", fecharModalPedidoCatalogo);
}
if (pedidoCatalogoBuscaInput) {
  pedidoCatalogoBuscaInput.addEventListener("input", renderListaCatalogoPedido);
}
if (pedidoCatalogoListaEl) {
  pedidoCatalogoListaEl.addEventListener("click", (ev) => {
    const card = ev.target.closest(".pedido-catalogo-item[data-catalogo-idx]");
    if (!card) return;
    const idx = Number(card.dataset.catalogoIdx);
    if (!Number.isFinite(idx)) return;
    const termo = normalizarTextoBusca(pedidoCatalogoBuscaInput?.value || "");
    const itens = (Array.isArray(cardapioPedidoCache) ? cardapioPedidoCache : [])
      .filter((item) => item?.disponivel !== false)
      .filter((item) => {
        if (!termo) return true;
        return normalizarTextoBusca(item?.nome).includes(termo) || normalizarTextoBusca(item?.categoria).includes(termo);
      })
      .slice(0, 120);
    const item = itens[idx];
    if (!item) return;
    selecionarItemCatalogoPedido(item);
  });
}
if (pedidoCatalogoFormEl) {
  pedidoCatalogoFormEl.addEventListener("input", (ev) => {
    if (!pedidoCatalogoDraft) return;
    const alvo = ev.target;
    if (!(alvo instanceof HTMLElement)) return;
    if (alvo === pedidoCatalogoQtdInput) {
      pedidoCatalogoDraft.qtd = Math.max(parseInt(pedidoCatalogoQtdInput?.value || "1", 10) || 1, 1);
    } else if (alvo === pedidoCatalogoPrecoInput) {
      pedidoCatalogoDraft.preco = Math.max(parseFloat(pedidoCatalogoPrecoInput?.value || "0") || 0, 0);
    } else if (alvo === pedidoCatalogoObsInput) {
      pedidoCatalogoDraft.obs = String(pedidoCatalogoObsInput?.value || "");
    } else if (alvo.matches("input[data-catalogo-removido]")) {
      const marcados = Array.from(pedidoCatalogoRemovidosEl?.querySelectorAll("input[data-catalogo-removido]:checked") || [])
        .map((cb) => String(cb.value || "").trim())
        .filter(Boolean);
      pedidoCatalogoDraft.removidos = marcados;
    } else if (alvo.matches("input[data-catalogo-add-field='qtd']")) {
      const idx = Number(alvo.dataset.catalogoAddIdx);
      const add = pedidoCatalogoDraft.adicionais?.[idx];
      if (add) add.qtd = Math.max(parseInt(alvo.value, 10) || 1, 1);
    } else if (alvo.matches("input[data-catalogo-add-field='preco']")) {
      const idx = Number(alvo.dataset.catalogoAddIdx);
      const add = pedidoCatalogoDraft.adicionais?.[idx];
      if (add) add.preco = Math.max(parseFloat(alvo.value) || 0, 0);
    }
  });
  pedidoCatalogoFormEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action='catalogo-remove-adicional']");
    if (!btn || !pedidoCatalogoDraft) return;
    const idx = Number(btn.dataset.catalogoAddIdx);
    if (!Number.isFinite(idx)) return;
    if (Array.isArray(pedidoCatalogoDraft.adicionais) && pedidoCatalogoDraft.adicionais[idx]) {
      pedidoCatalogoDraft.adicionais.splice(idx, 1);
      renderAdicionaisCatalogoPedido();
    }
  });
}
if (pedidoCatalogoAddAdicionalBtn) {
  pedidoCatalogoAddAdicionalBtn.addEventListener("click", () => {
    if (!pedidoCatalogoDraft) return;
    const nome = String(pedidoCatalogoSelectAdicional?.value || "").trim();
    if (!nome) return;
    const ref = (Array.isArray(adicionaisPedidoCache) ? adicionaisPedidoCache : []).find((x) => String(x.nome || "").trim() === nome);
    const preco = Math.max(parseFloat(ref?.preco) || 0, 0);
    if (!Array.isArray(pedidoCatalogoDraft.adicionais)) pedidoCatalogoDraft.adicionais = [];
    const ja = pedidoCatalogoDraft.adicionais.find((x) => String(x.nome || "").trim() === nome);
    if (ja) ja.qtd = Math.max(parseInt(ja.qtd, 10) || 1, 1) + 1;
    else pedidoCatalogoDraft.adicionais.push({ nome, preco, qtd: 1 });
    renderAdicionaisCatalogoPedido();
  });
}
if (pedidoCatalogoSalvarBtn) {
  pedidoCatalogoSalvarBtn.addEventListener("click", () => {
    if (!pedidoCatalogoDraft) {
      mostrarAviso("Selecione um item do catalogo.");
      return;
    }
    const itemFinal = normalizarItemBuilder(pedidoCatalogoDraft);
    if (!itemFinal.nome) {
      mostrarAviso("Item invalido.");
      return;
    }
    if (pedidoCatalogoEditandoIndex >= 0 && pedidoItensBuilder[pedidoCatalogoEditandoIndex]) {
      pedidoItensBuilder[pedidoCatalogoEditandoIndex] = itemFinal;
      mostrarAviso("Item atualizado no pedido.");
    } else {
      pedidoItensBuilder.push(itemFinal);
      mostrarAviso("Item adicionado ao pedido.");
    }
    renderPedidoItensBuilder();
    fecharModalPedidoCatalogo();
  });
}

if (pedidoItemBuscaInput) {
  pedidoItemBuscaInput.addEventListener("input", renderResultadosBuscaPedido);
}

if (pedidoItemResultados) {
  pedidoItemResultados.addEventListener("click", (ev) => {
    const alvo = ev.target.closest("button[data-action='add-cardapio-item']");
    if (!alvo) return;
    const idx = Number(alvo.dataset.cardapioIndex);
    if (!Number.isFinite(idx)) return;
    const termo = normalizarTextoBusca(pedidoItemBuscaInput?.value);
    const fonte = Array.isArray(cardapioPedidoCache) ? cardapioPedidoCache : [];
    const filtrados = fonte
      .filter((item) => {
        if (item?.disponivel === false) return false;
        if (!termo) return true;
        const nome = normalizarTextoBusca(item?.nome);
        const categoria = normalizarTextoBusca(item?.categoria);
        return nome.includes(termo) || categoria.includes(termo);
      })
      .slice(0, 25);
    const item = filtrados[idx];
    if (!item) return;
    abrirModalPedidoItem(item);
  });
}

if (pedidoItemModalCancelar) pedidoItemModalCancelar.addEventListener("click", fecharModalPedidoItem);
if (pedidoItemModalConfirmar) {
  pedidoItemModalConfirmar.addEventListener("click", () => {
    if (!pedidoItemModalSelecionado) return;
    const qtd = Math.max(parseInt(pedidoItemModalQtd?.value || "1", 10) || 1, 1);
    const preco = Math.max(parseFloat(pedidoItemModalPreco?.value || "0") || 0, 0);
    const obs = String(pedidoItemModalObs?.value || "").trim();
    adicionarItemBuilderDoCardapio(pedidoItemModalSelecionado, { qtd, preco, obs });
    fecharModalPedidoItem();
  });
}
if (modalPedidoItem) {
  modalPedidoItem.addEventListener("click", (ev) => {
    if (ev.target === modalPedidoItem) fecharModalPedidoItem();
  });
}

if (pedidoItensBuilderEl) {
  pedidoItensBuilderEl.addEventListener("click", (ev) => {
    const card = ev.target.closest(".pedido-item-card");
    if (!card) return;
    const itemIdx = Number(card.dataset.index);
    if (!Number.isFinite(itemIdx) || !pedidoItensBuilder[itemIdx]) return;

    const acaoEl = ev.target.closest("[data-action]");
    if (!acaoEl) {
      abrirEditorItemExistente(itemIdx);
      return;
    }
    const acao = acaoEl.dataset.action;

    if (acao === "remove-item") {
      pedidoItensBuilder.splice(itemIdx, 1);
      renderPedidoItensBuilder();
      return;
    }

    if (acao === "open-editor-item") {
      abrirEditorItemExistente(itemIdx);
      return;
    }

  });
}

window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
  if (e.target === modalPedido) fecharModalPedidoUI();
  if (e.target === modalPedidoCatalogo) fecharModalPedidoCatalogo();
});

// ===================== INGREDIENTES =====================
const categoriasIngredientes = {
  hamburguer: [
    "Pão",
    "Hambúrguer",
    "Filé de Frango",
    "Filé de Lombo",
    "Mussarela",
    "Presunto",
    "Tomate",
    "Milho",
    "Batata Palha",
    "Bacon",
    "Ovo",
    "Pure de batata"
  ],
  frango: [
    "Pão",
    "Filé de Frango",
    "Mussarela",
    "Presunto",
    "Tomate",
    "Milho",
    "Batata Palha",
    "Bacon",
    "Ovo",
    "Pure de batata"
  ],
  lombo: [
    "Pão",
    "Filé de Lombo",
    "Mussarela",
    "Presunto",
    "Tomate",
    "Milho",
    "Batata Palha",
    "Bacon",
    "Ovo",
    "Pure de batata"
  ],
  gourmets: [
    "Pão de brioche",
    "Carne de hambúrguer",
    "2 carnes de hambúrguer",
    "Cheddar fatiado",
    "Cheddar cremoso",
    "Catupiry original",
    "Mussarela",
    "Bacon",
    "Cebola roxa",
    "Barbecue",
    "Tomate",
    "Alface"
  ],
  refrigerante: [],
  bebidas: []
};

function parseIngredienteQtd(ingrediente) {
  if (!ingrediente || typeof ingrediente !== "string") return { nome: ingrediente, qtd: 1 };
  const match = ingrediente.match(/^(.*) x(\d+)$/i);
  if (!match) return { nome: ingrediente, qtd: 1 };
  return { nome: match[1].trim(), qtd: Math.max(1, parseInt(match[2], 10) || 1) };
}

function carregarIngredientesModal(categoria = "") {
  novosIngredientes.innerHTML = "";
  if (!categoria || !categoriasIngredientes[categoria]) {
    novosIngredientes.innerHTML = "<p style=\"opacity:0.7; margin:0;\">Sem ingredientes predefinidos.</p>";
    if (ingredientesCustom) ingredientesCustom.style.display = "block";
    return;
  }
  if (ingredientesCustom) ingredientesCustom.style.display = "none";
  categoriasIngredientes[categoria].forEach((i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "ingrediente-item";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";
    wrapper.style.marginBottom = "6px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = i;

    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "6px";
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(i));

    const qtd = document.createElement("input");
    qtd.type = "number";
    qtd.min = "1";
    qtd.max = "9";
    qtd.value = "1";
    qtd.style.width = "54px";
    qtd.style.padding = "4px 6px";
    qtd.style.borderRadius = "6px";
    qtd.style.border = "1px solid #ddd";
    qtd.disabled = true;

    checkbox.addEventListener("change", () => {
      qtd.disabled = !checkbox.checked;
      if (!checkbox.checked) qtd.value = "1";
    });

    wrapper.appendChild(label);
    const qtdLabel = document.createElement("span");
    qtdLabel.textContent = "Qtd";
    qtdLabel.style.fontSize = "12px";
    qtdLabel.style.opacity = "0.7";
    wrapper.appendChild(qtdLabel);
    wrapper.appendChild(qtd);
    novosIngredientes.appendChild(wrapper);
  });
}

novaCategoria.addEventListener("change", () => carregarIngredientesModal(novaCategoria.value));

// ===================== CARDÁPIO =====================
async function carregarCardapio() {
  try {
    const res = await authFetch("/adminn/cardapio");
    const menu = await res.json();

    if (!listaLanches) return;
    listaLanches.innerHTML = "";

    const grupos = new Map();
    menu.forEach((item) => {
      const categoria = String(item.categoria || "sem-categoria").trim() || "sem-categoria";
      if (!grupos.has(categoria)) grupos.set(categoria, []);
      grupos.get(categoria).push(item);
    });

    const ordemCategorias = [
      ...categoriasCache.map((categoria) => categoria.slug),
      ...Array.from(grupos.keys()).filter((slug) => !categoriasCache.some((categoria) => categoria.slug === slug)),
    ];

    ordemCategorias.forEach((slug) => {
      const itens = grupos.get(slug);
      if (!itens?.length) return;
      const categoriaNome = categoriasCache.find((categoria) => categoria.slug === slug)?.nome || slug;
      const grupo = document.createElement("section");
      grupo.className = "cardapio-categoria-editor";
      grupo.innerHTML = `<div class="cardapio-categoria-editor-titulo"><h3>${categoriaNome}</h3><span>${itens.length} item(ns)</span></div>`;
      const lista = document.createElement("div");
      lista.className = "cardapio-categoria-editor-itens";

      itens.forEach((item, index) => {
        const orderIndex = item.order_index ?? index;
        const tipo = String(item.tipo || "item");
        const itemEspecial = tipo === "combo" || tipo === "promocao";
        const div = document.createElement("div");
        div.classList.add("lanche-item");
        div.style.position = "relative";
        div.style.opacity = item.disponivel === false ? "0.5" : "1";
        div.dataset.id = item.id;
        div.dataset.tipo = tipo;
        div.dataset.order = orderIndex;
        div.draggable = true;

        const ingredientesTexto = Array.isArray(item.ingredientes) ? item.ingredientes.join(", ") : item.ingredientes;
        div.innerHTML = `
          <h3>${item.nome}</h3>
          <p>R$ ${Number(item.preco).toFixed(2)}</p>
          <p>Ingredientes: ${ingredientesTexto || "-"}</p>
          <img src="${item.img || ""}" alt="${item.nome}" style="width:90px;height:70px;border-radius:8px;">
          <br>
          ${itemEspecial ? `<p><strong>${tipo === "combo" ? "Combo ativo" : "Promoção automática"}</strong></p>` : `
            <label>
              Disponível:
              <input type="checkbox" ${item.disponivel !== false ? "checked" : ""} onchange="atualizarDisponibilidade(${orderIndex}, this.checked)">
            </label>
            <div class="acoes">
              <button onclick="editarLanche(${orderIndex})">✏️ Editar</button>
              <button onclick="removerLanche(${orderIndex})">🗑️ Remover</button>
            </div>
          `}
        `;
        lista.appendChild(div);
      });

      grupo.appendChild(lista);
      listaLanches.appendChild(grupo);
    });
    habilitarDragLanches();
  } catch (err) {
    console.error("Erro ao carregar cardápio:", err);
    mostrarAviso("Erro ao carregar cardápio!");
  }
}

function habilitarDragLanches() {
  if (!listaLanches) return;
  let dragged = null;
  listaLanches.querySelectorAll(".lanche-item[data-id]").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragged = el;
      e.dataTransfer.effectAllowed = "move";
      el.style.opacity = "0.5";
    });
    el.addEventListener("dragend", () => {
      if (dragged) dragged.style.opacity = "1";
      dragged = null;
    });
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!dragged || dragged === el) return;
      const rect = el.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) {
        el.after(dragged);
      } else {
        el.before(dragged);
      }
      salvarOrdemLanches();
    });
  });
}

async function salvarOrdemLanches() {
  if (!listaLanches) return;
  const itens = Array.from(listaLanches.querySelectorAll(".lanche-item[data-id]")).map((el) => ({
    id: el.dataset.id,
    tipo: el.dataset.tipo || "item",
  }));
  if (!itens.length) return;
  const res = await authFetch("/adminn/cardapio/ordenar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens }),
  });
  const data = await res.json();
  if (!data.success) {
    mostrarAviso("Erro ao salvar ordem dos lanches.");
  } else {
    carregarCardapio();
  }
}
function atualizarSelectCategorias() {
  if (!novaCategoria) return;
  const valorAtual = novaCategoria.value;
  novaCategoria.innerHTML = "<option value=\"\">Selecione a categoria</option>";
  categoriasCache.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.nome;
    novaCategoria.appendChild(opt);
  });
  if (valorAtual && !categoriasCache.some((c) => c.slug === valorAtual)) {
    const opt = document.createElement("option");
    opt.value = valorAtual;
    opt.textContent = valorAtual;
    novaCategoria.appendChild(opt);
  }
  if (valorAtual) novaCategoria.value = valorAtual;
}

function renderCategorias() {
  if (!listaCategorias) return;
  listaCategorias.innerHTML = "";
  if (!categoriasCache.length) {
    listaCategorias.innerHTML = "<p>Nenhuma categoria cadastrada.</p>";
    return;
  }

  categoriasCache.forEach((cat) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "8px 10px";
    row.style.border = "1px solid rgba(15, 23, 42, 0.12)";
    row.style.borderRadius = "10px";
    row.style.marginBottom = "8px";
    row.style.cursor = "grab";
    row.draggable = true;
    row.dataset.id = String(cat.id);

    const left = document.createElement("div");
    left.innerHTML = `<strong>${cat.nome}</strong> <span style="opacity:0.6">(${cat.slug})</span>`;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const btnEditar = document.createElement("button");
    btnEditar.className = "btn ghost small";
    btnEditar.textContent = "Editar";
    btnEditar.onclick = async () => {
      const novoNome = prompt("Novo nome da categoria:", cat.nome);
      if (!novoNome) return;
      const res = await authFetch(`/adminn/categorias/editar/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNome, ativo: true }),
      });
      const data = await res.json();
      if (data.success) {
        carregarCategorias();
      } else {
        mostrarAviso("Erro ao editar categoria.");
      }
    };

    const btnRemover = document.createElement("button");
    btnRemover.className = "btn danger small";
    btnRemover.textContent = "Remover";
    btnRemover.onclick = async () => {
      if (!confirm("Remover esta categoria?")) return;
      const res = await authFetch(`/adminn/categorias/remover/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        carregarCategorias();
      } else {
        mostrarAviso("Erro ao remover categoria.");
      }
    };

    actions.appendChild(btnEditar);
    actions.appendChild(btnRemover);
    row.appendChild(left);
    row.appendChild(actions);
    listaCategorias.appendChild(row);
  });
}

function habilitarDragCategorias() {
  if (!listaCategorias) return;
  let dragged = null;
  listaCategorias.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragged = el;
      e.dataTransfer.effectAllowed = "move";
      el.style.opacity = "0.5";
    });
    el.addEventListener("dragend", () => {
      if (dragged) dragged.style.opacity = "1";
      dragged = null;
    });
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      if (!dragged || dragged === el) return;
      const rect = el.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      if (after) {
        el.after(dragged);
      } else {
        el.before(dragged);
      }
      salvarOrdemCategorias();
    });
  });
}

async function salvarOrdemCategorias() {
  if (!listaCategorias) return;
  const ids = Array.from(listaCategorias.querySelectorAll("[data-id]")).map((el) =>
    parseInt(el.dataset.id, 10)
  );
  if (!ids.length) return;
  const res = await authFetch("/adminn/categorias/ordenar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!data.success) {
    mostrarAviso("Erro ao salvar ordem.");
  } else {
    carregarCategorias();
  }
}

async function carregarCategorias() {
  try {
    const res = await authFetch("/adminn/categorias");
    categoriasCache = (await res.json()) || [];
    atualizarSelectCategorias();
    renderCategorias();
    habilitarDragCategorias();
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

if (btnAdicionarCategoria) {
  btnAdicionarCategoria.addEventListener("click", async () => {
    const nome = (novaCategoriaNome?.value || "").trim();
    if (!nome) {
      mostrarAviso("Informe o nome da categoria.");
      return;
    }
    const res = await authFetch("/adminn/categorias/adicionar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const data = await res.json();
    if (resposta.ok && data.success) {
      if (novaCategoriaNome) novaCategoriaNome.value = "";
      carregarCategorias();
    } else {
      mostrarAviso("Erro ao adicionar categoria.");
    }
  });
}

// ===================== SALVAR/EDITAR LANCHES =====================
salvarLancheBtn.onclick = async () => {
  try {
    const nome = novoNome.value.trim();
    const preco = parseFloat(novoPreco.value);
    const categoria = novaCategoria.value.trim();
    const categoriaTemLista = Boolean(categoria && categoriasIngredientes[categoria]);
    const ingredientesSelecionados = categoriaTemLista
      ? Array.from(
          novosIngredientes.querySelectorAll(".ingrediente-item input[type=\"checkbox\"]:checked")
        ).map((cb) => {
          const wrapper = cb.closest(".ingrediente-item");
          const qtdInput = wrapper ? wrapper.querySelector("input[type=\"number\"]") : null;
          const qtd = Math.max(1, parseInt(qtdInput?.value || "1", 10) || 1);
          return qtd > 1 ? `${cb.value} x${qtd}` : cb.value;
        })
      : (ingredientesCustom?.value || "")
          .split(/[,\\n]/)
          .map((i) => i.trim())
          .filter(Boolean);
    const imagemFile = novaImg.files[0];

    if (!nome || !preco || !categoria) {
      mostrarAviso("Preencha todos os campos obrigatórios!");
      return;
    }

    let imgUrl = editIndex !== null ? editImgAtual : "";
    if (imagemFile) {
      const formData = new FormData();
      formData.append("imagem", imagemFile);
      const res = await authFetch("/adminn/upload", { method: "POST", body: formData });
      const data = await res.json();
      imgUrl = data.imageUrl || "";
    }

    const lancheData = { nome, preco, categoria, ingredientes: ingredientesSelecionados, img: imgUrl, disponivel: true };
    const url = editIndex !== null ? `/adminn/cardapio/editar/${editIndex}` : "/adminn/cardapio/adicionar";
    const method = editIndex !== null ? "PUT" : "POST";

    const res = await authFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(lancheData) });
    const data = await res.json();
    if (data.success) {
      mostrarAviso(editIndex !== null ? "✅ Lanche editado!" : "✅ Lanche adicionado!");
      modal.style.display = "none";
      editIndex = null;
      carregarCardapio();
    } else mostrarAviso("Erro ao salvar lanche!");
  } catch (err) {
    console.error("Erro ao salvar lanche:", err);
    mostrarAviso("Erro ao salvar lanche!");
  }
};

// ===================== EDITAR/REMOVER/ATUALIZAR =====================
function editarLanche(index) {
  authFetch("/adminn/cardapio")
    .then((res) => res.json())
    .then((menu) => {
      const item = menu[index];
      editIndex = index;
      editImgAtual = String(item.img || "").trim();
      novoNome.value = item.nome;
      novoPreco.value = item.preco;
      if (novaCategoria) {
        const existe = categoriasCache.some((c) => c.slug === item.categoria);
        if (!existe) {
          const opt = document.createElement("option");
          opt.value = item.categoria;
          opt.textContent = item.categoria;
          novaCategoria.appendChild(opt);
        }
        novaCategoria.value = item.categoria;
      }
      carregarIngredientesModal(item.categoria);
      // marca os checkboxes dos ingredientes
      if (item.ingredientes) {
        const ingredientesArray = Array.isArray(item.ingredientes)
          ? item.ingredientes
          : item.ingredientes.split(",").map((i) => i.trim());
        if (categoriasIngredientes[item.categoria]) {
          const ingredientesMap = new Map();
          ingredientesArray.forEach((ingrediente) => {
            const parsed = parseIngredienteQtd(String(ingrediente));
            const nome = (parsed.nome || "").trim();
            if (!nome) return;
            const atual = ingredientesMap.get(nome) || 1;
            ingredientesMap.set(nome, Math.max(atual, parsed.qtd || 1));
          });

          novosIngredientes.querySelectorAll(".ingrediente-item").forEach((itemEl) => {
            const cb = itemEl.querySelector("input[type=\"checkbox\"]");
            const qtdInput = itemEl.querySelector("input[type=\"number\"]");
            if (!cb) return;
            const qtd = ingredientesMap.get(cb.value);
            if (qtd) {
              cb.checked = true;
              if (qtdInput) {
                qtdInput.disabled = false;
                qtdInput.value = String(qtd);
              }
            } else if (qtdInput) {
              qtdInput.disabled = true;
              qtdInput.value = "1";
            }
          });
          if (ingredientesCustom) ingredientesCustom.value = "";
        } else if (ingredientesCustom) {
          ingredientesCustom.value = ingredientesArray.join(", ");
        }
      }
      modal.style.display = "flex";
      salvarLancheBtn.innerText = "Salvar Alterações";
    })
    .catch((err) => {
      console.error("Erro ao editar lanche:", err);
      mostrarAviso("Erro ao carregar lanche para edição!");
    });
}

async function removerLanche(index) {
  try {
    const res = await authFetch(`/adminn/cardapio/remover/${index}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      mostrarAviso("✅ Lanche removido!");
      carregarCardapio();
    } else mostrarAviso("Não foi possível remover!");
  } catch (err) {
    console.error("Erro ao remover lanche:", err);
  }
}

async function atualizarDisponibilidade(index, disponivel) {
  try {
    await authFetch("/adminn/cardapio/atualizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, disponivel }),
    });
    mostrarAviso("✅ Disponibilidade atualizada!");
    carregarCardapio();
  } catch (err) {
    console.error("Erro ao atualizar disponibilidade:", err);
  }
}

// ===================== ENTREGADORES (atribuição) =====================
async function atribuirEntregador(id) {
  const scrollAntes = capturarScrollPagina();
  try {
    const res = await authFetch("/adminn/entregadores");
    const entregadores = await res.json();
    const ativos = entregadores.filter((e) => e.ativo);

    if (ativos.length === 0) {
      alert("Nenhum entregador ativo!");
      return;
    }

    // mostra lista simples e pede nome (pode trocar para modal personalizado depois)
    const nomes = ativos.map((e) => e.nome).join("\n");
    const nomeEscolhido = prompt("Escolha o entregador:\n\n" + nomes);

    if (!nomeEscolhido || !ativos.some((e) => e.nome === nomeEscolhido)) {
      alert("Entregador invalido!");
      return;
    }

    const resposta = await authFetch("/pedidos/atribuir-entregador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, entregador: nomeEscolhido }),
    });
    const data = await resposta.json();

    if (data.success) {
      mostrarAviso(`Pedido saiu com ${nomeEscolhido}`);
      await carregarPedidos();
      restaurarScrollPagina(scrollAntes);
    } else {
      mostrarAviso(data?.message || "Erro ao atribuir entregador!");
    }
  } catch (err) {
    console.error("Erro ao atribuir entregador:", err);
    mostrarAviso("Erro ao atribuir entregador!");
  }
}

// ===================== PEDIDOS (status / cancelar / mover) =====================
async function mudarStatus(id, novoStatus, entregador = null) {
  const scrollAntes = capturarScrollPagina();
  try {
    const res = await authFetch(`/pedidos/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: novoStatus, entregador }),
    });
    const data = await res.json();

    if (res.ok && data.success) {
      mostrarAviso("Status atualizado!");
      if (novoStatus === "entregue") {
        try {
          const resMover = await authFetch(`/pedidos/mover-para-entregues`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const dataMover = await resMover.json();
          if (!resMover.ok || !dataMover.success) {
            mostrarAviso(dataMover?.message || "Nao foi possivel finalizar como entregue.");
            await carregarPedidos();
            restaurarScrollPagina(scrollAntes);
            return;
          }
        } catch (errMove) {
          console.error("Erro ao mover para entregues:", errMove);
          mostrarAviso("Erro ao finalizar entrega.");
          await carregarPedidos();
          restaurarScrollPagina(scrollAntes);
          return;
        }
      }
      await carregarPedidos();
      restaurarScrollPagina(scrollAntes);
    } else {
      mostrarAviso(data?.message || "Erro ao atualizar status!");
    }
  } catch (err) {
    console.error("Erro ao mudar status:", err);
    mostrarAviso("Erro ao mudar status!");
  }
}

async function imprimirPedido(id) {
  try {
    const res = await authFetch(`/adminn/print/enqueue/${id}`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      mostrarAviso(`Pedido #${id} enviado para impressao.`);
      return;
    }
    mostrarAviso(data?.message || data?.error || "Nao foi possivel enviar para impressao.");
  } catch (err) {
    console.error("Erro ao enfileirar impressao:", err);
    mostrarAviso("Erro ao enviar para impressao.");
  }
}

async function cancelarPedido(id) {
  if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
  try {
    const res = await authFetch(`/pedidos/cancelar/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      mostrarAviso("❌ Pedido cancelado!");
      carregarPedidos();
    } else {
      mostrarAviso("Erro ao cancelar pedido!");
    }
  } catch (err) {
    console.error("Erro ao cancelar pedido:", err);
    mostrarAviso("Erro ao cancelar pedido!");
  }
}

async function excluirPedido(id) {
  if (!confirm("Excluir este pedido permanentemente?")) return;
  try {
    const res = await authFetch(`/pedidos/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      mostrarAviso("Pedido excluido.");
      await carregarPedidos();
      await carregarPedidosEntregues();
      return;
    }
    mostrarAviso(data?.message || "Nao foi possivel excluir o pedido.");
  } catch (err) {
    console.error("Erro ao excluir pedido:", err);
    mostrarAviso("Erro ao excluir pedido.");
  }
}

async function excluirTodosPedidos() {
  if (!confirm("Excluir TODOS os pedidos da aba Pedidos (abertos/cancelados)?")) return;
  if (btnExcluirTodosPedidos) btnExcluirTodosPedidos.disabled = true;
  try {
    const res = await authFetch("/pedidos/abertos/todos", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      const removidos = Number(data.removidos || 0);
      mostrarAviso(`Pedidos excluidos: ${removidos}.`);
      await carregarPedidos();
      return;
    }
    mostrarAviso(data?.message || "Nao foi possivel excluir todos os pedidos.");
  } catch (err) {
    console.error("Erro ao excluir todos os pedidos:", err);
    mostrarAviso("Erro ao excluir todos os pedidos.");
  } finally {
    if (btnExcluirTodosPedidos) btnExcluirTodosPedidos.disabled = false;
  }
}

async function excluirPedidoEntregue(id) {
  if (!confirm("Excluir este pedido da lista de entregues?")) return;
  try {
    const res = await authFetch(`/pedidos/entregues/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      mostrarAviso("Pedido entregue excluido.");
      await carregarPedidosEntregues();
      await carregarPedidos();
      return;
    }
    mostrarAviso("Nao foi possivel excluir o pedido entregue.");
  } catch (err) {
    console.error("Erro ao excluir pedido entregue:", err);
    mostrarAviso("Erro ao excluir pedido entregue.");
  }
}

// ===================== CARREGAR PEDIDOS =====================
// ===================== CARREGAR PEDIDOS =====================
async function carregarPedidos() {
  if (carregandoPedidos) return;
  carregandoPedidos = true;
  try {
    if (!pedidosCache.length && !skeletonPedidosMostrado) {
      renderSkeletonPedidos();
      skeletonPedidosMostrado = true;
    }
    const resposta = await authFetch("/pedidos");
    const pedidos = await resposta.json();

    const basePedidos = Array.isArray(pedidos) ? pedidos.slice() : [];
    const pedidosPorId = new Map();
    basePedidos.forEach((p) => {
      if (!p || !p.id) return;
      if (!pedidosPorId.has(p.id)) {
        pedidosPorId.set(p.id, p);
        return;
      }
      const atual = pedidosPorId.get(p.id);
      const atualTs = new Date(atual?.created_at || 0).getTime() || 0;
      const novoTs = new Date(p?.created_at || 0).getTime() || 0;
      if (novoTs >= atualTs) pedidosPorId.set(p.id, p);
    });
    pedidosCache = ordenarPedidosRecentes(Array.from(pedidosPorId.values()));
    historicoPedidoCache = new Map();
    const assinatura = JSON.stringify(
      pedidosCache.map((p) => [
        p.id,
        p.status,
        p.entregador || "",
        p.entregueEm || "",
        p.saiuParaEntrega || "",
        p.pagamento || "",
        p.taxaEntrega || 0,
        JSON.stringify(p.carrinho || []),
      ])
    );

    marcarNovosPedidos(pedidosDoDiaAtual(pedidosCache));
    const modalAberto = modalPedido?.style.display === "flex" || modal?.style.display === "flex";
    if (!modalAberto && assinatura !== pedidosLastSignature) {
      pedidosLastSignature = assinatura;
      renderPedidosFiltrados();
    }

    const novos = new Set(pedidosCache.map((p) => p.id));
    if (alertaIniciado) {
      let temNovo = false;
      novos.forEach((id) => {
        if (!idsPedidosAtual.has(id)) temNovo = true;
      });
      if (temNovo) tocarAlertaPedido();
    }
    idsPedidosAtual = novos;
    alertaIniciado = true;
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    mostrarAviso("Erro ao carregar pedidos!");
  } finally {
    carregandoPedidos = false;
  }
}

function tocarAlertaPedido() {
  tocarSequenciaSomPedido([{ freq: 760, duracaoMs: 280, pausaMs: 0, ganho: 1.1 }]);
}
// ===================== PEDIDOS ENTREGUES =====================
async function carregarPedidosEntregues() {
  try {
    if (!entreguesCache.length && pedidosEntreguesDiv) {
      pedidosEntreguesDiv.innerHTML = '<div class="pedido"><strong class="skeleton-text"> </strong><p class="skeleton-text"> </p><p class="skeleton-text"> </p></div>';
    }
    const res = await authFetch("/adminn/pedidos/historico?limit=500");
    if (!res.ok) {
      pedidosEntreguesDiv.innerHTML = "<p>Nao foi possivel carregar pedidos entregues.</p>";
      return;
    }
    const data = await res.json();
    const entregues = Array.isArray(data?.pedidos) ? data.pedidos : data;

    entreguesCache = ordenarPedidosRecentes(Array.isArray(entregues) ? entregues.slice() : []);
    atualizarOpcoesFiltroEntregadorEntregues();

    renderEntreguesFiltrados();
  } catch (err) {
    console.error("Erro ao carregar entregues:", err);
    pedidosEntreguesDiv.innerHTML = "<p>Erro ao carregar pedidos entregues.</p>";
  }
}
// ===================== ADICIONAIS =====================
async function carregarAdicionais() {
  try {
    const res = await authFetch("/adminn/adicionais");
    const adicionais = await res.json();
    adicionaisContainer.innerHTML = "";
    adicionais.forEach((ad, index) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "space-between";
      div.style.gap = "6px";
      div.style.marginBottom = "4px";

      const span = document.createElement("span");
      span.textContent = `${ad.nome} - R$ ${Number(ad.preco).toFixed(2)}`;

      const btnRemover = document.createElement("button");
      btnRemover.textContent = "❌";
      btnRemover.style.background = "#ff4d4d";
      btnRemover.style.color = "white";
      btnRemover.style.border = "none";
      btnRemover.style.borderRadius = "4px";
      btnRemover.style.padding = "2px 6px";
      btnRemover.style.cursor = "pointer";
      btnRemover.onclick = () => removerAdicional(index);

      div.appendChild(span);
      div.appendChild(btnRemover);
      adicionaisContainer.appendChild(div);
    });
  } catch (err) {
    console.error("Erro ao carregar adicionais:", err);
  }
}

btnAdicionarAdicional && (btnAdicionarAdicional.onclick = async () => {
  const nome = (novoAdicionalInput.value || "").trim();
  const preco = parseFloat(valorAdicionalInput.value);
  if (!nome || isNaN(preco)) {
    mostrarAviso("Preencha o nome e o valor do adicional!");
    return;
  }
  try {
    const res = await authFetch("/adminn/adicionais/adicionar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, preco }),
    });
    const data = await res.json();
    if (data.success) {
      mostrarAviso("✅ Adicional adicionado!");
      novoAdicionalInput.value = "";
      valorAdicionalInput.value = "";
      carregarAdicionais();
    } else mostrarAviso("Erro ao adicionar adicional!");
  } catch (err) {
    console.error("Erro ao adicionar adicional:", err);
    mostrarAviso("Erro ao adicionar adicional!");
  }
});

async function removerAdicional(index) {
  try {
    const res = await authFetch(`/adminn/adicionais/remover/${index}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      mostrarAviso("✅ Adicional removido!");
      carregarAdicionais();
    } else mostrarAviso("Erro ao remover adicional!");
  } catch (err) {
    console.error("Erro ao remover adicional:", err);
    mostrarAviso("Erro ao remover adicional!");
  }
}

if (filtroBusca) {
  filtroBusca.addEventListener("input", () => {
    renderPedidosFiltrados();
  });
}

if (filtroStatus) {
  filtroStatus.addEventListener("change", () => {
    renderPedidosFiltrados();
  });
}

if (btnLimparFiltro) {
  btnLimparFiltro.addEventListener("click", () => {
    if (filtroBusca) filtroBusca.value = "";
    if (filtroStatus) filtroStatus.value = "todos";
    renderPedidosFiltrados();
  });
}

if (btnExcluirTodosPedidos) {
  btnExcluirTodosPedidos.addEventListener("click", excluirTodosPedidos);
}

if (filtroEntreguesBusca) {
  filtroEntreguesBusca.addEventListener("input", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesPeriodo) {
  filtroEntreguesPeriodo.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesInicio) {
  filtroEntreguesInicio.addEventListener("change", () => {
    if (filtroEntreguesPeriodo) filtroEntreguesPeriodo.value = "personalizado";
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesFim) {
  filtroEntreguesFim.addEventListener("change", () => {
    if (filtroEntreguesPeriodo) filtroEntreguesPeriodo.value = "personalizado";
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesStatus) {
  filtroEntreguesStatus.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesTipo) {
  filtroEntreguesTipo.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesPagamento) {
  filtroEntreguesPagamento.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesEntregador) {
  filtroEntreguesEntregador.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (filtroEntreguesValor) {
  filtroEntreguesValor.addEventListener("change", () => {
    renderEntreguesFiltrados();
  });
}

if (btnLimparFiltroEntregues) {
  btnLimparFiltroEntregues.addEventListener("click", () => {
    if (filtroEntreguesBusca) filtroEntreguesBusca.value = "";
    if (filtroEntreguesPeriodo) filtroEntreguesPeriodo.value = "hoje";
    if (filtroEntreguesInicio) filtroEntreguesInicio.value = "";
    if (filtroEntreguesFim) filtroEntreguesFim.value = "";
    if (filtroEntreguesStatus) filtroEntreguesStatus.value = "todos";
    if (filtroEntreguesTipo) filtroEntreguesTipo.value = "todos";
    if (filtroEntreguesPagamento) filtroEntreguesPagamento.value = "todos";
    if (filtroEntreguesEntregador) filtroEntreguesEntregador.value = "todos";
    if (filtroEntreguesValor) filtroEntreguesValor.value = "todos";
    renderEntreguesFiltrados();
  });
}

if (audioAlertsPedidos) {
  audioAlertsPedidos.checked = audioPedidoAtivo;
  audioAlertsPedidos.addEventListener("change", () => {
    audioPedidoAtivo = Boolean(audioAlertsPedidos.checked);
    localStorage.setItem("admin_alert_audio_pedidos", audioPedidoAtivo ? "1" : "0");
  });
}

audioPedidoVolume = normalizarVolumePedido(audioPedidoVolume);
atualizarLabelVolumePedido();

if (audioAlertsVolume) {
  audioAlertsVolume.addEventListener("input", () => {
    audioPedidoVolume = normalizarVolumePedido(audioAlertsVolume.value);
    localStorage.setItem("admin_alert_audio_pedidos_vol", String(audioPedidoVolume));
    atualizarLabelVolumePedido();
  });
}

if (btnTestarSomPedidos) {
  btnTestarSomPedidos.addEventListener("click", () => {
    tocarSomNovoPedido();
  });
}

if (btnPureBatata) {
  btnPureBatata.addEventListener("click", alternarPureBatata);
}

// ===================== INICIALIZACAO =====================
window.addEventListener("load", () => {
  hojeSaoPauloKey = dataKeySaoPaulo(new Date());
  abrirPainelPorHash();
  carregarEstadoPureBatata();
  carregarCardapio();
  carregarPedidos();
  carregarAdicionais();
  carregarCategorias();
});
setInterval(() => {
  const diaAtual = dataKeySaoPaulo(new Date());
  if (hojeSaoPauloKey && diaAtual && hojeSaoPauloKey !== diaAtual) {
    hojeSaoPauloKey = diaAtual;
    renderPedidosFiltrados();
    renderEntreguesFiltrados();
  } else if (!hojeSaoPauloKey && diaAtual) {
    hojeSaoPauloKey = diaAtual;
  }
  if (painelPedidos.style.display !== "none") carregarPedidos();
  if (painelEntregues.style.display !== "none") carregarPedidosEntregues();
}, 5000);
