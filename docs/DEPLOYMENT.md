# Deployment

Qlossary runs on **Cloudflare Pages**: the static page from `dist/`, plus Pages
Functions from `functions/` for the leaderboard, with a **D1** database.
Settings are in `wrangler.toml`.

## 1. The page only

The game works as plain static files. Build and upload `dist/` anywhere that
can send the headers in `dist/_headers` (Cloudflare Pages reads that file
directly):

```sh
npm run build
```

Without the Functions and database the leaderboard shows a short
"not set up" message and everything else works.

## 2. Cloudflare Pages with the leaderboard

1. **Create the database** (once):

   ```sh
   npx wrangler d1 create qlossary
   ```

   Put the `database_id` it prints into `wrangler.toml` under
   `[[d1_databases]]` (binding `DB`).

2. **Create the table:**

   ```sh
   npx wrangler d1 migrations apply qlossary --remote
   ```

3. **Create the Pages project** in the Cloudflare dashboard (Workers & Pages →
   Create → Pages → connect the GitHub repository), with:

   | Setting | Value |
   | --- | --- |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION` = `22` (optional; any Node 18+ builds) |

4. **Bind the database:** in the project's Settings → Bindings (Functions), add
   a D1 binding named **`DB`** pointing at `qlossary`. (With `wrangler.toml`
   in the repository, Pages can also pick this up automatically.)

5. **Optional secret:** set **`IP_SALT`** to a long random string. It is mixed
   into the daily hash of each player's IP address used for rate limiting.

6. Push to `main`. Pages builds and deploys each push; pull requests get
   preview URLs.

## Updating

- **Game, words or definitions:** merge to `main`; Pages rebuilds.
- **Database schema:** add a new numbered file in `migrations/`, then run
  `npx wrangler d1 migrations apply qlossary --remote` before deploying code
  that needs it.

## Headers and caching

`static/_headers` is copied to `dist/_headers` with the Content-Security-Policy
hashes filled in by the build. It also sets long cache times for fonts and the
content-hashed definition files; see
[ARCHITECTURE.md](ARCHITECTURE.md#caching). If a deploy seems to show an old
page, the page itself is always revalidated, so a normal reload is enough.

## Moderating scores

See [LEADERBOARD.md](LEADERBOARD.md#moderation).
