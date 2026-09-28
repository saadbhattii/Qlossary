// data.js -- decode the word list the build embeds in the page.
//
// Format (one record per line):
//   line 1: topics      id~name;...
//   line 2: subtopics   name~topicIndex;...
//   rest:   term|subtopicIndex|difficulty 0-3|aliases
import { termKey, lettersOf } from './normalize.js';

export function parseData(text) {
  const lines = text.split('\n');
  const domains = lines[0].split(';').map(r => {
    const [id, name] = r.split('~');
    return { id, name };
  });
  const subs = lines[1].split(';').map(r => {
    const [name, d] = r.split('~');
    return { name, d: +d };
  });
  const terms = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = lines[i].split('|');
    const s = +f[1];
    terms.push({
      t: f[0], s, d: subs[s].d, diff: +f[2], a: f[3] || '',
      key: termKey(f[0]), n: lettersOf(f[0]).size, words: f[0].split(' ').length,
    });
  }
  return { domains, subs, terms };
}
