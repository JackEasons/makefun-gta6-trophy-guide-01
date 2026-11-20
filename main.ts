// Leonida Trophy Atlas — the hand-in program for gta6-trophy-guide-01 (Node 22,
// standard library only). The guide is this directory's app/ folder: plain static
// files a desktop browser opens at app/index.html, offline, with the 55 trophies
// and their guides in app/data/trophies.json. This program copies app/ and
// screenshots/ into /output and writes /output/dossier.json, the summary the judge
// reads (screenshots first, then the first load's files and bytes, then the source),
// using the vendored make.fun library. vendor/makefun-frontend.ts stays as the kit
// shipped it: the scorer rebuilds the dossier with its own copy and compares the
// two byte for byte, so this file must not touch the library's output.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4 screenshots
// or one over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app
// files in all. app/ counts beside /output's own 1000-entry cap, its screenshots/
// and dossier.json, so the caps below leave that room.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function countEntries(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    total += 1;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) total += countEntries(full);
  }
  return total;
}

// Fail fast, with a readable message, if the trophy data is broken: a guide
// that ships with fewer than 55 trophies or a blank guide would fail the
// scorer's trophies check, so refuse to hand in a dossier built from bad data.
function checkTrophyData() {
  const dataPath = join(REPO_ROOT, 'app', 'data', 'trophies.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const list = data.trophies ?? data;
  if (!Array.isArray(list) || list.length !== 55) {
    throw new Error(`trophies.json must hold exactly 55 trophies, found ${Array.isArray(list) ? list.length : 'no array'}`);
  }
  const broken = list.filter((t) => !t.name || !t.guide?.trim() || !t.source || !t.sourceUrl);
  if (broken.length) {
    throw new Error(`${broken.length} trophies are missing a name, guide or source`);
  }
  return list.length;
}

// Fail fast if a screenshot is over the gate's 256 KiB cap: buildDossier
// would refuse the dossier, and a late failure wastes a whole run.
function checkScreenshots() {
  const dir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(dir)) return;
  const over = readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .filter((n) => statSync(join(dir, n)).size > 262144);
  if (over.length) throw new Error(`screenshot(s) over the 256 KiB cap: ${over.join(', ')}`);
}

mkdirSync(OUT_DIR, { recursive: true });
const trophyCount = checkTrophyData();
checkScreenshots();
cpSync(join(REPO_ROOT, 'app'), join(OUT_DIR, 'app'), { recursive: true });
mkdirSync(join(OUT_DIR, 'screenshots'), { recursive: true });
if (existsSync(join(REPO_ROOT, 'screenshots'))) {
  cpSync(join(REPO_ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'), { recursive: true });
}

const dossierPath = join(OUT_DIR, 'dossier.json');
writeFileSync(dossierPath, buildDossier(OUT_DIR, DOSSIER_OPTIONS));

const shotFiles = readdirSync(join(OUT_DIR, 'screenshots')).filter((n) => !n.startsWith('.')).sort();
const shotSizes = shotFiles.map((n) => `${n} ${statSync(join(OUT_DIR, 'screenshots', n)).size}B`).join(', ');
const dossierBytes = statSync(dossierPath).size;
console.log(
  `Leonida Trophy Atlas handed in: ${trophyCount} trophies, ${countEntries(join(OUT_DIR, 'app'))} app entries, ` +
    `${shotFiles.length} screenshots (${shotSizes}), dossier ${dossierBytes} bytes -> ${OUT_DIR}`,
);
