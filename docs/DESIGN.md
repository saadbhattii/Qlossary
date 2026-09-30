# Design

Qlossary uses the dark look of the
[withinquantum](https://github.com/saadbhattii) site: soft green glows, a faint
grid and grain behind frosted "glass" cards, Geist for text, Geist Mono for
numbers and labels, and rounded pill buttons. All styling is in
`src/style.css`; the colour tokens are at its top.

## Rules

1. **One screen.** On desktop, Home, the game and the result fit without
   scrolling. Sizes are in `rem`, and the root size follows the window's width
   and height (and the browser's zoom). Phones may scroll on Home (the top 10
   leaderboard), but a word and its result fit on one phone screen.
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

## Performance rules

The background drifts slowly, so anything that must be recomputed per frame
makes the page stutter, especially on phones:

- **No `backdrop-filter`** on cards, buttons or overlays above the art. A plain
  translucent fill looks the same over the already-soft glows.
- The drifting glows and the grain have their own layers (`will-change`), and
  the art is sized to `100lvh` so a phone's address bar does not resize it.
- `prefers-reduced-motion` turns the drift and transitions off.

## Brand files

| File | Use |
| --- | --- |
| `brand/icon.svg` | The book icon inlined in the header (uses `currentColor`). |
| `brand/favicon.svg` | Browser tab icon: white book, black outline. |
| `brand/logo.svg` | The same book for other uses (README, social). |

The icon is "book-a" from Lucide (ISC); see `THIRD_PARTY.md`.
