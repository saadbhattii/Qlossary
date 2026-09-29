// build.mjs -- validate the data, then inline the icon, CSS, JS and the word
// list into one dist/index.html. No dependencies: Node 18+ only.
//
//   node tools/build.mjs            build dist/
//   node tools/build.mjs --check    validate data only

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { ROOT, readDomains, readTerms, readDefinitions } from './tsv.mjs';
import { problem } from './rules.mjs';
import { termKey, lettersOf } from '../src/js/normalize.js';

// Size budget for dist/index.html. The build fails above these.
const BUDGET = { raw: 140 * 1024, brotli: 40 * 1024 };

// Module order matters: each file may only use names from files above it.
const MODULES = ['normalize', 'rng', 'data', 'score', 'round', 'pick', 'timer', 'store', 'world', 'defs', 'main'];

const DIFF_WORDS = { easy: 0, medium: 1, hard: 2, expert: 3 };
const RARE = new Set('JQXZKVWYFB');

// Difficulty 0-3 from the letters the player has to find. More unique letters
// and rarer letters are harder; a single word gives fewer clues than several.
export function difficulty(term) {
  const L = lettersOf(term);
  let rare = 0;
  for (const c of L) if (RARE.has(c)) rare++;
  const raw = L.size + 1.5 * rare + (term.includes(' ') ? 0 : 2);
  return raw < 11 ? 0 : raw < 14 ? 1 : raw < 17 ? 2 : 3;
}

export function validate(domains, terms) {
  const errors = [];
  const ids = new Set(domains.map(d => d.id));
  const keys = new Map();
  for (const d of domains) if (!terms.some(t => t.domain === d.id)) errors.push('topic "' + d.id + '" has no terms file or no terms');
  for (const t of terms) {
    const at = t.file + ' line ' + t.line + ' (' + t.term + '): ';
    if (t.cols !== 5) errors.push(at + 'expected 5 tab-separated columns, found ' + t.cols);
    if (!ids.has(t.domain)) errors.push(at + 'no topic "' + t.domain + '" in data/domains.tsv');
    const why = problem(t.term);
    if (why) errors.push(at + why);
    if (!t.sub) errors.push(at + 'missing subtopic');
    if (/[|~;]/.test(t.term + t.sub + t.aliases)) errors.push(at + 'contains | ~ or ; which the page format reserves');
    if (t.diff && !(t.diff in DIFF_WORDS)) errors.push(at + 'difficulty must be blank, easy, medium, hard or expert');
    if (t.origin !== 'original' && t.origin !== 'added') errors.push(at + 'origin must be "original" or "added"');
    const k = termKey(t.term);
    if (keys.has(k)) errors.push(at + 'duplicate of ' + keys.get(k));
    else keys.set(k, t.file + ' line ' + t.line);
  }
  return errors;
}

// Definitions are checked here and written to dist/defs/<topic>.<hash>.json,
// which the game loads only after a word ends, one topic at a time.
export const DEF_MIN = 40, DEF_MAX = 330, OTHER_MAX = 220;

export function validateDefinitions(terms, defs) {
  const errors = [];
  const byKey = new Map(terms.map(t => [t.domain + '|' + termKey(t.term), t]));
  const seenKeys = new Map();
  for (const d of defs) {
    const at = 'definitions/' + d.file + ' line ' + d.line + ' (' + d.term + '): ';
    if (d.cols < 2 || d.cols > 3) errors.push(at + 'expected 2 or 3 tab-separated columns, found ' + d.cols);
    const key = d.domain + '|' + termKey(d.term);
    if (!byKey.has(key)) errors.push(at + 'no such term in data/terms/' + d.domain + '.tsv');
    if (seenKeys.has(key)) errors.push(at + 'defined twice (also line ' + seenKeys.get(key) + ')');
    seenKeys.set(key, d.line);
    if (d.def.length < DEF_MIN) errors.push(at + 'definition is shorter than ' + DEF_MIN + ' characters');
    if (d.def.length > DEF_MAX) errors.push(at + 'definition is longer than ' + DEF_MAX + ' characters (' + d.def.length + ')');
    if (d.other.length > OTHER_MAX) errors.push(at + 'other meaning is longer than ' + OTHER_MAX + ' characters (' + d.other.length + ')');
  }
  return errors;
}

// Page format, one record per line:
//   line 1: topics      id~name~definitions file (blank if none);...
//   line 2: subtopics   name~topicIndex;...
//   rest:   term|subtopicIndex|difficulty 0-3|aliases
export function encode(domains, terms, defFiles = {}) {
  const subs = [];
  const subIndex = new Map();
  const lines = [];
  const order = new Map(domains.map((d, i) => [d.id, i]));
  const sorted = terms.slice().sort((a, b) => order.get(a.domain) - order.get(b.domain));
  for (const t of sorted) {
    const d = order.get(t.domain);
    const sk = d + '~' + t.sub;
    if (!subIndex.has(sk)) { subIndex.set(sk, subs.length); subs.push(t.sub + '~' + d); }
    const diff = t.diff ? DIFF_WORDS[t.diff] : difficulty(t.term);
    lines.push([t.term, subIndex.get(sk), diff, t.aliases].join('|'));
  }
  return [domains.map(d => d.id + '~' + d.name + '~' + (defFiles[d.id] || '')).join(';'), subs.join(';')].concat(lines).join('\n');
}

