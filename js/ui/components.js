/* ═══════════════════════════════════════════════════════
   js/ui/components.js — Componentes de interface reutilizáveis
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   TOAST (notificações)
───────────────────────────────────────── */

let _toastTimeout = null;

/**
 * Exibe uma notificação toast.
 * @param {string} msg
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms
 */
function showToast(msg, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Ícone por tipo
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  toast.textContent  = `${icons[type] || ''} ${msg}`;
  toast.className    = `toast toast--${type}`;
  toast.hidden       = false;

  // Auto-fechar
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

/* ─────────────────────────────────────────
   MODAIS
───────────────────────────────────────── */

function openModal(id) {
  // Fecha qualquer outro modal aberto primeiro
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.style.display = 'none';
  });

  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'flex';

  // Foco no primeiro input
  setTimeout(() => {
    modal.querySelector('input, select')?.focus();
  }, 50);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = 'none';
}

function closeModalOutside(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

/* ─────────────────────────────────────────
   CONFIRM DIALOG CUSTOMIZADO
───────────────────────────────────────── */

function confirmAction(msg, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  const msgEl   = document.getElementById('confirm-msg');
  const okBtn   = document.getElementById('confirm-ok-btn');
  if (!overlay || !msgEl || !okBtn) return;

  msgEl.textContent = msg;
  overlay.hidden    = false;
  overlay.style.display = 'flex';

  // Remove listener anterior e adiciona novo
  okBtn.replaceWith(okBtn.cloneNode(true));
  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    closeConfirm();
    onConfirm();
  });
}

function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.style.display = 'none';
}

/* ─────────────────────────────────────────
   TEMA (dark/light)
───────────────────────────────────────── */

function toggleTheme() {
  const html    = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';

  html.setAttribute('data-theme', next);
  localStorage.setItem('finance_theme', next);

  // Sincroniza toggle de configurações
  const toggle = document.getElementById('toggle-dark');
  if (toggle) toggle.checked = (next === 'dark');

  // Persiste preferência no Firestore se utilizador logado
  const user = Auth.currentUser;
  if (user) {
    DBService.updateUserDoc({ 'settings.theme': next }).catch(() => {});
  }
}

/** Aplica o tema guardado (chamado na inicialização) */
function applyTheme(theme = 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('toggle-dark');
  if (toggle) toggle.checked = (theme === 'dark');
}

/* ─────────────────────────────────────────
   SIDEBAR (mobile)
───────────────────────────────────────── */

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ─────────────────────────────────────────
   NAVEGAÇÃO ENTRE PÁGINAS
───────────────────────────────────────── */

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  transactions:  'Transações',
  analysis:      'Análise',
  goals:         'Metas',
  subscriptions: 'Assinaturas',
  ai:            'Assistente IA',
  settings:      'Configurações'
};

function navigate(pageId, btn) {
  // Esconde todas as páginas
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Mostra a página selecionada
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Atualiza botões de nav (sidebar + bottom)
  document.querySelectorAll('.nav-item, .bnav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(b => b.classList.add('active'));

  // Atualiza título na topbar
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || pageId;

  // Fecha sidebar mobile
  closeSidebar();

  // Guarda última página
  localStorage.setItem('finance_last_page', pageId);
}

/* ─────────────────────────────────────────
   PILL TOGGLE (entrada/saída)
───────────────────────────────────────── */

function selectPill(btn, hiddenId) {
  const wrap = btn.closest('.pill-toggle');
  wrap.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  const hidden = document.getElementById(hiddenId);
  if (hidden) hidden.value = btn.dataset.val;
}

/* ─────────────────────────────────────────
   POPULANDO SELECTS DE CATEGORIAS
───────────────────────────────────────── */

/**
 * Preenche todos os <select> de categoria com as categorias atuais.
 * @param {Array<string>} categories
 */
function populateCategorySelects(categories = []) {
  const ids = ['tx-category', 'limit-cat-sel', 'tx-filter-cat'];

  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;

    const current = sel.value; // preserva seleção atual

    // Opção padrão (filtro)
    if (id === 'tx-filter-cat') {
      sel.innerHTML = '<option value="all">Categorias</option>';
    } else {
      sel.innerHTML = '';
    }

    categories.forEach(cat => {
      const opt  = document.createElement('option');
      opt.value  = cat;
      opt.textContent = `${CATEGORY_ICONS[cat] || '📌'} ${cat}`;
      sel.appendChild(opt);
    });

    if (current) sel.value = current;
  });
}

/* ─────────────────────────────────────────
   CHIPS DE CATEGORIAS (Configurações)
───────────────────────────────────────── */

function renderCategoryChips(categories, onDelete) {
  const wrap = document.getElementById('cat-chips');
  if (!wrap) return;
  wrap.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const icon = CATEGORY_ICONS[cat] || '📌';
    chip.innerHTML = `
      <span>${icon} ${cat}</span>
      <button class="chip-del" title="Remover" onclick="(${onDelete.toString()})('${cat}')">×</button>
    `;

    wrap.appendChild(chip);
  });
}

/* ─────────────────────────────────────────
   GREETING DINÂMICO
───────────────────────────────────────── */

function updateGreeting(userName) {
  const hour = new Date().getHours();
  let greeting = 'Boa noite';
  if (hour >= 5  && hour < 12) greeting = 'Bom dia';
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde';

  const title = document.getElementById('greeting-title');
  const sub   = document.getElementById('greeting-sub');

  const firstName = (userName || 'visitante').split(' ')[0];
  if (title) title.textContent = `${greeting}, ${firstName} 👋`;
  if (sub)   sub.textContent   = `Aqui está seu resumo de ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`;
}

/* ─────────────────────────────────────────
   TECLA ESC FECHA MODAIS
───────────────────────────────────────── */

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  ['modal-add-tx', 'modal-add-goal', 'modal-add-sub', 'confirm-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.style.display === 'flex') {
      el.style.display = 'none';
    }
  });
});
