import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutRooms, renderMap } from './adventure-map.js';

// A miniature of the real dungeon: a hub with one room on each compass point,
// and one room deeper to the west.
const ROOMS = {
  atrium: {
    mapLabel: 'Atrium',
    exits: { north: 'sanctum', south: 'vault', east: 'constructs', west: 'whispers' }
  },
  sanctum: { mapLabel: 'Sanctum', exits: { south: 'atrium' } },
  vault: { mapLabel: 'Vault', exits: { north: 'atrium' } },
  constructs: { mapLabel: 'Constructs', exits: { west: 'atrium' } },
  whispers: { mapLabel: 'Whispers', exits: { east: 'atrium', west: 'archive' } },
  archive: { mapLabel: 'Archive', exits: { east: 'whispers' } }
};

const lines = out => out.split('\n').filter(l => l.trim());

test('places the start room at the origin', () => {
  const at = layoutRooms(ROOMS, 'atrium');
  assert.deepEqual(at.get('atrium'), { row: 0, col: 0 });
});

test('places rooms by compass direction', () => {
  const at = layoutRooms(ROOMS, 'atrium');
  assert.deepEqual(at.get('sanctum'), { row: -1, col: 0 });
  assert.deepEqual(at.get('vault'), { row: 1, col: 0 });
  assert.deepEqual(at.get('constructs'), { row: 0, col: 1 });
  assert.deepEqual(at.get('whispers'), { row: 0, col: -1 });
});

test('follows exits to any depth', () => {
  const at = layoutRooms(ROOMS, 'atrium');
  assert.deepEqual(at.get('archive'), { row: 0, col: -2 });
});

test('a room unreachable from the start is left unplaced', () => {
  const at = layoutRooms({ ...ROOMS, orphan: { mapLabel: 'Orphan', exits: {} } }, 'atrium');
  assert.equal(at.has('orphan'), false);
});

test('names the rooms you have visited', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium', 'whispers']));
  assert.match(out, /Atrium/);
  assert.match(out, /Whispers/);
});

test('marks a known but unvisited room with a question mark', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium']));
  assert.match(out, /Atrium/);
  assert.match(out, /\?/);
  assert.doesNotMatch(out, /Sanctum/);
});

test('hides a room two steps away that you have never stood beside', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium']));
  // archive is west of whispers, which is itself only a "?" so far
  assert.doesNotMatch(out, /Archive/);
  // the hub plus its four unknown neighbours: ?, |, row, |, ?
  assert.equal(lines(out).length, 5);
  assert.equal(out.match(/\?/g).length, 4);
});

test('reveals the next ring once you step into a room', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium', 'whispers']));
  assert.match(out, /Whispers/);
  // archive is now adjacent to a visited room, so it shows as unknown
  assert.doesNotMatch(out, /Archive/);
  const row = lines(out).find(l => l.includes('Atrium'));
  assert.match(row, /\?.*Whispers.*Atrium/, 'the unknown archive sits west of whispers');
});

test('draws every room once the whole dungeon is walked', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(Object.keys(ROOMS)));
  for (const room of Object.values(ROOMS)) {
    assert.match(out, new RegExp(room.mapLabel));
  }
});

test('joins horizontally linked rooms with a dash run', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium', 'whispers']));
  const row = lines(out).find(l => l.includes('Atrium'));
  assert.match(row, /Whispers\]-+\[Atrium/);
});

test('joins vertically linked rooms with a pipe', () => {
  const out = renderMap(ROOMS, 'atrium', new Set(['atrium', 'sanctum']));
  const rows = lines(out);
  const sanctumRow = rows.findIndex(l => l.includes('Sanctum'));
  const atriumRow = rows.findIndex(l => l.includes('Atrium'));
  assert.equal(atriumRow - sanctumRow, 2, 'one connector line between them');
  assert.match(rows[sanctumRow + 1], /^\s*\|\s*$/);
});

test('a dungeon of one room with no exits still renders', () => {
  const out = renderMap({ solo: { mapLabel: 'Solo', exits: {} } }, 'solo', new Set(['solo']));
  assert.match(out, /\[Solo\]/);
});

test('renders nothing meaningful before the player has been anywhere', () => {
  const out = renderMap(ROOMS, 'atrium', new Set());
  assert.equal(out, '');
});
