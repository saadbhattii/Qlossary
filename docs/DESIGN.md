# Design

Qlossary uses the dark look of the
[withinquantum](https://github.com/saadbhattii) site: soft green glows, a faint
grid and grain behind frosted "glass" cards, Geist for text, Geist Mono for
numbers and labels, and rounded pill buttons. All styling is in
`src/style.css`; the colour tokens are at its top.

## Rules

1. **One screen.** On desktop, Home, the game and the result fit without
   scrolling. Sizes are in `rem`, and the root size follows the window's width
   and height (and the browser's zoom). Home shows as many leaderboard and
   "Just played" rows as fit. **Phones are not held to one screen.** On phones,
   Home and Help use a roomier design (16 px text, 44 px+ touch targets,
   full-width main buttons, the Home lists in full) and scroll like a normal
   page; the other phone screens keep the compact phone styles.
2. **Bright colour is background art or a signal**, never body text.
3. **Colour on buttons means something:**

   | Colour | Meaning | Examples |
   | --- | --- | --- |
   | White (filled) | Go forward | Start playing, Next word, Play again, Add my score |
   | Rose | Stop | End game, Delete all my data |
   | Butter | Optional help | Hints, the "other meaning" note |
   | Green | Found / you | Found letters, your leaderboard rows |
   | Light red, struck through | Not in the term | Wrong letters |
   | Gold | All-time leader | The crown |

4. **Never rely on colour alone:** wrong letters are also struck through.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0A0B0F` | Page background |
| `--text` | `#F4F5F7` | Main text, primary buttons |
| `--soft` | `#C9CDD6` | Descriptions |
| `--muted` | `#A1A6B3` | Small labels, secondary lines |
| `--glass` | `rgba(10,11,15,.62)` | Cards |
| `--green` | `#3EDC81` | Mode dot, radio and checkbox accents |
| Glows | `#16C47F`, `#B6F03C`, `#0EA5A4` | Background art |

## Type

- **Geist** for everything readable; **Geist Mono** for the word, the keys,
  numbers, tables, hints and small labels.
- Both are self-hosted as Latin subsets in `static/fonts/` (the CSP allows only
  same-site fonts). Characters outside the subset fall back to system fonts.

## Rendering

The background drifts slowly behind frosted cards (`backdrop-filter`).
`prefers-reduced-motion` turns the drift and transitions off.

An attempt to speed this up (removing the card blur, putting the art on its
own GPU layers with `will-change` and `contain`, sizing it to `100lvh`) was
reverted because it left stale strips of the previous screen on desktop. Do not
reintroduce those techniques on desktop.

**Phones only** (inside `@media (max-width: 700px)`): no overscroll bounce,
the art is `100lvh` tall, the drift is off and the cards have no
`backdrop-filter`. This stops the dark flash when flinging to the bottom of a
page. It does not touch desktop.

## Brand files

| File | Use |
| --- | --- |
| `brand/icon.svg` | The book icon inlined in the header (uses `currentColor`). |
| `brand/favicon.svg` | Browser tab icon: white book, black outline. |
| `brand/logo.svg` | The same book for other uses (README, social). |

The icon is "book-a" from Lucide (ISC); see `THIRD_PARTY.md`.
