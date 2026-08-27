import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntroGate, dismissesIntro } from './intro-gate.js';

test('the gate waits while the scene is still loading', () => {
  const gate = createIntroGate();
  assert.equal(gate.state(), 'loading');
  assert.equal(gate.isBlocking(), false);
});

test('the gate blocks once the scene is ready', () => {
  const gate = createIntroGate();
  assert.equal(gate.ready(), true);
  assert.equal(gate.state(), 'blocking');
  assert.equal(gate.isBlocking(), true);
});

test('a second ready call does not reopen the gate', () => {
  const gate = createIntroGate();
  gate.ready();
  assert.equal(gate.ready(), false);
});

test('the first input dismisses the gate', () => {
  const gate = createIntroGate();
  gate.ready();
  assert.equal(gate.dismiss(), true);
  assert.equal(gate.state(), 'open');
  assert.equal(gate.isBlocking(), false);
});

test('a second dismiss reports nothing to do', () => {
  const gate = createIntroGate();
  gate.ready();
  gate.dismiss();
  assert.equal(gate.dismiss(), false);
});

test('input during loading does not consume the overlay', () => {
  const gate = createIntroGate();
  assert.equal(gate.dismiss(), false);
  assert.equal(gate.state(), 'loading');
  assert.equal(gate.ready(), true);
  assert.equal(gate.isBlocking(), true);
});

test('a dismissed gate never blocks again', () => {
  const gate = createIntroGate();
  gate.ready();
  gate.dismiss();
  assert.equal(gate.ready(), false);
  assert.equal(gate.isBlocking(), false);
});

test('the keys the overlay names dismiss it', () => {
  assert.equal(dismissesIntro('ArrowLeft'), true);
  assert.equal(dismissesIntro('ArrowRight'), true);
});

test('any other typing key dismisses it too', () => {
  for (const key of ['Enter', ' ', 'Escape', 'a', 'Tab', 'ArrowUp']) {
    assert.equal(dismissesIntro(key), true, key);
  }
});

test('a modifier held on its own does not dismiss it', () => {
  for (const key of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock']) {
    assert.equal(dismissesIntro(key), false, key);
  }
});

test('a missing key does not dismiss it', () => {
  assert.equal(dismissesIntro(undefined), false);
  assert.equal(dismissesIntro(''), false);
  assert.equal(dismissesIntro(null), false);
});
