# Ativar Gemini sem Firebase Blaze

Arquitetura: GitHub Pages → Cloudflare Worker → Gemini. Login e dados continuam no Firebase Spark. O Worker verifica o token com o Firebase Auth REST e usa um Durable Object SQLite privado para quotas. Não usa Cloud Functions, Firestore Admin nem conta de serviço.

O Worker foi publicado e o endereço de produção está configurado em `js/ai-config.js`. A chave privada deve continuar cadastrada como segredo na Cloudflare, e a rota de Produção workers.dev precisa estar habilitada. Uma conversa autenticada ainda precisa ser validada no site. Para outros projetos, siga os passos abaixo.

## 1. Contas e chave

1. Crie uma conta Cloudflare e mantenha Workers no plano **Free**.
2. No [Google AI Studio](https://aistudio.google.com/app/apikey), revogue a chave antiga exposta e crie outra. Use uma API/modelo com cota gratuita; confira a disponibilidade na sua conta. Não habilite faturamento para seguir este roteiro gratuito.
3. Tenha Node.js 22 ou superior instalado. Baixe a branch deste PR e abra um terminal na raiz do repositório.

Cloudflare Free e Gemini Free têm limites independentes. Quando atingidos, a IA pode ficar indisponível. Dados enviados ao Gemini gratuito podem ser usados para melhorar produtos Google: use dados fictícios na demonstração e não envie informações sensíveis. O checkbox do resumo vem desmarcado.

## 2. Publicar o Worker

Pelo painel, conecte o repositório `daychoumt/financeai` em Workers & Pages. Use nome `financeai`, branch `main`, diretório raiz `/`, build vazio e comando de publicação `npx wrangler deploy`. O arquivo `wrangler.jsonc` da raiz aponta para `worker/index.mjs` e cria o contador SQLite. Atualizações da `main` podem disparar publicação automática.

Como alternativa pelo terminal, entre na Cloudflare pelo navegador aberto por este comando:

```sh
npx wrangler@4 login
```

Confira `wrangler.jsonc`: projeto `finance-ai-3e186`, origens `https://daychoumt.github.io` e `http://localhost:8000`. Adicione seu domínio próprio se usar outro endereço. O modelo padrão é `gemini-3.1-flash-lite`; substitua `GEMINI_MODEL` se necessário conforme os modelos gratuitos disponíveis na sua conta.

Publique a estrutura:

```sh
npx wrangler@4 deploy
```

A função permanece bloqueada enquanto faltarem os valores abaixo. Cadastre a chave Gemini pelo prompt privado:

```sh
npx wrangler@4 secret put GEMINI_API_KEY
```

- `GEMINI_API_KEY`: a **nova chave privada Gemini**. Nunca colocar no site, GitHub, argumentos do terminal ou mensagens de chat.
- `FIREBASE_WEB_API_KEY`: já configurada em `wrangler.jsonc` com o identificador público Firebase Web do próprio site; não é a chave privada Gemini nem uma conta de serviço. Para outro projeto, atualize-a junto com `FIREBASE_PROJECT_ID`. A API Identity Toolkit precisa estar permitida. Se a chave Web tiver restrições de referenciador de navegador, crie outra do mesmo projeto restrita à Identity Toolkit API para o Worker, preservando as restrições da chave do site.

A configuração cria o Durable Object com `new_sqlite_classes`, compatível com Workers Free. Não troque por `new_classes`, que usa outro tipo de armazenamento.

## 3. Conectar o site

Copie a URL `workers.dev` mostrada na publicação, acrescente `/chat` e preencha **somente a URL** em `js/ai-config.js`:

```js
const AI_CONFIG = Object.freeze({
  endpoint: 'https://financeai.SEUSUBDOMINIO.workers.dev/chat'
});
```

A URL acima é um exemplo: use o endereço real gerado na sua conta. Incorpore o PR e publique o frontend no GitHub Pages. Não é necessário migrar o Firebase, publicar regras novas ou habilitar Blaze para a IA.

## 4. Conferir funcionamento

- Faça login e envie uma pergunta genérica, sem marcar resumo.
- Com dados fictícios, marque resumo e pergunte sobre os totais do painel.
- No Network, verifique que o navegador chama apenas o Worker para IA. A chave Gemini nunca aparece na requisição do navegador.
- Saia durante uma consulta e entre em outra conta: a resposta antiga não pode reaparecer.
- Uma chamada sem token recebe 401; origem não autorizada recebe 403. Sem configuração, recebe 503. Limites recebem 429. Erros do provedor não expõem detalhes privados.

Não use dados reais para validar o portfólio. A conversa não é salva pelo app nem pelos contadores; o Gemini processa cada pergunta e, opcionalmente, o resumo. O histórico visível não é reenviado. Não habilite logs do corpo das requisições.

## Limites implementados

- 2.000 caracteres por pergunta, 12.000 por resumo e 64 KB por corpo HTTP.
- 5 tentativas/minuto, 30/dia por usuário e 200/dia para todo o Worker; janela diária UTC. A quota é reservada antes de consultar Gemini, inclusive quando o provedor falha.
- O Durable Object privado coordena quotas entre instâncias e guarda somente identificadores e contagens, nunca mensagens, tokens ou resumos. O estado diário é substituído no primeiro uso do dia seguinte.
- Autenticação verifica projeto, expiração, conta desabilitada e revogação usando o endpoint autenticado Firebase; indisponibilidade da verificação bloqueia a IA.
- Cadastro público permite múltiplas contas; a quota global limita chamadas ao Gemini. As cotas dos provedores podem ser menores. Para tráfego maior, avaliar App Check e controles adicionais.
- Timeout: 8 segundos para verificar login, 25 para Gemini. Limites do plano gratuito também se aplicam.

## Desenvolvimento

```sh
node --test tests/*.test.cjs
npx wrangler@4 deploy --dry-run
```

Os testes usam respostas simuladas; verificam autenticação, consentimento, cancelamento, quotas, conteúdo inválido, CORS e contrato Gemini. O dry-run valida empacotamento e bindings, sem publicar. A resposta autenticada do Gemini ainda precisa ser validada após a ativação. A consulta de autenticação foi verificada com um token deliberadamente inválido, sem ler contas ou dados de usuários.

Referências: [Workers Free](https://developers.cloudflare.com/workers/platform/limits/), [Durable Objects Free/SQLite](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth), [Gemini gratuito](https://ai.google.dev/gemini-api/docs/billing), [uso dos dados](https://ai.google.dev/gemini-api/docs/pricing).

## Diagnosticar falha na conversa

O chat exibe códigos estáveis sem mostrar a resposta bruta do provedor ou credenciais:

| Código | Verificação |
| --- | --- |
| `AI_KEY_MISSING` | Aplicar o segredo Gemini à versão publicada do Worker. |
| `AI_KEY_REJECTED` | Chave recusada: conferir nova chave no AI Studio e atualizar o segredo. |
| `AI_PROVIDER_PERMISSION` | Permissões da chave/projeto para usar Gemini. |
| `AI_MODEL_UNAVAILABLE` | Disponibilidade do modelo configurado. |
| `AI_PROVIDER_QUOTA` | Cota do modelo/projeto no Google; diferente da quota do app. |
| `AI_AUTH_CONFIG` / `AI_AUTH_UNAVAILABLE` | Configuração Firebase ou disponibilidade da verificação do login. |
| `AI_QUOTA_CONFIG` / `AI_QUOTA_UNAVAILABLE` | Binding e funcionamento do Durable Object. |
| `AI_APP_QUOTA` | Limite de uso do aplicativo atingido. |
| `AI_EMPTY_RESPONSE` | Gemini respondeu sem texto utilizável. |
| `AI_TIMEOUT` | Uma etapa excedeu o tempo de espera. |
| `HTTP_403` / `HTTP_503` | Bloqueio ou resposta sem código conhecido; conferir somente o status/corpo sanitizado. |

Compartilhe apenas o código mostrado na interface. Nunca publique o cabeçalho Authorization, tokens, arquivos HAR sem sanitização ou valores de segredos. No Gemini 2.5 Flash, a consulta curta usa thinkingBudget zero para reservar o orçamento de saída para o texto final. Outros modelos mantêm sua configuração padrão.

### Modelo indisponível

O proprietário recebeu `AI_MODEL_UNAVAILABLE` com Gemini 2.5 Flash. O padrão foi atualizado para `gemini-3.1-flash-lite`. Se ocorrer outra indisponibilidade de modelo (404), o Worker consulta o catálogo associado à chave e faz no máximo uma tentativa alternativa, somente com um modelo listado como compatível com `generateContent` e pertencente à lista explícita: Gemini 3.1 Flash-Lite, 3.5 Flash-Lite ou 2.5 Flash-Lite. São modelos com modalidade gratuita documentada; disponibilidade e cota dependem do projeto. Não há troca automática de plano ou de provedor. Falhas de chave, permissão e cota não provocam tentativa em outro modelo. O timeout de 25 segundos abrange toda a operação.
