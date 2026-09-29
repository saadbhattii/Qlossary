// tsv.mjs -- read the data files.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const COLUMNS = ['term', 'subtopic', 'aliases', 'difficulty', 'origin'];

// Non-comment rows as arrays of columns; .line is the 1-based line number.
function rows(path) {
  const out = [];
  readFileSync(path, 'utf8').split('\n').forEach((l, i) => {
    if (!l.trim() || l.startsWith('#')) return;
    const c = l.replace(/\r$/, '').split('\t');
    c.line = i + 1;
    out.push(c);
  });
  return out;
}

// data/domains.tsv: id <tab> topic name shown to players. File order is display order.
export function readDomains() {
  return rows(join(ROOT, 'data', 'domains.tsv')).map(([id, name]) => ({ id, name }));
}

// Every term file. data/terms/<topic id>.tsv
export function readTerms() {
  const dir = join(ROOT, 'data', 'terms');
  const out = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.tsv')).sort()) {
    const domain = f.replace(/\.tsv$/, '');
    for (const c of rows(join(dir, f))) {
      out.push({
        file: f, line: c.line, domain,
        term: c[0] || '', sub: c[1] || '', aliases: c[2] || '', diff: c[3] || '', origin: c[4] || '',
        cols: c.length,
      });
    }
  }
  return out;
}

// data/definitions/<topic id>.tsv: term <tab> definition <tab> other meaning (optional).
// Not every term needs one yet; terms without a definition show only "Learn more".
export const DEF_COLUMNS = ['term', 'definition', 'other meaning'];

export function readDefinitions() {
  const dir = join(ROOT, 'data', 'definitions');
  let files = [];
  try { files = readdirSync(dir).filter(f => f.endsWith('.tsv')).sort(); } catch (e) { return []; }
  const out = [];
  for (const f of files) {
    const domain = f.replace(/\.tsv$/, '');
    for (const c of rows(join(dir, f))) {
      out.push({ file: f, line: c.line, domain, term: c[0] || '', def: (c[1] || '').trim(), other: (c[2] || '').trim(), cols: c.length });
    }
  }
  return out;
}

