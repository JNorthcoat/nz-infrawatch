// Simplify the electorate GeoJSON to reduce file size for web delivery
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const IN  = join(__dir, '../public/data/electorates-general.geojson');
const OUT = join(__dir, '../public/data/electorates-general-simple.geojson');

const TOLERANCE = 0.005; // ~500m at NZ latitudes — enough for zoom-6 national view

function sqDist(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return dx*dx + dy*dy;
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const t2 = tol * tol;
  let maxD = 0, idx = 0;
  const [first, last] = [pts[0], pts[pts.length - 1]];
  const dx = last[0] - first[0], dy = last[1] - first[1];
  const len2 = dx*dx + dy*dy;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let d2;
    if (len2 === 0) {
      d2 = sqDist(pts[i], first);
    } else {
      const t = Math.max(0, Math.min(1, ((px - first[0])*dx + (py - first[1])*dy) / len2));
      d2 = sqDist(pts[i], [first[0] + t*dx, first[1] + t*dy]);
    }
    if (d2 > maxD) { maxD = d2; idx = i; }
  }
  if (maxD > t2) {
    const l = rdp(pts.slice(0, idx + 1), tol);
    const r = rdp(pts.slice(idx), tol);
    return [...l.slice(0, -1), ...r];
  }
  return [first, last];
}

function simplifyRing(ring) {
  const s = rdp(ring, TOLERANCE);
  // Ensure ring is closed
  if (s.length < 4) return ring; // too small, keep original
  if (s[0][0] !== s[s.length-1][0] || s[0][1] !== s[s.length-1][1]) s.push(s[0]);
  return s;
}

function simplifyGeom(geom) {
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: geom.coordinates.map(simplifyRing) };
  }
  if (geom.type === 'MultiPolygon') {
    return { ...geom, coordinates: geom.coordinates.map(poly => poly.map(simplifyRing)) };
  }
  return geom;
}

const raw  = JSON.parse(readFileSync(IN, 'utf8'));
const simplified = {
  ...raw,
  features: raw.features.map(f => ({ ...f, geometry: simplifyGeom(f.geometry) })),
};

const out = JSON.stringify(simplified);
writeFileSync(OUT, out);

const inKB  = Math.round(readFileSync(IN).length / 1024);
const outKB = Math.round(out.length / 1024);
console.log(`Simplified: ${inKB} KB → ${outKB} KB (${(outKB/inKB*100).toFixed(0)}%)`);
console.log(`Features: ${simplified.features.length}`);
