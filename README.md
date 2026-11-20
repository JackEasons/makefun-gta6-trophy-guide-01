# Leonida Trophy Atlas — GTA VI Trophy Guide & Tracker

[![gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/JackEasons/makefun-gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/JackEasons/makefun-gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. Every trophy is shown with its official name, description and grade as PlayStation publishes it, plus a guide written in our own words that cites its source, a four-stage roadmap to the platinum, and a missable flag on the one trophy the guides call possibly missable.

## What it does

- **Checklist tracker** — check trophies off as you earn them; progress is saved in the browser (localStorage) and survives reloads.
- **Export & import** — export your progress to a JSON file and import it back on any device.
- **Filters** — by kind (story, missable, collectibles, activities, online), by grade, by earned/unearned, plus full-text search.
- **Spoiler setting** — on by default: hidden story trophies stay covered (name and description) until you earn them.
- **Roadmap to the platinum** — four stages in the order the published roadmaps recommend, with the time each stage takes and the trophies in it.
- **Cited guides** — every trophy's guide names its source (Push Square, PowerPyx, GTABase, Insider Gaming, KeenGamer) beside the guide text, shown as a source chip under the guide.
- **Key steps** — each guide opens as a numbered list of steps, so its substance is readable at a glance, with the source chip right below it.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Or serve the app directly:

```sh
node serve.ts
# then open http://localhost:8080
```

The app is plain static files under `app/` — no build step, no network at run time. Open `app/index.html` in desktop Chrome with the network off and it works.

Screenshot scenes (used by the maker's screenshot runs) take `?shot=checklist|guide|roadmap|filters`, `?compact=1` for a denser layout with an open guide pinned to the bottom, and `?focus=guide` for a full-page guide reader; `?trophy=<id>` opens a guide, `?spoilers=on|off` sets the spoiler toggle, and `?earned=<ids>` pre-checks trophies.

## Trophy data

`app/data/trophies.json` holds all 55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze, 28 of them hidden on PlayStation until earned. Each entry carries the official name and description, grade, hidden flag, kind, missable flag, roadmap stage, the count PlayStation tracks (where one exists), a guide in our own words, and the source it cites.

Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

Ref: gbg9q3ye
