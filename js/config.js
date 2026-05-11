/* ═══════════════════════════════════════════════════════
   js/config.js — Configuração do Firebase
═══════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDJBFrih9vXdhrQx7oQHRb6Mft7XoyOGlk",
  authDomain:        "finance-ai-3e186.firebaseapp.com",
  projectId:         "finance-ai-3e186",
  storageBucket:     "finance-ai-3e186.firebasestorage.app",
  messagingSenderId: "321515412135",
  appId:             "1:321515412135:web:4b58653d2015622bb65982",
  measurementId:     "G-PMKLGGWQ1H"
};

/* ── Inicialização ── */
firebase.initializeApp(FIREBASE_CONFIG);

const Auth = firebase.auth();
const DB   = firebase.firestore();

/* ── Persistência offline do Firestore ── */
DB.enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistência offline: múltiplas abas abertas.');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistência offline não suportada neste browser.');
    }
  });

/* ── Constantes globais ── */
const DEFAULT_CATEGORIES = [
  "Alimentação", "Transporte", "Moradia", "Saúde",
  "Lazer", "Educação", "Roupas", "Assinaturas",
  "Investimentos", "Salário", "Freelance", "Outros"
];

const CATEGORY_ICONS = {
  "Alimentação":   "🍔",
  "Transporte":    "🚗",
  "Moradia":       "🏠",
  "Saúde":         "💊",
  "Lazer":         "🎮",
  "Educação":      "📚",
  "Roupas":        "👗",
  "Assinaturas":   "📦",
  "Investimentos": "📈",
  "Salário":       "💼",
  "Freelance":     "💻",
  "Outros":        "💡"
};

/* ── Utilitários de formato ── */
const fmt = {
  currency(val = 0) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL'
    }).format(val);
  },
  date(iso) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  },
  currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },
  today() {
    return new Date().toISOString().slice(0,10);
  }
};
