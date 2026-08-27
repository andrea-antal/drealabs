import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatChangelogDate, changelogBubbleText } from './changelog-format.js';

test('a date reads as month, day and year', () => {
  assert.equal(formatChangelogDate('2026-08-27'), 'Aug 27, 2026');
});

test('a date does not slip a day west of UTC', () => {
  // new Date('2026-01-01') is UTC midnight, which is Dec 31 in Vancouver.
  assert.equal(formatChangelogDate('2026-01-01'), 'Jan 1, 2026');
  assert.equal(formatChangelogDate('2026-03-01'), 'Mar 1, 2026');
});

test('a single-digit day keeps no leading zero', () => {
  assert.equal(formatChangelogDate('2026-02-05'), 'Feb 5, 2026');
});

test('a missing or malformed date reads as empty', () => {
  assert.equal(formatChangelogDate(''), '');
  assert.equal(formatChangelogDate(undefined), '');
  assert.equal(formatChangelogDate('not-a-date'), '');
  assert.equal(formatChangelogDate('2026-13-99'), '');
});

test('the bubble names the version and the date, nothing else', () => {
  assert.equal(
    changelogBubbleText({ version: '0.8', date: '2026-08-27', title: 'Lab Terminal' }),
    'v0.8 — updated Aug 27, 2026'
  );
});

test('the bubble drops the date it cannot read', () => {
  assert.equal(changelogBubbleText({ version: '0.8', date: '' }), 'v0.8');
});

test('there is nothing to say without a version', () => {
  assert.equal(changelogBubbleText({ date: '2026-08-27' }), '');
  assert.equal(changelogBubbleText(null), '');
  assert.equal(changelogBubbleText(undefined), '');
});
