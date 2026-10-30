const atdBusca = document.getElementById("atd-busca");
const atdCategoria = document.getElementById("atd-categoria");
const atdProdutos = document.getElementById("atd-produtos");
const atdCarrinho = document.getElementById("atd-carrinho");
const atdSubtotal = document.getElementById("atd-subtotal");
const atdTaxaTotal = document.getElementById("atd-taxa-total");
const atdTotal = document.getElementById("atd-total");
const atdCliente = document.getElementById("atd-cliente");
const atdTelefone = document.getElementById("atd-telefone");
const atdTipoEntrega = document.getElementById("atd-tipo-entrega");
const atdOrigem = document.getElementById("atd-origem");
const atdPagamento = document.getElementById("atd-pagamento");
const atdPagamentoDividido = document.getElementById("atd-pagamento-dividido");
const atdPagamentoDivididoBox = document.getElementById("atd-pagamento-dividido-box");
const atdPagamentosDivididosLista = document.getElementById("atd-pagamentos-divididos-lista");
const atdAddPagamentoDividido = document.getElementById("atd-add-pagamento-dividido");
const atdPagamentoDivididoResumo = document.getElementById("atd-pagamento-dividido-resumo");
const atdEndereco = document.getElementById("atd-endereco");
const atdTaxa = document.getElementById("atd-taxa");
const atdTroco = document.getElementById("atd-troco");
const atdObs = document.getElementById("atd-obs");
const atdBlocoEntrega = document.getElementById("atd-bloco-entrega");
const atdBlocoTroco = document.getElementById("atd-bloco-troco");
const atdLimpar = document.getElementById("atd-limpar");
const atdFinalizar = document.getElementById("atd-finalizar");
const atdResultado = document.getElementById("atd-resultado");
const atdModalAdicionais = document.getElementById("atd-modal-adicionais");
const atdAdicionaisTitulo = document.getElementById("atd-adicionais-titulo");
const atdAdicionaisLista = document.getElementById("atd-adicionais-lista");
const atdAdicionaisSalvar = document.getElementById("atd-adicionais-salvar");
const atdAdicionaisCancelar = document.getElementById("atd-adicionais-cancelar");
const atdModalItem = document.getElementById("atd-modal-item");
const atdItemModalTitulo = document.getElementById("atd-item-modal-titulo");
const atdItemModalQtd = document.getElementById("atd-item-modal-qtd");
const atdItemModalPreco = document.getElementById("atd-item-modal-preco");
const atdItemModalObs = document.getElementById("atd-item-modal-obs");
const atdItemModalCancelar = document.getElementById("atd-item-modal-cancelar");
const atdItemModalAdicionais = document.getElementById("atd-item-modal-adicionais");
const atdItemModalConfirmar = document.getElementById("atd-item-modal-confirmar");

const atendimentoState = {
  itens: [],
  adicionais: [],
  carrinho: [],
  itemAdicionalIndex: -1,
  itemModalBase: null,
  itemModalDraft: null,
};

