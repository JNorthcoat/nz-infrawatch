import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { loadAll } from './state.js';

const BASE_URL = import.meta.env.BASE_URL;

// ── DATA ──
let PIPELINE, ELECTION, NEWS;

// ── CONSTANTS ──
const PARTY_COLORS = {
  'National':    '#00529F',
  'Labour':      '#D82A20',
  'Green':       '#098137',
  'ACT':         '#C8A800',
  'NZ First':    '#555555',
  'Te Pāti Māori': '#B2001A',
  'TOP':         '#09B1A3',
};

const SECTOR_COLORS = {
  transport:     '#3b82f6',
  water:         '#06b6d4',
  education:     '#8b5cf6',
  health:        '#ef4444',
  housing:       '#f97316',
  energy:        '#22c55e',
  telecom:       '#6366f1',
  other:         '#6b7280',
};

const SECTOR_ICONS = {
  transport: '🚇',
  water:     '💧',
  education: '🎓',
  health:    '🏥',
  housing:   '🏘',
  energy:    '⚡',
  telecom:   '📡',
  other:     '🏗',
};

const RISK_CONFIG = {
  extreme: { label: '🔴 EXTREME', cls: 'risk-extreme', color: '#DC2626' },
  high:    { label: '🟠 HIGH',    cls: 'risk-high',    color: '#EA580C' },
  medium:  { label: '🟡 MEDIUM', cls: 'risk-medium',  color: '#D97706' },
  low:     { label: '🟢 LOW',    cls: 'risk-low',     color: '#16A34A' },
  safe:    { label: '⚪ SAFE',   cls: 'risk-safe',    color: '#6B7280' },
};

const STATUS_LIST   = ['Under Construction', 'Planning', 'Cancelled', 'Complete'];
const SECTOR_LIST   = ['transport','water','energy','health','housing','education','telecom','other'];
const RISK_LIST     = ['extreme','high','medium','low','safe'];

// ── TRANSPORT CORRIDORS ── (lat/lon pairs)
const CORRIDORS = {
  1:  { line: [ [-36.8442,174.7653],[-36.8479,174.7632],[-36.8540,174.7620],[-36.8688,174.7636] ] }, // City Rail Link
  2:  { line: [ [-36.8479,174.7632],[-36.8600,174.7540],[-36.8850,174.7450],[-36.9600,174.7850],[-37.0082,174.7915] ] }, // Auckland Light Rail
  3:  { line: [ [-36.8888,174.8753],[-36.9100,174.9000],[-36.9250,174.9200],[-36.9430,174.9100] ] }, // Eastern Busway
  4:  { line: [ [-36.6190,174.7450],[-36.6200,174.7300],[-36.6200,174.7100],[-36.6200,174.6900] ] }, // Penlink
  5:  { line: [ [-37.0000,174.8800],[-37.0300,174.9050],[-37.0700,174.9350] ] }, // Mill Road
  6:  { line: [ [-37.5000,175.1350],[-37.5300,175.1500],[-37.5600,175.1650],[-37.6000,175.1800] ] }, // Waikato Expressway (Huntly)
  7:  { line: [ [-37.6200,176.0350],[-37.6500,176.0700],[-37.6800,176.0950],[-37.7100,176.1100] ] }, // Tauranga Northern Link
  15: { line: [ [-43.5000,172.6260],[-43.4750,172.6250],[-43.4580,172.6300] ] }, // Christchurch Northern Corridor
  24: { line: [ [-37.7200,175.2500],[-37.7600,175.2200],[-37.8000,175.2300],[-37.8400,175.2900],[-37.8100,175.3600] ] }, // Hamilton Bypass
  25: { line: [ [-40.7500,175.1400],[-40.6500,175.2000],[-40.5700,175.2800],[-40.4900,175.3400] ] }, // Ōtaki–N.Wellington
  26: { line: [ [-36.5050,174.6820],[-36.4550,174.6700],[-36.4000,174.6700],[-36.3620,174.6750] ] }, // Pūhoi–Warkworth
  32: { line: [ [-41.2950,174.0050],[-41.5100,173.9600],[-41.9000,173.9600],[-42.4000,173.6800],[-43.1000,172.7000],[-43.5310,172.6385] ] }, // South Island Rail
  34: { line: [ [-36.3620,174.6750],[-36.1500,174.5800],[-35.9000,174.4200],[-35.8000,174.3900],[-35.7250,174.3240] ] }, // Northland RoNS
  37: { line: [ [-41.2800,174.7800],[-41.2950,174.0050] ], dashArray: '10,7' }, // Cook Strait ferries
  40: { line: [ [-36.3620,174.6750],[-36.2200,174.6300],[-36.1200,174.5700],[-36.0200,174.5200] ] }, // Ara Tūhono
  42: { line: [ [-37.7000,176.1700],[-37.8200,176.2000],[-37.9500,176.2200],[-38.0700,176.1900],[-38.1368,176.2497] ] }, // BOP Expressway
};

