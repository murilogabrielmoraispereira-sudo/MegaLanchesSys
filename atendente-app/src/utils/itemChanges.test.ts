import { describe, expect, it } from "vitest";
import { formatItemChanges, getItemCutOption, setItemCutOption } from "./itemChanges";

describe("formatItemChanges", () => {
  it("mostra remocao estruturada uma unica vez", () => {
    expect(formatItemChanges({ removidos: ["batata palha"], adicionais: [], obs: "Sem batata palha" }).linhas)
      .toEqual(["Sem batata palha"]);
  });

  it("preserva parte livre da observacao antiga", () => {
    expect(formatItemChanges({ removidos: ["tomate"], adicionais: [], obs: "Sem tomate e embalar separado" }).linhas)
      .toEqual(["Sem tomate", "Obs: embalar separado"]);
  });

  it("remove observacao que duplica adicional", () => {
    expect(formatItemChanges({ removidos: [], adicionais: [{ nome: "Catupiry", preco: 4, qtd: 1 }], obs: "Mais catupiry" }).linhas)
      .toEqual(["Adicional: Catupiry"]);
  });

  it("preserva observacao diferente do adicional", () => {
    expect(formatItemChanges({ removidos: [], adicionais: [{ nome: "Catupiry", preco: 4, qtd: 1 }], obs: "Colocar o catupiry separado" }).linhas)
      .toEqual(["Adicional: Catupiry", "Obs: Colocar o catupiry separado"]);
  });
});

describe("corte do lanche", () => {
  it("adiciona o corte sem apagar observacao livre", () => {
    const half = setItemCutOption("Molho separado", "Partir ao meio");
    expect(half).toBe("Molho separado; Partir ao meio");
    expect(getItemCutOption(half)).toBe("Partir ao meio");
  });

  it("volta para inteiro removendo inclusive uma instrucao antiga", () => {
    expect(setItemCutOption("Sem pressa; Cortar em 4", "")).toBe("Sem pressa");
  });
});
