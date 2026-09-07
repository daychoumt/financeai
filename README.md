# Finance AI

Aplicação web de gestão financeira pessoal desenvolvida para centralizar **receitas, despesas, categorias, metas, assinaturas e indicadores** em um único painel.

O projeto combina uma interface responsiva com autenticação, persistência de dados e recursos de análise para transformar registros financeiros em uma visão clara da situação mensal do usuário.

[**Acessar aplicação**](https://daychoumt.github.io/financeai/) · [Configuração do projeto](SETUP.md) · [Revisão técnica](docs/REVISAO-TECNICA.md)

## Destaques do projeto

- Dashboard com receita, gastos, saldo e score financeiro.
- Cadastro, edição e exclusão de receitas e despesas.
- Organização das transações por categorias.
- Metas financeiras e acompanhamento de assinaturas.
- Gráficos e visão de gastos por categoria.
- Alertas, projeções e comparação de informações financeiras.
- Autenticação por e-mail/senha e Google.
- Exportação de transações em CSV e relatório para impressão/PDF.
- Temas claro e escuro e layout adaptativo.
- Assistente integrado por backend autenticado.

## Tecnologias

- **HTML5** e **CSS3**
- **JavaScript**
- **Firebase Authentication**
- **Cloud Firestore**
- **Google Apps / Firebase Web SDK**
- **Chart.js**
- **Cloudflare Workers**
- **GitHub Pages**
- Testes com o runner nativo do **Node.js**

## Arquitetura

| Parte | Responsabilidade |
| --- | --- |
| `js/app.js` | Coordenação do estado e da interface |
| `js/auth/auth.js` | Fluxos de autenticação |
| `js/services/db.js` | Leituras, gravações e listeners do Firestore |
| `js/services/finance.js` | Resumo, categorias, alertas e projeções |
| `js/services/ai.js` | Integração do assistente autenticado |
| `js/ui/` | Componentes, páginas e gráficos |
| `css/` | Estilos, temas e animações |
| `tests/` | Testes automatizados |

## Executar localmente

1. Clone o repositório.
2. Configure um Firebase de desenvolvimento seguindo o [SETUP.md](SETUP.md).
3. Inicie um servidor estático na pasta do projeto:

```bash
python -m http.server 8000
```

4. Acesse `http://localhost:8000`.

As funcionalidades que utilizam autenticação, Firestore e serviços externos dependem das respectivas configurações e acesso à rede.

## Testes

O projeto utiliza Node.js 22 ou superior e pode ser testado com:

```bash
node --test tests/*.test.cjs
```

ou:

```bash
npm test
```

A suíte cobre regras de cálculo, categorias, assinaturas, fluxos do assistente, autenticação do backend, troca de sessão e validações de scripts. Testes de integração reais com Firebase e validação visual no navegador continuam sendo tratados separadamente.

## Observações técnicas e segurança

- Credenciais privadas do assistente pertencem ao backend e não devem ser distribuídas no navegador.
- A configuração Web do Firebase é pública por natureza; o isolamento dos dados depende de Authentication e Security Rules corretamente configuradas.
- O score financeiro e as projeções são heurísticas do próprio projeto e não representam aconselhamento financeiro.
- Algumas integrações dependem de configuração externa e podem exigir validação no ambiente de produção.

## Objetivo

O Finance AI foi desenvolvido como projeto de portfólio e evolução prática em **desenvolvimento web, autenticação, persistência de dados, dashboards, automação e arquitetura de aplicações**.

## Autor

Desenvolvido por **Thalys Daychoum**.

[GitHub](https://github.com/daychoumt) · [LinkedIn](https://www.linkedin.com/in/thalys-daychoum/)