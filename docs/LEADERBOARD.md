# Worldwide leaderboard

The leaderboard is optional: without a database the game still works and the
lists say so. It is three Cloudflare Pages Functions in `functions/api/` over
one D1 table (`migrations/0001_scores.sql`). All rules and SQL live in
`lib/leaderboard.js`, shared with the tests.

## API

| Request | Returns |
| --- | --- |
| `GET /api/leaderboard?board=<board>[&me=<browser id>]` | `{ board, day, since, entries: [...] }`, top 20. |
| `GET /api/activity[?me=<browser id>]` | `{ now, recent: [...], champion, playersToday }`: the last 5 games, yesterday's daily winner, players today. |
| `POST /api/scores` with `{ mode, name, pts, won, day, cid }` | `{ rank, personalBest, total: { points, games, rank, next } }` |

`board` is `total`, `week`, `run`, `endless` or `daily`. `me` is used only to
mark the asking browser's own rows with `you: true`; **browser IDs are never
returned**. Rows of the all-time leader carry `crown: true`.

Errors come back as `{ error: "<sentence for the player>" }` with a 4xx or 5xx
status.

## Boards

| Board | Ranking |
| --- | --- |
| `total` | Sum of every score a player has added, all modes. |
| `week` | The same, since Monday 00:00 UTC. |
| `run` | Single 10-word games. |
| `endless` | Single endless runs. |
| `daily` | Today's daily challenge (UTC). |

**A player is a name plus a browser ID (`cid`)**, a random ID made once per
browser. So the same name typed in another browser is a different player, and
nobody can add to someone else's total.

## The crown

`crownHolder()` finds the (name, `cid`) pair at the top of the all-time total
(ties go to whoever reached it first). Every row from that exact player, on
every board, in "Just played" and in the daily champion line, gets
`crown: true`, and the page shows a gold crown before the name. It moves
automatically when someone overtakes them.

## Checks on a submitted score

`checkScore()` refuses:

- unknown modes, and names that are empty, longer than 12 characters, use
  characters other than letters, digits, spaces, `.`, `-`, `_`, or contain a
  blocked word;
- a missing or malformed browser ID;
- a score from a different UTC day than the server's;
- unfinished games (10-word must have 10 words, daily 5), endless runs with more
  than 3 misses, or more than 1,000 words;
- any word worth more than the most a word can earn (26 letters × 10 × 3 + 120
  seconds × 2 = 1,020), a total of zero, or a solved count that does not add up.

`addScore()` also:

- allows **20 scores per hour per connection** (by a daily-salted hash of the IP
  address; the address itself is never stored);
- allows **one daily challenge per browser per day** (also enforced by a unique
  index).

Scores are computed in the browser, so these checks stop mistakes and casual
tampering, not a determined cheater.

## Moderation

Remove a bad entry with Wrangler (see [DEPLOYMENT.md](DEPLOYMENT.md)):

```sh
# look first
npx wrangler d1 execute qlossary --remote --command "SELECT id, mode, name, score, day FROM scores WHERE name = 'BadName'"
# then delete by id
npx wrangler d1 execute qlossary --remote --command "DELETE FROM scores WHERE id = 123"
```

Deleting rows can change who holds the crown; that updates on the next request.

## Table

```sql
scores (id, mode, name, score, won, played, day, created, cid, ip)
```

`day` is the UTC date `YYYY-MM-DD`, `created` is milliseconds since 1970, `ip`
is the daily-salted hash. Indexes cover ranking by mode, by day, rate limiting
and the one-daily-per-browser rule.
