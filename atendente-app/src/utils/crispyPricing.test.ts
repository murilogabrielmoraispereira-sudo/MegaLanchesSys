import { describe, expect, it } from 'vitest';
import { interpretOrder } from './orderParser';
import { calculateLocalOrderSubtotal } from './orderPricing';
import type { Catalog } from '../types';

const catalog: Catalog = {
  atualizadoEm: '', taxaEntrega: 9,
  cardapio: [{ id: 60, nome: 'Crispy Cheese Bacon', preco: 28.9, categoria: 'gourmets', disponivel: true, ingredientes: ['Mussarela'] }],
  adicionais: [{ nome: 'mussarela', preco: 4 }, { nome: 'Maionese caseira', preco: 2 }],
};
describe('pedido 3021 e quantidade total de adicionais', () => {
  it('2 crispy mais 2 mussarelas cobra duas, e nao quatro', () => {
    const { pedido } = interpretOrder('2 crispy mais 2 mussarela entrega', catalog);
    expect(pedido.itens[0].qtd).toBe(2);
    expect(pedido.itens[0].adicionais).toMatchObject([{ qtd: 2, escopo: 'total' }]);
    expect(calculateLocalOrderSubtotal(pedido.itens, pedido.complementosPedido, catalog) + 9).toBe(74.8);
  });
  it('por lanche permanece uma escolha explicita', () => {
    const { pedido } = interpretOrder('2 crispy mais 2 mussarela por lanche', catalog);
    expect(pedido.itens[0].adicionais).toMatchObject([{ qtd: 2, escopo: 'unidade' }]);
    expect(calculateLocalOrderSubtotal(pedido.itens, pedido.complementosPedido, catalog) + 9).toBe(82.8);
  });
  it('maioneses continuam complementos totais', () => {
    const { pedido } = interpretOrder('2 crispy mais 2 maionese', catalog);
    expect(calculateLocalOrderSubtotal(pedido.itens, pedido.complementosPedido, catalog)).toBe(61.8);
  });
});
