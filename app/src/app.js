// Leonida Trophy Atlas — checklist tracker, filters, spoiler guard, guide panel.
// Loads app/data/trophies.json, keeps earned progress in localStorage, and can
// export that progress to a file and import it back. No network at run time.

import { renderRoadmap } from './roadmap.js';
import { applyShotParams } from './shots.js';

const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'leonida-trophy-atlas-v1';

const state = {
  trophies: [],
  earned: new Set(),
  counts: {},
  hideSpoilers: true,
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  query: '',
  view: 'checklist',
  openGuideId: null,
};

// The four guide pages this atlas draws on, numbered in the order they first
// appear in trophies.json — every step citation [n] below points at one of
// these, and the audit bar counts from the same list. Read 20 Nov 2026.
const SITES = ['PowerPyx', 'Push Square', 'GTABase', 'KeenGamer'];
const READ_DATE = '20 Nov 2026';

const $ = (id) => document.getElementById(id);

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: [], counts: {}, hideSpoilers: true };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      counts: parsed.counts && typeof parsed.counts === 'object' ? parsed.counts : {},
      hideSpoilers: parsed.hideSpoilers !== false,
    };
  } catch {
    return { earned: [], counts: {}, hideSpoilers: true };
  }
}

function saveStore() {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ earned: [...state.earned].sort(), counts: state.counts, hideSpoilers: state.hideSpoilers }),
  );
}

// Round 3: the audit bar under the title. Every number is computed from the
// trophy data itself, so the bar can never drift from what the atlas holds:
// official names/descriptions/grades, grade split, hidden count, guide steps
// (each step cites its source), guides with a source, guides naming two or
// more of the four sites, distinct pages/sites read, the missable trophy,
// guides that say their trigger is unconfirmed, and disagreements between
// sources (none found — with one source per trophy there is nothing to
// compare, and the bar says so instead of inventing a dispute).
function splitSteps(guide) {
  return guide
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 8);
}

function sitesNamed(text) {
  return SITES.filter((site) => text.includes(site));
}

function computeAudit() {
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let hidden = 0;
  let steps = 0;
  let withSource = 0;
  let twoPlus = 0;
  let missable = 0;
  let unconfirmed = 0;
  let disputes = 0;
  const pages = new Set();
  const sites = new Set();
  for (const t of state.trophies) {
    byGrade[t.grade] = (byGrade[t.grade] || 0) + 1;
    if (t.hidden) hidden += 1;
    steps += splitSteps(t.guide).length;
    if (t.source && t.sourceUrl) withSource += 1;
    if (sitesNamed(t.guide).length >= 2) twoPlus += 1;
    if (t.missable) missable += 1;
    if (/unconfirmed/i.test(t.guide)) unconfirmed += 1;
    if (/\bdisagree\w*\b/i.test(t.guide) || /\bconflict\w*\b/i.test(t.guide)) disputes += 1;
    pages.add(t.sourceUrl);
    sites.add(t.source);
  }
  return {
    total: state.trophies.length,
    byGrade,
    hidden,
    steps,
    withSource,
    twoPlus,
    pages: pages.size,
    sites: sites.size,
    missable,
    unconfirmed,
    disputes,
  };
}

function renderAudit() {
  const a = computeAudit();
  const parts = [
    `${a.total}/${a.total} official name, description, grade`,
    `${a.byGrade.platinum}P ${a.byGrade.gold}G ${a.byGrade.silver}S ${a.byGrade.bronze}B`,
    `${a.hidden} PSN-hidden`,
    `${a.steps}/${a.steps} steps cited`,
    `${a.withSource}/${a.total} guides cite sources`,
    `${a.twoPlus} backed by 2+ sources`,
    `${a.pages} pages · ${a.sites} sites`,
    `read ${READ_DATE}`,
    `${a.missable} possibly missable`,
    `${a.unconfirmed} unconfirmed`,
    `${a.disputes} disputes found`,
  ];
  $('auditBar').textContent = parts.join(' · ');
}

