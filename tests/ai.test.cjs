const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/services/ai.js'), 'utf8');

test('assistente indisponível nunca envia mensagens nem contexto financeiro', async () => {
  let requests = 0;
  const context = vm.createContext({fetch() { requests++; throw Error('Rede não permitida'); }});
  const ai = vm.runInContext(source + '\nAIService;', context);
  ai.setContext('Dados fictícios de teste');
  await assert.rejects(ai.chat('Qual é meu saldo?'), {code: 'AI_UNAVAILABLE'});
  ai.clearHistory();
  assert.equal(requests, 0);
});

test('ações antigas do chat exibem o estado indisponível sem rede', () => {
  const status = {textContent: ''};
  const context = vm.createContext({document: {getElementById: () => status}});
  vm.runInContext(source + '\nsendSuggestion(); sendMessage();', context);
  assert.match(status.textContent, /temporariamente indisponível/);
});

test('a tela não oferece envio enquanto o assistente está suspenso', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.match(html, /id="chat-status" role="status"/);
  assert.doesNotMatch(html, /id="chat-input"|onclick="sendMessage\(\)"|onclick="sendSuggestion/);
});

test('cliente não contém chave nem endpoint direto do Gemini', () => {
  assert.doesNotMatch(source, /AIza[\w-]{20,}|generativelanguage\.googleapis\.com|GEMINI_API_KEY/);
});
