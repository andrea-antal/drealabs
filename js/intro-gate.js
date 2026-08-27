// The instruction card that gates the first interaction.
//
// Nothing on drealabs.com tells a visitor that the character walks, or that the
// arrow keys work. The lab terminal explains it, but only to someone who already
// knows to click things. So a dimmed card holds the scene until the visitor makes
// their first input, and that input is the answer to its own question.
//
// The card shows on every load, not once per browser. It costs a returning
// visitor one click, and it is the only thing standing between a first-time
// visitor and a room they do not know they can touch.

// Keys that change nothing on their own. A visitor resting a hand on Shift, or a
// screen reader holding a modifier, has not made an input yet.
const MODIFIER_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta',
  'CapsLock', 'NumLock', 'ScrollLock',
  'Fn', 'FnLock', 'Hyper', 'Super', 'Symbol', 'SymbolLock'
]);

/**
 * Whether a key press should dismiss the intro card.
 *
 * The card names tap, click and the arrow keys, but any real key press means the
 * visitor is trying to interact, so any of them opens the scene. Being strict
 * here would leave a keyboard visitor pressing Enter at a card that ignores them.
 *
 * @param {string|null|undefined} key - a KeyboardEvent `key` value
 * @returns {boolean} true if this press dismisses the card
 */
export function dismissesIntro(key) {
  if (typeof key !== 'string' || key === '') return false;
  return !MODIFIER_KEYS.has(key);
}

/**
 * Track whether the intro card is holding the scene.
 *
 * The gate runs forward through three states and never goes back:
 *
 *   loading  → assets are still coming in; the card is not up yet
 *   blocking → the card is up and the scene is untouchable
 *   open     → the visitor has made their first input; the game is theirs
 *
 * `dismiss()` does nothing while loading. A click on the loading screen is
 * impatience, not an answer, and it must not skip a card the visitor never saw.
 *
 * @returns {{state: function, isBlocking: function, ready: function, dismiss: function}}
 */
export function createIntroGate() {
  let state = 'loading';

  return {
    /** @returns {string} 'loading', 'blocking' or 'open' */
    state() {
      return state;
    },

    /** @returns {boolean} true while the card is holding the scene */
    isBlocking() {
      return state === 'blocking';
    },

    /**
     * Report that the scene has finished loading.
     * @returns {boolean} true if this call raised the card
     */
    ready() {
      if (state !== 'loading') return false;
      state = 'blocking';
      return true;
    },

    /**
     * Report the visitor's first input.
     * @returns {boolean} true if this call lowered the card
     */
    dismiss() {
      if (state !== 'blocking') return false;
      state = 'open';
      return true;
    }
  };
}
