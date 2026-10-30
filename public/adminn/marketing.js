const combosTable = document.querySelector("#combos-table tbody");
const cuponsTable = document.querySelector("#cupons-table tbody");
const btnGerarSugestoes = document.getElementById("btn-gerar-sugestoes");
const btnToggleCombos = document.getElementById("btn-toggle-combos");
const combosAutomaticosStatus = document.getElementById("combos-automaticos-status");
const combosAutomaticosDescricao = document.getElementById("combos-automaticos-descricao");
const marketingAviso = document.getElementById("marketing-aviso");
const comboAdicionar = document.getElementById("combo-adicionar");
const comboNome = document.getElementById("combo-nome");
const comboItens = document.getElementById("combo-itens");
const comboPreco = document.getElementById("combo-preco");
const comboImgFile = document.getElementById("combo-img-file");
const comboImg = document.getElementById("combo-img");
const cupomAdicionar = document.getElementById("cupom-adicionar");
const cupomCodigo = document.getElementById("cupom-codigo");
const cupomTipo = document.getElementById("cupom-tipo");
const cupomValor = document.getElementById("cupom-valor");
const cupomMinimo = document.getElementById("cupom-minimo");
const cupomExpira = document.getElementById("cupom-expira");
const clientesTable = document.querySelector("#clientes-table tbody");
const clientesBusca = document.getElementById("clientes-busca");
const clientesSegmento = document.getElementById("clientes-segmento");
const clientesAtualizar = document.getElementById("clientes-atualizar");
const clientesPaginaInfo = document.getElementById("clientes-pagina-info");
const clientesPaginaAnterior = document.getElementById("clientes-pagina-anterior");
const clientesPaginaProxima = document.getElementById("clientes-pagina-proxima");
const clientesTotal = document.getElementById("clientes-total");
const clientesPedidos = document.getElementById("clientes-pedidos");
const clientesRecorrentes = document.getElementById("clientes-recorrentes");
const clientesVip = document.getElementById("clientes-vip");
const clientesSumidos = document.getElementById("clientes-sumidos");
const clientesFaturamento = document.getElementById("clientes-faturamento");
const interessesTable = document.querySelector("#interesses-table tbody");
const interessesPeriodo = document.getElementById("interesses-periodo");
const interessesAtualizar = document.getElementById("interesses-atualizar");
const interessesMaisVisto = document.getElementById("interesses-mais-visto");
const interessesVisualizacoes = document.getElementById("interesses-visualizacoes");
const interessesAdicoes = document.getElementById("interesses-adicoes");
const interessesVendidos = document.getElementById("interesses-vendidos");
const interessesMaisAdicionado = document.getElementById("interesses-mais-adicionado");
const interessesMaisComprado = document.getElementById("interesses-mais-comprado");

let combosCache = [];
let comboEditId = null;
let combosAutomaticosAtivos = true;
let clientesPagina = 1;
let clientesTotalPaginas = 1;

