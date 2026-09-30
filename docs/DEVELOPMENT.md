# Development

How to work on Qlossary locally. For how the pieces fit together see
[ARCHITECTURE.md](ARCHITECTURE.md); for editing words see [DATA.md](DATA.md).

## Requirements

- **Node 18 or later.** No `npm install` is needed: the project has no
  dependencies.
- **Node 22.5 or later** to run the worldwide leaderboard locally and its
  tests, which use Node's built-in SQLite. `.nvmrc` pins Node 22. On older Node
  the page works and the leaderboard reports that it is not set up.

## Quick start

```sh
git clone https://github.com/saadbhattii/Qlossary.git
cd Qlossary
npm test
npm run preview      # http://localhost:8788
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Validates `data/`, computes difficulties, inlines CSS, JS, icon and word list into `dist/index.html`, writes `dist/defs/*.json`, copies the fonts, writes `dist/_headers` with the CSP hashes, and checks the size budget. |
| `npm run check` | Validates the word list and definitions only; prints counts per topic. |
| `npm test` | Runs every suite in `test/` with `node --test`. |
| `npm run preview` | Builds, then serves `dist/` with `tools/serve.mjs` on port 8788 (pass another port as an argument to `node tools/serve.mjs`). |

The preview server sends the same headers as production (it reads
`dist/_headers`) and runs the functions in
`functions/api/` against a local SQLite file in `.local/leaderboard.sqlite`.
Delete `.local/` to start with an empty leaderboard.

## Tests

| Suite | Covers |
| --- | --- |
| `test/logic.test.mjs` | Letter folding, masking, scoring, timer, word picking, the daily set, the data format. |
| `test/data.test.mjs` | Every term and definition in `data/` passes the build's rules. |
| `test/leaderboard.test.mjs` | Score checks, every board, the crown, recent activity, rate limits, the HTTP functions, on a real local database. |

Add or update a test with every change to game logic, the data rules or the
leaderboard.

## Size budget

The build fails if `dist/index.html` grows past **140 KB raw or 40 KB
Brotli-compressed**. The word list is about half of it. Keep CSS and JS lean,
and do not inline images or fonts into the page.

## Project layout

```
brand/                 icon.svg (header), favicon.svg (browser tab), logo.svg (for other uses)
data/
  definitions/<topic>.tsv  short definitions, loaded after each word (see its README.md)
  domains.tsv          topic ids and the names players see, in display order
  terms/<topic>.tsv    the word list, one file per topic
docs/                  these guides and the README screenshots
functions/api/         Cloudflare Pages Functions: leaderboard.js, activity.js (GET), scores.js (POST)
lib/leaderboard.js     leaderboard rules and SQL, shared by the functions and tests
migrations/            D1 table definition
src/
  index.html           page template with /*CSS*/, /*JS*/, /*ICON*/, /*FAVICON*/ placeholders
  style.css            all styling
  js/                  game code as small ES modules, bundled in a fixed order
static/_headers        security and cache headers for Cloudflare Pages
static/fonts/          Geist and Geist Mono (Latin subsets), copied to dist/fonts/
test/                  node:test suites
tools/
  build.mjs            validate, compute difficulty, inline everything, size check
  rules.mjs            what makes a term playable
  tsv.mjs              reads the data files
  serve.mjs            local preview, including the leaderboard
  d1-local.mjs         stands in for D1 locally, on Node's built-in SQLite
wrangler.toml          Cloudflare settings: output folder and database binding
```

## Checking your change in a browser

1. `npm run preview` and open http://localhost:8788.
2. Try desktop and a phone-sized window (for example 390 × 844 in the browser's
   device toolbar).
3. Play a word to the end, open **See definition**, and check Home, Scores,
   Settings and Help.
4. Open the browser console: there must be no errors, and in particular no
   Content-Security-Policy violations (see
   [ARCHITECTURE.md](ARCHITECTURE.md#security-headers)).
5. Home, the game and the result should fit on one screen on desktop without
   scrolling.

## Common problems

| Problem | Fix |
| --- | --- |
| "The leaderboard database is not set up" in preview | Use Node 22.5 or later. |
| Styles or script do nothing in preview | A CSP hash mismatch: rebuild (`npm run preview` rebuilds), and do not add inline `style="..."` attributes or inline event handlers. |
| Build says "over budget" | Something grew the page past 40 KB Brotli; trim CSS/JS or move data out. |
| Build lists data problems | Fix the lines it names; the rules are in [DATA.md](DATA.md). |
