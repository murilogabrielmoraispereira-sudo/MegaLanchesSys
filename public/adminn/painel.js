const painelEls = {
  pedidosAbertos: document.getElementById("kpi-pedidos-abertos"),
  tempoMedio: document.getElementById("kpi-tempo-medio"),
  wppStatus: document.getElementById("kpi-wpp-status"),
};

function setPainelSkeleton() {
  Object.values(painelEls).forEach((el) => {
    if (!el) return;
    el.classList.add("skeleton-text");
    el.textContent = " ";
  });
}

function clearPainelSkeleton() {
  Object.values(painelEls).forEach((el) => {
    if (!el) return;
    el.classList.remove("skeleton-text");
  });
}

function fmtMin(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "0 min";
  return `${Math.round(n)} min`;
}

function pulseKpi(el, value) {
  if (!el) return;
  const novo = String(value ?? "--");
  const atual = String(el.textContent ?? "");
  el.textContent = novo;
  if (novo === atual) return;
  const card = el.closest(".resumo-card");
  if (!card) return;
  card.classList.remove("kpi-update");
  void card.offsetWidth;
  card.classList.add("kpi-update");
  setTimeout(() => card.classList.remove("kpi-update"), 560);
}

async function carregarMetricasPainel() {
  try {
    const res = await authFetch("/adminn/dashboard/metricas");
    if (!res.ok) throw new Error("metricas_fail");
    const data = await res.json();
    pulseKpi(painelEls.pedidosAbertos, String(data.pedidosAbertos ?? 0));
    pulseKpi(painelEls.tempoMedio, fmtMin(data.tempoMedioAbertosMin));
    pulseKpi(painelEls.wppStatus, String(data.wppStatus || "--"));
  } catch (err) {
    console.error(err);
    pulseKpi(painelEls.wppStatus, "ERRO");
  } finally {
    clearPainelSkeleton();
  }
}

function initPainel() {
  requestAnimationFrame(() => document.body.classList.add("ready"));
  setPainelSkeleton();
  carregarMetricasPainel();
  setInterval(carregarMetricasPainel, 12000);
}

document.addEventListener("DOMContentLoaded", initPainel);
