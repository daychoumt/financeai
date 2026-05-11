# 🚀 Finance AI — Guia de Configuração

## Pré-requisitos
- Conta Google gratuita
- Acesso a https://console.firebase.google.com

---

## 1. Criar projeto no Firebase

1. Acesse https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `meu-finance-ai`)
4. Desative o Google Analytics (opcional)
5. Clique em **"Criar projeto"**

---

## 2. Criar app Web

1. No painel do projeto, clique no ícone **`</>`** (Web)
2. Dê um apelido (ex: `finance-web`)
3. Clique em **"Registrar app"**
4. Copie o bloco `firebaseConfig` que aparece na tela

---

## 3. Colar as chaves no projeto

Abra o ficheiro **`js/config.js`** e substitua os valores:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIza...",           // ← cole aqui
  authDomain:        "meu-projeto.firebaseapp.com",
  projectId:         "meu-projeto",
  storageBucket:     "meu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

## 4. Ativar Autenticação

1. No menu lateral do Firebase, clique em **Authentication**
2. Clique em **"Primeiros passos"**
3. Ative **E-mail/senha**
4. Ative **Google** (necessário configurar e-mail de suporte)

---

## 5. Criar base de dados Firestore

1. No menu lateral, clique em **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de produção"**
4. Selecione a região mais próxima (ex: `southamerica-east1` para Brasil)

### Regras de segurança do Firestore

Cole estas regras em **Firestore → Regras**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Isso garante que **cada utilizador só acede aos seus próprios dados**.

---

## 6. Publicar no GitHub Pages

1. Faça upload de todos os ficheiros para o repositório GitHub
2. Vá em **Settings → Pages**
3. Selecione a branch `main` e pasta `/root`
4. O site ficará disponível em `https://seuuser.github.io/seu-repo`

---

## 7. Autorizar o domínio no Firebase

1. No Firebase, vá em **Authentication → Settings → Domínios autorizados**
2. Adicione: `seuuser.github.io`

---

## ✅ Pronto!

Acesse o seu link do GitHub Pages e crie a primeira conta!

---

## Estrutura de ficheiros

```
financeai/
├── index.html              ← Página principal
├── manifest.json           ← PWA
├── css/
│   ├── reset.css
│   ├── tokens.css          ← Design tokens (cores, espaçamentos)
│   ├── auth.css            ← Tela de login/registo
│   ├── app.css             ← Layout principal
│   ├── components.css      ← Componentes reutilizáveis
│   └── animations.css
├── js/
│   ├── config.js           ← ⚠️ COLOQUE SUAS CHAVES AQUI
│   ├── app.js              ← Controlador principal
│   ├── auth/
│   │   └── auth.js         ← Autenticação Firebase
│   ├── services/
│   │   ├── db.js           ← Acesso ao Firestore
│   │   ├── finance.js      ← Cálculos financeiros
│   │   └── ai.js           ← Chatbot IA (Claude)
│   └── ui/
│       ├── components.js   ← Toast, modal, tema, nav
│       ├── charts.js       ← Gráficos Chart.js
│       └── pages.js        ← Renderização das páginas
└── assets/                 ← Adicione ícones PWA aqui
```
