/* DecisionPanel — the approve / reject flow inside a request card.
   Source: decisionPanelHtml(), decMode(), aprovar(), rejeitar() in admin.html.

   Three states:
     idle     — one instruction line + Aprovar / Rejeitar
     form     — a --cream form; approval pre-fills the requested discount,
                rejection leads with "esta ação é definitiva"
     decided  — read-only summary (status, granted discount, reason, date)

   DecisionPanel.markup(record) -> HTML string
   DecisionPanel.bind(root, { getRecord, onDecide }) — delegated, works for a
   whole list at once. */
(function (global) {
  'use strict';

  var LABEL = { pendente: 'Pendente', aprovada: 'Aprovada', rejeitada: 'Rejeitada' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char];
    });
  }

  function formatDate(iso) {
    if (!iso) { return '—'; }
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  function markup(record) {
    if (record.status === 'pendente') {
      return '<div class="k-decision" data-decision="' + record.id + '">' +
        '<div class="k-decision-idle">' +
          '<p>Analise os documentos e dados financeiros antes de decidir.</p>' +
          '<button type="button" class="k-btn k-btn-success" data-decide="approve" data-id="' + record.id + '">Aprovar</button>' +
          '<button type="button" class="k-btn k-btn-danger" data-decide="reject" data-id="' + record.id + '">Rejeitar</button>' +
        '</div></div>';
    }
    var html = '<div class="k-decision" data-decision="' + record.id + '"><div class="k-decision-info">' +
      '<span>Status: <span class="' + (record.status === 'aprovada' ? 'ok' : 'no') + '">' +
        (LABEL[record.status] || record.status) + '</span></span>';
    if (record.desconto_concedido != null && record.desconto_concedido !== '') {
      html += '<span>Desconto concedido: ' + esc(record.desconto_concedido) + '%</span>';
    }
    if (record.motivo) { html += '<span>Motivo: ' + esc(record.motivo) + '</span>'; }
    if (record.data_decisao) { html += '<span>Data: ' + formatDate(record.data_decisao) + '</span>'; }
    return html + '</div></div>';
  }

  function formMarkup(record, mode) {
    var isApprove = mode === 'approve';
    var html = '<div class="k-decision-form">' +
      '<h5>' + (isApprove ? 'Aprovar Solicitação' : 'Rejeitar Solicitação') + '</h5>';
    if (!isApprove) {
      html += '<p class="warn">Esta ação é definitiva. A família será notificada da rejeição.</p>';
    }
    if (isApprove) {
      html += '<label for="dec-pct-' + record.id + '">Desconto (%)</label>' +
        '<input type="number" min="0" max="100" id="dec-pct-' + record.id + '" ' +
        'value="' + esc(record.desconto_solicitado || '') + '">';
    }
    html += '<label for="dec-mot-' + record.id + '">Motivo (opcional)</label>' +
      '<textarea id="dec-mot-' + record.id + '"></textarea>' +
      '<p class="k-decision-error" id="dec-err-' + record.id + '" role="alert" hidden></p>' +
      '<div class="row-actions">' +
        '<button type="button" class="k-btn ' + (isApprove ? 'k-btn-success' : 'k-btn-danger') + '" ' +
          'data-confirm="' + mode + '" data-id="' + record.id + '">' +
          (isApprove ? 'Confirmar aprovação' : 'Confirmar rejeição') + '</button>' +
        '<button type="button" class="k-btn" data-cancel="' + record.id + '">Cancelar</button>' +
      '</div></div>';
    return html;
  }

  function bind(root, options) {
    var opts = options || {};

    root.addEventListener('click', function (event) {
      var start = event.target.closest('[data-decide]');
      if (start) {
        var record = opts.getRecord(start.getAttribute('data-id'));
        var host = root.querySelector('[data-decision="' + record.id + '"]');
        host.innerHTML = formMarkup(record, start.getAttribute('data-decide'));
        var first = host.querySelector('input, textarea');
        if (first) { first.focus(); }
        return;
      }

      var cancel = event.target.closest('[data-cancel]');
      if (cancel) {
        var cancelled = opts.getRecord(cancel.getAttribute('data-cancel'));
        var cancelHost = root.querySelector('[data-decision="' + cancelled.id + '"]');
        cancelHost.outerHTML = markup(cancelled);
        return;
      }

      var confirmBtn = event.target.closest('[data-confirm]');
      if (!confirmBtn) { return; }

      var id = confirmBtn.getAttribute('data-id');
      var mode = confirmBtn.getAttribute('data-confirm');
      var target = opts.getRecord(id);
      var reason = (document.getElementById('dec-mot-' + id) || {}).value || '';
      var patch = { motivo: reason.trim(), data_decisao: new Date().toISOString() };

      if (mode === 'approve') {
        var raw = (document.getElementById('dec-pct-' + id) || {}).value;
        var pct = Number(raw);
        if (raw === '' || isNaN(pct) || pct < 0 || pct > 100) {
          var errorEl = document.getElementById('dec-err-' + id);
          errorEl.textContent = 'Desconto deve ser um número entre 0 e 100.';
          errorEl.hidden = false;
          document.getElementById('dec-pct-' + id).focus();
          return;
        }
        patch.status = 'aprovada';
        patch.desconto_concedido = String(pct);
      } else {
        patch.status = 'rejeitada';
      }

      if (typeof opts.onDecide === 'function') { opts.onDecide(target.id, patch); }
    });
  }

  var DecisionPanel = { markup: markup, formMarkup: formMarkup, bind: bind, LABEL: LABEL };
  global.DecisionPanel = DecisionPanel;
  if (typeof module !== 'undefined' && module.exports) { module.exports = DecisionPanel; }
})(typeof window !== 'undefined' ? window : globalThis);
