# Contributing to Qlossary

Thanks for helping. Contributions of every size are welcome: a missing term, a
clearer definition, a bug report, or code.

## Ways to help

| You want to… | Do this |
| --- | --- |
| Report a bug | Open a [bug report](https://github.com/saadbhattii/Qlossary/issues/new?template=bug_report.yml). |
| Suggest a feature | Open a [feature request](https://github.com/saadbhattii/Qlossary/issues/new?template=feature_request.yml). |
| Suggest a term or fix a definition | Open a [word or definition issue](https://github.com/saadbhattii/Qlossary/issues/new?template=word_or_definition.yml), or edit `data/` directly (see [docs/DATA.md](docs/DATA.md)). |
| Report a security problem | Follow [SECURITY.md](SECURITY.md); please do not open a public issue. |
| Change code | Read on. |

Check the [open issues](https://github.com/saadbhattii/Qlossary/issues) first
to avoid duplicates.

## Making a change

1. Fork the repository and create a branch from `main`
   (for example `fix-timer-pause` or `add-photonics-terms`).
2. Set up as in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). There is nothing to
   install; Node 22 is recommended.
3. Make your change, keeping it focused on one thing.
4. Run the checks:

   ```sh
   npm test
   npm run build
   ```

   Both must pass. The build also enforces the size budget.
5. For anything visible, try it with `npm run preview` on desktop and in a
   phone-sized window, and check the browser console for errors.
6. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md).
7. Open a pull request and fill in the template.

## Guidelines

- **No dependencies.** The project runs on plain Node and the browser.
- **Keep the page small and self-contained:** no external scripts, styles,
  fonts or images, no inline `style=""` attributes or `on...=` handlers (the
  Content-Security-Policy blocks them). See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security-headers).
- **Keep the look consistent** with [docs/DESIGN.md](docs/DESIGN.md), including
  its performance rules (no `backdrop-filter` over the moving background).
- **Match the surrounding code:** small ES modules, short comments that explain
  why, plain words in anything players read.
- **Test what you change.** Game logic, data rules and the leaderboard all have
  tests in `test/`.
- **Privacy first.** Do not add analytics, trackers or anything that sends data
  without the player pressing a button.

## Commit messages

Short and descriptive, in the style already used, for example:

```
feat: add a hint for the number of words
fix: pause the practice timer when the tab is hidden
docs: explain the crown on the leaderboard
data: add 12 photonics terms
```

## Licence

By contributing you agree that your contribution is licensed under the
[MIT licence](LICENSE) of this project.
