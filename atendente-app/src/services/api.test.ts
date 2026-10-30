import { beforeAll, describe, expect, it, vi } from "vitest";
import type { OrderDetails } from "../types";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

const draft: OrderDetails = {
  requestId: "retry-same-request-123",
  cliente: "Joao",
  telefone: "",
  endereco: "",
  tipoEntrega: "Retirada",
  pagamento: "pix",
  troco: "",
  obsGeral: "",
  complementosPedido: [],
  itens: [{
    produtoId: "1",
    nome: "X-Tudo",
    preco: 22,
    qtd: 1,
    adicionais: [],
    removidos: [],
    obs: "",
    tipo: "item",
    categoria: "lanches",
  }],
};

describe("createOrder retry", () => {
  beforeAll(() => {
    process.env.EXPO_PUBLIC_API_URL = "http://localhost:3000";
  });

  it("propaga perda de conexao e reutiliza o mesmo requestId na tentativa seguinte", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, pedidoId: 10, cliente: "Joao", total: 22, status: "recebido", createdAt: new Date(0).toISOString() }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { createOrder } = await import("./api");

    await expect(createOrder("token", draft)).rejects.toThrow("Network request failed");
    await expect(createOrder("token", draft)).resolves.toMatchObject({ pedidoId: 10 });

    const firstBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstBody.requestId).toBe("retry-same-request-123");
    expect(secondBody.requestId).toBe(firstBody.requestId);
  });

  it("busca contatos combinando nome, final e telefone completo", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, contatos: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { searchContacts } = await import("./api");

    await expect(searchContacts("token", {
      nome: "Joao",
      finalTelefone: "8468",
      telefone: "35984168468",
    })).resolves.toEqual([]);

    const url = String(fetchMock.mock.calls[0][0]);
    const init = fetchMock.mock.calls[0][1];
    expect(url).toContain("/api/atendente/contatos?");
    expect(url).toContain("nome=Joao");
    expect(url).toContain("final=8468");
    expect(url).toContain("telefone=35984168468");
    expect(init?.signal).toBeTruthy();
  });

  it("envia somente apelido e produtos para medir o aprendizado", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, registered: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendParserUsage } = await import("./api");

    await sendParserUsage("token", [
      { termo: "lanche cowboy", produtoId: "2", produtoNome: "X-Bacon" },
    ], ["2"]);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      usos: [{ termo: "lanche cowboy", produtoId: "2", produtoNome: "X-Bacon" }],
      produtosFinais: ["2"],
    });
    expect(JSON.stringify(body)).not.toMatch(/telefone|endereco|observacao/i);
  });

  it("envia revisao estrutural sem dados pessoais do cliente", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, registered: true, corrected: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { sendParserObservation } = await import("./api");

    await sendParserObservation("token", {
      requestId: "observation-request-123",
      initialItems: [{ produtoId: "1", qtd: 1, removidos: [], adicionais: [] }],
      finalItems: [{ produtoId: "1", qtd: 2, removidos: ["Cebola"], adicionais: [] }],
      ambiguities: 0,
      unknown: 0,
      warnings: 1,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.finalItems[0]).toMatchObject({ produtoId: "1", qtd: 2, removidos: ["Cebola"] });
    expect(JSON.stringify(body)).not.toMatch(/cliente|telefone|endereco|pagamento|troco|obsGeral/i);
  });

  it("normaliza listas ausentes do catalogo antes de chegar nas telas", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, cardapio: [{ id: 2, nome: "X-Bacon", preco: 20, disponivel: true }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { loadCatalog } = await import("./api");

    const catalog = await loadCatalog("token");
    expect(catalog.adicionais).toEqual([]);
    expect(catalog.cardapio[0].ingredientes).toEqual([]);
    expect(catalog.cardapio[0].apelidos).toEqual([]);
  });

  it("carrega a analise de IA do cliente pelo telefone selecionado", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, ia: { status: "ready", insight: { resumo: "Perfil recorrente" } } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { loadCustomerAiInsight } = await import("./api");

    await expect(loadCustomerAiInsight("token", "35984168922")).resolves.toMatchObject({ status: "ready" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/atendente/clientes/insight-ia?telefone=35984168922");
  });

  it("carrega contas e entra usando o identificador selecionado", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, items: [{ id: "login-id-seguro-01", name: "Atendente" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, token: "token-app" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { loadLoginAccounts, login } = await import("./api");

    await expect(loadLoginAccounts()).resolves.toEqual({
      items: [{ id: "login-id-seguro-01", name: "Atendente" }],
      setupRequired: false,
    });
    await expect(login("login-id-seguro-01", "senha")).resolves.toBe("token-app");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      loginId: "login-id-seguro-01",
      senha: "senha",
    });
  });

  it("limpa a sessao e avisa o aplicativo quando qualquer chamada autenticada retorna 401", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: "unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const secureStore = await import("expo-secure-store");
    const { setUnauthorizedHandler, validateOrder } = await import("./api");
    const handler = vi.fn();
    const unsubscribe = setUnauthorizedHandler(handler);

    await expect(validateOrder("token-vencido", {
      tipoEntrega: "Retirada",
      itens: draft.itens,
      complementosPedido: [],
    })).rejects.toThrow("unauthorized");

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("mega_lanches_atendente_token");
    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
