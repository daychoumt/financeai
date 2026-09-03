const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ fmt: { currency: n => `R$ ${n.toFixed(2)}` } });
const finance = vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/services/finance.js'), 'utf8') + '\nFinanceService;', context);
const tx = (amount, type = 'saida', category = 'Alimentação') => ({amount, type, category});
const plain = value => JSON.parse(JSON.stringify(value));

test('saldo zerado não gera saldo negativo por erro decimal', () => {
  const summary = finance.calcSummary([tx(0.1, 'entrada'), tx(0.2, 'entrada'), tx(0.3)]);
  assert.deepEqual(plain(summary), {income: 0.3, expense: 0.3, balance: 0});
  assert.equal(finance.generateAlerts(summary, {}, {}, []).some(a => a.type === 'danger'), false);
  const reverse = finance.calcSummary([tx(0.3, 'entrada'), tx(0.1), tx(0.2)]);
  assert.equal(reverse.balance, 0);
  assert.equal(finance.generateAlerts(reverse, {}, {}, []).some(a => a.type === 'danger'), false);
});

test('resumo aceita números e strings numéricas do banco', () => {
  assert.deepEqual(plain(finance.calcSummary([tx('1812', 'entrada'), tx('450'), tx(706)])), {
    income: 1812, expense: 1156, balance: 656
  });
  assert.deepEqual(plain(finance.calcSummary()), {income: 0, expense: 0, balance: 0});
});

test('dados legados inválidos não contaminam os totais', () => {
  const invalid = [NaN, Infinity, -10, undefined, null, {}, true, 'inválido'];
  assert.deepEqual(plain(finance.calcSummary([...invalid.map(n => tx(n)), tx(12.5)])), {
    income: 0, expense: 12.5, balance: -12.5
  });
});

test('somar muitas transações preserva os centavos', () => {
  assert.equal(finance.calcSummary(Array.from({length: 1000}, () => tx(0.01))).expense, 10);
  assert.equal(finance.calcSummary([tx(10.075)]).expense, 10.08);
  assert.equal(finance.calcSummary([tx(1.005)]).expense, 1.01);
  assert.equal(finance.calcSummary([tx(1e-8)]).expense, 0);
});

test('categorias usam os mesmos totais do resumo', () => {
  const transactions = [tx(0.1), tx(0.2), tx(1, 'entrada'), tx(0.3, 'saida', 'Outros')];
  assert.deepEqual(plain(finance.calcByCategory(transactions)), {Alimentação: 0.3, Outros: 0.3});
  assert.equal(finance.calcSummary(transactions).expense, 0.6);
});

test('nomes de categorias não colidem com propriedades de Object', () => {
  const totals = finance.calcByCategory([tx(1, 'saida', '__proto__'), tx(2, 'saida', 'constructor')]);
  assert.equal(totals.__proto__, 1);
  assert.equal(totals.constructor, 2);
  assert.deepEqual(Object.keys(totals), ['__proto__', 'constructor']);
});

test('previsão parte do mesmo gasto consolidado', () => {
  assert.equal(finance.forecastMonth([tx(0.1), tx(0.2)]).totalSpent, 0.3);
});

test('contexto soma assinaturas numéricas sem concatenar strings', () => {
  const text = finance.buildAIContext({income: 0, expense: 0, balance: 0}, {}, 0, [], [{price: '19.90'}, {price: '10.10'}]);
  assert.match(text, /Assinaturas mensais: R\$ 30\.00/);
});

test('totais fora da precisão suportada falham explicitamente', () => {
  assert.throws(() => finance.calcSummary([tx(50_000_000_000_000), tx(50_000_000_000_000)]), /precisão monetária/);
});
