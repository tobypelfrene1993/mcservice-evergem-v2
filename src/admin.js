const summaryEndpoint = '/api/analytics/summary';
const statusElement = document.querySelector('.analytics-status');
const statsElement = document.querySelector('[data-stats]');
const panelsElement = document.querySelector('[data-panels]');
const chartElement = document.querySelector('[data-chart]');
const pagesElement = document.querySelector('[data-pages]');
const rangeButtons = [...document.querySelectorAll('[data-range]')];

const numberFormatter = new Intl.NumberFormat('nl-BE');
const dateFormatter = new Intl.DateTimeFormat('nl-BE', { day: '2-digit', month: 'short' });
const statDefinitions = [
  ['unique_sessions', 'Bezoekers (sessies)'],
  ['pageviews', 'Paginaweergaven'],
  ['whatsapp_clicks', 'WhatsApp-klikken'],
  ['email_clicks', 'E-mailklikken'],
  ['phone_clicks', 'Telefoon-klikken'],
  ['trustpilot_clicks', 'Trustpilot-klikken'],
];

const safeRatio = (clicks, sessions) => sessions > 0 ? `${((clicks / sessions) * 100).toFixed(1).replace('.', ',')}%` : '0%';

const renderStats = (data) => {
  statsElement.innerHTML = statDefinitions.map(([key, label]) => `<article class="analytics-stat"><span>${label}</span><strong>${numberFormatter.format(data[key] || 0)}</strong></article>`).join('');
  statsElement.insertAdjacentHTML('beforeend', `<article class="analytics-stat analytics-stat-ratio"><span>WhatsApp klikratio</span><strong>${safeRatio(data.whatsapp_clicks, data.unique_sessions)}</strong><small>Klikken per browsersessie</small></article><article class="analytics-stat analytics-stat-ratio"><span>E-mail klikratio</span><strong>${safeRatio(data.email_clicks, data.unique_sessions)}</strong><small>Klikken per browsersessie</small></article>`);
};

const renderChart = (dailyStats) => {
  if (!dailyStats.length || dailyStats.every((day) => day.pageviews === 0)) {
    chartElement.innerHTML = '<p class="analytics-empty">Nog geen dagelijkse activiteit voor deze periode.</p>';
    return;
  }
  const max = Math.max(...dailyStats.map((day) => day.pageviews), 1);
  chartElement.innerHTML = `<div class="analytics-bars">${dailyStats.map((day) => {
    const height = Math.max((day.pageviews / max) * 100, day.pageviews ? 4 : 0);
    const label = dateFormatter.format(new Date(`${day.date}T00:00:00Z`));
    return `<div class="analytics-bar-item" title="${label}: ${day.pageviews} paginaweergaven"><span class="analytics-bar-value">${day.pageviews || ''}</span><i style="height:${height}%"></i><small>${label}</small></div>`;
  }).join('')}</div>`;
};

const renderPages = (topPages) => {
  if (!topPages.length) {
    pagesElement.innerHTML = '<p class="analytics-empty">Nog geen paginaweergaven voor deze periode.</p>';
    return;
  }
  pagesElement.innerHTML = `<ol>${topPages.map((page) => `<li><code>${page.path}</code><strong>${numberFormatter.format(page.pageviews)}</strong></li>`).join('')}</ol>`;
};

const loadSummary = async (range) => {
  statusElement.hidden = false;
  statusElement.textContent = 'Statistieken laden…';
  statsElement.hidden = true;
  panelsElement.hidden = true;
  try {
    const response = await fetch(`${summaryEndpoint}?range=${encodeURIComponent(range)}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    if (!response.ok) throw new Error('Onverwachte API-respons');
    const data = await response.json();
    renderStats(data);
    renderChart(data.daily_stats || []);
    renderPages(data.top_pages || []);
    statusElement.hidden = true;
    statsElement.hidden = false;
    panelsElement.hidden = false;
  } catch {
    statusElement.textContent = 'De statistieken konden momenteel niet worden geladen. Probeer het later opnieuw.';
  }
};

rangeButtons.forEach((button) => button.addEventListener('click', () => {
  rangeButtons.forEach((item) => item.classList.toggle('is-active', item === button));
  loadSummary(button.dataset.range);
}));

loadSummary('30d');
