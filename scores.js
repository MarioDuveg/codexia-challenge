/**
 * CODEXIA / Marcador en modo de solo lectura.
 * Proyecto de scores separado del proyecto de preregistro del sitio.
 * Solo usa HTTP GET; no envía ni modifica calificaciones.
 */
(() => {
  'use strict';
  const SCORES_SUPABASE_URL = 'https://zgpfcmvjmjfaphtudmis.supabase.co';
  const SCORES_PUBLIC_KEY = 'sb_publishable_0uQxgvjB7S7eCSqssUlPnA_Brhj-zx7';
  const FIELDS = ['equipo', 'taller_1', 'taller_2', 'taller_3', 'taller_4', 'batalla_final', 'total'];
  const REFRESH_MS = 15_000;
  const REQUEST_TIMEOUT_MS = 12_000;
  const $ = (id) => document.getElementById(id);
  const elements = {
    rows: $('scoresRows'), podium: $('scoresPodium'), status: $('scoresStatus'),
    light: $('scoresLiveLight'), order: $('scoresOrder'), refresh: $('scoresRefresh'),
    updated: $('scoresUpdated'), teams: $('scoresTeams'),
    leader: $('scoresLeader'), topScore: $('scoresTopScore')
  };
  if (Object.values(elements).some((element) => !element)) return;

  let results = [];
  let hasLoaded = false;
  let isLoading = false;
  let fetchedAt = null;
  const formatScore = (value) => Number(value || 0).toLocaleString('es-MX', {maximumFractionDigits: 2});
  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  function sortedResults() {
    const field = elements.order.value === 'batalla_final' ? 'batalla_final' : 'total';
    return [...results].sort((a, b) => b[field] - a[field] || a.equipo - b.equipo);
  }

  function setStatus(message, kind = '') {
    elements.status.textContent = message;
    elements.light.classList.toggle('is-connected', kind === 'success');
    elements.light.classList.toggle('is-error', kind === 'error');
  }

  function createCell(text, className = '') {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function showMessage(message) {
    elements.rows.replaceChildren();
    const tr = document.createElement('tr');
    const cell = createCell(message, 'scores-empty');
    cell.colSpan = 8;
    tr.appendChild(cell);
    elements.rows.appendChild(tr);
    elements.podium.replaceChildren();
    const p = document.createElement('p');
    p.className = 'scores-placeholder';
    p.textContent = message;
    elements.podium.appendChild(p);
  }

  function makePodiumCard(entry, index, primaryField) {
    const card = document.createElement('article');
    card.className = 'scores-place';
    const place = document.createElement('span');
    place.className = 'scores-place-rank';
    place.textContent = ['01 // PRIMER LUGAR', '02 // SEGUNDO LUGAR', '03 // TERCER LUGAR'][index];
    const bottom = document.createElement('div');
    bottom.className = 'scores-place-bottom';
    const team = document.createElement('h3');
    team.className = 'scores-place-team';
    team.textContent = `EQUIPO ${entry.equipo}`;
    const points = document.createElement('div');
    points.className = 'scores-place-value';
    const score = document.createElement('strong');
    score.textContent = formatScore(entry[primaryField]);
    const label = document.createElement('small');
    label.textContent = primaryField === 'total' ? 'PUNTOS TOTALES' : 'BATALLA FINAL';
    points.append(score, label);
    bottom.append(team, points);
    card.append(place, bottom);
    return card;
  }

  function render() {
    const sorted = sortedResults();
    const primaryField = elements.order.value === 'batalla_final' ? 'batalla_final' : 'total';
    elements.teams.textContent = String(sorted.length);
    elements.leader.textContent = sorted.length ? `Equipo ${sorted[0].equipo}` : '—';
    elements.topScore.textContent = sorted.length ? formatScore(sorted[0][primaryField]) : '—';

    if (!sorted.length) {
      showMessage('Todavía no hay puntuaciones registradas. El marcador se actualizará automáticamente.');
      return;
    }

    elements.podium.replaceChildren(...sorted.slice(0, 3).map((entry, index) => makePodiumCard(entry, index, primaryField)));
    const fragment = document.createDocumentFragment();
    sorted.forEach((entry, index) => {
      const tr = document.createElement('tr');
      if (index === 0) tr.className = 'scores-first-place';
      tr.append(
        createCell(String(index + 1).padStart(2, '0'), 'scores-rank'),
        createCell(`Equipo ${entry.equipo}`, 'scores-team-name'),
        createCell(formatScore(entry.taller_1)),
        createCell(formatScore(entry.taller_2)),
        createCell(formatScore(entry.taller_3)),
        createCell(formatScore(entry.taller_4)),
        createCell(formatScore(entry.batalla_final), primaryField === 'batalla_final' ? 'scores-highlight' : ''),
        createCell(formatScore(entry.total), primaryField === 'total' ? 'scores-highlight' : '')
      );
      fragment.appendChild(tr);
    });
    elements.rows.replaceChildren(fragment);
  }

  async function refreshScores() {
    if (isLoading) return;
    isLoading = true;
    elements.refresh.disabled = true;
    if (!hasLoaded) setStatus('Consultando Supabase…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const url = new URL(`${SCORES_SUPABASE_URL}/rest/v1/scores`);
      url.searchParams.set('select', FIELDS.join(','));
      url.searchParams.set('order', 'equipo.asc');
      url.searchParams.set('limit', '1000');
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { apikey: SCORES_PUBLIC_KEY, Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) {
        const reason = (response.status === 401 || response.status === 403)
          ? 'Permisos de lectura (RLS) insuficientes en public.scores.'
          : response.status === 404
            ? 'No se encontró public.scores. Revisa la tabla y la API.'
            : `Error HTTP ${response.status}.`;
        throw new Error(reason);
      }
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('La API devolvió un formato inesperado.');
      results = data.filter((item) => Number.isInteger(Number(item.equipo)) && Number(item.equipo) > 0)
        .map((item) => ({
          equipo: Number(item.equipo),
          taller_1: toNumber(item.taller_1), taller_2: toNumber(item.taller_2),
          taller_3: toNumber(item.taller_3), taller_4: toNumber(item.taller_4),
          batalla_final: toNumber(item.batalla_final), total: toNumber(item.total)
        }));
      hasLoaded = true;
      fetchedAt = new Date();
      render();
      const stamp = fetchedAt.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
      setStatus(`${results.length} ${results.length === 1 ? 'equipo' : 'equipos'} · Datos actualizados`, 'success');
      elements.updated.textContent = `ÚLTIMA CONSULTA // ${stamp}`;
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'La consulta tardó demasiado. Vuelve a intentar.'
        : error instanceof TypeError
          ? 'Sin conexión con Supabase. Revisa Internet.'
          : error.message;
      setStatus(`No fue posible actualizar: ${message}`, 'error');
      if (!hasLoaded) showMessage('No fue posible cargar la clasificación. Pulsa «Actualizar» para reintentar.');
      // Si falla un refresco, conserva los últimos datos visibles y marca el error.
    } finally {
      clearTimeout(timeout);
      isLoading = false;
      elements.refresh.disabled = false;
    }
  }

  elements.order.addEventListener('change', render);
  elements.refresh.addEventListener('click', refreshScores);
  refreshScores();
  setInterval(() => { if (document.visibilityState === 'visible') refreshScores(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (!fetchedAt || Date.now() - fetchedAt.getTime() > REFRESH_MS)) refreshScores();
  });
})();
