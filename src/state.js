const BASE = import.meta.env.BASE_URL;

const FILES = {
  PIPELINE:   `${BASE}data/pipeline.json`,
  ELECTION:   `${BASE}data/election-results-2023.json`,
  NEWS:       `${BASE}data/news.json`,
};

let _cache = null;

export async function loadAll() {
  if (_cache) return _cache;
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, path]) => {
      const r = await fetch(path);
      if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
      return [key, await r.json()];
    })
  );
  _cache = Object.fromEntries(entries);
  return _cache;
}
