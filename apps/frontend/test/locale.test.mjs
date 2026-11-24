import assert from 'node:assert/strict';
import test from 'node:test';
import { selectLocale } from '../app/public-cv.ts';

test('the page accepts only English as an override for the Vietnamese default', () => {
  assert.equal(selectLocale('en'), 'en');
  for (const value of [undefined, 'vi', 'fr', '', 'EN', ['en', 'vi'], ['en']]) {
    assert.equal(selectLocale(value), 'vi');
  }
});
