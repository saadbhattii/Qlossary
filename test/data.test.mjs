import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDomains, readTerms, readDefinitions } from '../tools/tsv.mjs';
import { validate, validateDefinitions } from '../tools/build.mjs';

test('every term in data/ is valid', () => {
  assert.deepEqual(validate(readDomains(), readTerms()), []);
});

test('every definition belongs to a real term and fits the length limits', () => {
  assert.deepEqual(validateDefinitions(readTerms(), readDefinitions()), []);
});

test('the definition checker catches mistakes', () => {
  const terms = [{ domain: 'gates', term: 'Toffoli gate' }];
  const ok = { file: 'gates.tsv', line: 2, domain: 'gates', term: 'Toffoli gate', def: 'x'.repeat(60), other: '', cols: 2 };
  assert.deepEqual(validateDefinitions(terms, [ok]), []);
  assert.match(validateDefinitions(terms, [{ ...ok, term: 'Tofoli gate' }])[0], /no such term/);
  assert.match(validateDefinitions(terms, [ok, { ...ok, line: 3 }])[0], /defined twice/);
  assert.match(validateDefinitions(terms, [{ ...ok, def: 'too short' }])[0], /shorter/);
  assert.match(validateDefinitions(terms, [{ ...ok, def: 'x'.repeat(400) }])[0], /longer/);
});

