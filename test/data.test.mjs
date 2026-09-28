import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDomains, readTerms } from '../tools/tsv.mjs';
import { validate } from '../tools/build.mjs';

test('every term in data/ is valid', () => {
  assert.deepEqual(validate(readDomains(), readTerms()), []);
});
