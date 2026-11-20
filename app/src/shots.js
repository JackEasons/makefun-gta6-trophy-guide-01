// Deterministic scenes for screenshots: ?shot=checklist|guide|roadmap|filters,
// ?trophy=<id> to open a guide, ?spoilers=on|off, ?filter=<kind>, ?grade=<grade>,
// ?earned=<comma-separated ids> to pre-check trophies, ?view=roadmap to switch tabs.
// Only used by the maker's screenshot runs; normal visitors see the default page.

export function applyShotParams(state, actions) {
  const params = new URLSearchParams(window.location.search);
  if (![...params.keys()].length) return;

  const spoilers = params.get('spoilers');
  if (spoilers === 'off' || spoilers === 'on') {
    state.hideSpoilers = spoilers === 'on';
    const box = document.getElementById('spoilerToggle');
    if (box) box.checked = state.hideSpoilers;
    const note = document.getElementById('spoilerNote');
    if (note) note.hidden = !state.hideSpoilers;
  }

  const earned = params.get('earned');
  if (earned) {
    for (const id of earned.split(',')) {
      if (state.trophies.some((t) => t.id === id.trim())) state.earned.add(id.trim());
    }
    try {
      localStorage.setItem(
        'leonida-trophy-atlas-v1',
        JSON.stringify({ earned: [...state.earned].sort(), counts: state.counts, hideSpoilers: state.hideSpoilers }),
      );
    } catch {
      // storage unavailable; the in-memory set still drives this render
    }
  }

  // Round 3: ?count=<trophy-id>:<n> pre-sets a running counter (for example
  // the missable trophy's meditation count) in the screenshot scene only.
  const count = params.get('count');
  if (count) {
    const [id, raw] = count.split(':');
    const trophy = state.trophies.find((t) => t.id === id);
    if (trophy && trophy.count != null) {
      const n = Math.max(0, Math.min(trophy.count, Number(raw) || 0));
      state.counts[id] = n;
      try {
        localStorage.setItem(
          'leonida-trophy-atlas-v1',
          JSON.stringify({ earned: [...state.earned].sort(), counts: state.counts, hideSpoilers: state.hideSpoilers }),
        );
      } catch {
        // storage unavailable; the in-memory count still drives this render
      }
    }
  }

  // Round 2 scenes: ?compact=1 densifies the page and pins an open guide
  // panel to the viewport bottom; ?focus=guide shows a full-page guide
  // reader; ?noscroll=1 keeps opening a guide from scrolling the shot.
  if (params.get('compact') === '1') document.body.classList.add('shot-compact');
  if (params.get('focus') === 'guide') document.body.classList.add('shot-guide-focus');
  if (params.get('noscroll') === '1') window.__atlasNoScroll = true;

  const filter = params.get('filter');
  if (filter) {
    state.kind = filter;
    document.querySelectorAll('#kindChips .chip').forEach((c) =>
      c.classList.toggle('active', c.dataset.kind === filter),
    );
  }

  const grade = params.get('grade');
  if (grade) {
    state.grade = grade;
    const sel = document.getElementById('gradeFilter');
    if (sel) sel.value = grade;
  }

  const shot = params.get('shot');
  if (shot === 'roadmap' || params.get('view') === 'roadmap') actions.setView('roadmap');

  // The caller re-renders after this returns; open a guide last, if asked.
  const trophy = params.get('trophy');
  if (trophy) {
    actions.setView('checklist');
    actions.openGuide(trophy);
  }
}
