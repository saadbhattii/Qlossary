# Words and definitions

All game content lives in `data/` as tab-separated text files. Lines starting
with `#` are comments. After any change, run `npm run check` (or `npm test`).

## Topics: `data/domains.tsv`

```
# id	topic name (shown to players)
foundations	Foundations
gates	Gates & circuits
```

The order here is the order players see. To add a topic, add a line and create
`data/terms/<id>.tsv`. Existing players get new topics switched on
automatically.

## Terms: `data/terms/<topic>.tsv`

```
term <tab> subtopic <tab> aliases <tab> difficulty <tab> origin
```

| Column | Meaning |
| --- | --- |
| **term** | The answer, exactly as shown at the end of a round. |
| **subtopic** | Free text, shown by the second hint. Required. |
| **aliases** | Acronyms or other names, shown after the round. Optional. |
| **difficulty** | Blank to compute it from the letters, or `easy`, `medium`, `hard`, `expert`. |
| **origin** | `original` for terms from the first Qlossary list, `added` for later ones. Not shown to players; it helps review. |

Every line must have all five columns (empty ones are fine).

### What the build refuses

- Duplicates of another term, ignoring case, accents and punctuation.
- Letters outside A–Z after removing accents (for example Greek letters).
- Fewer than 4 letters or fewer than 3 different letters.
- More than 44 characters.
- Symbols other than letters, digits, spaces and `- – ' ’ / . & +`.
- Comparisons ("X vs Y"), blank or padded terms, double spaces.
- `|`, `~` or `;` anywhere in the term, subtopic or aliases.

### How difficulty is computed

`difficulty()` in `tools/build.mjs`: the number of different letters, plus 1.5
for each rare letter (J Q X Z K V W Y F B), plus 2 for a single word. Under 11
is easy, under 14 medium, under 17 hard, otherwise expert.

## Definitions: `data/definitions/<topic>.tsv`

```
term <tab> definition <tab> other meaning
```

- **term:** as written in the terms file (case, accents and punctuation are
  ignored when matching). The build refuses a definition for a term that does
  not exist, or one defined twice.
- **definition:** 40 to 330 characters, plain words, what the term means in
  quantum computing.
- **other meaning** (optional, at most 220 characters): only when the word also
  means something different in everyday English or another field.

Every term currently has a definition. See
[`data/definitions/README.md`](../data/definitions/README.md) for the status
and the note on review.

## Writing good content

- Prefer terms people actually meet in papers, docs, courses and news.
- Keep definitions short, correct and free of jargon where possible; say what
  the thing *is* or *does* before how it works.
- For people and companies, stick to stable facts; roles and products change.
- Cite a source in your pull request for anything that is not common knowledge.

To suggest a term or report a wrong definition without editing files, open a
[word or definition issue](https://github.com/saadbhattii/Qlossary/issues/new/choose).
