import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createHowToPrompt,
  flashOpacity,
  FLASH_PERIOD_MS,
  FLASH_ON_MS,
  MAX_FLASH_OPACITY
} from './how-to-prompt.js';

test('the prompt waits before the first move', () => {
  const prompt = createHowToPrompt();
  assert.equal(prompt.state(), 'waiting');
  assert.equal(prompt.isFlashing(), false);
});

test('the first move starts the flashing', () => {
  const prompt = createHowToPrompt();
  assert.equal(prompt.firstMove(), true);
  assert.equal(prompt.state(), 'flashing');
  assert.equal(prompt.isFlashing(), true);
});

test('later moves do not restart the flashing', () => {
  const prompt = createHowToPrompt();
  prompt.firstMove();
  assert.equal(prompt.firstMove(), false);
  assert.equal(prompt.state(), 'flashing');
});

test('opening the guide stops the flashing for good', () => {
  const prompt = createHowToPrompt();
  prompt.firstMove();
  assert.equal(prompt.open(), true);
  assert.equal(prompt.state(), 'done');
  assert.equal(prompt.isFlashing(), false);
});

test('a visitor who finds the screen first is never flashed at', () => {
  const prompt = createHowToPrompt();
  assert.equal(prompt.open(), true);
  assert.equal(prompt.firstMove(), false);
  assert.equal(prompt.isFlashing(), false);
  assert.equal(prompt.state(), 'done');
});

test('opening the guide twice reports no second stop', () => {
  const prompt = createHowToPrompt();
  prompt.firstMove();
  prompt.open();
  assert.equal(prompt.open(), false);
});

test('the flash starts and ends dark', () => {
  assert.equal(flashOpacity(0), 0);
  assert.equal(flashOpacity(FLASH_ON_MS), 0);
});

test('the flash peaks halfway through the blink', () => {
  assert.equal(flashOpacity(FLASH_ON_MS / 2), MAX_FLASH_OPACITY);
});

test('the screen rests dark between blinks', () => {
  assert.equal(flashOpacity(FLASH_ON_MS + 1), 0);
  assert.equal(flashOpacity(FLASH_PERIOD_MS - 1), 0);
});

test('the blink repeats every period', () => {
  const sample = FLASH_ON_MS / 3;
  assert.equal(flashOpacity(FLASH_PERIOD_MS + sample), flashOpacity(sample));
  assert.equal(flashOpacity(FLASH_PERIOD_MS * 7 + sample), flashOpacity(sample));
});

test('the flash never exceeds the maximum opacity', () => {
  for (let elapsed = 0; elapsed < FLASH_PERIOD_MS * 3; elapsed += 7) {
    const opacity = flashOpacity(elapsed);
    assert.ok(opacity >= 0 && opacity <= MAX_FLASH_OPACITY, `opacity ${opacity} at ${elapsed}ms`);
  }
});

test('a nonsense elapsed time leaves the screen dark', () => {
  assert.equal(flashOpacity(-1), 0);
  assert.equal(flashOpacity(NaN), 0);
  assert.equal(flashOpacity(undefined), 0);
});
