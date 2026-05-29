// One-time script: download NZ general electorate GeoJSON and bundle into a single file
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://raw.githubusercontent.com/tuttinator/nz-electorates/master/2014/general/';
const OUT  = join(__dir, '../public/data/electorates-general.geojson');

const features = [];
for (let i = 1; i <= 64; i++) {
  const n   = String(i).padStart(3, '0');
  const url = `${BASE}${n}.geojson`;
  try {
    const r = await fetch(url);
    if (!r.ok) { console.warn(`SKIP ${n}: HTTP ${r.status}`); continue; }
    const fc = await r.json();
    // Each file is a FeatureCollection — extract the inner features
    const inner = fc.type === 'FeatureCollection' ? fc.features : [fc];
    inner.forEach(f => features.push(f));
    const name = inner[0]?.properties?.name || n;
    process.stdout.write(`\r${i}/64 — ${name}                `);
  } catch (e) {
    console.warn(`\nFAIL ${n}:`, e.message);
  }
}

const geojson = { type: 'FeatureCollection', features };
writeFileSync(OUT, JSON.stringify(geojson));
console.log(`\nSaved ${features.length} features → ${OUT}`);
