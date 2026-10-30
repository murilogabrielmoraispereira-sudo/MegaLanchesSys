import test from 'node:test';
import assert from 'node:assert/strict';
import { priceCheckoutCart, couponDiscount } from '../lib/checkout-pricing.js';
import { calculateCartSubtotal } from '../lib/cart-pricing.js';
import { gerarTextoPedido, calcularSubtotalItem } from '../scripts/print-agent.js';

const catalog = { cardapio: [{ id: 60, nome: 'Crispy', preco: 28.9, disponivel: true }], adicionais: [{ nome: 'mussarela', preco: 4 }], taxaEntrega: 9 };
const input = [{ produtoId: 60, nome: 'Crispy', preco: 0.01, qtd: 2, adicionais: [{ nome: 'mussarela', preco: 0.01, qtd: 2, escopo: 'total' }] }];
test('3021 corrected total is 74.80 using official catalog prices', () => {
  const cart = priceCheckoutCart(input, catalog);
  assert.equal(calculateCartSubtotal(cart) + 9, 74.8);
  assert.equal(cart[0].adicionais[0].escopo, 'total');
});
test('checkout rejects unknown products, extras and invalid quantities', () => {
  assert.throws(() => priceCheckoutCart([], catalog));
  assert.throws(() => priceCheckoutCart([{ ...input[0], produtoId: 999 }], catalog));
  for (const qtd of [0, -1, 1.5, 100]) assert.throws(() => priceCheckoutCart([{ ...input[0], qtd }], catalog));
  assert.throws(() => priceCheckoutCart([{ ...input[0], adicionais: [{ nome: 'inexistente', qtd: 1 }] }], catalog));
});
test('coupons use current subtotal and cannot exceed merchandise', () => {
  const coupon = { ativo: 1, tipo: 'percent', valor: 10, minimo: 20 };
  assert.equal(couponDiscount(coupon, 65.8), 6.58);
  assert.equal(couponDiscount({ ...coupon, tipo: 'valor', valor: 100 }, 65.8), 65.8);
  assert.throws(() => couponDiscount({ ...coupon, ativo: 0 }, 65.8));
  assert.throws(() => couponDiscount(coupon, 10));
  assert.throws(() => couponDiscount({ ...coupon, expira_em: '2026-09-18' }, 65.8, new Date('2026-09-20')));
});
test('zero and fractional-cent prices are handled consistently', () => {
  assert.equal(calculateCartSubtotal([{ preco: 0.1, qtd: 3 }, { preco: 0.2, qtd: 1 }]), 0.5);
  assert.equal(calcularSubtotalItem({ preco: 28.9, qtd: 0 }), 0);
  assert.equal(calcularSubtotalItem({ preco: 28.9, qtd: 2, adicionais: [{ nome: 'mussarela', preco: 4, qtd: 0 }] }), 57.8);
});
test('receipt shows actual four extras when explicitly per sandwich', () => {
  const cart = priceCheckoutCart(input, catalog);
  cart[0].adicionais[0].escopo = 'unidade';
  const text = gerarTextoPedido({ carrinho: cart, tipoEntrega: 'Entrega', taxaEntrega: 9, pagamento: 'Pix' });
  assert.match(text, /MUSSARELA x4 TOTAL/);
  assert.match(text, /R\$82,80/);
});
test('receipt does not subtract discount twice from net official subtotal', () => {
  const text = gerarTextoPedido({ carrinho: priceCheckoutCart(input, catalog), subtotal: 55.8, desconto: 10, taxaEntrega: 9, pagamento: 'Pix' });
  assert.match(text, /R\$64,80/);
  assert.match(text, /Subtotal\s+R\$ 65,80/);
});
