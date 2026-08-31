/* App — the applied console shell.
   Composes Seal, Sidebar, StatBoard, RequestCard, DecisionPanel and Composer
   into the layout of admin.html: sticky topbar, 250px grouped sidebar, 940px
   content column.

   Sample records are the seed data from admin.html, kept so reviewers see the
   real domain (families, schools, discounts) rather than lorem placeholders.

   App.mount(rootEl) -> { state, render } */
(function (global) {
  'use strict';

  var SAMPLE_REQUESTS = [
    {
      id: 'demo-001', status: 'pendente', escola: 'Colégio São José', data_envio: '2026-06-10T14:32:00.000Z',
      nome_pai: 'Carlos Alberto Silva', rg_pai: '34.567.890-1', cpf_pai: '123.456.789-00', profissao_pai: 'Motorista',
      nome_mae: 'Maria Aparecida Silva', cpf_mae: '987.654.321-00', profissao_mae: 'Auxiliar de limpeza',
      endereco: 'Rua das Palmeiras, 245 — Jd. Primavera', cep: '13.255-100',
      telefone: '(11) 98765-4321', email: 'maria.silva@email.com',
      alunos: [
        { nome: 'Lucas Silva', cpf: '111.222.333-44', serie: '5º Ano', mensalidade: '850,00' },
        { nome: 'Ana Clara Silva', cpf: '', serie: '2º Ano', mensalidade: '780,00' }
      ],
      documentos: [
        { categoria: 'rg_pai', nome: 'rg_carlos.pdf', mime: 'application/pdf' },
        { categoria: 'comprovante_endereco', nome: 'conta_luz.jpg', mime: 'image/jpeg' }
      ],
      renda_pai: '2.200,00', renda_mae: '1.450,00', renda_outros: '0,00', qtd_pessoas: '5',
      desp_aluguel: '1.100,00', desp_servicos: '350,00', desp_internet: '99,00',
      desconto_solicitado: '50', veiculos: [{ marca: 'Fiat', modelo: 'Uno', ano: '2014' }]
    },
    {
      id: 'demo-002', status: 'pendente', escola: 'Escola Santa Catarina', data_envio: '2026-06-12T09:15:00.000Z',
      nome_pai: 'Roberto de Souza', rg_pai: '22.333.444-5', cpf_pai: '111.222.333-44', profissao_pai: 'Pedreiro',
      nome_mae: 'Fernanda de Souza', cpf_mae: '555.666.777-88', profissao_mae: 'Costureira autônoma',
      endereco: 'Av. Brasil, 1020 — Tapera Grande', cep: '13.255-200',
      telefone: '(11) 97654-3210', email: 'fernanda.souza@email.com',
      alunos: [{ nome: 'Pedro Henrique de Souza', cpf: '', serie: '7º Ano', mensalidade: '920,00' }],
      documentos: [{ categoria: 'extrato_bancario', nome: 'extrato_banco.pdf', mime: 'application/pdf' }],
      renda_pai: '1.800,00', renda_mae: '900,00', renda_outros: '400,00', qtd_pessoas: '4',
      desp_aluguel: '800,00', desp_servicos: '280,00', desp_internet: '79,00',
      desconto_solicitado: '70', veiculos: []
    },
    {
      id: 'demo-003', status: 'aprovada', escola: 'Escola Nossa Senhora da Providência',
      data_envio: '2026-05-20T11:00:00.000Z', data_decisao: '2026-05-25T16:45:00.000Z',
      desconto_concedido: '40', motivo: 'Família comprovou necessidade. Renda compatível com desconto parcial.',
      nome_pai: 'José Antonio Ferreira', rg_pai: '11.222.333-4', cpf_pai: '222.333.444-55', profissao_pai: 'Vigilante',
      nome_mae: 'Cláudia Ferreira', cpf_mae: '666.777.888-99', profissao_mae: 'Do lar',
      endereco: 'Rua São Paulo, 88 — Centro', cep: '13.255-050',
      telefone: '(11) 91234-5678', email: 'jose.ferreira@email.com',
      alunos: [{ nome: 'Beatriz Ferreira', cpf: '', serie: '3º EM', mensalidade: '1.050,00' }],
      documentos: [],
      renda_pai: '2.500,00', renda_mae: '0,00', renda_outros: '0,00', qtd_pessoas: '3',
      desp_aluguel: '950,00', desp_servicos: '300,00', desp_internet: '89,00',
      desconto_solicitado: '50', veiculos: []
    }
  ];

  var SORTS = {
    data_desc: function (a, b) { return (b.data_envio || '').localeCompare(a.data_envio || ''); },
    data_asc: function (a, b) { return (a.data_envio || '').localeCompare(b.data_envio || ''); },
    nome: function (a, b) { return (a.nome_pai + ' ' + a.nome_mae).localeCompare(b.nome_pai + ' ' + b.nome_mae, 'pt-BR'); },
    escola: function (a, b) { return (a.escola || '').localeCompare(b.escola || '', 'pt-BR'); }
  };

  function shellMarkup() {
    return '' +
      '<header class="k-topbar">' +
        '<div class="k-topbar-left">' +
          global.Seal.markup(32, { lettering: false, label: 'Selo da Arca' }) +
          '<span class="k-topbar-logo">Arca N. S. da Providência</span>' +
          '<span class="k-topbar-sep"></span>' +
          '<span class="k-topbar-title">Administração</span>' +
        '</div>' +
        '<button type="button" class="k-btn-logout">Sair</button>' +
      '</header>' +
      '<div class="k-layout">' +
        '<aside class="k-sidebar" data-slot="sidebar"></aside>' +
        '<main class="k-content">' +
          '<section class="k-view is-active" data-view="solicitacoes">' +
            '<h1 class="k-view-title">Solicitações de Bolsa</h1>' +
            '<div data-slot="stats"></div>' +
            '<div class="k-toolbar">' +
              '<div class="k-search">' +
                '<input type="search" data-search placeholder="Buscar por nome ou escola…" aria-label="Buscar solicitações">' +
              '</div>' +
              '<div class="k-sort">' +
                '<label for="k-sort-sel">Ordenar</label>' +
                '<select id="k-sort-sel" data-sort>' +
                  '<option value="data_desc">Mais recentes</option>' +
                  '<option value="data_asc">Mais antigas</option>' +
                  '<option value="nome">Nome da família</option>' +
                  '<option value="escola">Escola</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="k-filters" data-slot="filters"></div>' +
            '<p class="k-count" data-slot="count" role="status"></p>' +
            '<div class="k-list" data-slot="list"></div>' +
          '</section>' +

          '<section class="k-view" data-view="benfeitores">' +
            '<h1 class="k-view-title">Benfeitores</h1>' +
            '<p class="k-view-sub">Cadastros recebidos pelo formulário público “Seja um benfeitor”. ' +
              'Esta vista do kit é intencionalmente vazia: sem dados reais, um estado vazio honesto ' +
              'vale mais do que números inventados.</p>' +
            '<div class="k-empty">Nenhum benfeitor cadastrado ainda.</div>' +
          '</section>' +

          '<section class="k-view" data-view="ano-letivo">' +
            '<h1 class="k-view-title">Configuração de Ano Letivo</h1>' +
            '<p class="k-view-sub">Um único ano letivo fica ativo por vez; ativar outro desativa o anterior.</p>' +
            '<div class="k-empty">Ano letivo ativo: 2026 (01/06/2026 — 31/08/2026).</div>' +
          '</section>' +

          '<section class="k-view" data-view="textos">' +
            '<h1 class="k-view-title">Textos de Decisão</h1>' +
            '<p class="k-view-sub">Modelos de carta de aprovação e rejeição, com substituição de tokens ao vivo.</p>' +
            '<div data-slot="composer"></div>' +
          '</section>' +
        '</main>' +
      '</div>';
  }

  function mount(root) {
    var state = {
      records: JSON.parse(JSON.stringify(SAMPLE_REQUESTS)),
      filter: 'todos',
      query: '',
      sort: 'data_desc'
    };

    root.innerHTML = shellMarkup();

    var listEl = root.querySelector('[data-slot="list"]');
    var countEl = root.querySelector('[data-slot="count"]');
    var filtersEl = root.querySelector('[data-slot="filters"]');

    var sidebar = global.Sidebar.mount(root.querySelector('[data-slot="sidebar"]'), {
      active: 'solicitacoes',
      onSelect: showView
    });

    var stats = global.StatBoard.mount(root.querySelector('[data-slot="stats"]'), {
      records: state.records,
      onFilter: function (next) { state.filter = next; renderList(); }
    });

    global.Composer.mount(root.querySelector('[data-slot="composer"]'), {});

    global.RequestCard.bind(listEl, {
      onExport: function (id, kind) {
        var record = getRecord(id);
        /* The source console downloads a text export; the kit reports instead of
           writing a file, so the review surface stays side-effect free. */
        countEl.textContent = 'Exportação "' + kind + '" preparada para ' + record.nome_pai + '.';
      }
    });

    global.DecisionPanel.bind(listEl, {
      getRecord: getRecord,
      onDecide: function (id, patch) {
        var record = getRecord(id);
        Object.keys(patch).forEach(function (key) { record[key] = patch[key]; });
        stats.render(state.records);
        renderList();
      }
    });

    root.querySelector('[data-search]').addEventListener('input', function (event) {
      state.query = event.target.value.trim();
      renderList();
    });
    root.querySelector('[data-sort]').addEventListener('change', function (event) {
      state.sort = event.target.value;
      renderList();
    });
    filtersEl.addEventListener('click', function (event) {
      var button = event.target.closest('.k-filter');
      if (!button) { return; }
      state.filter = button.getAttribute('data-filter');
      stats.setFilter(state.filter);
      renderList();
    });

    function getRecord(id) {
      return state.records.filter(function (record) { return record.id === id; })[0];
    }

    function showView(id) {
      root.querySelectorAll('.k-view').forEach(function (view) {
        view.classList.toggle('is-active', view.getAttribute('data-view') === id);
      });
      /* Views not modelled in this kit fall back to Solicitações. */
      if (!root.querySelector('.k-view.is-active')) {
        root.querySelector('[data-view="solicitacoes"]').classList.add('is-active');
        sidebar.setActive('solicitacoes');
      }
    }

    function visible() {
      var query = state.query.toLowerCase();
      return state.records
        .filter(function (record) {
          return state.filter === 'todos' || record.status === state.filter;
        })
        .filter(function (record) {
          if (!query) { return true; }
          var haystack = [record.nome_pai, record.nome_mae, record.escola]
            .concat((record.alunos || []).map(function (s) { return s.nome; })).join(' ').toLowerCase();
          return haystack.indexOf(query) >= 0;
        })
        .slice()
        .sort(SORTS[state.sort] || SORTS.data_desc);
    }

    function renderFilters() {
      var options = [['todos', 'Todos'], ['pendente', 'Pendente'], ['aprovada', 'Aprovada'], ['rejeitada', 'Rejeitada']];
      filtersEl.innerHTML = options.map(function (option) {
        var count = option[0] === 'todos'
          ? state.records.length
          : state.records.filter(function (r) { return r.status === option[0]; }).length;
        return '<button type="button" class="k-filter' + (state.filter === option[0] ? ' is-active' : '') + '" ' +
          'data-filter="' + option[0] + '" aria-pressed="' + (state.filter === option[0]) + '">' +
          option[1] + ' (' + count + ')</button>';
      }).join('');
    }

    function renderList() {
      renderFilters();
      var rows = visible();
      countEl.textContent = rows.length + ' ' + (rows.length === 1 ? 'solicitação' : 'solicitações') +
        (state.query ? ' para “' + state.query + '”' : '');
      listEl.innerHTML = rows.length
        ? rows.map(global.RequestCard.markup).join('')
        : '<p class="k-empty">' + (state.query
            ? 'Nenhuma solicitação corresponde à busca.'
            : 'Nenhuma solicitação encontrada.') + '</p>';
    }

    renderList();
    return { state: state, render: renderList, showView: showView };
  }

  var App = { mount: mount, SAMPLE_REQUESTS: SAMPLE_REQUESTS, SORTS: SORTS };
  global.App = App;
  if (typeof module !== 'undefined' && module.exports) { module.exports = App; }
})(typeof window !== 'undefined' ? window : globalThis);
