// Ordering rules for the text portfolio.
//
// Projects live in data/projects.json, grouped by level and positioned for the
// game. Neither grouping nor position says anything about recency, so the text
// portfolio sorts on an explicit `added` date instead. Set `added` to the day the
// project first appeared on the site, as YYYY-MM-DD.

const HIDDEN_IDS = ['helm', 'sonar', 'guestbook'];

// Scenery and empty slots share the projects array with real work. Three rules
// separate them: an unfilled slot still says "Placeholder", scenery carries no
// tech, and the three named ids open their own interactions instead of a panel.
function isRealProject(project) {
  return !project.description.startsWith('Placeholder') &&
    !HIDDEN_IDS.includes(project.id) &&
    project.tech.length > 0;
}

/**
 * Flatten every level's projects, drop scenery and empty slots, and sort newest
 * first by `added`.
 *
 * Set `"pin": "last"` to hold a project at the bottom whatever its date. The site
 * itself uses this: drealabs.com is the frame around the other work, so it reads
 * as a footer rather than an entry competing for the top slot.
 *
 * Projects sharing a date keep reverse file order, so the lower entry in
 * projects.json wins the tie — the same rule the page used before dates existed.
 * A project missing `added` sorts last and warns, because a silent slot at the
 * bottom of the page is easy to miss.
 *
 * @param {object} levels - the `levels` object from data/projects.json
 * @returns {object[]} display-ordered projects; the input is left untouched
 */
export function orderProjects(levels) {
  const all = [];
  for (const level of Object.values(levels)) {
    if (level.projects) {
      all.push(...level.projects);
    }
  }

  const real = all.filter(isRealProject).reverse();

  const undated = real.filter(project => !project.added);
  if (undated.length > 0) {
    console.warn(
      'projects.json: no "added" date on ' +
      undated.map(project => project.id).join(', ') +
      ' — sorted to the end.'
    );
  }

  // Array.prototype.sort is stable, so equal dates hold the reverse file order
  // established above. Empty string sorts below every real date.
  return real.sort((a, b) =>
    (a.pin === 'last') - (b.pin === 'last') ||
    (b.added || '').localeCompare(a.added || '')
  );
}
