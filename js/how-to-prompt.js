// The first-run nudge toward the how-to guide.
//
// A visitor who lands on drealabs.com gets a welcome bubble, then a changelog
// bubble, and is then left alone in a room full of clickable things with no
// stated rules. The CRT on the centre desk holds those rules. This module decides
// when that screen flashes to ask for a click, and how bright the flash is on any
// given frame.
//
// Both halves are separated from Three.js on purpose: the trigger is a three-state
// machine and the flash is a function of elapsed time, so both are testable
// without a scene, a canvas or a clock.

/** One blink plus the dark rest that follows it, in milliseconds. */
export const FLASH_PERIOD_MS = 2200;

/** How long a single blink lasts, in milliseconds. Must be under the period. */
export const FLASH_ON_MS = 900;

/** Peak opacity of the hotspot overlay. Full white washes out the pixel art. */
export const MAX_FLASH_OPACITY = 0.5;

/**
 * Opacity of the flashing screen at a point in time.
 *
 * The blink is a half sine over `FLASH_ON_MS`, which starts and ends at zero, so
 * the screen fades up and back down with no visible edge. The rest of the period
 * is dark — a screen blinking without pause reads as a fault rather than an
 * invitation. Anything that is not a real elapsed time returns 0, so a dropped
 * frame or an unset start time leaves the screen alone.
 *
 * @param {number} elapsedMs - milliseconds since the flashing began
 * @returns {number} opacity between 0 and `MAX_FLASH_OPACITY`
 */
export function flashOpacity(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0;

  const phase = elapsedMs % FLASH_PERIOD_MS;
  if (phase >= FLASH_ON_MS) return 0;

  return Math.sin((phase / FLASH_ON_MS) * Math.PI) * MAX_FLASH_OPACITY;
}

/**
 * Track whether the how-to screen should be asking for a click.
 *
 * The prompt runs forward through three states and never goes back:
 *
 *   waiting  → the visitor has not moved yet; the welcome bubble still has focus
 *   flashing → the visitor has moved once; the screen is asking to be clicked
 *   done     → the guide has been opened; the screen is quiet from now on
 *
 * `open()` also settles the case where a visitor clicks the CRT before moving
 * anywhere. They have already read the guide, so the walk that click causes must
 * not start a flash behind them.
 *
 * State lives for the page, not the browser: a returning visitor is nudged again
 * on their next visit, which is cheap to ignore and useful if they forgot.
 *
 * @returns {{state: function, isFlashing: function, firstMove: function, open: function}}
 */
export function createHowToPrompt() {
  let state = 'waiting';

  return {
    /** @returns {string} 'waiting', 'flashing' or 'done' */
    state() {
      return state;
    },

    /** @returns {boolean} true while the screen should be flashing */
    isFlashing() {
      return state === 'flashing';
    },

    /**
     * Report the visitor's first move.
     * @returns {boolean} true if this call started the flashing
     */
    firstMove() {
      if (state !== 'waiting') return false;
      state = 'flashing';
      return true;
    },

    /**
     * Report that the guide was opened.
     * @returns {boolean} true if this call stopped the prompt
     */
    open() {
      if (state === 'done') return false;
      state = 'done';
      return true;
    }
  };
}
