/* ═══════════════════════════════════════════════════════
   js/services/autocategory.js — Categorização automática
   Sugere categoria com base na descrição digitada.
═══════════════════════════════════════════════════════ */

const AutoCategory = (() => {

  /* Mapa de palavras-chave → categoria */
  const RULES = {
    'Alimentação': [
      'mercado','supermercado','padaria','restaurante','lanchonete','ifood',
      'uber eats','rappi','mcdonalds','mcdonald','burguer','burger','pizza',
      'sushi','açougue','hortifruti','feira','almoço','jantar','café','bar',
      'boteco','churrasco','delivery','starbucks','subway','giraffas','bobs',
      'habib','china','japonês','sorvete','doceria','confeitaria','pão',
      'leite','frango','carne','peixe','verdura','fruta','legume','bebida'
    ],
    'Transporte': [
      'uber','99','táxi','taxi','ônibus','metro','metrô','trem','combustível',
      'gasolina','etanol','álcool','diesel','posto','shell','petrobras','ipiranga',
      'br','estacionamento','pedágio','moto','bicicleta','patinete','passagem',
      'bilhete','cartão bom','sptrans','ccr','autopista','rodovia','transporte'
    ],
    'Moradia': [
      'aluguel','condomínio','agua','água','luz','energia','gás','gas','internet',
      'telefone','tv a cabo','streaming','netflix','amazon prime','disney',
      'hbo','iptu','seguro','conserto','reforma','tinta','encanador','eletricista',
      'pedreiro','faxina','diarista','limpeza','móvel','movel','sofá','cama',
      'geladeira','fogão','máquina'
    ],
    'Saúde': [
      'farmácia','farmacia','remédio','remedio','medicamento','médico','medico',
      'hospital','clínica','clinica','consulta','exame','dentista','psicólogo',
      'psicologo','fisioterapia','academia','plano de saúde','plano saude',
      'drogaria','ultrafarma','droga raia','panvel','manipulação'
    ],
    'Lazer': [
      'cinema','teatro','show','ingresso','netflix','spotify','disney','amazon',
      'hbo','youtube','jogo','game','steam','playstation','xbox','nintendo',
      'viagem','hotel','airbnb','booking','passagem aérea','passeio','parque',
      'museu','exposição','balada','festa','evento','bar','night'
    ],
    'Educação': [
      'faculdade','universidade','curso','escola','mensalidade','material','livro',
      'apostila','udemy','coursera','alura','linkedin','certificado','inglês',
      'ingles','idioma','aula','professor','tutoria','workshop'
    ],
    'Roupas': [
      'roupa','vestuário','vestuario','camiseta','calça','calca','tênis','tenis',
      'sapato','bolsa','acessório','acessorio','zara','hm','h&m','renner',
      'c&a','riachuelo','marisa','lojas','shein','americanas','netshoes'
    ],
    'Assinaturas': [
      'netflix','spotify','amazon prime','disney','hbo','apple','google one',
      'adobe','notion','dropbox','microsoft','office','antivírus','antivirus',
      'vpn','assinatura','mensalidade','plano','anuidade','subscription'
    ],
    'Investimentos': [
      'investimento','poupança','poupanca','tesouro','ação','acao','fundo',
      'cdb','lci','lca','previdência','previdencia','xp','rico','nuinvest',
      'easynvest','inter','btg','itaú invest','bradesco','reserva'
    ],
    'Salário': [
      'salário','salario','pagamento','holerite','pro-labore','prolabore',
      'remuneração','remuneracao','13°','decimo','ferias','férias','pis','fgts'
    ],
    'Freelance': [
      'freelance','freela','projeto','cliente','pagamento projeto','honorário',
      'honorario','consultoria','serviço','servico','comissão','comissao'
    ]
  };

  /**
   * Sugere uma categoria baseada na descrição.
   * @param {string} desc
   * @returns {string} categoria sugerida ou 'Outros'
   */
  function suggest(desc = '') {
    const lower = desc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const [category, keywords] of Object.entries(RULES)) {
      for (const kw of keywords) {
        const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lower.includes(kwNorm)) {
          return category;
        }
      }
    }

    return 'Outros';
  }

  /**
   * Inicializa autocomplete no campo de descrição de transação.
   * Quando o usuário para de digitar, sugere a categoria automaticamente.
   */
  function init() {
    const descInput = document.getElementById('tx-desc');
    const catSelect = document.getElementById('tx-category');
    if (!descInput || !catSelect) return;

    let debounce = null;

    descInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const desc      = descInput.value.trim();
        if (desc.length < 3) return;

        const suggested = suggest(desc);
        if (suggested && suggested !== 'Outros') {
          // Só muda se o utilizador ainda não escolheu manualmente
          catSelect.value = suggested;

          // Mostra dica visual
          _showSuggestionHint(suggested);
        }
      }, 400);
    });
  }

  function _showSuggestionHint(category) {
    let hint = document.getElementById('cat-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'cat-hint';
      hint.style.cssText = `
        font-size:11px;color:var(--accent);margin-top:4px;
        display:flex;align-items:center;gap:4px;
        animation:fadeIn 0.2s ease;
      `;
      document.getElementById('tx-category')?.parentElement?.appendChild(hint);
    }
    hint.innerHTML = `✨ Categoria sugerida: <strong>${category}</strong>`;
    setTimeout(() => { if (hint) hint.remove(); }, 3000);
  }

  return { suggest, init };

})();
