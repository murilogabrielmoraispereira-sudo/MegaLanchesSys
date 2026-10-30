import { describe, expect, it } from "vitest";
import type { ContactMatch } from "../types";
import { resolveContactMatches } from "./contactResolution";

const contact = (telefone: string, nome: string): ContactMatch => ({
  telefone,
  telefoneOculto: `55*****${telefone.slice(-4)}`,
  finalTelefone: telefone.slice(-4),
  nome,
  ultimaMensagem: "Quero fazer um pedido",
  atualizadoEm: new Date(0).toISOString(),
});

describe("resolveContactMatches", () => {
  it("seleciona automaticamente quando existe um contato", () => {
    const result = resolveContactMatches([contact("553599994587", "Joao")]);
    expect(result.selected?.nome).toBe("Joao");
    expect(result.requiresSelection).toBe(false);
  });

  it("nao escolhe quando dois contatos terminam nos mesmos quatro digitos", () => {
    const result = resolveContactMatches([
      contact("553599994587", "Joao"),
      contact("553588884587", "Maria"),
    ]);
    expect(result.selected).toBeNull();
    expect(result.requiresSelection).toBe(true);
  });
});
