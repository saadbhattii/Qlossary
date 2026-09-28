// main.js -- screens, input and the flow of a game.
// QDATA (the word list) is defined by the build, before this file.
import { parseData } from './data.js';
import { mask, guessLetter } from './normalize.js';
import { newRound, guess, canRevealLetter, revealLetter, timeOut, frame } from './round.js';
import { scoreWord, autoSeconds } from './score.js';
import { candidates, pickNext, dailyTerms, utcDate, DAILY_WORDS } from './pick.js';
import { makeTimer, fmtTime } from './timer.js';
import { load, save, emptyStats, emptyScores, addScore, addMissed, exportAll, importAll, clearAll, TOP } from './store.js';
import { browserId, worldNameProblem, fetchBoard, submitScore } from './world.js';

const DATA = parseData(QDATA);
const $ = id => document.getElementById(id);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MODES = {
  run: { label: '10-word game', words: 10, scored: true },
  endless: { label: 'Endless', words: Infinity, scored: true, maxLost: 3 },
  daily: { label: 'Daily challenge', words: DAILY_WORDS, scored: true },
  practice: { label: 'Practice', words: Infinity, scored: false },
};
const PER_PAGE = 10;
const GALLOWS = [
  ['      ', '      ', '      ', '      '],
  ['  O   ', '      ', '      ', '      '],
  ['  O   ', '  |   ', '      ', '      '],
  ['  O   ', ' /|   ', '      ', '      '],
  ['  O   ', ' /|\\  ', '      ', '      '],
  ['  O   ', ' /|\\  ', ' /    ', '      '],
  ['  O   ', ' /|\\  ', ' / \\  ', '      '],
].map(b => ['  +---+', '  |   |'].concat(b.map(l => l + '|'), ['=========']).join('\n'));

// ---------- stored state ----------

const DEFAULTS = {
  domains: DATA.domains.map(d => d.id), diff: 'any', timer: 'auto',
  lives: 6, balanced: true, multi: true, maxLen: 44, name: '',
};
const settings = Object.assign({}, DEFAULTS, load('settings', {}));
if (!Array.isArray(settings.domains)) settings.domains = DEFAULTS.domains.slice();
// Topics added in a later version start switched on for existing players.
// Players from before topics were remembered knew these ones.
const OLD_TOPICS = ['foundations', 'gates', 'algorithms', 'communication', 'models', 'hardware', 'noise',
  'qec', 'qem', 'metrics', 'visualization', 'software', 'people', 'platforms'];
const knownTopics = load('topics', null) || (load('settings', null) ? OLD_TOPICS : null);
if (Array.isArray(knownTopics)) {
  for (const d of DATA.domains) if (!knownTopics.includes(d.id) && !settings.domains.includes(d.id)) settings.domains.push(d.id);
}
save('topics', DATA.domains.map(d => d.id));
if (settings.name === 'GUEST' || settings.name === 'Guest') settings.name = '';
const scores = Object.assign(emptyScores(), load('scores', {}));
const stats = Object.assign(emptyStats(), load('stats', {}));
const missed = load('missed', []);
const seen = new Set(load('seen', []));
let daily = load('daily', null);

// ---------- session state ----------

let S = null;        // current game
let R = null;        // current word
let T = null;        // current timer
let roundStart = 0;
let lastMode = 'run';
let lastGame = null; // the finished game shown on the summary, for "Add my score"
let view = 'home';
let boardTab = 'run';
let scoresSub = 'boards';
const pages = { world: 0, board: 0, dom: 0, missed: 0 };
let worldData = null;

function show(el, on) { el.hidden = !on; }
function say(text) { $('live').textContent = text; }
function today() { return utcDate(Date.now()); }
function domainOf(t) { return DATA.domains[t.d]; }
function subOf(t) { return DATA.subs[t.s].name; }
function num(n) { return Number(n).toLocaleString('en'); }
function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : many); }
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function td(text, cls) { return el('td', cls, text); }
function th(text, cls) { return el('th', cls, text); }
function row(table, cells) { const r = el('tr'); for (const c of cells) r.appendChild(c); table.appendChild(r); return r; }
function playerName() { return settings.name || 'Guest'; }

