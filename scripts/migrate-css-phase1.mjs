import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const appCssPath = path.join(root, 'src/App.css');
const lines = fs.readFileSync(appCssPath, 'utf8').split('\n');

function extractRanges(ranges) {
  const chunks = [];
  for (const [start, end] of ranges) {
    chunks.push(lines.slice(start - 1, end).join('\n'));
  }
  return chunks.join('\n\n');
}

function removeRanges(ranges) {
  const remove = new Set();
  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i += 1) remove.add(i);
  }
  return lines.filter((_, idx) => !remove.has(idx + 1));
}

const extractions = {
  'src/styles/tokens.css': [[45, 167]],
  'src/styles/base.css': [[1, 1], [3, 27]],
  'src/styles/layout.css': [
    [29, 42],
    [169, 265],
    [2499, 2597],
    [2600, 2667],
    [2675, 2734],
  ],
  'src/styles/components.css': [[1576, 2353], [3632, 3664]],
  'src/styles/overlays.css': [
    [2669, 2673],
    [4896, 5018],
    [5639, 5771],
  ],
  'src/styles/screens/auth.css': [[2736, 3628], [7765, 8167]],
  'src/styles/screens/doctor-summary.css': [[5882, 6162]],
  'src/styles/screens/full-flow.css': [[5203, 5326], [5773, 5863]],
  'src/styles/screens/activity-insights.css': [[9148, 9205]],
};

const allRanges = Object.values(extractions).flat();

for (const [file, ranges] of Object.entries(extractions)) {
  const outPath = path.join(root, file);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const header = `/* Curavon styles — migrated from App.css (Phase 1) */\n\n`;
  fs.writeFileSync(outPath, header + extractRanges(ranges) + '\n');
}

const legacyHeader = `/*
Legacy holding stylesheet.
Curavon CSS is being migrated into src/styles/ in phases.
Do not add new screen styles here unless unavoidable.
*/

`;

const remaining = removeRanges(allRanges.sort((a, b) => a[0] - b[0]));
fs.writeFileSync(appCssPath, legacyHeader + remaining.join('\n'));

console.log('Migrated CSS sections. App.css lines:', remaining.length);
