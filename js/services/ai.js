const AIService = (() => {
  let context = '', generation = 0, pending = null;
  function setContext(value) { context = typeof value === 'string' ? value : ''; }
  function clearHistory() { generation++; pending?.abort(); pending = null; context = ''; }
  async function chat(message, shareContext = false) {
    if (pending) throw new Error('Aguarde a resposta atual.');
    if (typeof message !== 'string' || !message.trim() || message.length > 2000) throw new Error('Digite uma pergunta de até 2.000 caracteres.');
    const user = Auth.currentUser;
    if (!user) throw new Error('Entre na sua conta para conversar.');
    const version = generation;
    const controller = new AbortController();
    pending = controller;
    const timer = setTimeout(() => controller.abort(), 35000);
    const current = () => generation === version && Auth.currentUser === user && !controller.signal.aborted;
    try {
      const token = await user.getIdToken();
      if (!current()) throw new Error('Conversa interrompida.');
      const response = await fetch(`https://us-central1-${FIREBASE_CONFIG.projectId}.cloudfunctions.net/financeChat`, {
        method: 'POST', signal: controller.signal,
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({message: message.trim(), context: shareContext ? context.slice(0, 12000) : ''})
      });
      if (!current()) throw new Error('Conversa interrompida.');
      if (response.status === 404) throw new Error('O assistente ainda precisa ser ativado no servidor.');
      const data = await response.json();
      if (!current()) throw new Error('Conversa interrompida.');
      if (!response.ok) throw new Error(({401: 'Sua sessão expirou. Entre novamente.', 429: 'Limite de uso atingido. Tente mais tarde.'})[response.status] || 'A IA está indisponível no momento. Tente mais tarde.');
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
