const lista = document.getElementById("estoque-lista");
const movimentos = document.getElementById("estoque-movimentos");
const totalEl = document.getElementById("estoque-total");
const baixoEl = document.getElementById("estoque-baixo");
const aviso = document.getElementById("aviso");

const nomeInput = document.getElementById("estoque-nome");
const categoriaInput = document.getElementById("estoque-categoria");
const unidadeInput = document.getElementById("estoque-unidade");
const quantidadeInput = document.getElementById("estoque-quantidade");
const minimoInput = document.getElementById("estoque-minimo");
const autoInput = document.getElementById("estoque-auto");
const btnAdicionar = document.getElementById("estoque-adicionar");
const btnRecarregar = document.getElementById("estoque-recarregar");
const btnSyncBebidas = document.getElementById("estoque-sync-bebidas");
const importFile = document.getElementById("estoque-import-file");
const importBtn = document.getElementById("estoque-import-btn");

function mostrarAviso(texto) {
  if (!aviso) return;
  aviso.innerText = texto;
  aviso.style.display = "block";
  setTimeout(() => (aviso.style.display = "none"), 3000);
}

function toNumber(valor, fallback = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function formatarQtd(valor) {
  const n = toNumber(valor, 0);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function formatarTipo(tipo) {
  const mapa = {
    entrada: "Entrada",
    saida: "Saida",
    venda: "Venda",
    ajuste: "Ajuste",
    estorno: "Estorno",
  };
  return mapa[String(tipo || "").toLowerCase()] || tipo || "-";
}

function parseBool(valor) {
  const texto = String(valor || "").trim().toLowerCase();
  if (!texto) return false;
  return ["1", "true", "sim", "yes", "y"].includes(texto);
}

function parseCsvTexto(texto) {
  const linhas = String(texto || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  if (!linhas.length) return [];

  const sep = linhas[0].includes(";") ? ";" : ",";
  let headers = linhas[0].split(sep).map((h) => h.trim().toLowerCase());
  let startIndex = 0;

  if (headers.includes("nome")) {
    startIndex = 1;
  } else {
    headers = ["nome", "categoria", "unidade", "quantidade", "minimo", "auto_baixa"];
  }

  const itens = [];
  for (let i = startIndex; i < linhas.length; i += 1) {
    const colunas = linhas[i].split(sep).map((c) => c.trim());
    if (!colunas.length || !colunas[0]) continue;

    const item = {};
    headers.forEach((header, idx) => {
      item[header] = colunas[idx] !== undefined ? colunas[idx] : "";
    });

    itens.push({
      nome: item.nome || "",
      categoria: item.categoria || "ingrediente",
      unidade: item.unidade || "un",
      quantidade: item.quantidade,
      minimo: item.minimo,
      auto_baixa: parseBool(item.auto_baixa),
    });
  }

  return itens;
}

async function carregarEstoque() {
  try {
    const res = await authFetch("/adminn/estoque");
    const itens = await res.json();
    renderizarEstoque(itens);
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao carregar estoque");
  }
}

async function carregarMovimentos() {
  try {
    const res = await authFetch("/adminn/estoque/movimentos?limit=50");
    const dados = await res.json();
    renderizarMovimentos(dados);
  } catch (err) {
    console.error(err);
  }
}

function renderizarEstoque(itens) {
  if (!lista) return;
  lista.innerHTML = "";

  let baixoCount = 0;

  if (!Array.isArray(itens) || !itens.length) {
    lista.innerHTML = "<tr><td colspan=\"8\">Nenhum item cadastrado.</td></tr>";
    if (totalEl) totalEl.textContent = "0";
    if (baixoEl) baixoEl.textContent = "0";
    return;
  }

  itens.forEach((item) => {
    const tr = document.createElement("tr");
    const qtd = toNumber(item.quantidade, 0);
    const minimo = toNumber(item.minimo, 0);
    const baixo = minimo > 0 && qtd <= minimo;
    if (baixo) baixoCount += 1;
    if (baixo) tr.classList.add("estoque-baixo");

    const tdNome = document.createElement("td");
    tdNome.textContent = item.nome;

    const tdUnidade = document.createElement("td");
    const unidadeEdit = document.createElement("input");
    unidadeEdit.className = "estoque-input";
    unidadeEdit.value = item.unidade || "un";
    tdUnidade.appendChild(unidadeEdit);

    const tdCategoria = document.createElement("td");
    const categoriaEdit = document.createElement("select");
    categoriaEdit.className = "estoque-input";
    ["ingrediente", "bebida"].forEach((op) => {
      const option = document.createElement("option");
      option.value = op;
      option.textContent = op === "bebida" ? "Bebida" : "Ingrediente";
      categoriaEdit.appendChild(option);
    });
    categoriaEdit.value = item.categoria === "bebida" ? "bebida" : "ingrediente";
    tdCategoria.appendChild(categoriaEdit);

    const tdQtd = document.createElement("td");
    tdQtd.textContent = formatarQtd(qtd);

    const tdMin = document.createElement("td");
    const minEdit = document.createElement("input");
    minEdit.type = "number";
    minEdit.step = "0.01";
    minEdit.min = "0";
    minEdit.className = "estoque-input estoque-num";
    minEdit.value = formatarQtd(minimo);
    tdMin.appendChild(minEdit);

    const tdAuto = document.createElement("td");
    const autoEdit = document.createElement("input");
    autoEdit.type = "checkbox";
    autoEdit.checked = item.auto_baixa === true || categoriaEdit.value === "bebida";
    tdAuto.appendChild(autoEdit);

    categoriaEdit.addEventListener("change", () => {
      if (categoriaEdit.value === "bebida") {
        autoEdit.checked = true;
      }
    });

    const tdStatus = document.createElement("td");
    const status = document.createElement("span");
    status.className = baixo ? "estoque-status baixo" : "estoque-status ok";
    status.textContent = baixo ? "Baixo" : "OK";
    tdStatus.appendChild(status);

    const tdAcoes = document.createElement("td");
    const acoes = document.createElement("div");
    acoes.className = "estoque-actions";

    const movWrap = document.createElement("div");
    movWrap.className = "estoque-mov";

    const qtdInput = document.createElement("input");
    qtdInput.type = "number";
    qtdInput.step = "0.01";
    qtdInput.min = "0";
    qtdInput.placeholder = "Qtd";
    qtdInput.className = "estoque-input estoque-num";

    const btnEntrada = document.createElement("button");
    btnEntrada.className = "btn small";
    btnEntrada.textContent = "Entrada";
    btnEntrada.onclick = () => movimentar(item.id, "entrada", qtdInput.value);

    const btnSaida = document.createElement("button");
    btnSaida.className = "btn small";
    btnSaida.textContent = "Saida";
    btnSaida.onclick = () => movimentar(item.id, "saida", qtdInput.value);

    const btnDefinir = document.createElement("button");
    btnDefinir.className = "btn small outline";
    btnDefinir.textContent = "Definir";
    btnDefinir.onclick = () => definirQuantidade(item.id, qtdInput.value);

    movWrap.appendChild(qtdInput);
    movWrap.appendChild(btnEntrada);
    movWrap.appendChild(btnSaida);
    movWrap.appendChild(btnDefinir);

    const editWrap = document.createElement("div");
    editWrap.className = "estoque-edit";

    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn small primary";
    btnSalvar.textContent = "Salvar";
    btnSalvar.onclick = () => atualizarItem(item.id, {
      nome: item.nome,
      categoria: categoriaEdit.value,
      unidade: unidadeEdit.value,
      minimo: minEdit.value,
      auto_baixa: autoEdit.checked
    });

    const btnRemover = document.createElement("button");
    btnRemover.className = "btn small danger";
    btnRemover.textContent = "Remover";
    btnRemover.onclick = () => removerItem(item.id, item.nome);

    editWrap.appendChild(btnSalvar);
    editWrap.appendChild(btnRemover);

    acoes.appendChild(movWrap);
    acoes.appendChild(editWrap);
    tdAcoes.appendChild(acoes);

    tr.appendChild(tdNome);
    tr.appendChild(tdCategoria);
    tr.appendChild(tdUnidade);
    tr.appendChild(tdQtd);
    tr.appendChild(tdMin);
    tr.appendChild(tdAuto);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAcoes);

    lista.appendChild(tr);
  });

  if (totalEl) totalEl.textContent = String(itens.length);
  if (baixoEl) baixoEl.textContent = String(baixoCount);
}

function renderizarMovimentos(itens) {
  if (!movimentos) return;
  movimentos.innerHTML = "";

  if (!Array.isArray(itens) || !itens.length) {
    movimentos.innerHTML = "<tr><td colspan=\"6\">Sem movimentacoes registradas.</td></tr>";
    return;
  }

  itens.forEach((mov) => {
    const tr = document.createElement("tr");
    const data = mov.created_at ? new Date(mov.created_at).toLocaleString("pt-BR") : "-";
    tr.innerHTML = `
      <td>${data}</td>
      <td>${mov.nome || "-"}</td>
      <td>${formatarTipo(mov.tipo)}</td>
      <td>${formatarQtd(mov.quantidade)}</td>
      <td>${mov.motivo || "-"}</td>
      <td>${mov.referencia || "-"}</td>
    `;
    movimentos.appendChild(tr);
  });
}

async function adicionarItem() {
  const nome = String(nomeInput.value || "").trim();
  if (!nome) {
    mostrarAviso("Informe o nome do item");
    return;
  }

  const payload = {
    nome,
    categoria: categoriaInput ? categoriaInput.value : "ingrediente",
    unidade: unidadeInput.value || "un",
    quantidade: quantidadeInput.value || 0,
    minimo: minimoInput.value || 0,
    auto_baixa: autoInput.checked
  };

  try {
    const res = await authFetch("/adminn/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "item_existente") {
        mostrarAviso("Item ja cadastrado");
      } else {
        mostrarAviso("Erro ao adicionar item");
      }
      return;
    }

    nomeInput.value = "";
    if (categoriaInput) categoriaInput.value = "ingrediente";
    unidadeInput.value = "";
    quantidadeInput.value = "";
    minimoInput.value = "";
    autoInput.checked = false;
    mostrarAviso("Item adicionado!");
    await carregarEstoque();
    await carregarMovimentos();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao adicionar item");
  }
}

async function atualizarItem(id, payload) {
  try {
    const res = await authFetch(`/adminn/estoque/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      mostrarAviso("Erro ao salvar");
      return;
    }
    mostrarAviso("Salvo!");
    await carregarEstoque();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao salvar");
  }
}

async function movimentar(id, tipo, quantidade) {
  const qtd = toNumber(quantidade, 0);
  if (!qtd || qtd <= 0) {
    mostrarAviso("Informe a quantidade");
    return;
  }

  try {
    const res = await authFetch("/adminn/estoque/movimentar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        tipo,
        quantidade: qtd,
        motivo: tipo === "entrada" ? "Entrada manual" : "Saida manual"
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "estoque_insuficiente") {
        mostrarAviso("Estoque insuficiente para saida");
      } else {
        mostrarAviso("Erro ao movimentar");
      }
      return;
    }

    mostrarAviso("Movimentacao registrada");
    await carregarEstoque();
    await carregarMovimentos();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao movimentar");
  }
}

async function definirQuantidade(id, quantidade) {
  const qtd = toNumber(quantidade, 0);
  if (qtd < 0) {
    mostrarAviso("Quantidade invalida");
    return;
  }

  try {
    const res = await authFetch("/adminn/estoque/definir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        quantidade: qtd,
        motivo: "Definicao manual"
      })
    });

    if (!res.ok) {
      mostrarAviso("Erro ao definir quantidade");
      return;
    }

    mostrarAviso("Quantidade atualizada");
    await carregarEstoque();
    await carregarMovimentos();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao definir quantidade");
  }
}

async function removerItem(id, nome) {
  if (!confirm(`Remover o item \"${nome}\"?`)) return;
  try {
    const res = await authFetch(`/adminn/estoque/${id}`, { method: "DELETE" });
    if (!res.ok) {
      mostrarAviso("Erro ao remover");
      return;
    }
    mostrarAviso("Item removido");
    await carregarEstoque();
    await carregarMovimentos();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao remover");
  }
}

async function importarCsvArquivo(arquivo) {
  if (!arquivo) return;
  try {
    const texto = await arquivo.text();
    const itens = parseCsvTexto(texto);
    if (!itens.length) {
      mostrarAviso("CSV vazio ou invalido");
      return;
    }

    const res = await authFetch("/adminn/estoque/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itens })
    });

    if (!res.ok) {
      mostrarAviso("Erro ao importar CSV");
      return;
    }

    const data = await res.json();
    mostrarAviso(`Importado: ${data.created || 0} novos, ${data.updated || 0} atualizados`);
    await carregarEstoque();
    await carregarMovimentos();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao importar CSV");
  }
}

async function sincronizarBebidas() {
  try {
    const res = await authFetch("/adminn/estoque/sincronizar-bebidas", { method: "POST" });
    if (!res.ok) {
      mostrarAviso("Erro ao sincronizar bebidas");
      return;
    }
    const data = await res.json();
    mostrarAviso(`Bebidas: ${data.created || 0} novas, ${data.updated || 0} atualizadas`);
    await carregarEstoque();
  } catch (err) {
    console.error(err);
    mostrarAviso("Erro ao sincronizar bebidas");
  }
}

btnAdicionar && btnAdicionar.addEventListener("click", adicionarItem);
btnRecarregar && btnRecarregar.addEventListener("click", async () => {
  await carregarEstoque();
  await carregarMovimentos();
});
btnSyncBebidas && btnSyncBebidas.addEventListener("click", sincronizarBebidas);

if (importBtn && importFile) {
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const arquivo = importFile.files && importFile.files[0];
    await importarCsvArquivo(arquivo);
    importFile.value = "";
  });
}

if (categoriaInput) {
  categoriaInput.addEventListener("change", () => {
    if (categoriaInput.value === "bebida") {
      autoInput.checked = true;
    }
  });
}

window.addEventListener("load", () => {
  carregarEstoque();
  carregarMovimentos();
});
