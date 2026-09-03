const test = require('node:test');
const assert = require('node:assert/strict');
const {createHandler, fail} = require('../functions/chat.cjs');
async function run({token = 'Bearer token', body = {message:'Olá'}, method = 'POST', ...overrides} = {}) {
  let calls = 0, quotaUid;
  const handler = createHandler({verifyToken: async () => ({uid: 'verified-user'}),
    reserveQuota: async uid => {quotaUid = uid;}, generate: async () => {calls++; return 'Resposta';}, ...overrides});
  const response = {set(){}, status(code){this.code=code;return this;}, json(data){this.data=data;}};
  await handler({method, body, get: () => token}, response);
  return {...response, calls, quotaUid};
}
test('identidade vem do token, nunca do corpo', async () => {
  const r = await run({body:{message:'Olá',uid:'another-user'}});
  assert.equal(r.code,200); assert.equal(r.quotaUid,'verified-user'); assert.equal(r.data.reply,'Resposta');
});
test('sem token ou token inválido não consulta IA', async () => {
  for (const options of [{token:''},{verifyToken:async()=>{throw Error('bad token');}}]) {
    const r = await run(options); assert.equal(r.code,401); assert.equal(r.calls,0);
  }
});
test('método, mensagem e contexto inválidos não consultam IA', async () => {
  for (const options of [{method:'GET'},{body:{}},{body:{message:'x'.repeat(2001)}},{body:{message:'x',context:[]}}]) {
    const r = await run(options); assert.ok([400,405].includes(r.code)); assert.equal(r.calls,0);
  }
});
test('quota excedida bloqueia provedor', async () => {
  const r = await run({reserveQuota: async()=>{throw fail(429,'Limite');}});
  assert.equal(r.code,429); assert.equal(r.calls,0);
});
test('erros inesperados são sanitizados; resposta vazia é tratada', async () => {
  const r = await run({generate:async()=>{throw Error('private-key');}});
  assert.equal(r.code,503); assert.doesNotMatch(JSON.stringify(r.data),/private-key/);
  assert.equal((await run({generate:async()=>''})).code,502);
});
const {reserveQuota} = require('../functions/quota.cjs');
test('contadores limitam usuário e total global; renovam no dia seguinte', async () => {
  const data = new Map();
  const db = {doc: path=>path, runTransaction: async fn => fn({
    getAll: async (...refs)=>refs.map(ref=>({data:()=>data.get(ref)})),
    set: (ref,value)=>data.set(ref,value)
  })};
  const time = Date.UTC(2026,8,3,12);
  for(let i=0;i<5;i++) await reserveQuota(db,'a',time);
  await assert.rejects(reserveQuota(db,'a',time),{status:429});
  for(let m=1;m<6;m++) for(let i=0;i<5;i++) await reserveQuota(db,'a',time+m*60000);
  await assert.rejects(reserveQuota(db,'a',time+6*60000),{status:429});
  data.set('aiUsage/global',{day:'2026-09-03',count:200});
  await assert.rejects(reserveQuota(db,'b',time),{status:429});
  await reserveQuota(db,'a',time+86400000);
  assert.equal(data.get('aiUsage/global').count,1);
});
