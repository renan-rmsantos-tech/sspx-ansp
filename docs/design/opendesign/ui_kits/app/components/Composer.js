/* Composer — the decision-letter / contract template editor.
   Source: the "Textos de Decisão" and "Modelo de Contrato" views of admin.html:
   a --cream token cheat-sheet, tabbed template editors in the mono face, and a
   live preview panel that substitutes sample data as you type.

   Composer.mount(el, { tabs, tokens, samples, fields }) -> { render } */
(function (global) {
  'use strict';

  var TOKENS = [
    { token: '{nome_pai}', desc: 'Nome do pai/responsável' },
    { token: '{nome_mae}', desc: 'Nome da mãe' },
    { token: '{escola}', desc: 'Nome da escola' },
    { token: '{aluno}', desc: 'Nome(s) do(s) aluno(s)' },
    { token: '{desconto}', desc: 'Desconto concedido (%)' },
    { token: '{data}', desc: 'Data da decisão' },
    { token: '{motivo}', desc: 'Motivo da decisão' },
    { token: '{ano_letivo}', desc: 'Ano letivo' }
  ];

  var SAMPLES = {
    '{nome_pai}': 'João da Silva',
    '{nome_mae}': 'Maria da Silva',
    '{escola}': 'Colégio São José',
    '{aluno}': 'Pedro da Silva, Ana da Silva',
    '{desconto}': '50',
    '{data}': new Date().toLocaleDateString('pt-BR'),
    '{motivo}': 'Renda familiar insuficiente para custear a mensalidade integral',
    '{ano_letivo}': '2026'
  };

  var TEMPLATES = {
    aprovacao: {
      cabecalho: 'Arca Nossa Senhora da Providência\nComissão de Bolsas de Estudo',
      corpo: 'Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nTemos a satisfação de comunicar que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, foi APROVADA para o ano letivo de {ano_letivo}.\n\nFoi concedido um desconto de {desconto}% sobre o valor da mensalidade.\n\n{motivo}',
      rodape: 'Atenciosamente,\nComissão de Bolsas — Arca N. S. da Providência\n{data}'
    },
    rejeicao: {
      cabecalho: 'Arca Nossa Senhora da Providência\nComissão de Bolsas de Estudo',
      corpo: 'Prezado(a) Sr(a). {nome_pai} e Sra. {nome_mae},\n\nApós análise cuidadosa, informamos que a solicitação de bolsa de estudo para o(a) aluno(a) {aluno}, na escola {escola}, não pôde ser atendida para o ano letivo de {ano_letivo}.\n\n{motivo}\n\nA família poderá reapresentar a solicitação no próximo período de inscrições.',
      rodape: 'Atenciosamente,\nComissão de Bolsas — Arca N. S. da Providência\n{data}'
    }
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }

  /* Token substitution with sample data — the preview never shows raw braces. */
  function substitute(text, samples) {
    return Object.keys(samples).reduce(function (acc, token) {
      return acc.split(token).join(samples[token]);
    }, text || '');
  }

  function markup(tabs, active, template) {
    return '' +
      '<div class="k-tokens">' +
        '<h4>Tokens disponíveis</h4>' +
        '<p>Copie e cole no texto. Cada token é substituído pelos dados da solicitação ao gerar o PDF.</p>' +
        '<ul>' + TOKENS.map(function (item) {
          return '<li><code>' + esc(item.token) + '</code><span class="desc">' + item.desc + '</span></li>';
        }).join('') + '</ul>' +
      '</div>' +
      '<div class="k-tabs" style="margin-top:20px;">' + tabs.map(function (tab) {
        return '<button type="button" class="k-tab' + (tab.id === active ? ' is-active' : '') + '" ' +
          'data-tpl="' + tab.id + '">' + tab.label + '</button>';
      }).join('') + '</div>' +
      '<div class="k-editor-grid">' +
        '<div>' +
          '<div class="k-field"><label for="cmp-cab">Cabeçalho</label>' +
            '<textarea id="cmp-cab" rows="3" data-part="cabecalho">' + esc(template.cabecalho) + '</textarea></div>' +
          '<div class="k-field"><label for="cmp-corpo">Corpo</label>' +
            '<textarea id="cmp-corpo" rows="9" data-part="corpo">' + esc(template.corpo) + '</textarea></div>' +
          '<div class="k-field"><label for="cmp-rod">Rodapé</label>' +
            '<textarea id="cmp-rod" rows="3" data-part="rodape">' + esc(template.rodape) + '</textarea></div>' +
          '<div class="k-form-foot">' +
            '<span class="k-saved" data-saved hidden>Modelo salvo com sucesso.</span>' +
            '<button type="button" class="k-btn k-btn-accent" data-save>Salvar Modelo</button>' +
          '</div>' +
        '</div>' +
        '<div class="k-preview-box">' +
          '<h4>Pré-visualização</h4>' +
          '<div class="k-preview-text" data-preview></div>' +
        '</div>' +
      '</div>';
  }

  function mount(el, options) {
    var opts = options || {};
    var samples = opts.samples || SAMPLES;
    var templates = JSON.parse(JSON.stringify(opts.templates || TEMPLATES));
    var tabs = opts.tabs || [
      { id: 'aprovacao', label: 'Aprovação' },
      { id: 'rejeicao', label: 'Rejeição' }
    ];
    var active = tabs[0].id;

    function render() {
      el.innerHTML = markup(tabs, active, templates[active]);
      renderPreview();
    }

    function renderPreview() {
      var parts = ['cabecalho', 'corpo', 'rodape'].map(function (part) {
        return templates[active][part];
      }).filter(Boolean).join('\n\n');
      el.querySelector('[data-preview]').textContent = substitute(parts, samples);
    }

    el.addEventListener('input', function (event) {
      var part = event.target.getAttribute && event.target.getAttribute('data-part');
      if (!part) { return; }
      templates[active][part] = event.target.value;
      el.querySelector('[data-saved]').hidden = true;
      renderPreview();
    });

    el.addEventListener('click', function (event) {
      var tab = event.target.closest('[data-tpl]');
      if (tab) { active = tab.getAttribute('data-tpl'); render(); return; }

      if (event.target.closest('[data-save]')) {
        el.querySelector('[data-saved]').hidden = false;
        if (typeof opts.onSave === 'function') { opts.onSave(active, templates[active]); }
      }
    });

    render();
    return { render: render, templates: function () { return templates; }, el: el };
  }

  var Composer = { mount: mount, markup: markup, substitute: substitute, TOKENS: TOKENS, SAMPLES: SAMPLES, TEMPLATES: TEMPLATES };
  global.Composer = Composer;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Composer; }
})(typeof window !== 'undefined' ? window : globalThis);
