async function carregarEntregadores() {
  const res = await authFetch("/adminn/entregadores");
  const entregadores = await res.json();
  const lista = document.getElementById("listaEntregadores");
  lista.innerHTML = "";
  entregadores.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.nome}</td>
      <td>${e.ativo ? "Ativo" : "Inativo"}</td>
      <td>
        <button class="btn small danger" onclick="remover(${e.id})">Remover</button>
        <button class="btn small outline" onclick="alternarStatus(${e.id}, ${!e.ativo})">
          ${e.ativo ? "Desativar" : "Ativar"}
        </button>
      </td>
    `;
    lista.appendChild(tr);
  });
}

async function adicionar() {
  const nome = document.getElementById("nomeEntregador").value.trim();
  if (!nome) return alert("Digite o nome do entregador!");
  await authFetch("/adminn/entregadores/adicionar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  document.getElementById("nomeEntregador").value = "";
  carregarEntregadores();
}

async function remover(id) {
  await authFetch(`/adminn/entregadores/remover/${id}`, { method: "DELETE" });
  carregarEntregadores();
}

async function alternarStatus(id, ativo) {
  await authFetch("/adminn/entregadores/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ativo }),
  });
  carregarEntregadores();
}

document.getElementById("btnAdicionar").addEventListener("click", adicionar);
carregarEntregadores();
