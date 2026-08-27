// How a changelog entry reads outside the captain's log.
//
// The log itself shows the full entry: version, date, and every line of what
// changed. The speech bubble that greets a returning visitor does not — a bubble
// long enough to list changes is a bubble nobody finishes reading. It names the
// version and the date, and the log holds the rest.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Render a changelog `YYYY-MM-DD` as `Mon D, YYYY`.
 *
 * The parts are read straight off the string rather than through `new Date()`.
 * `new Date('2026-08-27')` is midnight UTC, which is the 26th in Vancouver, so
 * every date on the site would read a day early for the person who wrote it.
 *
 * @param {string} dateStr - a date in `YYYY-MM-DD` form
 * @returns {string} the formatted date, or '' if it cannot be read
 */
export function formatChangelogDate(dateStr) {
  if (typeof dateStr !== 'string') return '';

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return '';

  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  const dayNumber = Number(day);

  if (monthIndex < 0 || monthIndex > 11) return '';
  if (dayNumber < 1 || dayNumber > 31) return '';

  return `${MONTHS[monthIndex]} ${dayNumber}, ${year}`;
}

/**
 * The one line the speech bubble says about a release.
 *
 * The entry's title and change list are deliberately left out. A visitor who
 * wants them clicks the helm and reads the captain's log.
 *
 * @param {object|null} entry - a `data/changelog.json` entry
 * @returns {string} the bubble text, or '' if there is no version to name
 */
export function changelogBubbleText(entry) {
  if (!entry || !entry.version) return '';

  const date = formatChangelogDate(entry.date);
  return date ? `v${entry.version} — updated ${date}` : `v${entry.version}`;
}
