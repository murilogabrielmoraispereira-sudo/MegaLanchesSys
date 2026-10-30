const painelEls = {
  pedidosAbertos: document.getElementById("kpi-pedidos-abertos"),
  tempoMedio: document.getElementById("kpi-tempo-medio"),
  conversasNovas: document.getElementById("kpi-conversas-novas"),
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

async function carregarMetricasPainel() {
  try {
    const res = await authFetch("/adminn/dashboard/metricas");
    if (!res.ok) throw new Error("metricas_fail");
    const data = await res.json();
    if (painelEls.pedidosAbertos) painelEls.pedidosAbertos.textContent = String(data.pedidosAbertos ?? 0);
    if (painelEls.tempoMedio) painelEls.tempoMedio.textContent = fmtMin(data.tempoMedioAbertosMin);
    if (painelEls.conversasNovas) painelEls.conversasNovas.textContent = String(data.conversasNovas ?? 0);
    if (painelEls.wppStatus) painelEls.wppStatus.textContent = String(data.wppStatus || "--");
  } catch (err) {
    console.error(err);
    if (painelEls.wppStatus) painelEls.wppStatus.textContent = "ERRO";
  } finally {
    clearPainelSkeleton();
  }
}

function initPainel() {
  setPainelSkeleton();
  carregarMetricasPainel();
  setInterval(carregarMetricasPainel, 12000);
}

document.addEventListener("DOMContentLoaded", initPainel);
