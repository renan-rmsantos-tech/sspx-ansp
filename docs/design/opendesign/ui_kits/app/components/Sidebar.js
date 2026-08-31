/* Sidebar — grouped console navigation.
   Source: the <aside class="sidebar"> of admin.html, which groups items under
   uppercase section labels ("Dados", "Configurações") and marks the active item
   with --accent text on --accent-light.

   Sidebar.mount(el, { groups, active, onSelect }) -> { setActive } */
(function (global) {
  'use strict';

  var ICONS = {
    solicitacoes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    benfeitores: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    textos: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    contrato: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/>'
  };

  /* The default structure mirrors admin.html one-for-one. */
  var DEFAULT_GROUPS = [
    { label: 'Dados', items: [
      { id: 'solicitacoes', label: 'Solicitações', icon: 'solicitacoes' },
      { id: 'benfeitores', label: 'Benfeitores', icon: 'benfeitores' }
    ] },
    { label: 'Configurações', items: [
      { id: 'ano-letivo', label: 'Ano Letivo', icon: 'calendario' },
      { id: 'textos', label: 'Textos de Decisão', icon: 'textos' },
      { id: 'contrato', label: 'Modelo de Contrato', icon: 'contrato' }
    ] }
  ];

  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function markup(groups, active) {
    return '<div class="k-sidebar-inner">' + groups.map(function (group) {
      return '<div>' +
        '<div class="k-sidebar-label">' + group.label + '</div>' +
        '<nav class="k-sidebar-nav" aria-label="' + group.label + '">' +
          group.items.map(function (item) {
            return '<button type="button" class="k-sidebar-item' + (item.id === active ? ' is-active' : '') + '" ' +
              'data-view="' + item.id + '"' + (item.id === active ? ' aria-current="page"' : '') + '>' +
              icon(item.icon) + item.label + '</button>';
          }).join('') +
        '</nav>' +
      '</div>';
    }).join('') + '</div>';
  }

  function mount(el, options) {
    var opts = options || {};
    var groups = opts.groups || DEFAULT_GROUPS;
    var active = opts.active || groups[0].items[0].id;

    el.className = 'k-sidebar';
    el.innerHTML = markup(groups, active);

    el.addEventListener('click', function (event) {
      var button = event.target.closest('.k-sidebar-item');
      if (!button) { return; }
      setActive(button.getAttribute('data-view'));
      if (typeof opts.onSelect === 'function') { opts.onSelect(button.getAttribute('data-view')); }
    });

    function setActive(id) {
      active = id;
      el.querySelectorAll('.k-sidebar-item').forEach(function (button) {
        var on = button.getAttribute('data-view') === id;
        button.classList.toggle('is-active', on);
        if (on) { button.setAttribute('aria-current', 'page'); } else { button.removeAttribute('aria-current'); }
      });
    }

    return { setActive: setActive, el: el };
  }

  var Sidebar = { mount: mount, markup: markup, DEFAULT_GROUPS: DEFAULT_GROUPS, ICONS: ICONS };
  global.Sidebar = Sidebar;
  if (typeof module !== 'undefined' && module.exports) { module.exports = Sidebar; }
})(typeof window !== 'undefined' ? window : globalThis);
