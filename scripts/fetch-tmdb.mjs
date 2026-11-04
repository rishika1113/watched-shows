// Looks up every show in src/data/shows.json on TMDB and saves posters,
// summaries and air years to src/data/tmdb.json (keyed by title).
//
//   npm run posters            -> fetch only shows not looked up yet
//   npm run posters -- --all   -> look everything up again
//
// Wrong match? Put the right TMDB TV id in scripts/tmdb-overrides.json:
//   { "90210": 1100 }   (the id is in the show's TMDB URL: themoviedb.org/tv/1100)
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const key = process.env.TMDB_API_KEY?.trim()
if (!key) {
  console.error('TMDB_API_KEY is missing. Copy .env.example to .env and fill it in.')
  process.exit(1)
}
const isToken = key.startsWith('eyJ') // v4 read access token (JWT)

async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v)
  if (!isToken) url.searchParams.set('api_key', key)
  const res = await fetch(url, {
    headers: isToken ? { Authorization: `Bearer ${key}` } : {},
  })
  if (res.status === 401) throw new Error('TMDB rejected the key (401). Check TMDB_API_KEY in .env.')
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`)
  return res.json()
}

const readJson = async (p, fallback) => {
  try { return JSON.parse(await readFile(new URL(p, root), 'utf8')) } catch { return fallback }
}

const shows = await readJson('src/data/shows.json')
const overrides = await readJson('scripts/tmdb-overrides.json', {})
const cache = process.argv.includes('--all') ? {} : await readJson('src/data/tmdb.json', {})

const all = [...shows.finished, ...shows.wishlist, ...shows.discontinued]
const titles = [...new Map(all.map((s) => [s.title, s])).values()]
const todo = titles.filter((s) => !(s.title in cache) || (overrides[s.title] && cache[s.title]?.id !== overrides[s.title]))

console.log(`${titles.length} shows, ${todo.length} to look up`)
const missed = []

for (const s of todo) {
  let id = overrides[s.title]
  if (!id) {
    let { results } = await tmdb('/search/tv', { query: s.title, first_air_date_year: s.start })
    if (!results.length && s.start) ({ results } = await tmdb('/search/tv', { query: s.title }))
    id = results[0]?.id
  }
  if (!id) {
    cache[s.title] = null
    missed.push(s.title)
    console.log(`  ✗ ${s.title}`)
    continue
  }
  const d = await tmdb(`/tv/${id}`)
  const yr = (date) => (date ? Number(date.slice(0, 4)) : null)
  cache[s.title] = {
    id: d.id,
    name: d.name,
    poster: d.poster_path,
    overview: d.overview || null,
    firstYear: yr(d.first_air_date),
    lastYear: d.status === 'Returning Series' ? null : yr(d.last_air_date),
    seasons: d.number_of_seasons ?? null,
    genres: d.genres?.map((g) => g.name) ?? [],
  }
  const note = d.name.toLowerCase() !== s.title.toLowerCase() ? `  (matched "${d.name}")` : ''
  console.log(`  ✓ ${s.title}${note}`)
}

await writeFile(new URL('src/data/tmdb.json', root), JSON.stringify(cache, null, 1))
console.log(`Saved src/data/tmdb.json${missed.length ? ` — not found: ${missed.join(', ')}` : ''}`)
