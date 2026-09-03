const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return {promise, resolve, reject};
};
const user = uid => ({uid, displayName: uid, email: `${uid}@example.test`});
const noop = () => {};
class Element {
  constructor() {
    this.childNodes = ['interface inicial']; this.style = {}; this.value = '';
    this.textContent = ''; this.hidden = false;
    this.classList = {add: noop, remove: noop, toggle: noop};
  }
  cloneNode() { const el = new Element(); el.childNodes = [...this.childNodes]; return el; }
  replaceChildren(...nodes) { this.childNodes = nodes; }
  querySelector() { return null; }
  addEventListener() {}
}
function harness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const templates = [element('app-screen'), element('modal-add-tx')];
  const listeners = [], toasts = [], exports = [], events = {};
  const auth = {currentUser: user('A'), onAuthStateChanged(fn) { this.observer = fn; }, signOut: async () => {}};
  let currentUID = null;
  const listen = (type, callback) => {
    const listener = {type, callback, uid: currentUID, cancelled: false};
    listeners.push(listener);
    return () => {listener.cancelled = true;};
  };
  const db = {
    init(uid) { currentUID = uid; },
    loadUserDoc: async () => ({}), loadSnapshots: async () => [],
    listenTransactions: (_, cb) => listen('transactions', cb),
    listenGoals: cb => listen('goals', cb), listenSubscriptions: cb => listen('subscriptions', cb),
    addTransaction: async () => 'tx', clearAllData: async () => {}
  };
  const context = vm.createContext({
    document: {getElementById: element, querySelector: () => null,
      querySelectorAll: selector => selector === '#app-screen, .modal-overlay' ? templates : [],
      addEventListener: (event, cb) => { events[event] = cb; }},
    window: {}, Auth: auth, DBService: db, DEFAULT_CATEGORIES: ['Outros'],
    fmt: {currentMonth: () => '2026-09', today: () => '2026-09-03', currency: String},
    AIService: {setContext: noop, clearHistory: noop},
    ChartsService: new Proxy({}, {get: () => noop}),
    PagesService: new Proxy({}, {get: () => noop}),
    AutoCategory: {init: noop, destroy: noop},
    applyTheme: noop, updateGreeting: noop, populateCategorySelects: noop, renderCategoryChips: noop,
    closeSidebar: noop, closeModal: noop, navigate: noop,
    localStorage: {getItem: () => null}, setTimeout: () => 0, clearTimeout: noop,
    showToast: (...args) => toasts.push(args), console: {error: noop},
    ExportService: {exportCSV: txs => exports.push([...txs]), parseCSV: () => [{amount: 1}, {amount: 2}]},
    FileReader: class { constructor() {context.reader = this;} readAsText() {} }
  });
  vm.runInContext(source('js/services/finance.js'), context);
  const app = vm.runInContext(source('js/app.js') + '\nAppController;', context);
  return {context, app, db, auth, element, listeners, toasts, exports, events};
}

test('logout limpa a exportação, dados renderizados e listeners', async () => {
  const h = harness(); await h.app.init(h.auth.currentUser);
  h.listeners[0].callback([{amount: 12, type: 'entrada'}]);
  h.element('app-screen').childNodes = ['saldo da conta A'];
  h.element('modal-add-tx').childNodes = ['rascunho da conta A'];
  h.auth.currentUser = null;
  h.app.destroy();
  vm.runInContext('handleExportCSV()', h.context);
  assert.equal(h.context.window._appState.uid, null);
  assert.equal(h.exports[0].length, 0);
  assert.deepEqual(h.element('app-screen').childNodes, ['interface inicial']);
  assert.deepEqual(h.element('modal-add-tx').childNodes, ['interface inicial']);
  assert.ok(h.listeners.every(l => l.cancelled));
});

test('resposta atrasada do perfil A não altera sessão B', async () => {
  const h = harness(), pending = deferred();
  h.db.loadUserDoc = () => pending.promise;
  const oldInit = h.app.init(h.auth.currentUser);
  h.auth.currentUser = user('B'); h.db.loadUserDoc = async () => ({categories: ['B']});
  await h.app.init(h.auth.currentUser);
  pending.resolve({categories: ['A']}); await oldInit;
  assert.equal(h.context.window._appState.uid, 'B');
  assert.deepEqual(Array.from(h.context.window._appState.categories), ['B']);
  assert.equal(h.listeners.length, 3);
  assert.ok(h.listeners.every(l => l.uid === 'B'));
});

