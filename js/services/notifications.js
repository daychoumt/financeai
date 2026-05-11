/* ═══════════════════════════════════════════════════════
   js/services/notifications.js — Alertas e notificações
═══════════════════════════════════════════════════════ */

const NotificationService = (() => {

  /**
   * Verifica limites e mostra toast se ultrapassados.
   * Chamado toda vez que uma transação é adicionada.
   */
  function checkLimitsOnAdd(tx, limits = {}, catData = {}) {
    if (tx.type !== 'saida') return;

    const cat   = tx.category;
    const limit = limits[cat];
    if (!limit) return;

    const spent = catData[cat] || 0;
    const pct   = spent / limit;

    if (pct > 1) {
      showToast(`🚨 Limite de "${cat}" ultrapassado! (${fmt.currency(spent)} / ${fmt.currency(limit)})`, 'error', 5000);
    } else if (pct > 0.8) {
      showToast(`⚠️ "${cat}" está em ${Math.round(pct*100)}% do limite!`, 'info', 4000);
    }
  }

  /**
   * Verifica previsão de saldo negativo.
   * Chamado no carregamento do dashboard.
   */
  function checkNegativeForecast(forecast, income) {
    if (!forecast || !income) return;

    if (forecast.forecastTotal > income * 1.1) {
      showToast(
        `⚠️ Previsão: seus gastos podem chegar a ${fmt.currency(forecast.forecastTotal)} este mês!`,
        'info',
        6000
      );
    }
  }

  /**
   * Solicita permissão para notificações nativas do browser.
   */
  async function requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Envia notificação nativa (se permitido).
   */
  function sendNative(title, body) {
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/assets/icon-192.png'
    });
  }

  return { checkLimitsOnAdd, checkNegativeForecast, requestPermission, sendNative };

})();
