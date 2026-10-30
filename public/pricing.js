// Shared by the browser, server and print agent. No network or application state.
(function (root) {
  function number(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const text = typeof value === 'string' ? value.replace(/[^\d,.-]/g, '') : value;
    const parsed = Number(typeof text === 'string' && text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function money(value) { return Math.round((Math.max(number(value), 0) + Number.EPSILON) * 100) / 100; }
  function quantity(value) { return Math.max(Math.trunc(number(value)), 0); }
  function totalScope(add) { return String(add?.escopo || '').trim().toLowerCase() === 'total'; }
  function itemSubtotal(item) {
    const qty = quantity(item?.qtd);
    if (!qty) return 0;
    const extras = (Array.isArray(item?.adicionais) ? item.adicionais : []).reduce((sum, add) =>
      sum + Math.round(money(add?.preco) * 100) * quantity(add?.qtd) * (totalScope(add) ? 1 : qty), 0);
    return (Math.round(money(item?.preco) * 100) * qty + extras) / 100;
  }
  function subtotal(cart) { return (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + Math.round(itemSubtotal(item) * 100), 0) / 100; }
  function netSubtotal(cart, discount = 0) { return money(subtotal(cart) - money(discount)); }
  root.MegaPricing = Object.freeze({ number, money, quantity, totalScope, itemSubtotal, subtotal, netSubtotal });
})(globalThis);
