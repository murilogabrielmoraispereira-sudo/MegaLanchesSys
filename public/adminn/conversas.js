const state = {
  items: [],
  resumo: { novo: 0, em_atendimento: 0, resolvido: 0 },
  autoRefresh: true,
  audioEnabled: localStorage.getItem("admin_alert_audio_conversas") !== "0",
  lastNovoCount: null,
};

const els = {
  logout: document.getElementById("btn-logout"),
  refresh: document.getElementById("btn-refresh"),
  busca: document.getElementById("filtro-busca"),
  status: document.getElementById("filtro-status"),
  autoRefresh: document.getElementById("auto-refresh"),
  audioAlerts: document.getElementById("audio-alerts"),
  kpiNovo: document.getElementById("kpi-novo"),
  kpiAtendimento: document.getElementById("kpi-em-atendimento"),
  kpiResolvido: document.getElementById("kpi-resolvido"),
  kpiWhatsapp: document.getElementById("kpi-whatsapp"),
  countNovo: document.getElementById("count-novo"),
  countAtendimento: document.getElementById("count-em-atendimento"),
  countResolvido: document.getElementById("count-resolvido"),
  listaNovo: document.getElementById("lista-novo"),
  listaAtendimento: document.getElementById("lista-em-atendimento"),
  listaResolvido: document.getElementById("lista-resolvido"),
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtDate(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whatsappLink(phone) {
  const clean = String(phone || "").replace(/\D/g, "");
  return `whatsapp://send?phone=${clean}`;
}

function waMeLink(phone, text = "") {
  const clean = String(phone || "").replace(/\D/g, "");
  const encoded = encodeURIComponent(String(text || "").trim());
  return `https://wa.me/${clean}${encoded ? `?text=${encoded}` : ""}`;
}

function tocarAlertaConversa() {
  if (!state.audioEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 740;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 220);
  } catch {
    // ignore
  }
}

function cardTemplate(item) {
  const nome = item.nome || "Sem nome";
  const telefone = item.telefone || "-";
  const msg = item.mensagem || "";
  const canal = item.canal || "-";
  const updatedAt = fmtDate(item.updated_at);
  const count = Number(item.mensagens_count || 1);
  const id = Number(item.id);
  const safeMsg = escapeHtml(msg);
  const safeNome = escapeHtml(nome);
  const safePhone = escapeHtml(telefone);
  const safeCanal = escapeHtml(canal.toUpperCase());
  return `
    <article class="conv-card">
      <div class="conv-head">
        <div class="conv-meta">
          <span class="badge canal">${safeCanal}</span>
          <span class="badge count">${count}x</span>
        </div>
        <span class="conv-time">${updatedAt}</span>
      </div>
      <div class="conv-name">${safeNome}</div>
      <div class="conv-phone">${safePhone}</div>
      <div class="conv-msg">${safeMsg}</div>
      <div class="conv-actions">
        <button class="btn-responder-resolver" data-action="responder-resolver" data-id="${id}" data-phone="${safePhone}" data-name="${safeNome}">Responder + resolver</button>
        <button class="btn-novo" data-status="novo" data-id="${id}">Novo</button>
        <button class="btn-atendimento" data-status="em_atendimento" data-id="${id}">Em atendimento</button>
        <button class="btn-resolvido" data-status="resolvido" data-id="${id}">Resolvido</button>
        <a href="${whatsappLink(telefone)}">Abrir WhatsApp</a>
      </div>
    </article>
  `;
}

function renderList(target, items) {
  if (!items.length) {
    target.innerHTML = '<div class="empty">Nenhuma conversa nesta coluna.</div>';
    return;
  }
  target.innerHTML = items.map(cardTemplate).join("");
}

function renderSkeletons() {
  const skeleton = '<div class="conv-skeleton" aria-hidden="true"></div>'.repeat(3);
  if (els.listaNovo) els.listaNovo.innerHTML = skeleton;
  if (els.listaAtendimento) els.listaAtendimento.innerHTML = skeleton;
  if (els.listaResolvido) els.listaResolvido.innerHTML = skeleton;
}

function render() {
  const novo = state.items.filter((x) => x.status === "novo");
  const emAtendimento = state.items.filter((x) => x.status === "em_atendimento");
  const resolvido = state.items.filter((x) => x.status === "resolvido");

  els.kpiNovo.textContent = String(state.resumo.novo || 0);
  els.kpiAtendimento.textContent = String(state.resumo.em_atendimento || 0);
  els.kpiResolvido.textContent = String(state.resumo.resolvido || 0);

  els.countNovo.textContent = String(novo.length);
  els.countAtendimento.textContent = String(emAtendimento.length);
  els.countResolvido.textContent = String(resolvido.length);

  renderList(els.listaNovo, novo);
  renderList(els.listaAtendimento, emAtendimento);
  renderList(els.listaResolvido, resolvido);
}

async function loadHealth() {
  try {
    const res = await authFetch("/health");
    if (!res.ok) throw new Error("health_fail");
    const data = await res.json();
    const st = data?.wpp?.current?.status || data?.wpp?.monitor?.lastStatus || "--";
    els.kpiWhatsapp.textContent = String(st).toUpperCase();
  } catch {
    els.kpiWhatsapp.textContent = "ERRO";
  }
}

async function loadPendencias() {
  const q = encodeURIComponent((els.busca.value || "").trim());
  const status = encodeURIComponent(els.status.value || "todos");
  const res = await authFetch(`/adminn/bot-conversas-pendentes?status=${status}&q=${q}`);
  if (!res.ok) throw new Error("fetch_fail");
  const data = await res.json();
  state.items = Array.isArray(data.items) ? data.items : [];
  state.resumo = data.resumo || { novo: 0, em_atendimento: 0, resolvido: 0 };
  const novoCount = Number(state.resumo.novo || 0);
  if (state.lastNovoCount !== null && novoCount > state.lastNovoCount) {
    tocarAlertaConversa();
  }
  state.lastNovoCount = novoCount;
  render();
}

async function updateStatus(id, status) {
  const res = await authFetch(`/adminn/bot-conversas-pendentes/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("status_fail");
}

function bindActions() {
  document.body.addEventListener("click", async (ev) => {
    const btnResponderResolver = ev.target.closest("button[data-action='responder-resolver'][data-id]");
    if (btnResponderResolver) {
      const id = Number(btnResponderResolver.dataset.id);
      const phone = String(btnResponderResolver.dataset.phone || "");
      const nome = String(btnResponderResolver.dataset.name || "cliente");
      if (!id || !phone) return;
      btnResponderResolver.disabled = true;
      try {
        await updateStatus(id, "resolvido");
        const msg = `Oi ${nome}, vou seguir seu atendimento agora por aqui.`;
        window.open(waMeLink(phone, msg), "_blank", "noopener");
        await loadPendencias();
      } catch (err) {
        console.error(err);
        alert("Nao foi possivel responder e resolver.");
      } finally {
        btnResponderResolver.disabled = false;
      }
      return;
    }

    const btn = ev.target.closest("button[data-status][data-id]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const status = String(btn.dataset.status || "");
    if (!id || !status) return;
    btn.disabled = true;
    try {
      await updateStatus(id, status);
      await loadPendencias();
    } catch (err) {
      console.error(err);
      alert("Nao foi possivel atualizar o status.");
    } finally {
      btn.disabled = false;
    }
  });
}

function debounce(fn, ms = 300) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

async function refreshAll() {
  await Promise.all([loadPendencias(), loadHealth()]);
}

function initEvents() {
  if (els.logout) {
    els.logout.addEventListener("click", async () => {
      await authFetch("/adminn/logout", { method: "POST" });
      window.location.href = "/adminn/login.html";
    });
  }

  if (els.refresh) {
    els.refresh.addEventListener("click", () => refreshAll().catch(console.error));
  }

  if (els.autoRefresh) {
    els.autoRefresh.addEventListener("change", () => {
      state.autoRefresh = Boolean(els.autoRefresh.checked);
    });
  }

  if (els.audioAlerts) {
    els.audioAlerts.checked = state.audioEnabled;
    els.audioAlerts.addEventListener("change", () => {
      state.audioEnabled = Boolean(els.audioAlerts.checked);
      localStorage.setItem("admin_alert_audio_conversas", state.audioEnabled ? "1" : "0");
    });
  }

  const doSearch = debounce(() => loadPendencias().catch(console.error), 250);
  if (els.busca) els.busca.addEventListener("input", doSearch);
  if (els.status) els.status.addEventListener("change", () => loadPendencias().catch(console.error));
}

async function bootstrap() {
  bindActions();
  initEvents();
  renderSkeletons();
  await refreshAll();
  setInterval(() => {
    if (!state.autoRefresh) return;
    refreshAll().catch(console.error);
  }, 12000);
}

bootstrap().catch((err) => {
  console.error(err);
  alert("Erro ao carregar painel de conversas.");
});
