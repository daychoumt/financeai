/* ═══════════════════════════════════════════════════════
   js/app.js — Controlador principal (AppController)
   Orquestra Firebase, serviços e UI.
   Ponto central de estado da aplicação.
═══════════════════════════════════════════════════════ */

const AppController = (() => {

  /* ─── Estado global da aplicação ─── */
  let _state = {
    uid:           null,
    transactions:  [],
    goals:         [],
    subscriptions: [],
    snapshots:     [],
    categories:    [...DEFAULT_CATEGORIES],
    limits:        {},
    settings:      { theme: 'dark' },
    currentMonth:  fmt.currentMonth(),
  };

  /* Listeners do Firestore (para cancelar no logout) */
  let _unsubscribers = [];

  /* ─────────────────────────────────────────
     INIT — chamado após autenticação
  ───────────────────────────────────────── */
  async function init(user) {
    _state.uid         = user.uid;
    _state.currentMonth = fmt.currentMonth();

    // Inicializa o serviço de DB
    DBService.init(user.uid);

    // Expõe estado globalmente para exportação
    window._appState = _state;

    // Loading screen
    setLoadingMsg('Carregando seus dados...');

    // Mostra skeletons enquanto carrega
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.add('loading'));

    try {
      // Carrega configurações do utilizador
      const userDoc = await DBService.loadUserDoc();
      _state.categories = userDoc.categories || [...DEFAULT_CATEGORIES];
      _state.limits     = userDoc.limits     || {};
      _state.settings   = userDoc.settings   || { theme: 'dark' };

      // Aplica tema guardado
      applyTheme(_state.settings.theme || 'dark');

      // Atualiza saudação
      updateGreeting(user.displayName || user.email);

      // Popula selects de categoria
      populateCategorySelects(_state.categories);
      renderCategoryChips(_state.categories, '_deleteCategoryHandler');

      // Carrega snapshots históricos
      _state.snapshots = await DBService.loadSnapshots();

      // Define data padrão no modal de transação
      const dateInput = document.getElementById('tx-date');
      if (dateInput) dateInput.value = fmt.today();

      // Inicializa categorização automática
      if (typeof AutoCategory !== 'undefined') {
        AutoCategory.init();
      }

      // Notificações nativas desativadas (evita popup indesejado)
      // NotificationService.requestPermission();

      // Inicia listeners em tempo real
      _startListeners();

      // Esconde loading screen
      hideLoading();

      // Navega para a última página visitada
      const lastPage = localStorage.getItem('finance_last_page') || 'dashboard';
      const btn = document.querySelector(`.nav-item[data-page="${lastPage}"]`);
      navigate(lastPage, btn);

    } catch (err) {
      console.error('Erro ao inicializar app:', err);
      showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
    }
  }

  /* ─────────────────────────────────────────
     LISTENERS EM TEMPO REAL
  ───────────────────────────────────────── */
  function _startListeners() {
    // Transações do mês atual
    const unsubTx = DBService.listenTransactions(_state.currentMonth, txs => {
      _state.transactions = txs;
      _refreshAll();
    });

    // Metas
    const unsubGoals = DBService.listenGoals(goals => {
      _state.goals = goals;
      PagesService.renderGoals(goals);
      _refreshAIContext();
    });

    // Assinaturas
    const unsubSubs = DBService.listenSubscriptions(subs => {
      _state.subscriptions = subs;
      PagesService.renderSubscriptions(subs);
      _refreshAIContext();
    });

    _unsubscribers = [unsubTx, unsubGoals, unsubSubs];
  }

  /* ─────────────────────────────────────────
     REFRESH COMPLETO (chamado quando dados mudam)
  ───────────────────────────────────────── */
  function _refreshAll() {
    const txs      = _state.transactions;
    const summary  = FinanceService.calcSummary(txs);
    const catData  = FinanceService.calcByCategory(txs);
    const score    = FinanceService.calcScore(summary, _state.limits, catData, _state.goals);
    const alerts   = FinanceService.generateAlerts(summary, _state.limits, catData, _state.goals);
    const forecast = FinanceService.forecastMonth(txs);
    const flowData = FinanceService.buildFlowChartData(_state.snapshots);

    // Dashboard
    PagesService.renderDashboard(summary, catData, score, alerts, txs, _state.snapshots);

    // Transações
    applyTransactionFilters();

    // Análise
    PagesService.renderForecast(forecast);
    PagesService.renderLimits(_state.limits, catData);
    ChartsService.renderFlow(flowData);
    ChartsService.renderBalance(flowData);

    // Atualiza contexto da IA
    _refreshAIContext();
  }

  function _refreshAIContext() {
    const summary = FinanceService.calcSummary(_state.transactions);
    const catData = FinanceService.calcByCategory(_state.transactions);
    const score   = FinanceService.calcScore(summary, _state.limits, catData, _state.goals);
    const ctx = FinanceService.buildAIContext(summary, catData, score, _state.goals, _state.subscriptions);
    AIService.setContext(ctx);
  }

  /* ─────────────────────────────────────────
     FILTROS DE TRANSAÇÕES
  ───────────────────────────────────────── */
  function applyTransactionFilters() {
    const search = document.getElementById('tx-search')?.value   || '';
    const type   = document.getElementById('tx-filter-type')?.value || 'all';
    const cat    = document.getElementById('tx-filter-cat')?.value  || 'all';

    PagesService.renderTransactionList(_state.transactions, { search, type, cat });
  }

  /* ─────────────────────────────────────────
     ADICIONAR TRANSAÇÃO
  ───────────────────────────────────────── */
  async function handleAddTransaction() {
    const desc   = document.getElementById('tx-desc')?.value?.trim();
    const amount = parseFloat(document.getElementById('tx-amount')?.value);
    const type   = document.getElementById('tx-type')?.value || 'saida';
    const cat    = document.getElementById('tx-category')?.value;
    const date   = document.getElementById('tx-date')?.value || fmt.today();
    const note   = document.getElementById('tx-note')?.value?.trim();

    if (!desc)            { showToast('Insira uma descrição.',    'error'); return; }
    if (!amount || amount <= 0) { showToast('Insira um valor válido.', 'error'); return; }

    try {
      await DBService.addTransaction({ desc, amount, type, category: cat, date, note });
      closeModal('modal-add-tx');
      _clearTransactionForm();
      showToast('Transação adicionada!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar transação.', 'error');
    }
  }

  function _clearTransactionForm() {
    ['tx-desc','tx-amount','tx-note'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('tx-date').value = fmt.today();
    // Reset pill para "Saída"
    document.querySelectorAll('.pill-toggle .pill').forEach((p, i) => {
      p.classList.toggle('active', i === 0);
    });
    document.getElementById('tx-type').value = 'saida';
  }

  /* ─────────────────────────────────────────
     REMOVER TRANSAÇÃO
  ───────────────────────────────────────── */
  async function deleteTransaction(id) {
    try {
      await DBService.deleteTransaction(id);
      showToast('Transação removida.', 'info');
    } catch (err) {
      showToast('Erro ao remover transação.', 'error');
    }
  }

  /* ─────────────────────────────────────────
     LIMITES POR CATEGORIA
  ───────────────────────────────────────── */
  async function handleSetLimit() {
    const cat = document.getElementById('limit-cat-sel')?.value;
    const val = parseFloat(document.getElementById('limit-val-inp')?.value);

    if (!cat)          { showToast('Selecione uma categoria.', 'error'); return; }
    if (!val || val <= 0) { showToast('Digite um valor válido.',  'error'); return; }

    _state.limits[cat] = val;

    try {
      await DBService.updateUserDoc({ limits: _state.limits });
      document.getElementById('limit-val-inp').value = '';
      const catData = FinanceService.calcByCategory(_state.transactions);
      PagesService.renderLimits(_state.limits, catData);
      showToast(`Limite de "${cat}" definido!`, 'success');
    } catch (err) {
      showToast('Erro ao salvar limite.', 'error');
    }
  }

  async function removeLimit(cat) {
    delete _state.limits[cat];
    await DBService.updateUserDoc({ limits: _state.limits });
    const catData = FinanceService.calcByCategory(_state.transactions);
    PagesService.renderLimits(_state.limits, catData);
    showToast(`Limite de "${cat}" removido.`, 'info');
  }

  /* ─────────────────────────────────────────
     METAS
  ───────────────────────────────────────── */
  async function handleAddGoal() {
    const name   = document.getElementById('goal-name')?.value?.trim();
    const target = parseFloat(document.getElementById('goal-target')?.value);
    const saved  = parseFloat(document.getElementById('goal-saved')?.value) || 0;
    const icon   = document.getElementById('goal-icon')?.value?.trim() || '🎯';

    if (!name)             { showToast('Dê um nome para a meta.', 'error'); return; }
    if (!target || target <= 0) { showToast('Defina um valor alvo.', 'error'); return; }

    try {
      await DBService.addGoal({ name, target, saved, icon });
      closeModal('modal-add-goal');
      ['goal-name','goal-target','goal-saved','goal-icon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      showToast('Meta criada!', 'success');
    } catch (err) {
      showToast('Erro ao criar meta.', 'error');
    }
  }

  async function deleteGoal(id) {
    confirmAction('Remover esta meta permanentemente?', async () => {
      await DBService.deleteGoal(id);
      showToast('Meta removida.', 'info');
    });
  }

  async function addToGoal(id, currentSaved, target) {
    const amount = parseFloat(prompt(`Quanto depositar na meta?\n(Já guardado: ${fmt.currency(currentSaved)})`));
    if (!amount || amount <= 0) return;

    const newSaved = Math.min(currentSaved + amount, target);
    await DBService.updateGoal(id, { saved: newSaved });
    showToast(`${fmt.currency(amount)} depositado!`, 'success');
  }

  /* ─────────────────────────────────────────
     ASSINATURAS
  ───────────────────────────────────────── */
  async function handleAddSubscription() {
    const name     = document.getElementById('sub-name')?.value?.trim();
    const price    = parseFloat(document.getElementById('sub-price')?.value);
    const day      = parseInt(document.getElementById('sub-day')?.value) || 1;
    const category = document.getElementById('sub-category')?.value || 'Outros';

    if (!name)          { showToast('Dê um nome ao serviço.', 'error'); return; }
    if (!price || price <= 0) { showToast('Digite um valor válido.', 'error'); return; }

    try {
      await DBService.addSubscription({ name, price, day, category });
      closeModal('modal-add-sub');
      ['sub-name','sub-price','sub-day'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      showToast('Assinatura adicionada!', 'success');
    } catch (err) {
      showToast('Erro ao adicionar assinatura.', 'error');
    }
  }

  async function deleteSubscription(id) {
    await DBService.deleteSubscription(id);
    showToast('Assinatura removida.', 'info');
  }

  /* ─────────────────────────────────────────
     CATEGORIAS (Configurações)
  ───────────────────────────────────────── */
  async function handleAddCategory() {
    const input = document.getElementById('new-cat-input');
    const name  = input?.value?.trim();
    if (!name) return;

    if (_state.categories.includes(name)) {
      showToast('Categoria já existe.', 'error');
      return;
    }

    _state.categories.push(name);
    await DBService.updateUserDoc({ categories: _state.categories });
    populateCategorySelects(_state.categories);
    renderCategoryChips(_state.categories, '_deleteCategoryHandler');
    input.value = '';
    showToast(`Categoria "${name}" criada!`, 'success');
  }

  /* Handler de remoção de categoria (passado como string para o HTML) */
  window._deleteCategoryHandler = async function(cat) {
    const defaults = DEFAULT_CATEGORIES;
    if (defaults.includes(cat)) {
      showToast('Não é possível remover categorias padrão.', 'error');
      return;
    }

    _state.categories = _state.categories.filter(c => c !== cat);
    await DBService.updateUserDoc({ categories: _state.categories });
    populateCategorySelects(_state.categories);
    renderCategoryChips(_state.categories, '_deleteCategoryHandler');
    showToast(`Categoria "${cat}" removida.`, 'info');
  };

  /* ─────────────────────────────────────────
     LIMPAR TODOS OS DADOS
  ───────────────────────────────────────── */
  async function clearAllData() {
    try {
      await DBService.clearAllData();
      _state.transactions  = [];
      _state.goals         = [];
      _state.subscriptions = [];
      _state.snapshots     = [];
      _state.limits        = {};
      _state.categories    = [...DEFAULT_CATEGORIES];
      _refreshAll();
      showToast('Todos os dados foram apagados.', 'info');
    } catch (err) {
      showToast('Erro ao apagar dados.', 'error');
    }
  }

  /* ─────────────────────────────────────────
     DESTROY — chamado no logout
  ───────────────────────────────────────── */
  function destroy() {
    // Cancela todos os listeners do Firestore
    _unsubscribers.forEach(unsub => {
      try { unsub(); } catch(e) {}
    });
    _unsubscribers = [];

    // Destrói gráficos
    ChartsService.destroyAll();

    // Limpa histórico do chat
    AIService.clearHistory();

    // Reset do estado
    _state = {
      uid: null, transactions: [], goals: [], subscriptions: [],
      snapshots: [], categories: [...DEFAULT_CATEGORIES],
      limits: {}, settings: { theme: 'dark' }, currentMonth: fmt.currentMonth()
    };
  }

  /* ─────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────── */
  return {
    init,
    destroy,
    applyTransactionFilters,
    deleteTransaction,
    handleSetLimit,
    removeLimit,
    handleAddGoal,
    deleteGoal,
    addToGoal,
    handleAddSubscription,
    deleteSubscription,
    handleAddCategory,
    clearAllData,
  };

})();

/* ═══════════════════════════════════════════════════════
   FUNÇÕES GLOBAIS chamadas diretamente pelo HTML
═══════════════════════════════════════════════════════ */

function handleAddTransaction()  { AppController.handleAddTransaction?.() || AppController.init; }
function handleSetLimit()        { AppController.handleSetLimit(); }
function handleAddGoal()         { AppController.handleAddGoal(); }
function handleAddSubscription() { AppController.handleAddSubscription(); }
function handleAddCategory()     { AppController.handleAddCategory(); }
function clearAllData()          { AppController.clearAllData(); }

// Expõe método interno para evitar erro de referência circular
AppController.handleAddTransaction = function() {
  // Lê os campos do modal e adiciona via DBService
  const desc   = document.getElementById('tx-desc')?.value?.trim();
  const amount = parseFloat(document.getElementById('tx-amount')?.value);
  const type   = document.getElementById('tx-type')?.value || 'saida';
  const cat    = document.getElementById('tx-category')?.value;
  const date   = document.getElementById('tx-date')?.value || fmt.today();
  const note   = document.getElementById('tx-note')?.value?.trim();

  if (!desc)                { showToast('Insira uma descrição.',    'error'); return; }
  if (!amount || amount <= 0) { showToast('Insira um valor válido.', 'error'); return; }

  DBService.addTransaction({ desc, amount, type, category: cat, date, note })
    .then(() => {
      closeModal('modal-add-tx');
      ['tx-desc','tx-amount','tx-note'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('tx-date').value = fmt.today();
      document.querySelectorAll('.pill-toggle .pill').forEach((p,i) => p.classList.toggle('active', i===0));
      document.getElementById('tx-type').value = 'saida';
      showToast('Transação adicionada!', 'success');
    })
    .catch(() => showToast('Erro ao salvar transação.', 'error'));
};

/* ═══════════════════════════════════════════════════════
   FUNÇÕES GLOBAIS — Exportação, Importação, Loading
═══════════════════════════════════════════════════════ */

/* ── LOADING SCREEN ── */
function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.style.display = 'none', 400);
}

function setLoadingMsg(msg) {
  const el = document.getElementById('loading-msg');
  if (el) el.textContent = msg;
}

/* ── EXPORTAR CSV ── */
function handleExportCSV() {
  if (typeof ExportService === 'undefined') return;
  const txs   = window._appState?.transactions || [];
  const month = window._appState?.currentMonth || fmt.currentMonth();
  ExportService.exportCSV(txs, `transacoes-${month}.csv`);
}

/* ── EXPORTAR PDF ── */
function handleExportPDF() {
  if (typeof ExportService === 'undefined') return;
  const state   = window._appState || {};
  const txs     = state.transactions || [];
  const summary = FinanceService.calcSummary(txs);
  const catData = FinanceService.calcByCategory(txs);
  const score   = FinanceService.calcScore(summary, state.limits || {}, catData, state.goals || []);
  const user    = Auth.currentUser;

  ExportService.exportPDF({
    summary,
    catData,
    transactions: txs,
    score,
    month:    state.currentMonth,
    userName: user?.displayName || user?.email || ''
  });
}

/* ── IMPORTAR CSV ── */
function handleImportCSV() {
  document.getElementById('csv-file-input')?.click();
}

async function handleCSVFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const text = e.target.result;
    const txs  = ExportService.parseCSV(text);

    if (!txs.length) {
      showToast('Nenhuma transação encontrada no CSV.', 'error');
      return;
    }

    showToast(`Importando ${txs.length} transações...`, 'info');

    let count = 0;
    for (const tx of txs) {
      try {
        await DBService.addTransaction(tx);
        count++;
      } catch(e) { /* ignora linhas inválidas */ }
    }

    showToast(`${count} transações importadas!`, 'success');
    event.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

/* ── FILTRO POR DATA nas transações ── */
// Sobrescreve applyTransactionFilters para incluir filtro de data
const _originalApplyFilters = AppController.applyTransactionFilters?.bind(AppController);
AppController.applyTransactionFilters = function() {
  const search   = document.getElementById('tx-search')?.value   || '';
  const type     = document.getElementById('tx-filter-type')?.value || 'all';
  const cat      = document.getElementById('tx-filter-cat')?.value  || 'all';
  const dateFrom = document.getElementById('tx-filter-date-from')?.value || '';
  const dateTo   = document.getElementById('tx-filter-date-to')?.value   || '';

  PagesService.renderTransactionList(
    window._appState?.transactions || [],
    { search, type, cat, dateFrom, dateTo }
  );
};
