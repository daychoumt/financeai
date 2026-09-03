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

## 3. Configurar o Firebase Web

Abra o arquivo **`js/config.js`** e substitua os valores:

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

Essas regras precisam estar publicadas no projeto correto. Teste, em desenvolvimento, que cada conta acessa apenas os próprios dados e que acessos sem autenticação são recusados. O repositório não confirma quais regras estão ativas no seu Firebase.

---

## 6. Publicar no GitHub Pages

1. Faça upload de todos os arquivos para o repositório GitHub
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

## Estrutura de arquivos

```
financeai/
├── index.html              ← Página principal
├── manifest.json           ← PWA
├── css/
│   ├── reset.css
│   ├── tokens.css          ← Design tokens (cores, espaçamentos)
│   ├── auth.css            ← Tela de login/cadastro
│   ├── app.css             ← Layout principal
│   ├── components.css      ← Componentes reutilizáveis
│   └── animations.css
├── js/
│   ├── config.js           ← Configuração pública Firebase Web
│   ├── app.js              ← Controlador principal
│   ├── auth/
│   │   └── auth.js         ← Autenticação Firebase
│   ├── services/
│   │   ├── db.js           ← Acesso ao Firestore
│   │   ├── finance.js      ← Cálculos financeiros
│   │   └── ai.js           ← Cliente do assistente autenticado
│   └── ui/
│       ├── components.js   ← Toast, modal, tema, nav
│       ├── charts.js       ← Gráficos Chart.js
│       └── pages.js        ← Renderização das páginas
└── assets/                 ← Adicione ícones PWA aqui
```

## Assistente e credenciais

O chat tem backend implementado e requer ativação seguindo o [guia da IA](docs/AI-SETUP.md). Não cole uma nova chave Gemini em `js/services/ai.js`, `js/config.js`, HTML, arquivos públicos ou variáveis incorporadas ao frontend durante um build.

Se uma chave privada já foi publicada, revogue-a no [Google AI Studio](https://aistudio.google.com/app/apikey). Apagar do arquivo não remove o histórico nem invalida a credencial.

O backend em `worker/` valida o token Firebase, guarda o segredo na Cloudflare e limita o uso com Durable Objects SQLite do plano gratuito. O Firebase pode permanecer no Spark. A publicação e o cadastro do segredo ainda dependem do proprietário. Veja a [revisão técnica](docs/REVISAO-TECNICA.md).

A configuração Web do Firebase tem finalidade diferente: ela identifica o projeto no navegador. Restrinja a chave às APIs necessárias e use Authentication e Security Rules para controlar dados. Não reutilize uma chave privada de IA como configuração pública.

## Desenvolvimento e testes

Use seu próprio Firebase de desenvolvimento, sem dados reais de pacientes ou de terceiros. Autorize também `localhost` nos domínios de Authentication se necessário.

Para servir os arquivos, execute `python -m http.server 8000` na pasta do projeto e acesse `http://localhost:8000`.

Com Node.js 22 ou superior, execute `node --test tests/*.test.cjs`. Os testes são locais e não usam contas ou dados do Firebase. Eles não validam as regras publicadas; essa verificação continua pendente.
