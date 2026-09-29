# Definitions

One file per topic, named like the matching file in `data/terms/`. Each line:

    term <tab> definition <tab> other meaning

- **term:** exactly as written in `data/terms/<topic>.tsv`. Case, accents and
  punctuation are ignored when matching, but the build refuses a term that
  doesn't exist there.
- **definition:** 40 to 330 characters, about two or three lines on screen.
  Plain words, what the term means in quantum computing.
- **other meaning** (optional): fill this in only when the word also means
  something different in everyday English or another field, such as Trace,
  Projector or Barrier. It is shown in a highlighted box under the definition.

Terms without a definition still work: the game shows only the "Learn more"
button, which searches the term with "in quantum computing" added.

`npm run check` reports how many terms have a definition, per topic.

## Status

Complete: all 1,926 terms in all 16 topics have a definition, and 112 have an
"other meaning" note.

These definitions were drafted with an AI assistant, checked against sources
where it was unsure, and should be reviewed before being relied on. The most
time-sensitive ones are in People and Companies & platforms, and a few terms
from specific papers (for example in Error mitigation and Hardware) are worth
a look by someone who knows that work.