// ---------- screens ----------

const VIEWS = ['home', 'play', 'scores', 'settings', 'help'];

function showView(v) {
  if (!VIEWS.includes(v)) v = 'home';
  view = v;
  for (const id of VIEWS) show($('v-' + id), id === v);
  for (const a of document.querySelectorAll('.tab')) {
    if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (v === 'home') renderHome();
  if (v === 'play' && !S && $('summary').hidden) showMenu();
  if (v === 'scores') renderScores();
  if (v === 'settings') renderSettings();
  if (S && S.mode === 'practice' && T && R && !R.over) { if (v === 'play') T.start(); else T.pause(); }
}

function go(v) {
  if (location.hash === '#' + v) showView(v); else location.hash = '#' + v;
}

// ---------- home ----------

function renderHome() {
  show($('home-resume'), !!S);
  $('home-note').textContent = num(DATA.terms.length) + ' terms in ' + DATA.domains.length +
    ' topics. Your scores are saved in this browser.';
  $('home-daily').textContent = daily && daily.date === today()
    ? 'Today\'s daily challenge (done)' : 'Today\'s daily challenge';
}

// ---------- choose a game ----------

function showMenu() {
  show($('menu'), true); show($('game'), false); show($('summary'), false);
  const n = candidates(DATA, settings).length;
  $('pool-note').textContent = n
    ? num(n) + ' terms match your settings. You can change topics and difficulty in Settings.'
    : 'No terms match your settings. Tick more topics in Settings.';
  $('daily-note').textContent = daily && daily.date === today()
    ? 'Done for today: ' + num(daily.score) + ' points. A new one comes at midnight UTC.'
    : 'Five terms, the same for everyone today.';
}

// ---------- game flow ----------

function startSession(mode) {
  lastMode = mode;
  if (view !== 'play') go('play');
  if (mode === 'daily' && daily && daily.date === today()) { showDailyDone(); return; }
  if (mode !== 'daily' && !candidates(DATA, settings).length) { showMenu(); say($('pool-note').textContent); return; }
  S = {
    mode, cfg: MODES[mode], words: [], score: 0, streak: 0, lost: 0,
    queue: mode === 'daily' ? dailyTerms(DATA, today()) : null, date: today(),
  };
  show($('menu'), false); show($('summary'), false); show($('game'), true);
  nextWord();
}

function timerSeconds(term) {
  if (S.mode === 'daily') return autoSeconds(term.n);
  if (settings.timer === 'off') return S.mode === 'practice' ? null : autoSeconds(term.n);
  if (settings.timer === 'auto') return autoSeconds(term.n);
  return +settings.timer;
}

function nextWord() {
  let term;
  if (S.mode === 'daily') term = S.queue[S.words.length];
  else {
    const res = pickNext(candidates(DATA, settings), seen, Math.random, settings.balanced);
    term = res.term;
    if (res.reset) say('You have seen every matching term. The list starts over.');
    seen.add(term.key);
    save('seen', [...seen]);
  }
  R = newRound(term, S.mode === 'daily' ? 6 : +settings.lives);
  show($('play-area'), true); show($('result'), false);
  for (const b of $('keys').children) { b.disabled = false; b.className = 'key'; }
  if (T) T.stop();
  const secs = timerSeconds(term);
  T = secs == null ? null : makeTimer(secs, s => { $('st-time').textContent = 'Time left ' + fmtTime(s); }, onTimeUp);
  $('st-time').textContent = T ? '' : 'No timer';
  renderRound();
  roundStart = performance.now();
  if (T) T.start();
  say('New term with ' + plural(R.letters.size, 'different letter', 'different letters') + '.');
}

function onGuess(L) {
  if (!R || R.over) return;
  const res = guess(R, L);
  if (!res) return;
  if (res === 'hit') {
    let k = 0;
    for (const ch of R.term.t) if (guessLetter(ch) === L) k++;
    say(L + ' is in the term ' + (k === 1 ? 'once.' : k + ' times.'));
  } else {
    say(L + ' is not in the term. ' + plural(R.lives - R.wrong.length, 'wrong guess', 'wrong guesses') + ' left.');
  }
  renderRound();
  if (R.over) endRound(false);
}

function onHint(n) {
  if (!R || R.over) return;
  if (n === 1 && !R.hints.domain) { R.hints.domain = true; say('Topic: ' + domainOf(R.term).name); }
  else if (n === 2 && R.hints.domain && !R.hints.sub) { R.hints.sub = true; say('Subtopic: ' + subOf(R.term)); }
  else if (n === 3) { const L = revealLetter(R, Math.random); if (L) say('Revealed the letter ' + L + '.'); else return; }
  else return;
  renderRound();
}

function onTimeUp() {
  if (!R || R.over) return;
  timeOut(R);
  endRound(true);
}

function endRound(timedOut) {
  const secsLeft = T ? T.secondsLeft() : null;
  if (T) T.stop();
  const elapsed = performance.now() - roundStart;
  const t = R.term;
  const sc = scoreWord({ won: R.won, n: R.letters.size, diff: t.diff, secsLeft, wrong: R.wrong.length, hints: R.hints });
  const pts = S.cfg.scored ? sc.total : 0;
  S.words.push({ t: t.t, won: R.won, pts });
  S.score += pts;
  if (R.won) S.streak++; else { S.streak = 0; S.lost++; }

  const dom = domainOf(t).id;
  const ds = stats.dom[dom] || (stats.dom[dom] = [0, 0]);
  stats.words++; ds[0]++;
  if (R.won) { stats.won++; ds[1]++; stats.solveMs += elapsed; }
  if (S.cfg.scored && S.streak > stats.bestStreak) stats.bestStreak = S.streak;
  save('stats', stats);
  if (!R.won) { addMissed(missed, { t: t.t, d: dom, s: subOf(t), day: today() }); save('missed', missed); }

  renderRound(true);
  show($('play-area'), false); show($('result'), true);
  const head = R.won
    ? (secsLeft != null ? 'Correct! Solved with ' + plural(secsLeft, 'second', 'seconds') + ' left.' : 'Correct!')
    : (timedOut ? 'Time is up. The answer was:' : 'Not this time. The answer was:');
  $('r-head').textContent = head;
  $('r-term').textContent = t.t + (t.a ? '  (' + t.a + ')' : '');
  $('r-where').textContent = 'Topic: ' + domainOf(t).name + ' › ' + subOf(t);
  let points = '';
  if (!S.cfg.scored) points = 'Practice game, so no points are counted.';
  else if (!R.won) points = 'No points for this word.';
  else {
    const parts = [num(sc.base) + ' for the letters'];
    if (sc.time) parts.push('+' + num(sc.time) + ' for time left');
    if (sc.wrongCost) parts.push('−' + sc.wrongCost + ' for wrong guesses');
    if (sc.hintCost) parts.push('−' + sc.hintCost + ' for hints');
    points = 'Points: ' + parts.join(', ') + ' = ' + num(sc.total) + '.';
  }
  $('r-points').textContent = points;
  $('next').textContent = sessionOver() ? 'See results' : 'Next word';
  $('next').focus();
  say(head + ' ' + t.t + '. ' + points);
}

function sessionOver() {
  if (S.mode === 'endless') return S.lost >= S.cfg.maxLost;
  return S.words.length >= S.cfg.words;
}

function onNext() {
  if (!S || !R || !R.over) return;
  if (sessionOver()) finishSession(false); else nextWord();
}

function onQuit() {
  if (!S) return;
  const msg = S.mode === 'run'
    ? 'End this game? A 10-word game that is not finished is not saved.'
    : S.mode === 'daily' ? 'End the daily challenge? Words you have not played count as missed, and you cannot try again today.'
    : S.mode === 'endless' ? 'End this game? Your score so far will be saved.'
    : 'End this practice game?';
  if (!confirm(msg)) return;
  if (T) T.stop();
  if (S.mode === 'daily') while (S.words.length < DAILY_WORDS) S.words.push({ t: S.queue[S.words.length].t, won: false, pts: 0 });
  finishSession(true);
  say('Game ended.');
}

function finishSession(quit) {
  const s = S;
  S = null; R = null; T = null;
  const won = s.words.filter(w => w.won).length;
  let saved = '';
  let canShare = false;
  if (s.cfg.scored) {
    stats.sessions++;
    save('stats', stats);
    if (s.mode === 'run' && quit) saved = 'The game was ended early, so it was not saved.';
    else if (!s.score) saved = 'No points this time, so nothing was saved.';
    else {
      const rank = addScore(scores, s.mode, { n: playerName(), s: s.score, w: won, of: s.words.length, d: s.date });
      save('scores', scores);
      saved = rank ? 'Saved in this browser: number ' + rank + ' on your list.' : 'Not in your top ' + TOP + ' this time.';
      canShare = true;
    }
  }
  if (s.mode === 'daily') {
    daily = { date: s.date, score: s.score, won, words: s.words };
    save('daily', daily);
  }
  lastGame = canShare ? { mode: s.mode, pts: s.words.map(w => w.pts), won, day: s.date, sent: false } : null;
  const head = s.cfg.scored
    ? 'You scored ' + num(s.score) + ' points and solved ' + won + ' of ' + plural(s.words.length, 'word', 'words') + '.'
    : 'You solved ' + won + ' of ' + plural(s.words.length, 'word', 'words') + '.';
  showSummary(head, saved, s.words, s.mode === 'daily' ? daily : null);
}

function showDailyDone() {
  lastGame = null;
  showSummary('You have already played today\'s daily challenge: ' + num(daily.score) + ' points, ' + daily.won + ' of ' + DAILY_WORDS + ' words solved.',
    'A new daily challenge comes at midnight UTC.', daily.words, daily);
}

function showSummary(head, saved, words, d) {
  show($('menu'), false); show($('game'), false); show($('summary'), true);
  $('s-head').textContent = head;
  $('s-saved').textContent = saved;

  show($('world-box'), !!lastGame);
  $('w-msg').textContent = '';
  $('w-add').disabled = false;
  $('w-name').value = settings.name;

  const tb = $('s-words');
  tb.textContent = '';
  if (words.length) {
    row(tb, [th('Term'), th('Result'), th('Points', 'n')]);
    for (const w of words) row(tb, [td(w.t), td(w.won ? 'solved' : 'missed'), td(num(w.pts), 'n')]);
  }
  show($('s-share'), !!d);
  $('s-copied').textContent = '';
  if (d) {
    $('s-share-text').textContent = 'Qlossary daily challenge ' + d.date + '\n' +
      d.won + ' of ' + DAILY_WORDS + ' words, ' + num(d.score) + ' points\n' +
      d.words.map(w => w.won ? '+' : '-').join(' ');
  }
  const again = $('s-again');
  if (lastMode === 'daily') { again.textContent = 'Choose another game'; show($('s-menu'), false); }
  else { again.textContent = 'Play again'; show($('s-menu'), true); }
  again.focus();
  say('Game over. ' + head + ' ' + saved);
}

async function addToWorld() {
  if (!lastGame || lastGame.sent) return;
  const name = $('w-name').value.replace(/\s+/g, ' ').trim();
  const problem = worldNameProblem(name);
  const msg = $('w-msg');
  if (problem) { msg.textContent = problem; $('w-name').focus(); return; }
  settings.name = name;
  save('settings', settings);
  $('w-add').disabled = true;
  msg.textContent = 'Sending...';
  try {
    const res = await submitScore({ mode: lastGame.mode, name, pts: lastGame.pts, won: lastGame.won, day: lastGame.day, cid: browserId() });
    lastGame.sent = true;
    msg.textContent = 'Added. You are number ' + res.rank + ' on the worldwide ' + MODES[lastGame.mode].label.toLowerCase() + ' list.';
    boardTab = lastGame.mode;
  } catch (e) {
    msg.textContent = e.message;
    $('w-add').disabled = false;
  }
  say(msg.textContent);
}

function copyShare() {
  const text = $('s-share-text').textContent;
  const done = () => { $('s-copied').textContent = 'Copied.'; };
  const fail = () => { $('s-copied').textContent = 'Copying did not work. Select the text above and copy it.'; };
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fail); else fail();
}