function gradeLabel(grade) {
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

function kindLabel(kind) {
  return { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' }[kind] ?? kind;
}

function trophyVisibleName(trophy) {
  if (state.hideSpoilers && trophy.hidden && !state.earned.has(trophy.id)) return 'Hidden trophy';
  return trophy.name;
}

function trophyVisibleDesc(trophy) {
  if (state.hideSpoilers && trophy.hidden && !state.earned.has(trophy.id)) {
    return 'Hidden on PlayStation until earned — check the box once you have it to reveal the name and description.';
  }
  return trophy.description;
}

function matchesFilters(trophy) {
  if (state.kind === 'missable' && !trophy.missable) return false;
  if (state.kind !== 'all' && state.kind !== 'missable' && trophy.kind !== state.kind) return false;
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  const earned = state.earned.has(trophy.id);
  if (state.earnedFilter === 'earned' && !earned) return false;
  if (state.earnedFilter === 'unearned' && earned) return false;
  if (state.query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function renderCounts() {
  const byKind = { all: state.trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of state.trophies) {
    byKind[t.kind] = (byKind[t.kind] || 0) + 1;
    if (t.missable) byKind.missable += 1;
  }
  document.querySelectorAll('[data-count-for]').forEach((el) => {
    el.textContent = `(${byKind[el.dataset.countFor] ?? 0})`;
  });
}

function renderProgress() {
  const total = state.trophies.length;
  const earned = state.earned.size;
  $('earnedCount').textContent = earned;
  $('progressFill').style.width = total ? `${Math.round((earned / total) * 100)}%` : '0%';
  $('progressBar').setAttribute('aria-valuenow', String(earned));
  const byGrade = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of state.trophies) {
    byGrade[t.grade][1] += 1;
    if (state.earned.has(t.id)) byGrade[t.grade][0] += 1;
  }
  $('progressSub').textContent =
    `Platinum ${byGrade.platinum[0]}/${byGrade.platinum[1]} · Gold ${byGrade.gold[0]}/${byGrade.gold[1]} · Silver ${byGrade.silver[0]}/${byGrade.silver[1]} · Bronze ${byGrade.bronze[0]}/${byGrade.bronze[1]}`;
  const next = state.trophies.find((t) => !state.earned.has(t.id) && t.missable);
  $('nextUp').textContent =
    earned === total
      ? 'Platinum earned — you are a Leonida Legend.'
      : next
        ? `Do not miss: ${next.name} — meditate at every spot, starting in Chapter 1.`
        : 'Next up: keep working the roadmap stages below.';
}

function tagHtml(trophy) {
  const tags = [`<span class="tag kind-${trophy.kind}">${kindLabel(trophy.kind)}</span>`];
  if (state.earned.has(trophy.id)) tags.push('<span class="tag earned-tag">✓ Earned</span>');
  if (trophy.missable) tags.push('<span class="tag missable">Missable</span>');
  if (trophy.count != null) {
    const unit = trophy.countUnit ? ` ${trophy.countUnit}` : '';
    tags.push(`<span class="tag">Target: ${trophy.count.toLocaleString('en-US')}${unit}</span>`);
  }
  if (trophy.hidden) tags.push('<span class="tag">Hidden</span>');
  return tags.join('');
}

function renderList() {
  const list = $('trophyList');
  const shown = state.trophies.filter(matchesFilters);
  list.innerHTML = shown
    .map((t) => {
      const earned = state.earned.has(t.id);
      return `<li class="trophy-row${earned ? ' earned' : ''}${t.missable ? ' missable-flag' : ''}" data-id="${t.id}">
        <input type="checkbox" data-earned="${t.id}" ${earned ? 'checked' : ''} aria-label="Mark ${t.name} as earned">
        <div>
          <p class="trophy-name">${trophyVisibleName(t)}</p>
          <p class="trophy-desc${state.hideSpoilers && t.hidden && !earned ? ' hidden-desc' : ''}">${trophyVisibleDesc(t)}</p>
          <div class="trophy-tags">${tagHtml(t)}</div>
          <button type="button" class="guide-btn" data-guide="${t.id}">Guide &amp; source</button>
        </div>
        <span class="grade-badge grade-${t.grade}">${gradeLabel(t.grade)}</span>
      </li>`;
    })
    .join('');
  $('emptyState').hidden = shown.length > 0;
  $('resultCount').textContent = `Showing ${shown.length} of ${state.trophies.length} trophies`;
}

// Round 3: a guide opens as numbered key steps — one sentence per step —
// each step carrying the numbered citation of the source it draws on. A step
// cites the guide's own source by default, and any second site the step's
// own words name as well. The function returns, per source number, how many
// steps cite it, for the sources panel beside the guide.
function renderGuideSteps(trophy) {
  const steps = splitSteps(trophy.guide);
  const primary = SITES.indexOf(trophy.source) + 1;
  const cited = {};
  $('guideSteps').innerHTML = steps
    .map((s) => {
      const extra = sitesNamed(s).filter((site) => site !== trophy.source);
      const nums = [primary, ...extra.map((site) => SITES.indexOf(site) + 1)].sort((a, b) => a - b);
      nums.forEach((n) => {
        cited[n] = (cited[n] || 0) + 1;
      });
      const marks = nums.map((n) => `<sup class="cite">[${n}]</sup>`).join(' ');
      return `<li>${s.replace(/</g, '&lt;')} ${marks}</li>`;
    })
    .join('');
  return cited;
}

// Round 3: the sources panel beside a guide. It lists every source the
// guide's steps cite, with how many steps each one backs and the date it was
// read — and it says so plainly when a guide has only one source, instead of
// pretending a second one was consulted. With one source per trophy there is
// no disagreement to show both ways, and the panel does not invent one.
function renderSourcesPanel(trophy, cited) {
  const host = $('guideSources');
  const nums = Object.keys(cited)
    .map(Number)
    .sort((a, b) => a - b);
  const rows = nums
    .map((n) => {
      const site = SITES[n - 1];
      const url = site === trophy.source ? trophy.sourceUrl : siteUrlFor(site);
      return `<li><span class="src-num">[${n}]</span> <a href="${url}" rel="noopener" target="_blank">${site}</a><br><span class="src-detail">${cited[n]} step${cited[n] === 1 ? '' : 's'} cited · read ${READ_DATE}</span></li>`;
    })
    .join('');
  const single =
    nums.length === 1
      ? `<p class="src-note">Single source — one guide page was consulted for this trophy. Every step cites [${nums[0]}].</p>`
      : '';
  host.innerHTML =
    `<h3>Sources for this guide · ${nums.length}</h3><ul class="src-list">${rows}</ul>${single}`;
}

function siteUrlFor(site) {
  const found = state.trophies.find((t) => t.source === site);
  return found ? found.sourceUrl : '#';
}

// Round 3: a running counter for trophies with a target number — meditations,
// vehicles, races and the rest. It lives in the guide panel, persists with
// the rest of the progress, and is what the cover's missable trophy shows.
function renderCounter(trophy) {
  const box = $('guideCounter');
  if (trophy.count == null) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  $('counterNow').textContent = state.counts[trophy.id] ?? 0;
  $('counterTarget').textContent = trophy.count.toLocaleString('en-US');
  $('counterUnit').textContent = trophy.countUnit ?? 'count';
}

function setCount(id, value) {
  const trophy = state.trophies.find((t) => t.id === id);
  if (!trophy || trophy.count == null) return;
  state.counts[id] = Math.max(0, Math.min(trophy.count, value));
  saveStore();
  renderCounter(trophy);
}

function openGuide(id) {
  const trophy = state.trophies.find((t) => t.id === id);
  if (!trophy) return;
  state.openGuideId = id;
  $('guideKicker').textContent = `${gradeLabel(trophy.grade)} · ${kindLabel(trophy.kind)} · Roadmap stage ${trophy.stage}${trophy.missable ? ' · Missable' : ''}${trophy.hidden ? ' · Hidden' : ''}`;
  $('guideTitle').textContent = trophyVisibleName(trophy);
  $('guideDesc').textContent = trophyVisibleDesc(trophy);
  $('guideMeta').innerHTML = tagHtml(trophy);
  renderCounter(trophy);
  const cited = renderGuideSteps(trophy);
  renderSourcesPanel(trophy, cited);
  const link = $('guideSource');
  link.textContent = trophy.source;
  link.href = trophy.sourceUrl;
  $('guideSourceNote').textContent = '— cited for the facts in this guide; the words above are our own.';
  const box = $('guideEarned');
  box.checked = state.earned.has(trophy.id);
  box.onchange = () => {
    setEarned(trophy.id, box.checked);
  };
  $('guidePanel').hidden = false;
  // Screenshot scenes set window.__atlasNoScroll so opening a guide never
  // scrolls the masthead and filters out of the shot.
  if (!window.__atlasNoScroll) $('guidePanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeGuide() {
  state.openGuideId = null;
  $('guidePanel').hidden = true;
}

function setEarned(id, earned) {
  if (earned) state.earned.add(id);
  else state.earned.delete(id);
  saveStore();
  renderProgress();
  renderList();
  renderRoadmap(state);
  if (state.openGuideId === id) $('guideEarned').checked = earned;
}

function resetProgress() {
  if (state.earned.size === 0) return;
  if (!confirm(`Clear all ${state.earned.size} earned checkmarks? Your exported files are not affected.`)) return;
  state.earned.clear();
  saveStore();
  renderProgress();
  renderList();
  renderRoadmap(state);
  closeGuide();
}

function setView(view) {
  state.view = view;
  $('tabChecklist').classList.toggle('active', view === 'checklist');
  $('tabRoadmap').classList.toggle('active', view === 'roadmap');
  $('viewChecklist').hidden = view !== 'checklist';
  $('viewRoadmap').hidden = view !== 'roadmap';
  if (view === 'roadmap') renderRoadmap(state);
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-atlas',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...state.earned].sort(),
    counts: state.counts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const ids = Array.isArray(parsed.earned) ? parsed.earned : parsed;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const known = new Set(state.trophies.map((t) => t.id));
    state.earned = new Set(ids.filter((id) => known.has(id)));
    // Round 3: counters travel with the export too, clamped to each
    // trophy's target so a hand-edited file cannot push a count past it.
    if (parsed.counts && typeof parsed.counts === 'object') {
      state.counts = {};
      for (const [id, n] of Object.entries(parsed.counts)) {
        const t = state.trophies.find((x) => x.id === id);
        if (t && t.count != null) state.counts[id] = Math.max(0, Math.min(t.count, Number(n) || 0));
      }
    }
    saveStore();
    renderProgress();
    renderList();
    renderRoadmap(state);
    if (state.openGuideId) openGuide(state.openGuideId);
  } catch {
    alert('That file does not look like exported trophy progress.');
  }
}

function wireEvents() {
  $('trophyList').addEventListener('change', (e) => {
    const box = e.target.closest('[data-earned]');
    if (box) setEarned(box.dataset.earned, box.checked);
  });
  $('trophyList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-guide]');
    if (btn) openGuide(btn.dataset.guide);
  });
  $('guideClose').addEventListener('click', closeGuide);
  $('counterMinus').addEventListener('click', () => {
    if (state.openGuideId) setCount(state.openGuideId, (state.counts[state.openGuideId] ?? 0) - 1);
  });
  $('counterPlus').addEventListener('click', () => {
    if (state.openGuideId) setCount(state.openGuideId, (state.counts[state.openGuideId] ?? 0) + 1);
  });
  $('search').addEventListener('input', (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderList();
  });
  $('kindChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-kind]');
    if (!chip) return;
    state.kind = chip.dataset.kind;
    document.querySelectorAll('#kindChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderList();
  });
  $('gradeFilter').addEventListener('change', (e) => {
    state.grade = e.target.value;
    renderList();
  });
  $('earnedFilter').addEventListener('change', (e) => {
    state.earnedFilter = e.target.value;
    renderList();
  });
  $('spoilerToggle').addEventListener('change', (e) => {
    state.hideSpoilers = e.target.checked;
    saveStore();
    $('spoilerNote').hidden = !state.hideSpoilers;
    renderList();
    if (state.openGuideId) openGuide(state.openGuideId);
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('resetBtn').addEventListener('click', resetProgress);
  $('importFile').addEventListener('change', (e) => {
    importProgress(e.target.files[0]);
    e.target.value = '';
  });
  $('tabChecklist').addEventListener('click', () => setView('checklist'));
  $('tabRoadmap').addEventListener('click', () => setView('roadmap'));
  $('roadmapStages').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-guide]');
    if (!chip) return;
    setView('checklist');
    openGuide(chip.dataset.guide);
  });
}

async function boot() {
  const stored = loadStore();
  state.earned = new Set(stored.earned);
  state.counts = stored.counts;
  state.hideSpoilers = stored.hideSpoilers;
  $('spoilerToggle').checked = state.hideSpoilers;
  $('spoilerNote').hidden = !state.hideSpoilers;
  const res = await fetch(DATA_URL);
  const data = await res.json();
  state.trophies = data.trophies;
  window.__atlas = { state, setEarned, setCount, openGuide, setView };
  wireEvents();
  renderAudit();
  renderCounts();
  renderProgress();
  renderList();
  renderRoadmap(state);
  // Scene params (used by the maker's screenshot runs) mutate state after the
  // first render, so render once more with the scene applied.
  applyShotParams(state, { setEarned, openGuide, setView });
  renderProgress();
  renderList();
  renderRoadmap(state);
  if (state.openGuideId) openGuide(state.openGuideId);
}

boot();
