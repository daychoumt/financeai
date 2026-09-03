const test = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../worker/index.mjs');
function env() { return {GEMINI_API_KEY:'fake', FIREBASE_WEB_API_KEY:'fake-web', FIREBASE_PROJECT_ID:'test',
 ALLOWED_ORIGINS:'https://site.test', CHAT_QUOTA:{idFromName:n=>n,get:()=>({fetch:async()=>new Response('{}')})}}; }
function req(body={message:'Oi'}, headers={}, method='POST') {
 return new Request('https://worker.test/chat',{method,headers:{Origin:'https://site.test',Authorization:'Bearer token','Content-Type':'application/json',...headers},body:method==='POST'?JSON.stringify(body):undefined});
}
test('Worker autentica antes de reservar e consultar; UID do corpo é ignorado', async()=>{
 const {handle}=await modulePromise; const e=env(); const order=[];
 e.CHAT_QUOTA.get=()=>({fetch:async(url,opts)=>{order.push('quota');assert.equal(JSON.parse(opts.body).uid,'verified');return new Response('{}');}});
 const response=await handle(req({message:'Oi',uid:'forged'}),e,{authenticate:async()=>{order.push('auth');return 'verified';},generate:async()=>{order.push('gemini');return 'Olá';}});
 assert.equal(response.status,200);assert.deepEqual(order,['auth','quota','gemini']);
 assert.equal((await response.json()).reply,'Olá');assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://site.test');
});
test('Worker recusa origem, token ausente e corpo inválido sem chamar provedor',async()=>{
 const {handle}=await modulePromise;let calls=0;
 const deps={authenticate:async()=>{calls++;return 'u';},generate:async()=>{calls++;}};
 for(const [request,status] of [[req({}, {Origin:'https://evil.test'}),403],[req({}, {Authorization:''}),401],[req({message:'x'.repeat(2001)}),400],[req({message:'x',context:[]}),400],[req({message:'x'.repeat(65000)}),413],[req({}, {},'GET'),405]]) {
  assert.equal((await handle(request,env(),deps)).status,status);
 }
 assert.equal(calls,0);
 const preflight=await handle(req({}, {},'OPTIONS'),env(),deps);assert.equal(preflight.status,204);
});
test('quota e falha de autenticação impedem chamadas; erros não expõem detalhes',async()=>{
 const {handle}=await modulePromise;const e=env();let calls=0;
 e.CHAT_QUOTA.get=()=>({fetch:async()=>new Response('{}',{status:429})});
 assert.equal((await handle(req(),e,{authenticate:async()=>'u',generate:async()=>{calls++;}})).status,429);
 const r=await handle(req(),env(),{authenticate:async()=>{throw Error('private-token');},generate:async()=>{calls++;}});
 assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private-token/);assert.equal(calls,0);
});
function token(overrides={}) {
 const c={aud:'test',iss:'https://securetoken.google.com/test',sub:'user',auth_time:100,exp:Date.now()/1000+1000,...overrides};
 return 'header.'+Buffer.from(JSON.stringify(c)).toString('base64url')+'.signature';
}
test('Firebase verifica assinatura remotamente; projeto, conta e revogação são conferidos',async()=>{
 const {authenticate}=await modulePromise;let calls=0;
 const fetchAccount=async(url,options)=>{calls++;assert.match(url,/accounts:lookup/);assert.ok(JSON.parse(options.body).idToken);return Response.json({users:[{localId:'user',validSince:'99'}]});};
 assert.equal(await authenticate(token(),env(),fetchAccount),'user');
 for(const t of [token({aud:'other'}),token({exp:0}),'bad']) await assert.rejects(authenticate(t,env(),fetchAccount),{status:401});
 assert.equal(calls,1);
 await assert.rejects(authenticate(token(),env(),async()=>new Response('{}',{status:400})),{status:401});
 for(const account of [{localId:'other'},{localId:'user',disabled:true},{localId:'user',validSince:'101'}]) {
  await assert.rejects(authenticate(token(),env(),async()=>Response.json({users:[account]})),{status:401});
 }
});
test('quota global e por usuário respeita minuto e renovação diária',async()=>{
 const {nextQuota}=await modulePromise;const now=Date.UTC(2026,8,3,12);let state;
 for(let i=0;i<5;i++)state=nextQuota(state,'a',now);
 assert.throws(()=>nextQuota(state,'a',now),{status:429});
 for(let m=1;m<6;m++)for(let i=0;i<5;i++)state=nextQuota(state,'a',now+m*60000);
 assert.throws(()=>nextQuota(state,'a',now+360000),{status:429});
 for(let i=0;i<170;i++)state=nextQuota(state,'other'+i,now);
 assert.throws(()=>nextQuota(state,'new',now),{status:429});
 assert.equal(nextQuota(state,'a',now+86400000).total,1);
});
test('Durable Object grava contador dentro da transação',async()=>{
 const {ChatQuota}=await modulePromise;let state,transactions=0;
 const object=new ChatQuota({storage:{transaction:async fn=>{transactions++;await fn({get:async()=>state,put:async(k,v)=>{state=v;}});}}});
 for(let i=0;i<5;i++)assert.equal((await object.fetch(new Request('https://quota',{method:'POST',body:JSON.stringify({uid:'u'})}))).status,200);
 assert.equal((await object.fetch(new Request('https://quota',{method:'POST',body:JSON.stringify({uid:'u'})}))).status,429);
 assert.equal(transactions,6);assert.equal(state.total,5);
});
test('Gemini recebe chave somente no servidor, contexto e pergunta; erros tratados',async()=>{
 const {generate}=await modulePromise;
 const text=await generate({message:'Oi',context:'resumo fictício'},env(),async(url,options)=>{
  assert.match(url,/generativelanguage/);assert.equal(options.headers['x-goog-api-key'],'fake');
  const body=JSON.parse(options.body);assert.equal(JSON.parse(body.contents[0].parts[0].text).resumoFinanceiro,'resumo fictício');
  return Response.json({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'Resposta'}]}}]});
 });assert.equal(text,'Resposta');
 await assert.rejects(generate({message:'Oi'},env(),async()=>new Response('{}',{status:429})),{status:429});
 await assert.rejects(generate({message:'Oi'},env(),async()=>Response.json({})),{status:502});
});
test('diagnóstico separa configuração incompleta e falha do contador', async()=>{
 const {handle}=await modulePromise;
 for(const [key,code] of [['GEMINI_API_KEY','AI_KEY_MISSING'],['FIREBASE_WEB_API_KEY','AI_AUTH_CONFIG'],['CHAT_QUOTA','AI_QUOTA_CONFIG']]) {
  const e=env();delete e[key];const response=await handle(req(),e);
  assert.equal(response.status,503);assert.equal((await response.json()).code,code);
 }
 const e=env();e.CHAT_QUOTA.get=()=>({fetch:async()=>{throw Error('private-value');}});
 const response=await handle(req(),e,{authenticate:async()=>'u'});const body=await response.json();
 assert.equal(body.code,'AI_QUOTA_UNAVAILABLE');assert.doesNotMatch(JSON.stringify(body),/private-value/);
});
test('diagnóstico Gemini distingue chave, permissão, modelo, quota e provedor sem vazar erro',async()=>{
 const {handle,generate}=await modulePromise;
 for(const [status,payload,code] of [
  [400,{error:{message:'private-key',details:[{reason:'API_KEY_INVALID'}]}},'AI_KEY_REJECTED'],
  [403,{error:{message:'private-key'}},'AI_PROVIDER_PERMISSION'],
  [404,{},'AI_MODEL_UNAVAILABLE'],[429,{},'AI_PROVIDER_QUOTA'],
  [400,{},'AI_PROVIDER_REQUEST'],[500,{},'AI_PROVIDER_UNAVAILABLE']
 ]) {
  const response=await handle(req(),env(),{authenticate:async()=>'u',generate:(input,e)=>generate(input,e,async()=>Response.json(payload,{status}))});
  const body=await response.json();assert.equal(body.code,code);assert.doesNotMatch(JSON.stringify(body),/private-key/);
 }
});
test('resposta curta reserva tokens para texto e identifica resposta vazia',async()=>{
 const {generate}=await modulePromise;
 await assert.rejects(generate({message:'Oi'},{...env(),GEMINI_MODEL:'gemini-2.5-flash'},async(url,options)=>{
  assert.equal(JSON.parse(options.body).generationConfig.thinkingConfig.thinkingBudget,0);
  return Response.json({candidates:[{content:{parts:[]},finishReason:'MAX_TOKENS'}]});
 }),{code:'AI_EMPTY_RESPONSE'});
});
test('modelo indisponível usa uma alternativa gratuita confirmada no catálogo',async()=>{
 const {generate}=await modulePromise;const calls=[];let signal;
 const result=await generate({message:'Oi'},env(),async(url,options)=>{
  calls.push(url);if(signal)assert.equal(options.signal,signal);signal=options.signal;
  if(calls.length===1){assert.match(url,/gemini-3\.1-flash-lite:generateContent$/);return Response.json({}, {status:404});}
  if(calls.length===2){assert.match(url,/\/models\?pageSize=1000$/);assert.equal(options.body,undefined);return Response.json({models:[
    {name:'models/gemini-pro-paid',supportedGenerationMethods:['generateContent']},
    {name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent']}
  ]});}
  assert.match(url,/gemini-3\.5-flash-lite:generateContent$/);
  return Response.json({candidates:[{content:{parts:[{text:'Funcionou'}]}}]});
 });assert.equal(result,'Funcionou');assert.equal(calls.length,3);
});
test('fallback não escolhe modelos fora da lista nem métodos incompatíveis',async()=>{
 const {generate}=await modulePromise;let calls=0;
 await assert.rejects(generate({message:'Oi'},env(),async()=>{
  calls++;return calls===1?Response.json({}, {status:404}):Response.json({models:[
    {name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['embedContent']},
    {name:'models/gemini-pro-paid',supportedGenerationMethods:['generateContent']}
  ]});
 }),{code:'AI_MODEL_UNAVAILABLE'});assert.equal(calls,2);
});
test('falhas de permissão e cota não geram tentativas extras',async()=>{
 const {generate}=await modulePromise;
 for(const status of [403,429]){let calls=0;await assert.rejects(generate({message:'Oi'},env(),async()=>{
   calls++;return Response.json({}, {status});
  }));assert.equal(calls,1);}
});