test('snapshot atrasado não restaura histórico após logout', async () => {
  const h = harness(), pending = deferred();
  h.db.loadSnapshots = () => pending.promise;
  const initializing = h.app.init(h.auth.currentUser);
  await Promise.resolve();
  h.auth.currentUser = null; h.app.destroy();
  pending.resolve([{month: '2026-08', income: 123}]); await initializing;
  assert.equal(h.context.window._appState.snapshots.length, 0);
  assert.equal(h.listeners.length, 0);
});

test('callbacks já enfileirados são ignorados ao entrar de novo na mesma conta', async () => {
  const h = harness(); await h.app.init(h.auth.currentUser);
  const stale = [...h.listeners];
  h.app.destroy(); await h.app.init(h.auth.currentUser);
  for (const listener of stale) listener.callback([{amount: 999, type: 'entrada'}]);
  assert.equal(h.context.window._appState.transactions.length, 0);
  assert.equal(h.context.window._appState.goals.length, 0);
  assert.equal(h.context.window._appState.subscriptions.length, 0);
  assert.ok(stale.every(l => l.cancelled));
});

test('erro de inicialização antigo não aparece para a nova conta', async () => {
  const h = harness(), pending = deferred(); h.db.loadUserDoc = () => pending.promise;
  const oldInit = h.app.init(h.auth.currentUser);
  h.auth.currentUser = user('B'); h.db.loadUserDoc = async () => ({});
  await h.app.init(h.auth.currentUser);
  pending.reject(Error('falha da conta A')); await oldInit;
  assert.equal(h.toasts.length, 0);
});

test('conclusão de limpeza antiga não apaga o estado da nova conta', async () => {
  const h = harness(), pending = deferred(); await h.app.init(h.auth.currentUser);
  h.db.clearAllData = () => pending.promise;
  const clearing = h.app.clearAllData();
  h.auth.currentUser = user('B'); await h.app.init(h.auth.currentUser);
  h.listeners.find(l => l.uid === 'B' && l.type === 'transactions').callback([{amount: 20, type: 'entrada'}]);
  pending.resolve(); await clearing;
  assert.equal(h.context.window._appState.transactions[0].amount, 20);
  assert.equal(h.toasts.length, 0);
});

test('conclusão de cadastro de transação antiga não modifica a nova sessão', async () => {
  const h = harness(), pending = deferred(); await h.app.init(h.auth.currentUser);
  h.element('tx-desc').value = 'Compra A'; h.element('tx-amount').value = '12';
  h.db.addTransaction = () => pending.promise;
  const saving = h.app.handleAddTransaction();
  h.auth.currentUser = user('B'); await h.app.init(h.auth.currentUser);
  h.element('tx-desc').value = 'Rascunho B';
  pending.resolve('tx'); await saving;
  assert.equal(h.element('tx-desc').value, 'Rascunho B');
  assert.equal(h.toasts.length, 0);
});

test('importação para de gravar quando a sessão muda durante o lote', async () => {
  const h = harness(), pending = deferred(); await h.app.init(h.auth.currentUser);
  let writes = 0; h.db.addTransaction = () => {writes++; return pending.promise;};
  await vm.runInContext('handleCSVFile({target:{files:[{}]}})', h.context);
  const importing = h.context.reader.onload({target:{result:'dados fictícios'}});
  assert.equal(writes, 1);
  h.auth.currentUser = user('B'); await h.app.init(h.auth.currentUser);
  pending.resolve(); await importing;
  assert.equal(writes, 1);
});

test('observer de logout limpa a sessão e restaura o formulário de login', async () => {
  const h = harness(); vm.runInContext(source('js/auth/auth.js'), h.context);
  h.events.DOMContentLoaded(); h.auth.observer(h.auth.currentUser); await Promise.resolve(); await Promise.resolve();
  h.element('login-password').value = 'senha fictícia'; h.element('btn-login').disabled = true;
  h.auth.currentUser = null; h.auth.observer(null);
  assert.equal(h.element('app-screen').style.display, 'none');
  assert.equal(h.element('app-screen').hidden, true);
  assert.equal(h.element('auth-screen').style.display, 'flex');
  assert.equal(h.element('auth-screen').hidden, false);
  assert.equal(h.element('login-password').value, '');
  assert.equal(h.element('btn-login').disabled, false);
  assert.equal(h.context.window._appState.uid, null);
});

test('falha ao sair preserva sessão e informa o erro', async () => {
  const h = harness(); await h.app.init(h.auth.currentUser);
  vm.runInContext(source('js/auth/auth.js'), h.context);
  h.auth.signOut = async () => {throw Error('rede indisponível');};
  const state = h.context.window._appState;
  await vm.runInContext('handleLogout()', h.context);
  assert.equal(h.context.window._appState, state);
  assert.ok(h.listeners.every(l => !l.cancelled));
  assert.match(h.toasts[0][0], /Não foi possível sair/);
});
