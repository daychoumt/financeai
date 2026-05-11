/* ═══════════════════════════════════════════════════════
   js/ui/charts.js — Gráficos com Chart.js
═══════════════════════════════════════════════════════ */

const ChartsService = (() => {

  /* Instâncias dos gráficos (para destruir antes de recriar) */
  let _charts = {};

  /* Tema atual */
  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function textColor()   { return isDark() ? 'rgba(160,160,184,0.8)' : 'rgba(74,74,106,0.8)'; }
  function gridColor()   { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'; }

  /* Destrói uma instância antes de recriar */
  function destroyChart(key) {
    if (_charts[key]) {
      _charts[key].destroy();
      delete _charts[key];
    }
  }

  /* Destrói todos os gráficos */
  function destroyAll() {
    Object.keys(_charts).forEach(key => {
      _charts[key]?.destroy();
    });
    _charts = {};
  }

  /* ─────────────────────────────────────────
     GRÁFICO: GASTOS POR CATEGORIA (Doughnut)
  ───────────────────────────────────────── */
  function renderCategory(catData = {}) {
    const canvas = document.getElementById('chart-category');
    if (!canvas) return;
    destroyChart('category');

    const entries = Object.entries(catData).sort((a, b) => b[1] - a[1]).slice(0, 8);

    if (!entries.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state-sm">Sem gastos este mês</div>';
      return;
    }

    const palette = [
      '#6c63ff','#3b82f6','#22c55e','#f59e0b',
      '#ef4444','#ec4899','#14b8a6','#8b5cf6'
    ];

    _charts['category'] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels:   entries.map(([c]) => c),
        datasets: [{
          data:            entries.map(([,v]) => v),
          backgroundColor: palette,
          borderColor:     isDark() ? '#16161f' : '#ffffff',
          borderWidth:     3,
          hoverBorderWidth: 4,
          hoverOffset:     6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color:     textColor(),
              font:      { size: 12, family: "'DM Sans', sans-serif" },
              padding:   12,
              boxWidth:  12,
              boxHeight: 12,
              borderRadius: 4,
              usePointStyle: true,
            }
          },
          tooltip: {
            backgroundColor: isDark() ? '#1e1e2a' : '#fff',
            titleColor:      isDark() ? '#f0f0f8' : '#0f0f1a',
            bodyColor:       isDark() ? '#a0a0b8' : '#4a4a6a',
            borderColor:     isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth:     1,
            padding:         10,
            callbacks: {
              label: ctx => ` ${fmt.currency(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  /* ─────────────────────────────────────────
     GRÁFICO: FLUXO MENSAL (Bar)
  ───────────────────────────────────────── */
  function renderFlow(flowData = {}) {
    const canvas = document.getElementById('chart-flow');
    if (!canvas) return;
    destroyChart('flow');

    const { labels = [], incomes = [], expenses = [] } = flowData;

    if (!labels.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state-sm">Histórico insuficiente</div>';
      return;
    }

    _charts['flow'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           'Receita',
            data:            incomes,
            backgroundColor: 'rgba(34,197,94,0.7)',
            borderRadius:    6,
            borderSkipped:   false,
          },
          {
            label:           'Gastos',
            data:            expenses,
            backgroundColor: 'rgba(239,68,68,0.7)',
            borderRadius:    6,
            borderSkipped:   false,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: textColor(),
              font:  { size: 12, family: "'DM Sans', sans-serif" },
              usePointStyle: true,
              pointStyle: 'rect',
            }
          },
          tooltip: {
            backgroundColor: isDark() ? '#1e1e2a' : '#fff',
            titleColor:      isDark() ? '#f0f0f8' : '#0f0f1a',
            bodyColor:       isDark() ? '#a0a0b8' : '#4a4a6a',
            borderColor:     isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth:     1,
            padding:         10,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid:   { display: false },
            ticks:  { color: textColor(), font: { size: 11 } },
          },
          y: {
            grid:   { color: gridColor(), drawBorder: false },
            ticks:  {
              color: textColor(),
              font:  { size: 11 },
              callback: v => `R$${(v/1000).toFixed(0)}k`
            },
            border: { display: false }
          }
        }
      }
    });
  }

  /* ─────────────────────────────────────────
     GRÁFICO: EVOLUÇÃO DO SALDO (Line)
  ───────────────────────────────────────── */
  function renderBalance(flowData = {}) {
    const canvas = document.getElementById('chart-balance');
    if (!canvas) return;
    destroyChart('balance');

    const { labels = [], balances = [] } = flowData;

    if (!labels.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state-sm">Histórico insuficiente</div>';
      return;
    }

    _charts['balance'] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:           'Saldo',
          data:            balances,
          borderColor:     '#6c63ff',
          backgroundColor: 'rgba(108,99,255,0.10)',
          borderWidth:     2.5,
          fill:            true,
          tension:         0.4,
          pointBackgroundColor: '#6c63ff',
          pointBorderColor:    isDark() ? '#16161f' : '#fff',
          pointBorderWidth:    2,
          pointRadius:         5,
          pointHoverRadius:    7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark() ? '#1e1e2a' : '#fff',
            titleColor:      isDark() ? '#f0f0f8' : '#0f0f1a',
            bodyColor:       isDark() ? '#a0a0b8' : '#4a4a6a',
            borderColor:     isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth:     1,
            padding:         10,
            callbacks: {
              label: ctx => ` Saldo: ${fmt.currency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: { color: textColor(), font: { size: 11 } }
          },
          y: {
            grid:  { color: gridColor(), drawBorder: false },
            ticks: {
              color: textColor(),
              font:  { size: 11 },
              callback: v => `R$${(v/1000).toFixed(0)}k`
            },
            border: { display: false }
          }
        }
      }
    });
  }

  return {
    renderCategory,
    renderFlow,
    renderBalance,
    destroyAll
  };

})();