// ---------- drawing the current word ----------

function renderRound(final) {
  const r = R, m = S.cfg;
  $('st-mode').textContent = m.label;
  const n = S.words.length + (final ? 0 : 1);
  $('st-word').textContent = m.words === Infinity ? 'Word ' + n : 'Word ' + n + ' of ' + m.words;
  $('st-score').textContent = m.scored ? 'Score ' + num(S.score) : '';
  $('st-streak').textContent = S.mode === 'endless' ? 'Missed ' + S.lost + ' of ' + m.maxLost : 'Streak ' + S.streak;
  $('gallows').textContent = GALLOWS[frame(r)];

  const left = r.lives - r.wrong.length;
  $('lives').textContent = 'Wrong guesses left: ' + left;
  $('misses').textContent = r.wrong.length ? 'Not in the term: ' + r.wrong.join(' ') : '';

  // the term
  const w = $('word');
  w.textContent = '';
  w.className = r.term.t.length > 30 ? 'long' : '';
  const words = mask(r.term.t, r.guessed);
  const spoken = [];
  let pos = 0;
  const chars = [...r.term.t.replace(/ +/g, ' ')];
  for (const wd of words) {
    const span = el('span', 'w');
    for (const ch of wd) {
      const orig = chars[pos++];
      const c = el('span', 'c');
      if (ch === '_' && final) { c.textContent = orig.toUpperCase(); c.className = 'c m'; }
      else c.textContent = ch;
      span.appendChild(c);
      spoken.push(ch === '_' && !final ? 'blank' : ch);
    }
    pos++;
    w.appendChild(span);
    spoken.push('space');
  }
  w.setAttribute('aria-label', 'Term: ' + spoken.slice(0, -1).join(' '));

  // keyboard
  for (const b of $('keys').children) {
    const L = b.dataset.l;
    const used = r.guessed.has(L);
    const wrong = r.wrong.includes(L);
    b.disabled = used || r.over;
    b.className = 'key' + (wrong ? ' x' : used ? ' ok' : '');
    b.setAttribute('aria-label', L + (used ? (wrong ? ', not in the term' : ', found') : ''));
  }

  // hints
  $('h1').disabled = r.over || r.hints.domain;
  $('h2').disabled = r.over || !r.hints.domain || r.hints.sub;
  $('h3').disabled = !canRevealLetter(r);
  $('hint-text').textContent = r.hints.domain
    ? 'Topic: ' + domainOf(r.term).name + (r.hints.sub ? ' › ' + subOf(r.term) : '')
    : '';
}

