import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import Database from 'better-sqlite3';

// Run from a staging checkout. No real customer data, credentials or integrations.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mega-checkout-test-'));
const port = 31992;
const env = { PATH: process.env.PATH, HOME: dataDir, PORT: String(port), MEGA_DATA_DIR: dataDir,
  MEGA_SKIP_ENV_FILE: '1', MEGA_TEST_MODE: '1', NODE_ENV: 'development', ADMIN_PASSWORD: 'test-only-price-check' };
const child = spawn(process.execPath, ['server.js'], { env, stdio: ['ignore','pipe','pipe'] });
let output = '';
child.stdout.on('data', c => output += c);
child.stderr.on('data', c => output += c);
let db;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/config`)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, output.slice(-2000));
  db = new Database(path.join(dataDir, 'mega-lanches.db'));
  db.prepare("DELETE FROM cardapio").run();
  db.prepare("INSERT INTO cardapio (id,nome,preco,categoria,ingredientes,disponivel,order_index,created_at) VALUES (60,'Crispy',28.9,'gourmets','[]',1,0,datetime('now'))").run();
  db.prepare("DELETE FROM adicionais").run();
  db.prepare("INSERT INTO adicionais (nome,preco,order_index,created_at) VALUES ('mussarela',4,0,datetime('now'))").run();
  for (const [chave,valor] of [['funcionamento_dias','[]'],['taxa_entrega','9'],['auto_aceitar_pedidos','false']]) {
    db.prepare("INSERT OR REPLACE INTO configuracoes (chave,valor,updated_at) VALUES (?,?,datetime('now'))").run(chave,valor);
  }
  const payload = { cliente: 'TESTE ISOLADO', telefone: '', tipoEntrega: 'Entrega', taxaEntrega: 9, pagamento: 'Pix',
    carrinho: [{ produtoId: 60, nome: 'Crispy', preco: 28.9, qtd: 2, adicionais: [{ nome: 'mussarela', preco: 4, qtd: 2, escopo: 'total' }] }] };
  const post = async body => {
    const response = await fetch(`http://127.0.0.1:${port}/pedido`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  const stale = await post({ ...payload, carrinho: [{ ...payload.carrinho[0], preco: 1 }] });
  assert.equal(stale.status,409,JSON.stringify(stale));
  assert.equal(stale.body.total,74.8);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM pedidos').get().n,0);
  const accepted = await post(payload);
  assert.equal(accepted.status,200,JSON.stringify(accepted));
  assert.equal(accepted.body.success,true);
  const row = db.prepare('SELECT * FROM pedidos WHERE id=?').get(accepted.body.pedidoId);
  assert.equal(JSON.parse(row.carrinho)[0].adicionais[0].escopo,'total');
  assert.equal(row.taxa_entrega,9);
  const invalidCoupon = await post({ ...payload, cupom:'INVALIDO', desconto:50 });
  assert.equal(invalidCoupon.status,400);
  const invalidSplit = await post({ ...payload, pagamentosDetalhes:[{metodo:'pix',valor:1}] });
  assert.equal(invalidSplit.status,400);
  const badQuantity = await post({ ...payload, carrinho:[{...payload.carrinho[0],qtd:0}] });
  assert.equal(badQuantity.status,400);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM pedidos').get().n,1);
  console.log('Checkout integration: stale prices, accepted order, invalid coupon, split payment and quantity passed. Isolated database:',dataDir);
} finally {
  db?.close();
  child.kill('SIGTERM');
  await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
}
