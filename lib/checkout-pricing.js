import '../public/pricing.js';

const pricing = globalThis.MegaPricing;
const key = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function priceCheckoutCart(input, catalog) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) throw new Error('carrinho_invalido');
  return input.map((entry) => {
    const id = String(entry?.produtoId ?? entry?.id ?? '');
    const product = catalog.cardapio.find((p) => id ? String(p.id) === id : key(p.nome) === key(entry?.nome));
    if (!product || product.disponivel === false) throw new Error('produto_indisponivel');
    const qtd = pricing.number(entry.qtd);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 99) throw new Error('quantidade_invalida');
    const extras = Array.isArray(entry.adicionais) ? entry.adicionais : [];
    if (extras.length > 50) throw new Error('limite_adicionais');
    const adicionais = extras.map((extra) => {
      const known = catalog.adicionais.find((a) => key(a.nome) === key(extra?.nome));
      const quantity = pricing.number(extra?.qtd);
      if (!known || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('adicional_invalido');
      return { nome: known.nome, preco: pricing.money(known.preco), qtd: quantity,
        escopo: String(extra.escopo || '').trim().toLowerCase() === 'total' ? 'total' : 'unidade' };
    });
    return { produtoId: String(product.id), nome: product.nome, preco: pricing.money(product.preco), qtd,
      adicionais, removidos: Array.isArray(entry.removidos) ? entry.removidos : [],
      obs: String(entry.obs || '').slice(0, 500), tipo: product.tipo || 'item', categoria: product.categoria };
  });
}

export function couponDiscount(coupon, subtotal, now = new Date()) {
  if (!coupon || !Number(coupon.ativo)) throw new Error('cupom_invalido');
  if (coupon.expira_em && new Date(coupon.expira_em + 'T23:59:59-03:00') < now) throw new Error('cupom_expirado');
  if (subtotal < pricing.money(coupon.minimo)) throw new Error('cupom_minimo');
  if (!['percent', 'valor'].includes(coupon.tipo)) throw new Error('cupom_invalido');
  const discount = coupon.tipo === 'percent' ? subtotal * pricing.money(coupon.valor) / 100 : pricing.money(coupon.valor);
  return Math.min(pricing.money(discount), pricing.money(subtotal));
}
