function atualizarAlertaEstoque() {
  const alerta = document.getElementById("alerta-estoque");
  if (!alerta) return;

  authFetch("/adminn/estoque/resumo")
    .then((res) => res.json())
    .then((data) => {
      const baixo = Number(data?.baixo || 0);
      const total = Number(data?.total || 0);
      const strong = alerta.querySelector("strong");
      if (strong) strong.textContent = String(baixo);

      if (baixo > 0) {
        alerta.classList.add("ativo");
        alerta.title = `${baixo} item(s) abaixo do minimo`;
      } else {
        alerta.classList.remove("ativo");
        alerta.title = total ? "Estoque OK" : "Sem itens cadastrados";
      }
    })
    .catch(() => {
      // ignore
    });
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarAlertaEstoque();
  setInterval(atualizarAlertaEstoque, 60000);
});