function mostrarAvisoMarketing(texto) {
  if (!marketingAviso) return;
  marketingAviso.textContent = texto;
  marketingAviso.style.display = "block";
  window.clearTimeout(mostrarAvisoMarketing.timer);
  mostrarAvisoMarketing.timer = window.setTimeout(() => {
    marketingAviso.style.display = "none";
  }, 3500);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseItensCombo(value) {
  return String(value || "")
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
}

function dinheiro(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(value) {
  if (!value) return "-";
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? "-" : data.toLocaleString("pt-BR");
}

function nomeSegmento(value) {
  const nomes = { novo: "Novo", ativo: "Ativo", recorrente: "Recorrente", vip: "VIP", sumido: "Sumido" };
  return nomes[String(value || "").toLowerCase()] || "Ativo";
}

async function carregarInteresses() {
  if (!interessesTable) return;
  interessesTable.innerHTML = '<tr><td colspan="7">Carregando interesse nos produtos...</td></tr>';
  const periodo = String(interessesPeriodo?.value || "30");
  const res = await authFetch(`/adminn/marketing/interesses?periodo=${encodeURIComponent(periodo)}`);
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(data?.error || "interesses_error");
  const stats = data.stats || {};
  if (interessesMaisVisto) interessesMaisVisto.textContent = stats.maisVisto || "-";
  if (interessesVisualizacoes) interessesVisualizacoes.textContent = Number(stats.visualizacoes || 0).toLocaleString("pt-BR");
  if (interessesAdicoes) interessesAdicoes.textContent = Number(stats.adicoesCarrinho || 0).toLocaleString("pt-BR");
  if (interessesVendidos) interessesVendidos.textContent = Number(stats.vendidos || 0).toLocaleString("pt-BR");
  if (interessesMaisAdicionado) interessesMaisAdicionado.textContent = stats.maisAdicionado || "-";
  if (interessesMaisComprado) interessesMaisComprado.textContent = stats.maisComprado || "-";
  interessesTable.innerHTML = "";
  (Array.isArray(data.items) ? data.items : []).forEach((item, index) => {
    const tr = document.createElement("tr");
    const imagem = item.img
      ? `<img class="interesse-produto-img" src="${escapeHtml(item.img)}" alt="">`
      : '<span class="interesse-produto-img vazio">-</span>';
    tr.innerHTML = `
      <td class="interesse-posicao">${index + 1}</td>
      <td><span class="interesse-produto">${imagem}<span><strong>${escapeHtml(item.produtoNome)}</strong><small>${escapeHtml(item.categoria || "Sem categoria")}</small></span></span></td>
      <td class="cliente-metrica">${Number(item.visualizacoes || 0).toLocaleString("pt-BR")}</td>
      <td class="cliente-metrica">${Number(item.visitantes || 0).toLocaleString("pt-BR")}</td>
      <td class="cliente-metrica">${Number(item.adicoesCarrinho || 0).toLocaleString("pt-BR")}</td>
      <td><span class="interesse-taxa">${Number(item.taxaInteresse || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span></td>
      <td class="cliente-metrica">${Number(item.vendidos || 0).toLocaleString("pt-BR")}</td>
    `;
    interessesTable.appendChild(tr);
  });
  if (!interessesTable.children.length) {
    interessesTable.innerHTML = '<tr><td colspan="7">Ainda nao existem visualizacoes registradas neste periodo.</td></tr>';
  }
}

interessesPeriodo?.addEventListener("change", () => carregarInteresses().catch(console.error));
interessesAtualizar?.addEventListener("click", () => carregarInteresses().catch(console.error));

async function carregarClientes() {
  if (!clientesTable) return;
  const params = new URLSearchParams();
  const busca = String(clientesBusca?.value || "").trim();
  const segmento = String(clientesSegmento?.value || "todos");
  if (busca) params.set("busca", busca);
  params.set("segmento", segmento);
  params.set("pagina", String(clientesPagina));
  params.set("limite", "75");
  const res = await authFetch(`/adminn/marketing/clientes?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(data?.error || "clientes_error");
  const stats = data.stats || {};
  if (clientesTotal) clientesTotal.textContent = Number(stats.clientes || 0);
  if (clientesPedidos) clientesPedidos.textContent = Number(stats.pedidosAcumulados || 0);
  if (clientesRecorrentes) clientesRecorrentes.textContent = Number(stats.recorrentes || 0);
  if (clientesVip) clientesVip.textContent = Number(stats.vip || 0);
  if (clientesSumidos) clientesSumidos.textContent = Number(stats.sumidos || 0);
  if (clientesFaturamento) clientesFaturamento.textContent = dinheiro(stats.faturamentoIdentificado);
  const pagination = data.pagination || {};
  clientesPagina = Number(pagination.pagina || 1);
  clientesTotalPaginas = Number(pagination.totalPaginas || 1);
  if (clientesPaginaInfo) {
    const totalItems = Number(pagination.totalItems || 0);
    clientesPaginaInfo.textContent = `${totalItems} cliente(s) encontrado(s) | Pagina ${clientesPagina} de ${clientesTotalPaginas}`;
  }
  if (clientesPaginaAnterior) clientesPaginaAnterior.disabled = clientesPagina <= 1;
  if (clientesPaginaProxima) clientesPaginaProxima.disabled = clientesPagina >= clientesTotalPaginas;
  clientesTable.innerHTML = "";
  (Array.isArray(data.items) ? data.items : []).forEach((cliente) => {
    const telefone = String(cliente.telefone || "").replace(/\D/g, "");
    const segmento = String(cliente.segmento || "ativo").toLowerCase();
    const preferencias = (Array.isArray(cliente.aprendizado?.preferenciasRecorrentes)
      ? cliente.aprendizado.preferenciasRecorrentes
      : [])
      .slice(0, 3)
      .map((item) => `${item.tipo === "remover" ? "Sem" : "+"} ${item.nome} (${item.ocorrencias}x)`)
      .join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="cliente-identidade"><strong>${escapeHtml(cliente.nome)}</strong><small>${escapeHtml(cliente.telefone || "Telefone nao informado")}</small></span></td>
      <td><span class="cliente-segmento ${escapeHtml(segmento)}">${escapeHtml(nomeSegmento(segmento))}</span></td>
      <td class="cliente-metrica">${Number(cliente.pedidosCount || 0)}</td>
      <td class="cliente-metrica">${escapeHtml(dinheiro(cliente.totalGasto))}</td>
      <td class="cliente-metrica">${escapeHtml(dinheiro(cliente.ticketMedio))}</td>
      <td>${escapeHtml(cliente.produtoFavorito || "-")}</td>
      <td>${escapeHtml(preferencias || "Ainda sem padrao recorrente")}</td>
      <td class="cliente-data">${escapeHtml(dataHora(cliente.ultimoPedido))}${Number.isFinite(Number(cliente.diasSemComprar)) ? `<br><small>${Number(cliente.diasSemComprar)} dia(s) sem comprar</small>` : ""}</td>
      <td class="cliente-whatsapp">${telefone ? `<a class="btn outline small" href="https://wa.me/${encodeURIComponent(telefone)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : "-"}</td>
    `;
    clientesTable.appendChild(tr);
  });
  if (!clientesTable.children.length) {
    clientesTable.innerHTML = '<tr><td colspan="9">Nenhum cliente encontrado.</td></tr>';
  }
}

function atualizarControleCombos() {
  if (combosAutomaticosStatus) {
    combosAutomaticosStatus.textContent = combosAutomaticosAtivos ? "Geracao automatica ativa" : "Geracao automatica pausada";
    combosAutomaticosStatus.classList.toggle("is-paused", !combosAutomaticosAtivos);
  }
  if (combosAutomaticosDescricao) {
    combosAutomaticosDescricao.textContent = combosAutomaticosAtivos
      ? "O sistema pode criar novas sugestoes automaticamente as 19:00 (horario de Brasilia)."
      : "Novas sugestoes estao pausadas. Os combos que ja existem continuam como estavam.";
  }
  if (btnToggleCombos) {
    btnToggleCombos.disabled = false;
    btnToggleCombos.textContent = combosAutomaticosAtivos ? "Parar geracao automatica" : "Ativar geracao automatica";
    btnToggleCombos.classList.toggle("danger", combosAutomaticosAtivos);
    btnToggleCombos.classList.toggle("primary", !combosAutomaticosAtivos);
  }
  if (btnGerarSugestoes) {
    btnGerarSugestoes.disabled = !combosAutomaticosAtivos;
    btnGerarSugestoes.title = combosAutomaticosAtivos ? "" : "Ative a geracao para criar novas sugestoes.";
  }
}

async function carregarConfigCombos() {
  const res = await authFetch("/adminn/marketing/combos-config");
  const data = await res.json();
  if (!res.ok || data?.success === false) throw new Error(data?.error || "combos_config_error");
  combosAutomaticosAtivos = data.ativo !== false;
  atualizarControleCombos();
}

async function alternarGeracaoCombos() {
  if (!btnToggleCombos) return;
  btnToggleCombos.disabled = true;
  try {
    const proximoEstado = !combosAutomaticosAtivos;
    const res = await authFetch("/adminn/marketing/combos-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: proximoEstado }),
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) throw new Error(data?.error || "combos_config_save_error");
    combosAutomaticosAtivos = data.ativo === true;
    atualizarControleCombos();
    mostrarAvisoMarketing(combosAutomaticosAtivos ? "Geracao automatica de combos ativada." : "Geracao automatica de combos pausada.");
  } catch (err) {
    console.error(err);
    mostrarAvisoMarketing("Nao foi possivel alterar a geracao de combos.");
    atualizarControleCombos();
  }
}

let clientesBuscaTimer = null;
clientesBusca?.addEventListener("input", () => {
  clearTimeout(clientesBuscaTimer);
  clientesPagina = 1;
  clientesBuscaTimer = setTimeout(() => carregarClientes().catch(console.error), 350);
});
clientesSegmento?.addEventListener("change", () => {
  clientesPagina = 1;
  carregarClientes().catch(console.error);
});
clientesAtualizar?.addEventListener("click", () => carregarClientes().catch(console.error));
clientesPaginaAnterior?.addEventListener("click", () => {
  if (clientesPagina <= 1) return;
  clientesPagina -= 1;
  carregarClientes().catch(console.error);
});
clientesPaginaProxima?.addEventListener("click", () => {
  if (clientesPagina >= clientesTotalPaginas) return;
  clientesPagina += 1;
  carregarClientes().catch(console.error);
});

function limparFormCombo() {
  comboEditId = null;
  if (comboNome) comboNome.value = "";
  if (comboItens) comboItens.value = "";
  if (comboPreco) comboPreco.value = "";
  if (comboImg) comboImg.value = "";
  if (comboImgFile) comboImgFile.value = "";
  if (comboAdicionar) comboAdicionar.textContent = "Adicionar combo";
}

async function uploadImagemCombo(file) {
  const formData = new FormData();
  formData.append("imagem", file);
  const res = await authFetch("/adminn/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok || !data?.success || !data?.imageUrl) {
    throw new Error("Falha no upload");
  }
  return data.imageUrl;
}

async function carregarCombos() {
  const res = await authFetch("/adminn/marketing/combos");
  const data = await res.json();
  combosCache = Array.isArray(data) ? data : [];
  combosTable.innerHTML = "";

  combosCache.forEach((c) => {
    const tr = document.createElement("tr");
    const foto = c.img
      ? `<img src="${escapeHtml(c.img)}" alt="Combo" style="width:64px;height:64px;object-fit:cover;border-radius:8px;">`
      : "<span>-</span>";
    tr.innerHTML = `
      <td>${escapeHtml(c.nome)}</td>
      <td>${foto}</td>
      <td>${Array.isArray(c.itens) ? c.itens.map(escapeHtml).join(", ") : ""}</td>
      <td>R$ ${Number(c.preco || 0).toFixed(2)}</td>
      <td>${c.sugestao ? "Sim" : "Não"}</td>
      <td>${c.ativo ? "Sim" : "Não"}</td>
      <td>
        <button class="btn outline" data-editar="${c.id}">Editar</button>
        <button class="btn outline" data-ativar="${c.id}" data-ativo="${c.ativo ? "0" : "1"}">
          ${c.ativo ? "Desativar" : "Ativar"}
        </button>
        <button class="btn ghost" data-remover="${c.id}">Remover</button>
      </td>
    `;
    combosTable.appendChild(tr);
  });
}

function preencherFormCombo(combo) {
  comboEditId = combo.id;
  if (comboNome) comboNome.value = combo.nome || "";
  if (comboItens) comboItens.value = Array.isArray(combo.itens) ? combo.itens.join(", ") : "";
  if (comboPreco) comboPreco.value = Number(combo.preco || 0).toFixed(2);
  if (comboImg) comboImg.value = combo.img || "";
  if (comboImgFile) comboImgFile.value = "";
  if (comboAdicionar) comboAdicionar.textContent = "Salvar edição";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function salvarCombo() {
  const nome = String(comboNome?.value || "").trim();
  const itens = parseItensCombo(comboItens?.value || "");
  const preco = Number.parseFloat(comboPreco?.value || "");
  const img = String(comboImg?.value || "").trim();

  if (!nome || !itens.length || !Number.isFinite(preco) || preco <= 0) {
    alert("Preencha nome, itens e preço válido do combo.");
    return;
  }

  const payload = {
    nome,
    itens,
    preco,
    img,
    ativo: true
  };

  const url = comboEditId
    ? `/adminn/marketing/combos/${comboEditId}`
    : "/adminn/marketing/combos";
  const method = comboEditId ? "PUT" : "POST";

  const res = await authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert("Não foi possível salvar o combo.");
    return;
  }

  limparFormCombo();
  await carregarCombos();
}

async function carregarCupons() {
  const res = await authFetch("/adminn/marketing/cupons");
  const data = await res.json();
  cuponsTable.innerHTML = "";
  data.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.codigo}</td>
      <td>${c.tipo}</td>
      <td>${Number(c.valor).toFixed(2)}</td>
      <td>${Number(c.minimo || 0).toFixed(2)}</td>
      <td>${c.expira_em || "-"}</td>
      <td>${c.ativo ? "Sim" : "Não"}</td>
      <td>
        <button class="btn outline" data-ativar-cupom="${c.id}" data-ativo="${c.ativo ? "0" : "1"}">
          ${c.ativo ? "Desativar" : "Ativar"}
        </button>
        <button class="btn ghost" data-remover-cupom="${c.id}">Remover</button>
      </td>
    `;
    cuponsTable.appendChild(tr);
  });
}

if (btnGerarSugestoes) {
  btnGerarSugestoes.onclick = async () => {
    btnGerarSugestoes.disabled = true;
    try {
      const res = await authFetch("/adminn/marketing/gerar-sugestoes", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error || "combo_generation_error");
      mostrarAvisoMarketing(data.generated > 0 ? `${data.generated} sugestao(oes) criada(s).` : "Nenhuma nova sugestao foi criada agora.");
      await carregarCombos();
    } catch (err) {
      console.error(err);
      mostrarAvisoMarketing("Nao foi possivel gerar sugestoes agora.");
    } finally {
      atualizarControleCombos();
    }
  };
}

btnToggleCombos?.addEventListener("click", alternarGeracaoCombos);

if (comboImgFile) {
  comboImgFile.addEventListener("change", async () => {
    const file = comboImgFile.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await uploadImagemCombo(file);
      if (comboImg) comboImg.value = imageUrl;
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar foto do combo.");
    }
  });
}

