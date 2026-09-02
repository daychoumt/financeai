/* ═══════════════════════════════════════════════════════
   js/services/finance.js — Lógica de negócio financeiro
   Cálculos puros: sem DOM, sem Firebase. Só matemática.
═══════════════════════════════════════════════════════ */

const FinanceService = (() => {

  // Converte cada lançamento antes de somar: 0,10 + 0,20 vira 10 + 20.
  // Dados legados inválidos não devem tornar todo o resumo NaN/Infinity.
  function toCents(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return 0;
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    // Deslocamento decimal evita arredondar 10.075 * 100 como 1007.499…
    const [coefficient, exponent = '0'] = amount.toString().split('e');
    const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
    return Number.isSafeInteger(cents) ? cents : 0;
  }

  function addCents(total, cents) {
    const next = total + cents;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError('Total acima do limite de precisão monetária.');
    }
    return next;
  }

  /* ─────────────────────────────────────────
     RESUMO MENSAL
  ───────────────────────────────────────── */

  /**
   * Calcula receita, despesa e saldo de uma lista de transações.
   * @param {Array} txs
   * @returns {{ income, expense, balance }}
   */
  function calcSummary(txs = []) {
    let income = 0, expense = 0;
    txs.forEach(t => {
      if (t.type === 'entrada') income = addCents(income, toCents(t.amount));
      if (t.type === 'saida') expense = addCents(expense, toCents(t.amount));
    });
    return { income: income / 100, expense: expense / 100, balance: (income - expense) / 100 };
  }

  /* ─────────────────────────────────────────
     GASTOS POR CATEGORIA
  ───────────────────────────────────────── */

  /**
   * Agrupa transações de saída por categoria.
   * @returns {{ [cat]: number }}
   */
  function calcByCategory(txs = []) {
    const totals = new Map();
    txs.filter(t => t.type === 'saida').forEach(t => {
      const category = t.category || 'Outros';
      totals.set(category, addCents(totals.get(category) || 0, toCents(t.amount)));
    });
    return Object.fromEntries([...totals].map(([category, cents]) => [category, cents / 100]));
  }

  /* ─────────────────────────────────────────
     SCORE FINANCEIRO (0–100)
  ───────────────────────────────────────── */

  /**
   * Calcula um score de saúde financeira.
   * Pesos: saldo, ratio despesa/receita, metas, limites.
   */
  function calcScore(summary, limits = {}, cats = {}, goals = []) {
    let score = 100;

    // Saldo negativo: grande penalidade
    if (summary.balance < 0) score -= 40;

    // Ratio gasto/receita
    if (summary.income > 0) {
      const ratio = summary.expense / summary.income;
      if (ratio > 1)    score -= 30;
      else if (ratio > 0.85) score -= 20;
      else if (ratio > 0.70) score -= 10;
      else if (ratio > 0.50) score -=  5;
    }

    // Sem receita registrada
    if (summary.income === 0 && summary.expense > 0) score -= 20;

    // Limites ultrapassados
    Object.entries(cats).forEach(([cat, spent]) => {
      const lim = limits[cat];
      if (lim && spent > lim) score -= 8;
    });

    // Bônus: tem metas definidas
    if (goals.length > 0) score += 5;

    // Bônus: tem limites definidos
    if (Object.keys(limits).length > 0) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /* ─────────────────────────────────────────
     ALERTAS AUTOMÁTICOS
  ───────────────────────────────────────── */

  /**
   * Gera alertas com base na situação financeira.
   * @returns {Array<{ type: 'danger'|'warning'|'info'|'success', msg: string }>}
   */
  function generateAlerts(summary, limits, cats, goals) {
    const alerts = [];

    if (summary.balance < 0) {
      alerts.push({ type: 'danger', msg: '🚨 Saldo negativo! Seus gastos ultrapassaram sua renda este mês.' });
    }

    if (summary.income > 0 && summary.expense / summary.income > 0.85) {
      alerts.push({ type: 'warning', msg: '⚠️ Você está usando mais de 85% da sua renda em gastos.' });
    }

    if (summary.income === 0 && summary.expense > 0) {
      alerts.push({ type: 'warning', msg: '💡 Nenhuma receita registrada ainda neste mês.' });
    }

    // Limites próximos ou ultrapassados
    Object.entries(cats).forEach(([cat, spent]) => {
      const lim = limits[cat];
      if (!lim) return;
      const pct = spent / lim;
      if (pct > 1) {
        alerts.push({ type: 'danger', msg: `🚫 Limite de "${cat}" ultrapassado (${fmt.currency(spent)} / ${fmt.currency(lim)})` });
      } else if (pct > 0.75) {
        alerts.push({ type: 'warning', msg: `⚠️ "${cat}" está em ${Math.round(pct*100)}% do limite.` });
      }
    });

    // Metas próximas do prazo
    goals.forEach(g => {
      const pct = (g.saved || 0) / g.target;
      if (pct >= 1) {
        alerts.push({ type: 'success', msg: `🎉 Meta "${g.name}" concluída! Parabéns!` });
      }
    });

    if (summary.balance > 0 && summary.income > 0 && summary.expense / summary.income < 0.6) {
      alerts.push({ type: 'success', msg: `✅ Ótimo controle! Você poupou ${fmt.currency(summary.balance)} este mês.` });
    }

    return alerts;
  }

  /* ─────────────────────────────────────────
     PREVISÃO DO MÊS
  ───────────────────────────────────────── */

  /**
   * Prevê os gastos totais do mês com base no histórico até hoje.
   */
  function forecastMonth(txs = []) {
    const today    = new Date();
    const dayPassed = today.getDate();
    const daysTotal = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    const totalSpent = calcSummary(txs).expense;

    if (dayPassed === 0) return null;

    const dailyAvg     = totalSpent / dayPassed;
    const forecastTotal = dailyAvg * daysTotal;
    const remaining     = forecastTotal - totalSpent;

    return {
      totalSpent,
      dailyAvg,
      forecastTotal,
      remaining,
      dayPassed,
      daysTotal,
      daysLeft: daysTotal - dayPassed
    };
  }

  /* ─────────────────────────────────────────
     FLUXO HISTÓRICO (últimos 6 meses)
  ───────────────────────────────────────── */

  /**
   * Organiza snapshots históricos num formato pronto para gráfico.
   * @param {Array} snapshots - array de { month, income, expense, balance }
   */
  function buildFlowChartData(snapshots = []) {
    const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    return {
      labels:   sorted.map(s => {
        const [y, m] = s.month.split('-');
        return new Date(y, m-1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }),
      incomes:  sorted.map(s => s.income  || 0),
      expenses: sorted.map(s => s.expense || 0),
      balances: sorted.map(s => s.balance || 0),
    };
  }

  /* ─────────────────────────────────────────
     SUGESTÕES PARA O CHATBOT
  ───────────────────────────────────────── */

  /**
   * Gera um contexto financeiro formatado para enviar à IA.
   */
  function buildAIContext(summary, cats, score, goals, subs) {
    const catLines = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c, v]) => `  - ${c}: ${fmt.currency(v)}`)
      .join('\n');

    const goalsLines = goals.map(g =>
      `  - ${g.name}: ${fmt.currency(g.saved)} / ${fmt.currency(g.target)}`
    ).join('\n');

    const subsTotal = subs.reduce((total, sub) => addCents(total, toCents(sub.price)), 0) / 100;

    return `
DADOS FINANCEIROS DO UTILIZADOR (mês atual):
- Receita total: ${fmt.currency(summary.income)}
- Gastos totais: ${fmt.currency(summary.expense)}
- Saldo: ${fmt.currency(summary.balance)}
- Score de saúde financeira: ${score}/100

Top categorias de gasto:
${catLines || '  (sem dados)'}

Metas:
${goalsLines || '  (nenhuma meta)'}

Assinaturas mensais: ${fmt.currency(subsTotal)}
`;
  }

  /* ─────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────── */
  return {
    calcSummary,
    calcByCategory,
    calcScore,
    generateAlerts,
    forecastMonth,
    buildFlowChartData,
    buildAIContext
  };

})();
