# Finance AI

Controle financeiro pessoal em HTML, CSS e JavaScript, com autenticação Firebase e dados no Firestore. Reúne receitas, despesas, categorias, metas e assinaturas em um painel mensal.

[Acessar o site](https://daychoumt.github.io/financeai/) · [Configurar o projeto](SETUP.md) · [Revisão e próximas etapas](docs/REVISAO-TECNICA.md)

> **Estado desta versão:** o assistente está temporariamente indisponível. A chamada direta ao Gemini foi retirada do navegador; sua retomada depende de um backend autenticado. Uma branch ou pull request não altera automaticamente a versão publicada no GitHub Pages.

## Recursos implementados no código

- Cadastro, login por e-mail/senha, login com Google e recuperação de senha.
- Cadastro e exclusão de receitas e despesas, com filtros na lista do mês carregado.
- Sugestão de categorias por palavras-chave, executada localmente.
- Resumo mensal, gastos por categoria, gráficos e limites de gastos.
- Metas financeiras e registro de assinaturas.
- Exportação das transações carregadas em CSV e relatório para impressão/PDF.
- Temas claro e escuro e layout adaptativo.

A existência desses fluxos no código não substitui testes de integração no Firebase. Importação CSV, histórico, validação de sessões no Firebase e instalação/offline têm pendências na [revisão técnica](docs/REVISAO-TECNICA.md).

## Organização

| Parte | Responsabilidade |
| --- | --- |
| `js/app.js` | Coordenação do estado e da interface |
| `js/auth/auth.js` | Fluxos de autenticação |
| `js/services/db.js` | Leituras, gravações e listeners do Firestore |
| `js/services/finance.js` | Resumo, categorias, alertas e projeções |
| `js/services/ai.js` | Estado indisponível do assistente, sem chamada externa |
| `js/ui/` | Componentes, páginas e gráficos com Chart.js |
| `css/` | Estilos, temas e animações |
| `tests/` | Testes com o runner nativo do Node.js |

O resumo e os totais por categoria acumulam centavos e retornam reais para a interface. O banco mantém o formato existente; esta alteração não migra dados. Valores legados inválidos são desconsiderados nesses cálculos. A validação antes da gravação continua como próxima etapa.

O score é uma heurística do próprio projeto. A previsão extrapola gastos pela média diária; ela não é gerada por IA.

## Executar localmente

1. Clone este repositório.
2. Configure um Firebase de desenvolvimento conforme [SETUP.md](SETUP.md), usando dados fictícios.
3. Na pasta do projeto, inicie um servidor estático:

```sh
python -m http.server 8000
```

Abra `http://localhost:8000`. Autenticação e Firestore dependem da configuração do seu projeto e de acesso à rede. Não é necessário instalar pacotes npm para servir o aplicativo.

## Testes

Requer Node.js 22 ou superior, sem dependências externas:

```sh
node --test tests/*.test.cjs
```

Também disponível por `npm test`. O workflow `Testes` executa a suíte em pull requests e atualizações de `main`.

A suíte cobre precisão do resumo, categorias, valores legados inválidos, soma de assinaturas, suspensão do chat sem envio de dados, limpeza e troca de sessão, respostas atrasadas e sintaxe dos scripts. Não verifica autenticação real, regras publicadas no Firestore, aparência no navegador ou disponibilidade do site.

## Segurança

- Credenciais privadas de IA pertencem ao servidor, fora dos recursos distribuídos ao navegador.
- Uma credencial anteriormente exposta precisa ser revogada no provedor. Retirá-la da versão atual não apaga o histórico nem invalida cópias existentes.
- A configuração Web do Firebase é pública. O acesso aos dados depende de Authentication e Security Rules corretamente publicadas; restrinja a chave Web às APIs necessárias.
- O caminho `users/{uid}` organiza os dados, mas não comprova isolamento por si só. Confira e teste as regras no Firebase.

## Autor e uso

Desenvolvido por **Thalys Daychoum**.

Este projeto é de uso pessoal e privado, conforme a declaração original do autor. Nenhuma licença de código aberto foi adicionada nesta revisão.