// ---------- tables that show ten rows at a time ----------

function paged(table, pager, key, headers, items, empty) {
  table.textContent = '';
  pager.textContent = '';
  if (!items.length) { row(table, [td(empty, 'empty')]); return; }
  const total = Math.ceil(items.length / PER_PAGE);
  pages[key] = Math.max(0, Math.min(pages[key], total - 1));
  row(table, headers.map(h => th(h[0], h[1])));
  const start = pages[key] * PER_PAGE;
  for (const make of items.slice(start, start + PER_PAGE)) row(table, make());
  if (total > 1) {
    const prev = el('button', '', 'Previous'), next = el('button', '', 'Next');
    prev.disabled = pages[key] === 0; next.disabled = pages[key] === total - 1;
    prev.addEventListener('click', () => { pages[key]--; renderScores(true); });
    next.addEventListener('click', () => { pages[key]++; renderScores(true); });
    pager.appendChild(prev); pager.appendChild(next);
    pager.appendChild(document.createTextNode(' ' + (start + 1) + '–' + Math.min(items.length, start + PER_PAGE) + ' of ' + items.length));
  }
}

// ---------- scores screen ----------

function renderScores(keepWorld) {
  for (const b of document.querySelectorAll('[data-sub]')) b.setAttribute('aria-pressed', b.dataset.sub === scoresSub ? 'true' : 'false');
  show($('sc-boards'), scoresSub === 'boards');
  show($('sc-progress'), scoresSub === 'progress');
  if (scoresSub === 'boards') {
    for (const b of document.querySelectorAll('[data-board]')) b.setAttribute('aria-pressed', b.dataset.board === boardTab ? 'true' : 'false');
    const list = scores[boardTab] || [];
    paged($('board'), $('board-pager'), 'board',
      [['#', 'n'], ['Name'], ['Score', 'n'], ['Words', 'n'], ['Date']],
      list.map((e, i) => () => [td(String(i + 1), 'n'), td(e.n), td(num(e.s), 'n'), td(e.w + ' of ' + e.of, 'n'), td(e.d)]),
      'No scores yet. Finish a ' + MODES[boardTab].label.toLowerCase() + ' with points to see it here.');
    if (!keepWorld) loadWorld(); else renderWorld();
  } else {
    const lt = $('lifetime');
    lt.textContent = '';
    const avg = stats.won ? fmtTime(Math.round(stats.solveMs / stats.won / 1000)) : '-';
    const pct = stats.words ? Math.round(100 * stats.won / stats.words) + '%' : '-';
    for (const [k, v] of [['Words played', num(stats.words)], ['Words solved', pct], ['Best streak', stats.bestStreak],
      ['Average time to solve', avg], ['Games played', num(stats.sessions)]]) row(lt, [td(k), td(String(v), 'n')]);

    const doms = DATA.domains.filter(d => stats.dom[d.id]);
    paged($('by-domain'), $('dom-pager'), 'dom', [['Topic'], ['Played', 'n'], ['Solved', 'n']],
      doms.map(d => () => { const [n, w] = stats.dom[d.id]; return [td(d.name), td(num(n), 'n'), td(Math.round(100 * w / n) + '%', 'n')]; }),
      'Play a few words to see how you do in each topic.');

    const names = Object.fromEntries(DATA.domains.map(d => [d.id, d.name]));
    paged($('missed'), $('missed-pager'), 'missed', [['Term'], ['Topic']],
      missed.map(m => () => [td(m.t), td(names[m.d] || m.d)]),
      'No missed words. Terms you miss are listed here so you can learn them.');
    show($('clear-missed'), missed.length > 0);
  }
}

