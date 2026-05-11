/* ═══════════════════════════════════════════════════════
   js/auth/auth.js — Autenticação completa
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────
   OBSERVER — espera o DOM estar pronto antes de agir
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  Auth.onAuthStateChanged(user => {
    if (user) {
      showApp(user);
    } else {
      showAuthScreen();
    }
  });

  /* Enter nos campos */
  ['login-email','login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
  });

  ['reg-name','reg-email','reg-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleRegister();
    });
  });

  document.getElementById('forgot-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleForgot();
  });

});

/* ─────────────────────────────────────────
   MOSTRAR / ESCONDER ECRÃS
───────────────────────────────────────── */
function showApp(user) {
  // Força a transição de tela
  const authScreen = document.getElementById('auth-screen');
  const appScreen  = document.getElementById('app-screen');

  if (authScreen) { authScreen.hidden = true; authScreen.style.display = 'none'; }
  if (appScreen)  { appScreen.hidden  = false; appScreen.style.display = 'flex'; }

  const name    = user.displayName || user.email.split('@')[0];
  const email   = user.email;
  const initial = name.charAt(0).toUpperCase();

  const nameEl   = document.getElementById('user-name-sidebar');
  const emailEl  = document.getElementById('user-email-sidebar');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl)   nameEl.textContent   = name;
  if (emailEl)  emailEl.textContent  = email;
  if (avatarEl) avatarEl.textContent = initial;

  const nameInput  = document.getElementById('settings-name');
  const emailInput = document.getElementById('settings-email');
  if (nameInput)  nameInput.value  = name;
  if (emailInput) emailInput.value = email;

  if (typeof AppController !== 'undefined') {
    AppController.init(user);
  }
}

function showAuthScreen() {
  // Esconde loading
  if (typeof hideLoading === 'function') hideLoading();

  document.getElementById('auth-screen').hidden = false;
  document.getElementById('app-screen').hidden  = true;
}

/* ─────────────────────────────────────────
   NAVEGAÇÃO ENTRE PAINÉIS
───────────────────────────────────────── */
function showPanel(name) {
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`panel-${name}`);
  if (target) target.classList.add('active');
  clearAuthErrors();
}

function clearAuthErrors() {
  ['login-error','reg-error','forgot-error','forgot-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

/* ─────────────────────────────────────────
   MOSTRAR / ESCONDER SENHA
───────────────────────────────────────── */
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type     = isHidden ? 'text' : 'password';
  btn.style.opacity = isHidden ? '1' : '0.5';
}

/* ─────────────────────────────────────────
   LOADING NOS BOTÕES
───────────────────────────────────────── */
function setAuthLoading(btnId, loading) {
  const btn     = document.getElementById(btnId);
  if (!btn) return;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  btn.disabled  = loading;
  btn.classList.toggle('loading', loading);
  if (label)   label.hidden   = loading;
  if (spinner) spinner.hidden = !loading;
}

function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

/* ─────────────────────────────────────────
   TRADUÇÃO DE ERROS FIREBASE
───────────────────────────────────────── */
function translateFirebaseError(code) {
  const map = {
    'auth/user-not-found':         'Conta não encontrada com este email.',
    'auth/wrong-password':         'Senha incorreta. Tente novamente.',
    'auth/invalid-email':          'Formato de email inválido.',
    'auth/email-already-in-use':   'Este email já está em uso.',
    'auth/weak-password':          'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':      'Muitas tentativas. Aguarde um momento.',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
    'auth/popup-closed-by-user':   'Login cancelado. Tente novamente.',
    'auth/invalid-credential':     'Email ou senha inválidos.',
    'auth/operation-not-allowed':  'Este método de login não está ativado no Firebase.',
  };
  return map[code] || `Erro: ${code}`;
}

/* ─────────────────────────────────────────
   LOGIN COM EMAIL E SENHA
───────────────────────────────────────── */
async function handleLogin() {
  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) {
    showAuthError('login-error', 'Preencha email e senha.');
    return;
  }

  setAuthLoading('btn-login', true);
  clearAuthErrors();

  // Timeout de segurança — se demorar mais de 15s, libera o botão
  const timeout = setTimeout(() => {
    setAuthLoading('btn-login', false);
    showAuthError('login-error', 'Tempo esgotado. Verifique sua internet e tente novamente.');
  }, 15000);

  try {
    await Auth.signInWithEmailAndPassword(email, password);
    clearTimeout(timeout);
  } catch (err) {
    clearTimeout(timeout);
    console.error('Login error:', err.code, err.message);
    showAuthError('login-error', translateFirebaseError(err.code));
    setAuthLoading('btn-login', false);
  }
}

