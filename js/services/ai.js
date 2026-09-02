/*
 * Assistente temporariamente indisponível.
 * A próxima integração deve usar um backend autenticado. Nunca coloque
 * credenciais do provedor neste arquivo ou em outro recurso do navegador.
 */
const AIService = (() => {
  const unavailableMessage = 'O assistente está temporariamente indisponível. Você pode continuar usando os outros recursos do Finance AI.';

  // Mantém a interface usada pelo controlador sem reter dados financeiros.
  function setContext() {}
  function clearHistory() {}

  async function chat() {
    const error = new Error(unavailableMessage);
    error.code = 'AI_UNAVAILABLE';
    throw error;
  }

  return { chat, setContext, clearHistory, unavailableMessage };
})();

// Mantém chamadas antigas inofensivas durante a atualização da página.
function sendSuggestion() {
  sendMessage();
}

function sendMessage() {
  const status = document.getElementById('chat-status');
  if (status) status.textContent = AIService.unavailableMessage;
}
