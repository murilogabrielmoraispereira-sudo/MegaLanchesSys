// Read-only audit: executes pricing functions with synthetic orders, without
// starting the application, connecting to services, or submitting print jobs.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { calculateCartSubtotal, separateOrderLevelComplements } from '../lib/cart-pricing.js';
import { applyXtudoPromotionPricing } from '../lib/promotion-pricing.js';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function extract(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Function not found: ${name}`);
  const end = source.indexOf('\n}', start);
  assert.ok(end > start);
  return source.slice(start, end + 2);
}
function load(source, names, globals = {}) {
  const context = vm.createContext({ MegaPricing: globalThis.MegaPricing, ...globals });
  vm.runInContext(names.map((name) => extract(source, name)).join('\n'), context);
  return context;
}
const admin = load(read('public/adminn/adminscript.js'), ['normalizarItemBuilder', 'calcularTotalPedido']);
const report = load(read('public/adminn/relatorio.js'), [
  'calcularTotalPedido', 'classificarTipoPedidoRelatorio', 'obterTaxaEntregaPedido',
], { TAXA_ENTREGA: 9 });
const serverSource = read('server.js');
const server = load(serverSource, ['toNumber', 'calcularTotalCarrinho'], { calculateCartSubtotal });
const print = load(read('scripts/print-agent.js'), [
  'parseNumero', 'parseNumeroOpcional', 'parseQtd', 'calcularSubtotalItem',
], {
  obterListaAdicionais: (item) => item.adicionais || [],
  obterComponentesCombo: (item) => item.componentes || [],
  isAdicionalTotal: (add) => add.escopo === 'total',
});
const base = { nome: 'CRISPY CHEESE BACON', preco: 28.9, qtd: 2, adicionais: [] };
const totalExtras = { ...base, adicionais: [{ nome: 'Maionese caseira', preco: 2, qtd: 2, escopo: 'total' }] };
const unitExtras = { ...base, adicionais: [{ nome: 'mussarela', preco: 4, qtd: 2, escopo: 'unidade' }] };
const cases = [];
const check = (name, actual, expected) => {
  const pass = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) < 0.000001 : actual === expected;
  cases.push({ name, actual, expected, result: pass ? 'OK' : 'DIVERGENCE' });
};
check('Two Crispy without extras', calculateCartSubtotal([base]), 57.8);
check('Two maioneses for whole order', calculateCartSubtotal([totalExtras]), 61.8);
check('Two mussarelas per sandwich (four total)', calculateCartSubtotal([unitExtras]), 73.8);
check('Order 3021 total including delivery', calculateCartSubtotal([unitExtras]) + 9, 82.8);
check('Order 3158 total (one maionese, pickup)', calculateCartSubtotal([{ ...totalExtras, adicionais: [{ ...totalExtras.adicionais[0], qtd: 1 }] }]), 59.8);
check('Admin edit preserves total extra quantity', calculateCartSubtotal([admin.normalizarItemBuilder(totalExtras)]), 61.8);
const discountedOrder = { carrinho: [totalExtras], tipoEntrega: 'Entrega', taxaEntrega: 9, desconto: 10 };
check('Backend discount applied once', server.calcularTotalCarrinho(discountedOrder.carrinho, 10) + 9, 60.8);
check('Admin total honors discount', admin.calcularTotalPedido(discountedOrder), 60.8);
check('Report net merchandise honors discount', report.calcularTotalPedido(discountedOrder), 51.8);
check('Report preserves explicit zero delivery fee', report.obterTaxaEntregaPedido({ tipoEntrega: 'Entrega', taxaEntrega: 0 }), 0);
check('Backend accepts decimal-comma item price', calculateCartSubtotal([{ ...base, preco: '28,90' }]), 57.8);
check('Admin accepts decimal-comma item price', admin.calcularTotalPedido({ carrinho: [{ ...base, preco: '28,90' }], tipoEntrega: 'Retirada' }), 57.8);
check('Printer accepts decimal-comma price', print.parseNumero('28,90'), 28.9);
check('Backend excludes zero quantity', calculateCartSubtotal([{ ...base, qtd: 0 }]), 0);
check('Admin excludes zero quantity', admin.calcularTotalPedido({ carrinho: [{ ...base, qtd: 0 }] }), 0);
const promotionConfig = { minimum: 2, unitPrice: 26, promotionalPrice: 24 };
check('Promotion applies across separate X-Tudo rows', calculateCartSubtotal(applyXtudoPromotionPricing([
  { nome: 'X-TUDO', preco: 26, qtd: 1 }, { nome: 'X-TUDO', preco: 26, qtd: 1 },
], promotionConfig)), 48);
check('Crispy not affected by X-Tudo promotion', calculateCartSubtotal(applyXtudoPromotionPricing([base], promotionConfig)), 57.8);
const separated = separateOrderLevelComplements([totalExtras]);
check('Separate maionese retains order-wide cost', calculateCartSubtotal([
  ...separated.items, ...separated.complements.map((add) => ({ ...add, adicionais: [] })),
]), 61.8);
// Exercise the real cart merge branch using a minimal DOM stub.
const storefront = read('public/script.js');
const mergeStart = storefront.indexOf('modalAdicionar.onclick = () => {');
const mergeEnd = storefront.indexOf('  registrarInteracaoProduto(', mergeStart);
assert.ok(mergeStart >= 0 && mergeEnd > mergeStart);
const cartContext = vm.createContext({
  window: { carrinho: [structuredClone(totalExtras)] }, modalAdicionar: {},
  modalAdicionais: { querySelectorAll: () => [{ querySelector: (selector) => ({ innerText: selector === '.quantidade' ? '2' : 'Maionese caseira + R$ 2.00' }) }] },
  itemSelecionado: { ...base, id: 60 }, qtdLanche: 2,
  isPromoXtudo: () => false, modalObs: { value: '' },
});
cartContext.window.carrinho[0].removidos = [];
vm.runInContext(storefront.slice(mergeStart, mergeEnd) + '}; modalAdicionar.onclick();', cartContext);
check('Adding same customized order twice preserves extras', calculateCartSubtotal(cartContext.window.carrinho), 123.6);
// Validate the real attendant validator against a small catalog.
const attendant = load(serverSource, ['validarComplementosPedidoAtendente', 'validarCarrinhoAtendente'], {
  montarCatalogoAtendente: () => ({ cardapio: [{ id: 60, nome: base.nome, preco: 28.9, ingredientes: [], disponivel: true }], adicionais: [{ nome: 'mussarela', preco: 4 }], taxaEntrega: 9 }),
  normalizarTextoBusca: (v) => String(v || '').toLowerCase(),
  normalizarNomeIngredienteAtendente: (v) => v,
  toNumber: server.toNumber, formatarAlteracoesItem: () => ({ obs: '' }), separateOrderLevelComplements,
});
const validated = attendant.validarCarrinhoAtendente([{ ...unitExtras, produtoId: '60', adicionais: [{ ...unitExtras.adicionais[0], escopo: 'total' }] }]);
check('Attendant API preserves explicit total scope for cheese', calculateCartSubtotal(validated.carrinho), 65.8);
console.log(JSON.stringify({ cases: cases.length, divergences: cases.filter((c) => c.result !== 'OK').length, results: cases }, null, 2));
assert.equal(cases.filter((c) => c.result !== 'OK').length, 0, 'Pricing regressions');
