# Changelog

Notable changes to Qlossary. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates are UTC.

## [Unreleased]

### Added

- Documentation: a new README with screenshots, guides in `docs/` (playing,
  development, architecture, data, leaderboard, deployment, design),
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CLAUDE.md` for AI
  assistants, and this changelog.
- Issue templates (bug, feature, word or definition), a pull request template,
  and a CI workflow that runs the tests and the build.

## 2026-09-30

### Added

- Dark "withinquantum" theme on desktop and phone: soft green glows, grid, dot
  field and grain behind glass cards, Geist and Geist Mono fonts (self-hosted),
  pill buttons, rounded keys.
- Gold crown before the name of the all-time leader on every worldwide list,
  in "Just played" and in the daily champion line.
- A definition after every word, with an "other meaning" note where a word
  means something else elsewhere, behind a **See definition** button, plus
  **Learn more**.
- `brand/logo.svg`.

### Changed

- The Home leaderboard always shows at least the top 10.
- Wrong letters are light red (still struck through); found letters green.
- The topic line after a word is brighter than the points line.
- The GitHub link is a round icon button.
- The favicon is the book itself, without a square background.

### Fixed

- Smooth 60 fps on phone and desktop: removed per-frame background blurs,
  gave the moving art its own layers, stopped phone address-bar redraws.
- Fonts and definition files are cached instead of re-checked on every visit.

## 2026-09-29

### Added

- All-time total and weekly leaderboards for top players, and "Just played"
  with yesterday's daily champion.

### Changed

- Mixed-topic word selection is balanced by the square root of each topic's
  size, so big topics do not take over and small ones do not flood the game.

## 2026-09-28

### Added

- First public version (2.0.0): hangman for 1,926 quantum computing terms in
  16 topics; 10-word, endless, daily and practice modes; hints; timer;
  scores and progress in the browser with export and import; worldwide
  leaderboard on Cloudflare Pages Functions and D1.
- Colour-coded on-screen keyboard.
- GitHub repository button.

### Changed

- Default wrong guesses allowed is 8.
