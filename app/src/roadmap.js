// Roadmap to the platinum: four stages in the order the guides recommend.
// Each stage lists its trophies by id; the stage text is our own summary of the
// published roadmaps (PowerPyx, GTABase, Push Square).

export const STAGES = [
  {
    n: 1,
    title: 'Play the story — and mind the one missable',
    short: 'Story',
    time: '60–80 hours',
    blurb:
      'Play all five chapters and take side content as it appears. Scan vehicles and study animals as you go — the 100% checklist counts progress made during the story. Keep a manual save at each chapter boundary: there is no mission replay.',
    ids: [
      'just-like-paradise',
      'paradise-lost',
      'tits-ass-drug-money',
      'vice-city-baby',
      'top-of-the-world-ma',
      'you-gotta-know-when-to-get-off',
      'trust',
      'break-the-bank',
      'family-matters',
      'dwnfall',
      'hi-jacked',
      'snow-storm',
      'positive-mental-attitude',
      'master-of-none',
      'whip-it-good',
      'hot-together',
      'retail-therapy',
      'gunslinger',
      'baited-my-tackle',
      'stick-fiddler',
      'catch-me-if-you-can',
      'challenging-tank',
      'in-the-beginning',
      'capital-offense',
      'lets-go-bowling',
    ],
  },
  {
    n: 2,
    title: 'Strangers & Freaks and the character questlines',
    short: 'Strangers & Freaks',
    time: 'about 10 hours',
    blurb:
      'Finish the eight stranger mission strands and the six character questlines — Andy, Kenton, Billy, Randy, Tyrone and Bret. Andy’s strand is Lucia-only; Tyrone’s and Bret’s are Jason-only. Every quest giver tied to a trophy comes back after the story, so nothing here is lost if you leave it.',
    ids: [
      'strangers-and-freaks',
      'road-to-rehabilitation',
      'this-was-no-boat-accident',
      'the-lone-rider',
      'supply-and-demand',
      'spin-on-this',
      'fair-game',
    ],
  },
  {
    n: 3,
    title: 'The 100% Completion Checklist',
    short: '100% checklist',
    time: 'about 100 hours',
    blurb:
      'After the final mission, open Progress, then Stats, then 100% Completion. The list is lenient — 300 stunts, all 42 shooting-range gold medals, 15 of 18 card sets, 100 WAiNK scans, 33 underwater discoveries, all robberies, and 70 of the 80 challenges. Work it region by region so one trip clears several counters at once.',
    ids: [
      'a-long-road',
      'cunning-stunts',
      'the-shootist',
      'top-fun',
      'earn-cash-not-kudos',
      'dont-touch-my-deck',
      'you-wainker',
      'one-last-thing',
      'dime-on-the-dollar',
      'treat-yo-self',
      'little-boxes',
      'on-the-spot',
      'the-goodtime-state',
      'pest-control',
      'maximum-withdrawal',
      'a-classic-blitz-play',
      'sneakthief',
    ],
  },
  {
    n: 4,
    title: 'Clean-up, then the platinum',
    short: 'Clean-up',
    time: 'a few hours',
    blurb:
      'Mop up whatever is left — the vague-description trophies whose triggers the guides had not pinned down at launch, and any counters still short. Once the last one pops, Vice Got a Price! follows immediately.',
    ids: [
      'personal-best',
      'actions-speak-louder',
      'bad-luck-i-guess',
      'the-truth-is-out-there',
      'ten-pin',
      'vice-got-a-price',
    ],
  },
];

export function renderRoadmap(state) {
  const host = document.getElementById('roadmapStages');
  if (!host || !state.trophies.length) return;
  const byId = new Map(state.trophies.map((t) => [t.id, t]));
  // Round 3: the next three unearned trophies in roadmap order, up front, so
  // the roadmap view answers "what do I do next" before it lists the stages.
  const ordered = STAGES.flatMap((stage) => stage.ids);
  const nextUp = ordered.filter((id) => !state.earned.has(id)).slice(0, 3);
  const nextHtml = nextUp.length
    ? `<p class="roadmap-next"><strong>Next up · roadmap order:</strong> ${nextUp
        .map((id, i) => {
          const t = byId.get(id);
          if (!t) return '';
          const label = state.hideSpoilers && t.hidden && !state.earned.has(id) ? 'Hidden trophy' : t.name;
          return `<button type="button" class="next-chip" data-guide="${id}">${i + 1}. ${label}</button>`;
        })
        .join(' ')}</p>`
    : '<p class="roadmap-next"><strong>Next up · roadmap order:</strong> all roadmap trophies earned — the platinum is yours.</p>';
  host.innerHTML = nextHtml + STAGES.map((stage) => {
    const done = stage.ids.filter((id) => state.earned.has(id)).length;
    const chips = stage.ids
      .map((id) => {
        const t = byId.get(id);
        if (!t) return '';
        const earned = state.earned.has(id);
        const label = state.hideSpoilers && t.hidden && !earned ? 'Hidden trophy' : t.name;
        return `<button type="button" class="stage-trophy${earned ? ' earned' : ''}" data-guide="${id}"><span class="mini-grade">${t.grade}</span>${earned ? '✓ ' : ''}${label}</button>`;
      })
      .join('');
    return `<article class="roadmap-stage">
      <h2>Stage ${stage.n}: ${stage.title} <span class="stage-time">· ${stage.time} · ${done}/${stage.ids.length} done</span></h2>
      <p>${stage.blurb}</p>
      <div class="stage-trophies">${chips}</div>
    </article>`;
  }).join('');
}
