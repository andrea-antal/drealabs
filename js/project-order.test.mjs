import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderProjects } from './project-order.js';

// Minimal project factory. Only the fields orderProjects reads.
function p(id, added, over = {}) {
  return {
    id,
    title: id,
    description: `${id} description`,
    tech: ['JavaScript'],
    added,
    ...over
  };
}

function levels(...projects) {
  return { 'submarine-lab': { projects } };
}

test('sorts by added date, newest first', () => {
  const out = orderProjects(levels(
    p('old', '2026-01-30'),
    p('newest', '2026-08-27'),
    p('middle', '2026-04-11')
  ));
  assert.deepEqual(out.map(x => x.id), ['newest', 'middle', 'old']);
});

test('equal dates keep reverse file order, so the later entry wins', () => {
  const out = orderProjects(levels(
    p('first-in-file', '2026-01-30'),
    p('second-in-file', '2026-01-30')
  ));
  assert.deepEqual(out.map(x => x.id), ['second-in-file', 'first-in-file']);
});

test('a project with no added date sorts last', () => {
  const out = orderProjects(levels(
    p('dated', '2026-01-30'),
    p('undated', undefined)
  ));
  assert.deepEqual(out.map(x => x.id), ['dated', 'undated']);
});

test('drops placeholder descriptions', () => {
  const out = orderProjects(levels(
    p('real', '2026-01-30'),
    p('empty-slot', '2026-01-30', { description: 'Placeholder description for tank 3.' })
  ));
  assert.deepEqual(out.map(x => x.id), ['real']);
});

test('drops scenery with an empty tech list', () => {
  const out = orderProjects(levels(
    p('real', '2026-01-30'),
    p('rubber-chicken-1', '2026-01-30', { tech: [] })
  ));
  assert.deepEqual(out.map(x => x.id), ['real']);
});

test('drops helm, sonar and guestbook by id', () => {
  const out = orderProjects(levels(
    p('real', '2026-01-30'),
    p('helm', '2026-01-30'),
    p('sonar', '2026-01-30'),
    p('guestbook', '2026-01-30')
  ));
  assert.deepEqual(out.map(x => x.id), ['real']);
});

test('flattens every level, and a level with no projects is fine', () => {
  const out = orderProjects({
    'submarine-lab': { projects: [p('sub', '2026-01-30')] },
    'engine-room': { projects: [] },
    'galley': {}
  });
  assert.deepEqual(out.map(x => x.id), ['sub']);
});

test('sorts across levels, not just within one', () => {
  const out = orderProjects({
    'submarine-lab': { projects: [p('sub-old', '2026-01-30')] },
    'engine-room': { projects: [p('engine-new', '2026-08-27')] }
  });
  assert.deepEqual(out.map(x => x.id), ['engine-new', 'sub-old']);
});

test('does not mutate the input', () => {
  const data = levels(p('a', '2026-01-30'), p('b', '2026-08-27'));
  const before = data['submarine-lab'].projects.map(x => x.id);
  orderProjects(data);
  assert.deepEqual(data['submarine-lab'].projects.map(x => x.id), before);
});

test('returns an empty list when nothing qualifies', () => {
  assert.deepEqual(orderProjects(levels(p('helm', '2026-01-30'))), []);
});

test('pin "last" sinks a project below every unpinned one, however new', () => {
  const out = orderProjects(levels(
    p('pinned', '2026-08-27', { pin: 'last' }),
    p('oldest', '2026-01-30')
  ));
  assert.deepEqual(out.map(x => x.id), ['oldest', 'pinned']);
});

test('pin "last" sinks a project below an undated one too', () => {
  const out = orderProjects(levels(
    p('pinned', '2026-08-27', { pin: 'last' }),
    p('undated', undefined)
  ));
  assert.deepEqual(out.map(x => x.id), ['undated', 'pinned']);
});

test('several pinned projects still sort by date among themselves', () => {
  const out = orderProjects(levels(
    p('pinned-old', '2026-01-30', { pin: 'last' }),
    p('pinned-new', '2026-08-27', { pin: 'last' }),
    p('normal', '2026-04-11')
  ));
  assert.deepEqual(out.map(x => x.id), ['normal', 'pinned-new', 'pinned-old']);
});

test('an unrecognised pin value is ignored', () => {
  const out = orderProjects(levels(
    p('weird', '2026-08-27', { pin: 'first' }),
    p('normal', '2026-01-30')
  ));
  assert.deepEqual(out.map(x => x.id), ['weird', 'normal']);
});
