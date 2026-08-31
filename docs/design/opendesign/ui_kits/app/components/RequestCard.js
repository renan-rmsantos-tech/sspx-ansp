/* RequestCard — an expandable scholarship request record.
   Source: solCardHtml() / solDetailHtml() / solTab() in admin.html.

   Closed: family name + status pill + meta row + export actions + chevron.
   Open:   four tabs — Resumo · Documentos · Financeiro · Decisão.

   Composes DecisionPanel for the fourth tab.

   RequestCard.markup(record) -> HTML string
   RequestCard.bind(root) — delegated toggle + tab switching for a whole list. */
(function (global) {
  'use strict';

  var DOC_LABELS = {
    rg_pai: 'RG do Pai', rg_mae: 'RG da Mãe', certidao: 'Certidão de Casamento',
    comprovante_endereco: 'Comprovante de Endereço', extrato_ir: 'Extrato IR',
    extrato_bancario: 'Extrato Bancário', rg_aluno: 'RG do Aluno',
    certidao_nascimento: 'Certidão de Nascimento'
  };
  var STATUS_LABEL = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }
  function date(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'; }
  function money(value) {
    var n = typeof value === 'number' ? value
      : parseFloat(String(value || '0').replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function field(key, value) {
    return '<div class="k-dfield"><span class="k">' + key + ': </span><span class="v">' +
      esc(value == null || value === '' ? '—' : value) + '</span></div>';
  }

  function summaryPanel(record) {
    var students = record.alunos || [];
    var html = '<div class="k-panel is-active" data-panel="resumo">' +
      '<div class="k-dsection"><h4>Dados do Solicitante</h4><div class="k-dfields">' +
      [['Pai', record.nome_pai], ['RG', record.rg_pai], ['CPF', record.cpf_pai],
       ['Profissão', record.profissao_pai], ['Mãe', record.nome_mae], ['CPF Mãe', record.cpf_mae],
       ['Profissão Mãe', record.profissao_mae], ['Escola', record.escola],
       ['Endereço', record.endereco], ['CEP', record.cep],
       ['Telefone', record.telefone], ['E-mail', record.email]]
        .map(function (pair) { return field(pair[0], pair[1]); }).join('') +
      '</div></div><div class="k-dsection"><h4>Alunos</h4>';

    if (students.length) {
      html += '<table class="k-table"><thead><tr><th>Nome</th><th>CPF</th><th>Série</th><th>Mensalidade</th></tr></thead><tbody>' +
        students.map(function (student) {
          return '<tr><td>' + esc(student.nome) + '</td><td>' + (student.cpf ? esc(student.cpf) : '—') +
            '</td><td>' + esc(student.serie) + '</td><td>' + money(student.mensalidade) + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else {
      html += '<p class="k-note">Nenhum aluno registrado.</p>';
    }
    return html + '</div></div>';
  }

  function documentsPanel(record) {
    var docs = record.documentos || [];
    var html = '<div class="k-panel" data-panel="documentos">';
    if (!docs.length) {
      return html + '<p class="k-note">Nenhum documento anexado a esta solicitação.</p></div>';
    }
    return html + docs.map(function (doc) {
      return '<div class="k-doc-row"><span class="cat">' + (DOC_LABELS[doc.categoria] || esc(doc.categoria)) +
        ':</span> <span>' + esc(doc.nome) + '</span>' +
        '<button type="button" class="k-btn-xs" data-doc="view">Visualizar</button>' +
        '<button type="button" class="k-btn-xs" data-doc="download">Baixar</button></div>';
    }).join('') + '</div>';
  }

  function financePanel(record) {
    var html = '<div class="k-panel" data-panel="financeiro">' +
      '<div class="k-dsection"><h4>Renda e Despesas</h4><div class="k-dfields">' +
      [['Renda do Pai', money(record.renda_pai)], ['Renda da Mãe', money(record.renda_mae)],
       ['Outras Rendas', money(record.renda_outros)], ['Pessoas no Domicílio', record.qtd_pessoas],
       ['Aluguel', money(record.desp_aluguel)], ['Serviços', money(record.desp_servicos)],
       ['Internet', money(record.desp_internet)],
       ['Desconto solicitado', (record.desconto_solicitado || '—') + '%']]
        .map(function (pair) { return field(pair[0], pair[1]); }).join('') +
      '</div></div>';

    var vehicles = record.veiculos || [];
    if (vehicles.length) {
      html += '<div class="k-dsection"><h4>Veículos</h4><ul class="k-note" style="list-style:none;">' +
        vehicles.map(function (v) {
          return '<li>' + esc(v.marca) + ' ' + esc(v.modelo) + ' (' + esc(v.ano) + ')</li>';
        }).join('') + '</ul></div>';
    }
    return html + '</div>';
  }

  function markup(record) {
    var decided = record.status !== 'pendente';
    var approved = record.status === 'aprovada';
    var students = (record.alunos || []).length;

    return '<div class="k-rec" data-id="' + record.id + '"><div class="k-rec-body"><div class="k-rec-top">' +
      '<button type="button" class="k-rec-main" data-toggle aria-expanded="false">' +
        '<div class="k-rec-name">' + esc(record.nome_pai) + ' &amp; ' + esc(record.nome_mae) +
          ' <span class="k-pill k-pill-' + record.status + '">' + (STATUS_LABEL[record.status] || record.status) + '</span></div>' +
        '<div class="k-rec-meta"><span>' + esc(record.escola) + '</span><span>' + date(record.data_envio) + '</span>' +
          '<span>' + students + ' aluno' + (students === 1 ? '' : 's') + '</span>' +
          '<span>Desconto: ' + esc(record.desconto_solicitado || '—') + '%</span></div>' +
      '</button>' +
      '<div class="k-rec-actions">' +
        '<button type="button" class="k-btn k-btn-outline" data-export="dados">Exportar Dados</button>' +
        (decided ? '<button type="button" class="k-btn k-btn-accent" data-export="decisao">Exportar Decisão</button>' : '') +
        (approved ? '<button type="button" class="k-btn k-btn-outline" data-export="contrato">Gerar Contrato</button>' : '') +
      '</div>' +
      '<button type="button" class="k-rec-chevron" data-toggle aria-label="Expandir">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</button>' +
      '</div></div><div class="k-rec-detail">' +
        '<div class="k-tabs">' +
          '<button type="button" class="k-tab is-active" data-tab="resumo">Resumo</button>' +
          '<button type="button" class="k-tab" data-tab="documentos">Documentos' +
            ((record.documentos || []).length ? '<span class="k-cnt">(' + record.documentos.length + ')</span>' : '') + '</button>' +
          '<button type="button" class="k-tab" data-tab="financeiro">Financeiro</button>' +
          '<button type="button" class="k-tab" data-tab="decisao">Decisão</button>' +
        '</div>' +
        summaryPanel(record) + documentsPanel(record) + financePanel(record) +
        '<div class="k-panel" data-panel="decisao">' + global.DecisionPanel.markup(record) + '</div>' +
      '</div></div>';
  }

  function bind(root, options) {
    var opts = options || {};

    root.addEventListener('click', function (event) {
      var toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        var card = toggle.closest('.k-rec');
        var open = card.classList.toggle('is-open');
        var main = card.querySelector('.k-rec-main');
        if (main) { main.setAttribute('aria-expanded', String(open)); }
        return;
      }

      var tab = event.target.closest('.k-tab');
      if (tab) {
        var detail = tab.closest('.k-rec-detail');
        detail.querySelectorAll('.k-tab').forEach(function (t) { t.classList.remove('is-active'); });
        detail.querySelectorAll('.k-panel').forEach(function (p) { p.classList.remove('is-active'); });
        tab.classList.add('is-active');
        detail.querySelector('.k-panel[data-panel="' + tab.getAttribute('data-tab') + '"]').classList.add('is-active');
        return;
      }

      var exportBtn = event.target.closest('[data-export]');
      if (exportBtn && typeof opts.onExport === 'function') {
        opts.onExport(exportBtn.closest('.k-rec').getAttribute('data-id'), exportBtn.getAttribute('data-export'));
      }
    });
  }

  var RequestCard = {
    markup: markup, bind: bind, money: money, date: date, esc: esc,
    DOC_LABELS: DOC_LABELS, STATUS_LABEL: STATUS_LABEL
  };
  global.RequestCard = RequestCard;
  if (typeof module !== 'undefined' && module.exports) { module.exports = RequestCard; }
})(typeof window !== 'undefined' ? window : globalThis);
