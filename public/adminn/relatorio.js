// ===================== RELATORIO EXECUTIVO =====================

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const inteiro = new Intl.NumberFormat("pt-BR");

const TAXA_ENTREGA = 9;

let pedidosCache = [];
let cardapioMap = {};
let filtroAtual = { inicio: null, fim: null };

function exibirFeedbackRelatorio(texto, erro = false) {
  const el = document.getElementById("relatorio-feedback");
  if (!el) return;
  el.hidden = false;
  el.textContent = texto;
  el.style.background = erro ? "rgba(220, 38, 38, 0.14)" : "rgba(16, 185, 129, 0.14)";
  el.style.color = erro ? "#991b1b" : "#065f46";
}

function setBotaoCarregando(btn, carregando) {
  if (!btn) return;
  if (!btn.dataset.originalLabel) btn.dataset.originalLabel = btn.textContent;
  btn.disabled = carregando;
  btn.textContent = carregando ? "Processando..." : btn.dataset.originalLabel;
}

async function requisicaoJsonAdmin(url, options = {}) {
  const response = await authFetch(url, options);
  const payload = await response
    .json()
    .catch(() => ({ success: false, error: "resposta_invalida" }));

  if (!response.ok || payload.success === false || payload.ok === false) {
    const msg =
      payload.message ||
      payload.error ||
      payload.body?.error ||
      `Falha na requisicao (${response.status})`;
    throw new Error(msg);
  }
  return payload;
}

function dataHojeISO() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
  return agora.toISOString().slice(0, 10);
}

function formatarMoeda(valor) {
  return moeda.format(valor || 0);
}

function formatarInteiro(valor) {
  return inteiro.format(valor || 0);
}

function formatarQtdValor(qtd, valor) {
  return `${formatarInteiro(qtd)} / ${formatarMoeda(valor)}`;
}

function formatarDataBR(dataISO) {
  return new Date(`${dataISO}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarDiaSemana(dataISO) {
  return new Date(`${dataISO}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
  });
}

async function carregarRelatorio() {
  try {
    const resPedidos = await authFetch("/adminn/relatorio/dados");
    const resCardapio = await authFetch("/adminn/cardapio-completo").catch(() => null);
    const resCardapioFallback =
      !resCardapio || !resCardapio.ok
        ? await authFetch("/adminn/cardapio").catch(() => null)
        : null;

    if (!resPedidos.ok) throw new Error("Erro ao buscar pedidos entregues");

    pedidosCache = await resPedidos.json();

    const fonteCardapio = resCardapio && resCardapio.ok ? resCardapio : resCardapioFallback;
    if (fonteCardapio && fonteCardapio.ok) {
      const cardapio = await fonteCardapio.json();
      cardapioMap = cardapio.reduce((map, item) => {
        if (item && item.nome) {
          map[item.nome.toLowerCase()] = item.categoria;
        }
        return map;
      }, {});
    }

    if (!pedidosCache || pedidosCache.length === 0) {
      atualizarPeriodoInfo(null, null, []);
      resetarPainel("Nenhum pedido entregue encontrado.");
      return;
    }

    const inputInicio = document.getElementById("data-inicio");
    const inputFim = document.getElementById("data-fim");
    let filtroInicio = null;
    let filtroFim = null;
    if (inputInicio && inputFim) {
      if (!inputInicio.value && !inputFim.value) {
        const hoje = dataHojeISO();
        inputInicio.value = hoje;
        inputFim.value = hoje;
      }
      filtroInicio = inputInicio.value || null;
      filtroFim = inputFim.value || null;
    }
    renderizarRelatorio(filtroInicio, filtroFim);
  } catch (erro) {
    console.error("Erro ao gerar relatorio:", erro);
    atualizarPeriodoInfo(null, null, []);
    resetarPainel("Erro ao carregar relatorio. Veja o console.");
  }
}

