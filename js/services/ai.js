// Stable, public support codes. Never display arbitrary upstream error text.
const AI_ERROR_MESSAGES = Object.freeze({
  AI_KEY_MISSING: 'A chave da IA ainda não foi aplicada ao servidor publicado.',
  AI_KEY_REJECTED: 'O Gemini recusou a chave cadastrada. É necessário revisar a chave no servidor.',
  AI_PROVIDER_PERMISSION: 'O projeto ou a chave não tem permissão para usar o Gemini.',
  AI_MODEL_UNAVAILABLE: 'O modelo de IA configurado não está disponível.',
  AI_PROVIDER_QUOTA: 'A cota do Gemini foi atingida ou não está disponível para este modelo.',
  AI_PROVIDER_REQUEST: 'O Gemini recusou a configuração da consulta.',
  AI_PROVIDER_UNAVAILABLE: 'O serviço Gemini não respondeu corretamente. Tente mais tarde.',
  AI_AUTH_CONFIG: 'A identificação do Firebase está incompleta no servidor.',
  AI_AUTH_UNAVAILABLE: 'Não foi possível verificar o login no servidor.',
  AI_QUOTA_CONFIG: 'O controle de uso da IA ainda precisa ser configurado.',
  AI_QUOTA_UNAVAILABLE: 'O controle de uso da IA está indisponível.',
  AI_APP_QUOTA: 'Você atingiu o limite de uso do aplicativo. Tente mais tarde.',
  AI_RESPONSE_BLOCKED: 'O Gemini não respondeu a essa pergunta. Reformule e tente novamente.',
  AI_EMPTY_RESPONSE: 'O Gemini retornou uma resposta sem texto. Tente novamente.',
  AI_TIMEOUT: 'A consulta demorou demais. Tente novamente.'
});
const AIService = (() => {
  let context = '', generation = 0, pending = null;
  function setContext(value) { context = typeof value === 'string' ? value : ''; }
  function clearHistory() { generation++; pending?.abort(); pending = null; context = ''; }
  async function chat(message, shareContext = false) {
    if (pending) throw new Error('Aguarde a resposta atual.');
    if (typeof message !== 'string' || !message.trim() || message.length > 2000) throw new Error('Digite uma pergunta de até 2.000 caracteres.');
    const user = Auth.currentUser;
    if (!user) throw new Error('Entre na sua conta para conversar.');
    const endpoint = typeof AI_CONFIG !== 'undefined' ? AI_CONFIG.endpoint : '';
    if (!/^https:\/\//.test(endpoint)) throw new Error('O assistente ainda precisa ser ativado. Configure a URL do Worker.');
    const version = generation;
    const controller = new AbortController();
    pending = controller;
    const timer = setTimeout(() => controller.abort(), 35000);
    const current = () => generation === version && Auth.currentUser === user && !controller.signal.aborted;
    try {
      const token = await user.getIdToken();
      if (!current()) throw new Error('Conversa interrompida.');
      const response = await fetch(endpoint, {
        method: 'POST', signal: controller.signal,
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({message: message.trim(), context: shareContext ? context.slice(0, 12000) : ''})
      });
      if (!current()) throw new Error('Conversa interrompida.');
      if (response.status === 404) throw new Error('O assistente ainda precisa ser ativado no servidor.');
      let data;
      try { data = await response.json(); }
      catch { throw new Error(`O servidor recusou a conexão ou retornou uma resposta inválida. [HTTP_${response.status}]`); }
      if (!current()) throw new Error('Conversa interrompida.');
      if (!response.ok) {
        const code = Object.hasOwn(AI_ERROR_MESSAGES, data.code) ? data.code : `HTTP_${response.status}`;
        const message = AI_ERROR_MESSAGES[code] || ({401:'Sua sessão expirou. Entre novamente.',403:'O servidor bloqueou o acesso à IA.',429:'Limite de uso atingido. Tente mais tarde.'})[response.status] || 'A consulta falhou no servidor.';
        throw new Error(`${message} [${code}]`);
      }
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('A IA não retornou uma resposta.');
      return data.reply;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('A consulta foi interrompida ou demorou demais.');
      if (error instanceof TypeError) throw new Error('Não foi possível conectar à IA. Verifique a conexão e a ativação do servidor.');
      throw error;
    } finally { clearTimeout(timer); if (pending === controller) pending = null; }
  }
  return {chat, setContext, clearHistory};
})();
async function sendMessage(event) {
  event?.preventDefault();
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const status = document.getElementById('chat-status');
  const button = document.getElementById('chat-send');
  if (!form || button.disabled || !input.value.trim()) return;
  const message = input.value.trim();
  button.disabled = true;
  status.textContent = 'Consultando a IA…';
  const append = (text, role) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${role}`;
    const content = document.createElement('div');
    content.className = 'chat-text';
    content.style.whiteSpace = 'pre-wrap';
    content.textContent = text;
    bubble.appendChild(content);
    const messages = document.getElementById('chat-messages');
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  };
  try {
    const reply = await AIService.chat(message, document.getElementById('chat-share-context').checked);
    if (!form.isConnected) return;
    append(message, 'user'); append(reply, 'ai');
    input.value = ''; status.textContent = 'Resposta recebida. Cada pergunta é enviada separadamente.';
  } catch (error) { if (form.isConnected) status.textContent = error.message; }
  finally { if (form.isConnected) { button.disabled = false; input.focus(); } }
}
