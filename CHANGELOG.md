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

### Fixed

- A strip of the Home screen could stay painted along the bottom of another
  screen on desktop. Every screen now starts at the top when you switch to it.
- Home fits the window again: the leaderboard shows as many rows as fit (up to
  10) instead of always 10, and "Just played" shrinks first, down to the latest
  game. Home is fitted again once the fonts have loaded.
- Phones: no more dark flash at the bottom when scrolling fast. The page no
  longer bounces past its end, the background covers the screen even when the
  address bar hides, and on phones the background stands still and the cards
  skip the frosted blur, so a fast scroll never has to redraw it.

### Changed

- Phones: the game status shows the game type and End game on one line and the
  numbers in two even columns below; less empty space above the header.
- Phones: a roomier layout that scrolls like a normal page (only desktop is
  held to one screen). Larger text and touch targets, full-width main buttons,
  seven big keys per row, filter pills in one sideways-scrolling row, and Home
  shows the whole top 10 and "Just played" in full.

### Removed

- The 2026-09-30 performance change (no card blur, background on separate GPU
  layers, `100lvh`, long cache times for fonts and definitions), and the
  forced top 10 on Home. Both were causing glitches in production.

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
