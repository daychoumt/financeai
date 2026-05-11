# ◈ Finance AI

> Gestão financeira inteligente com IA, autenticação e dados em tempo real.

![Finance AI](https://img.shields.io/badge/Finance-AI-6c63ff?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

---

## 🌐 Acesso

🔗 **[https://daychoumt.github.io/financeai](https://daychoumt.github.io/financeai)**

---

## 📱 Sobre o projeto

O **Finance AI** é uma aplicação web progressiva (PWA) de gestão financeira pessoal, moderna e profissional. Inspirado em produtos como Nubank, Mobills e YNAB, o app permite controlar receitas, despesas, metas e assinaturas com o apoio de inteligência artificial.

---

## ✨ Funcionalidades

### 🔐 Autenticação
- Login com email e senha
- Login com conta Google
- Registo de nova conta
- Recuperação de senha por email
- Sessão persistente (continua logado após fechar o browser)
- Dados separados por utilizador

### 💰 Gestão Financeira
- Adicionar receitas e despesas
- Categorização automática por IA
- Filtros por tipo, categoria e data
- Histórico completo de transações
- Score de saúde financeira (0–100)

### 📊 Análise
- Gráfico de gastos por categoria
- Gráfico de fluxo mensal (6 meses)
- Evolução do saldo ao longo do tempo
- Previsão de gastos para o fim do mês
- Limites por categoria com alertas

### 🎯 Metas e Cofres
- Criar metas financeiras personalizadas
- Acompanhar progresso com barra visual
- Depositar valores nas metas

### 📦 Assinaturas
- Registar serviços recorrentes (Netflix, Spotify, etc.)
- Calcular total mensal e anual
- Alertas de renovação

### 🤖 Assistente IA
- Chatbot financeiro powered by Google Gemini
- Análise dos seus dados em tempo real
- Sugestões personalizadas de economia
- Previsão de saldo negativo

### 📤 Exportação
- Exportar transações em CSV (Excel)
- Relatório mensal em PDF
- Importar extrato bancário via CSV

### 🎨 Interface
- Dark mode / Light mode
- Design responsivo (mobile e desktop)
- Instalável como app (PWA)
- Animações suaves
- Skeleton loading

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| HTML, CSS, JavaScript | Frontend puro, sem framework |
| Firebase Authentication | Login e gestão de utilizadores |
| Firebase Firestore | Base de dados em tempo real |
| Google Gemini API | Assistente de IA |
| Chart.js | Gráficos interativos |
| GitHub Pages | Hospedagem gratuita |

---

## 📁 Estrutura do projeto

```
financeai/
├── index.html              # Página principal
├── manifest.json           # Configuração PWA
├── favicon.ico
├── css/
│   ├── reset.css
│   ├── tokens.css          # Design tokens (cores, espaçamentos)
│   ├── auth.css            # Tela de autenticação
│   ├── app.css             # Layout principal
│   ├── components.css      # Componentes reutilizáveis
│   └── animations.css
├── js/
│   ├── config.js           # Configuração Firebase
│   ├── app.js              # Controlador principal
│   ├── auth/
│   │   └── auth.js         # Autenticação
│   ├── services/
│   │   ├── db.js           # Acesso ao Firestore
│   │   ├── finance.js      # Cálculos financeiros
│   │   ├── ai.js           # Chatbot Gemini
│   │   ├── export.js       # CSV e PDF
│   │   ├── autocategory.js # Categorização automática
│   │   └── notifications.js
│   └── ui/
│       ├── components.js   # Toast, modal, navegação
│       ├── charts.js       # Gráficos Chart.js
│       └── pages.js        # Renderização das páginas
└── assets/
    ├── icon-192.png
    └── icon-512.png
```

---

## 📲 Instalar como app

### iPhone (Safari)
1. Abre o link no Safari
2. Clica em **Compartilhar** ↑
3. Clica em **"Adicionar à Tela de Início"**

### Android (Chrome)
1. Abre o link no Chrome
2. Clica nos **3 pontinhos** →
3. Clica em **"Adicionar à tela inicial"**

### Computador (Chrome)
1. Abre o link no Chrome
2. Clica no ícone **⊕** na barra de endereço
3. Clica em **"Instalar"**

---

## 🔒 Segurança

- Cada utilizador acede apenas aos seus próprios dados
- Regras do Firestore garantem isolamento total entre contas
- Autenticação gerida pelo Firebase (Google)

---

## 👨‍💻 Desenvolvido por

**Thalys Daychoum**

---

## 📄 Licença

Este projeto é de uso pessoal e privado.
