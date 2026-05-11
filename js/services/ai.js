/* ═══════════════════════════════════════════════════════
   js/services/ai.js — Chatbot financeiro (Gemini API)
   Grátis: 1500 mensagens/dia com conta Google
   
   INSTRUÇÕES:
   1. Acesse https://aistudio.google.com/app/apikey
   2. Clique em "Create API Key"
   3. Copie a chave e cole em GEMINI_API_KEY abaixo
═══════════════════════════════════════════════════════ */

const GEMINI_API_KEY = "AIzaSyDhCDSqWTxQrxfDQwpI1ll5fa7mTe3wlPI";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const AIService = (() => {

  /* Histórico da conversa */
  let _history = [];

  /* Contexto financeiro atual */
  let _financialContext = '';

  function setContext(ctx) {
    _financialContext = ctx;
  }

  function clearHistory() {
    _history = [];
  }

  async function chat(userMessage) {
    const systemPrompt = `Você é um assistente financeiro pessoal inteligente chamado FinanceAI. 
Fale em português do Brasil de forma clara, amigável e direta.
${_financialContext ? `\nDados financeiros atuais do utilizador:\n${_financialContext}` : ''}
Diretrizes:
- Seja objetivo e prático
- Use dados reais do utilizador quando disponíveis  
- Formate valores sempre em reais (R$)
- Use emojis com moderação
- Responda em no máximo 3 parágrafos curtos
- Nunca invente dados que não foram fornecidos`;

    // Monta histórico no formato Gemini
    const contents = [];

    // Adiciona histórico anterior
    _history.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });

    // Adiciona mensagem atual com contexto
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            temperature:     0.7,
            maxOutputTokens: 800,
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message || `Erro HTTP ${response.status}`;
        throw new Error(msg);
      }

      const data    = await response.json();
      const aiText  = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!aiText) throw new Error('Resposta vazia da IA');

      // Salva no histórico
      _history.push({ role: 'user',      content: userMessage });
      _history.push({ role: 'assistant', content: aiText });

      // Máximo 20 mensagens no histórico
      if (_history.length > 20) {
        _history = _history.slice(_history.length - 20);
      }

      return aiText;

    } catch (err) {
      console.error('Erro Gemini:', err.message);
      throw err;
    }
  }

  return { chat, setContext, clearHistory };

})();

/* ═══════════════════════════════════════════════════════
   FUNÇÕES DE UI DO CHAT
═══════════════════════════════════════════════════════ */

function sendSuggestion(btn) {
  const text = btn.textContent.trim();
  document.getElementById('chat-input').value = text;
  const sug = document.getElementById('chat-suggestions');
  if (sug) sug.style.display = 'none';
  sendMessage();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value?.trim();
  if (!text) return;

  // Verifica se a chave foi configurada
  if (GEMINI_API_KEY === "SUA_CHAVE_GEMINI_AQUI") {
    const messages = document.getElementById('chat-messages');
    messages?.appendChild(createChatBubble('ai',
      '⚙️ Configure sua chave do Gemini no arquivo js/services/ai.js para usar o assistente.\n\nAcesse: https://aistudio.google.com/app/apikey'
    ));
    return;
  }

  input.value = '';

  const messages = document.getElementById('chat-messages');
  if (!messages) return;

  messages.appendChild(createChatBubble('user', text));

  const typingEl = createTypingBubble();
  messages.appendChild(typingEl);
  messages.scrollTop = messages.scrollHeight;

  try {
    const reply = await AIService.chat(text);
    typingEl.remove();
    messages.appendChild(createChatBubble('ai', reply));
  } catch (err) {
    typingEl.remove();

    let errorMsg = '❌ Não consegui me conectar ao assistente.';

    if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('400')) {
      errorMsg = '🔑 Chave do Gemini inválida. Verifique a chave em js/services/ai.js';
    } else if (err.message?.includes('429')) {
      errorMsg = '⏳ Limite de mensagens atingido. Tente novamente em alguns minutos.';
    } else if (err.message?.includes('Failed to fetch')) {
      errorMsg = '🌐 Sem conexão com a internet. Verifique sua rede.';
    }

    messages.appendChild(createChatBubble('ai', errorMsg));
  }

  messages.scrollTop = messages.scrollHeight;
}

function createChatBubble(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `chat-bubble chat-bubble--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';

  if (role === 'ai') {
    avatar.textContent = '◈';
  } else {
    const user = Auth.currentUser;
    const name = user?.displayName || user?.email || 'U';
    avatar.textContent = name.charAt(0).toUpperCase();
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-text';
  bubble.textContent = text;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  return wrap;
}

function createTypingBubble() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble chat-bubble--ai';

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.textContent = '◈';

  const typing = document.createElement('div');
  typing.className = 'chat-text chat-typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  wrap.appendChild(avatar);
  wrap.appendChild(typing);
  return wrap;
}