async function loadWorld() {
  const mode = boardTab;
  worldData = null;
  $('w-status').textContent = 'Loading...';
  $('w-board').textContent = ''; $('w-pager').textContent = '';
  try {
    const data = await fetchBoard(mode, lastGame && lastGame.sent);
    if (mode !== boardTab || view !== 'scores') return;
    worldData = data;
    pages.world = 0;
    renderWorld();
  } catch (e) {
    if (mode !== boardTab) return;
    $('w-status').textContent = e.message;
  }
}

function renderWorld() {
  if (!worldData) return;
  const entries = worldData.entries;
  $('w-status').textContent = boardTab === 'daily'
    ? 'Top ' + entries.length + ' for ' + worldData.day + '. The list starts fresh every day at midnight UTC.'
    : entries.length ? 'Top ' + entries.length + ' of all time.' : '';
  paged($('w-board'), $('w-pager'), 'world',
    [['#', 'n'], ['Name'], ['Score', 'n'], ['Words', 'n'], ['Date']],
    entries.map(e => () => [td(String(e.rank), 'n'), td(e.name), td(num(e.score), 'n'), td(e.won + ' of ' + e.played, 'n'), td(e.day)]),
    'No worldwide scores yet. Finish a game and press "Add my score" to be the first.');
}

// ---------- settings screen ----------