if (comboAdicionar) {
  comboAdicionar.onclick = salvarCombo;
}

if (cupomAdicionar) {
  cupomAdicionar.onclick = async () => {
    const codigo = (cupomCodigo.value || "").trim();
    const tipo = cupomTipo.value;
    const valor = parseFloat(cupomValor.value);
    const minimo = parseFloat(cupomMinimo.value || "0");
    const expira_em = cupomExpira.value || "";
    if (!codigo || !valor) return;
    await authFetch("/adminn/marketing/cupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, tipo, valor, minimo, expira_em, ativo: true })
    });
    cupomCodigo.value = "";
    cupomValor.value = "";
    cupomMinimo.value = "";
    cupomExpira.value = "";
    carregarCupons();
  };
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.editar) {
    const id = Number.parseInt(btn.dataset.editar, 10);
    const combo = combosCache.find((c) => Number(c.id) === id);
    if (combo) preencherFormCombo(combo);
  }

  if (btn.dataset.ativar) {
    await authFetch(`/adminn/marketing/combos/${btn.dataset.ativar}/ativar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: btn.dataset.ativo === "1" })
    });
    carregarCombos();
  }

  if (btn.dataset.remover) {
    await authFetch(`/adminn/marketing/combos/${btn.dataset.remover}`, { method: "DELETE" });
    if (Number(btn.dataset.remover) === comboEditId) {
      limparFormCombo();
    }
    carregarCombos();
  }

  if (btn.dataset.ativarCupom) {
    await authFetch(`/adminn/marketing/cupons/${btn.dataset.ativarCupom}/ativar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: btn.dataset.ativo === "1" })
    });
    carregarCupons();
  }

  if (btn.dataset.removerCupom) {
    await authFetch(`/adminn/marketing/cupons/${btn.dataset.removerCupom}`, { method: "DELETE" });
    carregarCupons();
  }
});

carregarCombos();
carregarCupons();
carregarInteresses().catch(console.error);
carregarClientes().catch(console.error);
carregarConfigCombos().catch((err) => {
  console.error(err);
  if (combosAutomaticosStatus) combosAutomaticosStatus.textContent = "Nao foi possivel consultar";
  if (btnToggleCombos) btnToggleCombos.disabled = true;
});