// ===================== CORRIGE QUALQUER FORMATO DE DATA =====================
function normalizarData(dataOriginal) {
  if (!dataOriginal) return new Date().toISOString().split("T")[0];

  if (dataOriginal instanceof Date) {
    return dataOriginal.toISOString().split("T")[0];
  }

  const texto = String(dataOriginal);

  if (texto.includes(",") && texto.includes("/")) {
    const [data] = texto.split(",");
    const [dia, mes, ano] = data.trim().split("/");
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  if (texto.includes("/")) {
    const [dia, mes, ano] = texto.trim().split("/");
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  if (texto.includes("-")) {
    return texto.split("T")[0];
  }

  return new Date(texto).toISOString().split("T")[0];
}

function calcularTotalPedido(pedido) {
  return MegaPricing.netSubtotal(pedido?.carrinho, pedido?.desconto);
}

function classificarItem(item) {
  if (item.categoria) return item.categoria;
  const nome = (item.nome || "").toLowerCase();
  if (cardapioMap[nome]) return cardapioMap[nome];
  if (
    nome.includes("coca") ||
    nome.includes("fanta") ||
    nome.includes("kuat") ||
    nome.includes("guarana") ||
    nome.includes("refrigerante")
  ) {
    return "refrigerante";
  }
  return "lanche";
}

function pedidoValido(pedido) {
  if (pedido.status && pedido.status !== "entregue") return false;
  const total = calcularTotalPedido(pedido);
  return total > 0;
}

function classificarTipoPedidoRelatorio(pedido) {
  const tipo = String(pedido?.tipoEntrega || "").toLowerCase();
  const origem = String(pedido?.origemPedido || "").toLowerCase();
  if (
    tipo.includes("retirada") ||
    tipo.includes("porta") ||
    tipo.includes("balcao") ||
    origem.includes("porta")
  ) {
    return "retirada";
  }
  return "entrega";
}

function obterTaxaEntregaPedido(pedido) {
  if (classificarTipoPedidoRelatorio(pedido) !== 'entrega') return 0;
  // Historical zero or missing fees must never be replaced with today's rate.
  return MegaPricing.money(pedido?.taxaEntrega ?? pedido?.taxa_entrega);
}

function normalizarMetodoPagamento(valor) {
  const txt = String(valor || "").toLowerCase();
  if (txt.includes("pix")) return "pix";
  if (txt.includes("dinheiro")) return "dinheiro";
  if (txt.includes("cartao") || txt.includes("cartÃ£o")) return "cartao";
  return "outro";
}

function calcularResumoPagamentoPedido(pedido, totalPedido) {
  const detalhes = Array.isArray(pedido?.pagamentosDetalhes) ? pedido.pagamentosDetalhes : [];
  const resumo = {
    pix: 0,
    cartao: 0,
    dinheiro: 0,
    qtdPix: 0,
    qtdCartao: 0,
    qtdDinheiro: 0,
  };

  if (detalhes.length) {
    const somaDetalhes = detalhes.reduce((acc, item) => acc + Math.max(Number(item?.valor || 0), 0), 0);
    const fator = somaDetalhes > 0 ? totalPedido / somaDetalhes : 1;
    detalhes.forEach((item) => {
      const metodo = normalizarMetodoPagamento(item?.metodo || item?.tipo || item?.forma || "");
      const valorBruto = Math.max(Number(item?.valor || 0), 0);
      const valor = valorBruto * fator;
      if (metodo === "pix") {
        resumo.pix += valor;
        resumo.qtdPix += 1;
      } else if (metodo === "dinheiro") {
        resumo.dinheiro += valor;
        resumo.qtdDinheiro += 1;
      } else if (metodo === "cartao") {
        resumo.cartao += valor;
        resumo.qtdCartao += 1;
      }
    });
    return resumo;
  }

  const metodoUnico = normalizarMetodoPagamento(pedido?.pagamento || "");
  if (metodoUnico === "pix") {
    resumo.pix = totalPedido;
    resumo.qtdPix = 1;
  } else if (metodoUnico === "dinheiro") {
    resumo.dinheiro = totalPedido;
    resumo.qtdDinheiro = 1;
  } else if (metodoUnico === "cartao") {
    resumo.cartao = totalPedido;
    resumo.qtdCartao = 1;
  }
  return resumo;
}

function atualizarPeriodoInfo(filtroInicio, filtroFim, dias) {
  const periodoEl = document.getElementById("periodo-info");
  if (!periodoEl) return;

  if (filtroInicio && filtroFim) {
    periodoEl.textContent = `Periodo: ${formatarDataBR(filtroInicio)} a ${formatarDataBR(filtroFim)}`;
    return;
  }

  if (dias.length > 0) {
    const datasOrdenadas = dias.map(([dataISO]) => dataISO);
    const dataMax = datasOrdenadas[0];
    const dataMin = datasOrdenadas[datasOrdenadas.length - 1];
    periodoEl.textContent = `Periodo: ${formatarDataBR(dataMin)} a ${formatarDataBR(dataMax)}`;
    return;
  }

  periodoEl.textContent = "Periodo: --";
}

function atualizarAtualizadoInfo() {
  const atualizadoEl = document.getElementById("atualizado-info");
  if (!atualizadoEl) return;
  atualizadoEl.textContent = `Atualizado: ${new Date().toLocaleString("pt-BR")}`;
}

function atualizarKPIs({
  totalVendas = 0,
  totalPedidos = 0,
  totalEntregas = 0,
  totalRetiradas = 0,
  totalLanches = 0,
  totalRefrigerantes = 0,
} = {}) {
  const kpiFaturamento = document.getElementById("kpi-faturamento");
  const kpiFaturamentoSub = document.getElementById("kpi-faturamento-sub");
  const kpiPedidos = document.getElementById("kpi-pedidos");
  const kpiPedidosSub = document.getElementById("kpi-pedidos-sub");
  const kpiLanches = document.getElementById("kpi-lanches");
  const kpiRefrigerantes = document.getElementById("kpi-refrigerantes");

  if (kpiFaturamento) kpiFaturamento.textContent = formatarMoeda(totalVendas);
  if (kpiFaturamentoSub) kpiFaturamentoSub.textContent = "somente finalizados";
  if (kpiPedidos) kpiPedidos.textContent = formatarInteiro(totalPedidos);
  if (kpiPedidosSub) {
    kpiPedidosSub.textContent = `Entregas ${formatarInteiro(totalEntregas)} | Retiradas ${formatarInteiro(totalRetiradas)}`;
  }
  if (kpiLanches) kpiLanches.textContent = formatarMoeda(totalLanches);
  if (kpiRefrigerantes) kpiRefrigerantes.textContent = formatarMoeda(totalRefrigerantes);
}

function resetarPainel(mensagem) {
  atualizarKPIs();

  const dadosGerais = document.getElementById("dados-gerais");
  if (dadosGerais) dadosGerais.innerHTML = "";

  const dadosPagamento = document.getElementById("dados-pagamento");
  if (dadosPagamento) dadosPagamento.innerHTML = `<p class="vazio">${mensagem}</p>`;

  const dadosMix = document.getElementById("dados-mix");
  if (dadosMix) dadosMix.innerHTML = `<p class="vazio">${mensagem}</p>`;

  const tabelaPagamentos = document.getElementById("tabela-pagamentos");
  if (tabelaPagamentos) tabelaPagamentos.innerHTML = "";

  const tabelaTipos = document.getElementById("tabela-tipos");
  if (tabelaTipos) tabelaTipos.innerHTML = "";

  const tabelaEntregadores = document.getElementById("tabela-entregadores");
  if (tabelaEntregadores) tabelaEntregadores.innerHTML = "";

  const tabelaRetiradas = document.getElementById("tabela-retiradas");
  if (tabelaRetiradas) tabelaRetiradas.innerHTML = "";

  const dadosEntregadores = document.getElementById("dados-entregadores");
  if (dadosEntregadores) dadosEntregadores.innerHTML = `<p class="vazio">${mensagem}</p>`;

  const graficoVendas = document.getElementById("grafico-vendas");
  if (graficoVendas) graficoVendas.innerHTML = `<p class="vazio">${mensagem}</p>`;

  const topProdutos = document.getElementById("top-produtos");
  if (topProdutos) topProdutos.innerHTML = `<p class="vazio">${mensagem}</p>`;
}

function criarLinhaProgresso(label, valor, percentual, classe) {
  const pctSeguro = Number.isFinite(percentual) ? percentual : 0;
  return `
    <div class="progress-row">
      <div>
        <div>${label}</div>
        <div class="bar ${classe}">
          <span style="width:${pctSeguro.toFixed(0)}%"></span>
        </div>
      </div>
      <strong>${formatarMoeda(valor)}</strong>
    </div>
  `;
}

function criarItemMetrica(label, valor, percentual, classe) {
  const pctSeguro = Number.isFinite(percentual) ? percentual : 0;
  return `
    <div class="metric-item">
      <span class="dot ${classe}"></span>
      <div>
        <strong>${label}</strong>
        <div>${formatarMoeda(valor)}</div>
      </div>
      <span class="metric-share">${pctSeguro.toFixed(0)}%</span>
    </div>
  `;
}

function renderizarTabelaPagamentos(totais) {
  const tbody = document.getElementById("tabela-pagamentos");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td>Pix</td><td>${formatarMoeda(totais.pix)}</td></tr>
    <tr><td>Cartao</td><td>${formatarMoeda(totais.cartao)}</td></tr>
    <tr><td>Dinheiro</td><td>${formatarMoeda(totais.dinheiro)}</td></tr>
  `;
}

function renderizarTabelaTipos(totais) {
  const tbody = document.getElementById("tabela-tipos");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td>Entrega</td><td>${formatarMoeda(totais.entrega.valor)}</td><td>${formatarInteiro(totais.entrega.qtd)}</td></tr>
    <tr><td>Retirada</td><td>${formatarMoeda(totais.retirada.valor)}</td><td>${formatarInteiro(totais.retirada.qtd)}</td></tr>
  `;
}

function renderizarTabelaEntregadores(entregadores) {
  const tbody = document.getElementById("tabela-entregadores");
  if (!tbody) return;
  if (entregadores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">Sem entregadores no periodo.</td></tr>`;
    return;
  }
  tbody.innerHTML = entregadores
    .map(
      ([nome, dados]) => `
      <tr>
        <td>${nome}</td>
        <td>${formatarInteiro(dados.entregas)}</td>
        <td>${formatarQtdValor(dados.qtdPix || 0, dados.pix || 0)}</td>
        <td>${formatarQtdValor(dados.qtdDinheiro || 0, dados.dinheiro || 0)}</td>
        <td>${formatarQtdValor(dados.qtdCartao || 0, dados.cartao || 0)}</td>
        <td>${formatarMoeda(dados.total || 0)}</td>
      </tr>
    `
    )
    .join("");
}

function renderizarTabelaRetiradas(retiradaResumo) {
  const tbody = document.getElementById("tabela-retiradas");
  if (!tbody) return;
  if (!retiradaResumo || retiradaResumo.qtd <= 0) {
    tbody.innerHTML = `<tr><td colspan="6">Sem retiradas no periodo.</td></tr>`;
    return;
  }
  tbody.innerHTML = `
    <tr>
      <td>Balcao / local</td>
      <td>${formatarInteiro(retiradaResumo.qtd || 0)}</td>
      <td>${formatarQtdValor(retiradaResumo.qtdPix || 0, retiradaResumo.pix || 0)}</td>
      <td>${formatarQtdValor(retiradaResumo.qtdDinheiro || 0, retiradaResumo.dinheiro || 0)}</td>
      <td>${formatarQtdValor(retiradaResumo.qtdCartao || 0, retiradaResumo.cartao || 0)}</td>
      <td>${formatarMoeda(retiradaResumo.total || 0)}</td>
    </tr>
  `;
}

function renderizarInsights(serieDias, produtos) {
  const graficoEl = document.getElementById("grafico-vendas");
  const topEl = document.getElementById("top-produtos");

  if (graficoEl) {
    if (!serieDias.length) {
      graficoEl.innerHTML = "<p class=\"vazio\">Sem dados para o grafico.</p>";
    } else {
      const serie = serieDias.slice(0, 7).reverse();
      const max = Math.max(...serie.map((d) => d.total), 1);
      graficoEl.innerHTML = `
        <h3 class="card-title">Vendas por dia</h3>
        <div class="chart-list">
          ${serie
            .map((d) => {
              const pct = Math.min((d.total / max) * 100, 100);
              return `
                <div class="chart-row">
                  <span class="label">${formatarDataBR(d.dataISO)}</span>
                  <div class="chart-bar"><span style="width:${pct.toFixed(0)}%"></span></div>
                  <strong>${formatarMoeda(d.total)}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }
  }

  if (topEl) {
    const itens = Object.entries(produtos).sort((a, b) => b[1].valor - a[1].valor);
    if (!itens.length) {
      topEl.innerHTML = "<p class=\"vazio\">Sem produtos vendidos.</p>";
    } else {
      topEl.innerHTML = `
        <h3 class="card-title">Produtos mais vendidos</h3>
        <ul class="top-list">
          ${itens
            .slice(0, 6)
            .map(([nome, dados]) => {
              return `
                <li class="top-item">
                  <div>
                    <strong>${nome}</strong>
                    <div>${formatarInteiro(dados.qtd)} un</div>
                  </div>
                  <span>${formatarMoeda(dados.valor)}</span>
                </li>
              `;
            })
            .join("")}
        </ul>
      `;
    }
  }
}

// ===================== RENDERIZAR RELATORIO =====================
function renderizarRelatorio(filtroInicio = null, filtroFim = null) {
  filtroAtual = { inicio: filtroInicio, fim: filtroFim };

  const pedidosValidos = pedidosCache.filter((pedido) => pedidoValido(pedido));

  const porDia = {};
  pedidosValidos.forEach((p) => {
    const dataKey = normalizarData(p.entregueEm || new Date());
    if (!porDia[dataKey]) porDia[dataKey] = [];
    porDia[dataKey].push(p);
  });

  let dias = Object.entries(porDia).sort((a, b) => b[0].localeCompare(a[0]));

  dias = dias.filter(([dataISO]) => {
    if (!filtroInicio && !filtroFim) return true;
    if (filtroInicio && filtroFim) return dataISO >= filtroInicio && dataISO <= filtroFim;
    return true;
  });

  atualizarPeriodoInfo(filtroInicio, filtroFim, dias);
  atualizarAtualizadoInfo();

  if (dias.length === 0) {
    resetarPainel("Nenhum pedido encontrado nesse periodo.");
    return;
  }

  const pedidosFiltrados = dias.flatMap(([, lista]) => lista);

  let totalVendas = 0;
  let totalTaxa = 0;
  let totalPix = 0;
  let totalCartao = 0;
  let totalDinheiro = 0;
  let totalPedidos = 0;
  let totalEntregas = 0;
  let totalRetiradas = 0;
  let totalLanches = 0;
  let totalRefrigerantes = 0;

  const entregadoresPeriodo = {};
  const retiradaPeriodo = {
    qtd: 0,
    total: 0,
    pix: 0,
    cartao: 0,
    dinheiro: 0,
    qtdPix: 0,
    qtdCartao: 0,
    qtdDinheiro: 0,
  };
  const tipoTotais = {
    entrega: { valor: 0, qtd: 0 },
    retirada: { valor: 0, qtd: 0 },
  };

  const serieDias = [];
  const produtos = {};

  let htmlDiario = "";

  dias.forEach(([dataISO, lista]) => {
    const dataBR = formatarDataBR(dataISO);
    const diaSemana = formatarDiaSemana(dataISO);

    let diaTotal = 0;
    let diaTaxa = 0;
    let diaPix = 0;
    let diaCartao = 0;
    let diaDinheiro = 0;
    let diaRetirada = 0;
    let qtdRetiradas = 0;
    let qtdEntregas = 0;

    const entregadores = {};
    const retiradaPagamentos = {
      pix: 0,
      cartao: 0,
      dinheiro: 0,
      qtdPix: 0,
      qtdCartao: 0,
      qtdDinheiro: 0,
    };

    lista.forEach((pedido) => {
      const totalPedido = calcularTotalPedido(pedido);
      if (totalPedido <= 0) return;

      totalPedidos++;
      diaTotal += totalPedido;
      totalVendas += totalPedido;

      const tipo = classificarTipoPedidoRelatorio(pedido);
      const taxa = obterTaxaEntregaPedido(pedido);
      diaTaxa += taxa;
      totalTaxa += taxa;

      if (tipo === "retirada") {
        diaRetirada += totalPedido;
        qtdRetiradas++;
        totalRetiradas++;
        tipoTotais.retirada.valor += totalPedido;
        tipoTotais.retirada.qtd += 1;
        retiradaPeriodo.qtd += 1;
        retiradaPeriodo.total += totalPedido;
      } else {
        qtdEntregas++;
        totalEntregas++;
        tipoTotais.entrega.valor += totalPedido;
        tipoTotais.entrega.qtd += 1;
      }

      const resumoPagamento = calcularResumoPagamentoPedido(pedido, totalPedido);
      diaPix += resumoPagamento.pix;
      totalPix += resumoPagamento.pix;
      diaDinheiro += resumoPagamento.dinheiro;
      totalDinheiro += resumoPagamento.dinheiro;
      diaCartao += resumoPagamento.cartao;
      totalCartao += resumoPagamento.cartao;

      if (tipo === "retirada") {
        retiradaPagamentos.pix += resumoPagamento.pix;
        retiradaPagamentos.qtdPix += resumoPagamento.qtdPix;
        retiradaPeriodo.pix += resumoPagamento.pix;
        retiradaPeriodo.qtdPix += resumoPagamento.qtdPix;
        retiradaPagamentos.dinheiro += resumoPagamento.dinheiro;
        retiradaPagamentos.qtdDinheiro += resumoPagamento.qtdDinheiro;
        retiradaPeriodo.dinheiro += resumoPagamento.dinheiro;
        retiradaPeriodo.qtdDinheiro += resumoPagamento.qtdDinheiro;
        retiradaPagamentos.cartao += resumoPagamento.cartao;
        retiradaPagamentos.qtdCartao += resumoPagamento.qtdCartao;
        retiradaPeriodo.cartao += resumoPagamento.cartao;
        retiradaPeriodo.qtdCartao += resumoPagamento.qtdCartao;
      } else {
        const nomeEntregador = String(pedido.entregador || "").trim();
        if (!nomeEntregador) return;
        if (!entregadores[nomeEntregador]) {
          entregadores[nomeEntregador] = {
            total: 0,
            entregas: 0,
            pix: 0,
            cartao: 0,
            dinheiro: 0,
            qtdPix: 0,
            qtdCartao: 0,
            qtdDinheiro: 0,
          };
        }
        entregadores[nomeEntregador].total += totalPedido;
        entregadores[nomeEntregador].entregas++;
        entregadores[nomeEntregador].pix += resumoPagamento.pix;
        entregadores[nomeEntregador].qtdPix += resumoPagamento.qtdPix;
        entregadores[nomeEntregador].dinheiro += resumoPagamento.dinheiro;
        entregadores[nomeEntregador].qtdDinheiro += resumoPagamento.qtdDinheiro;
        entregadores[nomeEntregador].cartao += resumoPagamento.cartao;
        entregadores[nomeEntregador].qtdCartao += resumoPagamento.qtdCartao;

        if (!entregadoresPeriodo[nomeEntregador]) {
          entregadoresPeriodo[nomeEntregador] = {
            total: 0,
            entregas: 0,
            pix: 0,
            cartao: 0,
            dinheiro: 0,
            qtdPix: 0,
            qtdCartao: 0,
            qtdDinheiro: 0,
          };
        }
        entregadoresPeriodo[nomeEntregador].total += totalPedido;
        entregadoresPeriodo[nomeEntregador].entregas++;
        entregadoresPeriodo[nomeEntregador].pix += resumoPagamento.pix;
        entregadoresPeriodo[nomeEntregador].qtdPix += resumoPagamento.qtdPix;
        entregadoresPeriodo[nomeEntregador].dinheiro += resumoPagamento.dinheiro;
        entregadoresPeriodo[nomeEntregador].qtdDinheiro += resumoPagamento.qtdDinheiro;
        entregadoresPeriodo[nomeEntregador].cartao += resumoPagamento.cartao;
        entregadoresPeriodo[nomeEntregador].qtdCartao += resumoPagamento.qtdCartao;
      }

      if (Array.isArray(pedido.carrinho)) {
        pedido.carrinho.forEach((item) => {
          const preco = MegaPricing.money(item.preco);
          const qtd = Math.max(parseInt(item.qtd, 10) || 0, 0);
          let adicionais = 0;

          if (Array.isArray(item.adicionais)) {
            item.adicionais.forEach((add) => {
              const precoAdd = Math.max(parseFloat(add.preco) || 0, 0);
              const qtdAdd = Math.max(parseInt(add.qtd, 10) || 0, 0);
              adicionais += precoAdd * qtdAdd;
            });
          }

          const adicionaisTotal = Array.isArray(item.adicionais)
            ? item.adicionais.reduce((sum, add) => {
                const mult = String(add?.escopo || "").toLowerCase() === "total" ? 1 : qtd;
                return sum + (Number(add?.preco || 0) || 0) * (Number(add?.qtd || 0) || 0) * mult;
              }, 0)
            : 0;
          const totalItem = preco * qtd + adicionaisTotal;
          if (totalItem <= 0) return;
          const categoria = classificarItem(item);
          if (categoria === "refrigerante") totalRefrigerantes += totalItem;
          else totalLanches += totalItem;

          const nomeItem = item.nome || "Item";
          if (!produtos[nomeItem]) produtos[nomeItem] = { qtd: 0, valor: 0 };
          produtos[nomeItem].qtd += qtd;
          produtos[nomeItem].valor += totalItem;
        });
      }
    });

    const diaTicketMedio = lista.length ? diaTotal / lista.length : 0;
    const totalPagamentosDia = diaPix + diaCartao + diaDinheiro;
    const pctPix = totalPagamentosDia ? (diaPix / totalPagamentosDia) * 100 : 0;
    const pctCartao = totalPagamentosDia ? (diaCartao / totalPagamentosDia) * 100 : 0;
    const pctDinheiro = totalPagamentosDia ? (diaDinheiro / totalPagamentosDia) * 100 : 0;

    const entregadoresOrdenados = Object.entries(entregadores).sort(
      (a, b) => b[1].total - a[1].total
    );

    htmlDiario += `
      <article class="relatorio-dia">
        <div class="dia-topo">
          <div>
            <h3>${dataBR}</h3>
            <span class="dia-sub">${diaSemana}</span>
          </div>
          <div class="dia-total">
            <span>Total do dia</span>
            <strong>${formatarMoeda(diaTotal + diaTaxa)}</strong>
          </div>
        </div>

        <div class="dia-kpis">
          <div class="mini-card">
            <span>Pedidos</span>
            <strong>${formatarInteiro(lista.length)}</strong>
          </div>
          <div class="mini-card">
            <span>Entregas</span>
            <strong>${formatarInteiro(qtdEntregas)}</strong>
          </div>
          <div class="mini-card">
            <span>Retiradas</span>
            <strong>${formatarInteiro(qtdRetiradas)}</strong>
          </div>
          <div class="mini-card">
            <span>Ticket medio</span>
            <strong>${formatarMoeda(diaTicketMedio)}</strong>
          </div>
        </div>

        <div class="dia-grid">
          <div class="dia-card">
            <h4>Resumo financeiro</h4>
            <div class="stat-line"><span>Vendas</span><strong>${formatarMoeda(diaTotal)}</strong></div>
            <div class="stat-line"><span>Taxas</span><strong>${formatarMoeda(diaTaxa)}</strong></div>
            <div class="stat-line"><span>Retiradas</span><strong>${formatarMoeda(diaRetirada)}</strong></div>
            <div class="stat-line highlight"><span>Total geral</span><strong>${formatarMoeda(diaTotal + diaTaxa)}</strong></div>
          </div>

          <div class="dia-card">
            <h4>Mix de pagamentos</h4>
            <div class="progress-list">
              ${criarLinhaProgresso("Pix", diaPix, pctPix, "pix")}
              ${criarLinhaProgresso("Cartao", diaCartao, pctCartao, "cartao")}
              ${criarLinhaProgresso("Dinheiro", diaDinheiro, pctDinheiro, "dinheiro")}
            </div>
          </div>
        </div>

        <div class="dia-card">
          <h4>Entregadores</h4>
          <div class="entregadores-grid">
            ${
              entregadoresOrdenados.length
                ? entregadoresOrdenados
                    .map(
                      ([nome, dados]) => `
                <div class="entregador-card">
                  <h5>${nome}</h5>
                  <p>Entregas: ${formatarInteiro(dados.entregas)}</p>
                  <p>Pix: ${formatarQtdValor(dados.qtdPix || 0, dados.pix || 0)}</p>
                  <p>Cartao: ${formatarQtdValor(dados.qtdCartao || 0, dados.cartao || 0)}</p>
                  <p>Dinheiro: ${formatarQtdValor(dados.qtdDinheiro || 0, dados.dinheiro || 0)}</p>
                  <p><strong>Total:</strong> ${formatarMoeda(dados.total)}</p>
                </div>
              `
                    )
                    .join("")
                : "<p class='vazio'>Sem entregadores atribuidos.</p>"
            }
          </div>
        </div>

        ${
          diaRetirada > 0
            ? `
          <div class="retirada-card">
            <h4>Retiradas no balcao</h4>
            <p>Retiradas: ${formatarInteiro(qtdRetiradas)}</p>
            <p>Pix: ${formatarQtdValor(retiradaPagamentos.qtdPix || 0, retiradaPagamentos.pix || 0)}</p>
            <p>Cartao: ${formatarQtdValor(retiradaPagamentos.qtdCartao || 0, retiradaPagamentos.cartao || 0)}</p>
            <p>Dinheiro: ${formatarQtdValor(retiradaPagamentos.qtdDinheiro || 0, retiradaPagamentos.dinheiro || 0)}</p>
            <p><strong>Total:</strong> ${formatarMoeda(diaRetirada)}</p>
          </div>
        `
            : ""
        }
      </article>
    `;

    serieDias.push({ dataISO, total: diaTotal + diaTaxa });
  });

  atualizarKPIs({
    totalVendas,
    totalPedidos,
    totalEntregas,
    totalRetiradas,
    totalLanches,
    totalRefrigerantes,
  });

  const totalGeral = totalVendas + totalTaxa;
  const ticketMedio = totalPedidos ? totalVendas / totalPedidos : 0;
  const taxaMedia = totalEntregas ? totalTaxa / totalEntregas : 0;

  document.getElementById("dados-gerais").innerHTML = `
    <div class="kpi-line"><span>Vendas sem taxa</span><strong>${formatarMoeda(totalVendas)}</strong></div>
    <div class="kpi-line"><span>Taxas</span><strong>${formatarMoeda(totalTaxa)}</strong></div>
    <div class="kpi-line"><span>Ticket medio</span><strong>${formatarMoeda(ticketMedio)}</strong></div>
    <div class="kpi-line"><span>Total com taxas</span><strong>${formatarMoeda(totalGeral)}</strong></div>
  `;

  const totalPagamentos = totalPix + totalCartao + totalDinheiro;
  const pctPix = totalPagamentos ? (totalPix / totalPagamentos) * 100 : 0;
  const pctCartao = totalPagamentos ? (totalCartao / totalPagamentos) * 100 : 0;
  const pctDinheiro = totalPagamentos ? (totalDinheiro / totalPagamentos) * 100 : 0;

  document.getElementById("dados-pagamento").innerHTML = `
    <h3 class="card-title">Formas de pagamento</h3>
    <div class="metric-list">
      ${criarItemMetrica("Pix", totalPix, pctPix, "pix")}
      ${criarItemMetrica("Cartao", totalCartao, pctCartao, "cartao")}
      ${criarItemMetrica("Dinheiro", totalDinheiro, pctDinheiro, "dinheiro")}
    </div>
    <div class="stat-line highlight"><span>Total vendas</span><strong>${formatarMoeda(totalVendas)}</strong></div>
  `;

  const totalOperacao = totalEntregas + totalRetiradas;
  const pctEntregas = totalOperacao ? (totalEntregas / totalOperacao) * 100 : 0;
  const pctRetiradas = totalOperacao ? (totalRetiradas / totalOperacao) * 100 : 0;

  document.getElementById("dados-mix").innerHTML = `
    <h3 class="card-title">Tipos de pedido</h3>
    <div class="mix-grid">
      <div class="mix-item">
        <span>Entregas</span>
        <strong>${formatarInteiro(totalEntregas)}</strong>
        <div class="bar entrega"><span style="width:${pctEntregas.toFixed(0)}%"></span></div>
      </div>
      <div class="mix-item">
        <span>Retiradas</span>
        <strong>${formatarInteiro(totalRetiradas)}</strong>
        <div class="bar retirada"><span style="width:${pctRetiradas.toFixed(0)}%"></span></div>
      </div>
    </div>
    <div class="mix-meta">
      <span>Taxa media: ${formatarMoeda(taxaMedia)}</span>
    </div>
  `;

  renderizarTabelaPagamentos({ pix: totalPix, cartao: totalCartao, dinheiro: totalDinheiro });
  renderizarTabelaTipos(tipoTotais);

  const entregadoresOrdenadosPeriodo = Object.entries(entregadoresPeriodo).sort(
    (a, b) => b[1].total - a[1].total
  );
  renderizarTabelaEntregadores(entregadoresOrdenadosPeriodo);
  renderizarTabelaRetiradas(retiradaPeriodo);
  renderizarInsights(serieDias, produtos);

  document.getElementById("dados-entregadores").innerHTML = htmlDiario;
}

async function limparPedidosEntreguesDoRelatorio() {
  if (!confirm("Excluir TODOS os pedidos entregues do relatorio?")) return;

  const btn = document.getElementById("btn-limpar-pedidos-entregues");
  setBotaoCarregando(btn, true);
  try {
    const data = await requisicaoJsonAdmin("/pedidos/entregues/todos", {
      method: "DELETE",
    });
    exibirFeedbackRelatorio(
      `Pedidos entregues removidos: ${formatarInteiro(data.removidos || 0)}.`
    );
    await carregarRelatorio();
  } catch (erro) {
    console.error("Falha ao excluir pedidos entregues:", erro);
    exibirFeedbackRelatorio(`Falha ao excluir pedidos: ${erro.message}`, true);
  } finally {
    setBotaoCarregando(btn, false);
  }
}

async function limparRelatorioInteiro() {
  if (
    !confirm(
      "Isso vai apagar pedidos entregues, historico de status e fila de impressao. Deseja continuar?"
    )
  ) {
    return;
  }

  const btn = document.getElementById("btn-limpar-relatorio");
  setBotaoCarregando(btn, true);
  try {
    const data = await requisicaoJsonAdmin("/adminn/relatorio/limpar-tudo", {
      method: "POST",
    });
    exibirFeedbackRelatorio(
      `Relatorio limpo. Entregues: ${formatarInteiro(data.entregues || 0)} | Historico: ${formatarInteiro(
        data.historico || 0
      )} | Impressao: ${formatarInteiro(data.printJobs || 0)}`
    );
    await carregarRelatorio();
  } catch (erro) {
    console.error("Falha ao limpar relatorio:", erro);
    exibirFeedbackRelatorio(`Falha ao limpar relatorio: ${erro.message}`, true);
  } finally {
    setBotaoCarregando(btn, false);
  }
}

function configurarAcoesRelatorio() {
  const btnLimparPedidos = document.getElementById("btn-limpar-pedidos-entregues");
  const btnLimparRelatorio = document.getElementById("btn-limpar-relatorio");

  if (btnLimparPedidos) {
    btnLimparPedidos.addEventListener("click", limparPedidosEntreguesDoRelatorio);
  }
  if (btnLimparRelatorio) {
    btnLimparRelatorio.addEventListener("click", limparRelatorioInteiro);
  }
}

// ===================== CAIXA DIARIO =====================
let caixaAtual = null;

function escaparHtmlCaixa(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function feedbackCaixa(mensagem, erro = false) {
  const el = document.getElementById("caixa-feedback");
  if (!el) return;
  el.hidden = !mensagem;
  el.textContent = mensagem || "";
  el.style.color = erro ? "#b91c1c" : "#166534";
  el.style.background = erro ? "rgba(220,38,38,.12)" : "rgba(16,185,129,.12)";
}

function nomeMovimentoCaixa(tipo) {
  return tipo === "abertura" ? "Abertura" : tipo === "reforco" ? "Reforco" : "Sangria";
}

function renderizarCaixa(data) {
  caixaAtual = data;
  const fechado = Boolean(data.fechado);
  const fechamento = data.fechamento && data.fechamento.fechado ? data.fechamento : null;
  document.getElementById("caixa-vendas-dinheiro").textContent = formatarMoeda(data.pagamentos?.dinheiro);
  document.getElementById("caixa-entradas").textContent = formatarMoeda((data.totaisMovimentos?.abertura || 0) + (data.totaisMovimentos?.reforco || 0));
  document.getElementById("caixa-sangrias").textContent = formatarMoeda(data.totaisMovimentos?.sangria);
  document.getElementById("caixa-esperado").textContent = formatarMoeda(data.saldoEsperado);
  document.getElementById("caixa-informado").textContent = fechamento ? formatarMoeda(fechamento.saldoInformado) : "--";
  document.getElementById("caixa-divergencia").textContent = fechamento ? formatarMoeda(fechamento.divergencia) : "--";

  const status = document.getElementById("caixa-status");
  status.textContent = fechado ? "Fechado" : "Aberto";
  status.classList.toggle("fechado", fechado);
  const divergenciaCard = document.getElementById("caixa-divergencia-card");
  divergenciaCard.classList.remove("divergencia-negativa", "divergencia-ok");
  if (fechamento) divergenciaCard.classList.add(Math.abs(fechamento.divergencia) < 0.01 ? "divergencia-ok" : "divergencia-negativa");

  const tbody = document.getElementById("caixa-movimentos");
  const movimentos = Array.isArray(data.movimentos) ? data.movimentos : [];
  tbody.innerHTML = movimentos.length ? movimentos.map((item) => `
    <tr>
      <td>${new Date(item.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
      <td>${nomeMovimentoCaixa(item.tipo)}</td>
      <td>${escaparHtmlCaixa(item.descricao || "-")}</td>
      <td>${formatarMoeda(item.valor)}</td>
      <td><button class="btn ghost" type="button" data-caixa-excluir="${Number(item.id)}" ${fechado ? "disabled" : ""}>Excluir</button></td>
    </tr>`).join("") : '<tr><td colspan="5">Nenhum movimento registrado.</td></tr>';

  ["caixa-tipo", "caixa-valor", "caixa-descricao", "caixa-adicionar", "caixa-saldo-informado", "caixa-observacao", "caixa-fechar"]
    .forEach((id) => { const el = document.getElementById(id); if (el) el.disabled = fechado; });
  document.getElementById("caixa-reabrir").hidden = !fechado;
  document.getElementById("caixa-syntax").textContent = `Syntax: ${data.syntax?.mensagem || "comparacao indisponivel."}`;
}

async function carregarCaixa() {
  const input = document.getElementById("caixa-data");
  if (!input.value) input.value = dataHojeISO();
  feedbackCaixa("");
  try {
    const data = await requisicaoJsonAdmin(`/adminn/caixa?data=${encodeURIComponent(input.value)}`);
    renderizarCaixa(data);
  } catch (erro) {
    feedbackCaixa(`Nao foi possivel carregar o caixa: ${erro.message}`, true);
  }
}

async function adicionarMovimentoCaixa() {
  const btn = document.getElementById("caixa-adicionar");
  const valor = Number(document.getElementById("caixa-valor").value);
  if (!Number.isFinite(valor) || valor <= 0) return feedbackCaixa("Informe um valor maior que zero.", true);
  setBotaoCarregando(btn, true);
  try {
    const data = await requisicaoJsonAdmin("/adminn/caixa/movimentos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: document.getElementById("caixa-data").value,
        tipo: document.getElementById("caixa-tipo").value,
        valor,
        descricao: document.getElementById("caixa-descricao").value,
      }),
    });
    document.getElementById("caixa-valor").value = "";
    document.getElementById("caixa-descricao").value = "";
    renderizarCaixa(data);
    feedbackCaixa("Movimento registrado.");
  } catch (erro) { feedbackCaixa(`Falha ao registrar: ${erro.message}`, true); }
  finally { setBotaoCarregando(btn, false); }
}