function renderSettings() {
  const list = $('dom-list');
  if (!list.children.length) {
    DATA.domains.forEach((d, di) => {
      const l = el('label');
      const i = el('input');
      i.type = 'checkbox'; i.value = d.id;
      i.addEventListener('change', () => {
        settings.domains = [...list.querySelectorAll('input:checked')].map(x => x.value);
        saveSettings();
      });
      l.appendChild(i);
      l.appendChild(document.createTextNode(d.name + ' (' + DATA.terms.filter(t => t.d === di).length + ')'));
      list.appendChild(l);
    });
  }
  const on = new Set(settings.domains);
  for (const l of list.children) l.firstChild.checked = on.has(l.firstChild.value);
  for (const r of document.querySelectorAll('input[name=diff]')) r.checked = r.value === String(settings.diff);
  for (const r of document.querySelectorAll('input[name=timer]')) r.checked = r.value === String(settings.timer);
  for (const r of document.querySelectorAll('input[name=lives]')) r.checked = r.value === String(settings.lives);
  $('o-balanced').checked = settings.balanced;
  $('o-multi').checked = settings.multi;
  $('o-maxlen').value = settings.maxLen;
  $('o-name').value = settings.name;
  updateCount();
}

function updateCount() {
  const n = candidates(DATA, settings).length;
  $('set-count').textContent = n
    ? num(n) + ' terms match these settings.'
    : 'No terms match these settings. Tick more topics or change the options.';
}

