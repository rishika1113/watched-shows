import { useMemo, useState } from 'react'
import raw from './data/shows.json'
import tmdb from './data/tmdb.json'

const IMG = 'https://image.tmdb.org/t/p'

// Merge TMDB details in; spreadsheet values win, TMDB fills the gaps.
function enrich(s) {
  const t = tmdb[s.title]
  if (!t) return s
  return {
    ...s,
    start: s.start ?? t.firstYear,
    end: 'end' in s ? (s.end ?? t.lastYear) : undefined,
    tmdb: t,
  }
}

const data = {
  finished: raw.finished.map(enrich),
  wishlist: raw.wishlist.map(enrich),
  discontinued: raw.discontinued.map(enrich),
}

const TABS = [
  { id: 'finished', label: 'Finished', items: data.finished },
  { id: 'wishlist', label: 'Wishlist', items: data.wishlist },
  { id: 'discontinued', label: 'Dropped', items: data.discontinued },
]

const SORTS = {
  rank: { label: 'My rank', fn: (a, b) => (a.rank ?? 0) - (b.rank ?? 0) },
  imdb: { label: 'IMDB', fn: (a, b) => (b.imdb ?? -1) - (a.imdb ?? -1) },
  year: { label: 'Newest', fn: (a, b) => (b.start ?? -1) - (a.start ?? -1) },
  title: { label: 'A–Z', fn: (a, b) => a.title.localeCompare(b.title) },
}

function years(s) {
  if (!s.start) return null
  if (!('end' in s) || s.end === undefined || s.end === s.start) return `${s.start}`
  return s.end ? `${s.start}–${s.end}` : `${s.start}–`
}

function Poster({ show, size, className }) {
  const [failed, setFailed] = useState(false)
  const path = show.tmdb?.poster
  if (!path || failed) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 font-display font-semibold text-zinc-500`}
        aria-hidden="true"
      >
        {show.title.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      src={`${IMG}/${size}${path}`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} bg-zinc-800 object-cover`}
    />
  )
}

function Rating({ value }) {
  if (value == null) return <span className="text-sm text-zinc-600">—</span>
  const tone =
    value >= 8.5 ? 'text-amber-300' : value >= 7.5 ? 'text-zinc-200' : 'text-zinc-400'
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${tone}`}>
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" />
      </svg>
      {value.toFixed(1)}
    </span>
  )
}

function Details({ show }) {
  const t = show.tmdb
  if (!t) return <p className="text-sm text-zinc-500">No TMDB details for this show yet.</p>
  return (
    <div className="space-y-2 text-sm">
      {t.genres?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {t.genres.map((g) => (
            <span key={g} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {g}
            </span>
          ))}
          {t.seasons && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {t.seasons} season{t.seasons > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      {t.overview && <p className="leading-relaxed text-zinc-300">{t.overview}</p>}
      <a
        href={`https://www.themoviedb.org/tv/${t.id}`}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs font-medium text-amber-400 hover:underline"
      >
        View on TMDB ↗
      </a>
    </div>
  )
}

function Podium({ shows, open, onToggle }) {
  const medal = ['from-amber-300 to-amber-600', 'from-zinc-200 to-zinc-500', 'from-orange-300 to-orange-700']
  return (
    <ol className="mb-8 grid grid-cols-3 gap-3">
      {shows.map((s, i) => (
        <li key={s.title}>
          <button
            onClick={() => onToggle(s.title)}
            className="group relative block w-full overflow-hidden rounded-2xl border border-zinc-800 text-left"
          >
            <Poster show={s} size="w342" className="aspect-[2/3] w-full transition group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <span
                className={`bg-gradient-to-br ${medal[i]} bg-clip-text font-display text-4xl font-extrabold leading-none text-transparent sm:text-6xl`}
              >
                {s.rank}
              </span>
              <h3 className="mt-1 font-display text-sm font-semibold leading-tight sm:text-xl">{s.title}</h3>
              <div className="mt-1 hidden items-center gap-3 text-sm text-zinc-300 sm:flex">
                {years(s) && <span>{years(s)}</span>}
                <Rating value={s.imdb} />
              </div>
            </div>
          </button>
          {open === s.title && (
            <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
              <Details show={s} />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function App() {
  const [tab, setTab] = useState('finished')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rank')
  const [open, setOpen] = useState(null)

  const current = TABS.find((t) => t.id === tab)
  const isRanked = tab === 'finished'
  const sortKey = !isRanked && sort === 'rank' ? 'imdb' : sort
  const toggle = (title) => setOpen((o) => (o === title ? null : title))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = current.items.filter((s) => s.title.toLowerCase().includes(q))
    return tab === 'discontinued' ? items : [...items].sort(SORTS[sortKey].fn)
  }, [current, query, sortKey, tab])

  const showPodium = isRanked && sortKey === 'rank' && !query
  const rest = showPodium ? list.slice(3) : list
  const offset = showPodium ? 3 : 0

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:pt-14">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-400/80">
          {data.finished.length} shows watched
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold sm:text-5xl">My TV Shows</h1>
      </header>

      <nav className="mb-5 flex gap-1 rounded-xl bg-zinc-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {t.label} <span className="opacity-60">{t.items.length}</span>
          </button>
        ))}
      </nav>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shows…"
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm placeholder:text-zinc-500 focus:border-amber-400/60 focus:outline-none"
        />
        {tab !== 'discontinued' && (
          <div className="flex gap-1 overflow-x-auto">
            {Object.entries(SORTS)
              .filter(([k]) => isRanked || k !== 'rank')
              .map(([k, s]) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    sortKey === k
                      ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
                      : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {showPodium && <Podium shows={list.slice(0, 3)} open={open} onToggle={toggle} />}

      {list.length === 0 ? (
        <p className="py-12 text-center text-zinc-500">No shows match “{query}”.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          {rest.map((s, i) => (
            <li key={s.title + i}>
              <button
                onClick={() => toggle(s.title)}
                aria-expanded={open === s.title}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-900 sm:gap-4 sm:px-4"
              >
                <span className="w-7 shrink-0 text-right font-display text-lg font-semibold tabular-nums text-zinc-500">
                  {isRanked ? s.rank : i + offset + 1}
                </span>
                <Poster show={s} size="w92" className="h-14 w-10 shrink-0 rounded-md text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  {years(s) && <p className="text-xs text-zinc-500">{years(s)}</p>}
                </div>
                {tab !== 'discontinued' && <Rating value={s.imdb} />}
              </button>
              {open === s.title && (
                <div className="px-4 pb-4 pl-[5.5rem] sm:pl-[6.25rem]">
                  <Details show={s} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-12 flex items-center gap-3 text-xs text-zinc-600">
        <img
          src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
          alt="TMDB"
          className="h-3"
        />
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  )
}
