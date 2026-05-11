/* ═══════════════════════════════════════════════════════
   js/services/db.js — Serviço de acesso ao Firestore
   Todas as operações de leitura/escrita passam por aqui.
   Cada utilizador tem a sua própria sub-coleção isolada.
═══════════════════════════════════════════════════════ */

const DBService = (() => {

  let _uid = null; // UID do utilizador atual

  /* ─── Referências de coleções ─── */
  const col = {
    user:          () => DB.collection('users').doc(_uid),
    transactions:  () => DB.collection('users').doc(_uid).collection('transactions'),
    goals:         () => DB.collection('users').doc(_uid).collection('goals'),
    subscriptions: () => DB.collection('users').doc(_uid).collection('subscriptions'),
    snapshots:     () => DB.collection('users').doc(_uid).collection('snapshots'),
  };

  /* ─────────────────────────────────────────
     INIT — define o UID do utilizador
  ───────────────────────────────────────── */
  function init(uid) {
    _uid = uid;
  }

  /* ─────────────────────────────────────────
     PERFIL / CONFIGURAÇÕES
  ───────────────────────────────────────── */

  /** Carrega o documento do utilizador (settings, categories, limits) */
  async function loadUserDoc() {
    const snap = await col.user().get();
    if (snap.exists) return snap.data();

    // Cria documento padrão se não existir (ex: login Google na 1ª vez)
    const defaultDoc = {
      name:       Auth.currentUser?.displayName || '',
      email:      Auth.currentUser?.email || '',
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      categories: [...DEFAULT_CATEGORIES],
      limits:     {},
      settings:   { theme: 'dark' }
    };
    await col.user().set(defaultDoc);
    return defaultDoc;
  }

  /** Atualiza campos do documento do utilizador */
  async function updateUserDoc(data) {
    await col.user().set(data, { merge: true });
  }

  /* ─────────────────────────────────────────
     TRANSAÇÕES
  ───────────────────────────────────────── */

  /**
   * Adiciona uma nova transação.
   * @param {Object} tx - { desc, amount, type, category, date, note, recurring }
   * @returns {string} ID do documento criado
   */
  async function addTransaction(tx) {
    const ref = await col.transactions().add({
      ...tx,
      amount:    Number(tx.amount),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  /**
   * Remove uma transação pelo ID.
   */
  async function deleteTransaction(id) {
    await col.transactions().doc(id).delete();
  }

  /**
   * Carrega transações do mês atual (YYYY-MM).
   * @param {string} month - Formato "YYYY-MM"
   */
  async function loadTransactionsByMonth(month) {
    const snap = await col.transactions()
      .where('date', '>=', `${month}-01`)
      .where('date', '<=', `${month}-31`)
      .orderBy('date', 'desc')
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Carrega TODAS as transações (para análise histórica).
   * Limitado a 500 para performance.
   */
  async function loadAllTransactions() {
    const snap = await col.transactions()
      .orderBy('date', 'desc')
      .limit(500)
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Listener em tempo real para transações do mês.
   * @param {string} month
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  function listenTransactions(month, callback) {
    return col.transactions()
      .where('date', '>=', `${month}-01`)
      .where('date', '<=', `${month}-31`)
      .orderBy('date', 'desc')
      .onSnapshot(snap => {
        const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(txs);
      }, err => {
        console.error('Listener de transações:', err);
      });
  }

  /* ─────────────────────────────────────────
     METAS
  ───────────────────────────────────────── */

  async function addGoal(goal) {
    const ref = await col.goals().add({
      ...goal,
      target:    Number(goal.target),
      saved:     Number(goal.saved || 0),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function updateGoal(id, data) {
    await col.goals().doc(id).update(data);
  }

  async function deleteGoal(id) {
    await col.goals().doc(id).delete();
  }

  function listenGoals(callback) {
    return col.goals()
      .orderBy('createdAt', 'desc')
      .onSnapshot(snap => {
        const goals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(goals);
      });
  }

  /* ─────────────────────────────────────────
     ASSINATURAS
  ───────────────────────────────────────── */

  async function addSubscription(sub) {
    const ref = await col.subscriptions().add({
      ...sub,
      price:     Number(sub.price),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function deleteSubscription(id) {
    await col.subscriptions().doc(id).delete();
  }

  function listenSubscriptions(callback) {
    return col.subscriptions()
      .orderBy('name')
      .onSnapshot(snap => {
        const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(subs);
      });
  }

  /* ─────────────────────────────────────────
     SNAPSHOTS MENSAIS (histórico)
  ───────────────────────────────────────── */

  async function saveMonthSnapshot(month, data) {
    await col.snapshots().doc(month).set({
      ...data,
      month,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function loadSnapshots() {
    const snap = await col.snapshots()
      .orderBy('month', 'desc')
      .limit(12)
      .get();
    return snap.docs.map(d => d.data());
  }

  /* ─────────────────────────────────────────
     LIMPAR TUDO (zona de risco)
  ───────────────────────────────────────── */

  async function clearAllData() {
    // Apaga todas as sub-coleções em batch
    const collections = [
      col.transactions(), col.goals(),
      col.subscriptions(), col.snapshots()
    ];

    for (const ref of collections) {
      const snap = await ref.get();
      const batch = DB.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if (snap.docs.length > 0) await batch.commit();
    }

    // Reseta o documento do utilizador
    await col.user().update({
      limits: {},
      categories: [...DEFAULT_CATEGORIES]
    });
  }

  /* ─────────────────────────────────────────
     API PÚBLICA
  ───────────────────────────────────────── */
  return {
    init,
    loadUserDoc,
    updateUserDoc,
    addTransaction,
    deleteTransaction,
    loadTransactionsByMonth,
    loadAllTransactions,
    listenTransactions,
    addGoal,
    updateGoal,
    deleteGoal,
    listenGoals,
    addSubscription,
    deleteSubscription,
    listenSubscriptions,
    saveMonthSnapshot,
    loadSnapshots,
    clearAllData
  };

})();