function saveSettings() { save('settings', settings); updateCount(); }

function bindSettings() {
  for (const name of ['diff', 'timer', 'lives']) {
    for (const r of document.querySelectorAll('input[name=' + name + ']')) {
      r.addEventListener('change', () => { settings[name] = name === 'lives' ? +r.value : r.value; saveSettings(); });
    }
  }
  $('o-balanced').addEventListener('change', e => { settings.balanced = e.target.checked; saveSettings(); });
  $('o-multi').addEventListener('change', e => { settings.multi = e.target.checked; saveSettings(); });
  $('o-maxlen').addEventListener('change', e => {
    const v = Math.max(4, Math.min(44, Math.round(+e.target.value) || 44));
    settings.maxLen = v; e.target.value = v; saveSettings();
  });
  $('o-name').addEventListener('input', e => {
    settings.name = e.target.value.replace(/[^\w .\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
    save('settings', settings);
  });
  $('dom-all').addEventListener('click', () => { settings.domains = DATA.domains.map(d => d.id); saveSettings(); renderSettings(); });
  $('dom-none').addEventListener('click', () => { settings.domains = []; saveSettings(); renderSettings(); });
  $('reset-seen').addEventListener('click', () => {
    seen.clear(); save('seen', []);
    $('seen-note').textContent = 'Done.';
  });
}

// ---------- export / import ----------

let overlayMode = '';
function openOverlay(mode) {
  overlayMode = mode;
  show($('overlay'), true);
  $('ov-msg').textContent = '';
  if (mode === 'export') {
    $('ov-title').textContent = 'Export';
    $('ov-help').textContent = 'Copy this text and keep it. Paste it into Import in another browser to move your scores.';
    $('ov-text').value = exportAll();
    $('ov-ok').textContent = 'Select all';
  } else {
    $('ov-title').textContent = 'Import';
    $('ov-help').textContent = 'Paste the text from Export. It replaces the scores and settings in this browser.';
    $('ov-text').value = '';
    $('ov-ok').textContent = 'Import';
  }
  $('ov-text').focus();
}
function closeOverlay() { show($('overlay'), false); overlayMode = ''; }
function overlayOk() {
  if (overlayMode === 'export') { $('ov-text').select(); return; }
  const err = importAll($('ov-text').value);
  if (err) { $('ov-msg').textContent = err; return; }
  location.reload();
}

// ---------- keyboard ----------

function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (overlayMode) { if (e.key === 'Escape') closeOverlay(); return; }
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  const k = e.key;
  if (k === 'Enter' && (tag === 'BUTTON' || tag === 'A')) return; // the focused control handles it
  if (view === 'home') { if (k === 'Enter') { e.preventDefault(); go('play'); } return; }
  if (view !== 'play') return;
  if (!$('menu').hidden) { if (k === 'Enter') { e.preventDefault(); startSession('run'); } return; }
  if (!$('summary').hidden) { if (k === 'Enter') { e.preventDefault(); $('s-again').click(); } return; }
  if (!S || !R) return;
  if (R.over) { if (k === 'Enter') { e.preventDefault(); onNext(); } return; }
  if (k.length === 1) {
    const L = k.toUpperCase();
    if (L >= 'A' && L <= 'Z') { e.preventDefault(); onGuess(L); return; }
    if (k === '1' || k === '2' || k === '3') { e.preventDefault(); onHint(+k); }
  }
}

// ---------- start ----------

function init() {
  const keys = $('keys');
  for (const L of LETTERS) {
    const b = el('button', 'key', L);
    b.dataset.l = L;
    b.addEventListener('click', () => onGuess(L));
    keys.appendChild(b);
  }
  $('home-start').addEventListener('click', () => go('play'));
  $('home-daily').addEventListener('click', () => startSession('daily'));
  $('home-return').addEventListener('click', () => go('play'));
  $('m-run').addEventListener('click', () => startSession('run'));
  $('m-endless').addEventListener('click', () => startSession('endless'));
  $('m-daily').addEventListener('click', () => startSession('daily'));
  $('m-practice').addEventListener('click', () => startSession('practice'));
  $('h1').addEventListener('click', () => onHint(1));
  $('h2').addEventListener('click', () => onHint(2));
  $('h3').addEventListener('click', () => onHint(3));
  $('next').addEventListener('click', onNext);
  $('quit').addEventListener('click', onQuit);
  $('s-again').addEventListener('click', () => { if (lastMode === 'daily') showMenu(); else startSession(lastMode); });
  $('s-menu').addEventListener('click', showMenu);
  $('s-copy').addEventListener('click', copyShare);
  $('w-add').addEventListener('click', addToWorld);
  $('w-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addToWorld(); } });
  for (const b of document.querySelectorAll('[data-sub]')) b.addEventListener('click', () => { scoresSub = b.dataset.sub; renderScores(); });
  for (const b of document.querySelectorAll('[data-board]')) b.addEventListener('click', () => {
    boardTab = b.dataset.board; pages.board = 0; pages.world = 0; renderScores();
  });
  $('clear-missed').addEventListener('click', () => {
    if (!confirm('Clear the list of missed words?')) return;
    missed.length = 0; save('missed', missed); renderScores(true);
  });
  $('export').addEventListener('click', () => openOverlay('export'));
  $('import').addEventListener('click', () => openOverlay('import'));
  $('clear-all').addEventListener('click', () => {
    if (confirm('Delete all your scores, progress and settings in this browser? This cannot be undone.')) { clearAll(); location.reload(); }
  });
  $('ov-ok').addEventListener('click', overlayOk);
  $('ov-close').addEventListener('click', closeOverlay);
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', () => {
    if (!S || S.mode !== 'practice' || !T || !R || R.over) return;
    if (document.hidden) T.pause(); else if (view === 'play') T.start();
  });
  window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
  bindSettings();
  showView(location.hash.slice(1) || 'home');
}

init();