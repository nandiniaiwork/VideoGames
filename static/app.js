/**
README (static/app.js)
- Drop this file into your Flask project's `static` directory as `app.js`.
- No external bundler required. Uses Chart.js from CDN included in the HTML.
- Implements:
  - Data fetching with in-memory cache and refresh
  - Filters (platforms, genres, year range), dark mode, export CSV
  - Top games table (search, sort, pagination)
  - Charts: line (year, optional 3-yr rolling avg), bar (platforms, genres), pie (regional)
  - Accessible, responsive UI updates without full re-renders

CSV Export note:
- This file exports the currently filtered dataset client-side.
- If you have a backend export, wire `exportCsvBtn` to `/api/export-csv?platforms=a,b&genres=c,d&start=YYYY&end=YYYY`
  and do a `window.location.href = url` to trigger a download (see function `exportCSV()` for example).
*/

/* Module Pattern: isolate scope and avoid globals */
const App = (() => {
  // DOM refs
  const els = {
    // Toolbar
    refreshBtn: document.getElementById('refreshBtn'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),

    // Filters
    platformSelect: document.getElementById('platformSelect'),
    genreSelect: document.getElementById('genreSelect'),
    yearStartRange: document.getElementById('yearStartRange'),
    yearEndRange: document.getElementById('yearEndRange'),
    yearStartInput: document.getElementById('yearStartInput'),
    yearEndInput: document.getElementById('yearEndInput'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),

    // Overview
    overviewCard: document.getElementById('overviewCard'),
    overviewRows: document.getElementById('overviewRows'),
    overviewCols: document.getElementById('overviewCols'),
    overviewSales: document.getElementById('overviewSales'),

    // Table
    topGamesCard: document.getElementById('topGamesCard'),
    searchInput: document.getElementById('searchInput'),
    sortSalesBtn: document.getElementById('sortSalesBtn'),
    sortYearBtn: document.getElementById('sortYearBtn'),
    topGamesTbody: document.getElementById('topGamesTbody'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageInfo: document.getElementById('pageInfo'),

    // Charts
    salesByYearCard: document.getElementById('salesByYearCard'),
    rollingAvgToggle: document.getElementById('rollingAvgToggle'),
    platformsCard: document.getElementById('platformsCard'),
    genresCard: document.getElementById('genresCard'),
    regionalCard: document.getElementById('regionalCard'),

    salesByYearCanvas: document.getElementById('salesByYearChart'),
    platformsCanvas: document.getElementById('platformsChart'),
    genresCanvas: document.getElementById('genresChart'),
    regionalCanvas: document.getElementById('regionalChart'),
  };

  // State
  const state = {
    cache: {
      overview: null,
      topGames: null,
      salesByYear: null, // kept for potential direct backend use (unused in filtered view)
      platforms: null,
      genres: null,
      regional: null,
    },
    filters: {
      platforms: new Set(),
      genres: new Set(),
      yearStart: 1980,
      yearEnd: 2025,
      search: '',
    },
    table: {
      page: 1,
      perPage: 10,
      sortKey: 'Global_Sales',
      sortDir: 'desc', // 'asc' or 'desc'
      hasImageColumn: false,
    },
    charts: {
      salesByYear: null,
      platforms: null,
      genres: null,
      regional: null,
    },
  };

  // Utils
  const fmt = {
    number(n) {
      return Intl.NumberFormat(undefined).format(n);
    },
    sales(n) {
      if (n == null || isNaN(n)) return '—';
      return `${Number(n).toFixed(2)} M`;
    },
  };

  const debounce = (fn, ms = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  const rollingAverage = (arr, windowSize = 3) => {
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const slice = arr.slice(start, i + 1);
      const avg = slice.reduce((sum, v) => sum + v, 0) / slice.length;
      out.push(avg);
    }
    return out;
  };

  // Fetch with simple in-memory cache
  async function fetchJSON(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function getCached(key, url) {
    if (state.cache[key]) return state.cache[key];
    const data = await fetchJSON(url);
    state.cache[key] = data;
    return data;
  }

  function invalidateCache() {
    Object.keys(state.cache).forEach(k => (state.cache[k] = null));
  }

  // Theme
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'auto';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (saved === 'auto' && prefersDark);
    document.body.classList.toggle('theme-dark', dark);
    els.darkModeToggle.checked = dark;
  }

  function toggleTheme() {
    const dark = els.darkModeToggle.checked;
    document.body.classList.toggle('theme-dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  // Loading/Error helpers per card
  function setCardLoading(cardEl, isLoading) {
    cardEl.setAttribute('aria-busy', String(isLoading));
    const loading = cardEl.querySelector('.loading');
    if (loading) loading.classList.toggle('hidden', !isLoading);
    const content = [...cardEl.children].find(c => c.classList && (c.classList.contains('overview-grid') || c.classList.contains('table-wrap') || c.classList.contains('chart-wrap')));
    if (content) content.classList.toggle('hidden', isLoading);
  }

  function setCardError(cardEl, message) {
    const err = cardEl.querySelector('.error');
    if (err) {
      err.textContent = message || 'Something went wrong. Please try again.';
      err.classList.toggle('hidden', !message);
    }
  }

  // Filters: populate options from data
  function populateFilterOptions() {
    const games = state.cache.topGames || [];
    const platforms = [...new Set(games.map(g => g.Platform).filter(Boolean))].sort();
    const genres = [...new Set(games.map(g => g.Genre).filter(Boolean))].sort();
    const years = games.map(g => parseInt(g.Year, 10)).filter(y => !isNaN(y));
    const minYear = years.length ? Math.min(...years) : 1980;
    const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();

    fillSelect(els.platformSelect, platforms);
    fillSelect(els.genreSelect, genres);

    [els.yearStartRange, els.yearEndRange, els.yearStartInput, els.yearEndInput].forEach(el => {
      el.min = String(minYear);
      el.max = String(maxYear);
    });

    if (state.filters.yearStart === 1980 && state.filters.yearEnd === 2025) {
      state.filters.yearStart = minYear;
      state.filters.yearEnd = maxYear;
    }
    setYearControls(state.filters.yearStart, state.filters.yearEnd);
  }

  function fillSelect(selectEl, values) {
    const selected = new Set(getMultiSelectValues(selectEl));
    selectEl.innerHTML = '';
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if (selected.has(v)) opt.selected = true;
      selectEl.appendChild(opt);
    });
  }

  function setYearControls(start, end) {
    els.yearStartRange.value = String(start);
    els.yearEndRange.value = String(end);
    els.yearStartInput.value = String(start);
    els.yearEndInput.value = String(end);
  }

  function getMultiSelectValues(selectEl) {
    return Array.from(selectEl.selectedOptions).map(o => o.value);
  }

  // Filtering logic
  function applyFiltersToGames() {
    const all = state.cache.topGames || [];
    const { platforms, genres, yearStart, yearEnd, search } = state.filters;
    const searchLower = search.trim().toLowerCase();
    const filtered = all.filter(g => {
      const year = parseInt(g.Year, 10);
      if (!isNaN(year) && (year < yearStart || year > yearEnd)) return false;
      if (platforms.size && !platforms.has(g.Platform)) return false;
      if (genres.size && !genres.has(g.Genre)) return false;
      if (searchLower && !(g.Name || '').toLowerCase().includes(searchLower)) return false;
      return true;
    });
    return filtered;
  }

  // Derive aggregates from filtered games
  function aggregateSalesByYear(filteredGames) {
    const yearToSales = new Map();
    filteredGames.forEach(g => {
      const y = parseInt(g.Year, 10);
      const s = Number(g.Global_Sales || 0);
      if (isNaN(y) || isNaN(s)) return;
      yearToSales.set(y, (yearToSales.get(y) || 0) + s);
    });
    const entries = [...yearToSales.entries()].sort((a, b) => a[0] - b[0]);
    return {
      labels: entries.map(([y]) => y),
      data: entries.map(([, s]) => s),
    };
  }

  function aggregateByKey(filteredGames, key) {
    const map = new Map();
    filteredGames.forEach(g => {
      const k = g[key];
      const s = Number(g.Global_Sales || 0);
      if (!k || isNaN(s)) return;
      map.set(k, (map.get(k) || 0) + s);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }

  function aggregateRegional(filteredGames) {
    const regions = ['NA_Sales', 'EU_Sales', 'JP_Sales', 'Other_Sales'];
    const totals = { NA_Sales: 0, EU_Sales: 0, JP_Sales: 0, Other_Sales: 0 };
    filteredGames.forEach(g => {
      regions.forEach(r => {
        const val = Number(g[r] || 0);
        if (!isNaN(val)) totals[r] += val;
      });
    });
    return totals;
  }

  // Overview
  async function renderOverview() {
    const card = els.overviewCard;
    setCardError(card, '');
    setCardLoading(card, true);
    try {
      const data = await getCached('overview', '/api/overview');
      els.overviewRows.textContent = fmt.number(data.rows ?? data.count ?? 0);
      els.overviewCols.textContent = fmt.number(data.columns ?? 0);
      const tgs = data.total_global_sales ?? data.total ?? 0;
      els.overviewSales.textContent = fmt.sales(tgs);
      card.querySelector('.overview-grid').classList.remove('hidden');
    } catch (e) {
      setCardError(card, 'Failed to load overview.');
    } finally {
      setCardLoading(card, false);
    }
  }

  // Table: sorting, pagination, rendering
  function sortGames(games) {
    const { sortKey, sortDir } = state.table;
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'Year') {
      return [...games].sort((a, b) => {
        const va = parseInt(a.Year, 10);
        const vb = parseInt(b.Year, 10);
        if (isNaN(va) && isNaN(vb)) return 0;
        if (isNaN(va)) return 1;
        if (isNaN(vb)) return -1;
        return (va - vb) * dir;
      });
    }
    return [...games].sort((a, b) => {
      const va = Number(a[sortKey] ?? 0);
      const vb = Number(b[sortKey] ?? 0);
      if (isNaN(va) || isNaN(vb)) return 0;
      return (va - vb) * dir;
    });
  }

  function renderTable() {
    const card = els.topGamesCard;
    setCardError(card, '');
    setCardLoading(card, false);

    const filtered = applyFiltersToGames();
    const sorted = sortGames(filtered);

    state.table.hasImageColumn = sorted.some(g => !!g.Image_URL);
    const thead = card.querySelector('thead tr');
    syncTableHeader(thead);

    const { page, perPage } = state.table;
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    if (page > totalPages) state.table.page = totalPages;

    const start = (state.table.page - 1) * perPage;
    const pageItems = sorted.slice(start, start + perPage);

    els.topGamesTbody.innerHTML = '';
    pageItems.forEach((g, i) => {
      const tr = document.createElement('tr');

      const idx = document.createElement('td');
      idx.textContent = String(start + i + 1);
      tr.appendChild(idx);

      const name = document.createElement('td');
      name.textContent = g.Name ?? '—';
      tr.appendChild(name);

      const platform = document.createElement('td');
      platform.textContent = g.Platform ?? '—';
      tr.appendChild(platform);

      const genre = document.createElement('td');
      genre.textContent = g.Genre ?? '—';
      tr.appendChild(genre);

      const year = document.createElement('td');
      year.textContent = g.Year ?? '—';
      tr.appendChild(year);

      const sales = document.createElement('td');
      sales.textContent = fmt.sales(g.Global_Sales);
      tr.appendChild(sales);

      els.topGamesTbody.appendChild(tr);
    });

    els.pageInfo.textContent = `Page ${state.table.page} of ${totalPages}`;
    els.prevPageBtn.disabled = state.table.page <= 1;
    els.nextPageBtn.disabled = state.table.page >= totalPages;

    card.querySelector('.table-wrap').classList.remove('hidden');
  }

  function syncTableHeader(theadRow) {
    // Placeholder for dynamic columns if needed in future (e.g., thumbnail).
  }

  async function initTable() {
    const card = els.topGamesCard;
    setCardError(card, '');
    setCardLoading(card, true);
    try {
      await getCached('topGames', '/api/top-games');
      populateFilterOptions();
      renderTable();
    } catch (e) {
      setCardError(card, 'Failed to load top games.');
    } finally {
      setCardLoading(card, false);
    }
  }

  // Charts
  function chartColors(count) {
    const base = [
      '#5865f2', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
      '#84cc16', '#f97316', '#10b981', '#eab308', '#3b82f6', '#a855f7'
    ];
    if (count <= base.length) return base.slice(0, count);
    const colors = [];
    for (let i = 0; i < count; i++) colors.push(base[i % base.length]);
    return colors;
  }

  function destroyChartIfExists(key) {
    if (state.charts[key]) {
      state.charts[key].destroy();
      state.charts[key] = null;
    }
  }

  function renderSalesByYearChart() {
    const card = els.salesByYearCard;
    setCardError(card, '');
    setCardLoading(card, false);

    const filtered = applyFiltersToGames();
    // If no active filters, prefer backend /api/sales-by-year so chart always renders
    let labels = [];
    let data = [];
    const noFilters = !state.filters.platforms.size && !state.filters.genres.size && !state.filters.search;
    if (noFilters && Array.isArray(state.cache.salesByYear) && state.cache.salesByYear.length) {
      const series = state.cache.salesByYear;
      labels = series.map(d => d.year);
      data = series.map(d => Number(d.sales || 0));
    } else {
      const agg = aggregateSalesByYear(filtered);
      labels = agg.labels;
      data = agg.data;
    }

    const showRolling = els.rollingAvgToggle.checked;
    const rolling = showRolling ? rollingAverage(data, 3) : null;

    destroyChartIfExists('salesByYear');
    const ctx = els.salesByYearCanvas.getContext('2d');

    state.charts.salesByYear = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Global Sales (M)',
            data,
            borderColor: '#5865f2',
            backgroundColor: 'rgba(88,101,242,0.2)',
            tension: 0.25,
            borderWidth: 3,
            pointRadius: 0,
            pointHitRadius: 8,
            fill: true,
          },
          ...(showRolling ? [{
            label: '3-yr Rolling Avg (M)',
            data: rolling,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.15)',
            borderDash: [6, 4],
            tension: 0.25,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          }] : [])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ` ${fmt.sales(ctx.parsed.y)}` } },
        },
        scales: {
          x: { title: { display: true, text: 'Year' } },
          y: { title: { display: true, text: 'Sales (Millions)' }, beginAtZero: true }
        }
      }
    });

    card.querySelector('.chart-wrap').classList.remove('hidden');
  }

  function renderBarChartFromPairs(card, canvas, key, pairs, axisTitle) {
    setCardError(card, '');
    setCardLoading(card, false);
    destroyChartIfExists(key);

    const labels = pairs.map(([k]) => k);
    const data = pairs.map(([, v]) => v);
    const colors = chartColors(labels.length);

    const ctx = canvas.getContext('2d');
    state.charts[key] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Sales (M)', data, backgroundColor: colors, borderColor: '#00000010', borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${fmt.sales(c.parsed.y)}` } },
        },
        scales: {
          x: { title: { display: true, text: axisTitle } },
          y: { title: { display: true, text: 'Sales (Millions)' }, beginAtZero: true }
        }
      }
    });

    card.querySelector('.chart-wrap').classList.remove('hidden');
  }

  function renderPieChart(card, canvas, key, dataMap) {
    setCardError(card, '');
    setCardLoading(card, false);
    destroyChartIfExists(key);

    const labels = ['NA', 'EU', 'JP', 'Other'];
    const data = [dataMap.NA_Sales, dataMap.EU_Sales, dataMap.JP_Sales, dataMap.Other_Sales].map(v => Number(v || 0));
    const colors = chartColors(labels.length);

    const ctx = canvas.getContext('2d');
    state.charts[key] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' },
          tooltip: { callbacks: { label: c => ` ${labels[c.dataIndex]}: ${fmt.sales(c.parsed)}` } },
        }
      }
    });

    card.querySelector('.chart-wrap').classList.remove('hidden');
  }

  function renderAllCharts() {
    // Sales by year (derived)
    renderSalesByYearChart();

    // Platforms bar (derived)
    const filtered = applyFiltersToGames();
    const platformPairs = aggregateByKey(filtered, 'Platform');
    renderBarChartFromPairs(els.platformsCard, els.platformsCanvas, 'platforms', platformPairs, 'Platform');

    // Genres bar (derived)
    const genrePairs = aggregateByKey(filtered, 'Genre');
    renderBarChartFromPairs(els.genresCard, els.genresCanvas, 'genres', genrePairs, 'Genre');

    // Regional pie (derived)
    const regionalTotals = aggregateRegional(filtered);
    renderPieChart(els.regionalCard, els.regionalCanvas, 'regional', regionalTotals);
  }

  // Export CSV
  function toCSV(rows) {
    if (!rows.length) return 'Name,Platform,Genre,Year,Global_Sales,NA_Sales,EU_Sales,JP_Sales,Other_Sales\n';
    const cols = ['Name','Platform','Genre','Year','Global_Sales','NA_Sales','EU_Sales','JP_Sales','Other_Sales'];
    const esc = v => {
      if (v == null) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = cols.join(',');
    const lines = rows.map(r => cols.map(c => esc(r[c])).join(','));
    return [header, ...lines].join('\n');
  }

  function exportCSV() {
    const filtered = sortGames(applyFiltersToGames());
    // Client-side download
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const platformStr = [...state.filters.platforms].join('-') || 'all';
    const genreStr = [...state.filters.genres].join('-') || 'all';
    a.download = `vgsales_${platformStr}_${genreStr}_${state.filters.yearStart}-${state.filters.yearEnd}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Backend alternative (example):
    // const params = new URLSearchParams({
    //   platforms: [...state.filters.platforms].join(','),
    //   genres: [...state.filters.genres].join(','),
    //   start: state.filters.yearStart,
    //   end: state.filters.yearEnd,
    //   search: state.filters.search
    // });
    // window.location.href = `/api/export-csv?${params.toString()}`;
  }

  // Event bindings
  function bindEvents() {
    // Theme
    els.darkModeToggle.addEventListener('change', toggleTheme);

    // Refresh
    els.refreshBtn.addEventListener('click', async () => {
      invalidateCache();
      setCardLoading(els.topGamesCard, true);
      setCardLoading(els.overviewCard, true);
      try {
        await Promise.all([
          getCached('topGames', '/api/top-games'),
          getCached('overview', '/api/overview'),
        ]);
      } catch (e) {}
      populateFilterOptions();
      renderOverview();
      state.table.page = 1;
      renderTable();
      renderAllCharts();
    });

    // Export
    els.exportCsvBtn.addEventListener('click', exportCSV);

    // Filters: selects
    const onSelectChange = () => {
      state.filters.platforms = new Set(getMultiSelectValues(els.platformSelect));
      state.filters.genres = new Set(getMultiSelectValues(els.genreSelect));
      state.table.page = 1;
      renderTable();
      renderAllCharts();
    };
    els.platformSelect.addEventListener('change', onSelectChange);
    els.genreSelect.addEventListener('change', onSelectChange);

    // Year sliders/inputs sync
    const clampYears = () => {
      let start = Math.min(parseInt(els.yearStartRange.value, 10), parseInt(els.yearEndRange.value, 10));
      let end = Math.max(parseInt(els.yearStartRange.value, 10), parseInt(els.yearEndRange.value, 10));
      if (isNaN(start) || isNaN(end)) return;
      state.filters.yearStart = start;
      state.filters.yearEnd = end;
      setYearControls(start, end);
    };

    const applyYearChange = debounce(() => {
      state.table.page = 1;
      renderTable();
      renderAllCharts();
    }, 150);

    [els.yearStartRange, els.yearEndRange].forEach(el => {
      el.addEventListener('input', () => {
        clampYears();
      });
      el.addEventListener('change', () => {
        clampYears();
        applyYearChange();
      });
    });

    [els.yearStartInput, els.yearEndInput].forEach(el => {
      el.addEventListener('change', () => {
        let start = parseInt(els.yearStartInput.value, 10);
        let end = parseInt(els.yearEndInput.value, 10);
        if (isNaN(start) || isNaN(end)) return;
        if (start > end) [start, end] = [end, start];
        state.filters.yearStart = start;
        state.filters.yearEnd = end;
        setYearControls(start, end);
        applyYearChange();
      });
    });

    // Clear filters
    els.clearFiltersBtn.addEventListener('click', () => {
      state.filters.platforms.clear();
      state.filters.genres.clear();
      els.platformSelect.selectedIndex = -1;
      els.genreSelect.selectedIndex = -1;

      const games = state.cache.topGames || [];
      const years = games.map(g => parseInt(g.Year, 10)).filter(y => !isNaN(y));
      state.filters.yearStart = years.length ? Math.min(...years) : 1980;
      state.filters.yearEnd = years.length ? Math.max(...years) : new Date().getFullYear();
      setYearControls(state.filters.yearStart, state.filters.yearEnd);

      state.filters.search = '';
      els.searchInput.value = '';

      state.table.page = 1;
      renderTable();
      renderAllCharts();
    });

    // Search
    els.searchInput.addEventListener('input', debounce(() => {
      state.filters.search = els.searchInput.value || '';
      state.table.page = 1;
      renderTable();
      renderAllCharts();
    }, 200));

    // Sort
    els.sortSalesBtn.addEventListener('click', () => {
      if (state.table.sortKey === 'Global_Sales') {
        state.table.sortDir = state.table.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.table.sortKey = 'Global_Sales';
        state.table.sortDir = 'desc';
      }
      renderTable();
    });
    els.sortYearBtn.addEventListener('click', () => {
      if (state.table.sortKey === 'Year') {
        state.table.sortDir = state.table.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.table.sortKey = 'Year';
        state.table.sortDir = 'desc';
      }
      renderTable();
    });

    // Pagination
    els.prevPageBtn.addEventListener('click', () => {
      if (state.table.page > 1) {
        state.table.page -= 1;
        renderTable();
      }
    });
    els.nextPageBtn.addEventListener('click', () => {
      state.table.page += 1;
      renderTable();
    });

    // Rolling average toggle
    els.rollingAvgToggle.addEventListener('change', renderSalesByYearChart);
  }

  // Init
  async function init() {
    initTheme();
    // Initial loads
    setCardLoading(els.overviewCard, true);
    setCardLoading(els.topGamesCard, true);
    setCardLoading(els.salesByYearCard, true);
    setCardLoading(els.platformsCard, true);
    setCardLoading(els.genresCard, true);
    setCardLoading(els.regionalCard, true);

    try {
      await Promise.all([
        getCached('overview', '/api/overview'),
        getCached('topGames', '/api/top-games'),
      ]);
    } catch (e) {}

    populateFilterOptions();
    renderOverview();
    await initTable();
    renderAllCharts();

    bindEvents();
  }

  // Expose init only
  return { init };
})();

window.addEventListener('DOMContentLoaded', App.init);