async function excluirMovimentoCaixa(id) {
  if (!confirm("Excluir este movimento do caixa?")) return;
  try {
    const data = await requisicaoJsonAdmin(`/adminn/caixa/movimentos/${id}`, { method: "DELETE" });
    renderizarCaixa(data);
    feedbackCaixa("Movimento excluido.");
  } catch (erro) { feedbackCaixa(`Falha ao excluir: ${erro.message}`, true); }
}

async function fecharCaixa() {
  const btn = document.getElementById("caixa-fechar");
  const saldoCampo = document.getElementById("caixa-saldo-informado").value;
  const saldoInformado = Number(saldoCampo);
  if (saldoCampo === "" || !Number.isFinite(saldoInformado) || saldoInformado < 0) return feedbackCaixa("Informe o dinheiro contado no caixa.", true);
  if (!confirm(`Fechar o caixa com ${formatarMoeda(saldoInformado)} em dinheiro contado?`)) return;
  setBotaoCarregando(btn, true);
  try {
    const data = await requisicaoJsonAdmin("/adminn/caixa/fechar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: document.getElementById("caixa-data").value, saldoInformado, observacao: document.getElementById("caixa-observacao").value }),
    });
    renderizarCaixa(data);
    feedbackCaixa(`Caixa fechado. Divergencia: ${formatarMoeda(data.fechamento?.divergencia || 0)}.`);
  } catch (erro) { feedbackCaixa(`Falha ao fechar: ${erro.message}`, true); }
  finally { setBotaoCarregando(btn, false); }
}

