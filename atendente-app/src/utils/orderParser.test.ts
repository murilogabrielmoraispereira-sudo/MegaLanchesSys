import { describe, expect, it } from "vitest";
import type { Catalog } from "../types";
import { formatItemChanges } from "./itemChanges";
import { interpretOrder } from "./orderParser";

const catalog: Catalog = {
  taxaEntrega: 9,
  atualizadoEm: new Date(0).toISOString(),
  adicionais: [
    { nome: "Bacon", preco: 3 },
    { nome: "Ovo", preco: 2 },
    { nome: "Catupiry", preco: 4 },
    { nome: "Maionese caseira", preco: 1 },
    { nome: "Ketchup", preco: 1 },
  ],
  cardapio: [
    {
      id: "promo-xtudo-1",
      nome: "X-Tudo (Promocao)",
      preco: 22,
      categoria: "promocao",
      ingredientes: ["Pure de batata", "Batata-palha", "Milho", "Cebola", "Tomate"],
      disponivel: true,
      tipo: "promocao",
      promocao: { preco_unidade: 22, preco_combo: 20, min_qtd: 2 },
    },
    { id: 1, nome: "X-Tudo", preco: 22, categoria: "lanches", ingredientes: ["Pure de batata", "Batata-palha", "Milho", "Cebola", "Tomate"], disponivel: true },
    { id: 2, nome: "X-Bacon", preco: 20, categoria: "lanches", ingredientes: ["Cebola", "Milho"], disponivel: true },
    { id: 3, nome: "X-Salada", preco: 18, categoria: "lanches", ingredientes: ["Tomate", "Cebola"], disponivel: true },
    { id: 4, nome: "X-Burguer", preco: 15, categoria: "lanches", ingredientes: ["Carne", "Queijo"], disponivel: true },
    { id: 8, nome: "X-Egg", preco: 18, categoria: "lanches", ingredientes: ["Ovo", "Tomate"], disponivel: true },
    { id: 9, nome: "X-Bacon Egg", preco: 21, categoria: "lanches", ingredientes: ["Bacon", "Ovo"], disponivel: true },
    { id: 5, nome: "Coca-Cola 2L", preco: 12, categoria: "bebidas", ingredientes: [], disponivel: true },
    { id: 6, nome: "Coca-Cola Lata", preco: 6, categoria: "bebidas", ingredientes: [], disponivel: true },
    { id: 7, nome: "Batata Grande", preco: 20, categoria: "porcoes", ingredientes: [], disponivel: true },
    { id: 10, nome: "Crispy Cheese Bacon", preco: 24, categoria: "lanches", ingredientes: ["Tomate", "Alface"], disponivel: true },
    { id: 11, nome: "Especial da Casa", preco: 25, categoria: "lanches", ingredientes: ["Milho", "Batata", "Tomate"], disponivel: true },
    { id: 12, nome: "Mega Cheddar", preco: 27, categoria: "lanches", ingredientes: ["Alface", "Tomate"], disponivel: true },
    { id: 13, nome: "Frango", preco: 26, categoria: "frango", ingredientes: ["File de Frango", "Mussarela", "Tomate"], disponivel: true },
    { id: 14, nome: "Frango Bacon", preco: 28, categoria: "frango", ingredientes: ["File de Frango", "Mussarela", "Bacon", "Pure de batata", "Batata-palha"], disponivel: true },
  ],
};

const catalogWithoutBaconEgg: Catalog = {
  ...catalog,
  cardapio: catalog.cardapio.filter((item) => item.nome !== "X-Bacon Egg"),
};