function toNumber(valor, fallback = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function moeda(valor) {
  return `R$ ${toNumber(valor, 0).toFixed(2).replace(".", ",")}`;
}

function texto(valor) {
  return String(valor || "").trim();
}

function escapeHtml(valor) {
  return String(valor || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarAdicionais(adicionais) {
  if (!Array.isArray(adicionais)) return [];
  return adicionais
    .map((add) => ({
      nome: texto(add?.nome),
      preco: Math.max(toNumber(add?.preco, 0), 0),
      qtd: Math.max(parseInt(add?.qtd, 10) || 0, 0),
    }))
    .filter((add) => add.nome && add.qtd > 0);
}

function totalAdicionaisUnidade(item) {
  return normalizarAdicionais(item?.adicionais).reduce((sum, add) => sum + (add.preco * add.qtd), 0);
}

function textoAdicionais(item) {
  const lista = normalizarAdicionais(item?.adicionais);
  if (!lista.length) return "";
  return lista.map((add) => `${add.nome} x${add.qtd}`).join(", ");
}

function itemSemCustomizacao(item) {
  return !texto(item?.obs) && normalizarAdicionais(item?.adicionais).length === 0;
}

function limparResultado() {
  if (!atdResultado) return;
  atdResultado.textContent = "";
  atdResultado.classList.remove("ok", "err");
}

function setResultado(msg, type = "ok") {
  if (!atdResultado) return;
  atdResultado.textContent = msg;
  atdResultado.classList.remove("ok", "err");
  atdResultado.classList.add(type === "err" ? "err" : "ok");
}

function toggleCamposEntrega() {
  const isEntrega = atdTipoEntrega?.value === "entrega";
  if (atdBlocoEntrega) atdBlocoEntrega.style.display = isEntrega ? "grid" : "none";
  if (atdEndereco) atdEndereco.required = isEntrega;
}

function toggleCamposPagamento() {
  const dinheiro = pagamentoDivididoAtivoAtd()
    ? pagamentoDivididoContemMetodoAtd("dinheiro")
    : atdPagamento?.value === "dinheiro";
  if (atdBlocoTroco) atdBlocoTroco.style.display = dinheiro ? "grid" : "none";
  if (atdTroco && !dinheiro) atdTroco.value = "";
  if (atdPagamentoDivididoBox) atdPagamentoDivididoBox.style.display = pagamentoDivididoAtivoAtd() ? "block" : "none";
}

function pagamentoDivididoAtivoAtd() {
  return Boolean(atdPagamentoDividido?.checked);
}

function parseValorSplitAtd(valor) {
  const n = Number(String(valor ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function coletarPagamentosDivididosAtd() {
  if (!atdPagamentosDivididosLista) return [];
  return Array.from(atdPagamentosDivididosLista.querySelectorAll(".atd-split-row"))
    .map((row) => ({
      metodo: texto(row.querySelector(".atd-split-metodo")?.value || ""),
      valor: parseValorSplitAtd(row.querySelector(".atd-split-valor")?.value || ""),
    }))
    .filter((x) => x.metodo && x.valor > 0);
}

function pagamentoDivididoContemMetodoAtd(metodo) {
  const alvo = String(metodo || "").toLowerCase();
  return coletarPagamentosDivididosAtd().some((x) => x.metodo.toLowerCase() === alvo);
}

function totalPedidoAtd() {
  return calcularSubtotal() + calcularTaxa();
}

function atualizarResumoPagamentoDivididoAtd() {
  if (!atdPagamentoDivididoResumo) return;
  if (!pagamentoDivididoAtivoAtd()) {
    atdPagamentoDivididoResumo.textContent = "";
    return;
  }
  const total = totalPedidoAtd();
  const soma = coletarPagamentosDivididosAtd().reduce((acc, x) => acc + x.valor, 0);
  const dif = total - soma;
  if (Math.abs(dif) < 0.01) {
    atdPagamentoDivididoResumo.textContent = `Valores conferem. Total ${moeda(total)}.`;
  } else if (dif > 0) {
    atdPagamentoDivididoResumo.textContent = `Falta ${moeda(dif)} para fechar o total.`;
  } else {
    atdPagamentoDivididoResumo.textContent = `Passou ${moeda(Math.abs(dif))} do total.`;
  }
}

function adicionarLinhaPagamentoDivididoAtd(metodo = "", valor = "") {
  if (!atdPagamentosDivididosLista) return;
  const row = document.createElement("div");
  row.className = "atd-split-row";
  row.innerHTML = `
    <select class="atd-split-metodo">
      <option value="">Forma</option>
      <option value="pix">Pix</option>
      <option value="dinheiro">Dinheiro</option>
      <option value="cartao">Cartao</option>
    </select>
    <input type="text" class="atd-split-valor" placeholder="Valor (R$)">
    <button type="button" class="atd-split-remove">x</button>
  `;
  atdPagamentosDivididosLista.appendChild(row);
  const metodoEl = row.querySelector(".atd-split-metodo");
  const valorEl = row.querySelector(".atd-split-valor");
  if (metodo) metodoEl.value = metodo.toLowerCase();
  if (valor !== "") valorEl.value = String(valor);
  row.addEventListener("input", () => {
    toggleCamposPagamento();
    atualizarResumoPagamentoDivididoAtd();
  });
  row.querySelector(".atd-split-remove")?.addEventListener("click", () => {
    row.remove();
    toggleCamposPagamento();
    atualizarResumoPagamentoDivididoAtd();
  });
}

function renderPagamentosDivididosAtd(lista = []) {
  if (!atdPagamentosDivididosLista) return;
  atdPagamentosDivididosLista.innerHTML = "";
  const arr = Array.isArray(lista) ? lista : [];
  if (!arr.length) {
    adicionarLinhaPagamentoDivididoAtd();
    adicionarLinhaPagamentoDivididoAtd();
  } else {
    arr.forEach((item) => adicionarLinhaPagamentoDivididoAtd(item.metodo, item.valor));
  }
  atualizarResumoPagamentoDivididoAtd();
}

function calcularSubtotal() {
  return atendimentoState.carrinho.reduce((sum, item) => {
    const base = item.preco * item.qtd;
    const adicionais = totalAdicionaisUnidade(item) * item.qtd;
    return sum + base + adicionais;
  }, 0);
}

function calcularTaxa() {
  if (atdTipoEntrega?.value !== "entrega") return 0;
  return Math.max(toNumber(atdTaxa?.value, 0), 0);
}

function atualizarTotais() {
  const subtotal = calcularSubtotal();
  const taxa = calcularTaxa();
  const total = subtotal + taxa;
  if (atdSubtotal) atdSubtotal.textContent = moeda(subtotal);
  if (atdTaxaTotal) atdTaxaTotal.textContent = moeda(taxa);
  if (atdTotal) atdTotal.textContent = moeda(total);
  atualizarResumoPagamentoDivididoAtd();
}

function renderCarrinho() {
  if (!atdCarrinho) return;

  if (!atendimentoState.carrinho.length) {
    atdCarrinho.innerHTML = '<div class="atd-vazio">Nenhum item adicionado ainda.</div>';
    if (atdFinalizar) atdFinalizar.disabled = true;
    atualizarTotais();
    return;
  }

  if (atdFinalizar) atdFinalizar.disabled = false;

  atdCarrinho.innerHTML = atendimentoState.carrinho
    .map((item, index) => {
      const adicionaisTxt = textoAdicionais(item);
      const subtotal = (item.preco + totalAdicionaisUnidade(item)) * item.qtd;
      const obsLinha = item.obs ? `<div><small>Obs: ${escapeHtml(item.obs)}</small></div>` : "";
      const adicionaisLinha = adicionaisTxt
        ? `<div><small>Adicionais: ${escapeHtml(adicionaisTxt)}</small></div>`
        : "";
      return `
        <div class="atd-item">
          <div>
            <strong>${escapeHtml(item.nome)}</strong>
            <div><small>${moeda(item.preco)} cada</small></div>
            ${adicionaisLinha}
            <div><small>Subtotal: ${moeda(subtotal)}</small></div>
            ${obsLinha}
          </div>
          <div class="atd-item-acoes" data-index="${index}">
            <button type="button" data-action="minus">-</button>
            <strong>${item.qtd}</strong>
            <button type="button" data-action="plus">+</button>
            <button type="button" data-action="adds">Adds</button>
            <button type="button" data-action="obs">Obs</button>
            <button type="button" class="rem" data-action="remove">x</button>
          </div>
        </div>
      `;
    })
    .join("");

  atualizarTotais();
}

function itensFiltrados() {
  const termo = texto(atdBusca?.value).toLowerCase();
  const categoria = texto(atdCategoria?.value || "todos");

  return atendimentoState.itens.filter((item) => {
    if (item.disponivel === false) return false;
    if (categoria !== "todos" && item.categoria !== categoria) return false;
    if (!termo) return true;
    return item.nome.toLowerCase().includes(termo);
  });
}

function renderProdutos() {
  if (!atdProdutos) return;
  const lista = itensFiltrados();
  if (!lista.length) {
    atdProdutos.innerHTML = '<div class="atd-vazio">Nenhum item encontrado.</div>';
    return;
  }

  atdProdutos.innerHTML = lista
    .map(
      (item, idx) => `
      <div class="atd-produto">
        <h3>${escapeHtml(item.nome)}</h3>
        <p>${escapeHtml(item.categoria || "item")}</p>
        <p><strong>${moeda(item.preco)}</strong></p>
        <button class="btn primary" type="button" data-idx="${idx}">Adicionar</button>
      </div>
    `
    )
    .join("");

  atdProdutos.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const item = lista[idx];
      if (!item) return;
      abrirModalItem(item);
    });
  });
}

function fecharModalItem() {
  atendimentoState.itemModalBase = null;
  atendimentoState.itemModalDraft = null;
  if (atdModalItem) atdModalItem.style.display = "none";
}

function abrirModalItem(item) {
  if (!item || !atdModalItem) return;
  atendimentoState.itemModalBase = { ...item };
  atendimentoState.itemModalDraft = {
    id: item.id,
    nome: item.nome,
    preco: toNumber(item.preco, 0),
    categoria: item.categoria || "",
    img: item.img || "",
    qtd: 1,
    adicionais: [],
    removidos: [],
    obs: "",
  };
  if (atdItemModalTitulo) atdItemModalTitulo.textContent = `Adicionar - ${item.nome}`;
  if (atdItemModalQtd) atdItemModalQtd.value = "1";
  if (atdItemModalPreco) atdItemModalPreco.value = toNumber(item.preco, 0).toFixed(2);
  if (atdItemModalObs) atdItemModalObs.value = "";
  atdModalItem.style.display = "flex";
}

function salvarDraftModalItem() {
  const draft = atendimentoState.itemModalDraft;
  if (!draft) return null;
  draft.qtd = Math.max(parseInt(atdItemModalQtd?.value || "1", 10) || 1, 1);
  draft.preco = Math.max(toNumber(atdItemModalPreco?.value, draft.preco), 0);
  draft.obs = texto(atdItemModalObs?.value);
  return draft;
}

function confirmarModalItem() {
  const draft = salvarDraftModalItem();
  if (!draft) return;
  adicionarItem(draft);
  fecharModalItem();
}

function abrirAdicionaisDoModalItem() {
  const draft = salvarDraftModalItem();
  if (!draft) return;
  atendimentoState.carrinho.push({
    ...draft,
    adicionais: normalizarAdicionais(draft.adicionais),
  });
  const index = atendimentoState.carrinho.length - 1;
  abrirModalAdicionais(index);
  fecharModalItem();
  renderCarrinho();
}

function adicionarItem(item) {
  const existente = atendimentoState.carrinho.find((c) => c.id === item.id && itemSemCustomizacao(c) && itemSemCustomizacao(item));
  if (existente) {
    existente.qtd += Math.max(parseInt(item.qtd, 10) || 1, 1);
  } else {
    atendimentoState.carrinho.push({
      id: item.id,
      nome: item.nome,
      preco: toNumber(item.preco, 0),
      categoria: item.categoria || "",
      img: item.img || "",
      qtd: Math.max(parseInt(item.qtd, 10) || 1, 1),
      adicionais: normalizarAdicionais(item.adicionais || []),
      removidos: [],
      obs: texto(item.obs || ""),
    });
  }
  limparResultado();
  renderCarrinho();
}

function alterarQtd(index, delta) {
  const item = atendimentoState.carrinho[index];
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) atendimentoState.carrinho.splice(index, 1);
  renderCarrinho();
}

function removerItem(index) {
  atendimentoState.carrinho.splice(index, 1);
  renderCarrinho();
}

function editarObsItem(index) {
  const item = atendimentoState.carrinho[index];
  if (!item) return;
  const atual = String(item.obs || "");
  const valor = window.prompt(`Observacao para ${item.nome}:`, atual);
  if (valor === null) return;
  item.obs = texto(valor);
  renderCarrinho();
}

function fecharModalAdicionais() {
  atendimentoState.itemAdicionalIndex = -1;
  if (atdModalAdicionais) atdModalAdicionais.style.display = "none";
}

function abrirModalAdicionais(index) {
  const item = atendimentoState.carrinho[index];
  if (!item) return;
  if (!Array.isArray(atendimentoState.adicionais) || !atendimentoState.adicionais.length) {
    setResultado("Nao ha adicionais cadastrados.", "err");
    return;
  }
  atendimentoState.itemAdicionalIndex = index;
  if (atdAdicionaisTitulo) atdAdicionaisTitulo.textContent = `Adicionais - ${item.nome}`;
  if (!atdAdicionaisLista) return;

  const atuais = new Map(normalizarAdicionais(item.adicionais).map((add) => [add.nome.toLowerCase(), add]));
  atdAdicionaisLista.innerHTML = atendimentoState.adicionais
    .map((add, idx) => {
      const nome = texto(add.nome);
      const preco = Math.max(toNumber(add.preco, 0), 0);
      const atual = atuais.get(nome.toLowerCase());
      const checked = atual ? "checked" : "";
      const qtd = atual ? atual.qtd : 1;
      return `
        <label class="atd-add-row">
          <input type="checkbox" data-idx="${idx}" ${checked}>
          <span class="nome">${escapeHtml(nome)}</span>
          <span class="preco">${moeda(preco)}</span>
          <input type="number" min="1" max="20" value="${qtd}" data-qtd="${idx}">
        </label>
      `;
    })
    .join("");

  if (atdModalAdicionais) atdModalAdicionais.style.display = "flex";
}

function salvarAdicionaisItem() {
  const index = atendimentoState.itemAdicionalIndex;
  const item = atendimentoState.carrinho[index];
  if (!item || !atdAdicionaisLista) return;

  const checks = Array.from(atdAdicionaisLista.querySelectorAll("input[type='checkbox'][data-idx]"));
  const novos = [];

  checks.forEach((checkEl) => {
    const idx = Number(checkEl.dataset.idx);
    if (!checkEl.checked || !Number.isFinite(idx)) return;
    const base = atendimentoState.adicionais[idx];
    if (!base) return;
    const qtdInput = atdAdicionaisLista.querySelector(`input[data-qtd='${idx}']`);
    const qtd = Math.max(parseInt(qtdInput?.value, 10) || 1, 1);
    novos.push({
      nome: texto(base.nome),
      preco: Math.max(toNumber(base.preco, 0), 0),
      qtd,
    });
  });

  item.adicionais = normalizarAdicionais(novos);
  fecharModalAdicionais();
  renderCarrinho();
}

function montarPayloadPedido() {
  const tipoSelecionado = texto(atdTipoEntrega?.value || "retirada").toLowerCase();
  const tipo =
    tipoSelecionado === "entrega"
      ? "entrega"
      : tipoSelecionado === "retirada_porta"
        ? "retirada (cliente na porta)"
        : "retirada";
  const origemPadrao = tipoSelecionado === "retirada_porta" ? "porta" : "outro";
  const origemPedido = texto(atdOrigem?.value || origemPadrao).toLowerCase();
  const taxaEntrega = tipo === "entrega" ? calcularTaxa() : 0;
  const pagamentosDetalhes = pagamentoDivididoAtivoAtd() ? coletarPagamentosDivididosAtd() : [];
  const pagamento = pagamentoDivididoAtivoAtd() ? "dividido" : texto(atdPagamento?.value || "dinheiro");
  const trocoValor = pagamentoDivididoAtivoAtd()
    ? (pagamentoDivididoContemMetodoAtd("dinheiro") ? texto(atdTroco?.value) : "")
    : (pagamento === "dinheiro" ? texto(atdTroco?.value) : "");
  const endereco =
    tipo === "entrega"
      ? texto(atdEndereco?.value)
      : tipoSelecionado === "retirada_porta"
        ? "Cliente aguardando na porta"
        : "Retirada no balcao";

  return {
    cliente: texto(atdCliente?.value) || "Cliente do balcao",
    telefone: texto(atdTelefone?.value),
    endereco,
    tipoEntrega: tipo,
    origemPedido,
    pagamento,
    pagamentosDetalhes,
    troco: trocoValor,
    chavePix: "",
    carrinho: atendimentoState.carrinho.map((item) => ({
      nome: item.nome,
      preco: item.preco,
      qtd: item.qtd,
      categoria: item.categoria,
      img: item.img,
      adicionais: normalizarAdicionais(item.adicionais),
      removidos: Array.isArray(item.removidos) ? item.removidos : [],
      obs: texto(item.obs || ""),
    })),
    obsGeral: texto(atdObs?.value),
    taxaEntrega,
  };
}

function validarPedido(payload) {
  if (!payload.carrinho.length) return "Adicione pelo menos um item.";
  if (!payload.cliente) return "Informe o nome do cliente.";
  if (payload.tipoEntrega === "entrega" && !payload.endereco) {
    return "Informe o endereco para entrega.";
  }
  if (pagamentoDivididoAtivoAtd()) {
    if (!Array.isArray(payload.pagamentosDetalhes) || payload.pagamentosDetalhes.length < 2) {
      return "Pagamento dividido precisa de pelo menos 2 formas.";
    }
    const soma = payload.pagamentosDetalhes.reduce((acc, x) => acc + Number(x.valor || 0), 0);
    if (Math.abs(soma - totalPedidoAtd()) > 0.05) {
      return "A soma do pagamento dividido precisa bater com o total.";
    }
  }
  return "";
}

function limparPedido() {
  atendimentoState.carrinho = [];
  if (atdCliente) atdCliente.value = "";
  if (atdTelefone) atdTelefone.value = "";
  if (atdTipoEntrega) atdTipoEntrega.value = "retirada";
  if (atdOrigem) atdOrigem.value = "outro";
  if (atdPagamento) atdPagamento.value = "dinheiro";
  if (atdPagamentoDividido) atdPagamentoDividido.checked = false;
  if (atdPagamentosDivididosLista) atdPagamentosDivididosLista.innerHTML = "";
  if (atdEndereco) atdEndereco.value = "";
  if (atdTaxa) atdTaxa.value = "9";
  if (atdTroco) atdTroco.value = "";
  if (atdObs) atdObs.value = "";
  toggleCamposEntrega();
  toggleCamposPagamento();
  atualizarResumoPagamentoDivididoAtd();
  limparResultado();
  renderCarrinho();
}

async function finalizarPedido() {
  const payload = montarPayloadPedido();
  const erro = validarPedido(payload);
  if (erro) {
    setResultado(erro, "err");
    return;
  }

  if (atdFinalizar) atdFinalizar.disabled = true;
  try {
    const res = await fetch("/pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      const msg = data?.message || "Nao foi possivel finalizar o pedido.";
      setResultado(msg, "err");
      return;
    }

    const pedidoId = data?.pedidoId ? ` #${data.pedidoId}` : "";
    setResultado(`Pedido${pedidoId} criado com sucesso.`, "ok");
    atendimentoState.carrinho = [];
    if (atdEndereco) atdEndereco.value = "";
    if (atdTroco) atdTroco.value = "";
    if (atdObs) atdObs.value = "";
    renderCarrinho();
  } catch (err) {
    console.error(err);
    setResultado("Erro ao enviar pedido.", "err");
  } finally {
    if (atdFinalizar) atdFinalizar.disabled = false;
  }
}

async function carregarDados() {
  const [resItens, resConfig, resAdicionais] = await Promise.all([
    authFetch("/adminn/cardapio"),
    authFetch("/adminn/config"),
    authFetch("/adminn/adicionais"),
  ]);
  const itens = await resItens.json();
  const config = await resConfig.json();
  const adicionais = await resAdicionais.json();

  atendimentoState.itens = Array.isArray(itens)
    ? itens
        .map((item) => ({
          id: item.id,
          nome: texto(item.nome),
          preco: toNumber(item.preco, 0),
          categoria: texto(item.categoria),
          disponivel: item.disponivel !== false,
          img: item.img || "",
        }))
        .filter((item) => item.nome && item.preco >= 0)
    : [];

  atendimentoState.adicionais = Array.isArray(adicionais)
    ? adicionais
        .map((add) => ({
          nome: texto(add.nome),
          preco: Math.max(toNumber(add.preco, 0), 0),
        }))
        .filter((add) => add.nome)
    : [];

  const categorias = Array.from(
    new Set(atendimentoState.itens.map((item) => item.categoria).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  if (atdCategoria) {
    atdCategoria.innerHTML = '<option value="todos">Todas as categorias</option>';
    categorias.forEach((categoria) => {
      const opt = document.createElement("option");
      opt.value = categoria;
      opt.textContent = categoria;
      atdCategoria.appendChild(opt);
    });
  }

  if (atdTaxa) {
    const taxaDefault = toNumber(config?.taxa_entrega, 9);
    atdTaxa.value = String(taxaDefault);
  }

  renderProdutos();
  renderCarrinho();
}

function bindEventos() {
  atdBusca?.addEventListener("input", renderProdutos);
  atdCategoria?.addEventListener("change", renderProdutos);
  atdTipoEntrega?.addEventListener("change", () => {
    toggleCamposEntrega();
    atualizarTotais();
    if (atdOrigem) {
      if (atdTipoEntrega?.value === "retirada_porta") {
        atdOrigem.value = "porta";
      } else if (atdOrigem.value === "porta") {
        atdOrigem.value = "outro";
      }
    }
  });
  atdPagamento?.addEventListener("change", toggleCamposPagamento);
  atdPagamentoDividido?.addEventListener("change", () => {
    if (pagamentoDivididoAtivoAtd() && atdPagamentosDivididosLista && !atdPagamentosDivididosLista.children.length) {
      renderPagamentosDivididosAtd();
    }
    toggleCamposPagamento();
    atualizarResumoPagamentoDivididoAtd();
  });
  atdAddPagamentoDividido?.addEventListener("click", () => {
    adicionarLinhaPagamentoDivididoAtd();
    atualizarResumoPagamentoDivididoAtd();
  });
  atdTaxa?.addEventListener("input", atualizarTotais);
  atdLimpar?.addEventListener("click", limparPedido);
  atdFinalizar?.addEventListener("click", finalizarPedido);
  atdAdicionaisCancelar?.addEventListener("click", fecharModalAdicionais);
  atdAdicionaisSalvar?.addEventListener("click", salvarAdicionaisItem);
  atdItemModalCancelar?.addEventListener("click", fecharModalItem);
  atdItemModalConfirmar?.addEventListener("click", confirmarModalItem);
  atdItemModalAdicionais?.addEventListener("click", abrirAdicionaisDoModalItem);

  atdCarrinho?.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;
    const container = target.closest(".atd-item-acoes");
    if (!container) return;
    const index = Number(container.dataset.index);
    if (!Number.isFinite(index)) return;

    if (action === "plus") alterarQtd(index, 1);
    if (action === "minus") alterarQtd(index, -1);
    if (action === "adds") abrirModalAdicionais(index);
    if (action === "obs") editarObsItem(index);
    if (action === "remove") removerItem(index);
  });

  atdModalAdicionais?.addEventListener("click", (ev) => {
    if (ev.target === atdModalAdicionais) fecharModalAdicionais();
  });
  atdModalItem?.addEventListener("click", (ev) => {
    if (ev.target === atdModalItem) fecharModalItem();
  });
}

window.addEventListener("load", async () => {
  bindEventos();
  toggleCamposEntrega();
  toggleCamposPagamento();
  renderPagamentosDivididosAtd();
  try {
    await carregarDados();
  } catch (err) {
    console.error(err);
    setResultado("Erro ao carregar dados do atendimento.", "err");
  }
});