async function reabrirCaixa() {
  if (!confirm("Reabrir este caixa? A acao ficara registrada na auditoria.")) return;
  try {
    const data = await requisicaoJsonAdmin("/adminn/caixa/reabrir", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: document.getElementById("caixa-data").value }),
    });
    renderizarCaixa(data);
    feedbackCaixa("Caixa reaberto.");
  } catch (erro) { feedbackCaixa(`Falha ao reabrir: ${erro.message}`, true); }
}

function configurarCaixa() {
  const data = document.getElementById("caixa-data");
  data.value = dataHojeISO();
  data.addEventListener("change", carregarCaixa);
  document.getElementById("caixa-adicionar").addEventListener("click", adicionarMovimentoCaixa);
  document.getElementById("caixa-fechar").addEventListener("click", fecharCaixa);
  document.getElementById("caixa-reabrir").addEventListener("click", reabrirCaixa);
  document.getElementById("caixa-movimentos").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-caixa-excluir]");
    if (btn) excluirMovimentoCaixa(btn.dataset.caixaExcluir);
  });
  carregarCaixa();
}

// ===================== FILTROS =====================
function filtrarPorPeriodo() {
  const inicio = document.getElementById("data-inicio").value;
  const fim = document.getElementById("data-fim").value;
  if (inicio && fim) renderizarRelatorio(inicio, fim);
}

