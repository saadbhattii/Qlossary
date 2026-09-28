# Qlossary

Hangman for quantum computing jargon. 1,926 terms in 16 topics, from
foundations and gates to hardware, error correction, error mitigation and many more, with a global leaderboard.

The game is one HTML file with the styles, code, icon and word list inlined:
one request of about 31 KB, no outside connections, no dependencies. The worldwide leaderboard runs on Cloudflare Pages Functions with a D1
database. It is contacted only on the Scores screen and when a player presses
"Add my score", so playing never makes a second request.

## Playing

- **10-word game:** ten terms, one total score.
- **Endless:** keep going until you miss three terms.
- **Daily challenge:** five terms from five topics, the same for everyone, new
  at midnight UTC, one try per day.
- **Practice:** no score, and the timer can be turned off.

Only A to Z are guessed. Spaces, digits and punctuation are shown from the
start, and accented letters count as their plain letter.

**Keys:**
- Letters guess.
- 1, 2 and 3 take the hints.
- Enter moves on.

**Points for a solved word:**
- 10 for each different letter, times the difficulty: easy 1, medium 1.5,
  hard 2, expert 3.
- Plus 2 for each second left.
- Minus 10 for each wrong guess.
- Minus hint costs: topic 25, subtopic 50, each revealed letter 30.

**Timer:** the automatic timer gives 40 seconds plus 3 for each different
letter, at most 120.

**Local data:** scores, progress and settings stay in the browser's
localStorage. They can be moved with Export and Import on the Scores screen.

## Repository

    brand/                 icon.svg (header), favicon.svg (browser tab)
    data/
      domains.tsv          topic ids and the names players see, in display order
      terms/<topic>.tsv    the word list, one file per topic
    functions/api/         Cloudflare Pages Functions: leaderboard.js (GET), scores.js (POST)
    lib/leaderboard.js     leaderboard rules and SQL, shared by the functions and tests
    migrations/            D1 table definition
    src/
      index.html           page template
      style.css            all styling
      js/                  game code as small ES modules (world.js talks to the leaderboard)
    static/_headers        security and cache headers for Cloudflare Pages
    test/                  node:test suites
    tools/
      build.mjs            check the data, compute difficulty, inline everything, size check
      rules.mjs            what makes a term playable
      tsv.mjs              reads the data files
      serve.mjs            local preview, including the leaderboard
      d1-local.mjs         stands in for D1 locally, on Node's built-in SQLite
    wrangler.toml          Cloudflare settings: output folder and database binding

## Editing the words

Each file in `data/terms/` is tab-separated, one term per line:

    term <tab> subtopic <tab> aliases <tab> difficulty <tab> origin

- **term:** the answer, as shown at the end of a round.
- **subtopic:** free text. Shown by the second hint.
- **aliases:** acronyms or other names, shown after the round. Optional.
- **difficulty:** leave blank to compute it from the letters, or write easy,
  medium, hard or expert.
- **origin:** `original` for terms from the first Qlossary list, `added` for
  terms added later. Not shown to players; it is there to make review easy.

To add a topic, add a line to `data/domains.tsv` and create
`data/terms/<id>.tsv`. Existing players get new topics switched on
automatically.

`npm run build` refuses terms that:
- duplicate another term, ignoring case, accents and punctuation;
- use letters outside A to Z after removing accents;
- have fewer than 4 letters or fewer than 3 different letters;
- are longer than 44 characters;
- contain `|`, `~` or `;`.

It also fails if the page grows past 140 KB, or 40 KB compressed.

## Licences

The code and word list are under the MIT licence in `LICENSE`. The icon is
"book-a" from Lucide, under the ISC licence; see `THIRD_PARTY.md`.