/* ─────────────────────────────────────────
   LOGIN COM GOOGLE
───────────────────────────────────────── */
async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  clearAuthErrors();

  try {
    await Auth.signInWithPopup(provider);
  } catch (err) {
    console.error('Google login error:', err.code, err.message);
    showAuthError('login-error', translateFirebaseError(err.code));
  }
}

/* ─────────────────────────────────────────
   REGISTO
───────────────────────────────────────── */
async function handleRegister() {
  const name     = document.getElementById('reg-name')?.value?.trim();
  const email    = document.getElementById('reg-email')?.value?.trim();
  const password = document.getElementById('reg-password')?.value;

  if (!name || !email || !password) {
    showAuthError('reg-error', 'Preencha todos os campos.');
    return;
  }

  if (password.length < 6) {
    showAuthError('reg-error', 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  setAuthLoading('btn-register', true);
  clearAuthErrors();

  try {
    const credential = await Auth.createUserWithEmailAndPassword(email, password);
    await credential.user.updateProfile({ displayName: name });

    await DB.collection('users').doc(credential.user.uid).set({
      name,
      email,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
      categories: DEFAULT_CATEGORIES,
      limits:     {},
      settings:   { theme: 'dark' }
    });

  } catch (err) {
    console.error('Register error:', err.code, err.message);
    showAuthError('reg-error', translateFirebaseError(err.code));
    setAuthLoading('btn-register', false);
  }
}

/* ─────────────────────────────────────────
   RECUPERAÇÃO DE SENHA
───────────────────────────────────────── */
async function handleForgot() {
  const email = document.getElementById('forgot-email')?.value?.trim();

  if (!email) {
    showAuthError('forgot-error', 'Digite seu email.');
    return;
  }

  setAuthLoading('btn-forgot', true);
  clearAuthErrors();

  try {
    await Auth.sendPasswordResetEmail(email);
    const msg = document.getElementById('forgot-msg');
    if (msg) {
      msg.textContent = '✅ Link enviado! Verifique sua caixa de entrada.';
      msg.hidden = false;
    }
  } catch (err) {
    showAuthError('forgot-error', translateFirebaseError(err.code));
  } finally {
    setAuthLoading('btn-forgot', false);
  }
}

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
async function handleLogout() {
  try {
    if (typeof AppController !== 'undefined') {
      AppController.destroy();
    }
    await Auth.signOut();
  } catch (err) {
    console.error('Logout error:', err);
  }
}

/* ─────────────────────────────────────────
   GUARDAR PERFIL
───────────────────────────────────────── */
async function saveProfile() {
  const user = Auth.currentUser;
  if (!user) return;

  const name = document.getElementById('settings-name')?.value?.trim();
  if (!name) { showToast('Digite um nome válido.', 'error'); return; }

  try {
    await user.updateProfile({ displayName: name });
    await DB.collection('users').doc(user.uid).update({ name });
    document.getElementById('user-name-sidebar').textContent = name;
    document.getElementById('user-avatar').textContent = name.charAt(0).toUpperCase();
    showToast('Perfil atualizado!', 'success');
  } catch (err) {
    showToast('Erro ao salvar perfil.', 'error');
  }
}
