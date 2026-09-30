# Player guide

Everything about playing Qlossary. The short version is in the
[README](../README.md#play); play at **[qlossary.pages.dev](https://qlossary.pages.dev)**.

## The screens

| Tab | What is there |
| --- | --- |
| **Home** | How to play, Start playing, today's daily challenge, the worldwide top 10 and (on wider screens) "Just played". |
| **Play** | Choose a game, then guess words. A game in progress stays open while you visit other tabs. |
| **Scores** | Worldwide leaderboards (top 20), your scores in this browser, and "My progress": totals, results by topic and missed words. Export, Import and Delete live here. |
| **Settings** | Topics, difficulty, timer, wrong guesses allowed, multi-word terms, longest term, your name. |
| **Help** | The rules in short. |

## Guessing

- A term is shown as blanks. Type a letter or click it on the on-screen keyboard.
- A letter that is in the term appears everywhere it occurs, and its key turns
  green. A letter that is not in the term adds a line to the drawing, and its
  key turns light red and is struck through.
- Only A to Z are guessed. Spaces, digits and punctuation are shown from the
  start, and accented letters count as their plain letter (O finds the ö in
  Schrödinger).
- You lose the word when the drawing is finished (8 wrong guesses by default)
  or the time runs out.

## Game modes

| Mode | Words | Scored | Notes |
| --- | --- | --- | --- |
| **10-word game** | 10 | Yes | One total score for the leaderboard. |
| **Endless** | Until 3 misses | Yes | How long can you keep going? |
| **Daily challenge** | 5 | Yes | One term from each of five topics. The same for everyone on a UTC date, new at midnight UTC, one try per day. Ignores your topic and difficulty settings. |
| **Practice** | Unlimited | No | Uses your settings; the timer can be off. The timer pauses when you leave the tab. |

## Hints

| Key | Hint | Cost |
| --- | --- | --- |
| **1** | Show the topic | 25 points |
| **2** | Show the subtopic (after the topic) | 50 points |
| **3** | Reveal a letter (never the last missing one) | 30 points each time |

## Points

For a solved word:

- **10 points for each different letter**, times the difficulty: easy ×1,
  medium ×1.5, hard ×2, expert ×3.
- **+2 points for each second left** on the timer.
- **−10 for each wrong guess**, and minus the cost of any hints.

A missed word scores nothing, and a word never scores below zero. The points
line under each result shows the sum.

**Difficulty** is worked out from the letters you must find: more different
letters and rarer letters (J, Q, X, Z, K, V, W, Y, F, B) are harder, and a
single word is harder than several because it gives fewer clues.

## Timer

The automatic timer gives **40 seconds plus 3 for each different letter**, at
most 120 seconds. In Settings you can pick 30, 60 or 90 seconds instead, or no
timer (practice only).

## After each word

You see the answer, a short definition, a note when the word means something
different in everyday English or another field, the topic and subtopic, and
how the points were counted. **Learn more** opens a web search for the term
with "in quantum computing" added. Press **Enter** or **Next word** to go on.

## Settings

- **Topics:** words come only from the topics you tick.
- **Difficulty:** any, easy, medium, hard or expert.
- **Time for each word:** automatic, 30, 60 or 90 seconds, or none (practice only).
- **Wrong guesses allowed:** 6, 8 (default) or 10.
- **Mix words across all topics** (recommended): picks a topic first, so big
  topics like Hardware come up more often than small ones, but do not take over.
- **Include terms of more than one word** and **Longest term** narrow the pool.
- **Let every word come up again:** words you have played are not repeated
  until the pool runs out; this resets that list.

## Worldwide leaderboard

When a game ends you can press **Add my score** to put it on the worldwide
leaderboard under a name of up to 12 letters, digits, spaces, dots, dashes or
underscores. Your name and score are public.

| List | Ranks by |
| --- | --- |
| **All-time total** | Every point you have ever added, all game types together. |
| **This week** | The same, counting games since Monday (UTC). |
| **10-word game** / **Endless** | Single best games. |
| **Daily, today** | Today's daily challenge scores. |

A player is **the same name from the same browser**, so nobody can add to
your total by typing your name. The player at the top of the all-time total
wears a **gold crown** next to their name on every list, until someone passes
them.

Scores are worked out in your browser, so a determined person could send a
fake one. Impossible scores are refused and obvious fakes are removed.

## Your data and privacy

- Scores, progress and settings are stored in your browser's localStorage only.
- Nothing is sent anywhere unless you press **Add my score**, which sends your
  chosen name, your points per word, the game type and a random ID for your
  browser (so your games count together). The server stores a daily-changing
  hash of your IP address for rate limiting, never the address itself.
- The Home and Scores screens read the public leaderboard.
- **Export** gives you a text you can **Import** in another browser.
  **Delete all my data** clears everything in this browser.
- No cookies, no analytics, no trackers, no outside connections: the fonts are
  served from the same site.

## Accessibility

- Everything works from the keyboard, with a visible focus ring.
- Wrong letters are struck through as well as coloured, so colour is never the
  only signal.
- The term is read out to screen readers as letters and blanks, and results
  are announced.
- Text sizes follow your browser's zoom (Ctrl + and Ctrl −).
- Animations stop when your system asks for reduced motion.
