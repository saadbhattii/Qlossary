# Architecture

Qlossary has two parts:

1. **The game:** one static HTML page, `dist/index.html`, with the styles,
   code, icon and the whole word list inlined. It runs entirely in the browser.
2. **The worldwide leaderboard (optional):** three Cloudflare Pages Functions
   over one D1 (SQLite) table. The game works without it.

```
            build (tools/build.mjs)
data/*.tsv ─┐
src/*.css  ─┼──►  dist/index.html   (one request, ~36 KB Brotli)
src/js/*.js ┤     dist/defs/<topic>.<hash>.json   (definitions, fetched after a word ends)
brand/*.svg ┘     dist/fonts/*.woff2 (Geist, Geist Mono)
static/     ───►  dist/_headers      (CSP with the inline hashes, cache rules)

browser ──GET /api/leaderboard, /api/activity──►  functions/api/*.js ──► lib/leaderboard.js ──► D1 "scores"
        ──POST /api/scores (Add my score)──────►
```

## The build

`tools/build.mjs` (no dependencies):

1. Reads `data/domains.tsv`, `data/terms/*.tsv` and `data/definitions/*.tsv`
   (via `tools/tsv.mjs`) and validates them (`tools/rules.mjs`); any problem
   stops the build with the file and line.
2. Computes each term's difficulty (0–3) unless the data file sets one.
3. Writes each topic's definitions to `dist/defs/<topic>.<hash>.json`, named by
   content hash so they can be cached forever.
4. Encodes the word list into a compact text format (below) and bundles the
   modules in `src/js/` into one IIFE, stripping `import`/`export` lines and
   comments.
5. Minifies `src/style.css` and fills the placeholders in `src/index.html`:
   `/*CSS*/`, `/*JS*/`, `/*ICON*/` (from `brand/icon.svg`) and `/*FAVICON*/`
   (from `brand/favicon.svg`, as a data URI).
6. Copies `static/fonts/` to `dist/fonts/`, writes `dist/_headers` with the
   SHA-256 hashes of the inline script and style, and fails if the page is over
   140 KB raw or 40 KB Brotli.

### Module order

Modules are concatenated in this order, and each may only use names from the
ones above it:

| Module | Job |
| --- | --- |
| `normalize.js` | Fold accents to A–Z, mask a term, make a matching key. Also used by the tools. |
| `rng.js` | Seeded random numbers (for the daily set). |
| `data.js` | Decode the embedded word list. |
| `score.js` | Points for one word, the automatic timer length. |
| `round.js` | State of one word: guesses, lives, hints, the drawing frame. |
| `pick.js` | Which terms are in play, the next term, the daily five. |
| `timer.js` | A countdown against a fixed deadline, so it never drifts. |
| `store.js` | Everything saved in localStorage (keys prefixed `qh.`), guarded against full or blocked storage. |
| `world.js` | Talks to the leaderboard API; caches lists for 30 seconds; the random browser ID. |
| `defs.js` | Fetches a topic's definitions after a word ends; the Learn more link. |
| `main.js` | Screens, rendering, input, settings, scores, export/import. |

A new module must be added to `MODULES` in `tools/build.mjs` in the right place.

### Embedded word list format

One record per line, in the constant `QDATA`:

```
line 1: topics      id~name~definitions file;...
line 2: subtopics   name~topicIndex;...
rest:   term|subtopicIndex|difficulty 0-3|aliases
```

This is why `|`, `~` and `;` are not allowed in terms, subtopics or aliases.

## The page at run time

- **Screens** are sections shown by the URL hash: `#home`, `#play`,
  `#scores`, `#settings`, `#help`. `body[data-view]` names the current one.
- **One screen, no scrolling** on desktop: the root font size follows the
  window's width and height, and `fitHome()` trims "Just played" rows until
  Home fits. The Home leaderboard always keeps at least the top 10.
- **Definitions** are fetched only after a word ends, one small file per topic,
  and kept for the rest of the visit, so they never slow the guessing.
- **Leaderboard lists** are fetched when Home or Scores opens, and cached for
  30 seconds.

## Security headers

`static/_headers` becomes `dist/_headers` and sets a strict
Content-Security-Policy:

```
default-src 'none'; script-src '<hash>'; style-src '<hash>'; img-src data:;
font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

Consequences for anyone changing the page:

- Only **the one inline `<script>` and the one inline `<style>`** can run,
  identified by their hashes. Inline `style="..."` attributes, `on...=`
  handlers, extra `<style>`/`<script>` tags and external scripts or
  stylesheets are all blocked.
- Images must be inline SVG or `data:` URIs. Fonts must come from the same site.
- `fetch` may only reach the same site (`/api/...`, `/defs/...`).

## Caching

| Path | Cache-Control |
| --- | --- |
| `/*` (the page) | `public, max-age=0, must-revalidate` |
| `/fonts/*` | `public, max-age=2592000` (30 days) |
| `/defs/*` | `public, max-age=31536000, immutable` (named by content hash) |
| `/api/leaderboard`, `/api/activity` | `public, max-age=30` |

If the fonts ever change, rename the files so returning players do not keep
the old ones for up to 30 days.

## The leaderboard

See [LEADERBOARD.md](LEADERBOARD.md) for the API, boards, the crown and the
anti-cheat checks, and [DEPLOYMENT.md](DEPLOYMENT.md) for setting it up.
