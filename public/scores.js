'use strict';

// Toda la clasificación se consulta a través de /api/scores en el servidor
// de CODEXIA: la clave publicable de Supabase no se expone desde esta vista.
(function () {
  const root = document.querySelector('[data-scores-root]');
  if (!root) return;

  const ACTIVITIES = [
    { key:'total',         label:'TOTAL GENERAL', button:'TOTAL',         detail:'Suma de Talleres 1, 2, 3, 4 y Batalla final.' },
    { key:'taller_1',      label:'TALLER 1',      button:'TALLER 1',      detail:'Clasificación según la puntuación del Taller 1.' },
    { key:'taller_2',      label:'TALLER 2',      button:'TALLER 2',      detail:'Clasificación según la puntuación del Taller 2.' },
    { key:'taller_3',      label:'TALLER 3',      button:'TALLER 3',      detail:'Clasificación según la puntuación del Taller 3.' },
    { key:'taller_4',      label:'TALLER 4',      button:'TALLER 4',      detail:'Clasificación según la puntuación del Taller 4.' },
    { key:'batalla_final', label:'BATALLA FINAL', button:'BATALLA FINAL', detail:'Mejor calificación registrada en la Batalla final.' },
  ];
  const el = (id) => root.querySelector('#' + id);
  const filters = el('scoresFilters');
  const rows = el('scoresRows');
  const podium = el('scoresPodium');
  const status = el('scoresStatus');
  const numberFormat = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
  let selected = 'total';
  let scores = [];
  let hasLoaded = false;
  let requesting = false;
  let updatedAt = null;
  const overlay = document.getElementById('scoresOverlay');
  const openBtn = document.getElementById('scoresOpenBtn');
  const closeBtn = document.getElementById('scoresCloseBtn');
  let previouslyFocused = null;

  function points(team, key) {
    const n = Number(team[key]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function scoreRows(data, key) {
    // Recalcular puestos con soporte correcto para empates sucesivos.
    const ordered = data.map(team => ({ ...team, value: points(team, key) }))
      .sort((a, b) => b.value - a.value || Number(a.equipo) - Number(b.equipo));
    let lastValue = null;
    let lastRank = null;
    return ordered.map((team, index) => {
      if (team.value <= 0) return { ...team, rank: null };
      const rank = team.value === lastValue ? lastRank : index + 1;
      lastValue = team.value;
      lastRank = rank;
      return { ...team, rank };
    });
  }
  function formatPoints(value) {
    return numberFormat.format(value);
  }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function renderFilters() {
    filters.replaceChildren();
    ACTIVITIES.forEach(activity => {
      const button = make('button', 'scores-filter' + (activity.key === selected ? ' is-active' : ''), activity.button);
      button.type = 'button';
      button.dataset.activity = activity.key;
      button.setAttribute('aria-pressed', String(activity.key === selected));
      button.addEventListener('click', () => { selected = activity.key; renderFilters(); render(); });
      filters.append(button);
    });
  }
  function render() {
    const activity = ACTIVITIES.find(item => item.key === selected);
    const ranked = scoreRows(scores, selected);
    const active = ranked.filter(team => team.value > 0);
    const highest = active[0]?.value || 0;
    el('scoresActivityLabel').textContent = activity.label;
    el('scoresActivityDesc').textContent = activity.detail;
    el('scoresCount').textContent = String(active.length).padStart(2, '0');
    el('scoresHighest').textContent = active.length ? formatPoints(highest) : '—';

    podium.replaceChildren();
    for (const team of active.filter(team => team.rank <= 3).slice(0, 3)) {
      const card = make('div', 'scores-podium-card' + (team.rank === 1 ? ' is-first' : ''));
      card.append(make('span', 'scores-podium-rank', '#' + String(team.rank).padStart(2, '0')),
        make('strong', 'scores-podium-team', 'EQUIPO ' + String(team.equipo).padStart(2, '0')),
        make('span', 'scores-podium-points', formatPoints(team.value) + ' PTS'));
      podium.append(card);
    }
    podium.hidden = active.length === 0;

    rows.replaceChildren();
    if (!scores.length) {
      const tr = make('tr'); const td = make('td', 'scores-empty', hasLoaded ? 'Todavía no hay equipos registrados.' : 'Consultando Supabase...');
      td.colSpan = 4; tr.append(td); rows.append(tr);
      return;
    }
    for (const team of ranked) {
      const tr = make('tr', team.rank === 1 ? 'scores-leader' : team.rank === null ? 'scores-unranked' : '');
      tr.append(make('td', 'scores-rank', team.rank === null ? '—' : '#' + String(team.rank).padStart(2, '0')));
      tr.append(make('td', 'scores-team', 'EQUIPO ' + String(team.equipo).padStart(2, '0')));
      tr.append(make('td', 'scores-value', team.value ? formatPoints(team.value) + ' pts' : 'SIN PUNTOS'));
      const progress = make('td', 'scores-progress');
      const track = make('div', 'scores-progress-track');
      const fill = make('span', 'scores-progress-fill');
      fill.style.width = (highest ? Math.min(100, team.value / highest * 100) : 0) + '%';
      fill.setAttribute('aria-label', highest ? `${Math.round(team.value / highest * 100)} % respecto al primer lugar` : 'Sin puntuación');
      track.append(fill); progress.append(track); tr.append(progress);
      rows.append(tr);
    }
  }
  function visible() {
    return !overlay || !overlay.hidden;
  }
  async function refresh() {
    if (requesting || !visible()) return;
    requesting = true;
    status.textContent = 'ACTUALIZANDO...';
    try {
      const endpoint = root.dataset.supabaseEndpoint || '/api/scores';
      const headers = root.dataset.publishableKey ? {apikey: root.dataset.publishableKey} : {};
      const response = await fetch(endpoint, {cache:'no-store', headers});
      const payload = await response.json();
      const resultList = Array.isArray(payload) ? payload : payload.scores;
      if (!response.ok || !Array.isArray(resultList)) throw new Error(payload.error || payload.message || 'Respuesta inválida del servidor');
      scores = resultList.filter(team => Number.isInteger(Number(team.equipo)) && Number(team.equipo) >= 1);
      hasLoaded = true;
      updatedAt = new Date();
      render();
      status.textContent = 'ACTUALIZADO: ' + updatedAt.toLocaleTimeString('es-MX');
    } catch (error) {
      status.textContent = 'SIN CONEXIÓN · ' + (error.message || 'No se pudieron cargar los resultados');
    } finally { requesting = false; }
  }

  renderFilters();
  render();
  el('scoresRefreshBtn').addEventListener('click', refresh);
  if (overlay && openBtn && closeBtn) {
    function close() {
      overlay.hidden = true;
      document.body.classList.remove('scores-is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      (previouslyFocused || openBtn).focus();
    }
    openBtn.addEventListener('click', () => {
      previouslyFocused = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('scores-is-open');
      openBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
      refresh();
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', (event) => {
      if (overlay.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        const focusable = [...overlay.querySelectorAll('button:not(:disabled), a[href]')];
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  } else { refresh(); }
  setInterval(() => { if (visible() && !document.hidden) refresh(); }, 10000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible()) refresh(); });
})();