describe("interpretOrder", () => {
  it("interpreta produtos e quantidades", () => {
    const result = interpretOrder("2 x-tudo e 1 coca 2 litros", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Tudo (Promocao)", 2],
      ["Coca-Cola 2L", 1],
    ]);
  });

  it("usa apelido aprendido e aprovado para identificar o produto", () => {
    const learnedCatalog: Catalog = {
      ...catalog,
      cardapio: catalog.cardapio.map((item) => item.id === 2 ? { ...item, apelidos: ["lanche cowboy"] } : item),
    };
    const result = interpretOrder("2 lanche cowboy retirada", learnedCatalog);
    expect(result.pedido.itens).toHaveLength(1);
    expect(result.pedido.itens[0].nome).toBe("X-Bacon");
    expect(result.aprendizadosUsados).toEqual([
      { termo: "lanche cowboy", produtoId: "2", produtoNome: "X-Bacon" },
    ]);
    expect(result.pedido.itens[0].qtd).toBe(2);
  });

  it("interpreta ingredientes removidos", () => {
    const result = interpretOrder("1 x-bacon sem cebola e sem milho", catalog);
    expect(result.pedido.itens[0].removidos).toEqual(["Cebola", "Milho"]);
  });

  it.each([
    ["1 tudo sem tomate sem milho", ["Milho", "Tomate"]],
    ["1 x-tudo sem tomate e milho", ["Milho", "Tomate"]],
    ["1 x-tudo sem tomate sem milho sem cebola", ["Cebola", "Milho", "Tomate"]],
  ])("interpreta remocoes multiplas consecutivas: %s", (text, expected) => {
    const result = interpretOrder(text, catalog);
    expect(result.pedido.itens).toHaveLength(1);
    expect([...result.pedido.itens[0].removidos].sort()).toEqual(expected);
  });

  it("preserva a segunda remocao quando a fala continua depois do ingrediente", () => {
    const productionCatalog: Catalog = {
      ...catalog,
      cardapio: catalog.cardapio.map((item) => item.id === 1
        ? { ...item, ingredientes: ["Pure de batata", "Batata-palha", "Milho x2", "Cebola", "Tomate"] }
        : item),
    };
    const result = interpretOrder("1 tudo sem tomate sem milho bem caprichado", productionCatalog);
    expect([...result.pedido.itens[0].removidos].sort()).toEqual(["Milho", "Tomate"]);
  });

  it("separa duas unidades com configuracoes diferentes", () => {
    const result = interpretOrder("dois x-salada, um normal e outro sem tomate", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens.map((item) => item.qtd)).toEqual([1, 1]);
    expect(result.pedido.itens[1].removidos).toContain("Tomate");
  });

  it("interpreta adicionais", () => {
    const result = interpretOrder("1 x-burguer com adicional de bacon e ovo", catalog);
    expect(result.pedido.itens[0].adicionais.map((item) => item.nome)).toEqual(["Bacon", "Ovo"]);
  });

  it("interpreta quantidade de adicionais no mesmo item", () => {
    const result = interpretOrder("1 x-burguer com 2 bacon e 3 ovo", catalog);
    expect(result.pedido.itens[0].adicionais.map((item) => [item.nome, item.qtd])).toEqual([
      ["Bacon", 2],
      ["Ovo", 3],
    ]);
  });

  it("reconhece frango para entrega com o preco normal do catalogo", () => {
    const result = interpretOrder("1 frango para entrega", catalog);
    expect(result.pedido.itens).toMatchObject([{
      produtoId: "13",
      nome: "Frango",
      preco: 26,
      qtd: 1,
    }]);
    expect(result.ambiguidades).toEqual([]);
  });

  it("trata maionese como complemento total do pedido", () => {
    const result = interpretOrder("2 x-tudo mais 4 maionese", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Tudo (Promocao)", qtd: 2, adicionais: [] }]);
    expect(result.pedido.complementosPedido).toEqual([{ nome: "Maionese caseira", preco: 1, qtd: 4 }]);
  });

  it.each([
    "3 x-tudo mais 2 maionese",
    "3 x-tudo com 2 maionese",
  ])("nao multiplica duas maioneses pelos tres lanches: %s", (text) => {
    const result = interpretOrder(text, catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Tudo (Promocao)", qtd: 3, adicionais: [] }]);
    expect(result.pedido.complementosPedido).toEqual([{ nome: "Maionese caseira", preco: 1, qtd: 2 }]);
  });

  it("trata ketchup como complemento total do pedido", () => {
    const result = interpretOrder("3 x-burguer mais 5 ketchup", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Burguer", qtd: 3, adicionais: [] }]);
    expect(result.pedido.complementosPedido).toEqual([{ nome: "Ketchup", preco: 1, qtd: 5 }]);
  });

  it("teste duplicacao 1: mostra remocao simples uma unica vez", () => {
    const result = interpretOrder("1 x-tudo sem batata palha", catalog);
    const item = result.pedido.itens[0];
    expect(item).toMatchObject({ nome: "X-Tudo", removidos: ["Batata-palha"], obs: "" });
    expect(formatItemChanges(item).linhas).toEqual(["Sem batata palha"]);
  });

  it("teste duplicacao 2: preserva observacao livre junto da remocao", () => {
    const result = interpretOrder("1 x-tudo sem tomate partir ao meio", catalog);
    const item = result.pedido.itens[0];
    expect(item).toMatchObject({ nome: "X-Tudo", removidos: ["Tomate"], obs: "Partir ao meio" });
    expect(formatItemChanges(item).linhas).toEqual(["Sem tomate", "Obs: Partir ao meio"]);
  });

  it("teste duplicacao 3: separa remocao e adicional sem repetir na observacao", () => {
    const result = interpretOrder("1 x-bacon sem cebola mais catupiry", catalog);
    const item = result.pedido.itens[0];
    expect(item).toMatchObject({ nome: "X-Bacon", removidos: ["Cebola"], obs: "" });
    expect(item.adicionais.map((add) => add.nome)).toEqual(["Catupiry"]);
    expect(formatItemChanges(item).linhas).toEqual(["Sem cebola", "Adicional: Catupiry"]);
  });

  it("teste duplicacao 4: formata alteracoes por unidade sem duplicar", () => {
    const result = interpretOrder("2 x-tudo 1 sem milho 1 sem tomate", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(formatItemChanges(result.pedido.itens[0]).linhas).toEqual(["Sem milho"]);
    expect(formatItemChanges(result.pedido.itens[1]).linhas).toEqual(["Sem tomate"]);
  });

  it("teste duplicacao 5: reconhece crispy com remocao e corte", () => {
    const result = interpretOrder("1 crispy sem tomate partir ao meio", catalog);
    const item = result.pedido.itens[0];
    expect(item).toMatchObject({ nome: "Crispy Cheese Bacon", removidos: ["Tomate"], obs: "Partir ao meio" });
    expect(formatItemChanges(item).linhas).toEqual(["Sem tomate", "Obs: Partir ao meio"]);
  });

  it("teste duplicacao 6: deduplica pedido antigo com observacao repetida", () => {
    expect(formatItemChanges({ removidos: ["batata palha"], adicionais: [], obs: "Sem batata palha" }).linhas)
      .toEqual(["Sem batata palha"]);
  });

  it("teste duplicacao 7: remove somente a parte repetida da observacao antiga", () => {
    expect(formatItemChanges({ removidos: ["tomate"], adicionais: [], obs: "Sem tomate e embalar separado" }).linhas)
      .toEqual(["Sem tomate", "Obs: embalar separado"]);
  });

  it("teste duplicacao 8: deduplica adicional repetido na observacao", () => {
    expect(formatItemChanges({ removidos: [], adicionais: [{ nome: "Catupiry", preco: 4, qtd: 1 }], obs: "Mais catupiry" }).linhas)
      .toEqual(["Adicional: Catupiry"]);
  });

  it("teste duplicacao 9: complemento total nao vira observacao do item", () => {
    const result = interpretOrder("2 x-tudo mais 4 maionese", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Tudo (Promocao)", qtd: 2, adicionais: [], obs: "" }]);
    expect(result.pedido.complementosPedido).toEqual([{ nome: "Maionese caseira", preco: 1, qtd: 4 }]);
    expect(formatItemChanges(result.pedido.itens[0]).linhas).toEqual([]);
  });

  it("separa crispy, maionese e ketchup em totais do pedido", () => {
    const result = interpretOrder("2 crispy mais 3 maionese e 2 ketchup", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "Crispy Cheese Bacon", qtd: 2, adicionais: [] }]);
    expect(result.pedido.complementosPedido).toEqual([
      { nome: "Maionese caseira", preco: 1, qtd: 3 },
      { nome: "Ketchup", preco: 1, qtd: 2 },
    ]);
  });

  it("gera observacao legivel para remocao individual", () => {
    const result = interpretOrder("1 tudo sem tomate", catalog);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "X-Tudo", removidos: ["Tomate"], obs: "" });
  });

  it("mantem catupiry somente na unidade marcada", () => {
    const result = interpretOrder("2 tudo 1 sem tomate mais catupiry", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ removidos: ["Tomate"], obs: "" });
    expect(result.pedido.itens[0].adicionais.map((item) => item.nome)).toEqual(["Catupiry"]);
    expect(result.pedido.itens[1]).toMatchObject({ removidos: [], adicionais: [], obs: "" });
  });

  it("separa duas remocoes em unidades diferentes", () => {
    const result = interpretOrder("2 tudo 1 sem milho 1 sem tomate", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ removidos: ["Milho"], obs: "" });
    expect(result.pedido.itens[1]).toMatchObject({ removidos: ["Tomate"], obs: "" });
  });

  it("funciona com x-bacon em unidades diferentes", () => {
    const result = interpretOrder("2 x-bacon 1 sem cebola 1 sem milho", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "X-Bacon", removidos: ["Cebola"], obs: "" });
    expect(result.pedido.itens[1]).toMatchObject({ nome: "X-Bacon", removidos: ["Milho"], obs: "" });
  });

  it("reconhece crispy por alias distintivo", () => {
    const result = interpretOrder("2 crispy 1 sem tomate 1 normal", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "Crispy Cheese Bacon", removidos: ["Tomate"], obs: "" });
    expect(result.pedido.itens[1]).toMatchObject({ nome: "Crispy Cheese Bacon", removidos: [], obs: "" });
  });

  it("reconhece especial por alias distintivo", () => {
    const result = interpretOrder("2 especial 1 sem milho outro sem batata", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "Especial da Casa", removidos: ["Milho"], obs: "" });
    expect(result.pedido.itens[1]).toMatchObject({ nome: "Especial da Casa", removidos: ["Batata"], obs: "" });
  });

  it("diferencia produto depois de complemento", () => {
    const result = interpretOrder("1 tudo mais 2 maionese 1 coca 2lt", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Tudo", 1],
      ["Coca-Cola 2L", 1],
    ]);
    expect(result.pedido.complementosPedido).toEqual([{ nome: "Maionese caseira", preco: 1, qtd: 2 }]);
  });

  it("permite maionese individual somente com contexto dentro do lanche", () => {
    const result = interpretOrder("2 tudo 1 com 2 maionese dentro do lanche 1 normal", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0].adicionais.map((item) => [item.nome, item.qtd])).toEqual([["Maionese caseira", 2]]);
    expect(result.pedido.itens[0].adicionais[0].escopo).toBe("unidade");
    expect(result.pedido.complementosPedido).toEqual([]);
  });

  it("registra corte ou partir como observacao do item", () => {
    const result = interpretOrder("1 x-bacon partir ao meio na porta", catalog);
    expect(result.pedido.itens[0].obs).toBe("Partir ao meio");
    expect(result.pedido.tipoEntrega).toBe("Na porta");
  });

  it.each([
    ["2 x frango", "Frango", 2],
    ["1 x-frango bacon", "Frango Bacon", 1],
    ["um lanche de frango bacon", "Frango Bacon", 1],
  ])("aceita formas comuns de escrever lanche de frango: %s", (text, name, quantity) => {
    const result = interpretOrder(text, catalog);
    expect(result.pedido.itens).toHaveLength(1);
    expect(result.pedido.itens[0]).toMatchObject({ nome: name, qtd: quantity });
  });

  it("entende partido sem exigir a expressao ao meio", () => {
    const result = interpretOrder("2 x tudo partido", catalog);
    expect(result.pedido.itens).toHaveLength(1);
    expect(result.pedido.itens[0]).toMatchObject({ qtd: 2, obs: "Partir ao meio" });
  });

  it.each([
    "partido 1 x tudo",
    "1 partido x tudo",
    "partido x tudo",
    "1 x tudo partido",
    "partido 1 tudo",
    "1 partido bacon",
    "1 part tudo",
  ])("entende partido antes ou depois do produto: %s", (text) => {
    const result = interpretOrder(text, catalog);
    expect(result.pedido.itens).toHaveLength(1);
    expect(result.pedido.itens[0]).toMatchObject({ qtd: 1, obs: "Partir ao meio" });
  });

  it("aceita produto e alteracoes abreviadas no mesmo pedido", () => {
    const result = interpretOrder("1 tudo s/ tom s/ bat + maion", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Tudo", qtd: 1 }]);
    expect(result.pedido.itens[0].removidos).toEqual(expect.arrayContaining(["Tomate", "Batata-palha"]));
    expect(result.pedido.complementosPedido).toMatchObject([{ nome: "Maionese caseira", qtd: 1 }]);
  });

  it("aceita menos e adicional abreviado", () => {
    const result = interpretOrder("1 bacon - milho + cat", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Bacon", qtd: 1, removidos: ["Milho"] }]);
    expect(result.pedido.itens[0].adicionais).toMatchObject([{ nome: "Catupiry", qtd: 1 }]);
  });

  it("entende partido antes de um lanche de frango", () => {
    const result = interpretOrder("partido 1 x frango bacon", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "Frango Bacon", qtd: 1, obs: "Partir ao meio" }]);
  });

  it("associa partido somente ao lanche indicado em pedido com varios produtos", () => {
    const firstCut = interpretOrder("1 partido x tudo e 1 x bacon", catalog);
    expect(firstCut.pedido.itens.map((item) => [item.nome, item.obs])).toEqual([
      ["X-Tudo", "Partir ao meio"],
      ["X-Bacon", ""],
    ]);

    const secondCut = interpretOrder("1 x tudo e 1 partido x frango", catalog);
    expect(secondCut.pedido.itens.map((item) => [item.nome, item.obs])).toEqual([
      ["X-Tudo", ""],
      ["Frango", "Partir ao meio"],
    ]);
  });

  it("aceita remocoes consecutivas e sinal de mais para complemento", () => {
    const result = interpretOrder("1 x tudo sem pure sem batata + maionese", catalog);
    expect(result.pedido.itens[0].removidos).toEqual(expect.arrayContaining(["Pure de batata", "Batata-palha"]));
    expect(result.pedido.complementosPedido).toMatchObject([{ nome: "Maionese caseira", qtd: 1 }]);
  });

  it.each([
    ["1 x frango bacon jose dias 42 pix", "jose dias 42"],
    ["2 x tudo sem pure sem batata, joao pinheiro 150 dinheiro", "joao pinheiro 150"],
    ["1 x bacon, penha 263, pix", "penha 263"],
    ["1 x bacon entrega em penha 263 pix", "penha 263"],
    ["1 x bacon endereco antonio carlos 81 cartao", "endereco antonio carlos 81"],
  ])("identifica endereco mesmo sem tipo de logradouro: %s", (text, address) => {
    const result = interpretOrder(text, catalog);
    expect(result.pedido.endereco).toContain(address);
  });

  it("interpreta retirada e pagamento", () => {
    const result = interpretOrder("3 coca lata para retirada, pagamento pix", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.pagamento).toBe("pix");
  });

  it("interpreta cliente, endereco e troco", () => {
    const result = interpretOrder(
      "1 x-tudo para Joao, entrega na Rua das Flores 120, dinheiro, troco para 100",
      catalog
    );
    expect(result.pedido.cliente).toBe("joao");
    expect(result.pedido.endereco).toContain("rua das flores 120");
    expect(result.pedido.troco).toBe("100");
  });

  it("troco informado define automaticamente pagamento em dinheiro", () => {
    const result = interpretOrder("2 tudo troco para 50", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Tudo (Promocao)", 2]]);
    expect(result.pedido.pagamento).toBe("dinheiro");
    expect(result.pedido.troco).toBe("50");
  });

  it("aceita erro simples de digitacao", () => {
    const result = interpretOrder("1 x-tudoo", catalog);
    expect(result.pedido.itens[0].nome).toBe("X-Tudo");
    expect(result.reconhecimentos).toEqual([
      { termo: "tudoo", produtoId: "1", produtoNome: "X-Tudo", source: "fuzzy" },
    ]);
  });

  it("nao inventa produto inexistente", () => {
    const result = interpretOrder("1 pizza calabresa", catalog);
    expect(result.pedido.itens).toHaveLength(0);
    expect(result.naoIdentificados).toHaveLength(1);
  });

  it("marca bebida generica como ambigua", () => {
    const result = interpretOrder("1 refrigerante", catalog);
    expect(result.ambiguidades).toHaveLength(1);
    expect(result.pedido.itens).toHaveLength(0);
  });

  it("detecta endereco, dinheiro e troco sem exigir nome", () => {
    const result = interpretOrder("2 x-tudo sem milho rua Joao Pinheiro 150 dinheiro troco 100", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Tudo (Promocao)", 2]]);
    expect(result.pedido.itens[0].removidos).toContain("Milho");
    expect(result.pedido.tipoEntrega).toBe("Entrega");
    expect(result.pedido.endereco).toContain("rua joao pinheiro 150");
    expect(result.pedido.pagamento).toBe("dinheiro");
    expect(result.pedido.troco).toBe("100");
    expect(result.pedido.cliente).toBe("");
  });

  it("identifica nome ligado a retirada e quantidades independentes", () => {
    const result = interpretOrder("retirada Joao 2 x-bacon e uma coca lata", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.cliente).toBe("joao");
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon", 2],
      ["Coca-Cola Lata", 1],
    ]);
  });

  it("identifica quatro digitos somente quando ligados a retirada", () => {
    const result = interpretOrder("retirada 4587 um x-tudo sem cebola", catalog);
    expect(result.pedido.telefoneFinal).toBe("4587");
    expect(result.pedido.itens[0].removidos).toContain("Cebola");
  });

  it("calcula unidades por categorias reais", () => {
    const result = interpretOrder("dois x-salada e tres coca lata rua das flores 80 pix", catalog);
    const totals = result.pedido.itens.reduce<Record<string, number>>((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + item.qtd;
      return acc;
    }, {});
    expect(totals).toEqual({ lanches: 2, bebidas: 3 });
    expect(result.pedido.itens.reduce((sum, item) => sum + item.qtd, 0)).toBe(5);
    expect(result.pedido.endereco).toContain("rua das flores 80");
  });

  it("separa produtos sem quantidade e identifica retirada no final", () => {
    const result = interpretOrder("x-tudo x-bacon e coca dois litros retirada Maria", catalog);
    expect(result.pedido.cliente).toBe("maria");
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Tudo", 1],
      ["X-Bacon", 1],
      ["Coca-Cola 2L", 1],
    ]);
  });

  it("nao confunde numero do endereco com final do telefone", () => {
    const result = interpretOrder("1 x-tudo rua Joao Pinheiro 4587", catalog);
    expect(result.pedido.endereco).toContain("4587");
    expect(result.pedido.telefoneFinal).toBe("");
  });

  it("nao confunde final do telefone com valor do troco", () => {
    const result = interpretOrder("retirada 4587 1 x-bacon dinheiro troco 50", catalog);
    expect(result.pedido.telefoneFinal).toBe("4587");
    expect(result.pedido.troco).toBe("50");
  });

  it("prioriza retirada mas avisa quando tambem ha endereco", () => {
    const result = interpretOrder("1 x-tudo rua das flores 80 retirada Maria", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.endereco).toContain("rua das flores 80");
    expect(result.avisos).toHaveLength(1);
  });

  it("aplica a promocao real em dois x-tudo", () => {
    const result = interpretOrder("2 x-tudo", catalog);
    expect(result.pedido.itens).toMatchObject([{ nome: "X-Tudo (Promocao)", qtd: 2, preco: 22 }]);
  });

  it("separa remocoes e adicionais por unidade promocional", () => {
    const result = interpretOrder("2 x-tudo 1 sem milho mais bacon 1 sem tomate mais catupiry", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0]).toMatchObject({ qtd: 1, removidos: ["Milho"] });
    expect(result.pedido.itens[0].adicionais.map((item) => item.nome)).toEqual(["Bacon"]);
    expect(result.pedido.itens[1]).toMatchObject({ qtd: 1, removidos: ["Tomate"] });
    expect(result.pedido.itens[1].adicionais.map((item) => item.nome)).toEqual(["Catupiry"]);
  });

  it("entende um e outro como unidades diferentes", () => {
    const result = interpretOrder("dois x tudo um sem cebola e o outro com adicional de ovo", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0].removidos).toEqual(["Cebola"]);
    expect(result.pedido.itens[1].adicionais.map((item) => item.nome)).toEqual(["Ovo"]);
  });

  it("associa primeiro segundo e terceiro", () => {
    const result = interpretOrder("3 x-tudo primeiro sem milho segundo sem tomate terceiro mais bacon", catalog);
    expect(result.pedido.itens).toHaveLength(3);
    expect(result.pedido.itens[0].removidos).toEqual(["Milho"]);
    expect(result.pedido.itens[1].removidos).toEqual(["Tomate"]);
    expect(result.pedido.itens[2].adicionais.map((item) => item.nome)).toEqual(["Bacon"]);
  });

  it("aplica alteracoes a todas as unidades", () => {
    const result = interpretOrder("2 x-tudo os dois sem milho e com mais bacon", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    result.pedido.itens.forEach((item) => {
      expect(item.removidos).toEqual(["Milho"]);
      expect(item.adicionais.map((additional) => additional.nome)).toEqual(["Bacon"]);
    });
  });

  it("mantem uma unidade normal e configura a outra", () => {
    const result = interpretOrder("2 x-tudo 1 normal 1 sem tomate mais catupiry", catalog);
    expect(result.pedido.itens[0]).toMatchObject({ removidos: [], adicionais: [] });
    expect(result.pedido.itens[1].removidos).toEqual(["Tomate"]);
    expect(result.pedido.itens[1].adicionais.map((item) => item.nome)).toEqual(["Catupiry"]);
  });

  it("aplica alteracao sem marcador a todas e mantem o agrupamento", () => {
    const result = interpretOrder("2 x-tudo sem milho", catalog);
    expect(result.pedido.itens).toMatchObject([{ qtd: 2, removidos: ["Milho"] }]);
  });

  it("sugere correcoes sem aplicar termos incertos", () => {
    const result = interpretOrder("2 x-tudo 1 sem milhoo mais bacom 1 sem tomati mais catupiri", catalog);
    expect(result.avisos.join(" ").toLowerCase()).toContain("milho");
    expect(result.avisos.join(" ").toLowerCase()).toContain("bacon");
    expect(result.avisos.join(" ").toLowerCase()).toContain("tomate");
    expect(result.avisos.join(" ").toLowerCase()).toContain("catupiry");
    expect(result.pedido.itens.every((item) => item.removidos.length === 0 && item.adicionais.length === 0)).toBe(true);
  });

  it("aplica um adicional somente a uma unidade", () => {
    const result = interpretOrder("2 x-tudo 1 mais bacon", catalog);
    expect(result.pedido.itens).toHaveLength(2);
    expect(result.pedido.itens[0].adicionais.map((item) => item.nome)).toEqual(["Bacon"]);
    expect(result.pedido.itens[1].adicionais).toEqual([]);
  });

  it("distribui contagens de alteracoes em quatro unidades", () => {
    const result = interpretOrder("4 x-tudo 2 sem milho 1 mais bacon e 1 normal", catalog);
    expect(result.pedido.itens).toHaveLength(4);
    expect(result.pedido.itens.slice(0, 2).every((item) => item.removidos.includes("Milho"))).toBe(true);
    expect(result.pedido.itens[2].adicionais.map((item) => item.nome)).toEqual(["Bacon"]);
    expect(result.pedido.itens[3]).toMatchObject({ removidos: [], adicionais: [] });
  });

  it("teste obrigatorio 1: separa x-tudo, modificacoes por unidade, coca 2lt e retirada", () => {
    const result = interpretOrder("2 x-tudo 1 sem purê 1 sem batata 1 coca 2lt retirada", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.obsGeral).toBe("");
    expect(result.pedido.itens).toHaveLength(3);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "X-Tudo (Promocao)", qtd: 1, removidos: ["Pure de batata"] });
    expect(result.pedido.itens[1]).toMatchObject({ nome: "X-Tudo (Promocao)", qtd: 1, removidos: ["Batata-palha"] });
    expect(result.pedido.itens[2]).toMatchObject({ nome: "Coca-Cola 2L", qtd: 1 });
  });

  it("teste obrigatorio 2: entende na porta e nao exige dados de contato/endereco", () => {
    const result = interpretOrder("2 x-tudo 1 sem pure 1 sem batata 1 coca 2l na porta", catalog);
    expect(result.pedido.tipoEntrega).toBe("Na porta");
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.endereco).toBe("");
    expect(result.pedido.itens.map((item) => item.nome)).toEqual(["X-Tudo (Promocao)", "X-Tudo (Promocao)", "Coca-Cola 2L"]);
  });

  it("teste obrigatorio 3: preserva observacao geral depois de obs", () => {
    const result = interpretOrder("2 x-tudo 1 sem purê 1 sem batata 1 coca 2lt retirada obs cliente busca às 22:30", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.obsGeral).toBe("cliente busca às 22:30");
    expect(result.pedido.itens).toHaveLength(3);
  });

  it("teste obrigatorio 4: x-bacon na porta dinheiro com obs", () => {
    const result = interpretOrder("1 x-bacon na porta dinheiro obs não precisa cortar o lanche", catalog);
    expect(result.pedido.itens[0]).toMatchObject({ nome: "X-Bacon", qtd: 1 });
    expect(result.pedido.tipoEntrega).toBe("Na porta");
    expect(result.pedido.pagamento).toBe("dinheiro");
    expect(result.pedido.obsGeral).toBe("não precisa cortar o lanche");
  });

  it("teste obrigatorio 5: nao interpreta pix depois de obs", () => {
    const result = interpretOrder("1 x-tudo retirada obs cliente falou que paga no pix", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.pagamento).not.toBe("pix");
    expect(result.pedido.obsGeral).toBe("cliente falou que paga no pix");
  });

  it("teste obrigatorio 6: primeiro/segundo e coca dois litros", () => {
    const result = interpretOrder("2 x-tudo primeiro sem pure segundo sem batata uma coca dois litros retirada", catalog);
    expect(result.pedido.itens[0].removidos).toEqual(["Pure de batata"]);
    expect(result.pedido.itens[1].removidos).toEqual(["Batata-palha"]);
    expect(result.pedido.itens[2]).toMatchObject({ nome: "Coca-Cola 2L", qtd: 1 });
    expect(result.pedido.tipoEntrega).toBe("Retirada");
  });

  it("teste obrigatorio 7: cliente na porta com x-burguer e coca lata", () => {
    const result = interpretOrder("cliente na porta 1 x-burguer 1 coca lata", catalog);
    expect(result.pedido.tipoEntrega).toBe("Na porta");
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Burguer", 1],
      ["Coca-Cola Lata", 1],
    ]);
  });

  it("teste obrigatorio 8: entrega com endereco antes de obs", () => {
    const result = interpretOrder("1 x-tudo rua das flores 80 obs portão branco chamar no vizinho", catalog);
    expect(result.pedido.tipoEntrega).toBe("Entrega");
    expect(result.pedido.endereco).toContain("rua das flores 80");
    expect(result.pedido.obsGeral).toBe("portão branco chamar no vizinho");
  });

  it("teste obrigatorio 9: retirada com final telefone antes de obs", () => {
    const result = interpretOrder("1 x-tudo retirada 4587 obs cliente está sem internet", catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.telefoneFinal).toBe("4587");
    expect(result.pedido.obsGeral).toBe("cliente está sem internet");
  });

  it("teste obrigatorio 10: todo texto depois de obs fica livre", () => {
    const result = interpretOrder("1 x-tudo na porta obs telefone 9999 pix coca 2 litros", catalog);
    expect(result.pedido.tipoEntrega).toBe("Na porta");
    expect(result.pedido.itens).toHaveLength(1);
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.pagamento).not.toBe("pix");
    expect(result.pedido.obsGeral).toBe("telefone 9999 pix coca 2 litros");
  });

  it("pedido curto 1: interpreta bacon egg, salada, endereco, pix e telefone com pontuacao", () => {
    const result = interpretOrder("1 bacon egg 1 salada rua da penha 263 pix 35984168922!", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon Egg", 1],
      ["X-Salada", 1],
    ]);
    expect(result.pedido.tipoEntrega).toBe("Entrega");
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it("pedido curto 2: respeita x-bacon egg e x-salada escritos com x", () => {
    const result = interpretOrder("1 x-bacon egg 1 x-salada rua da penha 263 pix 35984168922", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon Egg", 1],
      ["X-Salada", 1],
    ]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it("pedido curto 3: separa bacon, egg e salada quando cada um tem quantidade", () => {
    const result = interpretOrder("1 bacon 1 egg 1 salada rua da penha 263 dinheiro", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon", 1],
      ["X-Egg", 1],
      ["X-Salada", 1],
    ]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("dinheiro");
  });

  it("pedido curto 4: aceita virgulas e telefone formatado", () => {
    const result = interpretOrder("1 bacon egg, 1 salada, rua da penha 263, pix, (35) 98416-8922", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon Egg", 1],
      ["X-Salada", 1],
    ]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it("pedido curto 5: interpreta salada, endereco, pix e telefone com ponto final", () => {
    const result = interpretOrder("1 salada rua da penha 263 pix 35984168922.", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Salada", 1]]);
    expect(result.pedido.tipoEntrega).toBe("Entrega");
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it("pedido curto 6: interpreta dinheiro com troco e telefone", () => {
    const result = interpretOrder("1 salada rua da penha 263 dinheiro troco 100 telefone 35984168922", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Salada", 1]]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("dinheiro");
    expect(result.pedido.troco).toBe("100");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it("pedido curto 7: interpreta bacon egg na porta pix sem exigir contato", () => {
    const result = interpretOrder("1 bacon egg na porta pix", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Bacon Egg", 1]]);
    expect(result.pedido.tipoEntrega).toBe("Na porta");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.endereco).toBe("");
  });

  it("pedido curto 8: retirada usa 4 digitos como final, nao telefone completo", () => {
    const result = interpretOrder("1 bacon egg retirada 8922", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Bacon Egg", 1]]);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.telefoneFinal).toBe("8922");
    expect(result.pedido.telefone).toBe("");
  });

  it("pedido curto 9: preserva observacao e nao extrai telefone depois de obs", () => {
    const result = interpretOrder("1 bacon egg 1 salada rua da penha 263 pix obs telefone do cliente termina com 8922!", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([
      ["X-Bacon Egg", 1],
      ["X-Salada", 1],
    ]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.obsGeral).toBe("telefone do cliente termina com 8922!");
  });

  it("pedido curto 10: escolhe bacon egg pelo maior nome do cardapio", () => {
    const result = interpretOrder("1 bacon egg", catalog);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Bacon Egg", 1]]);
    expect(result.ambiguidades).toHaveLength(0);
  });

  it("pedido curto 11: quando bacon egg nao existe, marca ambiguidade sem apagar o restante", () => {
    const result = interpretOrder("1 bacon egg 1 salada rua da penha 263 pix 35984168922", catalogWithoutBaconEgg);
    expect(result.pedido.itens.map((item) => [item.nome, item.qtd])).toEqual([["X-Salada", 1]]);
    expect(result.ambiguidades).toHaveLength(1);
    expect(result.ambiguidades[0].trecho).toBe("1 bacon egg");
    expect(result.ambiguidades[0].sugestoes.map((item) => item.nome)).toEqual(["X-Bacon", "X-Egg"]);
    expect(result.pedido.endereco).toContain("rua da penha 263");
    expect(result.pedido.pagamento).toBe("pix");
    expect(result.pedido.telefone).toBe("35984168922");
  });

  it.each([
    ["1 tudo retirada Joao", "joao", "X-Tudo"],
    ["1 bacon retirar Maria Clara", "maria clara", "X-Bacon"],
    ["1 salada vai buscar Pedro Henrique", "pedro henrique", "X-Salada"],
  ])("retirada com nome apenas: %s", (texto, nome, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.cliente).toBe(nome);
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.telefoneFinal).toBe("");
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ["1 tudo retirada 8468", "8468", "X-Tudo"],
    ["2 bacon retirar 5921", "5921", "X-Bacon"],
    ["1 salada buscar 7734", "7734", "X-Salada"],
  ])("retirada com final apenas: %s", (texto, finalTelefone, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.cliente).toBe("");
    expect(result.pedido.telefoneFinal).toBe(finalTelefone);
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ["1 tudo retirada Joao 8468", "joao", "8468", "X-Tudo"],
    ["1 bacon retirar Maria Clara 5921", "maria clara", "5921", "X-Bacon"],
    ["1 egg vai buscar Pedro 7734", "pedro", "7734", "X-Egg"],
  ])("retirada com nome e final: %s", (texto, nome, finalTelefone, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.cliente).toBe(nome);
    expect(result.pedido.telefoneFinal).toBe(finalTelefone);
    expect(result.pedido.telefone).toBe("");
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ["1 tudo retirada 8468 Joao", "joao", "8468", "X-Tudo"],
    ["5921 retirada Maria 1 bacon", "maria", "5921", "X-Bacon"],
    ["Pedro 7734 vai buscar 1 salada", "pedro", "7734", "X-Salada"],
  ])("retirada com ordem invertida: %s", (texto, nome, finalTelefone, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.cliente).toBe(nome);
    expect(result.pedido.telefoneFinal).toBe(finalTelefone);
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ["1 tudo retirada 35984168468", "35984168468", "X-Tudo"],
    ["1 bacon retirar (35) 98416-5921", "35984165921", "X-Bacon"],
    ["1 salada buscar +55 35 98416-7734", "35984167734", "X-Salada"],
  ])("retirada com telefone completo: %s", (texto, telefone, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.tipoEntrega).toBe("Retirada");
    expect(result.pedido.telefone).toBe(telefone);
    expect(result.pedido.telefoneFinal).toBe("");
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ["1 tudo retirada Joao 35984168468", "joao", "35984168468", "X-Tudo"],
    ["1 bacon retirar Maria Clara (35) 98416-5921", "maria clara", "35984165921", "X-Bacon"],
  ])("retirada com nome e telefone completo: %s", (texto, nome, telefone, produto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.cliente).toBe(nome);
    expect(result.pedido.telefone).toBe(telefone);
    expect(result.pedido.telefoneFinal).toBe("");
    expect(result.pedido.itens[0].nome).toBe(produto);
  });

  it.each([
    ['1 tudo retirada "Joao Pedro" 8468!', "joao pedro", "8468"],
    ["1 bacon retirar 'Maria Clara' (35) 98416-5921.", "maria clara", ""],
  ])("retirada com pontuacao e aspas: %s", (texto, nome, finalTelefone) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.cliente).toBe(nome);
    if (finalTelefone) {
      expect(result.pedido.telefoneFinal).toBe(finalTelefone);
      expect(result.pedido.telefone).toBe("");
    } else {
      expect(result.pedido.telefone).toBe("35984165921");
    }
  });

  it.each([
    ["1 tudo retirada Joao 8468 pix", "joao", "8468", "", "pix"],
    ["1 bacon retirar Maria 35984168468 dinheiro", "maria", "", "35984168468", "dinheiro"],
  ])("retirada com pagamento separado: %s", (texto, nome, finalTelefone, telefone, pagamento) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.cliente).toBe(nome);
    expect(result.pedido.telefoneFinal).toBe(finalTelefone);
    expect(result.pedido.telefone).toBe(telefone);
    expect(result.pedido.pagamento).toBe(pagamento);
  });

  it("retirada com observacao nao mistura final com obs", () => {
    const result = interpretOrder("1 tudo retirada Joao 8468 obs ligar quando ficar pronto", catalog);
    expect(result.pedido.cliente).toBe("joao");
    expect(result.pedido.telefoneFinal).toBe("8468");
    expect(result.pedido.obsGeral).toBe("ligar quando ficar pronto");
  });

  it.each([
    "1 tudo rua das flores 8468 pix",
    "1 bacon dinheiro troco 5921 na porta",
    "1 salada obs telefone termina 7734",
  ])("nao interpreta quatro digitos sem contexto de retirada: %s", (texto) => {
    const result = interpretOrder(texto, catalog);
    expect(result.pedido.telefoneFinal).toBe("");
    expect(result.pedido.telefone).toBe("");
  });
});
