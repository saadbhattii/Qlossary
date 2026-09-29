// defs.js -- definitions, loaded only after a word ends, one topic file at a
// time, and kept for the rest of the visit.
const defCache = {};

// Returns { termKey: [definition, other meaning?] } for a topic, or null.
export function loadDefinitions(file) {
  if (!file) return Promise.resolve(null);
  if (!defCache[file]) {
    defCache[file] = fetch('/defs/' + file, { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(map => { if (!map) delete defCache[file]; return map; });   // try again next time
  }
  return defCache[file];
}

// A web search for the term in its quantum computing sense.
export function learnMoreUrl(term) {
  return 'https://www.google.com/search?q=' + encodeURIComponent('"' + term + '" in quantum computing');
}
