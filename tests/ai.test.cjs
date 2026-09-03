const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/services/ai.js'), 'utf8');
function client(fetch) {
  const user = {getIdToken: async () => 'test-token'};
  const Auth = {currentUser: user};
  const ai = vm.runInNewContext(source + '\nAIService;', {Auth, AI_CONFIG: {endpoint: 'https://test.workers.dev/chat'}, fetch, AbortController, setTimeout, clearTimeout});
  return {ai, Auth};
}
test('contexto somente enviado com consentimento; token enviado ao backend', async () => {
  const bodies = [];
  const {ai} = client(async (url, options) => {
    assert.match(url, /workers.dev\/chat$/);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    bodies.push(JSON.parse(options.body));
    return {ok: true, json: async () => ({reply: 'Olá'})};
  });
  ai.setContext('resumo fictício');
  assert.equal(await ai.chat('Oi'), 'Olá');
  await ai.chat('Oi', true);
  assert.equal(bodies[0].context, '');
  assert.equal(bodies[1].context, 'resumo fictício');
});
test('logout durante resposta não retorna conteúdo para outra sessão', async () => {
  let resolve;
  const {ai, Auth} = client(() => new Promise(r => {resolve = r;}));
  const promise = ai.chat('Oi');
  await new Promise(r => setImmediate(r));
  ai.clearHistory(); Auth.currentUser = null;
  resolve({ok: true, json: async () => ({reply: 'privado'})});
  await assert.rejects(promise, /interrompida/);
});
test('logout durante obtenção do token evita chamada', async () => {
  let calls = 0;
  const {ai, Auth} = client(() => { calls++; });
  let resolve;
  Auth.currentUser.getIdToken = () => new Promise(r => {resolve = r;});
  const promise = ai.chat('Oi');
  ai.clearHistory(); resolve('token');
  await assert.rejects(promise, /interrompida/);
  assert.equal(calls, 0);
});
test('sem login não envia; pergunta vazia também recusada', async () => {
  const {ai, Auth} = client(() => {throw Error('Não deve chamar');});
  Auth.currentUser = null;
  await assert.rejects(ai.chat('Oi'), /Entre/);
  await assert.rejects(ai.chat(' '), /Digite/);
});
test('cliente não contém chave nem endpoint direto Gemini e renderiza texto', () => {
  assert.doesNotMatch(source, /AIza[\w-]{20,}|generativelanguage\.googleapis\.com|GEMINI_API_KEY|innerHTML/);
});
test('endpoint não configurado bloqueia envio e informa ativação', async()=>{
 let calls=0;
 const ai=vm.runInNewContext(source+'\nAIService;',{Auth:{currentUser:{}},AI_CONFIG:{endpoint:''},fetch:()=>{calls++;}});
 await assert.rejects(ai.chat('Oi'),/ativado/);assert.equal(calls,0);
});
test('cliente mostra código seguro do servidor e ignora texto arbitrário',async()=>{
 const {ai}=client(async()=>({ok:false,status:503,json:async()=>({code:'AI_KEY_MISSING',error:'private-value'})}));
 await assert.rejects(ai.chat('Oi'),error=>{assert.match(error.message,/AI_KEY_MISSING/);assert.doesNotMatch(error.message,/private-value/);return true;});
 const other=client(async()=>({ok:false,status:503,json:async()=>({code:'private-value',error:'private-value'})})).ai;
 await assert.rejects(other.chat('Oi'),error=>{assert.match(error.message,/HTTP_503/);assert.doesNotMatch(error.message,/private-value/);return true;});
});
test('resposta HTML de bloqueio mostra status sem renderizar corpo',async()=>{
 const {ai}=client(async()=>({ok:false,status:403,json:async()=>{throw Error('<html>private</html>');}}));
 await assert.rejects(ai.chat('Oi'),error=>{assert.match(error.message,/HTTP_403/);assert.doesNotMatch(error.message,/private/);return true;});
});