// ── STATE ──
let ST = {
  sectors:    new Set(SECTOR_LIST),
  statuses:   new Set(STATUS_LIST),
  risks:      new Set(RISK_LIST),
  region:     '',
  minValue:   0,
  searchQ:    '',
  selId:      null,
  showRiskView: false,
  layers: {
    electorates: false,
    maori:       false,
    councils:    false,
    regions:     false,
    marginal:    false,
  },
};

let map, leafletMarkers = {}, corridorLayers = {};
let electorateLayer, maoriLayer, councilLayer, regionLayer, marginalLayer;

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
export async function _boot() {
  const data = await loadAll();
  PIPELINE = data.PIPELINE;
  ELECTION = data.ELECTION;
  NEWS      = data.NEWS;

  initMap();
  buildSectorBtns();
  buildStatusBtns();
  buildRiskBtns();
  renderMarkers();
  buildProjList();
  updateCount();
  buildNews();
  restoreFromHash();

  Object.assign(window, {
    applyFilters, toggleLayer, toggleRiskView,
    toggleMobileNav, toggleMobileSidebar, dismissBanner,
    openNews, openSources, closeModal,
    onValueSlider, onSearch, selFromList,
  });
}

// ─────────────────────────────────────────────
// MAP
// ─────────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: [-41.0, 174.0],
    zoom: 6,
    minZoom: 5,
    maxZoom: 18,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  }).addTo(map);

  // Panes for z-ordering
  map.createPane('regionsPane').style.zIndex    = 300;
  map.createPane('councilsPane').style.zIndex   = 310;
  map.createPane('electoratesPane').style.zIndex= 400;
  map.createPane('markersPane').style.zIndex    = 650;
}

