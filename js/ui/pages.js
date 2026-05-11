/* ═══════════════════════════════════════════════════════
   js/ui/pages.js — Renderização das páginas
   Cada função recebe dados e atualiza o DOM.
═══════════════════════════════════════════════════════ */

const PagesService = (() => {

  /* ─────────────────────────────────────────
     DASHBOARD
  ───────────────────────────────────────── */

  function renderDashboard(summary, catData, score, alerts, recentTxs, snapshots) {
    // KPI Cards
    _setKPI('kpi-income',   fmt.currency(summary.income),   'kpi-income');
    _setKPI('kpi-expense',  fmt.currency(summary.expense),  'kpi-expense');
    _setKPI('kpi-balance',  fmt.currency(summary.balance),  'kpi-balance');
    _setKPI('kpi-score',    `${score}/100`,                 'kpi-score');

    // Cor do saldo
    const balEl = document.getElementById('kpi-balance');
    if (balEl) {
      balEl.style.color = summary.balance >= 0
        ? 'var(--green)'
        : 'var(--red)';
    }

    // Barra de score
    const bar = document.getElementById('kpi-bar');
    if (bar) {
      setTimeout(() => { bar.style.width = `${score}%`; }, 100);
    }

    // Gráfico de categorias
    ChartsService.renderCategory(catData);

    // Alertas
    renderAlerts(alerts);

    // Últimas transações
    renderRecentTransactions(recentTxs);
  }

  function _setKPI(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
      el.closest('.kpi-card')?.classList.remove('loading');
    }
  }

  /* ─────────────────────────────────────────
     ALERTAS
  ───────────────────────────────────────── */

  function renderAlerts(alerts = []) {
    const container = document.getElementById('alerts-container');
    if (!container) return;

    if (!alerts.length) {
      container.innerHTML = '<div class="empty-state-sm">✅ Sem alertas — finanças em ordem!</div>';
      return;
    }

    container.innerHTML = alerts.map(a => `
      <div class="alert-item alert-item--${a.type}">${a.msg}</div>
    `).join('');
  }

  /* ─────────────────────────────────────────
     ÚLTIMAS TRANSAÇÕES (Dashboard)
  ───────────────────────────────────────── */

  function renderRecentTransactions(txs = []) {
    const container = document.getElementById('recent-tx-list');
    if (!container) return;

    const recent = txs.slice(0, 6);

    if (!recent.length) {
      container.innerHTML = '<div class="empty-state-sm">Sem transações este mês</div>';
      return;
    }

    container.innerHTML = recent.map(tx => _txItem(tx, false)).join('');
  }

  /* ─────────────────────────────────────────
     LISTA COMPLETA DE TRANSAÇÕES
  ───────────────────────────────────────── */

  function renderTransactionList(txs = [], filters = {}) {
    const container = document.getElementById('tx-list');
    if (!container) return;

    // Aplicar filtros
    let filtered = txs.filter(tx => {
      const search   = (filters.search   || '').toLowerCase();
      const type     = filters.type     || 'all';
      const cat      = filters.cat      || 'all';
      const dateFrom = filters.dateFrom || '';
      const dateTo   = filters.dateTo   || '';

      const matchSearch   = !search   || tx.desc?.toLowerCase().includes(search) ||
                            tx.category?.toLowerCase().includes(search);
      const matchType     = type === 'all' || tx.type === type;
      const matchCat      = cat  === 'all' || tx.category === cat;
      const matchDateFrom = !dateFrom || (tx.date || '') >= dateFrom;
      const matchDateTo   = !dateTo   || (tx.date || '') <= dateTo;

      return matchSearch && matchType && matchCat && matchDateFrom && matchDateTo;
    });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhuma transação encontrada</div>
          <div class="empty-desc">Tente ajustar os filtros</div>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map((tx, i) => _txItem(tx, true, i))
      .join('');
  }

  /** Gera HTML de um item de transação */
  function _txItem(tx, showDelete = true, index = 0) {
    const icon  = CATEGORY_ICONS[tx.category] || (tx.type === 'entrada' ? '💰' : '💸');
    const delay = `style="animation-delay:${index * 0.04}s"`;

    return `
      <div class="tx-item anim-fade-up" ${delay}>
        <div class="tx-icon tx-icon--${tx.type}">${icon}</div>
        <div class="tx-info">
          <div class="tx-desc">${tx.desc || '—'}</div>
          <div class="tx-meta">${tx.category || ''} • ${fmt.date(tx.date)}</div>
        </div>
        <div class="tx-amount tx-amount--${tx.type}">
          ${tx.type === 'entrada' ? '+' : '-'}${fmt.currency(tx.amount)}
        </div>
        ${showDelete ? `<button class="tx-del-btn" onclick="AppController.deleteTransaction('${tx.id}')" title="Remover">✕</button>` : ''}
      </div>`;
  }

  /* ─────────────────────────────────────────
     ANÁLISE
  ───────────────────────────────────────── */

  function renderForecast(forecast) {
    const container = document.getElementById('forecast-container');
    if (!container) return;

    if (!forecast) {
      container.innerHTML = '<div class="empty-state-sm">Sem dados suficientes</div>';
      return;
    }

    container.innerHTML = `
      <div class="forecast-row">
        <span class="forecast-label">Gasto até agora</span>
        <span class="forecast-value">${fmt.currency(forecast.totalSpent)}</span>
      </div>
      <div class="forecast-row">
        <span class="forecast-label">Média diária</span>
        <span class="forecast-value">${fmt.currency(forecast.dailyAvg)}</span>
      </div>
      <div class="forecast-row">
        <span class="forecast-label">Previsão total do mês</span>
        <span class="forecast-value" style="color:var(--accent)">${fmt.currency(forecast.forecastTotal)}</span>
      </div>
      <div class="forecast-row">
        <span class="forecast-label">Dias restantes</span>
        <span class="forecast-value">${forecast.daysLeft} dias</span>
      </div>
    `;
  }

  function renderLimits(limits = {}, catData = {}) {
    const container = document.getElementById('limits-container');
    if (!container) return;

    const entries = Object.entries(limits);

    if (!entries.length) {
      container.innerHTML = '<div class="empty-state-sm">Nenhum limite definido</div>';
      return;
    }

    container.innerHTML = entries.map(([cat, lim]) => {
      const spent = catData[cat] || 0;
      const pct   = Math.min(100, (spent / lim) * 100);
      const cls   = pct > 100 ? 'danger' : pct > 70 ? 'warning' : 'ok';

      return `
        <div class="limit-row">
          <span class="limit-cat">${CATEGORY_ICONS[cat] || '📌'} ${cat}</span>
          <div class="limit-bar-wrap">
            <div class="limit-bar limit-bar--${cls}" style="width:${pct}%"></div>
          </div>
          <span class="limit-pct">${Math.round(pct)}%</span>
          <button onclick="AppController.removeLimit('${cat}')" style="padding:2px 6px;color:var(--text-muted);font-size:13px">✕</button>
        </div>`;
    }).join('');
  }

  /* ─────────────────────────────────────────
     METAS
  ───────────────────────────────────────── */

  function renderGoals(goals = []) {
    const container = document.getElementById('goals-list');
    if (!container) return;

    if (!goals.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">Nenhuma meta ainda</div>
          <div class="empty-desc">Crie sua primeira meta financeira</div>
        </div>`;
      return;
    }

    container.innerHTML = goals.map((g, i) => {
      const pct  = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
      const done = pct >= 100;

      return `
        <div class="goal-card anim-fade-up" style="animation-delay:${i*0.06}s">
          <div class="goal-icon">${g.icon || '🎯'}</div>
          <div class="goal-name">${g.name}</div>
          <div class="goal-amounts">
            ${fmt.currency(g.saved)} de ${fmt.currency(g.target)}
            ${done ? ' <span style="color:var(--green)">✅ Concluída!</span>' : ''}
          </div>
          <div class="goal-progress-wrap">
            <div class="goal-progress-bar" style="width:${pct}%"></div>
          </div>
          <div class="goal-pct">${Math.round(pct)}%</div>
          <div class="goal-actions">
            <button class="btn-primary btn-sm" onclick="AppController.addToGoal('${g.id}', ${g.saved}, ${g.target})">
              + Depositar
            </button>
            <button class="btn-ghost btn-sm" onclick="AppController.deleteGoal('${g.id}')">
              Remover
            </button>
          </div>
        </div>`;
    }).join('');
  }

  /* ─────────────────────────────────────────
     ASSINATURAS
  ───────────────────────────────────────── */

  function renderSubscriptions(subs = []) {
    const container = document.getElementById('subs-list');
    if (!container) return;

    if (!subs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-title">Nenhuma assinatura</div>
          <div class="empty-desc">Netflix, Spotify, academia... tudo num lugar só</div>
        </div>`;
    } else {
      const subIcons = {
        'Streaming': '🎬', 'Música': '🎵', 'Fitness': '🏋️',
        'Software': '💻', 'Outros': '📦'
      };

      container.innerHTML = subs.map((s, i) => `
        <div class="sub-item anim-fade-up" style="animation-delay:${i*0.05}s">
          <div class="sub-avatar">${subIcons[s.category] || '📦'}</div>
          <div class="sub-info">
            <div class="sub-name">${s.name}</div>
            <div class="sub-meta">Dia ${s.day || '?'} • ${s.category}</div>
          </div>
          <div class="sub-price">${fmt.currency(s.price)}/mês</div>
          <button class="sub-del-btn" onclick="AppController.deleteSubscription('${s.id}')" title="Remover">✕</button>
        </div>`).join('');
    }

    // Totais
    const monthly = subs.reduce((s, sub) => s + (sub.price || 0), 0);
    const annual  = monthly * 12;

    const mEl = document.getElementById('subs-monthly-total');
    const aEl = document.getElementById('subs-annual-total');
    if (mEl) mEl.textContent = fmt.currency(monthly);
    if (aEl) aEl.textContent = fmt.currency(annual);
  }

  /* ─────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────── */
  return {
    renderDashboard,
    renderAlerts,
    renderRecentTransactions,
    renderTransactionList,
    renderForecast,
    renderLimits,
    renderGoals,
    renderSubscriptions
  };

})();

/* ─────────────────────────────────────────
   FILTROS DA PÁGINA DE TRANSAÇÕES
   (chamado pelo input/select via oninput/onchange)
───────────────────────────────────────── */
function renderTransactionList() {
  if (typeof AppController !== 'undefined') {
    AppController.applyTransactionFilters();
  }
}
