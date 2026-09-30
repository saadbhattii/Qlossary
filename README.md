# Qlossary

Hangman for quantum computing jargon. 1,926 terms in 16 topics, from
foundations and gates to hardware, error correction, error mitigation and many more, with a global leaderboard.

The game is one HTML file with the styles, code, icon and word list inlined:
one request of about 36 KB, plus the two Geist fonts (about 48 KB, served
from the same site), no outside connections, no dependencies. The worldwide leaderboard runs on Cloudflare Pages Functions with a D1
database. It is contacted when the Home or Scores screen opens and when a
player presses "Add my score".

After each word the game shows a short definition of the term, a note when
the word means something else in everyday English or another field, and a
**Learn more** button that searches the term with "in quantum computing"
added. Definitions are loaded only after a word ends, one small file per
topic, so they never slow down the page or the guessing.

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
      definitions/<topic>.tsv  short definitions, loaded after each word
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
    static/fonts/          Geist and Geist Mono (Latin subset), copied to dist/fonts/
    test/                  node:test suites
    tools/
      build.mjs            check the data, compute difficulty, inline everything, size check
      rules.mjs            what makes a term playable
      tsv.mjs              reads the data files
      serve.mjs            local preview, including the leaderboard
      d1-local.mjs         stands in for D1 locally, on Node's built-in SQLite
    wrangler.toml          Cloudflare settings: output folder and database binding

## Definitions

Definitions live in `data/definitions/<topic>.tsv`, one line per term:
term, definition (40 to 330 characters), and an optional "other meaning" for
words that mean something different elsewhere. See
`data/definitions/README.md` for the format and which topics are done.
`npm run check` shows how many terms have a definition. The build refuses a
definition whose term doesn't exist, and writes each topic to
`dist/defs/<topic>.<hash>.json` for the game to load.

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
"book-a" from Lucide, under the ISC licence. The Geist fonts are under the
SIL Open Font License 1.1; see `THIRD_PARTY.md` and `static/fonts/OFL.txt`.
