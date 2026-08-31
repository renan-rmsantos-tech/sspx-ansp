/* StatBoard — the four status counters above the request list.
   Source: renderSolStats() in admin.html. These are filter *controls*, not
   decoration: clicking one sets the list filter, and the active card switches to
   --accent border on --accent-light.

   StatBoard.mount(el, { onFilter }) -> { render, setFilter } */
(function (global) {
  'use strict';

  var ITEMS = [
    { id: 'todos', label: 'Total', tone: 'total' },
    { id: 'pendente', label: 'Pendentes', tone: 'pendente' },
    { id: 'aprovada', label: 'Aprovadas', tone: 'aprovada' },
    { id: 'rejeitada', label: 'Rejeitadas', tone: 'rejeitada' }
  ];

  function counts(records) {
    var out = { todos: records.length, pendente: 0, aprovada: 0, rejeitada: 0 };
    records.forEach(function (record) {
      if (out[record.status] != null) { out[record.status] += 1; }
    });
    return out;
  }

  function markup(records, filter) {
    var totals = counts(records);
    return ITEMS.map(function (item) {
      return '<button type="button" class="k-stat' + (filter === item.id ? ' is-active' : '') + '" ' +
        'data-filter="' + item.id + '" aria-pressed="' + (filter === item.id) + '">' +
        '<div class="k-stat-label">' + item.label + '</div>' +
        '<div class="k-stat-value ' + item.tone + '">' + totals[item.id] + '</div>' +
      '</button>';
    }).join('');
  }

  function mount(el, options) {
    var opts = options || {};
    var filter = opts.filter || 'todos';
    var records = opts.records || [];

    el.className = 'k-stats';

    el.addEventListener('click', function (event) {
      var button = event.target.closest('.k-stat');
      if (!button) { return; }
      filter = button.getAttribute('data-filter');
      render(records);
      if (typeof opts.onFilter === 'function') { opts.onFilter(filter); }
    });

    function render(nextRecords) {
      if (nextRecords) { records = nextRecords; }
      el.innerHTML = markup(records, filter);
    }

    function setFilter(next) { filter = next; render(); }

    render(records);
    return { render: render, setFilter: setFilter, counts: function () { return counts(records); }, el: el };
  }

  var StatBoard = { mount: mount, markup: markup, counts: counts, ITEMS: ITEMS };
  global.StatBoard = StatBoard;
  if (typeof module !== 'undefined' && module.exports) { module.exports = StatBoard; }
})(typeof window !== 'undefined' ? window : globalThis);
