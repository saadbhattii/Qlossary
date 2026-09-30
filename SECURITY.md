# Security policy

## Supported versions

Only the live site, [qlossary.pages.dev](https://qlossary.pages.dev), and the
`main` branch are supported.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub:
[**Report a vulnerability**](https://github.com/saadbhattii/Qlossary/security/advisories/new).

Include what you found, how to reproduce it, and what an attacker could do
with it. You should get an answer within a week. Please give a reasonable time
to fix it before telling anyone else.

## What is in scope

- The page: script injection, ways around the Content-Security-Policy, leaking
  data from localStorage.
- The leaderboard API (`functions/api/`, `lib/leaderboard.js`): SQL
  injection, getting browser IDs or IP hashes out, bypassing the rate limit or
  the one-daily-per-browser rule, storing names that should be refused.

## Known limitations (not vulnerabilities)

- **Scores are computed in the browser**, so a determined person can send a
  fake score that passes the checks. The checks stop impossible scores and
  casual tampering; obvious fakes are removed by hand. See
  [docs/LEADERBOARD.md](docs/LEADERBOARD.md).
- Anyone can play under any name that passes the name rules; a player is a name
  plus a browser ID, so nobody can add to someone else's total.

## How the site protects players

- A strict Content-Security-Policy: only the page's own inline script and
  style, no external resources, same-site `fetch` only.
- No cookies, analytics or trackers. Only the chosen name, the score and a
  random browser ID are sent, and only when the player presses "Add my score".
- IP addresses are never stored, only a hash that changes every day.
