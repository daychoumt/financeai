/* ═══════════════════════════════════════════════════════
   js/services/export.js — Exportação de dados
   CSV e relatório mensal em PDF (via HTML print)
═══════════════════════════════════════════════════════ */

const ExportService = (() => {

  /* ─────────────────────────────────────────
     EXPORTAR TRANSAÇÕES EM CSV
  ───────────────────────────────────────── */
  function exportCSV(transactions = [], filename = 'transacoes.csv') {
    if (!transactions.length) {
      showToast('Nenhuma transação para exportar.', 'error');
      return;
    }

    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor (R$)', 'Nota'];

    const rows = transactions.map(tx => [
      tx.date        || '',
      `"${(tx.desc     || '').replace(/"/g, '""')}"`,
      tx.type === 'entrada' ? 'Entrada' : 'Saída',
      tx.category    || '',
      Number(tx.amount).toFixed(2).replace('.', ','),
      `"${(tx.note     || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const bom = '\uFEFF'; // BOM para Excel reconhecer UTF-8

    _download(bom + csv, filename, 'text/csv;charset=utf-8');
    showToast('CSV exportado com sucesso!', 'success');
  }

  /* ─────────────────────────────────────────
     EXPORTAR RELATÓRIO MENSAL EM PDF
     (abre janela de impressão do navegador)
  ───────────────────────────────────────── */
  function exportPDF(data = {}) {
    const { summary, catData, transactions, score, month, userName } = data;

    const monthLabel = month
      ? new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : 'Mês atual';

    const catRows = Object.entries(catData || {})
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => `
        <tr>
          <td>${cat}</td>
          <td style="text-align:right;color:#ef4444">${fmt.currency(val)}</td>
        </tr>`).join('');

    const txRows = (transactions || []).slice(0, 20).map(tx => `
      <tr>
        <td>${tx.date || ''}</td>
        <td>${tx.desc || ''}</td>
        <td>${tx.category || ''}</td>
        <td style="text-align:right;color:${tx.type === 'entrada' ? '#22c55e' : '#ef4444'}">
          ${tx.type === 'entrada' ? '+' : '-'}${fmt.currency(tx.amount)}
        </td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Finance AI — ${monthLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #6c63ff; }
    .logo { font-size: 24px; font-weight: 900; color: #6c63ff; }
    .period { font-size: 13px; color: #666; }
    .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #f8f8fc; border-radius: 10px; padding: 14px; border-left: 3px solid #6c63ff; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 4px; }
    .kpi-value { font-size: 18px; font-weight: 700; }
    .kpi-income .kpi-value  { color: #22c55e; }
    .kpi-expense .kpi-value { color: #ef4444; }
    .kpi-balance .kpi-value { color: #3b82f6; }
    .kpi-score .kpi-value   { color: #6c63ff; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f8; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; }
    td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">◈ FinanceAI</div>
    <div class="period">
      <strong>Relatório de ${monthLabel}</strong><br>
      ${userName || ''} • Gerado em ${new Date().toLocaleDateString('pt-BR')}
    </div>
  </div>

  <div class="kpis">
    <div class="kpi kpi-income">
      <div class="kpi-label">Receita</div>
      <div class="kpi-value">${fmt.currency(summary?.income || 0)}</div>
    </div>
    <div class="kpi kpi-expense">
      <div class="kpi-label">Gastos</div>
      <div class="kpi-value">${fmt.currency(summary?.expense || 0)}</div>
    </div>
    <div class="kpi kpi-balance">
      <div class="kpi-label">Saldo</div>
      <div class="kpi-value">${fmt.currency(summary?.balance || 0)}</div>
    </div>
    <div class="kpi kpi-score">
      <div class="kpi-label">Score</div>
      <div class="kpi-value">${score || 0}/100</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Gastos por Categoria</div>
    <table>
      <thead><tr><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${catRows || '<tr><td colspan="2" style="text-align:center;color:#999">Sem dados</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Transações do Mês (últimas 20)</div>
    <table>
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${txRows || '<tr><td colspan="4" style="text-align:center;color:#999">Sem transações</td></tr>'}</tbody>
    </table>
  </div>

  <div class="footer">Finance AI — Relatório gerado automaticamente</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    showToast('Relatório aberto para impressão!', 'success');
  }

  /* ─────────────────────────────────────────
     IMPORTAR CSV DO BANCO
  ───────────────────────────────────────── */
  function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const transactions = [];

    lines.slice(1).forEach(line => {
      const cols = line.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g, ''));
      if (!cols[0] || !cols[2]) return;

      // Tenta detectar formato: Data, Desc, Valor, Tipo
      const amount = parseFloat(cols[2].replace(',', '.').replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount === 0) return;

      transactions.push({
        date:     _parseDate(cols[0]),
        desc:     cols[1] || 'Importado',
        amount:   Math.abs(amount),
        type:     amount < 0 ? 'saida' : 'entrada',
        category: 'Outros',
        note:     'Importado via CSV'
      });
    });

    return transactions;
  }

  function _parseDate(str) {
    if (!str) return fmt.today();
    // Suporta DD/MM/YYYY e YYYY-MM-DD
    if (str.includes('/')) {
      const [d, m, y] = str.split('/');
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    return str.slice(0, 10);
  }

  /* ─────────────────────────────────────────
     HELPER: DOWNLOAD
  ───────────────────────────────────────── */
  function _download(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { exportCSV, exportPDF, parseCSV };

})();