// Safe shrinking only: drop whole-line comments, indentation and blank lines.
// The sources have no multi-line strings, so this cannot change behaviour.
function shrinkJs(src) {
  return src.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).join('\n');
}
function shrinkCss(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}

function bundle() {
  let out = '';
  for (const m of MODULES) {
    const src = readFileSync(join(ROOT, 'src', 'js', m + '.js'), 'utf8')
      .replace(/^import[^;]+;\s*$/gm, '')
      .replace(/^export /gm, '');
    out += src + '\n';
  }
  return out;
}

// The icon's drawing (everything inside <svg>), for reuse in the page header.
function iconInner(svg) {
  return svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '');
}

const sha = s => 'sha256-' + createHash('sha256').update(s, 'utf8').digest('base64');
const kb = n => (n / 1024).toFixed(1) + ' KB';

function main() {
  const domains = readDomains();
  const terms = readTerms();
  const errors = validate(domains, terms);
  if (errors.length) {
    console.error(errors.length + ' data problem(s):\n  ' + errors.join('\n  '));
    process.exit(1);
  }
  const added = terms.filter(t => t.origin === 'added').length;
  console.log('data ok: ' + terms.length + ' terms in ' + domains.length + ' topics (' + (terms.length - added) + ' original, ' + added + ' added)');
  const dist = [0, 0, 0, 0];
  for (const t of terms) dist[t.diff ? DIFF_WORDS[t.diff] : difficulty(t.term)]++;
  console.log('difficulty: easy ' + dist[0] + ', medium ' + dist[1] + ', hard ' + dist[2] + ', expert ' + dist[3]);
  const defs = readDefinitions();
  const defErrors = validateDefinitions(terms, defs);
  if (defErrors.length) {
    console.error(defErrors.length + ' definition problem(s):\n  ' + defErrors.join('\n  '));
    process.exit(1);
  }
  const perTopic = domains.map(d => {
    const n = terms.filter(t => t.domain === d.id).length, k = defs.filter(x => x.domain === d.id).length;
    return d.id + ' ' + k + '/' + n;
  });
  console.log('definitions: ' + defs.length + ' of ' + terms.length + ' terms (' + Math.round(100 * defs.length / terms.length) + '%), ' +
    defs.filter(d => d.other).length + ' with another meaning noted');
  console.log('  ' + perTopic.join(', '));
  if (process.argv.includes('--check')) return;

  // One small file per topic, named by its content so browsers can keep it.
  const defFiles = {};
  const defOut = [];
  for (const d of domains) {
    const mine = defs.filter(x => x.domain === d.id);
    if (!mine.length) continue;
    const map = {};
    for (const x of mine) map[termKey(x.term)] = x.other ? [x.def, x.other] : [x.def];
    const json = JSON.stringify(map);
    const name = d.id + '.' + createHash('sha256').update(json).digest('hex').slice(0, 10) + '.json';
    defFiles[d.id] = name;
    defOut.push([name, json]);
  }

  const data = encode(domains, terms, defFiles);
  const script = '\n"use strict";\n(function(){\nconst QDATA=' + JSON.stringify(data) + ';\n' + shrinkJs(bundle()) + '})();\n';
  const style = shrinkCss(readFileSync(join(ROOT, 'src', 'style.css'), 'utf8'));
  const icon = readFileSync(join(ROOT, 'brand', 'icon.svg'), 'utf8');
  const favicon = 'data:image/svg+xml,' + encodeURIComponent(readFileSync(join(ROOT, 'brand', 'favicon.svg'), 'utf8').trim());
  const html = readFileSync(join(ROOT, 'src', 'index.html'), 'utf8')
    .replace('<style>/*CSS*/</style>', () => '<style>' + style + '</style>')
    .replace('<script>/*JS*/</script>', () => '<script>' + script + '</script>')
    .replace('/*FAVICON*/', () => favicon)
    .split('/*ICON*/').join(iconInner(icon));
  for (const p of ['/*CSS*/', '/*JS*/', '/*FAVICON*/', '/*ICON*/']) {
    if (html.includes(p)) throw new Error('template placeholder not replaced: ' + p);
  }

  const headers = readFileSync(join(ROOT, 'static', '_headers'), 'utf8')
    .replace('{{SCRIPT_HASH}}', sha(script)).replace('{{STYLE_HASH}}', sha(style));

  const out = join(ROOT, 'dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out);
  writeFileSync(join(out, 'index.html'), html);
  writeFileSync(join(out, '_headers'), headers);
  if (defOut.length) {
    mkdirSync(join(out, 'defs'));
    for (const [name, json] of defOut) writeFileSync(join(out, 'defs', name), json);
  }

  const buf = Buffer.from(html);
  const gz = gzipSync(buf, { level: 9 }).length;
  const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  console.log('dist/index.html: ' + kb(buf.length) + ' raw, ' + kb(gz) + ' gzip, ' + kb(br) + ' brotli (word list ' + kb(data.length) + ')');
  if (buf.length > BUDGET.raw || br > BUDGET.brotli) {
    console.error('over budget: limit is ' + kb(BUDGET.raw) + ' raw and ' + kb(BUDGET.brotli) + ' brotli');
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) main();