function exportarCSV() {
  if (!pedidosCache || pedidosCache.length === 0) return;

  const pedidosFiltrados = pedidosCache.filter((pedido) => {
    if (!pedidoValido(pedido)) return false;
    const dataISO = normalizarData(pedido.entregueEm || new Date());
    if (!filtroAtual.inicio && !filtroAtual.fim) return true;
    if (filtroAtual.inicio && filtroAtual.fim)
      return dataISO >= filtroAtual.inicio && dataISO <= filtroAtual.fim;
    return true;
  });

  const linhas = [
    ["Data", "Tipo", "Pagamento", "Entregador", "Subtotal", "Taxa", "Total"],
  ];

  pedidosFiltrados.forEach((pedido) => {
    const dataISO = normalizarData(pedido.entregueEm || new Date());
    const dataBR = formatarDataBR(dataISO);
    const tipo = classificarTipoPedidoRelatorio(pedido);
    const pagamento = pedido.pagamento || "-";
    const entregador = pedido.entregador || "-";
    const subtotal = calcularTotalPedido(pedido);
    const taxa = obterTaxaEntregaPedido(pedido);
    const total = subtotal + taxa;

    linhas.push([
      dataBR,
      tipo,
      pagamento,
      entregador,
      subtotal.toFixed(2).replace(".", ","),
      taxa.toFixed(2).replace(".", ","),
      total.toFixed(2).replace(".", ","),
    ]);
  });

  const csv = linhas.map((linha) => linha.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const inputInicio = document.getElementById("data-inicio");
const inputFim = document.getElementById("data-fim");
if (inputInicio && inputFim) {
  inputInicio.addEventListener("change", () => {
    if (inputInicio.value && inputFim.value) {
      renderizarRelatorio(inputInicio.value, inputFim.value);
    }
  });
  inputFim.addEventListener("change", () => {
    if (inputInicio.value && inputFim.value) {
      renderizarRelatorio(inputInicio.value, inputFim.value);
    }
  });
}

configurarAcoesRelatorio();
configurarCaixa();
carregarRelatorio();
