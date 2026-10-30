const state = { enabled: true, page: 1, pages: 1, query: "" };
const byId = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("pt-BR") : String(value);
}

let toastTimer;
function toast(message) {
  const element = byId("ai-toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 3200);
}

async function api(url, options = {}) {
  const response = await authFetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function renderStatus(data) {
  state.enabled = Boolean(data.enabled);
  byId("kpi-orders").textContent = Number(data.counts?.pedidos || 0).toLocaleString("pt-BR");
  byId("kpi-messages").textContent = Number(data.counts?.mensagens || 0).toLocaleString("pt-BR");
  byId("kpi-customers").textContent = Number(data.counts?.clientes || 0).toLocaleString("pt-BR");
  byId("kpi-terms").textContent = Number(data.counts?.termosLigados || 0).toLocaleString("pt-BR");
  byId("kpi-pairs").textContent = Number(data.counts?.paresProdutos || 0).toLocaleString("pt-BR");
  const evaluated = Number(data.predictions?.avaliadas || 0);
  const accuracy = Number(data.predictions?.precisao || 0);
  byId("kpi-accuracy").textContent = evaluated ? `${accuracy.toFixed(1)}%` : "--";
  byId("prediction-summary").textContent = `${evaluated} avaliada(s), ${Number(data.predictions?.pendentes || 0)} pendente(s)`;
  const stabilizing = Number(data.pending?.estabilizando || 0);
  byId("pending-orders").textContent = `${Number(data.pending?.pedidos || 0)} pendentes${stabilizing ? `, ${stabilizing} estabilizando` : ""}`;
  byId("pending-messages").textContent = `${Number(data.pending?.mensagens || 0)} pendentes`;
  const dot = byId("ai-state-dot");
  dot.className = data.enabled ? "online" : "paused";
  byId("ai-state-title").textContent = data.enabled ? (data.running ? "Aprendendo agora" : "Aprendizado ativo") : "Aprendizado pausado";
  byId("ai-state-detail").textContent = data.worker?.lastError
    ? `Ultimo erro: ${data.worker.lastError}`
    : data.worker?.lastRunAt ? `Ultimo ciclo: ${dateTime(data.worker.lastRunAt)}` : "Aguardando primeiro ciclo";
  byId("btn-toggle").textContent = data.enabled ? "Pausar aprendizado" : "Ativar aprendizado";
  byId("btn-processar").disabled = !data.enabled || data.running;
  const products = Array.isArray(data.topProducts) ? data.topProducts : [];
  byId("top-products").innerHTML = products.length ? products.map((item, index) => `
    <div class="rank-item"><div><strong>${index + 1}. ${escapeHtml(item.nome)}</strong><br><span>${Number(item.pedidos || 0)} pedido(s)</span></div><strong>${Number(item.quantidade || 0)} un.</strong></div>
  `).join("") : '<p class="empty">Nenhum pedido processado.</p>';
}

function chips(items, emptyText) {
  const values = Array.isArray(items) ? items : [];
  if (!values.length) return `<span class="chip">${escapeHtml(emptyText)}</span>`;
  return values.map((item) => `<span class="chip">${escapeHtml(item.name)} (${Number(item.count || 0)}x)</span>`).join("");
}

function renderCustomers(data) {
  state.pages = Number(data.pages || 1);
  state.page = Number(data.page || 1);
  byId("page-label").textContent = `Pagina ${state.page} de ${state.pages}`;
  byId("page-prev").disabled = state.page <= 1;
  byId("page-next").disabled = state.page >= state.pages;
  const items = Array.isArray(data.items) ? data.items : [];
  byId("customer-list").innerHTML = items.length ? items.map((customer) => `
    <article class="customer-card">
      <div class="customer-title"><div><strong>${escapeHtml(customer.nome)}</strong><small>${escapeHtml(customer.telefone)}</small></div><small>${dateTime(customer.ultimoContato)}</small></div>
      <div class="customer-stats"><span><strong>${Number(customer.pedidos || 0)}</strong>pedidos</span><span><strong>${Number(customer.mensagens || 0)}</strong>mensagens</span><span><strong>${money(customer.totalGasto)}</strong>gasto</span></div>
      <div class="signal-line"><span>Produtos favoritos</span><div class="chips">${chips(customer.produtos, "Ainda sem produto")}</div></div>
      <div class="signal-line"><span>Tendencia recente</span><div class="chips">${chips(customer.produtosRecentes, "Ainda sem tendencia")}</div>${customer.mudancaHabito?.changed ? `<small class="habit-change">${escapeHtml(customer.mudancaHabito.message)}</small>` : ""}</div>
      <div class="signal-line"><span>Alteracoes recorrentes</span><div class="chips">${chips([...(customer.removidos || []), ...(customer.adicionais || [])], "Ainda sem alteracao")}</div></div>
      <div class="signal-line"><span>Padrao de compra</span><div class="chips">${chips([...(customer.pagamentos || []), ...(customer.entregas || []), ...(customer.horarios || [])], "Ainda sem padrao")}</div></div>
      <div class="signal-line"><span>Palavras frequentes</span><div class="chips">${chips(customer.termos, "Ainda sem mensagens")}</div></div>
    </article>
  `).join("") : '<p class="empty">Nenhum cliente encontrado.</p>';
}

function renderLearnings(data) {
  const terms = Array.isArray(data.terms) ? data.terms : [];
  byId("terms-body").innerHTML = terms.length ? terms.map((item) => `
    <tr><td>${escapeHtml(item.termo)}</td><td>${escapeHtml(item.produto)}</td><td>${Number(item.ocorrencias || 0)}</td><td><span class="confidence ${item.confiavel ? "trusted" : ""}">${Number(item.confianca || 0).toFixed(1)}%</span></td></tr>
  `).join("") : '<tr><td colspan="4" class="empty">A IA precisa relacionar mais mensagens e pedidos.</td></tr>';
  const pairs = Array.isArray(data.pairs) ? data.pairs : [];
  byId("pairs-list").innerHTML = pairs.length ? pairs.map((item) => `
    <div class="pair-item"><strong>${escapeHtml(item.produtoA)} + ${escapeHtml(item.produtoB)}</strong><span>${Number(item.pedidos || 0)} pedidos</span></div>
  `).join("") : '<p class="empty">Ainda sem combinacoes repetidas.</p>';
}

function renderEvents(data) {
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];
  byId("order-events").innerHTML = orders.length ? orders.map((item) => `<div class="event-row"><strong>Pedido #${escapeHtml(item.id)} - ${escapeHtml(item.nome || "sem nome")}</strong><small>${dateTime(item.ocorridoEm)} | processado ${dateTime(item.processadoEm)}</small></div>`).join("") : '<p class="empty">Nenhum evento.</p>';
  byId("message-events").innerHTML = messages.length ? messages.map((item) => `<div class="event-row"><strong>${escapeHtml(item.nome || item.telefone)}</strong><span>${escapeHtml(item.resumo)}</span><small>${dateTime(item.ocorridoEm)}${item.pedidoLigado ? ` | ligado ao pedido #${escapeHtml(item.pedidoLigado)}` : " | aguardando pedido relacionado"}</small></div>`).join("") : '<p class="empty">Nenhuma mensagem.</p>';
  const predictions = Array.isArray(data.predictions) ? data.predictions : [];
  byId("prediction-list").innerHTML = predictions.length ? predictions.map((item) => {
    const products = (Array.isArray(item.produtosPrevistos) ? item.produtosPrevistos : []).map((product) => product.name).filter(Boolean).join(", ");
    const evaluated = Boolean(item.avaliadaEm);
    const result = !evaluated ? "Pendente" : Number(item.acertou) === 1 ? "Acertou" : "Nao acertou";
    const statusClass = !evaluated ? "pending" : Number(item.acertou) === 1 ? "hit" : "miss";
    return `<div class="prediction-row"><div><strong>${escapeHtml(products || "Sem produto")}</strong><small>${escapeHtml(item.perfil || "perfil geral")} | ${dateTime(item.criadaEm)}</small></div><span class="prediction-result ${statusClass}">${result}</span></div>`;
  }).join("") : '<p class="empty">Ainda sem previsoes registradas.</p>';
}

async function loadCustomers() {
  const params = new URLSearchParams({ page: String(state.page), limit: "30" });
  if (state.query) params.set("q", state.query);
  renderCustomers(await api(`/adminn/ia-local/clientes?${params}`));
}

async function loadAll() {
  try {
    const [status, learnings, events] = await Promise.all([
      api("/adminn/ia-local/status"),
      api("/adminn/ia-local/aprendizados"),
      api("/adminn/ia-local/eventos"),
    ]);
    renderStatus(status);
    renderLearnings(learnings);
    renderEvents(events);
    await loadCustomers();
  } catch (error) {
    toast(`Nao foi possivel carregar a IA: ${error.message}`);
  }
}

byId("btn-refresh").addEventListener("click", loadAll);
byId("btn-processar").addEventListener("click", async () => {
  const button = byId("btn-processar");
  button.disabled = true;
  button.textContent = "Processando...";
  try {
    const result = await api("/adminn/ia-local/processar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    toast(`Processados: ${Number(result.orders || 0)} pedidos e ${Number(result.messages || 0)} mensagens.`);
    await loadAll();
  } catch (error) {
    toast(`Falha ao processar: ${error.message}`);
  } finally {
    button.textContent = "Processar agora";
    button.disabled = !state.enabled;
  }
});
byId("btn-toggle").addEventListener("click", async () => {
  const enabled = !state.enabled;
  try {
    await api("/adminn/ia-local/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }) });
    toast(enabled ? "Aprendizado local ativado." : "Aprendizado local pausado.");
    await loadAll();
  } catch (error) { toast(`Falha ao alterar: ${error.message}`); }
});
byId("btn-rebuild").addEventListener("click", async () => {
  if (!confirm("Reconstruir toda a memoria usando pedidos e mensagens salvos? Os dados originais nao serao apagados.")) return;
  try {
    await api("/adminn/ia-local/reconstruir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "RECONSTRUIR" }) });
    toast("Reconstrucao iniciada. O worker continuara em lotes.");
    await loadAll();
  } catch (error) { toast(`Falha ao reconstruir: ${error.message}`); }
});
byId("customer-search").addEventListener("submit", async (event) => {
  event.preventDefault();
  state.query = byId("customer-query").value.trim();
  state.page = 1;
  await loadCustomers();
});
byId("page-prev").addEventListener("click", async () => { if (state.page > 1) { state.page -= 1; await loadCustomers(); } });
byId("page-next").addEventListener("click", async () => { if (state.page < state.pages) { state.page += 1; await loadCustomers(); } });

loadAll();
setInterval(() => api("/adminn/ia-local/status").then(renderStatus).catch(() => {}), 15000);
