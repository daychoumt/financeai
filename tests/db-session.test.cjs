const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function harness() {
  let resolve;
  const pending = new Promise(r => {resolve = r;});
  const writes = [];
  const auth = {currentUser: {uid: 'A', displayName: 'A', email: 'a@example.test'}};
  const context = vm.createContext({Auth: auth, DEFAULT_CATEGORIES: [],
    firebase: {firestore: {FieldValue: {serverTimestamp: () => 'timestamp'}}},
    DB: {collection: () => ({doc: uid => ({get: () => pending, set: async data => writes.push({uid, data})})})}
  });
  const db = vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/services/db.js'), 'utf8') + '\nDBService;', context);
  return {db, auth, resolve, writes};
}
test('serviço de banco recusa acesso sem sessão', async () => {
  const h = harness(); h.auth.currentUser = null; h.db.init(null);
  await assert.rejects(h.db.loadUserDoc(), /Sessão encerrada/);
  await assert.rejects(h.db.addTransaction({amount: 10}), /Sessão encerrada/);
});
test('banco recusa UID diferente da autenticação atual', async () => {
  const h = harness(); h.db.init('B');
  await assert.rejects(h.db.loadUserDoc(), /Sessão encerrada/);
});
test('leitura atrasada de perfil ausente não cria documento em outra conta', async () => {
  const h = harness(); h.db.init('A');
  const loading = h.db.loadUserDoc();
  h.auth.currentUser = {uid:'B'}; h.db.init('B');
  h.resolve({exists:false});
  await assert.rejects(loading, /Sessão encerrada/);
  assert.equal(h.writes.length, 0);
});
test('perfil novo usa a referência e identidade da sessão que o carregou', async () => {
  const h = harness(); h.db.init('A'); const loading = h.db.loadUserDoc();
  h.resolve({exists:false}); await loading;
  assert.equal(h.writes[0].uid, 'A');
  assert.equal(h.writes[0].data.name, 'A');
});