// ─────────────────────────────────────────────
// FILTERING
// ─────────────────────────────────────────────
function filtered() {
  const q = ST.searchQ.toLowerCase();
  return PIPELINE.filter(p => {
    if (!ST.sectors.has(p.sector)) return false;
    if (!ST.statuses.has(p.status)) return false;
    if (!ST.risks.has(p.electionRisk || 'safe')) return false;
    if (ST.region && p.region !== ST.region) return false;
    if (p.estimatedCost < ST.minValue) return false;
    if (q) {
      const hay = `${p.name} ${p.org} ${p.region} ${p.sector} ${p.status}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ─────────────────────────────────────────────
// MARKERS
// ─────────────────────────────────────────────
function markerRadius(cost) {
  return Math.max(8, Math.min(40, Math.sqrt(cost / 100) * 2.5));
}

function renderMarkers() {
  // Clear existing
  Object.values(leafletMarkers).forEach(m => m && m.remove && m.remove());
  leafletMarkers = {};

  const projects = filtered();

  projects.forEach(p => {
    if (!p.lat || !p.lon) return;
    const col  = markerColor(p);
    const r    = markerRadius(p.estimatedCost);
    const isSel = ST.selId === p.id;
    const dimmed = ST.showRiskView && !['extreme','high'].includes(p.electionRisk);

    const m = L.circleMarker([p.lat, p.lon], {
      radius:      isSel ? r + 3 : r,
      fillColor:   col,
      color:       '#ffffff',
      weight:      isSel ? 3 : 2,
      fillOpacity: dimmed ? 0.15 : (isSel ? 0.95 : 0.55),
      opacity:     dimmed ? 0.3 : 1,
      pane:        'markersPane',
    }).addTo(map);

    m.bindTooltip(`<b>${p.name}</b><br>${fmtCost(p.estimatedCost)} · ${p.region}`, {
      className: 'stn-tooltip', direction: 'top', offset: [0, -r],
    });

    m.on('click', () => {
      ST.selId = p.id;
      renderMarkers();
      buildProjList();
      showDetail(p);
      updateHash();
    });

    leafletMarkers[p.id] = m;
  });

  updateCount();
  renderCorridors();
}

function markerColor(p) {
  return SECTOR_COLORS[p.sector] || '#6b7280';
}

// ─────────────────────────────────────────────
// TRANSPORT CORRIDORS
// ─────────────────────────────────────────────
function renderCorridors() {
  Object.values(corridorLayers).forEach(l => l && l.remove());
  corridorLayers = {};

  const visibleIds = new Set(filtered().map(p => p.id));

  Object.entries(CORRIDORS).forEach(([idStr, corr]) => {
    const id = parseInt(idStr);
    if (!visibleIds.has(id)) return;

    const p      = PIPELINE.find(x => x.id === id);
    if (!p) return;

    const col    = SECTOR_COLORS[p.sector] || '#3b82f6';
    const isSel  = ST.selId === id;
    const isUC   = p.status === 'Under Construction';
    const isCan  = p.status === 'Cancelled';
    const dimmed = ST.showRiskView && !['extreme','high'].includes(p.electionRisk);
    const dash   = isCan ? '4,5' : (isUC ? null : (corr.dashArray || '9,6'));
    const wt     = isSel ? 7 : (isUC ? 5 : 3.5);
    const op     = dimmed ? 0.15 : (isCan ? 0.4 : (isSel ? 1.0 : 0.75));

    // Shadow/glow behind selected corridor
    if (isSel) {
      corridorLayers[`${id}-shadow`] = L.polyline(corr.line, {
        color: '#ffffff', weight: wt + 4, opacity: 0.5,
        dashArray: dash, pane: 'electoratesPane',
      }).addTo(map);
    }

    const line = L.polyline(corr.line, {
      color: col, weight: wt, opacity: op,
      dashArray: dash, pane: 'markersPane',
      lineCap: 'round', lineJoin: 'round',
    }).addTo(map);

    line.bindTooltip(
      `<b>${p.name}</b><br>${p.status} · ${fmtCost(p.estimatedCost)}`,
      { className: 'stn-tooltip', sticky: true }
    );
    line.on('click', () => {
      ST.selId = id;
      renderMarkers();
      buildProjList();
      showDetail(p);
      updateHash();
    });

    corridorLayers[id] = line;
  });
}

// ─────────────────────────────────────────────
// DETAIL PANEL
// ─────────────────────────────────────────────
function showDetail(p) {
  const placeholder = document.getElementById('detail-placeholder');
  const content     = document.getElementById('detail-content');
  if (!placeholder || !content) return;
  placeholder.style.display = 'none';
  content.style.display = 'block';

  const risk = RISK_CONFIG[p.electionRisk] || RISK_CONFIG.safe;
  const relNews = (NEWS || []).filter(a => a.projectIds?.includes(p.id));

  content.innerHTML = `
    <h2>${p.name}</h2>
    <span class="risk-badge-lg ${risk.cls}">${risk.label}</span>
    <div style="margin-bottom:10px">
      <div class="detail-row"><span class="detail-key">Organisation</span><span class="detail-val">${p.org}</span></div>
      <div class="detail-row"><span class="detail-key">Sector</span><span class="detail-val">${SECTOR_ICONS[p.sector] || ''} ${cap(p.sector)}</span></div>
      <div class="detail-row"><span class="detail-key">Region</span><span class="detail-val">${p.region}</span></div>
      <div class="detail-row"><span class="detail-key">Status</span><span class="detail-val">${p.status}</span></div>
      <div class="detail-row"><span class="detail-key">Funding</span><span class="detail-val">${p.fundingStatus}</span></div>
      <div class="detail-row"><span class="detail-key">Est. Cost</span><span class="detail-val" style="font-family:var(--mono)">${fmtCost(p.estimatedCost)}</span></div>
    </div>
    ${p.desc ? `<div class="detail-desc">${p.desc}</div>` : ''}
    ${p.riskRationale ? `<div class="detail-desc" style="border-left:3px solid ${risk.color}"><b>Election risk:</b> ${p.riskRationale}</div>` : ''}
    ${relNews.length ? `
      <div class="sb-label" style="margin:10px 0 6px">RELATED NEWS</div>
      ${relNews.slice(0,3).map(a => `
        <a href="${a.url}" target="_blank" rel="noopener" style="display:block;text-decoration:none">
          <div class="news-item" style="margin-bottom:6px">
            <div class="news-headline" style="font-size:11px">${a.headline}</div>
            <div class="news-meta">${a.source} · ${a.date}</div>
          </div>
        </a>
      `).join('')}
    ` : ''}
    <button class="detail-share" onclick="copyShareLink(${p.id})">🔗 Share this project</button>
  `;
  window.copyShareLink = (id) => {
    const url = `${location.origin}${location.pathname}#p=${id}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
  };
}

// ─────────────────────────────────────────────
// PROJECT LIST
// ─────────────────────────────────────────────
function buildProjList() {
  const el = document.getElementById('proj-list');
  if (!el) return;
  const projects = filtered().sort((a, b) => b.estimatedCost - a.estimatedCost);

  if (!projects.length) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--dim);font-size:12px">No projects match filters</div>';
    return;
  }

  el.innerHTML = projects.map(p => {
    const risk  = RISK_CONFIG[p.electionRisk] || RISK_CONFIG.safe;
    const isSel = ST.selId === p.id;
    return `
      <div class="proj-item${isSel ? ' selected' : ''}" onclick="selFromList(${p.id})">
        <div class="proj-name">${p.name}</div>
        <div class="proj-meta">
          <span style="color:${SECTOR_COLORS[p.sector]}">${SECTOR_ICONS[p.sector] || ''} ${cap(p.sector)}</span>
          <span class="proj-cost">${fmtCost(p.estimatedCost)}</span>
          <span class="proj-risk-badge ${risk.cls}">${risk.label}</span>
        </div>
        <div class="proj-meta" style="margin-top:2px">
          <span>${p.region}</span>
          <span>${p.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selFromList(id) {
  const p = PIPELINE.find(x => x.id === id);
  if (!p) return;
  ST.selId = id;
  renderMarkers();
  buildProjList();
  showDetail(p);
  if (p.lat && p.lon) {
    map.flyTo([p.lat, p.lon], Math.max(map.getZoom(), 10), { duration: 1.0 });
    setTimeout(() => {
      const m = leafletMarkers[id];
      if (m && m.openTooltip) m.openTooltip();
    }, 1100);
  }
  updateHash();
}

function updateCount() {
  const el = document.getElementById('project-count');
  if (!el) return;
  const n = filtered().length;
  el.textContent = `${n} of ${PIPELINE.length} projects`;
}

// ─────────────────────────────────────────────
// FILTER UI
// ─────────────────────────────────────────────
function buildSectorBtns() {
  const el = document.getElementById('sector-btns');
  if (!el) return;
  el.innerHTML = SECTOR_LIST.map(s => `
    <button class="cat-btn on" data-sector="${s}" style="border-color:${SECTOR_COLORS[s]};color:${SECTOR_COLORS[s]}"
      onclick="toggleSector('${s}',this)">${SECTOR_ICONS[s]} ${cap(s)}</button>
  `).join('');
  window.toggleSector = (s, btn) => {
    if (ST.sectors.has(s)) { ST.sectors.delete(s); btn.classList.remove('on'); }
    else { ST.sectors.add(s); btn.classList.add('on'); }
    renderMarkers(); buildProjList(); updateHash();
  };
}

function buildStatusBtns() {
  const el = document.getElementById('status-btns');
  if (!el) return;
  el.innerHTML = STATUS_LIST.map(s => `
    <button class="status-btn on" data-status="${s}" onclick="toggleStatus('${s}',this)">${s}</button>
  `).join('');
  window.toggleStatus = (s, btn) => {
    if (ST.statuses.has(s)) { ST.statuses.delete(s); btn.classList.remove('on'); }
    else { ST.statuses.add(s); btn.classList.add('on'); }
    renderMarkers(); buildProjList(); updateHash();
  };
}

function buildRiskBtns() {
  const el = document.getElementById('risk-btns');
  if (!el) return;
  el.innerHTML = RISK_LIST.map(r => {
    const rc = RISK_CONFIG[r];
    return `<button class="risk-btn on" data-risk="${r}" style="border-color:${rc.color};color:${rc.color}"
      onclick="toggleRisk('${r}',this)">${rc.label}</button>`;
  }).join('');
  window.toggleRisk = (r, btn) => {
    if (ST.risks.has(r)) { ST.risks.delete(r); btn.classList.remove('on'); }
    else { ST.risks.add(r); btn.classList.add('on'); }
    renderMarkers(); buildProjList(); updateHash();
  };
}

function applyFilters() {
  ST.region = document.getElementById('filter-region')?.value || '';
  renderMarkers(); buildProjList(); updateHash();
}

function onSearch(q) {
  ST.searchQ = q;
  renderMarkers(); buildProjList();
}

function onValueSlider(val) {
  ST.minValue = parseInt(val);
  const lbl = document.getElementById('value-label');
  if (lbl) lbl.textContent = val > 0 ? `NZ$${val}M+` : 'Any';
  renderMarkers(); buildProjList(); updateHash();
}

// ─────────────────────────────────────────────
// LAYER TOGGLES
// ─────────────────────────────────────────────
function toggleLayer(name) {
  ST.layers[name] = !ST.layers[name];
  const btn = document.getElementById(`btn-${name}`);
  if (btn) btn.classList.toggle('on', ST.layers[name]);

  switch (name) {
    case 'electorates': renderElectorateLayer(); break;
    case 'maori':       renderMaoriLayer();       break;
    case 'councils':    renderCouncilLayer();     break;
    case 'regions':     renderRegionLayer();      break;
    case 'marginal':    renderMarginalLayer();    break;
  }
}

// Strip diacritics + normalize dashes for fuzzy electorate name matching
function normElect(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[–—]/g,'-').trim();
}

// 2020 GeoJSON names already match 2023 election data — normElect() handles diacritic differences
const ELECT_RENAME = {};

async function renderElectorateLayer() {
  if (electorateLayer) { electorateLayer.remove(); electorateLayer = null; }
  const leg = document.getElementById('elec-legend');
  if (!ST.layers.electorates || !ELECTION) {
    if (leg) leg.classList.remove('show');
    return;
  }

  const results = ELECTION.electorates || {};

  // Build normalised lookup of election result keys
  const normKeys = {};
  Object.keys(results).forEach(k => { normKeys[normElect(k)] = k; });

  function matchElect(geoName) {
    if (results[geoName]) return geoName;
    const n = normElect(geoName);
    if (ELECT_RENAME[n]) return ELECT_RENAME[n];
    return normKeys[n] || null;
  }

  // Load bundled GeoJSON (252 KB, served locally)
  let geojsonData = null;
  try {
    const r = await fetch(`${BASE_URL}data/electorates-general.geojson`);
    if (r.ok) geojsonData = await r.json();
  } catch (_) {}

  if (geojsonData?.features?.length) {
    electorateLayer = L.geoJSON(geojsonData, {
      pane: 'electoratesPane',
      style: feature => {
        const matched = matchElect(feature.properties.name || '');
        const data    = matched ? results[matched] : {};
        const col     = PARTY_COLORS[data?.party] || '#aaaaaa';
        return { fillColor: col, color: '#ffffff', weight: 0.8, fillOpacity: 0.42 };
      },
      onEachFeature: (feature, layer) => {
        const geoName = feature.properties.name || '';
        const matched = matchElect(geoName);
        const data    = matched ? results[matched] : {};
        const isMarg  = (data.margin || 99) < 5;
        layer.bindTooltip(
          data.mp
            ? `<b>${geoName}</b>${isMarg ? ' ⚡' : ''}<br>${data.mp} (${data.party})<br>Margin: ${data.margin?.toFixed(1)}%`
            : `<b>${geoName}</b>`,
          { className: 'stn-tooltip' }
        );
        layer.on('mouseover', function() { this.setStyle({ fillOpacity: 0.65, weight: 1.5 }); });
        layer.on('mouseout',  function() { this.setStyle({ fillOpacity: 0.42, weight: 0.8 }); });
      },
    }).addTo(map);
  } else {
    // Fallback: centroid dots coloured by winning party
    const generalEls = Object.entries(results).filter(([, v]) => v.type === 'general');
    electorateLayer = L.layerGroup(
      generalEls.map(([name, data]) => {
        const c = ELECTORATE_CENTROIDS[name];
        if (!c) return null;
        const col    = PARTY_COLORS[data.party] || '#888888';
        const isMarg = (data.margin || 99) < 5;
        return L.circleMarker([c[0], c[1]], {
          radius: isMarg ? 13 : 10, fillColor: col,
          color: isMarg ? '#FFB020' : '#ffffff',
          weight: isMarg ? 3 : 1.5, fillOpacity: 0.82,
          pane: 'electoratesPane',
        }).bindTooltip(
          `<b>${name}</b><br>${data.mp} (${data.party})<br>Margin: ${data.margin?.toFixed(1)}%${isMarg ? ' ⚡' : ''}`,
          { className: 'stn-tooltip' }
        );
      }).filter(Boolean)
    ).addTo(map);
  }

  // Party legend
  if (leg) {
    const generalEls = Object.entries(results).filter(([, v]) => v.type === 'general');
    const counts = {};
    generalEls.forEach(([, d]) => { counts[d.party] = (counts[d.party] || 0) + 1; });
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `<div class="legend-row"><span class="legend-dot" style="background:${PARTY_COLORS[p]||'#888'}"></span>${p}<span style="color:var(--dim);margin-left:auto;padding-left:8px">${n}</span></div>`)
      .join('');
    leg.innerHTML = `<div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:var(--muted);margin-bottom:5px;text-transform:uppercase">2023 Result</div>${rows}`;
    leg.classList.add('show');
  }
}

function renderMaoriLayer() {
  if (maoriLayer) { maoriLayer.remove(); maoriLayer = null; }
  if (!ST.layers.maori || !ELECTION) return;
  const results = ELECTION.electorates || {};
  const maoriEls = Object.entries(results).filter(([, v]) => v.type === 'maori');

  maoriLayer = L.layerGroup(maoriEls.map(([name, data]) => {
    const c = MAORI_CENTROIDS[name];
    if (!c) return null;
    const col = PARTY_COLORS[data.party] || '#888';
    return L.circleMarker([c[0], c[1]], {
      radius: 12,
      fillColor: col,
      color: '#B2001A',
      weight: 3,
      fillOpacity: 0.85,
      pane: 'electoratesPane',
    }).bindTooltip(`<b>${name}</b> (Māori)<br>${data.mp}<br>${data.party} · ${data.margin?.toFixed(1)}% margin`, {
      className: 'stn-tooltip',
    });
  }).filter(Boolean)).addTo(map);
}

function renderCouncilLayer() {
  if (councilLayer) { councilLayer.remove(); councilLayer = null; }
  if (!ST.layers.councils) return;
  // Placeholder — in production, load councils.geojson
  // For MVP: show a note that council boundaries require the geojson download
  councilLayer = L.marker([-41, 174], {
    icon: L.divIcon({ className: '', html: '<div style="background:var(--panel);border:1px solid var(--border);padding:6px 10px;border-radius:6px;font-size:11px;white-space:nowrap">Council boundaries: load councils.geojson</div>' })
  }).addTo(map);
}

function renderRegionLayer() {
  if (regionLayer) { regionLayer.remove(); regionLayer = null; }
  if (!ST.layers.regions) return;
  regionLayer = L.marker([-41, 174.5], {
    icon: L.divIcon({ className: '', html: '<div style="background:var(--panel);border:1px solid var(--border);padding:6px 10px;border-radius:6px;font-size:11px;white-space:nowrap">Regional boundaries: load regions.geojson</div>' })
  }).addTo(map);
}

function renderMarginalLayer() {
  if (marginalLayer) { marginalLayer.remove(); marginalLayer = null; }
  if (!ST.layers.marginal || !ELECTION) return;

  const marginalEls = Object.entries(ELECTION.electorates || {})
    .filter(([, v]) => v.margin < 5);

  marginalLayer = L.layerGroup(marginalEls.map(([name, data]) => {
    const c = data.type === 'maori' ? MAORI_CENTROIDS[name] : ELECTORATE_CENTROIDS[name];
    if (!c) return null;
    return L.circleMarker([c[0], c[1]], {
      radius: 18,
      fillColor: 'transparent',
      color: '#FFB020',
      weight: 3,
      fillOpacity: 0,
      opacity: 0.9,
      dashArray: '6,4',
      pane: 'electoratesPane',
    }).bindTooltip(`<b>⚡ MARGINAL: ${name}</b><br>${data.party} · ${data.margin?.toFixed(1)}% margin`, {
      className: 'stn-tooltip',
    });
  }).filter(Boolean)).addTo(map);
}

// ─────────────────────────────────────────────
// RISK VIEW TOGGLE
// ─────────────────────────────────────────────
function toggleRiskView() {
  ST.showRiskView = !ST.showRiskView;
  const btn = document.getElementById('btn-risk');
  if (btn) btn.classList.toggle('on', ST.showRiskView);
  renderMarkers();

  const right = document.getElementById('right');
  if (ST.showRiskView && right) {
    // Show ranked at-risk projects
    const atRisk = PIPELINE
      .filter(p => ['extreme','high'].includes(p.electionRisk))
      .sort((a, b) => b.estimatedCost - a.estimatedCost);

    const total = atRisk.reduce((s, p) => s + p.estimatedCost, 0);
    const placeholder = document.getElementById('detail-placeholder');
    const content = document.getElementById('detail-content');
    if (placeholder) placeholder.style.display = 'none';
    if (content) {
      content.style.display = 'block';
      content.innerHTML = `
        <h2>🔴 At-Risk Projects</h2>
        <div class="detail-desc">Projects most vulnerable to government change — ${atRisk.length} projects, total NZ${fmtCost(total)}</div>
        ${atRisk.map(p => {
          const risk = RISK_CONFIG[p.electionRisk];
          return `<div class="proj-item" onclick="selFromList(${p.id})">
            <div class="proj-name">${p.name}</div>
            <div class="proj-meta">
              <span class="proj-risk-badge ${risk.cls}">${risk.label}</span>
              <span class="proj-cost">${fmtCost(p.estimatedCost)}</span>
            </div>
          </div>`;
        }).join('')}
      `;
    }
  }
}

// ─────────────────────────────────────────────
// NEWS MODAL
// ─────────────────────────────────────────────
function buildNews() {
  const el = document.getElementById('news-body');
  if (!el || !NEWS) return;
  el.innerHTML = [...NEWS].sort((a, b) => b.date.localeCompare(a.date)).map(a => `
    <a href="${a.url}" target="_blank" rel="noopener" style="text-decoration:none">
      <div class="news-item">
        <div class="news-headline">${a.headline}</div>
        <div class="news-meta">${a.source} · ${a.date}</div>
        <div class="news-summary">${a.summary}</div>
      </div>
    </a>
  `).join('');
}

function openNews() {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('news-modal').style.display = 'flex';
}

function openSources() {
  document.getElementById('modal-overlay').style.display = 'block';
  document.getElementById('sources-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// ─────────────────────────────────────────────
// MOBILE
// ─────────────────────────────────────────────
function toggleMobileNav() {
  document.getElementById('hdr-nav').classList.toggle('open');
}

function toggleMobileSidebar() {
  const left    = document.getElementById('left');
  const overlay = document.getElementById('sidebar-overlay');
  const open    = left.classList.toggle('open');
  overlay.classList.toggle('show', open);
}

// ─────────────────────────────────────────────
// BANNER
// ─────────────────────────────────────────────
function dismissBanner() {
  const b = document.getElementById('amalg-banner');
  if (b) b.classList.add('hidden');
  sessionStorage.setItem('amalg-dismissed', '1');
}

// ─────────────────────────────────────────────
// URL HASH
// ─────────────────────────────────────────────
function updateHash() {
  const params = new URLSearchParams();
  if (ST.selId) params.set('p', ST.selId);
  if (ST.region) params.set('r', ST.region);
  if (ST.minValue > 0) params.set('v', ST.minValue);
  location.hash = params.toString() ? '#' + params.toString() : '';
}

function restoreFromHash() {
  if (!location.hash) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const projId = parseInt(params.get('p'));
  if (projId) {
    const p = PIPELINE.find(x => x.id === projId);
    if (p) selFromList(projId);
  }
  if (params.get('r')) {
    const sel = document.getElementById('filter-region');
    if (sel) { sel.value = params.get('r'); ST.region = params.get('r'); }
  }
  if (params.get('v')) {
    const val = parseInt(params.get('v'));
    ST.minValue = val;
    const slider = document.getElementById('value-slider');
    if (slider) slider.value = val;
    onValueSlider(val);
  }
  if (params.has('risk')) {
    renderMarkers(); buildProjList();
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function fmtCost(m) {
  if (!m) return 'TBC';
  if (m >= 1000) return `NZ$${(m / 1000).toFixed(1)}B`;
  return `NZ$${m}M`;
}

// ─────────────────────────────────────────────
// ELECTORATE CENTROIDS (general)
// ─────────────────────────────────────────────
const ELECTORATE_CENTROIDS = {
  'Auckland Central':   [-36.8550, 174.7590],
  'Botany':             [-36.9200, 174.9100],
  'Epsom':              [-36.8800, 174.7680],
  'Wellington Central': [-41.2800, 174.7762],
  'Rongotai':           [-41.3100, 174.8000],
  'Hutt South':         [-41.2100, 174.9100],
  'Remutaka':           [-41.1800, 175.0600],
  'Whanganui':          [-39.9300, 175.0500],
  'Palmerston North':   [-40.3553, 175.6099],
  'Rangitīkei':         [-39.8000, 175.6000],
  'Hamilton East':      [-37.7700, 175.3200],
  'Hamilton West':      [-37.7870, 175.2820],
  'Taranaki–King Country': [-39.0600, 174.0800],
  'New Plymouth':       [-39.0700, 174.0800],
  'Tauranga':           [-37.6879, 176.1671],
  'Bay of Plenty':      [-37.8000, 176.4000],
  'Rotorua':            [-38.1368, 176.2497],
  'East Coast':         [-38.6000, 177.9000],
  'Napier':             [-39.4928, 176.9120],
  'Hastings':           [-39.6400, 176.8400],
  'Tukituki':           [-39.7000, 176.8000],
  'Wairarapa':          [-41.1200, 175.5000],
  'Nelson':             [-41.2706, 173.2840],
  'Kaikōura':           [-42.4000, 173.6800],
  'Christchurch Central': [-43.5310, 172.6385],
  'Christchurch East':  [-43.5200, 172.6900],
  'Port Hills':         [-43.5900, 172.7300],
  'Ilam':               [-43.5200, 172.5700],
  'Selwyn':             [-43.7000, 172.3500],
  'Waimakariri':        [-43.3800, 172.7300],
  'Rangitata':          [-44.1000, 171.5000],
  'Waitaki':            [-44.7000, 170.5000],
  'Dunedin':            [-45.8742, 170.5039],
  'Dunedin North':      [-45.8400, 170.4900],
  'Invercargill':       [-46.4132, 168.3538],
  'Southland':          [-45.8000, 168.3500],
  'Northland':          [-35.7270, 174.3240],
  'Whangārei':          [-35.7270, 174.3240],
  'Kaipara ki Mahurangi': [-36.4000, 174.5000],
  'Helensville':        [-36.6700, 174.4500],
  'Kelston':            [-36.8900, 174.6500],
  'New Lynn':           [-36.9000, 174.6900],
  'Mt Albert':          [-36.8800, 174.7300],
  'Mt Roskill':         [-36.9000, 174.7500],
  'Maungakiekie':       [-36.9100, 174.8000],
  'Manurewa':           [-37.0000, 174.8700],
  'Papakura':           [-37.0600, 174.9400],
  'Pakuranga':          [-36.9000, 174.9100],
  'Flat Bush':          [-36.9500, 174.9300],
  'Takanini':           [-37.0500, 174.9100],
  'Northcote':          [-36.8100, 174.7500],
  'East Coast Bays':    [-36.7000, 174.7700],
  'Upper Harbour':      [-36.7500, 174.6500],
  'Waitematā':          [-36.8500, 174.7600],
  'Tāmaki':             [-36.8700, 174.8500],
  'Coromandel':         [-36.8000, 175.5000],
};

const MAORI_CENTROIDS = {
  'Hauraki-Waikato':   [-37.4000, 175.1000],
  'Tāmaki Makaurau':   [-36.8700, 174.7600],
  'Te Tai Tokerau':    [-35.5000, 173.9000],
  'Te Tai Hauāuru':    [-39.5000, 175.0000],
  'Ikaroa-Rāwhiti':    [-39.0000, 177.5000],
  'Waiariki':          [-38.5000, 176.2000],
  'Te Tai Tonga':      [-43.5000, 172.0000],
};

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('amalg-dismissed')) {
    const b = document.getElementById('amalg-banner');
    if (b) b.classList.add('hidden');
  }
  _boot();
});
