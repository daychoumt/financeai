# Ativar o assistente Gemini

O código está preparado, mas o chat só responde depois da publicação do backend e da configuração do segredo. Publicar apenas o GitHub Pages não ativa a IA.

## 1. Preparar o projeto

- Revogue a chave Gemini anteriormente exposta no Google AI Studio. Não reutilize essa chave.
- O projeto Firebase utilizado no site é `finance-ai-3e186`. Confira se você é o proprietário antes de executar comandos.
- Cloud Functions exige o plano Blaze com faturamento habilitado. Firebase e Gemini podem gerar cobranças; configure alertas e cotas na conta. Não há promessa de gratuidade. Os limites abaixo reduzem chamadas ao modelo, mas não são um teto de faturamento da infraestrutura.
- Use Node.js 22 e instale a CLI oficial: `npm install -g firebase-tools`.
- Na raiz do repositório, execute `npm ci --prefix functions` e `firebase login`.

## 2. Cadastrar o segredo no servidor

Crie uma nova chave em https://aistudio.google.com/app/apikey e execute:

```sh
firebase functions:secrets:set GEMINI_API_KEY --project finance-ai-3e186
```

Cole a chave somente no prompt privado da CLI. Não coloque em argumentos de comandos, commits, frontend ou mensagens de chat. A função acessa o segredo pelo Secret Manager.

O modelo padrão é `gemini-2.5-flash`. Confira disponibilidade na sua conta. Para mudar, configure `GEMINI_MODEL` em `functions/.env.finance-ai-3e186` (ignorado pelo Git) e publique novamente. Nunca adicione a chave nesse arquivo.

## 3. Conferir regras e publicar

Compare `firestore.rules` com as regras já publicadas no console; preserve quaisquer regras adicionais necessárias. O arquivo permite acesso de cada usuário somente a `users/{seuUid}`. A coleção `aiUsage` deve permanecer sem qualquer permissão de leitura/escrita para clientes, inclusive usuários autenticados. Uma regra ampla adicional pode invalidar essa proteção.

Depois dessa revisão:

```sh
firebase deploy --only firestore:rules,functions:financeChat --project finance-ai-3e186
```

O endpoint esperado pelo frontend é:
`https://us-central1-finance-ai-3e186.cloudfunctions.net/financeChat`

Se trocar o projeto, atualize a configuração pública Firebase do site. Se trocar região ou nome da função, atualize também `js/services/ai.js`. Para domínio próprio, atualize a lista CORS em `functions/index.js`; a configuração atual permite `https://daychoumt.github.io` e `http://localhost:8000`.

Depois, incorpore o PR à `main` para publicar o frontend no GitHub Pages. Não envie arquivos de segredo ou `node_modules` para o GitHub.

## 4. Validar no site

1. Faça login e envie uma pergunta genérica sem marcar o resumo.
2. Marque o resumo e pergunte sobre os totais do mês. Confira se correspondem ao painel.
3. Na aba Network, confirme que o navegador envia apenas o token Firebase e a pergunta/contexto ao seu backend; nenhuma chave Gemini deve aparecer.
4. Saia durante uma consulta e entre em outra conta: nenhuma resposta antiga deve reaparecer.
5. Confira no Firebase Rules Playground que o cliente não pode ler ou escrever `aiUsage/global` e que uma conta não acessa dados de outra.

## Comportamento e limites

- Token Firebase validado no servidor, incluindo revogação/conta desabilitada.
- Até 2.000 caracteres por pergunta e 12.000 no resumo.
- 5 tentativas/minuto e 30/dia por usuário; 200/dia para todo o projeto. Janela diária UTC. Tentativas que chegam ao provedor contam mesmo se ele falhar. Contadores transacionais ficam em `aiUsage`, sem mensagens ou valores financeiros.
- Até 2 instâncias da função; timeout do provedor de 25 segundos.
- Cada pergunta é independente. O histórico visível não é reenviado, nem salvo em Firestore. O resumo só é enviado quando a caixa é marcada; mensagens e resumo são processados pelo Google, conforme os termos do serviço.
- O modelo não possui ferramentas para alterar transações ou movimentar dinheiro. Respostas são texto, sem execução de HTML.
- Cadastro público ainda permite criação de várias contas: autenticação não substitui proteção completa contra abuso. Para tráfego maior, avaliar App Check e políticas adicionais. A quota global limita o número de chamadas Gemini desta função.

## Testes e limitações da validação

`node --test tests/*.test.cjs` verifica cálculos, isolamento de sessão, cliente IA, autenticação do handler, validação, limites e respostas de erro com dependências simuladas. Não substitui teste do Firebase/Gemini implantados. A integração ao vivo, as permissões IAM, o segredo e as regras realmente publicadas precisam da conta do proprietário.

Referências: [Cloud Functions e Blaze](https://firebase.google.com/docs/functions/get-started), [segredos](https://firebase.google.com/docs/functions/config-env), [tokens Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [modelos Gemini](https://ai.google.dev/gemini-api/docs/models).
