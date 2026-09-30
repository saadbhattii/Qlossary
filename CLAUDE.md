# CLAUDE.md

Context for AI coding assistants (Claude and others) working on this
repository. Read this first, then the guide in `docs/` for the area you touch.

## What this is

**Qlossary** is hangman for quantum computing jargon: 1,926 terms in 16
topics, each with a short definition, plus an optional worldwide leaderboard.
Live at https://qlossary.pages.dev. Owner: @saadbhattii. MIT licence.

- The game is **one static HTML page**: `tools/build.mjs` inlines
  `src/style.css`, the modules in `src/js/`, the icon and the whole word list
  from `data/` into `dist/index.html`.
- The leaderboard is **Cloudflare Pages Functions** (`functions/api/`) over one
  **D1** table, with all rules and SQL in `lib/leaderboard.js`.
- **No dependencies.** Node 18+ builds it; Node 22.5+ (see `.nvmrc`) also runs
  the leaderboard locally on built-in SQLite.

## Commands

```sh
npm test           # all node:test suites; must pass
npm run build      # validate data, build dist/, enforce the size budget; must pass
npm run check      # data checks only
npm run preview    # build + serve http://localhost:8788 with production headers and a local leaderboard
```

Run `npm test` and `npm run build` before every commit.

## Where things are

| Path | What |
| --- | --- |
| `src/index.html` | Page template; placeholders `/*CSS*/`, `/*JS*/`, `/*ICON*/`, `/*FAVICON*/`. |
| `src/style.css` | All styling; tokens at the top; phone rules in `@media (max-width: 700px)`. |
| `src/js/*.js` | ES modules, concatenated in the order of `MODULES` in `tools/build.mjs`: normalize, rng, data, score, round, pick, timer, store, world, defs, main. A module may only use names from modules before it. |
| `src/js/main.js` | Screens, rendering, input, settings, scores, export/import, `fitHome()`. |
| `data/terms/*.tsv`, `data/definitions/*.tsv`, `data/domains.tsv` | Game content. Rules in `docs/DATA.md`. |
| `lib/leaderboard.js` | Score checks, boards, crown, activity, rate limits. |
| `functions/api/` | `leaderboard.js`, `activity.js` (GET), `scores.js` (POST). |
| `static/_headers` | CSP and cache rules; the build fills in the CSP hashes. |
| `static/fonts/` | Geist and Geist Mono, Latin subsets, OFL. |
| `brand/` | `icon.svg` (header), `favicon.svg`, `logo.svg`. |
| `tools/` | `build.mjs`, `rules.mjs`, `tsv.mjs`, `serve.mjs`, `d1-local.mjs`. |
| `test/` | `logic.test.mjs`, `data.test.mjs`, `leaderboard.test.mjs`. |
| `docs/` | Player, development, architecture, data, leaderboard, deployment and design guides; `docs/screenshots/`. |

## Hard constraints (breaking these breaks the site)

1. **Content-Security-Policy.** Only the single inline `<script>` and
   `<style>` run (by hash). Never add inline `style="..."` attributes, `on...=`
   handlers, extra `<style>`/`<script>` tags, or external scripts, styles,
   fonts or images. Set styles through classes; create SVG with
   `document.createElementNS` (see `crownIcon()` in `main.js`).
2. **Size budget:** `dist/index.html` ≤ 140 KB raw and ≤ 40 KB Brotli (about
   36.7 KB now). Do not inline fonts or images.
3. **No dependencies** and no outside connections. Fonts are self-hosted;
   "Learn more" is only a link.
4. **Privacy:** nothing is sent unless the player presses "Add my score". Never
   return browser IDs (`cid`) or IP hashes from the API; `me` only marks rows
   `you: true`.
5. **`|`, `~`, `;`** are reserved by the embedded data format.
6. **Keep the look.** The owner is happy with the current UI; do not change
   visuals unless asked. Follow `docs/DESIGN.md`.
7. **No rendering "optimisations" on the background art.** An earlier change
   removed the cards' `backdrop-filter` and put the drifting art and grain on
   their own GPU layers (`will-change`, `contain: strict`, `100lvh`). It was
   reverted: it caused glitches in production (a strip of the previous screen
   left painted). Keep the art and cards as they are on desktop. Phones are the
   one exception, inside `@media (max-width: 700px)` only: no overscroll
   bounce, `.art` at `100lvh`, no drift and no card blur, which fixed a dark
   flash when scrolling fast. Keep phone-only fixes inside that block.
8. **One screen on desktop:** Home, the game and the result fit without
   scrolling (root font size follows the viewport). `fitHome()` trims whichever
   Home column reaches lower: the leaderboard down to 3 rows, "Just played"
   down to 1. Never force a fixed number of rows that makes Home scroll.

## Behaviour worth knowing

- **Player identity** on the leaderboard is **name + `cid`** (a random browser
  ID in localStorage key `qh.cid`).
- **The crown:** `crownHolder()` in `lib/leaderboard.js` returns the (name,
  cid) at the top of the all-time total; every row of theirs on every list,
  in activity and the daily champion gets `crown: true`; the page draws a gold
  SVG crown (`.crown` in CSS).
- **Scoring:** 10 × different letters × difficulty (1, 1.5, 2, 3) + 2 per
  second left − 10 per wrong guess − hints (25, 50, 30 each). Server caps a
  word at 1,020 points.
- **Daily challenge:** seeded by UTC date, five terms from five topics, one
  submission per browser per day.
- **Definitions** are fetched after a word ends from
  `/defs/<topic>.<hash>.json` and cached.
- **Switching screens** (`showView()`) scrolls to the top first. Keep it:
  a scroll carried from a taller Home onto a shorter screen made the browser
  leave a strip of Home painted at the bottom. `fitHome()` also runs again
  when the fonts finish loading, since they change text sizes.
- **localStorage** keys are prefixed `qh.`; all access goes through
  `store.js`, which tolerates blocked or full storage.

## How to make a change

1. Branch from `main`; never commit to `main` directly.
2. Keep the change focused; match the surrounding style (small functions,
   short "why" comments, plain words in player-facing text).
3. Add or update tests for logic, data rules or leaderboard changes.
4. `npm test` and `npm run build`; for visible changes also `npm run preview`
   at desktop and phone sizes, and check the console for CSP errors.
5. **Update the docs with every change:** add a line under **Unreleased** in
   `CHANGELOG.md`, update the relevant file in `docs/`, the README if players
   or developers would notice, and this file if a constraint, path or
   behaviour here changes. Refresh `docs/screenshots/` when the UI changes.
6. Commit messages: `feat:`, `fix:`, `docs:`, `data:`, `style:`, `perf:`
   prefixes with a short summary.

## Recent history (for context)

- **Theme:** dark withinquantum look (glows, grid, dots, grain, glass cards,
  Geist fonts, pill buttons) on desktop and phone.
- **Leaderboard:** all-time and weekly totals, "Just played", as many Home
  rows as fit (up to 10), gold crown for the all-time leader.
- **Definitions** for all terms, behind "See definition", with "other meaning"
  notes.
- **Reverted:** the performance change (no `backdrop-filter`, layered art,
  `100lvh`, long cache headers) and the forced top 10 on Home, which together
  caused glitches in production.
- **Brand:** round GitHub icon button; favicon and `brand/logo.svg` are the
  white book without a square.

See `CHANGELOG.md` for the full list.
